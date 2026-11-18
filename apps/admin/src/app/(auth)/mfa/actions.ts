'use server';

import { redirect } from 'next/navigation';
import { requestContext } from '@/lib/request-context';
import { createClient } from '@/lib/supabase/server';

export type EnrolStart = { error?: string; factorId?: string; qr?: string; secret?: string };
export type CodeState = { error?: string };

/** Begins authenticator enrolment. Triggered by a button (not by loading the page), so a refresh never piles up factors. */
export async function startEnrolment(): Promise<EnrolStart> {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { error: 'Your session has ended. Sign in again.' };
  const { data: me } = await supabase.rpc('admin_me');
  if (!(me as { role: string | null } | null)?.role) return { error: 'This account is not an administrator.' };

  // Clear half-finished attempts, then start a new one.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    if (factor.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'UGNAYA admin' });
  if (error || !data) return { error: 'We couldn’t start the setup. Please try again.' };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Verifies a 6-digit authenticator code. On success the session becomes aal2, which the database requires. */
export async function verifyCode(_previous: CodeState, form: FormData): Promise<CodeState> {
  const factorId = String(form.get('factorId') ?? '');
  const code = String(form.get('code') ?? '').replace(/\s/g, '');
  const purpose = form.get('purpose') === 'enrol' ? 'admin.mfa_enrolled' : 'admin.mfa_verified';
  if (!factorId || !/^\d{6}$/.test(code)) return { error: 'Enter the 6-digit code from your authenticator app.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) return { error: 'That code didn’t work. Check the time on your phone and try the next code.' };

  // Audit the second factor and the sign-in (the session now carries the second factor).
  const context = await requestContext();
  await supabase.rpc('admin_record_event', { p_action: purpose, p_context: context });
  await supabase.rpc('admin_record_event', { p_action: 'admin.login', p_context: context });
  redirect('/');
}
