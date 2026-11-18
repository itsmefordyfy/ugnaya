'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { safeNext } from '@/lib/auth/redirects';
import { sessionFromHash } from '@/lib/auth/hash-session';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@ugnaya/web-ui';

/** Picks the session out of the URL fragment (the server can't see it), then continues to `next`. */
export function FinishSession() {
  const router = useRouter();
  useEffect(() => {
    const session = sessionFromHash(window.location.hash);
    const next = safeNext(new URLSearchParams(window.location.search).get('next')) ?? '/';
    if (!session) {
      router.replace('/auth/error?reason=confirm');
      return;
    }
    createClient()
      .auth.setSession({ access_token: session.accessToken, refresh_token: session.refreshToken })
      .then(({ error }) => router.replace(error ? '/auth/error?reason=confirm' : next));
  }, [router]);

  return (
    <div role="status" aria-label="Confirming your email" className="space-y-3">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-5 w-72" />
    </div>
  );
}
