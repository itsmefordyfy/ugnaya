import type { IconName } from '@ugnaya/web-ui';

/** Words, badge tones and icons for database codes. Status is never colour alone: each tone has an icon. */
export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
export type StatusLook = { label: string; tone: Tone; icon: IconName };

export const MERCHANT_STATUS: Record<string, StatusLook> = {
  draft: { label: 'Not submitted', tone: 'neutral', icon: 'edit' },
  pending_verification: { label: 'New application', tone: 'info', icon: 'fiber_new' },
  under_review: { label: 'Under review', tone: 'accent', icon: 'pending' },
  info_required: { label: 'Info requested', tone: 'warning', icon: 'help' },
  rejected: { label: 'Rejected', tone: 'danger', icon: 'cancel' },
  active: { label: 'Approved', tone: 'success', icon: 'check_circle' },
  suspended: { label: 'Suspended', tone: 'danger', icon: 'block' },
  closed: { label: 'Closed', tone: 'neutral', icon: 'pause_circle' },
};

export const MERCHANT_STATUSES = Object.keys(MERCHANT_STATUS);

export const CATEGORY: Record<string, string> = {
  cafe: 'Café', milk_tea: 'Milk tea', restaurant: 'Restaurant', bakery: 'Bakery', other_food: 'Other food', other: 'Other',
};

export const PLANS = ['free', 'starter', 'growth', 'business', 'enterprise'] as const;
export type Plan = (typeof PLANS)[number];
export const PLAN_LABEL: Record<string, string> = { free: 'Free', starter: 'Starter', growth: 'Growth', business: 'Business', enterprise: 'Enterprise' };

export const SUBSCRIPTION_STATUS: Record<string, StatusLook> = {
  active: { label: 'Active', tone: 'success', icon: 'check_circle' },
  paused: { label: 'Paused', tone: 'warning', icon: 'pause_circle' },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: 'cancel' },
};

export const TRANSACTION_TYPES = ['award', 'redeem', 'void', 'adjustment'] as const;
export const TRANSACTION_TYPE: Record<string, string> = { award: 'Award', redeem: 'Redemption', void: 'Void', adjustment: 'Adjustment' };
export const TRANSACTION_STATUS: Record<string, StatusLook> = {
  completed: { label: 'Completed', tone: 'success', icon: 'check_circle' },
  voided: { label: 'Voided', tone: 'danger', icon: 'undo' },
};

export const FRAUD_STATUS: Record<string, StatusLook> = {
  open: { label: 'Open', tone: 'warning', icon: 'flag' },
  dismissed: { label: 'Dismissed', tone: 'neutral', icon: 'cancel' },
  confirmed: { label: 'Confirmed', tone: 'danger', icon: 'gpp_maybe' },
};
export const FRAUD_RULE: Record<string, string> = { large_award: 'Unusually large award', void_rate: 'High void rate' };

export const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super admin', operations_admin: 'Operations admin', finance_admin: 'Finance admin', support_admin: 'Support admin', analyst: 'Analyst',
};

export const REVIEW_ACTION_LABEL: Record<string, string> = {
  submitted: 'Application submitted', info_provided: 'Owner answered', start_review: 'Review started', request_info: 'Information requested',
  approve: 'Approved', reject: 'Rejected', reopen: 'Reopened', suspend: 'Suspended', reactivate: 'Reactivated',
};

export const DOCUMENT_KIND: Record<string, string> = {
  business_registration: 'Business registration', tax_registration: 'Tax registration', permit: 'Permit', owner_id: 'Owner ID',
  storefront_photo: 'Storefront photo', other: 'Other',
};

export const statusLook = (map: Record<string, StatusLook>, code: string | null | undefined): StatusLook =>
  (code && map[code]) || { label: code ? code.replace(/_/g, ' ') : '—', tone: 'neutral', icon: 'info' };
