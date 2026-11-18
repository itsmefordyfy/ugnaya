/**
 * The merchant dashboard's figures (merchant_dashboard in supabase/migrations/20261107000400_merchant_dashboard.sql).
 * The function returns jsonb, so the generated types call it Json; normaliseDashboard reads it defensively: a missing
 * or malformed field becomes zero or empty, never a crash. Pure, so it is tested.
 */

export const DAY_OPTIONS = [7, 30, 90] as const;
export type DayOption = (typeof DAY_OPTIONS)[number];

/** ?days= from the URL: 7, 30 or 90, else 30. */
export function parseDays(value: string | string[] | undefined): DayOption {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (DAY_OPTIONS as readonly number[]).includes(n) ? (n as DayOption) : 30;
}

export type DailyPoint = { day: string; awards: number; redemptions: number };
export type BranchRow = { id: string; name: string; active: boolean; awards: number; redemptions: number; salesCentavos: number; customers: number };
export type CampaignRow = {
  id: string; name: string; status: string; startsAt: string | null; endsAt: string | null;
  during: number; before: number;
};
export type TopReward = { id: string; name: string; redemptions: number };
export type PlanLimits = { branches: number | null; staff: number | null; rewards: number | null; transactionsPerMonth: number | null };
export type Usage = {
  plan: string | null;
  branches: number; staff: number; rewards: number; transactionsThisMonth: number;
  limits: PlanLimits | null;
};

export type Dashboard = {
  days: number;
  since: string | null;
  members: number;
  newMembers: number;
  activeMembers: number;
  awards: number;
  redemptions: number;
  voids: number;
  salesCentavos: number;
  pointsIssued: number;
  pointsRedeemed: number;
  rewardsClaimed: number;
  outstandingPoints: number;
  daily: DailyPoint[];
  branches: BranchRow[];
  campaigns: CampaignRow[];
  topRewards: TopReward[];
  usage: Usage;
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
/** Postgres bigint counts can arrive as numbers or numeric strings. */
const num = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
};
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

export function normaliseDashboard(raw: unknown): Dashboard {
  const d = obj(raw);
  const tx = obj(d.transactions);
  const points = obj(d.points);
  const usage = obj(d.usage);
  const limits = d.usage && usage.limits && typeof usage.limits === 'object' ? obj(usage.limits) : null;
  return {
    days: num(d.days) || 30,
    since: strOrNull(d.since),
    members: num(d.members),
    newMembers: num(d.new_members),
    activeMembers: num(d.active_members),
    awards: num(tx.award),
    redemptions: num(tx.redeem),
    voids: num(tx.void),
    salesCentavos: num(tx.sales_centavos),
    pointsIssued: num(points.issued),
    pointsRedeemed: num(points.redeemed),
    rewardsClaimed: num(d.rewards_claimed),
    outstandingPoints: num(d.outstanding_points),
    daily: arr(d.daily).map((x) => obj(x)).filter((x) => str(x.day)).map((x) => ({ day: str(x.day), awards: num(x.awards), redemptions: num(x.redemptions) })),
    branches: arr(d.branches).map((x) => obj(x)).map((x) => ({
      id: str(x.branch_id), name: str(x.name) || 'Branch', active: x.active !== false,
      awards: num(x.awards), redemptions: num(x.redemptions), salesCentavos: num(x.sales_centavos), customers: num(x.customers),
    })),
    campaigns: arr(d.campaigns).map((x) => obj(x)).map((x) => ({
      id: str(x.id), name: str(x.name) || 'Campaign', status: str(x.status),
      startsAt: strOrNull(x.starts_at), endsAt: strOrNull(x.ends_at),
      during: num(x.transactions_during), before: num(x.transactions_before),
    })),
    topRewards: arr(d.top_rewards).map((x) => obj(x)).map((x) => ({ id: str(x.reward_id), name: str(x.name) || 'Reward', redemptions: num(x.redemptions) }))
      .sort((a, b) => b.redemptions - a.redemptions),
    usage: {
      plan: strOrNull(usage.plan),
      branches: num(usage.branches),
      staff: num(usage.staff),
      rewards: num(usage.rewards),
      transactionsThisMonth: num(usage.transactions_this_month),
      limits: limits
        ? { branches: numOrNull(limits.branches), staff: numOrNull(limits.staff), rewards: numOrNull(limits.rewards), transactionsPerMonth: numOrNull(limits.transactions_per_month) }
        : null,
    },
  };
}

/** A clean top for a bar chart's axis (1, 2, 5 × 10ⁿ) and its ticks, so gridlines land on round numbers. */
export function niceScale(max: number, tickCount = 4): { top: number; ticks: number[] } {
  if (!(max > 0)) return { top: 4, ticks: [0, 1, 2, 3, 4] };
  const rough = max / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude;
  const wholeStep = Math.max(1, Math.round(step));
  const top = Math.ceil(max / wholeStep) * wholeStep;
  const ticks: number[] = [];
  for (let t = 0; t <= top; t += wholeStep) ticks.push(t);
  return { top, ticks };
}

export const PLAN_NAMES: Record<string, string> = { free: 'Free', starter: 'Starter', growth: 'Growth', business: 'Business', enterprise: 'Enterprise' };

export type UsageRow = { key: string; label: string; used: number; limit: number | null; share: number | null; state: 'ok' | 'near' | 'over' | 'unlimited' };

/**
 * Plan usage against its limits. A null limit (or no limits at all) means unlimited. "near" from 80%. Plan limits are
 * recorded, not enforced, until the mobile apps exist (CLAUDE.md), so going over is information, not a block.
 */
export function usageRows(usage: Usage): UsageRow[] {
  const l = usage.limits;
  const row = (key: string, label: string, used: number, limit: number | null): UsageRow => {
    if (limit === null || limit <= 0) return { key, label, used, limit: null, share: null, state: 'unlimited' };
    const share = used / limit;
    return { key, label, used, limit, share, state: share > 1 ? 'over' : share >= 0.8 ? 'near' : 'ok' };
  };
  return [
    row('branches', 'Active branches', usage.branches, l?.branches ?? null),
    row('staff', 'Active staff', usage.staff, l?.staff ?? null),
    row('rewards', 'Active rewards', usage.rewards, l?.rewards ?? null),
    row('transactions', 'Transactions this month', usage.transactionsThisMonth, l?.transactionsPerMonth ?? null),
  ];
}

/**
 * Honest wording for a campaign: award transactions while it ran versus the same length of time just before it.
 * This is a comparison, not proof the campaign caused the difference.
 */
export function campaignComparison(c: Pick<CampaignRow, 'startsAt' | 'during' | 'before'>, now: Date = new Date()): { text: string; change: number | null } {
  if (!c.startsAt) return { text: 'No start date set, so there is nothing to compare yet.', change: null };
  if (new Date(c.startsAt).getTime() > now.getTime()) return { text: 'Hasn’t started yet.', change: null };
  const during = `${c.during} during`;
  const before = `${c.before} before`;
  if (c.before === 0) return { text: `${during}, ${before}.`, change: null };
  const change = Math.round(((c.during - c.before) / c.before) * 100);
  const sign = change > 0 ? '+' : '';
  return { text: `${during}, ${before} (${sign}${change}%).`, change };
}

/** One sentence that summarises the daily chart for screen readers. */
export function dailySummary(daily: DailyPoint[], label: (day: string) => string = (day) => day): string {
  if (daily.length === 0) return 'No days to show.';
  const awards = daily.reduce((s, d) => s + d.awards, 0);
  const redemptions = daily.reduce((s, d) => s + d.redemptions, 0);
  const busiest = daily.reduce((best, d) => (d.awards + d.redemptions > best.awards + best.redemptions ? d : best), daily[0]);
  const base = `${awards} award${awards === 1 ? '' : 's'} and ${redemptions} redemption${redemptions === 1 ? '' : 's'} over ${daily.length} days.`;
  return awards + redemptions === 0 ? `${base} No activity yet.` : `${base} Busiest day: ${label(busiest.day)} with ${busiest.awards + busiest.redemptions}.`;
}

/** Whether the dashboard has anything to show at all (a brand-new business has only zeros). */
export const hasActivity = (d: Dashboard): boolean =>
  d.members > 0 || d.awards > 0 || d.redemptions > 0 || d.daily.some((x) => x.awards > 0 || x.redemptions > 0);
