'use client';

import { useActionState, useState } from 'react';
import { Dialog, FormMessage, Icon, SubmitButton, TextField, buttonClasses } from '@ugnaya/web-ui';
import { useActionToast } from '@/components/action-toast';
import type { ActionState } from '@/lib/action-state';
import { addCashier } from '../actions';
import { BranchPicker, type BranchOption } from './branch-picker';

export function CashierDialog({ branches }: { branches: BranchOption[] }) {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  return (
    <>
      <button type="button" onClick={() => { setRound((r) => r + 1); setOpen(true); }} className={buttonClasses('secondary')}>
        <Icon name="key" size={20} />Add PIN cashier
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add a cashier with a PIN"
        description="For staff without their own sign-in. They unlock the shop’s shared counter tablet in the UGNAYA business app with this PIN.">
        <CashierForm key={round} branches={branches} onDone={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

function CashierForm({ branches, onDone }: { branches: BranchOption[]; onDone: () => void }) {
  const [state, action] = useActionState<ActionState, FormData>(addCashier, {});
  useActionToast(state, onDone);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage message={state.error} />
      <TextField name="displayName" label="Name" autoComplete="off" required maxLength={80} error={errors.displayName} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="pin" label="PIN" type="password" inputMode="numeric" pattern="[0-9]*" autoComplete="off" required
          minLength={4} maxLength={6} hint="4 to 6 digits, different from other staff." error={errors.pin} />
        <TextField name="pinConfirm" label="Type the PIN again" type="password" inputMode="numeric" pattern="[0-9]*"
          autoComplete="off" required minLength={4} maxLength={6} error={errors.pinConfirm} />
      </div>
      <BranchPicker branches={branches} error={errors.branchIds} />
      <SubmitButton pendingLabel="Adding…">Add cashier</SubmitButton>
    </form>
  );
}
