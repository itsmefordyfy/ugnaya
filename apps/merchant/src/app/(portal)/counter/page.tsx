import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { EmptyState, Icon, Skeleton, buttonClasses } from '@ugnaya/web-ui';
import { DataError } from '@/components/data-error';
import { LockedNotice } from '@/components/locked-notice';
import { PageHeader } from '@/components/page-header';
import { requireStaff } from '@/lib/auth/guard';
import { friendlyError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { CounterDesk } from './_components/counter-desk';

export const metadata: Metadata = { title: 'Counter' };

export default function CounterPage({ searchParams }: PageProps<'/counter'>) {
  return (
    <Suspense fallback={<CounterSkeleton />}>
      <Counter searchParams={searchParams} />
    </Suspense>
  );
}

async function Counter({ searchParams }: Pick<PageProps<'/counter'>, 'searchParams'>) {
  const ctx = await requireStaff('counter');
  if (ctx.locked) {
    return (
      <>
        <PageHeader title="Counter" description="Award and redeem points at the till, from any tablet or phone." />
        <LockedNotice feature="The counter" status={ctx.merchant.status} showApplicationLink={ctx.role !== 'cashier'} />
      </>
    );
  }

  const supabase = await createClient();
  const [branches, program] = await Promise.all([
    supabase.from('merchant_branches').select('id, name, city').eq('merchant_id', ctx.merchant.id).eq('active', true).order('created_at'),
    supabase.from('loyalty_programs').select('active').eq('merchant_id', ctx.merchant.id).eq('scope', 'merchant').maybeSingle(),
  ]);
  if (branches.error) {
    return (
      <>
        <PageHeader title="Counter" />
        <DataError message={friendlyError(branches.error)} />
      </>
    );
  }

  // A branch manager or cashier limited to some branches only works there (counter_award checks it again).
  const allowed = (branches.data ?? []).filter((b) => !ctx.branchIds || ctx.branchIds.includes(b.id));
  const { branch } = await searchParams;
  const chosen = allowed.find((b) => b.id === branch) ?? (allowed.length === 1 ? allowed[0] : null);
  const canManage = ctx.role !== 'cashier';

  if (allowed.length === 0) {
    return (
      <>
        <PageHeader title="Counter" />
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            title="No branch to work at"
            body={canManage ? 'The counter needs an open branch. Add one, or turn an existing branch back on.' : 'You aren’t assigned to an open branch yet. Ask the owner to add you to one.'}
            action={canManage ? <Link href="/branches" className={buttonClasses('primary')}>Go to branches</Link> : undefined}
          />
        </div>
      </>
    );
  }

  if (!chosen) {
    return (
      <>
        <PageHeader title="Counter" description="Which branch are you working at? This device remembers it in the address, so bookmark the page." />
        <ul className="grid gap-4 sm:grid-cols-2">
          {allowed.map((b) => (
            <li key={b.id}>
              <Link href={`/counter?branch=${b.id}`} className="flex min-h-20 items-center gap-4 rounded-xl border border-border bg-card p-5 hover:border-primary hover:bg-primary-soft">
                <span className="inline-flex size-12 items-center justify-center rounded-pill bg-primary-soft text-primary"><Icon name="store" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">{b.name}</span>
                  {b.city && <span className="block text-sm text-ink-muted">{b.city}</span>}
                </span>
                <Icon name="chevron_right" />
              </Link>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Counter</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-muted">
            <span className="inline-flex items-center gap-1.5"><Icon name="store" size={20} /><strong className="text-ink">{chosen.name}</strong></span>
            <span className="inline-flex items-center gap-1.5"><Icon name="person" size={20} />{ctx.displayName}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {allowed.length > 1 && <Link href="/counter" className={buttonClasses('secondary')}><Icon name="location_on" size={20} />Change branch</Link>}
          <Link href="/counter/store-qr" className={buttonClasses('secondary')}><Icon name="qr_code_scanner" size={20} />Store QR</Link>
        </div>
      </div>
      {program.data && !program.data.active && (
        <p role="status" className="mb-6 flex items-start gap-2 rounded-md bg-warning-soft p-4 text-sm text-warning-text">
          <Icon name="warning" size={20} className="shrink-0" />
          <span>
            The loyalty program is turned off, so awards will be refused.{' '}
            {canManage ? <Link href="/loyalty" className="link font-semibold">Turn it on</Link> : 'Ask the owner to turn it on.'}
          </span>
        </p>
      )}
      <CounterDesk branchId={chosen.id} />
    </>
  );
}

function CounterSkeleton() {
  return (
    <div role="status" aria-label="Loading the counter" className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-5 w-72" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-[30rem] w-full rounded-xl" />
        <Skeleton className="h-[30rem] w-full rounded-xl" />
      </div>
    </div>
  );
}
