import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCsp } from './csp.ts';

const directive = (csp: string, name: string) => csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? '';

test('scripts run only with this request’s nonce, never inline or eval, in production', () => {
  const csp = buildCsp({ nonce: 'abc123', development: false, supabaseUrl: 'https://x.supabase.co' });
  const script = directive(csp, 'script-src');
  assert.match(script, /'nonce-abc123'/);
  assert.match(script, /'strict-dynamic'/);
  assert.doesNotMatch(script, /unsafe-inline|unsafe-eval/);
});

test('the page cannot be framed, cannot post forms elsewhere, and loads no plugins', () => {
  const csp = buildCsp({ nonce: 'n', development: false, supabaseUrl: 'https://x.supabase.co' });
  assert.match(directive(csp, 'frame-ancestors'), /'none'/);
  assert.match(directive(csp, 'form-action'), /^form-action 'self'$/);
  assert.match(directive(csp, 'object-src'), /'none'/);
  assert.match(directive(csp, 'base-uri'), /'self'/);
  assert.match(csp, /upgrade-insecure-requests/);
});

test('the browser may talk to this site and the Supabase project, nowhere else', () => {
  const connect = directive(buildCsp({ nonce: 'n', development: false, supabaseUrl: 'https://x.supabase.co' }), 'connect-src');
  assert.equal(connect, "connect-src 'self' https://x.supabase.co");
});

test('development adds only what the dev server needs', () => {
  const csp = buildCsp({ nonce: 'n', development: true, supabaseUrl: 'https://x.supabase.co' });
  assert.match(directive(csp, 'script-src'), /unsafe-eval/);
  assert.match(directive(csp, 'connect-src'), /ws:\/\/localhost/);
  assert.doesNotMatch(csp, /upgrade-insecure-requests/);
});

test('inline style attributes (used for sizing) are allowed, inline style blocks need the nonce', () => {
  const csp = buildCsp({ nonce: 'n', development: false, supabaseUrl: 'https://x.supabase.co' });
  assert.match(directive(csp, 'style-src-attr'), /'unsafe-inline'/);
  assert.match(directive(csp, 'style-src'), /'nonce-n'/);
});

test('in development, styles load freely so the Next dev toolbar renders; production keeps the nonce rule', () => {
  const dev = buildCsp({ nonce: 'n', development: true, supabaseUrl: 'https://x.supabase.co' });
  const style = dev.split(';').map((d) => d.trim()).find((d) => d.startsWith('style-src ')) ?? '';
  assert.match(style, /'unsafe-inline'/);
  // A nonce would make browsers ignore 'unsafe-inline', so development leaves it out of style-src.
  assert.doesNotMatch(style, /nonce/);
  const prod = buildCsp({ nonce: 'n', development: false, supabaseUrl: 'https://x.supabase.co' });
  const prodStyle = prod.split(';').map((d) => d.trim()).find((d) => d.startsWith('style-src ')) ?? '';
  assert.doesNotMatch(prodStyle, /unsafe-inline/);
});
