'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { FormMessage } from '@/components/ui/form-message';
import { SubmitButton } from '@/components/ui/submit-button';
import { TextField } from '@/components/ui/text-field';
import { GoogleButton } from '../../_components/google-button';
import { signUpWithEmail, type SignUpState } from '../actions';

export function SignUpForm() {
  const [state, action] = useActionState<SignUpState, FormData>(signUpWithEmail, {});
  return (
    <div className="space-y-6">
      <GoogleButton next="/register" />
      <form action={action} className="space-y-4" noValidate>
        <FormMessage message={state.formError} />
        <TextField name="fullName" label="Your name" autoComplete="name" required defaultValue={state.values?.fullName} error={state.errors?.fullName} />
        <TextField name="email" label="Email" type="email" autoComplete="email" required defaultValue={state.values?.email} error={state.errors?.email} />
        <TextField name="password" label="Password" type="password" autoComplete="new-password" required minLength={8}
          hint="At least 8 characters." error={state.errors?.password} />
        <SubmitButton pendingLabel="Creating your account…">Create account</SubmitButton>
      </form>
      <p className="text-center text-sm text-ink-muted">
        Already registered?{' '}
        <Link href="/login?next=/register" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
