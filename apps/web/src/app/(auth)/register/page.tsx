import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getOwnedMerchant, getViewer } from '@/lib/auth/session';
import { SIGNUP_EMAIL_COOKIE } from '@/lib/auth/constants';
import { gateFor } from '@/lib/auth/redirects';
import { registerStep } from '@/lib/register-step';
import { BusinessForm } from './_components/business-form';
import { CheckEmail } from './_components/check-email';
import { SignUpForm } from './_components/sign-up-form';

export const metadata: Metadata = {
  title: 'Register your business',
  description: 'Register your café, milk tea shop or restaurant on UGNAYA. We verify within one business day and visit to set you up.',
};

export default function RegisterPage({ searchParams }: PageProps<'/register'>) {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Register your business</h1>
      <p className="mt-2 text-ink-muted">Two short steps. We verify every business before it goes live.</p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-ink-muted">Loading…</p>}>
          <RegisterStep searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

// Reads the session, a cookie and the URL, so it renders at request time behind the boundary.
async function RegisterStep({ searchParams }: Pick<PageProps<'/register'>, 'searchParams'>) {
  const { step } = await searchParams;
  const viewer = await getViewer();
  const merchant = viewer ? await getOwnedMerchant(viewer.id) : null;
  const gate = gateFor('/register', { signedIn: viewer !== null, hasMerchant: merchant !== null });
  if (gate) redirect(gate);

  switch (registerStep({ user: viewer, hasMerchant: merchant !== null, justSignedUp: step === 'check-email' })) {
    case 'check-email':
      return <CheckEmail email={(await cookies()).get(SIGNUP_EMAIL_COOKIE)?.value ?? null} />;
    case 'business':
      return (
        <>
          <p className="mb-6 rounded-md bg-primary/10 p-3 text-sm">
            Step 2 of 2: signed in as <strong>{viewer?.email}</strong>. Tell us about your business.
          </p>
          <BusinessForm />
        </>
      );
    case 'done':
      redirect('/app');
    default:
      return (
        <>
          <p className="mb-6 text-sm font-medium text-ink-muted">Step 1 of 2: your account</p>
          <SignUpForm />
        </>
      );
  }
}
