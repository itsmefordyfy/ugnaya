import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@ugnaya/web-ui';
import { PENDING_INVITE_COOKIE, SIGNUP_EMAIL_COOKIE } from '@/lib/auth/constants';
import { safeNext } from '@/lib/auth/redirects';
import { getMembership, getViewer } from '@/lib/auth/session';
import { registerStep } from '@/lib/register-step';
import { supabaseEnv } from '@/lib/supabase/env';
import { urls } from '@/lib/urls';
import { SetupNotice } from '../_components/setup-notice';
import { BusinessForm } from './_components/business-form';
import { CheckEmail } from './_components/check-email';
import { SignUpForm } from './_components/sign-up-form';

export const metadata: Metadata = { title: 'Register your business' };

export default function RegisterPage({ searchParams }: PageProps<'/register'>) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <RegisterStep searchParams={searchParams} />
    </Suspense>
  );
}

/** Three steps for a business: the account, the business, then the application (documents) inside the portal. */
const Progress = ({ step }: { step: 1 | 2 }) => (
  <div className="mt-6" role="group" aria-label={`Step ${step} of 3`}>
    <div className="flex gap-2" aria-hidden="true">
      <span className="h-1.5 flex-1 rounded-pill bg-primary" />
      <span className={`h-1.5 flex-1 rounded-pill ${step >= 2 ? 'bg-primary' : 'bg-border'}`} />
      <span className="h-1.5 flex-1 rounded-pill bg-border" />
    </div>
    <p className="mt-2 text-sm font-medium text-ink-muted">
      Step {step} of 3: {step === 1 ? 'your account' : 'your business'}. Next: {step === 1 ? 'your business' : 'verification documents'}.
    </p>
  </div>
);

const Heading = ({ title, intro }: { title: string; intro: string }) => (
  <>
    <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
    <p className="mt-2 text-ink-muted">{intro}</p>
  </>
);

const isInvite = (path: string | null): path is string => Boolean(path && /^\/invite\/[0-9a-f]{48}$/.test(path));

// Reads the session, cookies and the URL, so it renders at request time behind the boundary.
async function RegisterStep({ searchParams }: Pick<PageProps<'/register'>, 'searchParams'>) {
  const params = await searchParams;
  if (!supabaseEnv()) return <SetupNotice />;
  const next = safeNext(typeof params.next === 'string' ? params.next : null);
  const invite = isInvite(next) ? next : null;
  const jar = await cookies();
  const viewer = await getViewer();
  const membership = viewer ? await getMembership(viewer.id) : null;

  if (viewer) {
    // Someone who opened an invitation before signing up goes back to it rather than registering a business.
    const pending = invite ?? jar.get(PENDING_INVITE_COOKIE)?.value ?? null;
    if (!membership && isInvite(pending)) redirect(pending);
    if (membership) redirect('/');
  }

  switch (registerStep({ user: viewer, hasMerchant: Boolean(membership), justSignedUp: params.step === 'check-email' })) {
    case 'check-email':
      return (
        <>
          <Heading title="Almost there" intro="One more step, then you’re in." />
          <div className="mt-8">
            <CheckEmail email={jar.get(SIGNUP_EMAIL_COOKIE)?.value ?? null} restart={invite ? `/register?next=${encodeURIComponent(invite)}` : '/register'} />
          </div>
        </>
      );
    case 'business':
      return (
        <>
          <Heading title="Tell us about your business" intro="We verify every business before it goes live on UGNAYA." />
          <Progress step={2} />
          <p className="my-6 rounded-md bg-primary-soft p-3 text-sm">
            Signed in as <strong>{viewer?.email}</strong>.{' '}
            <span className="text-ink-muted">Joining someone else’s business? Open the invitation link they sent you instead.</span>
          </p>
          <BusinessForm />
        </>
      );
    default:
      return (
        <>
          {invite ? (
            <Heading title="Create your account" intro="Then accept your invitation to join the team." />
          ) : (
            <>
              <Heading title="Register your business" intro="Three short steps. We verify every business before it goes live." />
              <Progress step={1} />
            </>
          )}
          <div className="mt-6" />
          <SignUpForm next={invite ?? ''} />
          {!invite && (
            <p className="mt-6 text-center text-sm text-ink-muted">
              Shopping, not selling? <a href={`${urls.app}/register?type=customer`} className="font-semibold link">Get the customer wallet</a>
            </p>
          )}
        </>
      );
  }
}
