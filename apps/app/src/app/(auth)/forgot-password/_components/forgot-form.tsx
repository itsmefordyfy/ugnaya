'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { FormMessage, SubmitButton, TextField, Ugi } from '@ugnaya/web-ui';
import { requestPasswordReset, type ForgotState } from '../actions';

export function ForgotForm() {
  const [state, action] = useActionState<ForgotState, FormData>(requestPasswordReset, {});
  if (state.sent) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-card p-6">
        <Ugi pose="helpful" height={96} />
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-ink-muted">
          If there’s a UGNAYA account for <strong className="text-ink">{state.email}</strong>, we’ve sent a link to choose a new password. It can take a minute.
        </p>
        <Link href="/login" className="link inline-flex min-h-11 items-center font-semibold">Back to sign in</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage message={state.error} />
      <TextField name="email" label="Email" type="email" autoComplete="email" required defaultValue={state.email} />
      <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
      <p className="text-center text-sm text-ink-muted">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold link">Sign in</Link>
      </p>
    </form>
  );
}
