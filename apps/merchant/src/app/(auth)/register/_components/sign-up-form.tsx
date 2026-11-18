'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { FormMessage, PasswordField, SubmitButton, TextField } from '@ugnaya/web-ui';
import { GoogleButton } from '../../_components/google-button';
import { signUpWithEmail, type SignUpState } from '../actions';

export type SignUpFormProps = { /** An invitation to return to after sign-up, or empty. */ next: string };

export function SignUpForm({ next }: SignUpFormProps) {
  const [state, action] = useActionState<SignUpState, FormData>(signUpWithEmail, {});
  const login = next ? `/login?next=${encodeURIComponent(next)}` : '/login';
  return (
    <div className="space-y-6">
      <GoogleButton next={next || '/register'} />
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <FormMessage message={state.formError} />
        <TextField name="fullName" label="Your name" autoComplete="name" required defaultValue={state.values?.fullName} error={state.errors?.fullName} />
        <TextField name="email" label="Work email" type="email" autoComplete="email" required defaultValue={state.values?.email} error={state.errors?.email} />
        <PasswordField name="password" label="Password" autoComplete="new-password" required minLength={8}
          hint="At least 8 characters." error={state.errors?.password} />
        <SubmitButton pendingLabel="Creating your account…">Create account</SubmitButton>
      </form>
      <p className="text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link href={login} className="font-semibold link">Sign in</Link>
      </p>
    </div>
  );
}
