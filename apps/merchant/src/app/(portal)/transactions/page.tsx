import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Badge, EmptyState, Icon, Skeleton, Ugi, buttonClasses } from '@ugnaya/web-ui';
import { DataError } from '@/components/data-error';
import { controlClass } from '@/components/fields';
import { PageHeader } from '@/components/page-header';
import { Pagination, offsetFrom } from '@/components/pagination';
import { requireStaff } from '@/lib/auth/guard';
import { friendlyError } from '@/lib/errors';
import { formatDateTime, formatPesos } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { TRANSACTION_TYPES, parseBranch, parseType, readPage, readTransaction, signedPoints, typeLabel, type TransactionRow } from '@/lib/transactions';

export const metadata: Metadata = { title: 'Transactions' };

const LIMIT = 25;

export default function TransactionsPage({ searchParams }: PageProps<'/transactions'>) {
  return (
    <>
      <PageHeader title="Transactions" description="Every award, redemption and void at your counters, newest first. Points are this program’s points." />
      <Suspense fallback={<ListSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Content({ searchParams }: Pick<PageProps<'/transactions'>, 'searchParams'>) {
  const params = await searchParams;
  const ctx = await requireStaff('transactions');
  const type = parseType(params.type);
  const branch = parseBranch(params.branch);
  const offset = offsetFrom(params.offset);
  const supabase = await createClient();
  const [list, branches] = await Promise.all([
    supabase.rpc('merchant_transactions', {
      p_merchant_id: ctx.merchant.id, p_type: type ?? undefined, p_branch_id: branch ?? undefined, p_limit: LIMIT, p_offset: offset,
    }),
    supabase.from('merchant_branches').select('id, name').eq('merchant_id', ctx.merchant.id).order('created_at'),
  ]);
  // A branch manager only ever sees their own branches' transactions (the database scopes it), so offer only those.
  const branchOptions = (branches.data ?? []).filter((b) => !ctx.branchIds || ctx.role === 'owner' || ctx.branchIds.includes(b.id));
  const filtered = Boolean(type || branch);

  return (
    <>
      <form action="/transactions" className="mb-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="filter-type" className="block text-sm font-medium">Type</label>
          <select id="filter-type" name="type" defaultValue={type ?? ''} className={controlClass}>
            <option value="">All types</option>
            {TRANSACTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="filter-branch" className="block text-sm font-medium">Branch</label>
          <select id="filter-branch" name="branch" defaultValue={branch ?? ''} className={controlClass}>
            <option value="">All branches</option>
            {branchOptions.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <button type="submit" className={buttonClasses('primary')}><Icon name="filter_list" size={20} />Filter</button>
          {filtered && <Link href="/transactions" className={buttonClasses('secondary')}>Clear</Link>}
        </div>
      </form>
      {list.error ? (
        <DataError message={friendlyError(list.error)} />
      ) : (
        <Results page={readPage(list.data, readTransaction)} filtered={filtered} offset={offset}
          params={{ type: type ?? undefined, branch: branch ?? undefined }} />
      )}
    </>
  );
}

const TYPE_ICON = { award: 'stars', redeem: 'redeem', void: 'undo', adjustment: 'tune' } as const;

function TypeCell({ t }: { t: TransactionRow }) {
  const icon = TYPE_ICON[t.type as keyof typeof TYPE_ICON] ?? 'receipt';
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 font-medium"><Icon name={icon} size={20} className="text-ink-muted" />{typeLabel(t.type)}</span>
      {t.status === 'voided' && <Badge tone="danger" icon="block">Voided</Badge>}
    </span>
  );
}

function Results({ page, filtered, offset, params }: { page: { total: number; rows: TransactionRow[] }; filtered: boolean; offset: number; params: Record<string, string | undefined> }) {
  if (page.rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card">
        {filtered ? (
          <EmptyState title="Nothing matches these filters" body="No transactions of that type at that branch. Try all types or all branches."
            action={<Link href="/transactions" className={buttonClasses('secondary')}>Clear filters</Link>} />
        ) : (
          <EmptyState illustration={<Ugi pose="helpful" height={110} />} title="No transactions yet"
            body="Each time a customer earns points or redeems a reward at your counter, it’s recorded here."
            action={<Link href="/counter" className={buttonClasses('primary')}>Open the counter</Link>} />
        )}
      </div>
    );
  }
  const th = 'px-4 py-3 text-left text-sm font-medium text-ink-muted';
  const td = 'px-4 py-3 align-top';
  const amount = (t: TransactionRow) => (t.amountCentavos === null ? '—' : formatPesos(t.amountCentavos));
  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="hidden w-full lg:table">
          <caption className="sr-only">Transactions, newest first</caption>
          <thead>
            <tr className="border-b border-divider">
              <th scope="col" className={th}>When</th>
              <th scope="col" className={th}>Type</th>
              <th scope="col" className={th}>Member</th>
              <th scope="col" className={th}>Branch and staff</th>
              <th scope="col" className={`${th} text-right`}>Amount</th>
              <th scope="col" className={`${th} text-right`}>Points</th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map((t) => (
              <tr key={t.id} className="border-b border-divider last:border-0 hover:bg-primary-soft">
                <td className={`${td} whitespace-nowrap`}>{formatDateTime(t.createdAt)}</td>
                <td className={td}>
                  <TypeCell t={t} />
                  {t.receiptNo && <span className="mt-0.5 block text-sm text-ink-muted">Receipt {t.receiptNo}</span>}
                  {t.reason && <span className="mt-0.5 block text-sm text-ink-muted">Reason: {t.reason}</span>}
                </td>
                <td className={`${td} font-mono text-sm`}>{t.memberId ?? '—'}</td>
                <td className={td}>
                  <span className="block">{t.branch ?? '—'}</span>
                  <span className="block text-sm text-ink-muted">{t.staff ?? 'Unknown staff'}</span>
                </td>
                <td className={`${td} text-right tabular`}>{amount(t)}</td>
                <td className={`${td} text-right font-semibold tabular`}>{signedPoints(t.points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="divide-y divide-divider lg:hidden">
          {page.rows.map((t) => (
            <li key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <TypeCell t={t} />
                <span className="shrink-0 font-semibold tabular">{signedPoints(t.points)} <span className="text-sm font-normal text-ink-muted">pts</span></span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-ink-muted">When</dt><dd className="text-right">{formatDateTime(t.createdAt)}</dd>
                <dt className="text-ink-muted">Member</dt><dd className="text-right font-mono">{t.memberId ?? '—'}</dd>
                <dt className="text-ink-muted">Amount</dt><dd className="text-right tabular">{amount(t)}</dd>
                <dt className="text-ink-muted">Branch</dt><dd className="text-right">{t.branch ?? '—'}</dd>
                <dt className="text-ink-muted">Staff</dt><dd className="text-right">{t.staff ?? '—'}</dd>
                {t.receiptNo && <><dt className="text-ink-muted">Receipt</dt><dd className="text-right">{t.receiptNo}</dd></>}
                {t.reason && <><dt className="text-ink-muted">Reason</dt><dd className="text-right">{t.reason}</dd></>}
              </dl>
            </li>
          ))}
        </ul>
      </div>
      <Pagination total={page.total} limit={LIMIT} offset={offset} basePath="/transactions" params={params} />
    </>
  );
}

function ListSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-32" /></div>
      <div className="space-y-2 rounded-lg border border-border bg-card p-4">
        {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    </div>
  );
}
