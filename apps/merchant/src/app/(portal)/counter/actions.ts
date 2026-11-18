'use server';

import { actionContext } from '@/lib/auth/action';
import {
  awardOutcome, errorOutcome, parseAwardForm, parseRedeemForm, redeemOutcome, type CounterOutcome,
} from '@/lib/counter';

export type CounterState = {
  outcome?: CounterOutcome;
  fieldErrors?: Record<string, string>;
  error?: string;
  /** Changes on every answer, so the form can tell two identical answers apart. */
  at?: number;
};

/**
 * Award points for a purchase. The browser sends one idempotency key per submission and keeps it until the cashier
 * moves on, so a double tap or a retry answers with the first result instead of awarding twice (counter_award checks
 * the key before anything else). The merchant always comes from the session, never from the form.
 */
export async function awardPoints(_previous: CounterState, form: FormData): Promise<CounterState> {
  const parsed = parseAwardForm(form);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, error: parsed.error, at: Date.now() };
  const { ctx, supabase } = await actionContext('counter');
  if (ctx.locked) return { outcome: errorOutcome({ message: 'merchant_inactive' }), at: Date.now() };
  const { branchId, memberCode, amountCentavos, receiptNo, idempotencyKey } = parsed.value;
  const { data, error } = await supabase.rpc('counter_award', {
    p_merchant_id: ctx.merchant.id,
    p_branch_id: branchId,
    p_member_code: memberCode,
    p_amount_centavos: amountCentavos,
    // No receipt is sent as an empty string: the function trims it and stores none.
    p_receipt_no: receiptNo ?? '',
    p_idempotency_key: idempotencyKey,
  });
  if (error) return { outcome: errorOutcome(error), at: Date.now() };
  return { outcome: awardOutcome(data), at: Date.now() };
}

/** Redeem a voucher (R:<token>) the customer claimed in their app. Same idempotency rule as awarding. */
export async function redeemVoucher(_previous: CounterState, form: FormData): Promise<CounterState> {
  const parsed = parseRedeemForm(form);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, error: parsed.error, at: Date.now() };
  const { ctx, supabase } = await actionContext('counter');
  if (ctx.locked) return { outcome: errorOutcome({ message: 'merchant_inactive' }), at: Date.now() };
  const { branchId, code, idempotencyKey } = parsed.value;
  const { data, error } = await supabase.rpc('counter_redeem', {
    p_merchant_id: ctx.merchant.id,
    p_branch_id: branchId,
    p_code: code,
    p_idempotency_key: idempotencyKey,
  });
  if (error) return { outcome: errorOutcome(error), at: Date.now() };
  return { outcome: redeemOutcome(data), at: Date.now() };
}
