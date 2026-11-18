'use server';

import type { ActionState } from '@/lib/action-state';
import { PLANS, type Plan } from '@/lib/labels';
import { isUuid } from '@/lib/paging';
import { requestContext } from '@/lib/request-context';
import { runAdmin, text } from '@/lib/run-action';

/** Change a business's plan, status or founding flag (subscriptions.manage). Records only: no payment is taken or refunded. */
export async function updateSubscription(form: FormData): Promise<ActionState> {
  const merchantId = text(form, 'merchantId');
  const plan = text(form, 'plan');
  const status = text(form, 'status');
  const reason = text(form, 'reason');
  if (!isUuid(merchantId)) return { error: 'That business doesn’t exist.' };
  if (!(PLANS as readonly string[]).includes(plan)) return { error: 'Choose a plan.' };
  if (!['active', 'paused', 'cancelled'].includes(status)) return { error: 'Choose a status.' };
  if (!reason) return { error: 'A reason is required.' };
  return runAdmin('admin_update_subscription', {
    p_merchant_id: merchantId, p_plan: plan as Plan, p_status: status, p_founding: form.get('founding') === 'on', p_reason: reason,
    p_context: await requestContext(),
  }, ['/subscriptions', '/revenue', `/merchants/${merchantId}`], 'Subscription updated');
}
