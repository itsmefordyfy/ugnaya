import type { Deps } from '../_shared/context.ts';
import { requireCounter } from '../_shared/device.ts';
import { call } from '../_shared/errors.ts';
import { intField, optionalStringField, readBody, respond, stringField } from '../_shared/http.ts';

/** The cashier scanned a member code and typed the amount: award the points. */
export function handle(req: Request, deps: Deps): Promise<Response> {
  return respond(async () => {
    const body = await readBody(req);
    const { device, grant } = await requireCounter(body, deps);
    const idempotencyKey = stringField(body, 'idempotencyKey', 100);
    const memberCode = stringField(body, 'memberCode', 100);
    const amountCentavos = intField(body, 'amountCentavos');
    const receiptNo = optionalStringField(body, 'receiptNo', 40);

    const customerId = await call<string>(deps.ctx, 'verify_member_code', { p_code: memberCode });
    return await call(deps.ctx, 'award_points', {
      p_idempotency_key: idempotencyKey,
      p_merchant_id: device.merchantId,
      p_branch_id: device.branchId,
      p_staff_id: grant.staffId,
      p_device_id: device.id,
      p_customer_id: customerId,
      p_amount_centavos: amountCentavos,
      p_receipt_no: receiptNo,
    });
  });
}
