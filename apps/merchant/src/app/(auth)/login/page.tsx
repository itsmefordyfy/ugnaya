import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { safeNext } from '@/lib/auth/redirects';
import { signInRedirect } from '@/lib/auth/access';
import { getViewer } from '@/lib/auth/session';
import { supabaseEnv } from '@/lib/supabase/env';
import { SetupNotice } from '../_components/setup-notice';
import { LoginForm } from './_components/login-form';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default function LoginPage({ searchParams }: PageProps<'/login'>) {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Sign in to your business</h1>
      <p className="mt-2 text-ink-muted">Owners, managers and cashiers with their own sign-in.</p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-ink-muted">Loading…</p>}>
          <Login searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

// Reads the session and the URL, so it renders at request time behind the boundary.
async function Login({ searchParams }: Pick<PageProps<'/login'>, 'searchParams'>) {
  const params = await searchParams;
  if (!supabaseEnv()) return <SetupNotice />;
  const next = safeNext(typeof params.next === 'string' ? params.next : null);
  // Already signed in here: carry on to where they were going.
  if (await getViewer()) redirect(signInRedirect(next));
  return <LoginForm next={next ?? ''} />;
}
