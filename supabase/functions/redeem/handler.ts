import type { Deps } from '../_shared/context.ts';
import { requireCounter } from '../_shared/device.ts';
import { call } from '../_shared/errors.ts';
import { BadRequest, readBody, respond, stringField } from '../_shared/http.ts';

const REDEMPTION_CODE = /^R:([0-9a-f]{8,128})$/;

/** The cashier scanned a redemption QR (`R:<token>`): take the points, say what to hand over. */
export function handle(req: Request, deps: Deps): Promise<Response> {
  return respond(async () => {
    const body = await readBody(req);
    const { device, grant } = await requireCounter(body, deps);
    const idempotencyKey = stringField(body, 'idempotencyKey', 100);
    const match = REDEMPTION_CODE.exec(stringField(body, 'redemptionCode', 140).trim());
    if (!match) throw new BadRequest('code_invalid');

    return await call(deps.ctx, 'redeem_reward', {
      p_idempotency_key: idempotencyKey,
      p_merchant_id: device.merchantId,
      p_branch_id: device.branchId,
      p_staff_id: grant.staffId,
      p_device_id: device.id,
      p_token: match[1],
    });
  });
}
