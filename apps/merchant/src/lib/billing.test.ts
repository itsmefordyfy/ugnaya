import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foundingPrice, manilaMonthStart, usageShare, usageText } from './billing.ts';

test('founding merchants pay 60% of the list price', () => {
  assert.equal(foundingPrice(39900), 23940);
  assert.equal(foundingPrice(89900), 53940);
  assert.equal(foundingPrice(0), 0);
});

test('usage against a limit; null means no limit', () => {
  assert.equal(usageText(2, 3), '2 of 3');
  assert.equal(usageText(7, null), '7 (no limit)');
  assert.equal(usageShare(2, 4), 0.5);
  assert.equal(usageShare(9, 4), 1);
  assert.equal(usageShare(1, null), null);
});

test('the month starts at midnight in Manila', () => {
  assert.equal(manilaMonthStart(new Date('2026-11-07T10:00:00Z')), '2026-10-31T16:00:00.000Z');
  // 1 Dec 03:00 in Manila is still 30 Nov in UTC.
  assert.equal(manilaMonthStart(new Date('2026-11-30T19:00:00Z')), '2026-11-30T16:00:00.000Z');
});
