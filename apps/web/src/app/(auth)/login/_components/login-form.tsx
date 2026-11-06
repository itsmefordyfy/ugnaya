'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { FormMessage } from '@/components/ui/form-message';
import { SubmitButton } from '@/components/ui/submit-button';
import { TextField } from '@/components/ui/text-field';
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
        <TextField name="password" label="Password" type="password" autoComplete="current-password" required />
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </form>
      <p className="text-center text-sm text-ink-muted">
        New to UGNAYA?{' '}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Register your business
        </Link>
      </p>
    </div>
  );
}
