import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SetupNotice } from '@/components/setup-notice';
import { supabaseEnv } from '@/lib/supabase/env';
import { LoginForm } from './_components/login-form';

export const metadata: Metadata = { title: 'Sign in' };

const REASONS: Record<string, string> = {
  idle: 'You were signed out after 30 minutes without activity.',
  not_admin: 'That account is not an administrator.',
};

export default function LoginPage({ searchParams }: PageProps<'/login'>) {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Administrator sign-in</h1>
      <p className="mt-2 text-ink-muted">Authorised administrators only. Accounts are created by an existing administrator; there is no registration.</p>
      <Suspense fallback={null}>
        <Body searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Body({ searchParams }: Pick<PageProps<'/login'>, 'searchParams'>) {
  const { reason, next } = await searchParams;
  // Only an invitation link may be returned to (anything else goes through the second factor first).
  const joinNext = typeof next === 'string' && /^\/join\/[0-9a-f]{48}$/.test(next) ? next : undefined;
  if (!supabaseEnv()) return <div className="mt-8"><SetupNotice /></div>;
  const note = typeof reason === 'string' ? REASONS[reason] : undefined;
  return (
    <div className="mt-8 space-y-4">
      {note && <p role="status" className="rounded-md bg-warning-soft p-3 text-sm text-warning-text">{note}</p>}
      {joinNext && <p className="text-sm text-ink-muted">Sign in with the account the invitation was sent to. You’ll accept it next, then set up your authenticator app.</p>}
      <LoginForm next={joinNext} />
    </div>
  );
}
