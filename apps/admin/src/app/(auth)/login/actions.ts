'use server';

import { isEmail } from '@ugnaya/rules';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { IDLE_COOKIE, IDLE_COOKIE_MAX_AGE_S } from '@/lib/access';
import { HARDENED, createClient } from '@/lib/supabase/server';

export type SignInState = { error?: string; email?: string };

export async function signIn(_previous: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!isEmail(email) || !password) return { error: 'Enter your email and password.', email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // One message for every failure (wrong password, unknown address, not an administrator): nothing to probe.
  if (error) return { error: 'That email and password don’t match.', email };
  // Starts the idle clock: from now on a signed-in request without this cookie counts as idle (lib/access.ts).
  (await cookies()).set(IDLE_COOKIE, String(Date.now()), { ...HARDENED, maxAge: IDLE_COOKIE_MAX_AGE_S });
  // Accepting an administrator invitation comes before the second factor (the invitation is what makes them one).
  const next = String(form.get('next') ?? '');
  if (/^\/join\/[0-9a-f]{48}$/.test(next)) redirect(next);
  // A password is only the first step: the authenticator code comes next (and is required by the database).
  redirect('/mfa');
}
