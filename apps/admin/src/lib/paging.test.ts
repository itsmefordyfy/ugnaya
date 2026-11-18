import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hrefWith, isUuid, lastPage, likePrefix, oneOf, pageOffset, param, parsePage } from './paging.ts';

test('page numbers from the URL', () => {
  assert.equal(parsePage('3'), 3);
  for (const bad of ['', '0', '-1', '1.5', 'abc', '9999999']) assert.equal(parsePage(bad), 1, bad);
  assert.equal(pageOffset(3), 50);
  assert.equal(lastPage(0), 1);
  assert.equal(lastPage(26), 2);
});

test('params and allowed values', () => {
  assert.equal(param({ q: ['  kape ', 'x'] }, 'q'), 'kape');
  assert.equal(param({}, 'q'), '');
  assert.equal(oneOf('active', ['active', 'rejected'] as const, 'active'), 'active');
  assert.equal(oneOf("x' or 1=1", ['active', 'rejected'] as const, 'active'), 'active');
});

test('links keep filters, drop empties, and reset the page when a filter changes', () => {
  const current = { q: 'kape', status: 'active', page: '3' };
  assert.equal(hrefWith('/merchants', current, { page: 4 }), '/merchants?q=kape&status=active&page=4');
  assert.equal(hrefWith('/merchants', current, { status: 'rejected' }), '/merchants?q=kape&status=rejected');
  assert.equal(hrefWith('/merchants', current, { q: null, status: '', page: 1 }), '/merchants');
  assert.equal(hrefWith('/merchants', { q: 'a&b' }), '/merchants?q=a%26b');
});

test('prefix filters and ids', () => {
  assert.equal(likePrefix('merchant.'), 'merchant.%');
  assert.equal(likePrefix('50%_off'), '50\\%\\_off%');
  assert.ok(isUuid('0b7c1e7e-4a8f-4b62-9d43-3c2f3f0f8a11'));
  assert.ok(!isUuid('not-a-uuid'));
});
