'use server';

import { refresh } from 'next/cache';
import { done, failed, type ActionState } from '@/lib/action-state';
import { lockedExplanation } from '@/lib/application';
import { actionContext } from '@/lib/auth/action';
import { campaignColumns, parseCampaignForm } from '@/lib/campaigns';
import { friendlyError } from '@/lib/errors';

/** Adds a campaign (no `id`) or changes one. Row-level security requires an owner or manager, and an approved business for anything but a draft. */
export async function saveCampaign(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { ctx, supabase } = await actionContext('campaigns');
  if (ctx.locked) return failed(lockedExplanation(ctx.merchant.status));
  const parsed = parseCampaignForm(form);
  if (!parsed.ok) return failed('Please check the highlighted fields.', parsed.errors as Record<string, string>);
  const columns = campaignColumns(parsed.value);
  const id = String(form.get('id') ?? '');

  if (id) {
    const { data, error } = await supabase.from('campaigns').update(columns).eq('id', id).eq('merchant_id', ctx.merchant.id).select('id');
    if (error) return failed(friendlyError(error));
    if (!data || data.length === 0) return failed('That campaign no longer exists, or your role can’t change it. Refresh the page.');
    refresh();
    return done(`${parsed.value.name} saved`);
  }

  const { error } = await supabase.from('campaigns').insert({ ...columns, merchant_id: ctx.merchant.id, created_by: ctx.viewer.id });
  if (error) return failed(friendlyError(error));
  refresh();
  return done(`${parsed.value.name} created`);
}

/** Cancels a campaign. There is no delete: a cancelled campaign stays in the list and in the dashboard's history. */
export async function cancelCampaign(id: string): Promise<ActionState> {
  const { ctx, supabase } = await actionContext('campaigns');
  if (ctx.locked) return failed(lockedExplanation(ctx.merchant.status));
  const { data, error } = await supabase.from('campaigns').update({ status: 'cancelled' }).eq('id', id).eq('merchant_id', ctx.merchant.id).select('name');
  if (error) return failed(friendlyError(error));
  if (!data || data.length === 0) return failed('That campaign no longer exists, or your role can’t change it. Refresh the page.');
  refresh();
  return done(`${data[0].name} cancelled`);
}
