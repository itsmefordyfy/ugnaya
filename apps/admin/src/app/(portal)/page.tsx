import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Badge, Card, Skeleton, buttonClasses } from '@ugnaya/web-ui';
import { AlertsStrip } from '@/components/alerts-strip';
import { DailyChart } from '@/components/daily-chart';
import { DateFilter } from '@/components/list-controls';
import { PageHeader } from '@/components/page-header';
import { RpcProblem } from '@/components/rpc-problem';
import { StatTile, TileGrid } from '@/components/stat-tile';
import { requireAdmin } from '@/lib/admin';
import { parseRange, type DateRange } from '@/lib/date-range';
import { formatCount, formatDay, formatPeso, formatPoints } from '@/lib/format';
import { ROLE_LABEL } from '@/lib/labels';
import { callAdmin } from '@/lib/rpc';
import type { Alerts, Dashboard } from '@/lib/types';

export const metadata: Metadata = { title: 'Overview' };

export default function Overview({ searchParams }: PageProps<'/'>) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: Pick<PageProps<'/'>, 'searchParams'>) {
  const admin = await requireAdmin();
  const can = (p: string) => admin.permissions.includes(p);
  const range = parseRange(await searchParams);
  const [dashboard, alerts] = await Promise.all([
    can('analytics.view') ? callAdmin<Dashboard>('admin_dashboard', { p_from: range.from, p_to: range.to }) : null,
    can('notifications.view') ? callAdmin<Alerts>('admin_alerts') : null,
  ]);

  return (
    <>
      <PageHeader title="Overview" description={<>Signed in as {admin.email} <Badge tone="accent" className="ml-1">{ROLE_LABEL[admin.role] ?? admin.role}</Badge></>} />
      {alerts && (alerts.ok ? <AlertsStrip alerts={alerts.data} /> : <div className="mb-6"><RpcProblem failure={alerts} what="alerts" /></div>)}
      {!dashboard ? (
        <Card>
          <h2 className="font-sans text-lg font-semibold">Your access</h2>
          <p className="mt-1 text-sm text-ink-muted">Your role doesn’t include platform analytics. Use the menu for the modules you can open.</p>
        </Card>
      ) : (
        <>
          <RangePicker range={range} />
          {dashboard.ok ? <DashboardView d={dashboard.data} range={range} /> : <RpcProblem failure={dashboard} what="the dashboard" />}
        </>
      )}
    </>
  );
}

function RangePicker({ range }: { range: DateRange }) {
  const presets = [{ v: '7', l: 'Last 7 days' }, { v: '30', l: 'Last 30 days' }, { v: '90', l: 'Last 90 days' }];
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border border-border bg-card p-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="mb-1 text-xs font-medium text-ink-muted">Range (UTC days): {formatDay(range.from)} – {formatDay(range.to)}</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Link key={p.v} href={`/?range=${p.v}`} aria-current={range.preset === p.v ? 'true' : undefined}
              className={buttonClasses(range.preset === p.v ? 'primary' : 'secondary')}>{p.l}</Link>
          ))}
        </div>
        {range.error && <p role="alert" className="mt-2 text-sm text-danger-text">{range.error} Showing the last 30 days.</p>}
      </div>
      <form method="get" action="/" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="range" value="custom" />
        <DateFilter name="from" label="From" value={range.from} />
        <DateFilter name="to" label="To" value={range.to} />
        <button type="submit" className={buttonClasses(range.preset === 'custom' ? 'primary' : 'secondary')}>Custom range</button>
      </form>
    </div>
  );
}

function DashboardView({ d, range }: { d: Dashboard; range: DateRange }) {
  const s = d.merchants.by_status ?? {};
  const n = (k: string) => Number(s[k] ?? 0);
  const pending = n('pending_verification') + n('under_review') + n('info_required');
  const series = (key: 'transactions' | 'new_customers' | 'new_merchants') => d.daily.map((p) => ({ day: p.day, value: Number(p[key]) || 0 }));
  const inRange = `in range (${range.days} day${range.days === 1 ? '' : 's'})`;

  return (
    <div className="space-y-6">
      <section aria-labelledby="kpi-people">
        <h2 id="kpi-people" className="mb-2 font-sans text-sm font-semibold uppercase tracking-wide text-ink-muted">Customers and merchants</h2>
        <TileGrid>
          <StatTile icon="groups" label="Customers" value={formatCount(d.customers.total)} href="/users?kind=customer"
            hint={<>{formatCount(d.customers.new)} new · {formatCount(d.customers.active)} active {inRange}</>} />
          <StatTile icon="storefront" label="Approved merchants" value={formatCount(n('active'))} href="/merchants?status=active"
            hint={<>{formatCount(d.new_merchants)} signed up {inRange} · {formatCount(d.merchants.total)} in all</>} />
          <StatTile icon="pending" label="Applications waiting" value={formatCount(pending)} href="/applications"
            hint={<>{formatCount(n('pending_verification'))} new · {formatCount(n('under_review'))} under review · {formatCount(n('info_required'))} info requested</>} />
          <StatTile icon="block" label="Rejected · suspended" value={<>{formatCount(n('rejected'))} · {formatCount(n('suspended'))}</>}
            href="/merchants?status=suspended" hint={<>{formatCount(n('draft'))} registered but not submitted</>} />
          <StatTile icon="store" label="Branches" value={formatCount(d.branches)} hint="Active branches of approved merchants" />
          <StatTile icon="receipt_long" label="Transactions" value={formatCount(d.transactions.total)} href="/transactions"
            hint={<>{inRange} · {formatCount(d.transactions_all_time)} all time</>} />
          <StatTile icon="gpp_maybe" label="Open fraud flags" value={formatCount(d.open_fraud_flags)} href="/transactions?tab=flags" />
          <StatTile icon="workspace_premium" label="Active subscriptions" value={formatCount(d.active_subscriptions)} hint="Approved merchants, any plan" />
        </TileGrid>
      </section>

      <section aria-labelledby="kpi-points">
        <h2 id="kpi-points" className="mb-2 font-sans text-sm font-semibold uppercase tracking-wide text-ink-muted">Points (never money)</h2>
        <TileGrid>
          <StatTile icon="stars" label="Points issued" value={formatPoints(d.points.earned)} hint={`Earned and bonus ${inRange}`} />
          <StatTile icon="redeem" label="Points redeemed" value={formatPoints(d.points.redeemed)} hint={inRange} />
          <StatTile icon="account_balance_wallet" label="Points liability" value={formatPoints(d.liability_points)} hint="Unspent balances now, in points" />
        </TileGrid>
      </section>

      <section aria-labelledby="kpi-money">
        <h2 id="kpi-money" className="mb-2 font-sans text-sm font-semibold uppercase tracking-wide text-ink-muted">Revenue</h2>
        <TileGrid>
          {d.mrr_list_centavos !== null && d.mrr_list_centavos !== undefined && (
            <StatTile icon="trending_up" label="MRR (list price)" value={formatPeso(d.mrr_list_centavos)} href="/revenue"
              hint="List price, not collected: founding discounts and pilots aren’t recorded" />
          )}
          <StatTile icon="payments" label="Platform revenue (collected)" muted value="Not available — no payment provider connected"
            hint="Shown once billing is connected (docs/ADMIN_PORTAL_ARCHITECTURE.md §7)" />
        </TileGrid>
      </section>

      <section aria-labelledby="trends" className="space-y-3">
        <h2 id="trends" className="font-sans text-sm font-semibold uppercase tracking-wide text-ink-muted">Daily trends (UTC days)</h2>
        <div className="grid gap-3 xl:grid-cols-3">
          <DailyChart title="Transactions" unit="transactions" points={series('transactions')} />
          <DailyChart title="New customers" unit="new customers" points={series('new_customers')} />
          <DailyChart title="New merchants" unit="new merchants" points={series('new_merchants')} />
        </div>
      </section>
    </div>
  );
}
