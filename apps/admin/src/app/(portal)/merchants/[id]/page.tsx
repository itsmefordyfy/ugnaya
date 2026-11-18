import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Badge, Icon, Skeleton, buttonClasses } from '@ugnaya/web-ui';
import { DataTable } from '@/components/data-table';
import { LocalTime } from '@/components/local-time';
import { NotesPanel } from '@/components/notes-panel';
import { DetailList, PageHeader, Section } from '@/components/page-header';
import { RpcProblem } from '@/components/rpc-problem';
import { StatTile, TileGrid } from '@/components/stat-tile';
import { StatusBadge } from '@/components/status-badge';
import { requireAdmin } from '@/lib/admin';
import { formatCount, formatPeso, formatPoints } from '@/lib/format';
import {
  CATEGORY, DOCUMENT_KIND, MERCHANT_STATUS, PLAN_LABEL, REVIEW_ACTION_LABEL, SUBSCRIPTION_STATUS, TRANSACTION_STATUS, TRANSACTION_TYPE, statusLook,
} from '@/lib/labels';
import { isUuid } from '@/lib/paging';
import { allowedReviewActions } from '@/lib/review';
import { callAdmin } from '@/lib/rpc';
import { createClient } from '@/lib/supabase/server';
import type { Campaign, MerchantDetail, MerchantDocument, Paged, TransactionRow } from '@/lib/types';
import { ReviewActions } from './review-actions';

export const metadata: Metadata = { title: 'Merchant' };

export default function MerchantPage({ params }: PageProps<'/merchants/[id]'>) {
  return (
    <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
      <Detail params={params} />
    </Suspense>
  );
}

const kb = (bytes: number) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

async function Detail({ params }: Pick<PageProps<'/merchants/[id]'>, 'params'>) {
  const admin = await requireAdmin('merchants.view');
  const can = (p: string) => admin.permissions.includes(p);
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const canSeeDocuments = can('merchants.review') || can('users.view_pii');

  const supabase = await createClient();
  const [detail, documents, campaigns, transactions, plans] = await Promise.all([
    callAdmin<MerchantDetail>('admin_merchant_detail', { p_merchant_id: id }),
    // Owner ID and registration papers: reviewers and admins allowed personal data only (database rule too).
    canSeeDocuments ? callAdmin<MerchantDocument[]>('admin_merchant_documents', { p_merchant_id: id }) : null,
    callAdmin<Campaign[]>('admin_merchant_campaigns', { p_merchant_id: id }),
    can('transactions.view') ? callAdmin<Paged<TransactionRow>>('admin_list_transactions', { p_merchant_id: id, p_limit: 10 }) : null,
    supabase.from('plan_limits').select('plan, price_centavos'),
  ]);
  if (!detail.ok) {
    if (detail.message === 'merchant_not_found') notFound();
    return <><PageHeader title="Merchant" back={{ href: '/merchants', label: 'Merchants' }} /><RpcProblem failure={detail} what="this business" /></>;
  }
  const d = detail.data;
  const m = d.merchant;
  const prices = Object.fromEntries((plans.data ?? []).map((p) => [p.plan, p.price_centavos]));
  const isApplication = ['draft', 'pending_verification', 'under_review', 'info_required', 'rejected'].includes(m.status);

  return (
    <>
      <PageHeader title={m.trade_name}
        back={isApplication ? { href: '/applications', label: 'Applications' } : { href: '/merchants', label: 'Merchants' }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge look={statusLook(MERCHANT_STATUS, m.status)} />
            <span>{CATEGORY[m.category] ?? m.category}{m.city ? ` · ${m.city}` : ''}</span>
            <span>· registered <LocalTime iso={m.created_at} mode="date" /></span>
          </span>
        }
        actions={<ReviewActions merchantId={m.id} name={m.trade_name} actions={allowedReviewActions(m.status, admin.permissions)}
          plan={d.subscription?.plan ?? null} founding={d.subscription?.founding ?? false} prices={prices} />} />

      {m.status === 'draft' && (
        <p className="mb-6 flex gap-2 rounded-lg border border-border bg-surface p-3 text-sm text-ink-muted">
          <Icon name="info" size={20} className="shrink-0" /> This business has registered but hasn’t submitted its application yet, so there is nothing to decide.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Section title="Business">
            <DetailList items={[
              { label: 'Trade name', value: m.trade_name },
              { label: 'Legal name', value: m.legal_name },
              { label: 'Category', value: CATEGORY[m.category] ?? m.category },
              { label: 'Address', value: [m.address, m.city].filter(Boolean).join(', ') || null },
              { label: 'Branches declared', value: m.branch_count_declared === null ? null : formatCount(m.branch_count_declared) },
              { label: 'Heard about us', value: m.heard_from },
              { label: 'Network participation', value: m.network_participation ? 'Yes' : 'No' },
              { label: 'Terms accepted', value: <LocalTime iso={m.terms_accepted_at} /> },
              { label: 'Marketing consent', value: m.marketing_consent_at ? <LocalTime iso={m.marketing_consent_at} /> : 'No' },
              { label: 'Approved', value: m.verified_at ? <LocalTime iso={m.verified_at} /> : null },
              { label: 'Business id', value: <span className="font-mono text-xs" title="Business id">{m.id}</span> },
            ]} />
          </Section>

          <Section title="Owner and contact" description={d.contact_visible ? undefined : 'Contact details are masked for your role (they need merchants.review or users.view_pii).'}>
            <DetailList items={[
              { label: 'Owner', value: d.owner?.user_id ? <Link className="link" href={`/users/${d.owner.user_id}`}>{d.owner.name ?? 'Unnamed'}</Link> : d.owner?.name },
              { label: 'Email', value: d.owner?.email },
              { label: 'Mobile', value: d.contact_visible ? m.owner_mobile : <span className="text-ink-muted">Hidden</span> },
            ]} />
          </Section>

          <Section title="Verification documents" description="Opening one makes a link that works for 60 seconds.">
            {!documents ? (
              <p className="text-sm text-ink-muted">Your role can’t open verification documents (they include the owner’s ID). Reviewers can.</p>
            ) : !documents.ok ? <RpcProblem failure={documents} what="documents" /> : documents.data.length === 0 ? (
              <p className="text-sm text-ink-muted">No documents uploaded.</p>
            ) : (
              <ul className="divide-y divide-divider">
                {documents.data.map((doc) => (
                  <li key={doc.id} className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">{DOCUMENT_KIND[doc.kind] ?? doc.kind}</p>
                      <p className="truncate text-xs text-ink-muted">{doc.file_name} · {kb(doc.size_bytes)} · <LocalTime iso={doc.created_at} mode="date" /></p>
                    </div>
                    <a href={`/merchants/${m.id}/documents/${doc.id}`} target="_blank" rel="noopener noreferrer" className={buttonClasses('secondary')}>
                      <Icon name={doc.content_type === 'application/pdf' ? 'description' : 'image'} size={18} />Open
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Application history" description="Every step, newest first. History can’t be edited.">
            {d.reviews.length === 0 ? <p className="text-sm text-ink-muted">No steps recorded yet.</p> : (
              <ol className="space-y-4">
                {d.reviews.map((r) => (
                  <li key={r.id} className="border-l-2 border-border pl-3 text-sm">
                    <p className="font-medium">
                      {REVIEW_ACTION_LABEL[r.action] ?? r.action}
                      {r.to_status && <span className="font-normal text-ink-muted"> → {statusLook(MERCHANT_STATUS, r.to_status).label}</span>}
                    </p>
                    <p className="text-xs text-ink-muted">{r.actor_kind === 'admin' ? (r.actor_email ?? 'An administrator') : 'The business'} · <LocalTime iso={r.created_at} /></p>
                    {r.reason && <p className="mt-1 whitespace-pre-wrap break-words rounded-md bg-surface p-2">{r.reason}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Section>

          {transactions && (
            <Section title="Recent transactions" actions={<Link href={`/transactions?merchant=${m.id}`} className="link text-sm">All transactions</Link>}>
              {!transactions.ok ? <RpcProblem failure={transactions} what="transactions" /> : (
                <DataTable caption="Recent transactions" rows={transactions.data.rows} rowKey={(t) => t.id}
                  empty={<p className="p-4 text-sm text-ink-muted">No transactions yet.</p>}
                  columns={[
                    { header: 'When', primary: true, cell: (t) => <LocalTime iso={t.created_at} /> },
                    { header: 'Type', cell: (t) => TRANSACTION_TYPE[t.type] ?? t.type },
                    { header: 'Member', cell: (t) => <span className="font-mono text-xs">{t.member_id ?? '—'}</span> },
                    { header: 'Amount', align: 'right', cell: (t) => <span className="tabular">{formatPeso(t.amount_centavos)}</span> },
                    { header: 'Points', align: 'right', cell: (t) => <span className="tabular">{formatPoints(t.points, { signed: true })}</span> },
                    { header: 'Status', cell: (t) => <StatusBadge look={statusLook(TRANSACTION_STATUS, t.status)} /> },
                  ]} />
              )}
            </Section>
          )}

          <NotesPanel entityType="merchant" entityId={m.id} canWrite={can('notes.write')} />
        </div>

        <div className="space-y-6">
          <Section title="Activity">
            <TileGrid>
              <StatTile label="Members" value={formatCount(d.stats.members)} />
              <StatTile label="Txns (30 d)" value={formatCount(d.stats.transactions_30d)} hint={`${formatCount(d.stats.transactions_total)} all time`} />
              <StatTile label="Points issued" value={formatPoints(d.stats.points_issued)} />
              <StatTile label="Redeemed" value={formatPoints(d.stats.points_redeemed)} />
              <StatTile label="Liability" value={formatPoints(d.stats.liability_points)} hint="Unspent, in points" />
              <StatTile label="Fraud flags" value={formatCount(d.stats.open_fraud_flags)} hint="Open" href={d.stats.open_fraud_flags ? '/transactions?tab=flags' : undefined} />
            </TileGrid>
          </Section>

          <Section title="Subscription">
            {d.subscription ? (
              <DetailList items={[
                { label: 'Plan', value: <>{PLAN_LABEL[d.subscription.plan] ?? d.subscription.plan} {d.subscription.founding && <Badge tone="reward">Founding</Badge>}</> },
                { label: 'Status', value: <StatusBadge look={statusLook(SUBSCRIPTION_STATUS, d.subscription.status)} /> },
                { label: 'List price', value: `${formatPeso(d.subscription.price_centavos)} a month` },
                { label: 'Founding until', value: d.subscription.founding_until },
                { label: 'Period', value: d.subscription.period_start ? `${d.subscription.period_start} to ${d.subscription.period_end ?? '…'}` : null },
              ]} />
            ) : <p className="text-sm text-ink-muted">No subscription record.</p>}
          </Section>

          <Section title="Loyalty program">
            {d.program ? (
              <DetailList items={[
                { label: 'Name', value: d.program.name },
                { label: 'Status', value: d.program.active ? 'Active' : 'Off until approved' },
                { label: 'Rule', value: d.program.rule_type === 'per_peso'
                  ? `${d.program.points_per_unit} pt per ${formatPeso(d.program.unit_centavos)}` : `${d.program.points_per_unit} pt per ${d.program.rule_type === 'stamps' ? 'stamp' : 'visit'}` },
                { label: 'Minimum spend', value: d.program.minimum_spend_centavos ? formatPeso(d.program.minimum_spend_centavos) : 'None' },
                { label: 'Points expire', value: d.program.expiry_months ? `After ${d.program.expiry_months} months` : 'Never' },
                { label: 'Version', value: d.program.version },
              ]} />
            ) : <p className="text-sm text-ink-muted">No program set up yet.</p>}
          </Section>

          <Section title={`Branches (${d.branches.length})`}>
            {d.branches.length === 0 ? <p className="text-sm text-ink-muted">None yet.</p> : (
              <ul className="divide-y divide-divider text-sm">
                {d.branches.map((b) => (
                  <li key={b.id} className="py-2">
                    <p className="font-medium">{b.name} {!b.active && <Badge>Inactive</Badge>}</p>
                    <p className="text-xs text-ink-muted">{[b.address, b.city].filter(Boolean).join(', ') || '—'}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={`Staff (${d.staff.length})`} description={`${formatCount(d.devices)} active cashier device${d.devices === 1 ? '' : 's'}`}>
            {d.staff.length === 0 ? <p className="text-sm text-ink-muted">None yet.</p> : (
              <ul className="divide-y divide-divider text-sm">
                {d.staff.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="truncate">{s.name}</span>
                    <span className="flex shrink-0 gap-1"><Badge>{s.role}</Badge>{!s.active && <Badge tone="danger">Inactive</Badge>}{!s.has_login && <Badge tone="info">PIN only</Badge>}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={`Rewards (${d.rewards.length})`}>
            {d.rewards.length === 0 ? <p className="text-sm text-ink-muted">None yet.</p> : (
              <ul className="divide-y divide-divider text-sm">
                {d.rewards.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="truncate">{r.name}{!r.active && <span className="text-ink-muted"> (off)</span>}</span>
                    <span className="tabular shrink-0">{formatPoints(r.points_cost)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Campaigns">
            {!campaigns.ok ? <RpcProblem failure={campaigns} what="campaigns" /> : campaigns.data.length === 0 ? <p className="text-sm text-ink-muted">None yet.</p> : (
              <ul className="divide-y divide-divider text-sm">
                {campaigns.data.map((c) => (
                  <li key={c.id} className="py-2">
                    <p className="flex items-center justify-between gap-2"><span className="truncate font-medium">{c.name}</span><Badge>{c.status}</Badge></p>
                    <p className="text-xs text-ink-muted">{c.kind}{c.starts_at && <> · <LocalTime iso={c.starts_at} mode="date" /></>}{c.ends_at && <> – <LocalTime iso={c.ends_at} mode="date" /></>}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
