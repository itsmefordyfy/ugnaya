import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWaitlistForm } from './waitlist.ts';

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

test('the waitlist takes an email or a mobile number', () => {
  assert.deepEqual(parseWaitlistForm(form({ contact: 'juan@example.com' })), { ok: true, value: { contact: 'juan@example.com', kind: 'email' } });
  assert.deepEqual(parseWaitlistForm(form({ contact: '09171234567', city: 'Naga City' })),
    { ok: true, value: { contact: '+639171234567', kind: 'mobile', city: 'Naga City' } });
});

test('anything else is refused with a message', () => {
  const bad = parseWaitlistForm(form({ contact: 'hello' }));
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(bad.error, /email/i);
});

test('an over-long city is trimmed, not rejected', () => {
  const ok = parseWaitlistForm(form({ contact: 'a@b.co', city: 'x'.repeat(200) }));
  assert.ok(ok.ok && ok.value.city?.length === 80);
});
