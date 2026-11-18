import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sessionFromHash } from './hash-session.ts';

test('reads the tokens Supabase puts after the # when a link has no code', () => {
  assert.deepEqual(
    sessionFromHash('#access_token=aaa&expires_in=3600&refresh_token=rrr&token_type=bearer&type=signup'),
    { accessToken: 'aaa', refreshToken: 'rrr' },
  );
});

test('works with or without the leading #', () => {
  assert.deepEqual(sessionFromHash('access_token=a&refresh_token=r'), { accessToken: 'a', refreshToken: 'r' });
});

test('an expired or used link has an error in the fragment and no session', () => {
  assert.equal(sessionFromHash('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'), null);
});

test('missing either token, or nothing at all, is no session', () => {
  assert.equal(sessionFromHash('#access_token=only'), null);
  assert.equal(sessionFromHash('#refresh_token=only'), null);
  assert.equal(sessionFromHash(''), null);
  assert.equal(sessionFromHash('#'), null);
});
