import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { safeNext } from '@/lib/auth/redirects';
import { authPageRedirect } from '@/lib/auth/roles';
import { getAccount, getViewer } from '@/lib/auth/session';
import { supabaseEnv } from '@/lib/supabase/env';
import { urls } from '@/lib/urls';
import { SetupNotice } from '../_components/setup-notice';
import { LoginForm } from './_components/login-form';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default function LoginPage({ searchParams }: PageProps<'/login'>) {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-2 text-ink-muted">Welcome back. Use the email you registered with.</p>
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
  const viewer = await getViewer();
  const account = viewer ? await getAccount(viewer.id) : null;
  const to = authPageRedirect(account?.role ?? null, urls);
  if (to) redirect(to);
  return <LoginForm next={next ?? ''} />;
}
