import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWebsite, parseProfileForm } from './profile.ts';

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const VALID = { trade_name: 'Kape ni Juan', city: 'Naga City' };

test('a minimal profile is accepted, empty optional fields become null', () => {
  const r = parseProfileForm(form({ ...VALID, legal_name: '', website: '' }));
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.legal_name, null);
    assert.equal(r.value.website, null);
    assert.equal(r.value.owner_mobile, null);
  }
});

test('contact details are normalised', () => {
  const r = parseProfileForm(form({ ...VALID, website: 'kapenijuan.ph', owner_mobile: '0917 123 4567', contact_email: 'hi@kapenijuan.ph', contact_phone: '(054) 472 1234' }));
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.website, 'https://kapenijuan.ph');
    assert.equal(r.value.owner_mobile, '+639171234567');
    assert.equal(r.value.contact_phone, '(054) 472 1234');
  }
});

test('each field’s limit gives its own message', () => {
  const r = parseProfileForm(form({ trade_name: 'K', city: '', description: 'x'.repeat(501), contact_email: 'nope', website: 'not a site', owner_mobile: '123', contact_phone: 'call me' }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ['city', 'contact_email', 'contact_phone', 'description', 'owner_mobile', 'trade_name', 'website']);
});

test('web addresses', () => {
  assert.equal(normalizeWebsite('https://example.com/menu/'), 'https://example.com/menu');
  assert.equal(normalizeWebsite('localhost'), null);
  assert.equal(normalizeWebsite('javascript:alert(1)'), null);
  assert.equal(normalizeWebsite(''), null);
});
