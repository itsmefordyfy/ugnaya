'use server';

import { redirect } from 'next/navigation';
import { failed, type ActionState } from '@/lib/action-state';
import { actionContext } from '@/lib/auth/action';
import { parseBranchForm } from '@/lib/branches';
import { friendlyError } from '@/lib/errors';

function fieldErrors(errors: ReturnType<typeof parseBranchForm> & { ok: false }): Record<string, string> {
  const { hours, ...rest } = errors.errors;
  const flat: Record<string, string> = { ...rest } as Record<string, string>;
  for (const [day, message] of Object.entries(hours ?? {})) if (message) flat[`hours_${day}`] = message;
  return flat;
}

/** Adds or updates a branch (row-level security: the owner and managers of this business). */
export async function saveBranch(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { ctx, supabase } = await actionContext('branches');
  const parsed = parseBranchForm(form);
  if (!parsed.ok) return failed('Please check the highlighted fields.', fieldErrors(parsed));
  const id = String(form.get('id') ?? '');
  const row = parsed.value;

  if (id) {
    const { data, error } = await supabase.from('merchant_branches').update(row).eq('id', id).eq('merchant_id', ctx.merchant.id).select('id');
    if (error) return failed(friendlyError(error));
    if (!data || data.length === 0) return failed(friendlyError('not_found'));
  } else {
    const { error } = await supabase.from('merchant_branches').insert({ ...row, merchant_id: ctx.merchant.id });
    if (error) return failed(friendlyError(error));
  }
  redirect(`/branches?saved=${encodeURIComponent(parsed.value.name)}`);
}
