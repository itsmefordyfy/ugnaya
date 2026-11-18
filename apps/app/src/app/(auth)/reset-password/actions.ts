'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseNewPassword } from '@/lib/validation';

export type ResetState = { error?: string };

export async function updatePassword(_previous: ResetState, form: FormData): Promise<ResetState> {
  const parsed = parseNewPassword(form);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  // Only a signed-in session can change its own password (the recovery link signs the person in).
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/forgot-password');
  const { error } = await supabase.auth.updateUser({ password: parsed.value });
  if (error) {
    if (error.code === 'same_password') return { error: 'Choose a password you haven’t used before.' };
    if (error.code === 'weak_password') return { error: 'Choose a stronger password.' };
    return { error: 'We couldn’t change your password. Please try again, or request a new link.' };
  }
  redirect('/');
}
