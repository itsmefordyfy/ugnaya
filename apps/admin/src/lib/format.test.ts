import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysSince, formatCount, formatPercent, formatPeso, formatPoints, humanize, pesosToCentavos } from './format.ts';

test('money is shown from centavos with the peso sign and two decimals', () => {
  assert.equal(formatPeso(0), '₱0.00');
  assert.equal(formatPeso(39900), '₱399.00');
  assert.equal(formatPeso(199950), '₱1,999.50');
  assert.equal(formatPeso(123456789), '₱1,234,567.89');
  assert.equal(formatPeso(-500), '-₱5.00');
  assert.equal(formatPeso(null), '—');
  assert.equal(formatPeso(Number.NaN), '—');
});

test('counts and points are grouped, and points never look like money', () => {
  assert.equal(formatCount(1234567), '1,234,567');
  assert.equal(formatCount(undefined), '—');
  assert.equal(formatPoints(1500), '1,500 pts');
  assert.equal(formatPoints(50, { signed: true }), '+50 pts');
  assert.equal(formatPoints(-20, { signed: true }), '-20 pts');
  assert.equal(formatPoints(0, { signed: true }), '0 pts');
});

test('percentages and words', () => {
  assert.equal(formatPercent(0.4256), '42.6%');
  assert.equal(formatPercent(null), '—');
  assert.equal(humanize('pending_verification'), 'Pending verification');
  assert.equal(humanize('merchant.approve'), 'Merchant approve');
});

test('pesos typed in a form become integer centavos', () => {
  assert.equal(pesosToCentavos('399'), 39900);
  assert.equal(pesosToCentavos('1,999.5'), 199950);
  assert.equal(pesosToCentavos('₱ 0.05'), 5);
  assert.equal(pesosToCentavos('12.345'), null);
  assert.equal(pesosToCentavos('-5'), null);
  assert.equal(pesosToCentavos(''), null);
});

test('days waiting', () => {
  const now = Date.parse('2026-11-07T12:00:00Z');
  assert.equal(daysSince('2026-11-04T12:00:00Z', now), 3);
  assert.equal(daysSince('2026-11-08T00:00:00Z', now), 0);
});

test('calendar days are never shifted into a time zone', async () => {
  const { formatDay } = await import('./format.ts');
  assert.equal(formatDay('2026-11-07'), 'Nov 7, 2026');
  assert.equal(formatDay('2026-01-01', { short: true }), 'Jan 1');
  assert.equal(formatDay(null), '—');
  assert.equal(formatDay('nope'), '—');
});
