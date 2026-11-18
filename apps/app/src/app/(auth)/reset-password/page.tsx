import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getViewer } from '@/lib/auth/session';
import { ResetForm } from './_components/reset-form';

export const metadata: Metadata = { title: 'Choose a new password' };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Choose a new password</h1>
      <p className="mt-2 text-ink-muted">You’re signed in with your reset link. Pick a new password to finish.</p>
      <div className="mt-8">
        <Suspense fallback={null}>
          <Guarded />
        </Suspense>
      </div>
    </>
  );
}

// A reset link signs the person in; without a session there is nothing to reset, so start again.
async function Guarded() {
  const viewer = await getViewer();
  if (!viewer) redirect('/forgot-password');
  return <ResetForm />;
}
