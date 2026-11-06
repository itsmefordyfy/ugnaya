import type { Ctx, Deps } from './context.ts';
import { BadRequest, Forbidden, HttpError, Unauthorized } from './http.ts';
import { verifyStaffGrant } from './staff-grant.ts';

export type Device = { id: string; merchantId: string; branchId: string };

type DeviceRow = { id: string; merchant_id: string; branch_id: string; revoked_at: string | null };

/** The registered, not revoked, counter device the caller is signed in as. */
export async function requireDevice(ctx: Ctx): Promise<Device> {
  if (!ctx.userId) throw new Unauthorized('sign_in_required');
  const row = await ctx.selectOne<DeviceRow>('devices', { user_id: ctx.userId });
  if (!row || row.revoked_at) throw new Forbidden('device_not_allowed');
  // Best effort: the owner's device list shows when each was last used.
  await ctx.update('devices', { last_seen_at: new Date().toISOString() }, { id: row.id }).catch(() => undefined);
  return { id: row.id, merchantId: row.merchant_id, branchId: row.branch_id };
}

/** The device, and the staff member whose grant it carries; the grant must be for this device. */
export async function requireCounter(body: Record<string, unknown>, deps: Deps) {
  const device = await requireDevice(deps.ctx);
  const secret = deps.env('STAFF_GRANT_SECRET');
  if (!secret) throw new HttpError(500, 'misconfigured');
  const token = body.staffGrant;
  if (typeof token !== 'string') throw new BadRequest('request_invalid', '"staffGrant" is required');
  const grant = await verifyStaffGrant(token, secret, deps.now());
  if (!grant || grant.deviceId !== device.id || grant.merchantId !== device.merchantId) {
    throw new Unauthorized('grant_invalid');
  }
  return { device, grant };
}
