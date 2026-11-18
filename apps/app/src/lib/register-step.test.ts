import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerStep } from './register-step.ts';

test('a visitor starts at the account step', () => {
  assert.equal(registerStep({ user: null, justSignedUp: false }), 'account');
});
test('right after an email sign-up: check your email', () => {
  assert.equal(registerStep({ user: null, justSignedUp: true }), 'check-email');
});
test('a signed-in person is done here (businesses finish in the merchant portal)', () => {
  assert.equal(registerStep({ user: { id: 'u' }, justSignedUp: false }), 'done');
  assert.equal(registerStep({ user: { id: 'u' }, justSignedUp: true }), 'done');
});
