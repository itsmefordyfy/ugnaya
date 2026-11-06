import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { buttonClasses } from '@/components/ui/button-link';
import { Icon } from '@/components/ui/icon';
import { getOwnedMerchant, getViewer } from '@/lib/auth/session';
import { gateFor } from '@/lib/auth/redirects';
import { CONTACT_EMAIL } from '@/lib/site';

export const metadata: Metadata = { title: 'Your application' };

export default function AppHome({ searchParams }: PageProps<'/app'>) {
  return (
    <Suspense fallback={<p className="text-ink-muted">Loading your business…</p>}>
      <Status searchParams={searchParams} />
    </Suspense>
  );
}

async function Status({ searchParams }: Pick<PageProps<'/app'>, 'searchParams'>) {
  const { welcome } = await searchParams;
  const viewer = await getViewer();
  const gate = gateFor('/app', { signedIn: viewer !== null, hasMerchant: false });
  if (gate || !viewer) redirect(gate ?? '/login?next=/app');
  const merchant = await getOwnedMerchant(viewer.id);

  if (!merchant) {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-2xl font-bold">Finish registering your business</h1>
        <p className="mt-2 text-ink-muted">Your account is ready. Tell us about your shop to continue.</p>
        <Link href="/register" className={`${buttonClasses('primary')} mt-6`}>Add business details</Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {welcome === '1' && (
        <p role="status" className="rounded-md bg-success/10 p-4 text-success">
          Thanks for registering {merchant.tradeName}!
        </p>
      )}
      <section className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Your business</p>
        <h1 className="mt-1 text-2xl font-bold">{merchant.tradeName}</h1>
        <StatusLine status={merchant.status} name={merchant.tradeName} />
      </section>
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">What happens next</h2>
        <ol className="mt-3 space-y-2 text-ink-muted">
          <li>1. We call or text you to book a setup visit.</li>
          <li>2. We set up your rewards with you and train your staff.</li>
          <li>3. Your QR kit goes on the counter and customers start earning.</li>
        </ol>
        <p className="mt-4 text-sm text-ink-muted">
          Questions? <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-primary hover:underline">{CONTACT_EMAIL}</a>
        </p>
      </section>
    </div>
  );
}

function StatusLine({ status, name }: { status: string; name: string }) {
  switch (status) {
    case 'active':
      return (
        <p className="mt-3 flex items-start gap-2 text-success">
          <Icon name="verified" className="shrink-0" />
          <span>Verified. The business app and dashboard are coming next; we’ll set you up in person.</span>
        </p>
      );
    case 'pending_verification':
      return (
        <p className="mt-3 flex items-start gap-2 text-ink-muted">
          <Icon name="schedule" className="shrink-0 text-primary" />
          <span>We’re verifying {name}. Expect a call or a visit within one business day.</span>
        </p>
      );
    default:
      return (
        <p className="mt-3 text-danger">
          This business isn’t active right now. Email {CONTACT_EMAIL} and we’ll help.
        </p>
      );
  }
}
