'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { FormMessage, PasswordField, SubmitButton, TextField } from '@ugnaya/web-ui';
import { GoogleButton } from '../../_components/google-button';
import { signIn, type SignInState } from '../actions';

export type LoginFormProps = { next: string };

export function LoginForm({ next }: LoginFormProps) {
  const [state, action] = useActionState<SignInState, FormData>(signIn, {});
  return (
    <div className="space-y-6">
      <GoogleButton next={next} />
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <FormMessage message={state.error} />
        <TextField name="email" label="Email" type="email" autoComplete="email" required defaultValue={state.email} />
        <PasswordField name="password" label="Password" autoComplete="current-password" required />
        <p className="text-right text-sm">
          <Link href="/forgot-password" className="link">Forgot your password?</Link>
        </p>
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </form>
      <p className="text-center text-sm text-ink-muted">
        New to UGNAYA?{' '}
        <Link href="/register" className="font-semibold link">
          Create an account
        </Link>
      </p>
    </div>
  );
}
