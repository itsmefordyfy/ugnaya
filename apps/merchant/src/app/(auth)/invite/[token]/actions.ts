'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PENDING_INVITE_COOKIE } from '@/lib/auth/constants';
import { getViewer } from '@/lib/auth/session';
import { friendlyError } from '@/lib/errors';
import { isInviteToken } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export type AcceptState = { error?: string; code?: string };

export async function acceptInvite(_previous: AcceptState, form: FormData): Promise<AcceptState> {
  const token = String(form.get('token') ?? '');
  if (!isInviteToken(token)) return { error: friendlyError('invite_invalid'), code: 'invite_invalid' };
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  const supabase = await createClient();
  // merchant_accept_invite checks the token, that it is still open, and that the signed-in email is the invited one.
  const { error } = await supabase.rpc('merchant_accept_invite', { p_token: token });
  if (error) return { error: friendlyError(error), code: error.message };
  (await cookies()).delete(PENDING_INVITE_COOKIE);
  // The front door sends them to their start page for their new role.
  redirect('/');
}
