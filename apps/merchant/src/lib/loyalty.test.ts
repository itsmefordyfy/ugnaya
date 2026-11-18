import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeExample, describeExpiry, describeRule, examplePoints, parseProgramForm } from './loyalty.ts';

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const CURRENT = { pointsPerUnit: 1, unitCentavos: 1000 };

test('a per-peso program is read in pesos and stored in centavos', () => {
  const r = parseProgramForm(form({ name: 'Kape points', ruleType: 'per_peso', pointsPerUnit: '1', unitPesos: '10', minimumSpendPesos: '50', expiryMonths: '12', active: 'on' }), CURRENT);
  assert.deepEqual(r, { ok: true, value: { name: 'Kape points', ruleType: 'per_peso', pointsPerUnit: 1, unitCentavos: 1000, minimumSpendCentavos: 5000, expiryMonths: 12, active: true } });
});

test('empty minimum is none, “never” means no expiry, and an unchecked box pauses the program', () => {
  const r = parseProgramForm(form({ name: 'Kape points', ruleType: 'per_visit', pointsPerUnit: '5', minimumSpendPesos: '', expiryMonths: 'never' }), CURRENT);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.minimumSpendCentavos, 0);
    assert.equal(r.value.expiryMonths, null);
    assert.equal(r.value.active, false);
    assert.equal(r.value.pointsPerUnit, 5);
    assert.equal(r.value.unitCentavos, 1000, 'a per-visit rule keeps the stored unit');
  }
});

test('a stamp card keeps the stored points and unit (they don’t apply)', () => {
  const r = parseProgramForm(form({ name: 'Stamps', ruleType: 'stamps', pointsPerUnit: 'x', unitPesos: 'y' }), { pointsPerUnit: 3, unitCentavos: 2000 });
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual([r.value.pointsPerUnit, r.value.unitCentavos], [3, 2000]);
});

test('bad values are refused field by field', () => {
  const r = parseProgramForm(form({ name: 'K', ruleType: 'cashback', expiryMonths: '40' }), CURRENT);
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ['expiryMonths', 'name', 'ruleType']);
  const r2 = parseProgramForm(form({ name: 'Kape', ruleType: 'per_peso', pointsPerUnit: '0', unitPesos: '0.5', minimumSpendPesos: '-1' }), CURRENT);
  assert.equal(r2.ok, false);
  if (!r2.ok) assert.deepEqual(Object.keys(r2.errors).sort(), ['minimumSpendCentavos', 'pointsPerUnit', 'unitCentavos']);
});

test('the example matches the counter’s maths (floors, minimum spend)', () => {
  const perPeso = { ruleType: 'per_peso' as const, pointsPerUnit: 1, unitCentavos: 1000, minimumSpendCentavos: 0 };
  assert.equal(examplePoints(perPeso, 19950), 19, '₱199.50 at 1 per ₱10 is 19');
  assert.equal(examplePoints({ ...perPeso, minimumSpendCentavos: 10000 }, 9999), 0);
  assert.equal(examplePoints({ ruleType: 'per_visit', pointsPerUnit: 5, unitCentavos: 1000, minimumSpendCentavos: 0 }, 100), 5);
  assert.equal(examplePoints({ ruleType: 'stamps', pointsPerUnit: 1, unitCentavos: 1000, minimumSpendCentavos: 0 }, 50000), 1);
  assert.equal(examplePoints({ ...perPeso, unitCentavos: 0 }, 1000), null);
});

test('rules, examples and expiry read as plain sentences', () => {
  const perPeso = { ruleType: 'per_peso' as const, pointsPerUnit: 1, unitCentavos: 1000, minimumSpendCentavos: 5000 };
  assert.equal(describeRule(perPeso), 'Customers earn 1 point for every ₱10 spent on purchases of ₱50 or more. Partial amounts don’t round up.');
  assert.equal(describeExample(perPeso, 25000), 'A ₱250 purchase earns 25 points.');
  assert.match(describeExample(perPeso, 3000), /below the ₱50 minimum/);
  assert.equal(describeExample({ ruleType: 'stamps', pointsPerUnit: 1, unitCentavos: 1000, minimumSpendCentavos: 0 }, 25000), 'A ₱250 purchase earns 1 stamp.');
  assert.equal(describeExpiry(null), 'Points never expire.');
  assert.match(describeExpiry(12), /12 months/);
});
