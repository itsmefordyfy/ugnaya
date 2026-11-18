import type { IconName } from '@ugnaya/web-ui';
import type { MerchantStatus } from './auth/access.ts';

export type StatusInfo = {
  label: string;
  tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'accent';
  icon: IconName;
  /** One plain sentence for the owner: where things stand and what happens next. */
  summary: string;
};

export const STATUS_INFO: Record<MerchantStatus, StatusInfo> = {
  draft: { label: 'Draft', tone: 'neutral', icon: 'edit', summary: 'Upload your verification documents, then send the application to UGNAYA.' },
  pending_verification: { label: 'Pending review', tone: 'info', icon: 'schedule', summary: 'Your application is in the queue. We usually start a review within one business day.' },
  under_review: { label: 'Under review', tone: 'info', icon: 'pending', summary: 'Our team is checking your documents and details now.' },
  info_required: { label: 'Additional information required', tone: 'warning', icon: 'warning', summary: 'We need something more from you. Read our message, add documents if asked, and reply.' },
  active: { label: 'Approved', tone: 'success', icon: 'verified', summary: 'Your business is live on UGNAYA. Customers can find you and earn points.' },
  rejected: { label: 'Rejected', tone: 'danger', icon: 'cancel', summary: 'We couldn’t approve this application. The reason is below; contact us if something has changed.' },
  suspended: { label: 'Suspended', tone: 'danger', icon: 'block', summary: 'Your business is paused on UGNAYA. Customers can’t earn or redeem until it’s reactivated.' },
  closed: { label: 'Closed', tone: 'neutral', icon: 'block', summary: 'This business is closed on UGNAYA.' },
};

/** The order of the application's journey, for the progress steps. */
export const JOURNEY: { key: 'draft' | 'submitted' | 'review' | 'decision'; label: string }[] = [
  { key: 'draft', label: 'Prepare' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'review', label: 'In review' },
  { key: 'decision', label: 'Decision' },
];

/** How far along the journey a status is (0 to 3). */
export function journeyStep(status: MerchantStatus): number {
  switch (status) {
    case 'draft':
      return 0;
    case 'pending_verification':
      return 1;
    case 'under_review':
    case 'info_required':
      return 2;
    default:
      return 3;
  }
}

/** Documents can be added or removed while the application is with the merchant: a draft, or when UGNAYA asked for more (the database says the same). */
export const canEditDocuments = (status: MerchantStatus): boolean => status === 'draft' || status === 'info_required';

/** Whether the status banner should show at the top of every page (everything except an approved business). */
export const needsStatusBanner = (status: MerchantStatus): boolean => status !== 'active';

/** What approval unlocks, said once wherever a locked feature appears. */
export function lockedExplanation(status: MerchantStatus): string {
  if (status === 'suspended') return 'This is paused while your business is suspended. Contact UGNAYA to reactivate it.';
  if (status === 'rejected' || status === 'closed') return 'This isn’t available because the business isn’t approved on UGNAYA.';
  return 'This opens once UGNAYA approves your business. Finish and send your application to get there.';
}

/** Review history rows, as people read them. */
export const REVIEW_ACTIONS: Record<string, string> = {
  submitted: 'Application sent',
  start_review: 'Review started',
  request_info: 'More information requested',
  info_provided: 'You replied',
  approve: 'Approved',
  reject: 'Rejected',
  reopen: 'Application reopened',
  suspend: 'Suspended',
  reactivate: 'Reactivated',
};
