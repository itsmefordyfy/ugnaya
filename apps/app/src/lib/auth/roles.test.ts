import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authPageRedirect, canEnter, destinationFor, isPublicPath, resolveRole, signInRedirect, type AccountFacts, type Role } from './roles.ts';

const NONE: AccountFacts = { staffRole: null, isCustomer: false };
const PORTALS = { merchant: 'https://merchant.ugnaya.com' };

test('an account resolves to exactly one role, strongest first', () => {
  assert.equal(resolveRole({ ...NONE, staffRole: 'owner', isCustomer: true }), 'owner');
  assert.equal(resolveRole({ ...NONE, staffRole: 'owner' }), 'owner');
  assert.equal(resolveRole({ ...NONE, staffRole: 'manager' }), 'staff');
  assert.equal(resolveRole({ ...NONE, staffRole: 'cashier' }), 'staff');
  assert.equal(resolveRole({ ...NONE, isCustomer: true }), 'customer');
  assert.equal(resolveRole(NONE), 'unregistered');
});

test('customers stay here; business accounts go to the merchant portal', () => {
  assert.equal(destinationFor('customer', PORTALS), '/wallet');
  assert.equal(destinationFor('owner', PORTALS), 'https://merchant.ugnaya.com/');
  assert.equal(destinationFor('staff', PORTALS), 'https://merchant.ugnaya.com/');
  assert.equal(destinationFor('unregistered', PORTALS), 'https://merchant.ugnaya.com/login?next=%2Fregister', 'finish the business step in the portal');
});

test('the wallet is for customers only', () => {
  const roles: Role[] = ['owner', 'staff', 'customer', 'unregistered'];
  assert.deepEqual(roles.filter((r) => canEnter('wallet', r)), ['customer']);
});

test('a signed-in person who opens sign-in or register is sent where they belong', () => {
  assert.equal(authPageRedirect('customer', PORTALS), '/wallet');
  assert.equal(authPageRedirect('owner', PORTALS), 'https://merchant.ugnaya.com/');
  assert.equal(authPageRedirect(null, PORTALS), null, 'a visitor sees the page');
  assert.equal(authPageRedirect('unregistered', PORTALS), 'https://merchant.ugnaya.com/login?next=%2Fregister');
});

test('sign-in goes to the page the person asked for, when that is a safe path on this site', () => {
  assert.equal(signInRedirect('/wallet', 'customer', PORTALS), '/wallet');
  assert.equal(signInRedirect('https://evil.example', 'customer', PORTALS), '/wallet');
  assert.equal(signInRedirect(null, 'owner', PORTALS), 'https://merchant.ugnaya.com/');
  assert.equal(signInRedirect('/wallet', 'staff', PORTALS), 'https://merchant.ugnaya.com/', 'merchant staff never land in the wallet');
});

test('only sign-in, registration, recovery, the auth callbacks and the old merchant addresses are public', () => {
  for (const p of ['/login', '/register', '/forgot-password', '/auth/confirm', '/auth/confirm/finish', '/auth/error', '/auth/callback', '/logout', '/merchant', '/pos']) {
    assert.equal(isPublicPath(p), true, p);
  }
  for (const p of ['/', '/wallet', '/reset-password', '/anything', '/login/extra']) {
    assert.equal(isPublicPath(p), false, p);
  }
});
