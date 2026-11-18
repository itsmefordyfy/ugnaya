'use client';

import { useActionState, useState } from 'react';
import { Dialog, FormMessage, Icon, SubmitButton, TextField, buttonClasses } from '@ugnaya/web-ui';
import { useActionToast } from '@/components/action-toast';
import { SelectField } from '@/components/fields';
import type { StaffRole } from '@/lib/auth/access';
import { inviteStaff, type InviteActionState } from '../actions';
import { BranchPicker, type BranchOption } from './branch-picker';
import { CopyLink } from './copy-link';

const ROLE_OPTION: Record<string, { value: string; label: string }> = {
  manager: { value: 'manager', label: 'Manager: runs the business with you (pick branches for a branch manager)' },
  cashier: { value: 'cashier', label: 'Cashier: awards and redeems points at the counter' },
};

export type InviteDialogProps = { roles: StaffRole[]; branches: BranchOption[] };

export function InviteDialog({ roles, branches }: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  return (
    <>
      <button type="button" onClick={() => { setRound((r) => r + 1); setOpen(true); }} className={buttonClasses('primary')}>
        <Icon name="person_add" size={20} />Invite staff
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Invite a staff member"
        description="They get their own UGNAYA sign-in with this email. The link works once and expires in 7 days.">
        <InviteForm key={round} roles={roles} branches={branches} onClose={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

function InviteForm({ roles, branches, onClose }: InviteDialogProps & { onClose: () => void }) {
  const [state, action] = useActionState<InviteActionState, FormData>(inviteStaff, {});
  useActionToast(state);
  const errors = state.fieldErrors ?? {};

  if (state.ok && state.link) {
    return (
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-md bg-success-soft p-3 text-sm text-success-text">
          <Icon name="check_circle" size={20} className="shrink-0" />
          <span>Invitation ready for <strong>{state.email}</strong>.</span>
        </p>
        <p className="text-sm text-ink-muted">
          UGNAYA doesn’t email it for you: send this link yourself (chat, text or email). It’s shown only now; if it gets
          lost, cancel the invitation and create a new one.
        </p>
        <CopyLink link={state.link} />
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={buttonClasses('secondary')}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage message={state.error} />
      <TextField name="displayName" label="Name" autoComplete="off" required maxLength={80} error={errors.displayName} />
      <TextField name="email" label="Email" type="email" autoComplete="off" required error={errors.email}
        hint="They must sign in or register with this exact email to accept." />
      <SelectField name="role" label="Role" options={roles.map((r) => ROLE_OPTION[r])} defaultValue={roles[roles.length - 1]} error={errors.role} />
      <BranchPicker branches={branches} error={errors.branchIds} />
      <SubmitButton pendingLabel="Creating invitation…">Create invitation link</SubmitButton>
    </form>
  );
}
