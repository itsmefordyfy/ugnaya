'use server';

import { redirect } from 'next/navigation';
import { friendlyError } from '@/lib/errors';
import { requestContext } from '@/lib/request-context';
import { createClient } from '@/lib/supabase/server';

export type JoinState = { error?: string };

/** Accepts an administrator invitation for the signed-in account; the database checks the token, the email and that it's confirmed. */
export async function acceptInvite(_previous: JoinState, form: FormData): Promise<JoinState> {
  const token = String(form.get('token') ?? '');
  if (!/^[0-9a-f]{48}$/.test(token)) return { error: friendlyError('invite_invalid') };
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_accept_invite', { p_token: token, p_context: await requestContext() });
  if (error) return { error: friendlyError(error.message) };
  // Nothing works until the second factor: straight to enrolment.
  redirect('/mfa');
}
