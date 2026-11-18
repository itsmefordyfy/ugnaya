import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { EmptyState, Icon, Skeleton, buttonClasses } from '@ugnaya/web-ui';
import { adjustPoints, resolveFraudFlag } from '@/actions/transactions';
import { ActionDialog } from '@/components/action-dialog';
import { DataTable } from '@/components/data-table';
import { InputField, ReasonField, SelectField } from '@/components/fields';
import { DateFilter, FilterBar, Pagination, SelectFilter, Tabs } from '@/components/list-controls';
import { LocalTime } from '@/components/local-time';
import { PageHeader } from '@/components/page-header';
import { RpcProblem } from '@/components/rpc-problem';
import { StatusBadge } from '@/components/status-badge';
import { requireAdmin, type Admin } from '@/lib/admin';
import { dayBounds, parseDay } from '@/lib/date-range';
import { formatPeso, formatPoints } from '@/lib/format';
import { FRAUD_RULE, FRAUD_STATUS, TRANSACTION_STATUS, TRANSACTION_TYPE, TRANSACTION_TYPES, statusLook } from '@/lib/labels';
import { PAGE_SIZE, hrefWith, isUuid, oneOf, pageOffset, param, parsePage } from '@/lib/paging';
import { callAdmin } from '@/lib/rpc';
import type { FraudFlag, MerchantRow, Paged, TransactionRow } from '@/lib/types';

export const metadata: Metadata = { title: 'Transactions' };

type Params = Awaited<PageProps<'/transactions'>['searchParams']>;

export default function TransactionsPage({ searchParams }: PageProps<'/transactions'>) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

/** Merchants for the filter and the adjustment form: up to 1,000 by name. Beyond that, filter by pasting a business id. */
async function merchantOptions(admin: Admin) {
  if (!admin.permissions.includes('merchants.view')) return null;
  const r = await callAdmin<Paged<MerchantRow>>('admin_list_merchants', { p_limit: 1000 });
  if (!r.ok) return null;
  return r.data.rows.map((m) => ({ value: m.id, label: m.trade_name })).sort((a, b) => a.label.localeCompare(b.label));
}

async function Content({ searchParams }: Pick<PageProps<'/transactions'>, 'searchParams'>) {
  const admin = await requireAdmin('transactions.view');
  const params = await searchParams;
  const tab = param(params, 'tab') === 'flags' ? 'flags' : 'list';
  const merchants = await merchantOptions(admin);
  const can = (p: string) => admin.permissions.includes(p);
  const canExport = can('reports.export') || can('finance.export');

  return (
    <>
      <PageHeader title="Transactions" description="Every award, redemption, void and manual adjustment, newest first. Points are shown as points, never as money."
        actions={<>
          {can('transactions.adjust') && merchants && (
            <ActionDialog action={adjustPoints} idempotent triggerVariant="primary" triggerIcon="tune" triggerLabel="Adjust points"
              title="Manual points adjustment"
              description="Adds a correction to a customer’s balance at one business. Nothing is edited: a new adjustment transaction is recorded, and a balance can never go below zero."
              submitLabel="Apply adjustment" pendingLabel="Applying…" successMessage="Points adjusted">
              <InputField name="memberId" label="Customer member ID" required autoComplete="off" maxLength={20} className="mt-2 block min-h-11 w-full rounded-md border border-border-strong bg-card px-3 py-2 font-mono uppercase" />
              <SelectField name="merchantId" label="Business" required options={[{ value: '', label: 'Choose a business' }, ...merchants]} />
              <InputField name="points" label="Points (+ to add, − to remove)" type="number" required step={1} min={-100000} max={100000} inputMode="numeric" hint="A whole number, at most 100,000 either way." />
              <ReasonField />
            </ActionDialog>
          )}
          {tab === 'list' && canExport && (
            <a href={hrefWith('/export/transactions', listParams(params))} className={buttonClasses('secondary')} download><Icon name="download" size={18} />Export CSV</a>
          )}
        </>} />
      <Tabs label="Transactions views" items={[
        { label: 'Transactions', href: '/transactions', active: tab === 'list' },
        { label: 'Fraud flags', href: '/transactions?tab=flags', active: tab === 'flags' },
      ]} />
      {tab === 'list' ? <List params={params} merchants={merchants} /> : <Flags params={params} canResolve={can('merchants.review')} />}
    </>
  );
}

function listParams(params: Params) {
  const merchant = param(params, 'merchant');
  return {
    merchant: isUuid(merchant) ? merchant : '',
    type: oneOf(param(params, 'type'), ['', ...TRANSACTION_TYPES], ''),
    status: oneOf(param(params, 'status'), ['', 'completed', 'voided'], ''),
    from: parseDay(param(params, 'from')) ?? '',
    to: parseDay(param(params, 'to')) ?? '',
    q: param(params, 'q'),
  };
}

async function List({ params, merchants }: { params: Params; merchants: { value: string; label: string }[] | null }) {
  const current = listParams(params);
  const page = parsePage(param(params, 'page'));
  const { since, until } = dayBounds(current.from, current.to);
  const list = await callAdmin<Paged<TransactionRow>>('admin_list_transactions', {
    p_merchant_id: current.merchant || undefined, p_type: current.type || undefined, p_status: current.status || undefined,
    p_from: since ?? undefined, p_to: until ?? undefined, p_search: current.q || undefined, p_limit: PAGE_SIZE, p_offset: pageOffset(page),
  });
  const filtered = Object.values(current).some(Boolean);

  return (
    <>
      <FilterBar path="/transactions" q={current.q} placeholder="Member ID, receipt no. or transaction id" clearHref="/transactions">
        {merchants ? (
          <SelectFilter name="merchant" label="Business" value={current.merchant} options={[{ value: '', label: 'All businesses' }, ...merchants]} />
        ) : (
          <label className="block text-xs font-medium text-ink-muted">Business id
            <input name="merchant" defaultValue={current.merchant} className="mt-1 block min-h-11 w-full rounded-md border border-border-strong bg-card px-3 font-mono text-sm text-ink md:w-72" />
          </label>
        )}
        <SelectFilter name="type" label="Type" value={current.type} options={[{ value: '', label: 'All types' }, ...TRANSACTION_TYPES.map((t) => ({ value: t, label: TRANSACTION_TYPE[t] }))]} />
        <SelectFilter name="status" label="Status" value={current.status} options={[{ value: '', label: 'Any status' }, { value: 'completed', label: 'Completed' }, { value: 'voided', label: 'Voided' }]} />
        <DateFilter name="from" label="From (UTC day)" value={current.from} />
        <DateFilter name="to" label="To (UTC day)" value={current.to} />
      </FilterBar>
      {!list.ok ? <RpcProblem failure={list} what="transactions" /> : (
        <>
          <DataTable caption="Transactions" rows={list.data.rows} rowKey={(t) => t.id}
            empty={<EmptyState title={filtered ? 'No matching transactions' : 'No transactions yet'} body={filtered ? 'Try wider dates or fewer filters.' : 'Transactions appear here as businesses award and redeem points.'} />}
            columns={[
              { header: 'When', primary: true, cell: (t) => <LocalTime iso={t.created_at} /> },
              { header: 'Business', cell: (t) => <Link className="link" href={`/merchants/${t.merchant_id}`}>{t.merchant}</Link> },
              { header: 'Branch · staff', cell: (t) => [t.branch, t.staff].filter(Boolean).join(' · ') || '—' },
              { header: 'Member', cell: (t) => <span className="font-mono text-xs">{t.member_id ?? '—'}</span> },
              { header: 'Type', cell: (t) => <span title={t.reason ?? undefined}>{TRANSACTION_TYPE[t.type] ?? t.type}{t.reason ? ' *' : ''}</span> },
              { header: 'Receipt', cell: (t) => t.receipt_no ?? '—' },
              { header: 'Amount', align: 'right', cell: (t) => <span className="tabular">{formatPeso(t.amount_centavos)}</span> },
              { header: 'Points', align: 'right', cell: (t) => <span className="tabular">{formatPoints(t.points, { signed: true })}</span> },
              { header: 'Status', cell: (t) => <StatusBadge look={statusLook(TRANSACTION_STATUS, t.status)} /> },
              { header: 'Id', cell: (t) => <span className="font-mono text-[11px] text-ink-muted" title={t.id}>{t.id.slice(0, 8)}</span> },
            ]} />
          <p className="mt-2 text-xs text-ink-muted">* has a reason (hover to read it). Date filters use UTC days.</p>
          <Pagination path="/transactions" params={current} page={page} total={list.data.total} size={PAGE_SIZE} />
        </>
      )}
    </>
  );
}

async function Flags({ params, canResolve }: { params: Params; canResolve: boolean }) {
  const status = oneOf(param(params, 'flag_status'), ['open', 'dismissed', 'confirmed', 'all'], 'open');
  const page = parsePage(param(params, 'page'));
  const current = { tab: 'flags', flag_status: status === 'open' ? '' : status };
  const flags = await callAdmin<Paged<FraudFlag>>('admin_list_fraud_flags', { p_status: status === 'all' ? '' : status, p_limit: PAGE_SIZE, p_offset: pageOffset(page) });

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {(['open', 'confirmed', 'dismissed', 'all'] as const).map((s) => (
          <Link key={s} href={hrefWith('/transactions', current, { flag_status: s === 'open' ? null : s })}
            className={buttonClasses(s === status ? 'primary' : 'secondary')}>{s === 'all' ? 'All' : FRAUD_STATUS[s].label}</Link>
        ))}
      </div>
      {!flags.ok ? <RpcProblem failure={flags} what="fraud flags" /> : (
        <>
          <DataTable caption="Fraud flags" rows={flags.data.rows} rowKey={(f) => f.id}
            empty={<EmptyState title={status === 'open' ? 'No open flags' : 'No flags'} body="The database raises a flag automatically for unusually large awards and high void rates." />}
            columns={[
              { header: 'Raised', primary: true, cell: (f) => <LocalTime iso={f.created_at} /> },
              { header: 'Rule', cell: (f) => FRAUD_RULE[f.rule] ?? f.rule },
              { header: 'Details', cell: (f) => <FlagDetails details={f.details} /> },
              { header: 'Business', cell: (f) => (f.merchant_id ? <Link className="link" href={`/merchants/${f.merchant_id}`}>{f.merchant}</Link> : '—') },
              { header: 'Member · staff', cell: (f) => [f.member_id, f.staff].filter(Boolean).join(' · ') || '—' },
              { header: 'Transaction', cell: (f) => (f.transaction_id ? <Link className="link font-mono text-xs" href={`/transactions?q=${f.transaction_id}`}>{f.transaction_id.slice(0, 8)}</Link> : '—') },
              { header: 'Status', cell: (f) => <StatusBadge look={statusLook(FRAUD_STATUS, f.status)} /> },
              { header: 'Decision', cell: (f) => (f.status === 'open' && canResolve ? (
                <ActionDialog action={resolveFraudFlag} hidden={{ flagId: f.id }} triggerVariant="link" triggerLabel="Resolve"
                  title="Resolve this fraud flag" description={`${FRAUD_RULE[f.rule] ?? f.rule} at ${f.merchant ?? 'a business'}. Confirming records the finding; it doesn’t void anything by itself.`}
                  submitLabel="Save decision" pendingLabel="Saving…" successMessage="Flag resolved">
                  <SelectField name="status" label="Decision" options={[{ value: 'dismissed', label: 'Dismiss: not fraud' }, { value: 'confirmed', label: 'Confirm: fraud' }]} />
                  <ReasonField />
                </ActionDialog>
              ) : <span className="text-ink-muted">—</span>) },
            ]} />
          <Pagination path="/transactions" params={current} page={page} total={flags.data.total} size={PAGE_SIZE} />
        </>
      )}
    </>
  );
}

function FlagDetails({ details }: { details: Record<string, unknown> | null }) {
  if (!details) return <span className="text-ink-muted">—</span>;
  if ('amount_centavos' in details) {
    return <span className="text-xs">{formatPeso(Number(details.amount_centavos))} vs avg {formatPeso(Number(details.recent_average_centavos))}</span>;
  }
  if ('voids' in details) return <span className="text-xs">{String(details.voids)} voids / {String(details.awards)} awards</span>;
  return <span className="font-mono text-xs">{JSON.stringify(details)}</span>;
}
