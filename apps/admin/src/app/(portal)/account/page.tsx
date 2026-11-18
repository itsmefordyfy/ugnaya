import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Badge, Card, Skeleton, buttonClasses } from '@ugnaya/web-ui';
import { requireAdmin } from '@/lib/admin';
import { signOutEverywhere } from './actions';

export const metadata: Metadata = { title: 'Account' };

export default function AccountPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Account</h1>
      <Suspense fallback={<Skeleton className="mt-6 h-40 w-full" />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const admin = await requireAdmin();
  return (
    <div className="mt-6 max-w-2xl space-y-4">
      <Card>
        <dl className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <dt className="text-ink-muted">Email</dt><dd className="break-all">{admin.email}</dd>
          <dt className="text-ink-muted">Role</dt><dd><Badge tone="accent">{admin.role.replace('_', ' ')}</Badge></dd>
          <dt className="text-ink-muted">Second factor</dt><dd><Badge tone="success" icon="check_circle">Verified this session</Badge></dd>
        </dl>
      </Card>
      <Card>
        <h2 className="font-sans text-lg font-semibold">Sign out everywhere</h2>
        <p className="mt-1 text-sm text-ink-muted">Ends this session and every other session of your account, on all devices. Use it if you think someone else has access.</p>
        <form action={signOutEverywhere} className="mt-4">
          <button type="submit" className={buttonClasses('secondary')}>Sign out of all devices</button>
        </form>
      </Card>
    </div>
  );
}
