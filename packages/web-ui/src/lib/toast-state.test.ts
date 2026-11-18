import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_TOASTS, addToast, dismissToast, ttlFor, type Toast } from './toast-state.ts';

const t = (id: string, tone: Toast['tone'] = 'success', action = false): Toast => ({ id, tone, title: id, ...(action ? { action: { label: 'Undo', onAction: () => {} } } : {}) });

test('a new toast goes on the end; only the newest few are kept', () => {
  let list: Toast[] = [];
  for (const id of ['a', 'b', 'c', 'd', 'e']) list = addToast(list, t(id));
  assert.equal(list.length, MAX_TOASTS);
  assert.deepEqual(list.map((x) => x.id), ['c', 'd', 'e']);
});

test('adding a toast with an id already shown replaces it instead of stacking', () => {
  const list = addToast(addToast([], t('a')), { ...t('a'), title: 'changed' });
  assert.equal(list.length, 1);
  assert.equal(list[0].title, 'changed');
});

test('dismissing removes just that toast and ignores an unknown id', () => {
  const list = [t('a'), t('b')];
  assert.deepEqual(dismissToast(list, 'a').map((x) => x.id), ['b']);
  assert.equal(dismissToast(list, 'zzz').length, 2);
});

test('how long a toast stays: 4 s, 6 s with an action, errors until dismissed', () => {
  assert.equal(ttlFor(t('a', 'success')), 4000);
  assert.equal(ttlFor(t('a', 'info')), 4000);
  assert.equal(ttlFor(t('a', 'success', true)), 6000);
  assert.equal(ttlFor(t('a', 'error')), null);
});
