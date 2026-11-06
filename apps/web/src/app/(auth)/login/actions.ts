'use server';

import { redirect } from 'next/navigation';
import { safeNext } from '@/lib/auth/redirects';
import { createClient } from '@/lib/supabase/server';
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
  redirect(safeNext(String(form.get('next') ?? '')) ?? '/app');
}
