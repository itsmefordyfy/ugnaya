import type { Deps } from '../_shared/context.ts';
import { requireDevice } from '../_shared/device.ts';
import { call } from '../_shared/errors.ts';
import { Forbidden, HttpError, readBody, respond, stringField } from '../_shared/http.ts';
import { signStaffGrant, type StaffGrant } from '../_shared/staff-grant.ts';

const GRANT_HOURS = 12;

type StaffRow = { id: string; display_name: string; role: StaffGrant['role'] };

/** A cashier types their PIN on a shared device; the answer is their 12-hour staff grant. */
export function handle(req: Request, deps: Deps): Promise<Response> {
  return respond(async () => {
    const device = await requireDevice(deps.ctx);
    const secret = deps.env('STAFF_GRANT_SECRET');
    if (!secret) throw new HttpError(500, 'misconfigured');
    const pin = stringField(await readBody(req), 'pin', 6);

    const staffId = await call<string | null>(deps.ctx, 'check_staff_pin', { p_device_user: deps.ctx.userId, p_pin: pin });
    const staff = staffId ? await deps.ctx.selectOne<StaffRow>('merchant_staff', { id: staffId }) : null;
    if (!staff) throw new Forbidden('staff_not_allowed');

    const exp = Math.floor(deps.now() / 1000) + GRANT_HOURS * 3600;
    const staffGrant = await signStaffGrant(
      { staffId: staff.id, deviceId: device.id, merchantId: device.merchantId, branchId: device.branchId, role: staff.role, exp },
      secret,
    );
    return {
      staffGrant,
      staff: { id: staff.id, displayName: staff.display_name, role: staff.role },
      expiresAt: new Date(exp * 1000).toISOString(),
    };
  });
}
