'use server';

import { redirect } from 'next/navigation';
import { signInRedirect } from '@/lib/auth/roles';
import { getAccount, getViewer } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { urls } from '@/lib/urls';
import { isEmail } from '@/lib/validation';

export type SignInState = { error?: string; email?: string };

export async function signIn(_previous: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!isEmail(email) || !password) return { error: 'Enter your email and password.', email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === 'email_not_confirmed') {
      return { error: 'Confirm your email first: open the link we sent you, then sign in.', email };
    }
    return { error: 'That email and password don’t match. Try again, or register if you’re new.', email };
  }
  // Where they go depends on what kind of account this is, read from the database (not from the form): customers
  // stay here, merchant owners and staff go to the merchant portal. Admin accounts are not routed anywhere special: the admin portal is
  // reached only by its own address.
  const viewer = await getViewer();
  const account = viewer ? await getAccount(viewer.id) : null;
  redirect(signInRedirect(String(form.get('next') ?? '') || null, account?.role ?? 'unregistered', urls));
}
