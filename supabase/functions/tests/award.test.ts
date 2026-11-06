import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { signStaffGrant } from '../_shared/staff-grant.ts';
import { handle } from '../award/handler.ts';
import { DEVICE, DEVICE_USER, fakeCtx, fakeDeps, post, SECRET } from './fakes.ts';

const STAFF = '53000000-0000-4000-8000-000000000003';
const CUSTOMER = '57000000-0000-4000-8000-000000000001';
const NOW = 1_800_000_000_000;
const grantFor = (deviceId: string) => signStaffGrant({ staffId: STAFF, deviceId, merchantId: DEVICE.merchant_id,
  branchId: DEVICE.branch_id, role: 'cashier', exp: NOW / 1000 + 3600 }, SECRET);
const RESULT = { transaction_id: 't1', replayed: false, merchant: { program_id: 'p', points_earned: 20, balance: 20 }, network: null };

function setup(awardImpl: (args: Record<string, unknown>) => unknown = () => RESULT) {
  return fakeCtx({ userId: DEVICE_USER, anonymous: true, tables: { devices: [DEVICE] },
    rpc: { verify_member_code: (args) => (args.p_code === 'U:AB2CD3EF:287082' ? CUSTOMER : null), award_points: awardImpl } });
}

describe('award', () => {
  it('verifies the member code, then awards as this device and staff member', async () => {
    const ctx = setup();
    const response = await handle(post({ idempotencyKey: 'k1', staffGrant: await grantFor(DEVICE.id), memberCode: 'U:AB2CD3EF:287082',
      amountCentavos: 20000, receiptNo: 'OR-1' }), fakeDeps(ctx, { STAFF_GRANT_SECRET: SECRET }, undefined, NOW));
    assertEquals(response.status, 200);
    assertEquals(await response.json(), RESULT);
    assertEquals(ctx.rpcCalls.at(-1), { fn: 'award_points', args: { p_idempotency_key: 'k1', p_merchant_id: DEVICE.merchant_id,
      p_branch_id: DEVICE.branch_id, p_staff_id: STAFF, p_device_id: DEVICE.id, p_customer_id: CUSTOMER,
      p_amount_centavos: 20000, p_receipt_no: 'OR-1' } });
  });
  it('refuses a grant made for another device', async () => {
    const response = await handle(post({ idempotencyKey: 'k1', staffGrant: await grantFor('other-device'), memberCode: 'U:AB2CD3EF:287082',
      amountCentavos: 20000 }), fakeDeps(setup(), { STAFF_GRANT_SECRET: SECRET }, undefined, NOW));
    assertEquals(response.status, 401);
    assertEquals(await response.json(), { error: 'grant_invalid' });
  });
  it('passes the database refusal through', async () => {
    const ctx = setup(() => { throw new Error('daily_limit'); });
    const response = await handle(post({ idempotencyKey: 'k1', staffGrant: await grantFor(DEVICE.id), memberCode: 'U:AB2CD3EF:287082',
      amountCentavos: 20000 }), fakeDeps(ctx, { STAFF_GRANT_SECRET: SECRET }, undefined, NOW));
    assertEquals(response.status, 429);
    assertEquals(await response.json(), { error: 'daily_limit' });
  });
  it('wants a whole amount', async () => {
    const response = await handle(post({ idempotencyKey: 'k1', staffGrant: await grantFor(DEVICE.id), memberCode: 'U:AB2CD3EF:287082' }),
      fakeDeps(setup(), { STAFF_GRANT_SECRET: SECRET }, undefined, NOW));
    assertEquals(response.status, 400);
  });
});
