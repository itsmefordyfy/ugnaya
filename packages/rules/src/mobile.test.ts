import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhMobile } from './mobile.ts';

test('the usual ways of writing a Philippine mobile number', () => {
  for (const input of ['09171234567', '9171234567', '+639171234567', '63 917 123 4567', '0917-123-4567', '0917.123.4567', '+63 917 123 4567']) {
    assert.equal(normalizePhMobile(input), '+639171234567', input);
  }
});
test('wrong lengths and non-mobile numbers are refused', () => {
  for (const input of ['0917123456', '+6391712345678', '12345', '0217123456', '', 'abc']) {
    assert.equal(normalizePhMobile(input), null, input);
  }
});
