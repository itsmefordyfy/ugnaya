import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDLE_LIMIT_MS, clientIp, idleExpired, isIpAllowed, parseAllowlist, routeFor } from './access.ts';

const OUT = { signedIn: false, aal: null } as const;
const PASSWORD_ONLY = { signedIn: true, aal: 'aal1' } as const;
const FULL = { signedIn: true, aal: 'aal2' } as const;

test('a visitor can only reach the sign-in page', () => {
  assert.equal(routeFor(OUT, '/login'), null);
  for (const p of ['/', '/team', '/audit', '/mfa', '/account']) assert.equal(routeFor(OUT, p), '/login', p);
});

test('a password alone gets nothing but the second-factor step and sign-out', () => {
  assert.equal(routeFor(PASSWORD_ONLY, '/mfa'), null);
  assert.equal(routeFor(PASSWORD_ONLY, '/logout'), null);
  for (const p of ['/', '/team', '/audit', '/login', '/account']) assert.equal(routeFor(PASSWORD_ONLY, p), '/mfa', p);
});

test('with the second factor the portal opens, and sign-in pages are no longer needed', () => {
  for (const p of ['/', '/team', '/audit', '/account', '/logout']) assert.equal(routeFor(FULL, p), null, p);
  assert.equal(routeFor(FULL, '/login'), '/');
  assert.equal(routeFor(FULL, '/mfa'), '/');
});

test('the allow-list: empty means everyone, otherwise exact addresses and IPv4 ranges', () => {
  assert.deepEqual(parseAllowlist(undefined), []);
  assert.deepEqual(parseAllowlist(' 203.0.113.5 , 198.51.100.0/24,,'), ['203.0.113.5', '198.51.100.0/24']);
  assert.equal(isIpAllowed('8.8.8.8', []), true);
  assert.equal(isIpAllowed('203.0.113.5', ['203.0.113.5']), true);
  assert.equal(isIpAllowed('203.0.113.6', ['203.0.113.5']), false);
  assert.equal(isIpAllowed('198.51.100.77', ['198.51.100.0/24']), true);
  assert.equal(isIpAllowed('198.51.101.1', ['198.51.100.0/24']), false);
  assert.equal(isIpAllowed('2001:db8::1', ['2001:db8::1']), true);
});

test('with an allow-list, an unknown address is refused', () => {
  assert.equal(isIpAllowed(null, ['203.0.113.5']), false);
  assert.equal(isIpAllowed('not-an-ip', ['203.0.113.0/24']), false);
});

test('the client address is the first hop of x-forwarded-for, else x-real-ip', () => {
  const h = (map: Record<string, string>) => ({ get: (k: string) => map[k] ?? null });
  assert.equal(clientIp(h({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' })), '203.0.113.5');
  assert.equal(clientIp(h({ 'x-real-ip': '198.51.100.9' })), '198.51.100.9');
  assert.equal(clientIp(h({})), null);
});

test('a session idle for more than the limit is expired; a recent one is not', () => {
  const now = 10_000_000;
  // The cookie outlives the limit, so a missing one means it was never set or the browser dropped it: expired.
  assert.equal(idleExpired(null, now), true);
  assert.equal(idleExpired(now - 60_000, now), false);
  assert.equal(idleExpired(now - IDLE_LIMIT_MS + 1, now), false);
  assert.equal(idleExpired(now - IDLE_LIMIT_MS - 1, now), true);
  assert.equal(IDLE_LIMIT_MS, 30 * 60 * 1000);
});

test('the route that ends a bad session is reachable in every state, so a stuck session can always be cleared', () => {
  for (const gate of [OUT, PASSWORD_ONLY, FULL]) assert.equal(routeFor(gate, '/denied'), null);
});

test('an invitation link is open to everyone; the page itself asks for sign-in and the database checks the token', () => {
  for (const gate of [OUT, PASSWORD_ONLY, FULL]) assert.equal(routeFor(gate, '/join/abc123'), null);
  assert.equal(routeFor(OUT, '/join'), '/login');
  assert.equal(routeFor(PASSWORD_ONLY, '/joined'), '/mfa');
});
