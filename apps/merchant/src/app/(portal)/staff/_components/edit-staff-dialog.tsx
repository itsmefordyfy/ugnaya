'use client';

import { useActionState, useState } from 'react';
import { Dialog, FormMessage, Icon, SubmitButton, TextField } from '@ugnaya/web-ui';
import { useActionToast } from '@/components/action-toast';
import { CheckboxField, SelectField } from '@/components/fields';
import type { ActionState } from '@/lib/action-state';
import type { StaffRole } from '@/lib/auth/access';
import type { EditRules } from '@/lib/staff';
import { updateStaff } from '../actions';
import { BranchPicker, type BranchOption } from './branch-picker';

export type EditableStaff = { id: string; displayName: string; role: StaffRole; branchIds: string[] | null; active: boolean; hasLogin: boolean };

const ROLE_LABEL: Record<StaffRole, string> = { owner: 'Owner', manager: 'Manager', cashier: 'Cashier' };

export function EditStaffDialog({ person, rules, branches }: { person: EditableStaff; rules: EditRules; branches: BranchOption[] }) {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  return (
    <>
      <button type="button" onClick={() => { setRound((r) => r + 1); setOpen(true); }}
        aria-label={`Edit ${person.displayName}`}
        className="inline-flex min-h-11 items-center gap-1 rounded-pill px-3 text-sm font-semibold text-accent-text hover:bg-primary-soft">
        <Icon name="edit" size={20} />Edit
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Edit ${person.displayName}`}>
        <EditForm key={round} person={person} rules={rules} branches={branches} onDone={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

function EditForm({ person, rules, branches, onDone }: { person: EditableStaff; rules: EditRules; branches: BranchOption[]; onDone: () => void }) {
  const [state, action] = useActionState<ActionState, FormData>(updateStaff, {});
  useActionToast(state, onDone);
  const errors = state.fieldErrors ?? {};
  const fixedRole = rules.roleOptions.length === 1;
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="staffId" value={person.id} />
      <FormMessage message={state.error ?? errors.staffId} />
      <TextField name="displayName" label="Name" defaultValue={person.displayName} required maxLength={80} error={errors.displayName} />
      {fixedRole ? (
        <div>
          <input type="hidden" name="role" value={rules.roleOptions[0]} />
          <p className="text-sm font-medium">Role</p>
          <p className="mt-1 text-ink-muted">
            {ROLE_LABEL[rules.roleOptions[0]]}
            {person.role === 'owner' ? ' (the owner’s role doesn’t change)' : !rules.canChangeActive ? ' (you can’t change your own role)' : !person.hasLogin ? ' (a manager needs their own sign-in; invite them instead)' : ''}
          </p>
          {errors.role && <p className="mt-1 text-sm text-danger">{errors.role}</p>}
        </div>
      ) : (
        <SelectField name="role" label="Role" defaultValue={person.role} error={errors.role}
          options={rules.roleOptions.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
      )}
      {rules.canChangeBranches ? (
        <BranchPicker branches={branches} defaultIds={person.branchIds} error={errors.branchIds} />
      ) : (
        // Unchanged branches travel as hidden fields (the owner always covers the whole business).
        (person.branchIds ?? []).map((id) => <input key={id} type="hidden" name="branchIds" value={id} />)
      )}
      {rules.canChangeActive ? (
        <CheckboxField name="active" label="Active" defaultChecked={person.active}
          hint="Turn off to stop them signing in to this business or unlocking the counter. Their history stays." />
      ) : (
        person.active && <input type="hidden" name="active" value="on" />
      )}
      <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
    </form>
  );
}
