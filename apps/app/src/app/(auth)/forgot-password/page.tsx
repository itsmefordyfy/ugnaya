import type { Metadata } from 'next';
import { Suspense } from 'react';
import { supabaseEnv } from '@/lib/supabase/env';
import { SetupNotice } from '../_components/setup-notice';
import { ForgotForm } from './_components/forgot-form';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Reset your password</h1>
      <p className="mt-2 text-ink-muted">Enter your email and we’ll send you a link to choose a new one.</p>
      <div className="mt-8">
        <Suspense fallback={null}>
          <Form />
        </Suspense>
      </div>
    </>
  );
}

// Reading the environment at request time keeps the page honest about a missing Supabase key.
async function Form() {
  await Promise.resolve();
  return supabaseEnv() ? <ForgotForm /> : <SetupNotice />;
}
