import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Skeleton, buttonClasses } from '@ugnaya/web-ui';
import { BarList, DailyChart } from '@/components/daily-chart';
import { PageHeader, Section } from '@/components/page-header';
import { RpcProblem } from '@/components/rpc-problem';
import { StatTile, TileGrid } from '@/components/stat-tile';
import { requireAdmin } from '@/lib/admin';
import { formatCount, formatPercent } from '@/lib/format';
import { CATEGORY } from '@/lib/labels';
import { oneOf, param } from '@/lib/paging';
import { callAdmin } from '@/lib/rpc';
import type { Analytics, DailyPoint } from '@/lib/types';

export const metadata: Metadata = { title: 'Analytics' };

const PERIODS = ['7', '30', '90', '365'] as const;

export default function AnalyticsPage({ searchParams }: PageProps<'/analytics'>) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: Pick<PageProps<'/analytics'>, 'searchParams'>) {
  const admin = await requireAdmin('analytics.view');
  const days = Number(oneOf(param(await searchParams, 'days'), PERIODS, '30'));
  const result = await callAdmin<Analytics>('admin_analytics', { p_days: days });
  const series = (d: DailyPoint[], key: keyof DailyPoint) => d.map((p) => ({ day: p.day, value: Number(p[key]) || 0 }));

  return (
    <>
      <PageHeader title="Analytics"
        description="Activity across the platform. “Active” means at least one completed award or redemption in the period (app opens aren’t tracked). Retention: customers active in this period and the one before, out of those active in the one before." />
      <div className="mb-6 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link key={p} href={`/analytics?days=${p}`} aria-current={String(days) === p ? 'true' : undefined}
            className={buttonClasses(String(days) === p ? 'primary' : 'secondary')}>{p === '365' ? 'Last year' : `Last ${p} days`}</Link>
        ))}
      </div>
      {!result.ok ? <RpcProblem failure={result} what="analytics" /> : (
        <div className="space-y-6">
          <TileGrid>
            <StatTile icon="groups" label="Active customers" value={formatCount(result.data.active_customers)} hint={`${formatCount(result.data.active_customers_previous)} in the previous ${days} days`} />
            <StatTile icon="history" label="Customer retention" value={formatPercent(result.data.customer_retention)}
              hint={result.data.customer_retention === null ? 'No active customers in the previous period' : `Of the previous ${days} days’ active customers`} />
            <StatTile icon="storefront" label="Transacting merchants" value={formatCount(result.data.transacting_merchants)} hint="At least one completed transaction" />
          </TileGrid>
          <div className="grid gap-3 lg:grid-cols-2">
            <DailyChart title="Active customers per day" unit="active customers" points={series(result.data.daily, 'active_customers')} />
            <DailyChart title="Transactions per day" unit="transactions" points={series(result.data.daily, 'transactions')} />
            <DailyChart title="Points earned per day" unit="points earned" points={series(result.data.daily, 'points_earned')} />
            <DailyChart title="Points redeemed per day" unit="points redeemed" points={series(result.data.daily, 'points_redeemed')} />
            <DailyChart title="New customers per day" unit="new customers" points={series(result.data.daily, 'new_customers')} />
            <DailyChart title="New merchants per day" unit="new merchants" points={series(result.data.daily, 'new_merchants')} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Approved merchants by category">
              <BarList empty="No approved merchants yet." items={result.data.by_category.map((c) => ({ label: CATEGORY[c.category] ?? c.category, value: c.merchants }))} />
            </Section>
            <Section title="Top merchants" description={`By completed transactions, last ${days} days`}>
              <BarList empty="No transactions in this period."
                items={result.data.top_merchants.map((m) => ({
                  label: m.trade_name, value: m.transactions, hint: `· ${formatCount(m.customers)} customers`,
                  href: admin.permissions.includes('merchants.view') ? `/merchants/${m.merchant_id}` : undefined,
                }))} />
            </Section>
          </div>
        </div>
      )}
    </>
  );
}
