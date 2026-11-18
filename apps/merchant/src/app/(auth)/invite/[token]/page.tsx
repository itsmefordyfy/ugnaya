import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Icon, Skeleton, Ugi, buttonClasses } from '@ugnaya/web-ui';
import { DataError } from '@/components/data-error';
import { getViewer } from '@/lib/auth/session';
import { friendlyError } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { isInviteToken, ROLE_NAMES } from '@/lib/staff';
import { supabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { AcceptForm } from './_components/accept-form';

export const metadata: Metadata = { title: 'Staff invitation', robots: { index: false } };

type Preview = { trade_name: string | null; role: 'owner' | 'manager' | 'cashier'; email: string; display_name: string; expires_at: string };

const ROLE_MEANS: Record<string, string> = {
  manager: 'You’ll help run the business: the dashboard, customers, rewards, campaigns, and the counter.',
  cashier: 'You’ll award and redeem points for customers at the counter.',
};

export default function InvitePage({ params }: PageProps<'/invite/[token]'>) {
  return (
    <Suspense fallback={<InviteSkeleton />}>
      <Invite params={params} />
    </Suspense>
  );
}

// Reads the session and the URL, so it renders at request time behind the boundary.
async function Invite({ params }: Pick<PageProps<'/invite/[token]'>, 'params'>) {
  const { token } = await params;
  if (!isInviteToken(token)) return <Invalid />;
  const next = encodeURIComponent(`/invite/${token}`);
  const viewer = supabaseEnv() ? await getViewer() : null;

  // The invitation's details can only be read with a session, so a visitor signs in or registers first.
  if (!viewer) {
    return (
      <>
        <Ugi pose="happy" height={96} />
        <h1 className="mt-4 text-3xl font-bold tracking-tight">You’ve been invited to join a business on UGNAYA</h1>
        <p className="mt-2 text-ink-muted">
          Sign in, or create an account, with the email address the invitation was sent to. You’ll see the details and
          accept on the next screen.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={`/login?next=${next}`} className={buttonClasses('primary', 'lg')}>Sign in</Link>
          <Link href={`/register?next=${next}`} className={buttonClasses('secondary', 'lg')}>Create an account</Link>
        </div>
      </>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('merchant_invite_preview', { p_token: token });
  if (error) {
    if (error.message === 'invite_invalid') return <Invalid />;
    return (
      <>
        <h1 className="text-3xl font-bold tracking-tight">Staff invitation</h1>
        <div className="mt-8"><DataError message={friendlyError(error)} /></div>
      </>
    );
  }
  const invite = data as Preview;
  const business = invite.trade_name ?? 'a business';
  const sameEmail = (viewer.email ?? '').toLowerCase() === invite.email.toLowerCase();

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Join {business}</h1>
      <p className="mt-2 text-ink-muted">{invite.display_name}, you’ve been invited to the team on UGNAYA.</p>
      <dl className="mt-8 divide-y divide-divider rounded-lg border border-border bg-card px-5">
        <Row label="Business" value={business} />
        <Row label="Role" value={ROLE_NAMES[invite.role]} />
        <Row label="Invited email" value={invite.email} />
        <Row label="Link expires" value={formatDateTime(invite.expires_at)} />
      </dl>
      {ROLE_MEANS[invite.role] && <p className="mt-4 text-sm text-ink-muted">{ROLE_MEANS[invite.role]}</p>}
      <div className="mt-8">
        {sameEmail ? (
          <AcceptForm token={token} />
        ) : (
          <div role="alert" className="space-y-4 rounded-lg border border-warning-soft bg-warning-soft p-5 text-warning-text">
            <p className="flex items-start gap-2 font-semibold">
              <Icon name="warning" size={20} className="shrink-0" />
              This invitation is for a different email
            </p>
            <p className="text-sm">
              You’re signed in as <strong>{viewer.email}</strong>, but the invitation is for <strong>{invite.email}</strong>. Sign out,
              then open this link again and sign in or register with {invite.email}.
            </p>
            <form action="/logout" method="post">
              <button type="submit" className={buttonClasses('secondary')}>Sign out</button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="break-all font-medium sm:text-right">{value}</dd>
    </div>
  );
}

function Invalid() {
  return (
    <>
      <Ugi pose="thinking" height={110} />
      <h1 className="mt-4 text-3xl font-bold tracking-tight">This invitation can’t be used</h1>
      <p className="mt-3 text-ink-muted">{friendlyError('invite_invalid')}</p>
      <Link href="/" className={`${buttonClasses('primary')} mt-8`}>Go to UGNAYA for Business</Link>
    </>
  );
}

function InviteSkeleton() {
  return (
    <div role="status" aria-label="Loading the invitation" className="space-y-4">
      <Skeleton className="h-9 w-72 max-w-full" />
      <Skeleton className="h-5 w-80 max-w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
