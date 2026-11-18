import { test } from 'node:test';
import assert from 'node:assert/strict';
import { friendlyError } from './errors.ts';

test('every counter code has its own plain sentence', () => {
  for (const code of ['invalid_member_code', 'merchant_inactive', 'staff_not_allowed', 'token_used', 'token_expired',
    'token_invalid', 'insufficient_points', 'monthly_cap', 'daily_limit', 'receipt_duplicate', 'amount_invalid',
    'reward_unavailable', 'first_visit_only', 'customer_unknown']) {
    const text = friendlyError({ message: code });
    assert.notEqual(text, friendlyError('unknown_code_xyz'), code);
    assert.ok(!text.includes('_'), `${code} reads as a sentence`);
  }
});

test('refusals from row-level security and grants read as permission problems', () => {
  assert.match(friendlyError({ message: 'new row violates row-level security policy for table "rewards"', code: '42501' }), /role/);
  assert.match(friendlyError({ message: 'permission denied for table merchants' }), /role/);
});

test('a function the server doesn’t have yet says so; anything else is a generic retry', () => {
  assert.match(friendlyError({ message: 'Could not find the function public.counter_award', code: 'PGRST202' }), /isn’t switched on/);
  assert.equal(friendlyError({ message: 'boom' }), 'Something went wrong. Please try again.');
  assert.equal(friendlyError(null), 'Something went wrong. Please try again.');
});

test('the security-review codes read as sentences', () => {
  for (const code of ['use_invite', 'branch_out_of_scope', 'email_unconfirmed', 'identity_locked', 'logo_invalid', 'application_locked']) {
    const text = friendlyError({ message: code });
    assert.notEqual(text, friendlyError('unknown_code_xyz'), code);
  }
});
