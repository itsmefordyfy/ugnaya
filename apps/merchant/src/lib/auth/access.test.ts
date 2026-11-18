import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canInviteStaff, canView, homePath, isLocked, isPublicPath, navFor, roleLabel, sectionOf, signInRedirect, SECTION_ORDER } from './access.ts';

test('cashiers see the counter only; owners and managers see everything', () => {
  assert.deepEqual(navFor('cashier').map((s) => s.key), ['counter']);
  assert.deepEqual(navFor('owner').map((s) => s.key), SECTION_ORDER);
  assert.deepEqual(navFor('manager').map((s) => s.key), SECTION_ORDER);
  assert.equal(canView('dashboard', 'cashier'), false);
  assert.equal(canView('counter', 'cashier'), true);
});

test('rewards, campaigns and the counter are locked until the business is approved', () => {
  for (const status of ['draft', 'pending_verification', 'under_review', 'info_required', 'rejected', 'suspended', 'closed'] as const) {
    assert.equal(isLocked('rewards', status), true, status);
    assert.equal(isLocked('campaigns', status), true, status);
    assert.equal(isLocked('counter', status), true, status);
    assert.equal(canInviteStaff(status), false, status);
    // Profile, branches and documents stay editable.
    assert.equal(isLocked('profile', status), false, status);
    assert.equal(isLocked('branches', status), false, status);
    assert.equal(isLocked('application', status), false, status);
  }
  assert.equal(isLocked('rewards', 'active'), false);
  assert.equal(isLocked('counter', 'active'), false);
  assert.equal(canInviteStaff('active'), true);
});

test('each role starts in its own place', () => {
  assert.equal(homePath('cashier', 'active'), '/counter');
  assert.equal(homePath('cashier', 'draft'), '/counter');
  assert.equal(homePath('owner', 'active'), '/dashboard');
  assert.equal(homePath('manager', 'active'), '/dashboard');
  assert.equal(homePath('owner', 'draft'), '/application');
  assert.equal(homePath('owner', 'info_required'), '/application');
  assert.equal(homePath('owner', 'suspended'), '/application');
});

test('role labels: a manager with branches is a branch manager', () => {
  assert.equal(roleLabel('owner', null), 'Owner');
  assert.equal(roleLabel('manager', null), 'Manager');
  assert.equal(roleLabel('manager', []), 'Manager');
  assert.equal(roleLabel('manager', ['b1']), 'Branch manager');
  assert.equal(roleLabel('cashier', ['b1']), 'Cashier');
});

test('paths map to their section', () => {
  assert.equal(sectionOf('/branches'), 'branches');
  assert.equal(sectionOf('/branches/new'), 'branches');
  assert.equal(sectionOf('/branchesx'), null);
  assert.equal(sectionOf('/'), null);
});

test('only sign-in, registration, recovery, auth callbacks and invitations are open to visitors', () => {
  for (const p of ['/login', '/register', '/forgot-password', '/logout', '/auth/confirm', '/auth/confirm/finish', '/auth/error', '/auth/callback', '/invite/abc']) {
    assert.equal(isPublicPath(p), true, p);
  }
  for (const p of ['/', '/dashboard', '/counter', '/application', '/reset-password', '/invite', '/login/extra']) {
    assert.equal(isPublicPath(p), false, p);
  }
});

test('after sign-in: a safe path on this site, otherwise the front door', () => {
  assert.equal(signInRedirect('/rewards'), '/rewards');
  assert.equal(signInRedirect('/invite/abc'), '/invite/abc');
  assert.equal(signInRedirect('https://evil.example'), '/');
  assert.equal(signInRedirect('//evil.example'), '/');
  assert.equal(signInRedirect(null), '/');
  assert.equal(signInRedirect('/login?next=/x'), '/');
});
