import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@ugnaya/web-ui';
import { getAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';
import { CodeForm } from './_components/code-form';
import { EnrolFlow } from './_components/enrol-flow';

export const metadata: Metadata = { title: 'Second step' };

export default function MfaPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Second step</h1>
      <Suspense fallback={<Skeleton className="mt-8 h-40 w-full" />}>
        <Step />
      </Suspense>
      <form action="/logout" method="post" className="mt-8">
        <button type="submit" className="link min-h-11 text-sm font-semibold">Sign out</button>
      </form>
    </>
  );
}

async function Step() {
  const admin = await getAdmin();
  if (!admin) redirect('/denied?reason=expired');
  if (!admin.me.role) redirect('/denied?reason=not_admin');
  if (admin.me.mfa) redirect('/');
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = factors?.totp.find((f) => f.status === 'verified');
  return (
    <div className="mt-8">
      {verified ? (
        <>
          <p className="mb-4 text-ink-muted">Enter the 6-digit code from your authenticator app.</p>
          <CodeForm factorId={verified.id} purpose="verify" />
        </>
      ) : (
        <EnrolFlow />
      )}
    </div>
  );
}
