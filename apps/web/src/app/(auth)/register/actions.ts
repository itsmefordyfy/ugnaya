'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SIGNUP_EMAIL_COOKIE } from '@/lib/auth/constants';
import { registerMerchantCore } from '@/lib/register-merchant';
import { SITE_URL } from '@/lib/site';
import { createClient } from '@/lib/supabase/server';
import { type FieldErrors, parseRegisterForm, parseSignUpForm, type RegisterInput, type SignUpInput } from '@/lib/validation';

export type SignUpState = { errors?: FieldErrors<SignUpInput>; formError?: string; values?: { fullName: string; email: string } };

export async function signUpWithEmail(_previous: SignUpState, form: FormData): Promise<SignUpState> {
  const parsed = parseSignUpForm(form);
  const values = { fullName: String(form.get('fullName') ?? ''), email: String(form.get('email') ?? '') };
  if (!parsed.ok) return { errors: parsed.errors, values };

  // Send the confirmation link back to the site the owner is on (localhost while developing).
  const origin = (await headers()).get('origin') ?? SITE_URL;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.value.email,
    password: parsed.value.password,
    options: {
      data: { user_type: 'merchant', full_name: parsed.value.fullName },
      emailRedirectTo: `${origin}/register`,
    },
  });
  if (error) {
    if (error.code === 'weak_password') return { errors: { password: 'Choose a stronger password.' }, values };
    if (error.code === 'over_email_send_rate_limit') return { formError: 'Too many emails sent. Wait a minute and try again.', values };
    return { formError: 'We couldn’t create your account. Please try again.', values };
  }
  (await cookies()).set(SIGNUP_EMAIL_COOKIE, parsed.value.email, { httpOnly: true, sameSite: 'lax', maxAge: 3600, path: '/register' });
  redirect('/register?step=check-email');
}

export type RegisterState = { errors?: FieldErrors<RegisterInput>; formError?: string };

export async function registerMerchant(_previous: RegisterState, form: FormData): Promise<RegisterState> {
  const parsed = parseRegisterForm(form);
  if (!parsed.ok) return { errors: parsed.errors };

  const supabase = await createClient();
  // register_merchant checks the session itself (signed in, not anonymous, once per owner).
  const outcome = await registerMerchantCore((args) => supabase.rpc('register_merchant', args), parsed.value);
  if ('redirect' in outcome) redirect(outcome.redirect);
  return { formError: outcome.formError };
}
