'use server';

import type { AdminRole } from '@ugnaya/db';
import { revalidatePath } from 'next/cache';
import { friendlyError } from '@/lib/errors';
import { requestContext } from '@/lib/request-context';
import { createClient } from '@/lib/supabase/server';
import { urls } from '@/lib/urls';

export type TeamState = { ok?: boolean; error?: string };

const ROLES: AdminRole[] = ['super_admin', 'operations_admin', 'finance_admin', 'support_admin', 'analyst'];

/** Both actions only call the database functions, which check the permission, the second factor, the reason and the guard rails, and write the audit row. */
export async function changeRole(_previous: TeamState, form: FormData): Promise<TeamState> {
  const role = String(form.get('role') ?? '') as AdminRole;
  if (!ROLES.includes(role)) return { error: 'Choose a role.' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_set_role', {
    p_user: String(form.get('userId') ?? ''),
    p_role: role,
    p_reason: String(form.get('reason') ?? '').trim(),
    p_context: await requestContext(),
  });
  if (error) return { error: friendlyError(error.message) };
  revalidatePath('/team');
  return { ok: true };
}

export async function revokeAdmin(_previous: TeamState, form: FormData): Promise<TeamState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_revoke', {
    p_user: String(form.get('userId') ?? ''),
    p_reason: String(form.get('reason') ?? '').trim(),
    p_context: await requestContext(),
  });
  if (error) return { error: friendlyError(error.message) };
  revalidatePath('/team');
  return { ok: true };
}

/**
 * Invites an administrator (admin_invite): a single-use link, valid 72 hours, that the super admin hands to the person
 * directly. They sign in with the invited email (an existing, confirmed UGNAYA account), accept, then must set up
 * their authenticator. Someone who registered that address first can't use it without the link.
 */
export async function createInvite(form: FormData): Promise<TeamState & { link?: string }> {
  const email = String(form.get('email') ?? '').trim();
  const role = String(form.get('role') ?? '') as AdminRole;
  const reason = String(form.get('reason') ?? '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Enter the email address of their account.' };
  if (!ROLES.includes(role)) return { error: 'Choose a role.' };
  if (!reason) return { error: 'A reason is required.' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_invite', { p_email: email, p_role: role, p_reason: reason, p_context: await requestContext() });
  if (error || typeof data !== 'string') return { error: friendlyError(error?.message ?? '') };
  revalidatePath('/team');
  return { ok: true, link: `${urls.admin}/join/${data}` };
}

export async function revokeInvite(form: FormData): Promise<TeamState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_revoke_invite', {
    p_invite_id: String(form.get('inviteId') ?? ''),
    p_reason: String(form.get('reason') ?? '').trim(),
    p_context: await requestContext(),
  });
  if (error) return { error: friendlyError(error.message) };
  revalidatePath('/team');
  return { ok: true };
}
