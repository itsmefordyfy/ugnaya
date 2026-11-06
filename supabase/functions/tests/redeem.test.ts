import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { signStaffGrant } from '../_shared/staff-grant.ts';
import { handle } from '../redeem/handler.ts';
import { DEVICE, DEVICE_USER, fakeCtx, fakeDeps, post, SECRET } from './fakes.ts';

const NOW = 1_800_000_000_000;
const TOKEN = 'ab'.repeat(32);
const grant = () => signStaffGrant({ staffId: 's1', deviceId: DEVICE.id, merchantId: DEVICE.merchant_id, branchId: DEVICE.branch_id,
  role: 'cashier', exp: NOW / 1000 + 3600 }, SECRET);
const ctxWith = (impl: (args: Record<string, unknown>) => unknown) =>
  fakeCtx({ userId: DEVICE_USER, anonymous: true, tables: { devices: [DEVICE] }, rpc: { redeem_reward: impl } });

describe('redeem', () => {
  it('redeems the scanned token', async () => {
    const ctx = ctxWith((args) => ({ transaction_id: 't', reward_name: 'Free upsize', token: args.p_token }));
    const response = await handle(post({ idempotencyKey: 'r1', staffGrant: await grant(), redemptionCode: `R:${TOKEN}` }),
      fakeDeps(ctx, { STAFF_GRANT_SECRET: SECRET }, undefined, NOW));
    assertEquals(response.status, 200);
    assertEquals((await response.json()).token, TOKEN);
  });
  it('refuses a code that is not a redemption QR', async () => {
    const response = await handle(post({ idempotencyKey: 'r1', staffGrant: await grant(), redemptionCode: 'U:AB2CD3EF:287082' }),
      fakeDeps(ctxWith(() => null), { STAFF_GRANT_SECRET: SECRET }, undefined, NOW));
    assertEquals(response.status, 400);
    assertEquals(await response.json(), { error: 'code_invalid' });
  });
  it('passes token_used through', async () => {
    const response = await handle(post({ idempotencyKey: 'r1', staffGrant: await grant(), redemptionCode: `R:${TOKEN}` }),
      fakeDeps(ctxWith(() => { throw new Error('token_used'); }), { STAFF_GRANT_SECRET: SECRET }, undefined, NOW));
    assertEquals(response.status, 409);
  });
});
