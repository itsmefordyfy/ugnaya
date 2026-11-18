import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canRevokeInvite, editRules, inviteRoleOptions, inviteState, inviteUrl, isInviteToken, parseCashierForm, parseEditForm, parseInviteForm,
} from './staff.ts';

const form = (fields: Record<string, string | string[]>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) for (const v of [value].flat()) data.append(key, v);
  return data;
};
const B1 = '0f8fad5b-d9cb-469f-a165-70867728950e';
const B2 = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const TOKEN = 'a'.repeat(16) + '0123456789abcdef'.repeat(2);

test('invitation links are the merchant portal’s own /invite/<token>', () => {
  assert.equal(inviteUrl('https://merchant.ugnaya.com', TOKEN), `https://merchant.ugnaya.com/invite/${TOKEN}`);
  assert.equal(inviteUrl('http://localhost:3003/', TOKEN), `http://localhost:3003/invite/${TOKEN}`);
  assert.equal(isInviteToken(TOKEN), true);
  assert.equal(isInviteToken(TOKEN.toUpperCase()), false);
  assert.equal(isInviteToken(TOKEN.slice(1)), false);
  assert.equal(isInviteToken('../../etc'), false);
  assert.equal(isInviteToken(undefined), false);
});

test('owners invite managers and cashiers, managers only cashiers, cashiers nobody', () => {
  assert.deepEqual(inviteRoleOptions('owner'), ['manager', 'cashier']);
  assert.deepEqual(inviteRoleOptions('manager'), ['cashier']);
  assert.deepEqual(inviteRoleOptions('cashier'), []);
});

test('an invitation needs an email, a name and a role the caller may give', () => {
  const ok = parseInviteForm(form({ email: ' Ana@Example.com ', displayName: 'Ana', role: 'manager', branchIds: [B1, B1] }), 'owner');
  assert.deepEqual(ok, { ok: true, value: { email: 'ana@example.com', displayName: 'Ana', role: 'manager', branchIds: [B1] } });
  const managerAsks = parseInviteForm(form({ email: 'a@b.co', displayName: 'Ana', role: 'manager' }), 'manager');
  assert.equal(managerAsks.ok, false);
  const bad = parseInviteForm(form({ email: 'nope', displayName: '', role: 'owner', branchIds: 'x' }), 'owner');
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.deepEqual(Object.keys(bad.errors).sort(), ['branchIds', 'displayName', 'email', 'role']);
});

test('a PIN cashier needs a 4 to 6 digit PIN typed twice', () => {
  assert.deepEqual(parseCashierForm(form({ displayName: 'Ben', pin: '1234', pinConfirm: '1234' })),
    { ok: true, value: { displayName: 'Ben', pin: '1234', branchIds: [] } });
  for (const pin of ['123', '1234567', '12a4', '']) {
    const r = parseCashierForm(form({ displayName: 'Ben', pin, pinConfirm: pin }));
    assert.equal(r.ok, false, pin);
    if (!r.ok) assert.ok(r.errors.pin, pin);
  }
  const mismatch = parseCashierForm(form({ displayName: 'Ben', pin: '1234', pinConfirm: '4321' }));
  assert.equal(mismatch.ok, false);
  if (!mismatch.ok) assert.ok(mismatch.errors.pinConfirm);
});

test('the edit form reads the staff id, role, branches and whether they’re active', () => {
  assert.deepEqual(parseEditForm(form({ staffId: B2, displayName: 'Ben', role: 'cashier', branchIds: [B1], active: 'on' })),
    { ok: true, value: { staffId: B2, displayName: 'Ben', role: 'cashier', branchIds: [B1], active: true } });
  const off = parseEditForm(form({ staffId: B2, displayName: 'Ben', role: 'cashier' }));
  assert.equal(off.ok && off.value.active, false);
  assert.equal(parseEditForm(form({ staffId: 'nope', displayName: 'Ben', role: 'cashier' })).ok, false);
  assert.equal(parseEditForm(form({ staffId: B2, displayName: 'Ben', role: 'boss' })).ok, false);
});

test('edit rules mirror merchant_update_staff', () => {
  const owner = { role: 'owner' as const, userId: 'u-owner' };
  const manager = { role: 'manager' as const, userId: 'u-manager' };
  // The owner row: name only.
  assert.deepEqual(editRules(owner, owner), { canEdit: true, roleOptions: ['owner'], canChangeActive: false, canChangeBranches: false });
  // Owner edits a manager with a login: may make them a cashier, turn them off, change branches.
  assert.deepEqual(editRules(owner, { role: 'manager', userId: 'u2' }).roleOptions, ['manager', 'cashier']);
  // A PIN-only cashier can't become a manager (login_required).
  assert.deepEqual(editRules(owner, { role: 'cashier', userId: null }).roleOptions, ['cashier']);
  // Managers edit cashiers, never other managers or the owner.
  assert.equal(editRules(manager, { role: 'cashier', userId: null }).canEdit, true);
  assert.deepEqual(editRules(manager, { role: 'cashier', userId: 'u3' }).roleOptions, ['cashier']);
  assert.equal(editRules(manager, { role: 'manager', userId: 'u2' }).canEdit, false);
  assert.equal(editRules(manager, { role: 'owner', userId: 'u-owner' }).canEdit, false);
  // Nobody changes their own role or turns themselves off; a manager can't widen their own branches.
  assert.deepEqual(editRules(manager, manager), { canEdit: true, roleOptions: ['manager'], canChangeActive: false, canChangeBranches: false });
  // Cashiers edit nobody.
  assert.equal(editRules({ role: 'cashier', userId: 'c' }, { role: 'cashier', userId: null }).canEdit, false);
});

test('an invitation is open, accepted, cancelled or expired', () => {
  const now = new Date('2026-11-07T00:00:00Z');
  const base = { accepted_at: null, revoked_at: null, expires_at: '2026-11-10T00:00:00Z' };
  assert.equal(inviteState(base, now), 'open');
  assert.equal(inviteState({ ...base, expires_at: '2026-11-06T00:00:00Z' }, now), 'expired');
  assert.equal(inviteState({ ...base, revoked_at: '2026-11-06T00:00:00Z' }, now), 'revoked');
  assert.equal(inviteState({ ...base, accepted_at: '2026-11-06T00:00:00Z', revoked_at: '2026-11-06T00:00:00Z' }, now), 'accepted');
  assert.equal(canRevokeInvite('owner', { role: 'manager' }, 'open'), true);
  assert.equal(canRevokeInvite('manager', { role: 'manager' }, 'open'), false);
  assert.equal(canRevokeInvite('manager', { role: 'cashier' }, 'open'), true);
  assert.equal(canRevokeInvite('owner', { role: 'cashier' }, 'expired'), false);
});
