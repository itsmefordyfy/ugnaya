import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRewardForm, rewardColumns, rewardState, valueBack, valueBackHint } from './rewards.ts';

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

test('a reward is read with optional limits left empty', () => {
  const r = parseRewardForm(form({ name: 'Free iced coffee', description: '', pointsCost: '120', retailValuePesos: '120', monthlyCap: '', stock: '', active: 'on' }));
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.deepEqual(rewardColumns(r.value), {
      name: 'Free iced coffee', description: null, points_cost: 120, retail_value_centavos: 12000,
      monthly_cap: null, stock: null, first_visit_only: false, active: true,
    });
  }
});

test('stock may be zero (sold out) but the cap and cost may not', () => {
  const ok = parseRewardForm(form({ name: 'Cake', pointsCost: '1,000', stock: '0', monthlyCap: '50', firstVisitOnly: 'on' }));
  assert.equal(ok.ok, true);
  if (ok.ok) assert.deepEqual([ok.value.pointsCost, ok.value.stock, ok.value.monthlyCap, ok.value.firstVisitOnly, ok.value.active], [1000, 0, 50, true, false]);
  const bad = parseRewardForm(form({ name: '', pointsCost: '0', monthlyCap: '0', stock: '-1', retailValuePesos: 'free' }));
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.deepEqual(Object.keys(bad.errors).sort(), ['monthlyCap', 'name', 'pointsCost', 'retailValueCentavos', 'stock']);
});

test('value back follows the points-per-peso rule and is only a hint', () => {
  // 1 point per ₱10: 120 points means ₱1,200 spent; a ₱120 drink is 10% back.
  const ratio = valueBack({ pointsCost: 120, retailValueCentavos: 12000 }, { ruleType: 'per_peso', pointsPerUnit: 1, unitCentavos: 1000 });
  assert.equal(ratio, 0.1);
  assert.equal(valueBackHint(ratio), 'Customers get about 10% of their spend back.');
  assert.match(valueBackHint(0.004) ?? '', /out of reach/);
  assert.match(valueBackHint(0.5) ?? '', /generous/);
  assert.equal(valueBack({ pointsCost: 10, retailValueCentavos: 5000 }, { ruleType: 'stamps', pointsPerUnit: 1, unitCentavos: 1000 }), null);
  assert.equal(valueBack({ pointsCost: 10, retailValueCentavos: null }, { ruleType: 'per_peso', pointsPerUnit: 1, unitCentavos: 1000 }), null);
});

test('a reward is live, off or out of stock', () => {
  assert.equal(rewardState({ active: true, stock: null }), 'live');
  assert.equal(rewardState({ active: true, stock: 0 }), 'out_of_stock');
  assert.equal(rewardState({ active: false, stock: 5 }), 'off');
});
