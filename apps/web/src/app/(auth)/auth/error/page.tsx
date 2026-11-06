import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { buttonClasses } from '@/components/ui/button-link';

export const metadata: Metadata = { title: 'Sign-in problem', robots: { index: false } };

const MESSAGES: Record<string, string> = {
  confirm: 'That confirmation link has expired or was already used. Sign in, or register again to get a new one.',
  oauth: 'Google sign-in didn’t finish. Please try again, or use your email.',
};

export default function AuthErrorPage({ searchParams }: PageProps<'/auth/error'>) {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">That didn’t work</h1>
      <Suspense fallback={<p className="mt-3 text-ink-muted">…</p>}>
        <Reason searchParams={searchParams} />
      </Suspense>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/login" className={buttonClasses('primary')}>Sign in</Link>
        <Link href="/register" className={buttonClasses('secondary')}>Register</Link>
      </div>
    </>
  );
}

async function Reason({ searchParams }: Pick<PageProps<'/auth/error'>, 'searchParams'>) {
  const { reason } = await searchParams;
  const message = (typeof reason === 'string' && MESSAGES[reason]) || 'Something went wrong while signing you in. Please try again.';
  return <p className="mt-3 text-ink-muted">{message}</p>;
}
