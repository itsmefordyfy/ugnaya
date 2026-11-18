import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Card, Skeleton, TileIcon } from '@ugnaya/web-ui';
import { SIGNUP_EMAIL_COOKIE } from '@/lib/auth/constants';
import { authPageRedirect } from '@/lib/auth/roles';
import { getAccount, getViewer } from '@/lib/auth/session';
import { registerStep } from '@/lib/register-step';
import { supabaseEnv } from '@/lib/supabase/env';
import { urls } from '@/lib/urls';
import { SetupNotice } from '../_components/setup-notice';
import { CheckEmail } from './_components/check-email';
import { SignUpForm } from './_components/sign-up-form';

export const metadata: Metadata = { title: 'Create your account' };

export default function RegisterPage({ searchParams }: PageProps<'/register'>) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <RegisterStep searchParams={searchParams} />
    </Suspense>
  );
}

const Heading = ({ title, intro }: { title: string; intro: string }) => (
  <>
    <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
    <p className="mt-2 text-ink-muted">{intro}</p>
  </>
);

// Reads the session, a cookie and the URL, so it renders at request time behind the boundary.
async function RegisterStep({ searchParams }: Pick<PageProps<'/register'>, 'searchParams'>) {
  const { step, type } = await searchParams;
  // Businesses register in the merchant portal (its own site and session since 2026-11-07).
  if (type === 'merchant') redirect(`${urls.merchant}/register`);
  if (!supabaseEnv()) return <SetupNotice />;
  const viewer = await getViewer();
  const account = viewer ? await getAccount(viewer.id) : null;
  const to = authPageRedirect(account?.role ?? null, urls);
  if (to) redirect(to);

  switch (registerStep({ user: viewer, justSignedUp: step === 'check-email' })) {
    case 'check-email':
      return (
        <>
          <Heading title="Almost there" intro="One more step, then you’re in." />
          <div className="mt-8">
            <CheckEmail email={(await cookies()).get(SIGNUP_EMAIL_COOKIE)?.value ?? null} />
          </div>
        </>
      );
    default:
      if (type !== 'customer') return <Chooser />;
      return (
        <>
          <Heading title="Create your account" intro="One free wallet for every UGNAYA shop." />
          <div className="mt-6" />
          <SignUpForm />
        </>
      );
  }
}

/** /register with no type: who are you? */
function Chooser() {
  return (
    <>
      <Heading title="Join UGNAYA" intro="Choose what you’d like to do." />
      <div className="mt-8 grid gap-4">
        <Link href="/register?type=customer" className="block rounded-lg focus-visible:outline-offset-4">
          <Card variant="raised" className="flex items-center gap-4 transition hover:border-primary">
            <TileIcon icon="account_balance_wallet" tone="teal" size="lg" />
            <span>
              <span className="block text-lg font-semibold">I’m a customer</span>
              <span className="block text-sm text-ink-muted">Create a free wallet for every UGNAYA shop.</span>
            </span>
          </Card>
        </Link>
        {/* The merchant portal is a separate site with its own sign-in, so this is a plain link. */}
        <a href={`${urls.merchant}/register`} className="block rounded-lg focus-visible:outline-offset-4">
          <Card variant="raised" className="flex items-center gap-4 transition hover:border-primary">
            <TileIcon icon="storefront" tone="blue" size="lg" />
            <span>
              <span className="block text-lg font-semibold">I own a business</span>
              <span className="block text-sm text-ink-muted">Register your shop in UGNAYA for Business.</span>
            </span>
          </Card>
        </a>
      </div>
      <p className="mt-8 text-center text-sm text-ink-muted">
        Already registered?{' '}
        <Link href="/login" className="font-semibold link">
          Sign in
        </Link>
      </p>
    </>
  );
}
