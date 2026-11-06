import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { signStaffGrant, type StaffGrant, verifyStaffGrant } from '../_shared/staff-grant.ts';
import { SECRET } from './fakes.ts';

const grant: StaffGrant = { staffId: 's', deviceId: 'd', merchantId: 'm', branchId: 'b', role: 'cashier', exp: 2_000_000_000 };

describe('staff grants', () => {
  it('round-trips', async () => {
    assertEquals(await verifyStaffGrant(await signStaffGrant(grant, SECRET), SECRET, 1_900_000_000_000), grant);
  });
  it('refuses a tampered, expired or foreign grant', async () => {
    const token = await signStaffGrant(grant, SECRET);
    const [payload, signature] = token.split('.');
    const forged = btoa(JSON.stringify({ ...grant, role: 'owner' })).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    assertEquals(await verifyStaffGrant(`${forged}.${signature}`, SECRET), null);
    assertEquals(await verifyStaffGrant(token, SECRET, 2_000_000_000_000), null);
    assertEquals(await verifyStaffGrant(token, 'another-secret-0123456789abcdef0123'), null);
    assertEquals(await verifyStaffGrant(`${payload}`, SECRET), null);
    assertEquals(await verifyStaffGrant('', SECRET), null);
  });
});
