import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actionLabel, actorLabel, changeSummary } from './activity.ts';

test('known actions read as plain words, including the ones UGNAYA’s team writes', () => {
  assert.equal(actionLabel('merchant.registered'), 'Business registered');
  assert.equal(actionLabel('merchant.submitted'), 'Application sent for review');
  assert.equal(actionLabel('merchant.request_info'), 'UGNAYA asked for more information');
  assert.equal(actionLabel('merchant.approve'), 'Business approved');
  assert.equal(actionLabel('document.added'), 'Document uploaded');
  assert.equal(actionLabel('staff.invite_revoked'), 'Invitation cancelled');
  assert.equal(actionLabel('points.awarded'), 'Points awarded');
});

test('unknown actions are humanised, never shown as codes', () => {
  assert.equal(actionLabel('reward.price_changed'), 'Reward: price changed');
  assert.equal(actionLabel('fraud_flag.resolved'), 'Fraud flag: resolved');
  assert.equal(actionLabel('odd'), 'Odd');
  assert.equal(actionLabel(''), 'Activity');
});

test('who did it is a kind of actor, not a database role', () => {
  assert.equal(actorLabel('authenticated'), 'Your team');
  assert.equal(actorLabel('admin:operations_admin'), 'UGNAYA team');
  assert.equal(actorLabel('service_role'), 'UGNAYA system');
  assert.equal(actorLabel(null), 'System');
});

test('changes are summarised in words, at most three parts', () => {
  assert.equal(changeSummary('merchant.submitted', { status: 'draft' }, { status: 'pending_verification' }), 'Status: Draft → Pending review');
  assert.equal(changeSummary('staff.added', null, { name: 'Ana', role: 'cashier', has_login: false }), 'Name: Ana · Role: Cashier · Has a sign-in: no');
  assert.equal(changeSummary('staff.updated', { name: 'Ana', role: 'cashier', active: true, branch_ids: null }, { name: 'Ana', role: 'manager', active: false, branch_ids: ['b'] }), 'Role: Cashier → Manager · Active: yes → no');
  assert.equal(changeSummary('document.removed', { kind: 'permit', file_name: 'permit.pdf' }, null), 'Document: Mayor’s or business permit · File: permit.pdf');
  assert.equal(changeSummary('staff.invite_revoked', null, null), null);
});

test('points actions say the points', () => {
  assert.equal(changeSummary('points.awarded', null, { merchant: { points_earned: 12, balance: 40 }, network: null }), '+12 points');
  assert.equal(changeSummary('points.redeemed', null, { reward_name: 'Free latte', points_cost: 60 }), 'Free latte, −60 points');
  assert.equal(changeSummary('points.expired', { balance: 30 }, { balance: 0 }), '30 points expired');
});
