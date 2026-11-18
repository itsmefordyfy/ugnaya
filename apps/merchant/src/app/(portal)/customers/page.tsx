import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { EmptyState, Icon, Skeleton, Ugi, buttonClasses } from '@ugnaya/web-ui';
import { DataError } from '@/components/data-error';
import { PageHeader } from '@/components/page-header';
import { Pagination, offsetFrom } from '@/components/pagination';
import { requireStaff } from '@/lib/auth/guard';
import { friendlyError } from '@/lib/errors';
import { formatDate, formatNumber } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { parseSearch, readCustomer, readPage, type CustomerRow } from '@/lib/transactions';

export const metadata: Metadata = { title: 'Customers' };

const LIMIT = 25;

export default function CustomersPage({ searchParams }: PageProps<'/customers'>) {
  return (
    <>
      <PageHeader
        title="Customers"
        description="Members of your loyalty program: their points here and how often they visit. UGNAYA shares names and member IDs only, never contact details."
      />
      <Suspense fallback={<ListSkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Content({ searchParams }: Pick<PageProps<'/customers'>, 'searchParams'>) {
  const params = await searchParams;
  const ctx = await requireStaff('customers');
  const q = parseSearch(params.q);
  const offset = offsetFrom(params.offset);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('merchant_customers', {
    p_merchant_id: ctx.merchant.id, p_search: q || undefined, p_limit: LIMIT, p_offset: offset,
  });

  return (
    <>
      <form role="search" action="/customers" className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="customer-search" className="block text-sm font-medium">Search by name or member ID</label>
          <input id="customer-search" name="q" type="search" defaultValue={q} placeholder="e.g. Maria or ABCD2345" autoComplete="off"
            className="mt-2 block min-h-11 w-full rounded-md border border-border-strong bg-card px-3 py-2 text-base text-ink focus:border-accent" />
        </div>
        <div className="flex gap-3">
          <button type="submit" className={buttonClasses('primary')}><Icon name="search" size={20} />Search</button>
          {q && <Link href="/customers" className={buttonClasses('secondary')}>Clear</Link>}
        </div>
      </form>
      {error ? <DataError message={friendlyError(error)} /> : <Results page={readPage(data, readCustomer)} q={q} offset={offset} />}
    </>
  );
}

function Results({ page, q, offset }: { page: { total: number; rows: CustomerRow[] }; q: string; offset: number }) {
  if (page.rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card">
        {q ? (
          <EmptyState title="No members match" body={`Nobody with a name or member ID like “${q}”. Check the spelling, or search with part of the member ID.`}
            action={<Link href="/customers" className={buttonClasses('secondary')}>Show everyone</Link>} />
        ) : (
          <EmptyState illustration={<Ugi pose="helpful" height={110} />} title="No members yet"
            body="A customer becomes a member the first time they earn points at your counter. They’ll be listed here with their points and visits."
            action={<Link href="/counter" className={buttonClasses('primary')}>Open the counter</Link>} />
        )}
      </div>
    );
  }
  const th = 'px-4 py-3 text-left text-sm font-medium text-ink-muted';
  const td = 'px-4 py-3';
  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="hidden w-full md:table">
          <caption className="sr-only">Members{q ? ` matching “${q}”` : ''}, most recently active first</caption>
          <thead>
            <tr className="border-b border-divider">
              <th scope="col" className={th}>Member</th>
              <th scope="col" className={`${th} text-right`}>Points</th>
              <th scope="col" className={`${th} text-right`}>Earned in total</th>
              <th scope="col" className={`${th} text-right`}>Visits</th>
              <th scope="col" className={th}>Last activity</th>
              <th scope="col" className={th}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map((c) => (
              <tr key={c.memberId} className="border-b border-divider last:border-0 hover:bg-primary-soft">
                <th scope="row" className={`${td} text-left font-normal`}>
                  <span className="block font-medium">{c.name ?? 'Former member'}</span>
                  <span className="block font-mono text-sm text-ink-muted">{c.memberId}</span>
                </th>
                <td className={`${td} text-right font-semibold tabular`}>{formatNumber(c.balance)}</td>
                <td className={`${td} text-right tabular`}>{formatNumber(c.lifetimeEarned)}</td>
                <td className={`${td} text-right tabular`}>{formatNumber(c.visits)}</td>
                <td className={td}>{formatDate(c.lastActivityAt)}</td>
                <td className={td}>{formatDate(c.joinedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="divide-y divide-divider md:hidden">
          {page.rows.map((c) => (
            <li key={c.memberId} className="p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.name ?? 'Former member'}</span>
                  <span className="block font-mono text-sm text-ink-muted">{c.memberId}</span>
                </span>
                <span className="shrink-0 text-right font-semibold tabular">{formatNumber(c.balance)} <span className="text-sm font-normal text-ink-muted">pts</span></span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <dt className="text-ink-muted">Visits</dt><dd className="text-right tabular">{formatNumber(c.visits)}</dd>
                <dt className="text-ink-muted">Earned in total</dt><dd className="text-right tabular">{formatNumber(c.lifetimeEarned)}</dd>
                <dt className="text-ink-muted">Last activity</dt><dd className="text-right">{formatDate(c.lastActivityAt)}</dd>
              </dl>
            </li>
          ))}
        </ul>
      </div>
      <Pagination total={page.total} limit={LIMIT} offset={offset} basePath="/customers" params={{ q: q || undefined }} />
    </>
  );
}

function ListSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-4">
      <Skeleton className="h-11 w-full" />
      <div className="space-y-2 rounded-lg border border-border bg-card p-4">
        {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    </div>
  );
}
