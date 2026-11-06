import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getOwnedMerchant, getViewer } from '@/lib/auth/session';
import { gateFor, safeNext } from '@/lib/auth/redirects';
import { LoginForm } from './_components/login-form';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default function LoginPage({ searchParams }: PageProps<'/login'>) {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-2 text-ink-muted">For business owners and managers.</p>
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
  const next = safeNext(typeof params.next === 'string' ? params.next : null) ?? '/app';
  const viewer = await getViewer();
  const merchant = viewer ? await getOwnedMerchant(viewer.id) : null;
  const gate = gateFor('/login', { signedIn: viewer !== null, hasMerchant: merchant !== null });
  if (gate) redirect(gate);
  return <LoginForm next={next} />;
}
