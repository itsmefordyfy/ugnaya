'use server';

import type { ActionState } from '@/lib/action-state';
import { PLANS, type Plan } from '@/lib/labels';
import { isUuid } from '@/lib/paging';
import { requestContext } from '@/lib/request-context';
import { isReviewAction, reasonRequired } from '@/lib/review';
import { runAdmin, text } from '@/lib/run-action';

const DONE: Record<string, string> = {
  start_review: 'Review started', request_info: 'Information requested from the owner', approve: 'Business approved',
  reject: 'Application rejected', reopen: 'Application reopened', suspend: 'Business suspended', reactivate: 'Business reactivated',
};

/** One step of the review workflow. The database checks the permission, the second factor, the move and the reason. */
export async function reviewMerchant(form: FormData): Promise<ActionState> {
  const merchantId = text(form, 'merchantId');
  const action = text(form, 'action');
  const reason = text(form, 'reason');
  if (!isUuid(merchantId) || !isReviewAction(action)) return { error: 'That action isn’t recognised.' };
  if (reasonRequired(action) && !reason) return { error: action === 'request_info' ? 'Write the message for the owner.' : 'A reason is required.' };
  const plan = text(form, 'plan');
  if (action === 'approve' && !(PLANS as readonly string[]).includes(plan)) return { error: 'Choose a plan.' };
  return runAdmin('admin_review_merchant', {
    p_merchant_id: merchantId,
    p_action: action,
    p_reason: reason || undefined,
    p_plan: action === 'approve' ? (plan as Plan) : undefined,
    p_founding: action === 'approve' ? form.get('founding') === 'on' : undefined,
    p_context: await requestContext(),
  }, [`/merchants/${merchantId}`, '/merchants', '/applications', '/'], DONE[action]);
}
