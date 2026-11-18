'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { urls } from '@/lib/urls';
import { isEmail } from '@/lib/validation';

export type ForgotState = { sent?: boolean; error?: string; email?: string };

export async function requestPasswordReset(_previous: ForgotState, form: FormData): Promise<ForgotState> {
  const email = String(form.get('email') ?? '').trim();
  if (!isEmail(email)) return { error: 'Enter your email address.', email };

  const origin = (await headers()).get('origin') ?? urls.merchant;
  const supabase = await createClient();
  // The link signs the person in for one purpose: /reset-password asks for the new password.
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/confirm?next=/reset-password` });
  if (error?.code === 'over_email_send_rate_limit') return { error: 'Too many emails sent. Wait a minute and try again.', email };
  // The same answer whether or not the address has an account, so this page can't be used to find out who is registered.
  return { sent: true, email };
}
