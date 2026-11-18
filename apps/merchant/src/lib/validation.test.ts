import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNewPassword, parseRegisterForm } from './validation.ts';

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};
const VALID = {
  tradeName: 'Kape ni Juan', category: 'cafe', city: 'Naga City', address: 'Magsaysay Ave',
  branchCount: '1', ownerMobile: '0917 123 4567', heardFrom: 'facebook', acceptTerms: 'on',
};

test('a complete form is accepted and the mobile number normalised', () => {
  const result = parseRegisterForm(form(VALID));
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.ownerMobile, '+639171234567');
    assert.equal(result.value.branchCount, 1);
    assert.equal(result.value.marketingConsent, false);
  }
});
test('a short mobile number is refused with a message, not a crash', () => {
  const result = parseRegisterForm(form({ ...VALID, ownerMobile: '0917123456' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.ownerMobile ?? '', /mobile/i);
});
test('the terms must be accepted', () => {
  const result = parseRegisterForm(form({ ...VALID, acceptTerms: '' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.acceptTerms);
});
test('names, categories and branch counts are checked', () => {
  const bad = parseRegisterForm(form({ ...VALID, tradeName: 'A', category: 'bar', branchCount: '0' }));
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.deepEqual(Object.keys(bad.errors).sort(), ['branchCount', 'category', 'tradeName']);
});
test('sign-up needs a real email, a name and an 8-character password', async () => {
  const { parseSignUpForm } = await import('./validation.ts');
  const ok = parseSignUpForm(form({ fullName: 'Juan Dela Cruz', email: 'juan@example.com', password: 'longenough' }));
  assert.deepEqual(ok, { ok: true, value: { fullName: 'Juan Dela Cruz', email: 'juan@example.com', password: 'longenough' } });
  const bad = parseSignUpForm(form({ fullName: 'J', email: 'nope', password: 'short' }));
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.deepEqual(Object.keys(bad.errors).sort(), ['email', 'fullName', 'password']);
});

test('a new password must be 8 to 72 characters and typed twice the same', () => {
  assert.deepEqual(parseNewPassword(form({ password: 'longenough', confirm: 'longenough' })), { ok: true, value: 'longenough' });
  const short = parseNewPassword(form({ password: 'short', confirm: 'short' }));
  assert.ok(!short.ok && /8/.test(short.error));
  const mismatch = parseNewPassword(form({ password: 'longenough', confirm: 'different1' }));
  assert.ok(!mismatch.ok && /match/i.test(mismatch.error));
  assert.equal(parseNewPassword(form({ password: 'x'.repeat(73), confirm: 'x'.repeat(73) })).ok, false);
});
