'use server';

import { redirect } from 'next/navigation';
import { signInRedirect } from '@/lib/auth/access';
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
    return { error: 'That email and password don’t match. Try again, or register your business if you’re new.', email };
  }
  // The page they asked for (for example an invitation), or the front door, which routes by role from the database.
  redirect(signInRedirect(String(form.get('next') ?? '') || null));
}
