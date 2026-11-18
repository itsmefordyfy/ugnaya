import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Badge, EmptyState, Icon, Skeleton, Ugi, buttonClasses, type IconName } from '@ugnaya/web-ui';
import { DataError } from '@/components/data-error';
import { PageHeader, Panel } from '@/components/page-header';
import { requireStaff } from '@/lib/auth/guard';
import {
  DAY_OPTIONS, PLAN_NAMES, campaignComparison, dailySummary, hasActivity, normaliseDashboard, parseDays, usageRows,
  type Dashboard, type DayOption,
} from '@/lib/dashboard';
import { friendlyError } from '@/lib/errors';
import { formatDate, formatDay, formatNumber, formatPesos } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { DailyChart } from './_components/daily-chart';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage({ searchParams }: PageProps<'/dashboard'>) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: Pick<PageProps<'/dashboard'>, 'searchParams'>) {
  const params = await searchParams;
  const ctx = await requireStaff('dashboard');
  const days = parseDays(params.days);
  const supabase = await createClient();
  const [figures, announcements] = await Promise.all([
    supabase.rpc('merchant_dashboard', { p_merchant_id: ctx.merchant.id, p_days: days }),
    // Row-level security returns only published announcements that are current.
    supabase.from('platform_announcements').select('id, title, body, audience, starts_at, created_at')
      .in('audience', ['merchants', 'all']).order('created_at', { ascending: false }).limit(5),
  ]);

  const scope = ctx.role === 'manager' && ctx.branchIds ? 'your branches' : ctx.merchant.tradeName;
  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`How ${scope} did over the last ${days} days. Figures use Philippine time.`}
        actions={<DaysPicker days={days} />}
      />
      {announcements.data && announcements.data.length > 0 && (
        <section aria-label="Announcements from UGNAYA" className="mb-8 space-y-3">
          {announcements.data.map((a) => (
            <article key={a.id} className="flex gap-3 rounded-lg border border-info-soft bg-info-soft p-4 text-info-text">
              <Icon name="campaign" className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                <h2 className="font-sans text-base font-semibold">{a.title}</h2>
                <p className="mt-1 whitespace-pre-line text-sm">{a.body}</p>
                <p className="mt-1 text-xs">From UGNAYA · {formatDate(a.starts_at ?? a.created_at)}</p>
              </div>
            </article>
          ))}
        </section>
      )}
      {figures.error ? (
        <DataError message={friendlyError(figures.error)} />
      ) : (
        <Figures d={normaliseDashboard(figures.data)} isOwner={ctx.role === 'owner'} />
      )}
    </>
  );
}

function DaysPicker({ days }: { days: DayOption }) {
  return (
    <nav aria-label="Period" className="inline-flex rounded-pill border border-border-strong bg-card p-1">
      {DAY_OPTIONS.map((d) => (
        <Link key={d} href={`/dashboard?days=${d}`} aria-current={d === days ? 'page' : undefined}
          className={`inline-flex min-h-11 items-center rounded-pill px-4 text-sm font-semibold ${d === days ? 'bg-primary text-on-primary' : 'text-ink-muted hover:text-ink'}`}>
          {d} days
        </Link>
      ))}
    </nav>
  );
}

function Figures({ d, isOwner }: { d: Dashboard; isOwner: boolean }) {
  const lead: { label: string; value: string; note: string; icon: IconName }[] = [
    { label: 'Members', value: formatNumber(d.members), note: `${formatNumber(d.newMembers)} new in this period`, icon: 'groups' },
    { label: 'Active members', value: formatNumber(d.activeMembers), note: 'Earned or redeemed in this period', icon: 'how_to_reg' },
    { label: 'Points issued', value: formatNumber(d.pointsIssued), note: `${formatNumber(d.pointsRedeemed)} redeemed`, icon: 'stars' },
    { label: 'Sales recorded', value: formatPesos(d.salesCentavos, { whole: true }), note: 'Purchase amounts entered when awarding', icon: 'payments' },
  ];
  const more: { label: string; value: string }[] = [
    { label: 'New members', value: formatNumber(d.newMembers) },
    { label: 'Awards', value: formatNumber(d.awards) },
    { label: 'Redemptions', value: formatNumber(d.redemptions) },
    { label: 'Points redeemed', value: formatNumber(d.pointsRedeemed) },
    { label: 'Rewards claimed', value: formatNumber(d.rewardsClaimed) },
    { label: 'Outstanding points', value: formatNumber(d.outstandingPoints) },
  ];
  const active = hasActivity(d);

  return (
    <div className="space-y-8">
      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {lead.map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-card p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-ink-muted"><Icon name={k.icon} size={20} />{k.label}</p>
            <p className="mt-2 text-[32px] font-extrabold leading-10 tabular">{k.value}</p>
            <p className="mt-1 text-sm text-ink-muted">{k.note}</p>
          </div>
        ))}
      </section>
      <section aria-label="More figures" className="overflow-hidden rounded-lg border border-border bg-card">
        <dl className="grid grid-cols-2 gap-px bg-divider sm:grid-cols-3 lg:grid-cols-6">
          {more.map((m) => (
            <div key={m.label} className="bg-card p-4">
              <dt className="text-sm text-ink-muted">{m.label}</dt>
              <dd className="mt-1 text-xl font-bold tabular">{m.value}</dd>
            </div>
          ))}
        </dl>
        <p className="border-t border-divider px-4 py-3 text-xs text-ink-muted">
          Outstanding points are what your members hold right now, in points (not pesos).
        </p>
      </section>

      <Panel id="daily" title="Awards and redemptions per day" description="Each column is one day; hover for the numbers, or open the table.">
        {active ? (
          <DailyChart daily={d.daily} summary={`Awards and redemptions per day. ${dailySummary(d.daily, formatDay)}`} />
        ) : (
          <EmptyState
            illustration={<Ugi pose="thinking" height={96} />}
            title="No activity yet"
            body="When your staff award points or redeem rewards at the counter, each day’s numbers appear here."
            action={<Link href="/counter" className={buttonClasses('primary')}>Open the counter</Link>}
            className="py-6"
          />
        )}
      </Panel>

      <div className="grid gap-8 xl:grid-cols-2">
        <BranchPerformance d={d} />
        <TopRewards d={d} />
      </div>
      <Campaigns d={d} />
      <PlanUsage d={d} isOwner={isOwner} />
    </div>
  );
}

const th = 'px-3 py-3 text-left text-sm font-medium text-ink-muted';
const td = 'px-3 py-3 align-top';

function BranchPerformance({ d }: { d: Dashboard }) {
  return (
    <Panel id="branches" title="Branch performance" description="Completed transactions in this period.">
      {d.branches.length === 0 ? (
        <p className="text-ink-muted">No branches to show. Add one in <Link href="/branches" className="link">Branches & hours</Link>.</p>
      ) : (
        <>
          <table className="hidden w-full md:table">
            <caption className="sr-only">Branch performance</caption>
            <thead>
              <tr className="border-b border-divider">
                <th scope="col" className={th}>Branch</th>
                <th scope="col" className={`${th} text-right`}>Customers</th>
                <th scope="col" className={`${th} text-right`}>Awards</th>
                <th scope="col" className={`${th} text-right`}>Redemptions</th>
                <th scope="col" className={`${th} text-right`}>Sales</th>
              </tr>
            </thead>
            <tbody>
              {d.branches.map((b) => (
                <tr key={b.id} className="border-b border-divider last:border-0">
                  <th scope="row" className={`${td} text-left font-medium`}>
                    {b.name}{!b.active && <span className="ml-2"><Badge icon="pause_circle">Inactive</Badge></span>}
                  </th>
                  <td className={`${td} text-right tabular`}>{formatNumber(b.customers)}</td>
                  <td className={`${td} text-right tabular`}>{formatNumber(b.awards)}</td>
                  <td className={`${td} text-right tabular`}>{formatNumber(b.redemptions)}</td>
                  <td className={`${td} text-right tabular`}>{formatPesos(b.salesCentavos, { whole: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-divider md:hidden">
            {d.branches.map((b) => (
              <li key={b.id} className="py-3">
                <p className="font-medium">{b.name}{!b.active && ' (inactive)'}</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-ink-muted">Customers</dt><dd className="text-right tabular">{formatNumber(b.customers)}</dd>
                  <dt className="text-ink-muted">Awards</dt><dd className="text-right tabular">{formatNumber(b.awards)}</dd>
                  <dt className="text-ink-muted">Redemptions</dt><dd className="text-right tabular">{formatNumber(b.redemptions)}</dd>
                  <dt className="text-ink-muted">Sales</dt><dd className="text-right tabular">{formatPesos(b.salesCentavos, { whole: true })}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

function TopRewards({ d }: { d: Dashboard }) {
  const top = d.topRewards.slice(0, 5);
  const max = Math.max(1, ...top.map((r) => r.redemptions));
  return (
    <Panel id="top-rewards" title="Top rewards" description="Rewards handed over in this period.">
      {top.length === 0 ? (
        <p className="text-ink-muted">No rewards were redeemed in this period. <Link href="/rewards" className="link">Review your rewards</Link></p>
      ) : (
        <ol className="space-y-4">
          {top.map((r, i) => (
            <li key={r.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium"><span className="mr-2 text-ink-muted tabular">{i + 1}.</span>{r.name}</span>
                <span className="text-sm tabular">{formatNumber(r.redemptions)}</span>
              </div>
              <div aria-hidden="true" className="mt-1.5 h-2 rounded-pill bg-divider">
                <div className="h-2 rounded-pill bg-primary" style={{ width: `${(r.redemptions / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

const CAMPAIGN_STATUS: Record<string, { label: string; tone: 'success' | 'info' | 'neutral' }> = {
  running: { label: 'Running', tone: 'success' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  ended: { label: 'Ended', tone: 'neutral' },
};

function Campaigns({ d }: { d: Dashboard }) {
  return (
    <Panel
      id="campaigns"
      title="Campaign performance"
      description="Award transactions during the campaign versus the same length of time before it. A comparison, not proof the campaign caused the change."
    >
      {d.campaigns.length === 0 ? (
        <p className="text-ink-muted">No scheduled, running or ended campaigns yet. <Link href="/campaigns" className="link">Plan a campaign</Link></p>
      ) : (
        <ul className="divide-y divide-divider">
          {d.campaigns.map((c) => {
            const status = CAMPAIGN_STATUS[c.status] ?? { label: c.status, tone: 'neutral' as const };
            const cmp = campaignComparison(c);
            return (
              <li key={c.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-ink-muted">{formatDate(c.startsAt)} to {c.endsAt ? formatDate(c.endsAt) : 'no end date'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm tabular">{cmp.text}</span>
                  <Badge tone={status.tone} icon={c.status === 'running' ? 'play_circle' : c.status === 'scheduled' ? 'schedule' : 'task_alt'}>{status.label}</Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function PlanUsage({ d, isOwner }: { d: Dashboard; isOwner: boolean }) {
  const rows = usageRows(d.usage);
  const plan = d.usage.plan ? (PLAN_NAMES[d.usage.plan] ?? d.usage.plan) : null;
  return (
    <Panel
      id="usage"
      title="Plan usage"
      description={plan ? `Your ${plan} plan. Limits are recorded for now, not enforced.` : 'No plan is recorded for this business yet.'}
      actions={<Link href="/billing" className={buttonClasses('secondary')}>{isOwner ? 'Plan & billing' : 'See the plan'}</Link>}
    >
      <ul className="grid gap-5 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{r.label}</span>
              <span className="tabular">
                {formatNumber(r.used)}{r.limit !== null ? ` of ${formatNumber(r.limit)}` : ' · no limit'}
              </span>
            </div>
            {r.share !== null && (
              <div aria-hidden="true" className="mt-1.5 h-2 rounded-pill bg-divider">
                <div className={`h-2 rounded-pill ${r.state === 'over' ? 'bg-danger' : r.state === 'near' ? 'bg-warning' : 'bg-success'}`}
                  style={{ width: `${Math.min(100, r.share * 100)}%` }} />
              </div>
            )}
            {r.state === 'over' && <p className="mt-1 flex items-center gap-1 text-sm text-danger-text"><Icon name="warning" size={16} />Over the plan’s limit</p>}
            {r.state === 'near' && <p className="mt-1 flex items-center gap-1 text-sm text-warning-text"><Icon name="info" size={16} />Close to the plan’s limit</p>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading the dashboard" className="space-y-8">
      <div className="space-y-2"><Skeleton className="h-9 w-48" /><Skeleton className="h-5 w-80 max-w-full" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
      </div>
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-72 w-full rounded-lg" />
      <div className="grid gap-8 xl:grid-cols-2"><Skeleton className="h-56 w-full rounded-lg" /><Skeleton className="h-56 w-full rounded-lg" /></div>
    </div>
  );
}
