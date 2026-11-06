import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { verifyStaffGrant } from '../_shared/staff-grant.ts';
import { handle } from '../staff-unlock/handler.ts';
import { DEVICE, DEVICE_USER, fakeCtx, fakeDeps, post, SECRET } from './fakes.ts';

const ANA = { id: '53000000-0000-4000-8000-000000000003', display_name: 'Ana', role: 'cashier', merchant_id: DEVICE.merchant_id };
const NOW = 1_800_000_000_000;

describe('staff-unlock', () => {
  it('turns a right PIN into a 12-hour grant bound to this device', async () => {
    const ctx = fakeCtx({ userId: DEVICE_USER, anonymous: true, tables: { devices: [DEVICE], merchant_staff: [ANA] },
      rpc: { check_staff_pin: (args) => (args.p_pin === '1234' && args.p_device_user === DEVICE_USER ? ANA.id : null) } });
    const response = await handle(post({ pin: '1234' }), fakeDeps(ctx, { STAFF_GRANT_SECRET: SECRET }, undefined, NOW));
    assertEquals(response.status, 200);
    const body = await response.json();
    assertEquals(body.staff, { id: ANA.id, displayName: 'Ana', role: 'cashier' });
    const grant = await verifyStaffGrant(body.staffGrant, SECRET, NOW);
    assertEquals(grant?.deviceId, DEVICE.id);
    assertEquals(grant?.exp, NOW / 1000 + 12 * 3600);
  });
  it('refuses a wrong PIN', async () => {
    const ctx = fakeCtx({ userId: DEVICE_USER, anonymous: true, tables: { devices: [DEVICE] },
      rpc: { check_staff_pin: () => { throw new Error('staff_not_allowed'); } } });
    const response = await handle(post({ pin: '9999' }), fakeDeps(ctx, { STAFF_GRANT_SECRET: SECRET }));
    assertEquals(response.status, 403);
    assertEquals(await response.json(), { error: 'staff_not_allowed' });
  });
  it('says so when the grant secret is missing', async () => {
    const ctx = fakeCtx({ userId: DEVICE_USER, anonymous: true, tables: { devices: [DEVICE] } });
    const response = await handle(post({ pin: '1234' }), fakeDeps(ctx));
    assertEquals(response.status, 500);
    assertEquals(await response.json(), { error: 'misconfigured' });
  });
});
