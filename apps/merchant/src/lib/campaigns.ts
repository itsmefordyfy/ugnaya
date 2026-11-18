import { fromManilaInput } from './format.ts';

/**
 * Campaigns and promotions: what the shop announces to its members (table campaigns). Drafts are private; scheduled
 * and running campaigns show on the shop's page in the UGNAYA app until they end (customer_merchant), and running
 * promotions also appear on customers' home screens (customer_home). Statuses are set by the shop; nothing moves a
 * campaign from scheduled to running on its own, and the app hides one whose end date has passed.
 */
export const CAMPAIGN_KINDS = [
  { value: 'promotion', label: 'Promotion', hint: 'A deal or bonus, like double points on weekdays.' },
  { value: 'announcement', label: 'Announcement', hint: 'News for your members, like a new menu or holiday hours.' },
  { value: 'event', label: 'Event', hint: 'Something happening at the shop on a date, like a tasting or live music.' },
] as const;
export type CampaignKind = (typeof CAMPAIGN_KINDS)[number]['value'];

export const CAMPAIGN_STATUSES = [
  { value: 'draft', label: 'Draft', tone: 'neutral', customers: 'Only your team sees it.' },
  { value: 'scheduled', label: 'Scheduled', tone: 'info', customers: 'Shown on your shop’s page in the app as coming up.' },
  { value: 'running', label: 'Running', tone: 'success', customers: 'Shown on your shop’s page, and promotions on customers’ home screens.' },
  { value: 'ended', label: 'Ended', tone: 'neutral', customers: 'No longer shown to customers.' },
  { value: 'cancelled', label: 'Cancelled', tone: 'danger', customers: 'No longer shown to customers.' },
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]['value'];

export const isCampaignKind = (v: unknown): v is CampaignKind => CAMPAIGN_KINDS.some((k) => k.value === v);
export const isCampaignStatus = (v: unknown): v is CampaignStatus => CAMPAIGN_STATUSES.some((s) => s.value === v);
export const statusInfo = (status: string) => CAMPAIGN_STATUSES.find((s) => s.value === status) ?? CAMPAIGN_STATUSES[0];
export const kindLabel = (kind: string) => CAMPAIGN_KINDS.find((k) => k.value === kind)?.label ?? 'Campaign';

/** Whether customers can see it in the app right now (the same test as customer_merchant). */
export function visibleToCustomers(c: { status: string; ends_at: string | null }, now: Date = new Date()): boolean {
  return (c.status === 'scheduled' || c.status === 'running') && (c.ends_at === null || new Date(c.ends_at) > now);
}

export type CampaignInput = {
  name: string;
  kind: CampaignKind;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: CampaignStatus;
};
export type CampaignFieldErrors = Partial<Record<keyof CampaignInput, string>>;

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

export function parseCampaignForm(form: FormData): { ok: true; value: CampaignInput } | { ok: false; errors: CampaignFieldErrors } {
  const errors: CampaignFieldErrors = {};
  const name = text(form, 'name');
  if (name.length < 2 || name.length > 80) errors.name = 'Give it a title of 2 to 80 characters.';
  const kind = text(form, 'kind');
  if (!isCampaignKind(kind)) errors.kind = 'Choose promotion, announcement or event.';
  const description = text(form, 'description');
  if (description.length > 500) errors.description = 'Keep the description under 500 characters.';
  const status = text(form, 'status');
  if (!isCampaignStatus(status)) errors.status = 'Choose a status.';

  const startsRaw = text(form, 'startsAt');
  const endsRaw = text(form, 'endsAt');
  const startsAt = fromManilaInput(startsRaw);
  const endsAt = fromManilaInput(endsRaw);
  if (startsRaw && !startsAt) errors.startsAt = 'Enter a valid start date and time.';
  if (endsRaw && !endsAt) errors.endsAt = 'Enter a valid end date and time.';
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) errors.endsAt = 'The end must be after the start.';
  if (status === 'scheduled' && !startsAt && !errors.startsAt) errors.startsAt = 'A scheduled campaign needs a start date.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, kind: kind as CampaignKind, description: description || null, startsAt, endsAt, status: status as CampaignStatus } };
}

/** The columns the database lets a manager write (campaigns insert/update grants). */
export const campaignColumns = (c: CampaignInput) => ({
  name: c.name,
  kind: c.kind,
  description: c.description,
  starts_at: c.startsAt,
  ends_at: c.endsAt,
  status: c.status,
});

/** The status filter tabs on the list. */
export const CAMPAIGN_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'draft', label: 'Drafts' },
  { value: 'past', label: 'Past' },
] as const;
export type CampaignFilter = (typeof CAMPAIGN_FILTERS)[number]['value'];

export const campaignFilter = (value: unknown): CampaignFilter =>
  CAMPAIGN_FILTERS.some((f) => f.value === value) ? (value as CampaignFilter) : 'all';

/** The statuses each tab shows. */
export function statusesFor(filter: CampaignFilter): CampaignStatus[] | null {
  switch (filter) {
    case 'live':
      return ['scheduled', 'running'];
    case 'draft':
      return ['draft'];
    case 'past':
      return ['ended', 'cancelled'];
    default:
      return null;
  }
}
