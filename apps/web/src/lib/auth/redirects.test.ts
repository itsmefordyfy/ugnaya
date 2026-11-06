import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gateFor, safeNext } from './redirects.ts';

test('/app needs a session', () => {
  assert.equal(gateFor('/app', { signedIn: false, hasMerchant: false }), '/login?next=/app');
  assert.equal(gateFor('/app', { signedIn: true, hasMerchant: false }), null);
  assert.equal(gateFor('/app', { signedIn: true, hasMerchant: true }), null);
});
test('a registered owner skips /register and /login', () => {
  assert.equal(gateFor('/register', { signedIn: true, hasMerchant: true }), '/app');
  assert.equal(gateFor('/register', { signedIn: true, hasMerchant: false }), null);
  assert.equal(gateFor('/register', { signedIn: false, hasMerchant: false }), null);
  assert.equal(gateFor('/login', { signedIn: true, hasMerchant: true }), '/app');
  assert.equal(gateFor('/login', { signedIn: true, hasMerchant: false }), '/register');
  assert.equal(gateFor('/login', { signedIn: false, hasMerchant: false }), null);
});
test('next only ever points inside this site', () => {
  assert.equal(safeNext('/register'), '/register');
  assert.equal(safeNext('/app?welcome=1'), '/app?welcome=1');
  assert.equal(safeNext('https://evil.example'), null);
  assert.equal(safeNext('//evil.example'), null);
  assert.equal(safeNext('/\\evil.example'), null);
  assert.equal(safeNext(''), null);
  assert.equal(safeNext(null), null);
});
