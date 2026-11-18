'use server';

import { refresh } from 'next/cache';
import { done, failed, type ActionState } from '@/lib/action-state';
import { lockedExplanation } from '@/lib/application';
import { actionContext } from '@/lib/auth/action';
import { friendlyError } from '@/lib/errors';
import { parseRewardForm, rewardColumns } from '@/lib/rewards';

/**
 * Adds a reward (no `id`) or changes one. The program is looked up here, never taken from the form; row-level security
 * also requires an approved business and an owner or manager.
 */
export async function saveReward(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { ctx, supabase } = await actionContext('rewards');
  if (ctx.locked) return failed(lockedExplanation(ctx.merchant.status));
  const parsed = parseRewardForm(form);
  if (!parsed.ok) return failed('Please check the highlighted fields.', parsed.errors as Record<string, string>);
  const columns = rewardColumns(parsed.value);
  const id = String(form.get('id') ?? '');

  if (id) {
    const { data, error } = await supabase.from('rewards').update(columns).eq('id', id).eq('merchant_id', ctx.merchant.id).select('id');
    if (error) return failed(friendlyError(error));
    if (!data || data.length === 0) return failed('That reward no longer exists, or your role can’t change it. Refresh the page.');
    refresh();
    return done(`${parsed.value.name} saved`);
  }

  const program = await supabase.from('loyalty_programs').select('id').eq('merchant_id', ctx.merchant.id).eq('scope', 'merchant').maybeSingle();
  if (program.error) return failed(friendlyError(program.error));
  if (!program.data) return failed('Your business has no loyalty program yet. Contact UGNAYA.');
  const { error } = await supabase.from('rewards').insert({ ...columns, merchant_id: ctx.merchant.id, program_id: program.data.id });
  if (error) return failed(friendlyError(error));
  refresh();
  return done(`${parsed.value.name} added`);
}

/** Turns a reward on or off. There is no delete: turning it off hides it from customers and keeps its history. */
export async function setRewardActive(id: string, active: boolean): Promise<ActionState> {
  const { ctx, supabase } = await actionContext('rewards');
  if (ctx.locked) return failed(lockedExplanation(ctx.merchant.status));
  const { data, error } = await supabase.from('rewards').update({ active }).eq('id', id).eq('merchant_id', ctx.merchant.id).select('name');
  if (error) return failed(friendlyError(error));
  if (!data || data.length === 0) return failed('That reward no longer exists, or your role can’t change it. Refresh the page.');
  refresh();
  return done(active ? `${data[0].name} is on` : `${data[0].name} is off`);
}
