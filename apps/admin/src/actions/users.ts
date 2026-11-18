'use server';

import type { ActionState } from '@/lib/action-state';
import { isUuid } from '@/lib/paging';
import { requestContext } from '@/lib/request-context';
import { runAdmin, text } from '@/lib/run-action';

/** Suspend or reactivate a person's account (users.suspend). The database bans the account and ends its sessions. */
export async function setUserSuspended(form: FormData): Promise<ActionState> {
  const userId = text(form, 'userId');
  const reason = text(form, 'reason');
  const suspended = text(form, 'suspended') === 'true';
  if (!isUuid(userId)) return { error: 'That account doesn’t exist.' };
  if (!reason) return { error: 'A reason is required.' };
  return runAdmin('admin_set_user_suspended', { p_user_id: userId, p_suspended: suspended, p_reason: reason, p_context: await requestContext() },
    [`/users/${userId}`, '/users'], suspended ? 'Account suspended' : 'Account reactivated');
}
