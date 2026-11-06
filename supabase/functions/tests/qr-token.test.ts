import { assertEquals, assertMatch } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { handle } from '../qr-token/handler.ts';
import { fakeCtx, fakeDeps, post } from './fakes.ts';

const CUSTOMER = '57000000-0000-4000-8000-000000000001';
const PROFILE = { user_id: CUSTOMER, public_member_id: 'AB2CD3EF', deleted_at: null };
const NOW = 1_800_000_000_000;
const customerCtx = (rpc = {}) => fakeCtx({ userId: CUSTOMER, tables: { customer_profiles: [PROFILE] }, rpc });

describe('qr-token', () => {
  it('refuses anonymous sessions and non-customers', async () => {
    assertEquals((await handle(post({ action: 'web-code' }), fakeDeps(fakeCtx({ userId: 'd', anonymous: true })))).status, 401);
    assertEquals((await handle(post({ action: 'web-code' }), fakeDeps(fakeCtx({ userId: 'merchant-user' })))).status, 401);
  });
  it('gives the app a TOTP secret and stores it', async () => {
    const ctx = customerCtx();
    const response = await handle(post({ action: 'device-secret', label: 'Maria’s phone' }), fakeDeps(ctx, {}, undefined, NOW));
    const body = await response.json();
    assertEquals(body.memberId, 'AB2CD3EF');
    assertMatch(body.secretBase32, /^[A-Z2-7]{32}$/);
    assertEquals(ctx.tables.customer_devices.length, 1);
    assertMatch(String(ctx.tables.customer_devices[0].totp_secret), /^\\x[0-9a-f]{40}$/);
  });
  it('gives the web wallet a short-lived code and stores only its hash', async () => {
    const ctx = customerCtx();
    const body = await (await handle(post({ action: 'web-code' }), fakeDeps(ctx, {}, undefined, NOW))).json();
    assertMatch(body.memberCode, /^U:AB2CD3EF:W[A-Za-z0-9_-]{16}$/);
    assertEquals(body.expiresAt, new Date(NOW + 5 * 60_000).toISOString());
    const stored = ctx.tables.member_web_codes[0];
    assertMatch(String(stored.code_hash), /^[0-9a-f]{64}$/);
    assertEquals(String(stored.code_hash).includes(body.memberCode.slice(12)), false);
  });
  it('turns a reward into a redemption QR', async () => {
    const ctx = customerCtx({ issue_redemption_token: (args: Record<string, unknown>) =>
      ({ token: 'ab'.repeat(32), expires_at: 'soon', points_cost: 40, reward_name: 'Free upsize', customer: args.p_customer_id }) });
    const body = await (await handle(post({ action: 'redemption', rewardId: '56000000-0000-4000-8000-000000000001' }), fakeDeps(ctx))).json();
    assertEquals(body, { redemptionCode: `R:${'ab'.repeat(32)}`, expiresAt: 'soon', pointsCost: 40, rewardName: 'Free upsize' });
    assertEquals(ctx.rpcCalls[0].args.p_customer_id, CUSTOMER);
  });
  it('refuses an unknown action', async () => {
    assertEquals((await handle(post({ action: 'other' }), fakeDeps(customerCtx()))).status, 400);
  });
});
