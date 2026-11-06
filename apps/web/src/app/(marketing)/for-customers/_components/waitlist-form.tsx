'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { FormMessage } from '@/components/ui/form-message';
import { SubmitButton } from '@/components/ui/submit-button';
import { TextField } from '@/components/ui/text-field';
import { joinWaitlist, type WaitlistState } from '../actions';

export function WaitlistForm() {
  const [state, action] = useActionState<WaitlistState, FormData>(joinWaitlist, {});
  if (state.ok) {
    return (
      <FormMessage tone="success" message="You’re on the list. We’ll text or email you when the app is out in Naga." />
    );
  }
  return (
    <form action={action} className="max-w-md space-y-4" noValidate>
      <FormMessage message={state.error} />
      <TextField name="contact" label="Email or mobile number" autoComplete="email" required placeholder="you@example.com or 0917 123 4567" />
      <TextField name="city" label="City (optional)" autoComplete="address-level2" defaultValue="Naga City" />
      <div aria-hidden="true" className="hidden">
        <label htmlFor="field-website">Website</label>
        <input id="field-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <SubmitButton pendingLabel="Adding you…">Join the waitlist</SubmitButton>
      <p className="text-xs text-ink-muted">
        We use this only to tell you when UGNAYA launches. See our{' '}
        <Link href="/privacy" className="font-medium text-primary hover:underline">Privacy Policy</Link>.
      </p>
    </form>
  );
}
