/**
 * Which review decisions a merchant's status and the admin's permissions allow. A mirror of admin_review_merchant
 * (supabase/migrations/20261107000300_admin_modules.sql) so the page shows only buttons that can work; the database
 * still decides. Pure.
 */

export const REVIEW_ACTIONS = ['start_review', 'request_info', 'approve', 'reject', 'reopen', 'suspend', 'reactivate'] as const;
export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

const FROM: Record<ReviewAction, readonly string[]> = {
  start_review: ['pending_verification', 'info_required'],
  request_info: ['pending_verification', 'under_review'],
  approve: ['pending_verification', 'under_review', 'info_required'],
  reject: ['pending_verification', 'under_review', 'info_required'],
  reopen: ['rejected'],
  suspend: ['active'],
  reactivate: ['suspended'],
};

export const permissionFor = (action: ReviewAction): string =>
  action === 'suspend' || action === 'reactivate' ? 'merchants.suspend' : 'merchants.review';

/** Everything but start_review and approve needs a written reason (request_info: the message to the owner). */
export const reasonRequired = (action: ReviewAction): boolean => action !== 'start_review' && action !== 'approve';

export function allowedReviewActions(status: string, permissions: readonly string[]): ReviewAction[] {
  return REVIEW_ACTIONS.filter((a) => FROM[a].includes(status) && permissions.includes(permissionFor(a)));
}

export const isReviewAction = (value: string): value is ReviewAction => (REVIEW_ACTIONS as readonly string[]).includes(value);

/** Statuses that are still an application (shown in the queue). */
export const QUEUE_STATUSES = ['pending_verification', 'under_review', 'info_required'] as const;
