import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isEmail, parseRegisterForm, parseWaitlistForm } from './validation.ts';

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
test('the waitlist takes an email or a mobile number', () => {
  assert.deepEqual(parseWaitlistForm(form({ contact: 'juan@example.com' })), { ok: true, value: { contact: 'juan@example.com', kind: 'email' } });
  assert.deepEqual(parseWaitlistForm(form({ contact: '09171234567', city: 'Naga City' })),
    { ok: true, value: { contact: '+639171234567', kind: 'mobile', city: 'Naga City' } });
  assert.equal(parseWaitlistForm(form({ contact: 'hello' })).ok, false);
});
test('isEmail', () => {
  assert.equal(isEmail('a@b.ph'), true);
  assert.equal(isEmail('a@b'), false);
  assert.equal(isEmail(' a@b.ph'), false);
});
