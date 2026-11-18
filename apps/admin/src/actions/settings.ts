'use server';

import type { ActionState } from '@/lib/action-state';
import { pesosToCentavos } from '@/lib/format';
import { PLANS, type Plan } from '@/lib/labels';
import { isUuid } from '@/lib/paging';
import { requestContext } from '@/lib/request-context';
import { runAdmin, text } from '@/lib/run-action';
import { INTEGER_SETTINGS } from '@/lib/settings';

/** One platform setting (settings.manage). Only known keys; the database enforces each one's bounds again. */
export async function saveSetting(form: FormData): Promise<ActionState> {
  const key = text(form, 'key');
  const reason = text(form, 'reason');
  if (!reason) return { error: 'A reason is required.' };
  let value: boolean | number;
  if (key === 'network_enabled') {
    value = text(form, 'value') === 'true';
  } else {
    const spec = INTEGER_SETTINGS.find((s) => s.key === key);
    if (!spec) return { error: 'That setting isn’t recognised.' };
    value = Number(text(form, 'value'));
    if (!Number.isInteger(value) || value < spec.min || value > spec.max) return { error: `Enter a whole number from ${spec.min} to ${spec.max}.` };
  }
  return runAdmin('admin_set_setting', { p_key: key, p_value: value, p_reason: reason, p_context: await requestContext() }, ['/settings'], 'Setting saved');
}

/** Blank limits mean unlimited (null). */
const limit = (form: FormData, key: string): number | null | 'bad' => {
  const raw = text(form, key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 1_000_000 ? n : 'bad';
};

export async function savePlan(form: FormData): Promise<ActionState> {
  const plan = text(form, 'plan');
  const reason = text(form, 'reason');
  if (!(PLANS as readonly string[]).includes(plan)) return { error: 'That plan isn’t recognised.' };
  const price = pesosToCentavos(text(form, 'price'));
  if (price === null || price > 100_000_000) return { error: 'Enter the monthly list price in pesos, e.g. 399 or 1999.50.' };
  const values = { branches: limit(form, 'branches'), staff: limit(form, 'staff'), rewards: limit(form, 'rewards'), transactions: limit(form, 'transactions') };
  if (Object.values(values).includes('bad')) return { error: 'Limits are whole numbers of 1 or more, or blank for unlimited.' };
  if (!reason) return { error: 'A reason is required.' };
  // The generated types say number; the function stores null as "unlimited" (plan_limits columns are nullable).
  const n = (v: number | null | 'bad') => v as number;
  return runAdmin('admin_update_plan', {
    p_plan: plan as Plan, p_price_centavos: price, p_branches: n(values.branches), p_staff: n(values.staff), p_rewards: n(values.rewards),
    p_transactions_per_month: n(values.transactions), p_reason: reason, p_context: await requestContext(),
  }, ['/settings', '/revenue', '/subscriptions'], 'Plan saved');
}

/** A datetime-local value ("2026-11-07T09:30") plus the browser's offset in minutes, as an ISO timestamp. */
function moment(local: string, offsetMinutes: number): string | null {
  if (!local) return null;
  const time = Date.parse(`${local}:00Z`);
  if (Number.isNaN(time)) return null;
  return new Date(time + offsetMinutes * 60_000).toISOString();
}

export async function saveAnnouncement(form: FormData): Promise<ActionState> {
  const id = text(form, 'id');
  const title = text(form, 'title');
  const body = text(form, 'body');
  const audience = text(form, 'audience');
  if (id && !isUuid(id)) return { error: 'That announcement no longer exists.' };
  if (!title || !body) return { error: 'An announcement needs a title and a message.' };
  if (!['merchants', 'customers', 'all'].includes(audience)) return { error: 'Choose who sees it.' };
  const offset = Number(text(form, 'tzOffset')) || 0;
  const startsAt = moment(text(form, 'startsAt'), offset);
  const endsAt = moment(text(form, 'endsAt'), offset);
  if (startsAt && endsAt && endsAt <= startsAt) return { error: 'The end must be after the start.' };
  return runAdmin('admin_save_announcement', {
    // The generated types say string; null means "create" (id) and "no limit" (dates).
    p_id: (id || null) as string, p_title: title, p_body: body, p_audience: audience, p_published: form.get('published') === 'on',
    p_starts_at: startsAt as string, p_ends_at: endsAt as string, p_context: await requestContext(),
  }, ['/settings'], id ? 'Announcement saved' : 'Announcement created');
}
