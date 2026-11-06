import type { Deps } from '../_shared/context.ts';
import { requireCounter } from '../_shared/device.ts';
import { call } from '../_shared/errors.ts';
import { readBody, respond, stringField, uuidField } from '../_shared/http.ts';

/** A cashier voids their own recent transaction from the counter device. */
export function handle(req: Request, deps: Deps): Promise<Response> {
  return respond(async () => {
    const body = await readBody(req);
    const { device, grant } = await requireCounter(body, deps);
    return await call(deps.ctx, 'void_transaction', {
      p_idempotency_key: stringField(body, 'idempotencyKey', 100),
      p_merchant_id: device.merchantId,
      p_staff_id: grant.staffId,
      p_device_id: device.id,
      p_transaction_id: uuidField(body, 'transactionId'),
      p_reason: stringField(body, 'reason', 300),
    });
  });
}
