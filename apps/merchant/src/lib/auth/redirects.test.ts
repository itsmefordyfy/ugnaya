import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNext } from './redirects.ts';

test('next only ever points inside this site', () => {
  assert.equal(safeNext('/register'), '/register');
  assert.equal(safeNext('/merchant?welcome=1'), '/merchant?welcome=1');
  assert.equal(safeNext('https://evil.example'), null);
  assert.equal(safeNext('//evil.example'), null);
  assert.equal(safeNext('/\\evil.example'), null);
  assert.equal(safeNext(''), null);
  assert.equal(safeNext(null), null);
});

test('control characters and whitespace can never smuggle another host (the URL parser strips them)', () => {
  for (const sneaky of ['/\t/evil.example', '/\n/evil.example', '/\r/evil.example', '/ /evil.example', '/%09/evil.example'.replace('%09', '\t')]) {
    assert.equal(safeNext(sneaky), null, JSON.stringify(sneaky));
  }
  assert.equal(safeNext('/@evil.example'), '/@evil.example', 'a path, not a host');
});
