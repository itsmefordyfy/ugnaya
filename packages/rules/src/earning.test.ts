import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NETWORK_RULE, pointsForPurchase, type EarningRule } from './earning.ts';

const perPeso = (pointsPerUnit: number, unitCentavos: number, minimumSpendCentavos: number): EarningRule => ({
  kind: 'per_peso',
  pointsPerUnit,
  unitCentavos,
  minimumSpendCentavos,
});

test('₱200 at 1 per ₱10 earns 20', () => assert.equal(pointsForPurchase(perPeso(1, 1000, 0), 20000), 20));
test('₱250 at the network rate earns 12, rounded down', () => assert.equal(pointsForPurchase(NETWORK_RULE, 25000), 12));
test('₱199.50 at 1 per ₱10 earns 19, never 20', () => assert.equal(pointsForPurchase(perPeso(1, 1000, 0), 19950), 19));
test('minimum spend: equal earns, one centavo under earns nothing', () => {
  assert.equal(pointsForPurchase(perPeso(1, 1000, 10000), 10000), 10);
  assert.equal(pointsForPurchase(perPeso(1, 1000, 10000), 9999), 0);
});
test('per visit and stamps', () => {
  assert.equal(pointsForPurchase({ kind: 'per_visit', points: 5, minimumSpendCentavos: 0 }, 1), 5);
  assert.equal(pointsForPurchase({ kind: 'stamps', minimumSpendCentavos: 5000 }, 5000), 1);
});
test('bad rules and amounts throw', () => {
  assert.throws(() => pointsForPurchase(perPeso(1, 0, 0), 100), RangeError);
  assert.throws(() => pointsForPurchase(perPeso(-1, 1000, 0), 100), RangeError);
  assert.throws(() => pointsForPurchase({ kind: 'per_visit', points: 0, minimumSpendCentavos: 0 }, 100), RangeError);
  assert.throws(() => pointsForPurchase(NETWORK_RULE, 10.5), RangeError);
  assert.throws(() => pointsForPurchase(NETWORK_RULE, -1), RangeError);
});
