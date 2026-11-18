'use client';

import { useActionState } from 'react';
import { FormMessage, SubmitButton, TextField } from '@ugnaya/web-ui';
import { verifyCode, type CodeState } from '../actions';

export type CodeFormProps = { factorId: string; purpose: 'enrol' | 'verify' };

export function CodeForm({ factorId, purpose }: CodeFormProps) {
  const [state, action] = useActionState<CodeState, FormData>(verifyCode, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="factorId" value={factorId} />
      <input type="hidden" name="purpose" value={purpose} />
      <FormMessage message={state.error} />
      <TextField name="code" label="6-digit code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} required />
      <SubmitButton pendingLabel="Checking…">{purpose === 'enrol' ? 'Finish setup' : 'Verify'}</SubmitButton>
    </form>
  );
}
