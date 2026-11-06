'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type GoogleButtonProps = { next: string };

/** Shown only when NEXT_PUBLIC_GOOGLE_SIGN_IN is "true" (the Google client is set up in Supabase). */
export function GoogleButton({ next }: GoogleButtonProps) {
  const [error, setError] = useState<string | null>(null);
  if (process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN !== 'true') return null;

  async function signIn() {
    setError(null);
    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (oauthError) setError('Google sign-in isn’t available right now. Use your email instead.');
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={signIn}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-pill border border-border bg-card px-5 py-3 font-semibold hover:border-primary"
      >
        Continue with Google
      </button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <p className="text-center text-xs text-ink-muted">or use your email</p>
    </div>
  );
}
