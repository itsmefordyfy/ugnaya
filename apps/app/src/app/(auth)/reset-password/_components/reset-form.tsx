'use client';

import { useActionState } from 'react';
import { FormMessage, PasswordField, SubmitButton } from '@ugnaya/web-ui';
import { updatePassword, type ResetState } from '../actions';

export function ResetForm() {
  const [state, action] = useActionState<ResetState, FormData>(updatePassword, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage message={state.error} />
      <PasswordField name="password" label="New password" autoComplete="new-password" required minLength={8} hint="At least 8 characters." />
      <PasswordField name="confirm" label="Type it again" autoComplete="new-password" required />
      <SubmitButton pendingLabel="Saving…">Save new password</SubmitButton>
    </form>
  );
}
