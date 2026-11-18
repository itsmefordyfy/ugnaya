import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerStep } from './register-step.ts';

test('a visitor starts at the account step', () => {
  assert.equal(registerStep({ user: null, hasMerchant: false, justSignedUp: false }), 'account');
});
test('right after an email sign-up: check your email', () => {
  assert.equal(registerStep({ user: null, hasMerchant: false, justSignedUp: true }), 'check-email');
});
test('a signed-in owner without a business returns to the business step', () => {
  assert.equal(registerStep({ user: { id: 'u' }, hasMerchant: false, justSignedUp: false }), 'business');
  assert.equal(registerStep({ user: { id: 'u' }, hasMerchant: false, justSignedUp: true }), 'business');
});
test('a registered owner is done', () => {
  assert.equal(registerStep({ user: { id: 'u' }, hasMerchant: true, justSignedUp: false }), 'done');
});
