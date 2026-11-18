import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Card, Skeleton, buttonClasses } from '@ugnaya/web-ui';
import { friendlyError } from '@/lib/errors';
import { ROLE_LABEL } from '@/lib/labels';
import { createClient } from '@/lib/supabase/server';
import { AcceptForm } from './accept-form';

export const metadata: Metadata = { title: 'Administrator invitation' };

export default function JoinPage({ params }: PageProps<'/join/[token]'>) {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Administrator invitation</h1>
      <Suspense fallback={<Skeleton className="mt-8 h-32 w-full" />}>
        <Body params={params} />
      </Suspense>
    </>
  );
}

async function Body({ params }: Pick<PageProps<'/join/[token]'>, 'params'>) {
  const { token } = await params;
  if (!/^[0-9a-f]{48}$/.test(token)) return <p className="mt-6 text-danger">{friendlyError('invite_invalid')}</p>;
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user || user.user.is_anonymous) {
    return (
      <Card className="mt-8">
        <p>Sign in with the account this invitation was made for. It must be an existing UGNAYA account with a confirmed email.</p>
        <Link href={`/login?next=${encodeURIComponent(`/join/${token}`)}`} className={`${buttonClasses('primary')} mt-6`}>Sign in to accept</Link>
      </Card>
    );
  }
  const { data, error } = await supabase.rpc('admin_invite_preview', { p_token: token });
  if (error) return <p className="mt-6 text-danger">{friendlyError(error.message)}</p>;
  const invite = data as { email: string; role: string; expires_at: string };
  return (
    <Card className="mt-8 space-y-4">
      <p>
        You’ve been invited to the UGNAYA admin portal as <strong>{ROLE_LABEL[invite.role] ?? invite.role}</strong>, for{' '}
        <strong>{invite.email}</strong>. You’re signed in as <strong>{user.user.email}</strong>.
      </p>
      <p className="text-sm text-ink-muted">After accepting you’ll set up an authenticator app. Nothing in the portal works without it.</p>
      <AcceptForm token={token} />
    </Card>
  );
}
