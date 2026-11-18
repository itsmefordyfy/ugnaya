import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBranch, parseSearch, parseType, readCustomer, readPage, readTransaction, signedPoints, typeLabel } from './transactions.ts';

test('filters from the URL are checked before they reach the database', () => {
  assert.equal(parseType('award'), 'award');
  assert.equal(parseType('delete'), null);
  assert.equal(parseType(undefined), null);
  assert.equal(parseBranch('0F8FAD5B-D9CB-469F-A165-70867728950E'), '0f8fad5b-d9cb-469f-a165-70867728950e');
  assert.equal(parseBranch('main'), null);
  assert.equal(parseSearch(`  ${'x'.repeat(100)} `).length, 80);
});

test('labels and signed points', () => {
  assert.equal(typeLabel('redeem'), 'Reward redeemed');
  assert.equal(signedPoints(12), '+12');
  assert.equal(signedPoints(-1500), '−1,500');
  assert.equal(signedPoints(0), '0');
});

test('pages of rows are read defensively', () => {
  const page = readPage({ total: '2', rows: [{ member_id: 'ABCDEFGH', name: null, balance: 40, visits: '3' }, null] }, readCustomer);
  assert.equal(page.total, 2);
  assert.equal(page.rows[0].visits, 3);
  assert.equal(page.rows[0].name, null);
  assert.equal(page.rows[1].memberId, '—');
  assert.deepEqual(readPage(null, readCustomer), { total: 0, rows: [] });
  const tx = readTransaction({ id: 't', type: 'redeem', amount_centavos: null, points: -60 });
  assert.equal(tx.amountCentavos, null);
  assert.equal(tx.points, -60);
});
