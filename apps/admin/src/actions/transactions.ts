'use server';

import type { ActionState } from '@/lib/action-state';
import { formatPoints } from '@/lib/format';
import { isUuid } from '@/lib/paging';
import { requestContext } from '@/lib/request-context';
import { callAdmin, failureText } from '@/lib/rpc';
import { runAdmin, text } from '@/lib/run-action';
import { revalidatePath } from 'next/cache';

/**
 * A manual points correction (transactions.adjust). The idempotency key comes from the form (one per opened form), so a
 * double submit or a retry after a network error applies the correction once; the database replays the first result.
 */
export async function adjustPoints(form: FormData): Promise<ActionState> {
  const memberId = text(form, 'memberId').toUpperCase();
  const merchantId = text(form, 'merchantId');
  const points = Number(text(form, 'points'));
  const reason = text(form, 'reason');
  const key = text(form, 'idempotencyKey');
  if (!memberId) return { error: 'Enter the customer’s member ID.' };
  if (!isUuid(merchantId)) return { error: 'Choose the business whose points change.' };
  if (!Number.isInteger(points) || points === 0 || Math.abs(points) > 100_000) return { error: 'Enter a whole number of points other than zero, at most 100,000 either way.' };
  if (!reason) return { error: 'A reason is required.' };
  if (!key) return { error: 'The form is missing its one-time key. Close it and open it again.' };
  const result = await callAdmin<{ balance: number; replayed: boolean }>('admin_adjust_points', {
    p_member_id: memberId, p_merchant_id: merchantId, p_points: points, p_reason: reason, p_idempotency_key: key, p_context: await requestContext(),
  });
  if (!result.ok) return { error: failureText(result) };
  revalidatePath('/transactions');
  return {
    ok: true,
    message: result.data.replayed ? 'Already applied: this correction was recorded once.' : `Adjusted by ${formatPoints(points, { signed: true })}. New balance: ${formatPoints(result.data.balance)}.`,
  };
}

export async function resolveFraudFlag(form: FormData): Promise<ActionState> {
  const flagId = text(form, 'flagId');
  const status = text(form, 'status');
  const reason = text(form, 'reason');
  if (!isUuid(flagId)) return { error: 'That flag no longer exists.' };
  if (status !== 'dismissed' && status !== 'confirmed') return { error: 'Choose dismiss or confirm.' };
  if (!reason) return { error: 'A reason is required.' };
  return runAdmin('admin_resolve_fraud_flag', { p_flag_id: flagId, p_status: status, p_reason: reason, p_context: await requestContext() },
    ['/transactions'], status === 'confirmed' ? 'Flag confirmed' : 'Flag dismissed');
}
