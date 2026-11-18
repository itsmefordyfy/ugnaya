import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPeso, FOUNDING, PLANS } from './plans.ts';

test('prices match the business plan and the database (plan_limits)', () => {
  assert.deepEqual(PLANS.map((p) => p.priceCentavos), [0, 39900, 89900, 199900, null]);
  assert.deepEqual(PLANS.map((p) => p.code), ['free', 'starter', 'growth', 'business', 'enterprise']);
});
test('Free is 1 branch, 2 staff, 1 reward, 300 transactions a month', () => {
  const free = PLANS[0];
  assert.deepEqual([free.branches, free.staff, free.rewards, free.transactionsPerMonth], [1, 2, 1, 300]);
});
test('exactly one plan is highlighted, and it is Growth', () => {
  assert.deepEqual(PLANS.filter((p) => p.highlight).map((p) => p.code), ['growth']);
});
test('pesos print without centavos for whole amounts', () => {
  assert.equal(formatPeso(199900), '₱1,999');
  assert.equal(formatPeso(39900), '₱399');
  assert.equal(formatPeso(0), '₱0');
});
test('founding merchants: 40% off for 12 months after a 90-day pilot', () => {
  assert.deepEqual(FOUNDING, { discountPercent: 40, months: 12, pilotDays: 90 });
});
