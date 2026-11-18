import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isEmail } from './email.ts';

test('accepts ordinary addresses', () => {
  assert.ok(isEmail('maria@example.com'));
  assert.ok(isEmail('first.last+tag@sub.example.co'));
});

test('rejects what is not an address', () => {
  for (const bad of ['', 'maria', 'maria@', '@example.com', 'maria@example', 'ma ria@example.com', 'a@b.c', 'a@@b.com']) {
    assert.equal(isEmail(bad), false, bad);
  }
});
