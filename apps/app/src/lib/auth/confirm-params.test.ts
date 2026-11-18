import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confirmRequest } from './confirm-params.ts';

const q = (s: string) => new URLSearchParams(s);

test('the default Supabase email brings a one-time code back to us', () => {
  assert.deepEqual(confirmRequest(q('code=abc123')), { kind: 'code', code: 'abc123', next: '/' });
});

test('a custom email template brings a token_hash and a type', () => {
  assert.deepEqual(confirmRequest(q('token_hash=h1&type=email&next=/app')), { kind: 'otp', tokenHash: 'h1', type: 'email', next: '/app' });
});

test('when both are present the token_hash wins', () => {
  assert.equal(confirmRequest(q('code=c&token_hash=h&type=signup')).kind, 'otp');
});

test('an unknown type, a missing type or nothing at all is not a confirmation', () => {
  assert.deepEqual(confirmRequest(q('token_hash=h&type=bogus')), { kind: 'none', next: '/' });
  assert.deepEqual(confirmRequest(q('token_hash=h')), { kind: 'none', next: '/' });
  assert.deepEqual(confirmRequest(q('')), { kind: 'none', next: '/' });
});

test('next only ever points at a path on this site', () => {
  assert.equal(confirmRequest(q('code=c&next=https://evil.example/x')).next, '/');
  assert.equal(confirmRequest(q('code=c&next=//evil.example')).next, '/');
  assert.equal(confirmRequest(q('code=c&next=/app')).next, '/app');
});
