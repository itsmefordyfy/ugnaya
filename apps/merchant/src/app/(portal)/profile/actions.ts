'use server';

import { refresh } from 'next/cache';
import { done, failed, type ActionState } from '@/lib/action-state';
import { actionContext } from '@/lib/auth/action';
import { friendlyError } from '@/lib/errors';
import { parseProfileForm } from '@/lib/profile';
import { LOGOS_BUCKET } from '@/lib/storage';

/** Saves the business profile (row-level security lets the owner and managers update their own merchant row). */
export async function saveProfile(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { ctx, supabase } = await actionContext('profile');
  const parsed = parseProfileForm(form);
  if (!parsed.ok) return failed('Please check the highlighted fields.', parsed.errors as Record<string, string>);
  const { data, error } = await supabase.from('merchants').update(parsed.value).eq('id', ctx.merchant.id).select('id');
  if (error) return failed(friendlyError(error));
  if (!data || data.length === 0) return failed(friendlyError('forbidden'));
  refresh();
  return done('Business profile saved');
}

const LOGO_PATH = /^[0-9a-f-]{36}\/logo-[0-9a-f]{8,32}\.(png|jpg|webp)$/;

/** Points the business at a logo the browser has just uploaded, then deletes the previous file. */
export async function setLogo(path: string | null): Promise<ActionState> {
  const { ctx, supabase } = await actionContext('profile');
  if (path !== null && (!LOGO_PATH.test(path) || !path.startsWith(`${ctx.merchant.id}/`))) return failed('The upload didn’t finish. Choose the image again.');
  const previous = ctx.merchant.logoPath;
  const { data, error } = await supabase.from('merchants').update({ logo_path: path }).eq('id', ctx.merchant.id).select('id');
  if (error || !data || data.length === 0) {
    if (path) await supabase.storage.from(LOGOS_BUCKET).remove([path]);
    return failed(friendlyError(error ?? 'forbidden'));
  }
  // The old file is no longer used anywhere; removing it is best effort.
  if (previous && previous !== path) await supabase.storage.from(LOGOS_BUCKET).remove([previous]);
  refresh();
  return done(path ? 'Logo updated' : 'Logo removed');
}
