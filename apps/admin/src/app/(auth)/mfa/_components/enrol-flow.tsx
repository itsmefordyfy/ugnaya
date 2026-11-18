'use client';

import { useState, useTransition } from 'react';
import { Button } from './button';
import { CodeForm } from './code-form';
import { startEnrolment, type EnrolStart } from '../actions';

/** First sign-in: set up an authenticator app (Google Authenticator, 1Password, Authy...). */
export function EnrolFlow() {
  const [setup, setSetup] = useState<EnrolStart | null>(null);
  const [pending, start] = useTransition();

  if (setup?.factorId) {
    return (
      <div className="space-y-5">
        <ol className="list-decimal space-y-2 pl-5 text-ink-muted">
          <li>Open your authenticator app and add an account.</li>
          <li>Scan this code, or type the key below.</li>
          <li>Enter the 6-digit code it shows.</li>
        </ol>
        {/* The QR code comes from Supabase as an SVG data URL. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- a one-off data URL, not an optimisable asset */}
        <img src={setup.qr} alt="QR code for your authenticator app" width={200} height={200} className="mx-auto rounded-md border border-border bg-white p-2" />
        <p className="break-all text-center text-sm text-ink-muted">Key: <code className="font-mono text-ink">{setup.secret}</code></p>
        <CodeForm factorId={setup.factorId} purpose="enrol" />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {setup?.error && <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger-text">{setup.error}</p>}
      <p className="text-ink-muted">Administrator accounts need a second step every time you sign in. Set up an authenticator app now.</p>
      <Button pending={pending} onClick={() => start(async () => setSetup(await startEnrolment()))}>Set up authenticator</Button>
    </div>
  );
}
