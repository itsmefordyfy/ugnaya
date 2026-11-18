import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Icon, Skeleton } from '@ugnaya/web-ui';
import { DataTable } from '@/components/data-table';
import { PageHeader, Section } from '@/components/page-header';
import { RpcProblem } from '@/components/rpc-problem';
import { StatTile, TileGrid } from '@/components/stat-tile';
import { requireAdmin } from '@/lib/admin';
import { formatCount, formatPeso, formatPoints, humanize } from '@/lib/format';
import { PLAN_LABEL } from '@/lib/labels';
import { callAdmin } from '@/lib/rpc';
import type { Finance } from '@/lib/types';

export const metadata: Metadata = { title: 'Revenue' };

export default function RevenuePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requireAdmin('finance.view');
  const finance = await callAdmin<Finance>('admin_finance');
  if (!finance.ok) return <><PageHeader title="Revenue" description="Subscription revenue at list price, and the points customers hold. No payment provider is connected, so nothing here is money actually collected." /><RpcProblem failure={finance} what="finance figures" /></>;
  const f = finance.data;
  const plans = f.plans.map((p) => ({ ...p, mrr: p.plan === 'free' ? 0 : p.price_centavos * p.active_merchants }));

  return (
    <>
      <PageHeader title="Revenue" description="Subscription revenue at list price, and the points customers hold. No payment provider is connected, so nothing here is money actually collected." />
    <div className="space-y-6">
      <section aria-labelledby="mrr">
        <h2 id="mrr" className="mb-2 font-sans text-sm font-semibold uppercase tracking-wide text-ink-muted">Subscriptions (list price, not collected)</h2>
        <TileGrid>
          <StatTile icon="trending_up" label="MRR (list price)" value={formatPeso(f.mrr_list_centavos)} hint="Active paid plans of approved merchants × list price" />
          <StatTile icon="calendar_month" label="ARR (list price)" value={formatPeso(f.mrr_list_centavos * 12)} hint="12 × MRR" />
          <StatTile icon="storefront" label="Paying merchants" value={formatCount(f.paying_merchants)} hint="Active, approved, not on Free" />
          <StatTile icon="workspace_premium" label="Subscription statuses" value={formatCount(Object.values(f.subscription_statuses).reduce((a, b) => a + Number(b), 0))}
            hint={Object.entries(f.subscription_statuses).map(([k, v]) => `${formatCount(Number(v))} ${humanize(k).toLowerCase()}`).join(' · ') || 'None'} />
        </TileGrid>
        <p className="mt-2 text-xs text-ink-muted">Founding discounts and free pilots aren’t recorded yet, so list-price MRR overstates what will be billed.</p>
      </section>

      <Section title="Revenue by plan" description="List price per month for each plan’s active, approved merchants.">
        <DataTable caption="Revenue by plan" rows={plans} rowKey={(p) => p.plan} empty={<p className="p-4 text-sm text-ink-muted">No plans.</p>}
          columns={[
            { header: 'Plan', primary: true, cell: (p) => PLAN_LABEL[p.plan] ?? p.plan },
            { header: 'List price', align: 'right', cell: (p) => <span className="tabular">{formatPeso(p.price_centavos)}</span> },
            { header: 'Active merchants', align: 'right', cell: (p) => <span className="tabular">{formatCount(p.active_merchants)}</span> },
            { header: 'Founding', align: 'right', cell: (p) => <span className="tabular">{formatCount(p.founding)}</span> },
            { header: 'All on plan', align: 'right', cell: (p) => <span className="tabular">{formatCount(p.all_merchants)}</span> },
            { header: 'MRR (list)', align: 'right', cell: (p) => <span className="tabular font-medium">{formatPeso(p.mrr)}</span> },
          ]} />
      </Section>

      <section aria-labelledby="liability">
        <h2 id="liability" className="mb-2 font-sans text-sm font-semibold uppercase tracking-wide text-ink-muted">Points liability (points, not money)</h2>
        <TileGrid>
          <StatTile icon="loyalty" label="Merchant points" value={formatPoints(f.liability_points.merchant)} hint="Unspent, owed by each business to its customers" />
          <StatTile icon="public" label="Network points" value={formatPoints(f.liability_points.network)} hint="Unspent network balance" />
          <StatTile icon="receipt" label="Settlement records" value={formatCount(f.settlement_records)} hint="Draft network settlements" />
        </TileGrid>
        <p className="mt-2 text-xs text-ink-muted">Points are never converted to pesos or added to revenue.</p>
      </section>

      <section aria-labelledby="unavailable" className="rounded-lg border border-dashed border-border-strong bg-card p-4">
        <h2 id="unavailable" className="flex items-center gap-2 font-sans text-base font-semibold"><Icon name="info" size={20} />Not available until a payment provider is connected</h2>
        <p className="mt-1 text-sm text-ink-muted">UGNAYA doesn’t bill through a provider yet, so these have no source. They appear once billing is connected (docs/ADMIN_PORTAL_ARCHITECTURE.md §7), never as zeros before then.</p>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {['Collected revenue and payment history', 'Failed payments and retries', 'Refunds and credits', 'Receivables and overdue invoices'].map((t) => (
            <li key={t} className="flex items-center gap-2 rounded-md bg-surface px-3 py-2 text-ink-muted"><Icon name="lock" size={16} />{t}</li>
          ))}
        </ul>
      </section>
    </div>
    </>
  );
}
