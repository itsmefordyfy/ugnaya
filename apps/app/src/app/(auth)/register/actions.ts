'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SIGNUP_EMAIL_COOKIE } from '@/lib/auth/constants';
import { confirmationRedirect } from '@/lib/auth/confirm-url';
import { urls } from '@/lib/urls';
import { createClient } from '@/lib/supabase/server';
import { type FieldErrors, parseSignUpForm, type SignUpInput } from '@/lib/validation';

export type SignUpState = { errors?: FieldErrors<SignUpInput>; formError?: string; values?: { fullName: string; email: string } };

export async function signUpWithEmail(_previous: SignUpState, form: FormData): Promise<SignUpState> {
  // Customers only: businesses register in the merchant portal (merchant.ugnaya.com), whatever the form says.
  const userType = 'customer';
  const parsed = parseSignUpForm(form);
  const values = { fullName: String(form.get('fullName') ?? ''), email: String(form.get('email') ?? '') };
  if (!parsed.ok) return { errors: parsed.errors, values };

  // Send the confirmation link back to the site the owner is on (localhost while developing).
  const origin = (await headers()).get('origin') ?? urls.app;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.value.email,
    password: parsed.value.password,
    options: {
      data: { user_type: userType, full_name: parsed.value.fullName },
      emailRedirectTo: confirmationRedirect(origin),
    },
  });
  if (error) {
    if (error.code === 'weak_password') return { errors: { password: 'Choose a stronger password.' }, values };
    if (error.code === 'over_email_send_rate_limit') return { formError: 'Too many emails sent. Wait a minute and try again.', values };
    return { formError: 'We couldn’t create your account. Please try again.', values };
  }
  // With email confirmation off in Supabase, sign-up returns a session: the person is signed in already, so go on to
  // their wallet. With it on, wait for the email.
  if (data.session) redirect('/');
  (await cookies()).set(SIGNUP_EMAIL_COOKIE, parsed.value.email, { httpOnly: true, sameSite: 'lax', maxAge: 3600, path: '/register' });
  redirect(`/register?type=${userType}&step=check-email`);
}
