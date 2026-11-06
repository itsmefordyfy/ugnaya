'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { createClient } from '@/lib/supabase/client';

export type CheckEmailProps = { email: string | null };

/** After an email sign-up: the confirmation link continues the registration. */
export function CheckEmail({ email }: CheckEmailProps) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  async function resend() {
    if (!email) return;
    setStatus('sending');
    const { error } = await createClient().auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/register` },
    });
    setStatus(error ? 'failed' : 'sent');
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-6">
      <Icon name="mail" size={32} className="text-primary" />
      <h2 className="text-xl font-semibold">Check your email</h2>
      <p className="text-ink-muted">
        We sent a confirmation link{email ? <> to <strong className="text-ink">{email}</strong></> : null}. Open it on this
        device to continue to your business details.
      </p>
      {email && (
        <button type="button" onClick={resend} disabled={status === 'sending' || status === 'sent'}
          className="min-h-11 text-sm font-semibold text-primary hover:underline disabled:opacity-60">
          {status === 'sent' ? 'Sent again' : status === 'sending' ? 'Sending…' : 'Send the link again'}
        </button>
      )}
      <p role="status" className="text-sm text-danger">{status === 'failed' ? 'We couldn’t resend it. Wait a minute and try again.' : ''}</p>
      <p className="text-sm text-ink-muted">
        Wrong address? <Link href="/register" className="font-semibold text-primary hover:underline">Start again</Link>
      </p>
    </div>
  );
}
