import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { signStaffGrant } from '../_shared/staff-grant.ts';
import { handle } from '../void/handler.ts';
import { DEVICE, DEVICE_USER, fakeCtx, fakeDeps, post, SECRET } from './fakes.ts';

const NOW = 1_800_000_000_000;
const grant = () => signStaffGrant({ staffId: 's1', deviceId: DEVICE.id, merchantId: DEVICE.merchant_id, branchId: DEVICE.branch_id,
  role: 'cashier', exp: NOW / 1000 + 3600 }, SECRET);
const TX = '60000000-0000-4000-8000-000000000001';

describe('void', () => {
  it('voids with the reason', async () => {
    const ctx = fakeCtx({ userId: DEVICE_USER, anonymous: true, tables: { devices: [DEVICE] },
      rpc: { void_transaction: (args) => ({ voided_transaction_id: args.p_transaction_id, reason: args.p_reason }) } });
    const response = await handle(post({ idempotencyKey: 'v1', staffGrant: await grant(), transactionId: TX, reason: 'wrong amount' }),
      fakeDeps(ctx, { STAFF_GRANT_SECRET: SECRET }, undefined, NOW));
    assertEquals(response.status, 200);
    assertEquals(await response.json(), { voided_transaction_id: TX, reason: 'wrong amount' });
  });
  it('passes void_window through', async () => {
    const ctx = fakeCtx({ userId: DEVICE_USER, anonymous: true, tables: { devices: [DEVICE] },
      rpc: { void_transaction: () => { throw new Error('void_window'); } } });
    const response = await handle(post({ idempotencyKey: 'v1', staffGrant: await grant(), transactionId: TX, reason: 'late' }),
      fakeDeps(ctx, { STAFF_GRANT_SECRET: SECRET }, undefined, NOW));
    assertEquals(response.status, 409);
    assertEquals(await response.json(), { error: 'void_window' });
  });
  it('wants a transaction id that is a uuid', async () => {
    const ctx = fakeCtx({ userId: DEVICE_USER, anonymous: true, tables: { devices: [DEVICE] } });
    const response = await handle(post({ idempotencyKey: 'v1', staffGrant: await grant(), transactionId: 'abc', reason: 'x' }),
      fakeDeps(ctx, { STAFF_GRANT_SECRET: SECRET }, undefined, NOW));
    assertEquals(response.status, 400);
  });
});
