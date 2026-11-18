import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { confirmationRedirect } from './confirm-url.ts';

test('the confirmation link returns to the site the owner signed up on', () => {
  assert.equal(confirmationRedirect('http://localhost:3003'), 'http://localhost:3003/auth/confirm');
  assert.equal(confirmationRedirect('http://localhost:3000'), 'http://localhost:3000/auth/confirm');
  assert.equal(confirmationRedirect('https://ugnaya.ph'), 'https://ugnaya.ph/auth/confirm');
});

test('the email template links to that address, not always to production', () => {
  const template = readFileSync(new URL('../../../../../supabase/templates/confirm.html', import.meta.url), 'utf8');
  assert.match(template, /href="\{\{ \.RedirectTo \}\}\?token_hash=\{\{ \.TokenHash \}\}&type=email&next=\/register"/);
  assert.doesNotMatch(template, /\{\{ \.SiteURL \}\}\/auth\/confirm/);
});
