import type { Ctx } from './context.ts';
import { HttpError } from './http.ts';

/** The codes the points functions raise (supabase/migrations), and the HTTP status each answers with. */
export const SQL_ERROR_STATUS: Record<string, number> = {
  sign_in_required: 401,
  merchant_inactive: 403,
  staff_not_allowed: 403,
  device_not_allowed: 403,
  forbidden: 403,
  request_invalid: 400,
  amount_invalid: 400,
  pin_invalid: 400,
  insufficient_points: 402,
  customer_unknown: 404,
  invalid_member_code: 404,
  token_invalid: 404,
  reward_unavailable: 404,
  receipt_duplicate: 409,
  token_used: 409,
  monthly_cap: 409,
  first_visit_only: 409,
  void_window: 409,
  not_voidable: 409,
  already_registered: 409,
  pin_taken: 409,
  token_expired: 410,
  daily_limit: 429,
};

export function rpcErrorResponse(error: { message: string }): Response {
  const status = SQL_ERROR_STATUS[error.message];
  if (status) return Response.json({ error: error.message }, { status });
  console.error(error);
  return Response.json({ error: 'internal' }, { status: 500 });
}

/** Calls a database function; a known refusal becomes an HttpError, anything else an internal error. */
export async function call<T>(ctx: Ctx, fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await ctx.rpc<T>(fn, args);
  if (error) {
    const status = SQL_ERROR_STATUS[error.message];
    if (status) throw new HttpError(status, error.message);
    throw new Error(`${fn}: ${error.message}`);
  }
  return data as T;
}
