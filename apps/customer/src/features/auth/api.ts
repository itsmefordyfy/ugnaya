import type { QueryClient } from '@tanstack/react-query';

import { PASSWORD_RESET_REDIRECT } from '@/constants/config';
import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

import { forgetMemberSecret } from '@/lib/member-secret';
import { forgetPushToken } from '@/lib/push';

/** Supabase Auth errors carry their code in `code`; map them onto the app's error codes. */
function authError(error: { code?: string; message: string; status?: number }): AppError {
  if (error.code) return new AppError(error.code, error.message);
  if (/invalid login credentials/i.test(error.message)) return new AppError('invalid_credentials');
  if (/already registered/i.test(error.message)) return new AppError('user_already_exists');
  if (error.status === 429) return new AppError('over_request_rate_limit');
  return new AppError(/network|fetch/i.test(error.message) ? 'network' : 'unknown', error.message);
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw authError(error);
}

/**
 * A customer account: `user_type: customer` makes the database create the customer profile (and member id). Email
 * confirmation is off on the project today, so a session comes back; if it's ever turned on, `needsConfirmation` says to check
 * the inbox instead.
 */
export async function signUp(fullName: string, email: string, password: string): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { user_type: 'customer', full_name: fullName.trim() }, emailRedirectTo: 'ugnaya://sign-in' },
  });
  if (error) throw authError(error);
  // Supabase answers an existing, confirmed email with a user that has no identities (and no session), not an error.
  if (data.user && data.user.identities?.length === 0) throw new AppError('user_already_exists');
  return { needsConfirmation: !data.session };
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: PASSWORD_RESET_REDIRECT });
  if (error) throw authError(error);
}

/** The reset link's one-time code becomes a session on this phone (PKCE: only the phone that asked can use it). */
export async function exchangeResetCode(code: string): Promise<void> {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw authError(error);
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw authError(error);
}

/** Checks the current password before a change, so a phone left unlocked can't change it. */
export async function verifyPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw authError(error.code === 'invalid_credentials' || /invalid login/i.test(error.message) ? { ...error, code: 'wrong_password' } : error);
}

/**
 * Signs this phone out: the push token stops pointing at this person, the member-code secret is removed from the Keychain
 * (anyone holding it could make codes), and every cached read is dropped.
 */
export async function signOut(queryClient: QueryClient, userId: string | null): Promise<void> {
  await forgetPushToken().catch(() => {});
  if (userId) await forgetMemberSecret(userId).catch(() => {});
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  queryClient.clear();
}
