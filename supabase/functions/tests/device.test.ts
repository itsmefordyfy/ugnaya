import { assertEquals, assertRejects } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { requireDevice } from '../_shared/device.ts';
import { Forbidden, Unauthorized } from '../_shared/http.ts';
import { DEVICE, DEVICE_USER, fakeCtx } from './fakes.ts';

describe('requireDevice', () => {
  it('refuses a request with no session', async () => {
    await assertRejects(() => requireDevice(fakeCtx()), Unauthorized);
  });
  it('refuses a user who is not a registered device', async () => {
    await assertRejects(() => requireDevice(fakeCtx({ userId: 'someone', anonymous: true, tables: { devices: [DEVICE] } })), Forbidden);
  });
  it('refuses a revoked device', async () => {
    await assertRejects(
      () => requireDevice(fakeCtx({ userId: DEVICE_USER, anonymous: true, tables: { devices: [{ ...DEVICE, revoked_at: '2026-11-01' }] } })),
      Forbidden,
    );
  });
  it('returns the device and notes it was seen', async () => {
    const ctx = fakeCtx({ userId: DEVICE_USER, anonymous: true, tables: { devices: [DEVICE] } });
    assertEquals(await requireDevice(ctx), { id: DEVICE.id, merchantId: DEVICE.merchant_id, branchId: DEVICE.branch_id });
    assertEquals(typeof ctx.tables.devices[0].last_seen_at, 'string');
  });
});
