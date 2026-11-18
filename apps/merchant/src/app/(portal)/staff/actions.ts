'use server';

import { refresh } from 'next/cache';
import { done, failed, type ActionState } from '@/lib/action-state';
import { actionContext } from '@/lib/auth/action';
import { canInviteStaff } from '@/lib/auth/access';
import { friendlyError } from '@/lib/errors';
import { FIELD_FOR_CODE, inviteUrl, parseCashierForm, parseEditForm, parseInviteForm } from '@/lib/staff';
import { urls } from '@/lib/urls';

export type InviteActionState = ActionState & { link?: string; email?: string };

const CHECK_FIELDS = 'Please check the highlighted fields.';

/** A database refusal, next to its field when it belongs to one. */
function refused(error: { message: string; code?: string }): ActionState {
  const field = FIELD_FOR_CODE[error.message];
  return field ? failed(CHECK_FIELDS, { [field]: friendlyError(error) }) : failed(friendlyError(error));
}

export async function inviteStaff(_previous: InviteActionState, form: FormData): Promise<InviteActionState> {
  const { ctx, supabase } = await actionContext('staff');
  if (!canInviteStaff(ctx.merchant.status)) return failed(friendlyError('merchant_not_approved'));
  const parsed = parseInviteForm(form, ctx.role);
  if (!parsed.ok) return failed(CHECK_FIELDS, parsed.errors);
  const { data: token, error } = await supabase.rpc('merchant_invite_staff', {
    p_merchant_id: ctx.merchant.id,
    p_email: parsed.value.email,
    p_display_name: parsed.value.displayName,
    p_role: parsed.value.role,
    p_branch_ids: parsed.value.branchIds,
  });
  if (error || !token) return refused(error ?? { message: 'internal' });
  refresh();
  // The raw token exists only in this answer (the database keeps a hash), so the link is shown once.
  return { ...done('Invitation created'), link: inviteUrl(urls.merchant, token), email: parsed.value.email };
}

export async function revokeInvite(inviteId: string): Promise<ActionState> {
  const { supabase } = await actionContext('staff');
  if (!/^[0-9a-f-]{36}$/i.test(inviteId)) return failed(friendlyError('not_found'));
  const { error } = await supabase.rpc('merchant_revoke_invite', { p_invite_id: inviteId });
  if (error) return failed(friendlyError(error));
  refresh();
  return done('Invitation cancelled');
}

export async function addCashier(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { ctx, supabase } = await actionContext('staff');
  const parsed = parseCashierForm(form);
  if (!parsed.ok) return failed(CHECK_FIELDS, parsed.errors);
  const { error } = await supabase.rpc('merchant_add_staff', {
    p_merchant_id: ctx.merchant.id,
    p_display_name: parsed.value.displayName,
    p_role: 'cashier',
    p_pin: parsed.value.pin,
    p_branch_ids: parsed.value.branchIds,
  });
  if (error) return refused(error);
  refresh();
  return done(`${parsed.value.displayName} added`);
}

export async function updateStaff(_previous: ActionState, form: FormData): Promise<ActionState> {
  const { supabase } = await actionContext('staff');
  const parsed = parseEditForm(form);
  if (!parsed.ok) return failed(CHECK_FIELDS, parsed.errors);
  // merchant_update_staff checks the caller's role at that staff member's business, so the id alone is safe to pass.
  const { error } = await supabase.rpc('merchant_update_staff', {
    p_staff_id: parsed.value.staffId,
    p_display_name: parsed.value.displayName,
    p_role: parsed.value.role,
    p_branch_ids: parsed.value.branchIds,
    p_active: parsed.value.active,
  });
  if (error) return refused(error);
  refresh();
  return done('Changes saved');
}
