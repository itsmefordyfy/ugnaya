'use client';

import { useActionState } from 'react';
import { FormMessage, PasswordField, SubmitButton, TextField } from '@ugnaya/web-ui';
import { signIn, type SignInState } from '../actions';

export type LoginFormProps = { next?: string };

export function LoginForm({ next }: LoginFormProps) {
  const [state, action] = useActionState<SignInState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage message={state.error} />
      {next && <input type="hidden" name="next" value={next} />}
      <TextField name="email" label="Email" type="email" autoComplete="username" required defaultValue={state.email} />
      <PasswordField name="password" label="Password" autoComplete="current-password" required />
      <SubmitButton pendingLabel="Signing in…">Continue</SubmitButton>
    </form>
  );
}
