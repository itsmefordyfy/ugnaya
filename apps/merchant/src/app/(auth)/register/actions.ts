'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { PENDING_INVITE_COOKIE, SIGNUP_EMAIL_COOKIE } from '@/lib/auth/constants';
import { confirmationRedirect } from '@/lib/auth/confirm-url';
import { safeNext } from '@/lib/auth/redirects';
import { registerMerchantCore } from '@/lib/register-merchant';
import { createClient } from '@/lib/supabase/server';
import { urls } from '@/lib/urls';
import { type FieldErrors, parseRegisterForm, parseSignUpForm, type RegisterInput, type SignUpInput } from '@/lib/validation';

export type SignUpState = { errors?: FieldErrors<SignUpInput>; formError?: string; values?: { fullName: string; email: string } };

/** Only an invitation is carried through sign-up; anything else starts the business registration. */
const inviteNext = (value: FormDataEntryValue | null): string | null => {
  const next = safeNext(typeof value === 'string' ? value : null);
  return next && /^\/invite\/[0-9a-f]{48}$/.test(next) ? next : null;
};

export async function signUpWithEmail(_previous: SignUpState, form: FormData): Promise<SignUpState> {
  const parsed = parseSignUpForm(form);
  const values = { fullName: String(form.get('fullName') ?? ''), email: String(form.get('email') ?? '') };
  if (!parsed.ok) return { errors: parsed.errors, values };
  const invite = inviteNext(form.get('next'));

  // Send the confirmation link back to the site the person is on (localhost while developing).
  const origin = (await headers()).get('origin') ?? urls.merchant;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.value.email,
    password: parsed.value.password,
    options: {
      // user_type 'merchant': no customer wallet is created for this account (the customers migration's trigger).
      data: { user_type: 'merchant', full_name: parsed.value.fullName },
      emailRedirectTo: confirmationRedirect(origin),
    },
  });
  if (error) {
    if (error.code === 'weak_password') return { errors: { password: 'Choose a stronger password.' }, values };
    if (error.code === 'over_email_send_rate_limit') return { formError: 'Too many emails sent. Wait a minute and try again.', values };
    return { formError: 'We couldn’t create your account. Please try again.', values };
  }
  const jar = await cookies();
  if (invite) jar.set(PENDING_INVITE_COOKIE, invite, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600, path: '/' });
  // With email confirmation off in Supabase, sign-up returns a session: go straight on. With it on, wait for the email.
  if (data.session) redirect(invite ?? '/register');
  jar.set(SIGNUP_EMAIL_COOKIE, parsed.value.email, { httpOnly: true, sameSite: 'lax', maxAge: 3600, path: '/register' });
  redirect(`/register?step=check-email${invite ? `&next=${encodeURIComponent(invite)}` : ''}`);
}

export type RegisterState = { errors?: FieldErrors<RegisterInput>; formError?: string };

export async function registerMerchant(_previous: RegisterState, form: FormData): Promise<RegisterState> {
  const parsed = parseRegisterForm(form);
  if (!parsed.ok) return { errors: parsed.errors };

  const supabase = await createClient();
  // register_merchant checks the session itself (signed in, not anonymous, one business per owner) and creates a draft.
  const outcome = await registerMerchantCore((args) => supabase.rpc('register_merchant', args), parsed.value);
  if ('redirect' in outcome) redirect(outcome.redirect);
  return { formError: outcome.formError };
}
