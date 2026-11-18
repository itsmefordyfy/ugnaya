import { test } from 'node:test';
import assert from 'node:assert/strict';
import { campaignComparison, dailySummary, hasActivity, niceScale, normaliseDashboard, parseDays, usageRows } from './dashboard.ts';

const RAW = {
  days: 30, since: '2026-10-09T00:00:00+00:00', rewards_claimed: 4, members: 120, new_members: 12, active_members: 40,
  transactions: { award: 90, redeem: 5, void: 1, sales_centavos: 1234500 },
  points: { issued: 900, redeemed: 300 }, outstanding_points: '5000',
  daily: [{ day: '2026-11-06', awards: 3, redemptions: 1 }, { day: '2026-11-07', awards: 5, redemptions: 0 }],
  branches: [{ branch_id: 'b1', name: 'Main', active: true, awards: 90, redemptions: 5, sales_centavos: 1234500, customers: 40 }],
  campaigns: [{ id: 'c1', name: 'Rainy day', status: 'running', starts_at: '2026-11-01T00:00:00Z', ends_at: null, transactions_during: 12, transactions_before: 8 }],
  top_rewards: [{ reward_id: 'r2', name: 'Cookie', redemptions: 1 }, { reward_id: 'r1', name: 'Free latte', redemptions: 3 }],
  usage: { plan: 'free', branches: 1, staff: 2, rewards: 1, transactions_this_month: 280, limits: { branches: 1, staff: 2, rewards: 1, transactions_per_month: 300 } },
};

test('the dashboard jsonb is read into named figures, bigint strings included', () => {
  const d = normaliseDashboard(RAW);
  assert.equal(d.members, 120);
  assert.equal(d.outstandingPoints, 5000);
  assert.equal(d.salesCentavos, 1234500);
  assert.equal(d.awards, 90);
  assert.equal(d.pointsRedeemed, 300);
  assert.equal(d.daily.length, 2);
  assert.equal(d.branches[0].customers, 40);
  assert.deepEqual(d.topRewards.map((r) => r.name), ['Free latte', 'Cookie'], 'most redeemed first');
  assert.equal(d.usage.limits?.transactionsPerMonth, 300);
  assert.equal(hasActivity(d), true);
});

test('missing or malformed fields become zeros and empty lists, never a crash', () => {
  for (const raw of [null, undefined, 'x', [], {}, { transactions: null, daily: 'no', usage: { limits: null } }]) {
    const d = normaliseDashboard(raw);
    assert.equal(d.members, 0);
    assert.deepEqual(d.daily, []);
    assert.equal(d.usage.limits, null);
    assert.equal(d.usage.plan, null);
    assert.equal(hasActivity(d), false);
  }
});

test('the day selector accepts 7, 30 or 90 only', () => {
  assert.equal(parseDays('7'), 7);
  assert.equal(parseDays('90'), 90);
  assert.equal(parseDays('45'), 30);
  assert.equal(parseDays(undefined), 30);
  assert.equal(parseDays(['7', '90']), 7);
});

test('chart axes land on round numbers', () => {
  assert.deepEqual(niceScale(0), { top: 4, ticks: [0, 1, 2, 3, 4] });
  assert.deepEqual(niceScale(3), { top: 3, ticks: [0, 1, 2, 3] });
  assert.deepEqual(niceScale(17), { top: 20, ticks: [0, 5, 10, 15, 20] });
  const big = niceScale(1234);
  assert.equal(big.top >= 1234, true);
  assert.equal(big.ticks.at(-1), big.top);
  assert.ok(big.ticks.length <= 6);
});

test('plan usage: a null limit is unlimited, 80% is near, past the limit is over', () => {
  const d = normaliseDashboard(RAW);
  const rows = usageRows(d.usage);
  assert.equal(rows.find((r) => r.key === 'staff')?.state, 'near');
  assert.equal(rows.find((r) => r.key === 'transactions')?.state, 'near');
  const unlimited = usageRows({ ...d.usage, limits: { branches: 3, staff: null, rewards: null, transactionsPerMonth: null } });
  assert.equal(unlimited.find((r) => r.key === 'staff')?.state, 'unlimited');
  assert.equal(unlimited.find((r) => r.key === 'branches')?.state, 'ok');
  assert.ok(usageRows({ ...d.usage, limits: null }).every((r) => r.state === 'unlimited'));
  assert.equal(usageRows({ ...d.usage, branches: 2 }).find((r) => r.key === 'branches')?.state, 'over');
});

test('campaign comparisons are worded as a comparison, with the change only when there is a base', () => {
  const now = new Date('2026-11-07T00:00:00Z');
  assert.deepEqual(campaignComparison({ startsAt: '2026-11-01T00:00:00Z', during: 12, before: 8 }, now), { text: '12 during, 8 before (+50%).', change: 50 });
  assert.deepEqual(campaignComparison({ startsAt: '2026-11-01T00:00:00Z', during: 4, before: 8 }, now), { text: '4 during, 8 before (-50%).', change: -50 });
  assert.equal(campaignComparison({ startsAt: '2026-11-01T00:00:00Z', during: 4, before: 0 }, now).change, null);
  assert.match(campaignComparison({ startsAt: '2026-12-01T00:00:00Z', during: 0, before: 0 }, now).text, /started/);
  assert.match(campaignComparison({ startsAt: null, during: 0, before: 0 }, now).text, /No start date/);
});

test('the chart has a sentence for screen readers', () => {
  const d = normaliseDashboard(RAW);
  assert.equal(dailySummary(d.daily), '8 awards and 1 redemption over 2 days. Busiest day: 2026-11-07 with 5.');
  assert.match(dailySummary([{ day: '2026-11-07', awards: 0, redemptions: 0 }]), /No activity yet/);
  assert.equal(dailySummary([]), 'No days to show.');
});
