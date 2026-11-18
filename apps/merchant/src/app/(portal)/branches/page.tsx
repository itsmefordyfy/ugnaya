import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Badge, EmptyState, Icon, Skeleton, buttonClasses } from '@ugnaya/web-ui';
import { DataError } from '@/components/data-error';
import { PageHeader } from '@/components/page-header';
import { requireStaff } from '@/lib/auth/guard';
import { friendlyError } from '@/lib/errors';
import { formatNumber } from '@/lib/format';
import { readHours, summarizeHours } from '@/lib/hours';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Branches & hours' };

export default function BranchesPage({ searchParams }: PageProps<'/branches'>) {
  return (
    <>
      <PageHeader
        title="Branches & hours"
        description="Where customers can earn and redeem, and when you’re open. Editable before and after approval."
        actions={<Link href="/branches/new" className={buttonClasses('primary')}><Icon name="add" size={20} />Add branch</Link>}
      />
      <Suspense fallback={<ListSkeleton />}>
        <Branches searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Branches({ searchParams }: Pick<PageProps<'/branches'>, 'searchParams'>) {
  const { saved } = await searchParams;
  const ctx = await requireStaff('branches');
  const supabase = await createClient();
  const [branches, subscription] = await Promise.all([
    supabase.from('merchant_branches').select('id, name, address, city, lat, lng, hours, active').eq('merchant_id', ctx.merchant.id).order('created_at'),
    supabase.from('subscriptions').select('plan').eq('merchant_id', ctx.merchant.id).maybeSingle(),
  ]);
  if (branches.error) return <DataError message={friendlyError(branches.error)} />;
  const rows = branches.data;
  // Plan limits are recorded, not enforced, until the mobile apps exist (CLAUDE.md): this is information only.
  const plan = subscription.data?.plan;
  const limits = plan ? await supabase.from('plan_limits').select('branches').eq('plan', plan).maybeSingle() : null;
  const limit = limits?.data?.branches ?? null;
  const activeCount = rows.filter((b) => b.active).length;

  return (
    <div className="space-y-4">
      {typeof saved === 'string' && <p role="status" className="rounded-md bg-success-soft p-3 text-sm text-success-text">Saved {saved}.</p>}
      {limit !== null && (
        <p className="text-sm text-ink-muted tabular">
          {formatNumber(activeCount)} of {formatNumber(limit)} active branch{limit === 1 ? '' : 'es'} on your plan.{' '}
          {activeCount >= limit && <>Need more? <Link href="/billing" className="link font-semibold">See your plan</Link>.</>}
        </p>
      )}
      {rows.length === 0 ? (
        <EmptyState
          title="No branches yet"
          body="Add the place where customers earn and redeem. Your first branch was made from your registration; if it’s gone, add one here."
          action={<Link href="/branches/new" className={buttonClasses('primary')}>Add branch</Link>}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {rows.map((b) => (
            <li key={b.id} className="flex flex-col rounded-lg border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-sans text-lg font-semibold">{b.name}</h2>
                {b.active ? <Badge tone="success" icon="check_circle">Open</Badge> : <Badge icon="pause_circle">Inactive</Badge>}
              </div>
              <p className="mt-1 text-sm text-ink-muted">{[b.address, b.city].filter(Boolean).join(', ') || 'No address yet'}</p>
              <p className="mt-3 flex items-start gap-2 text-sm"><Icon name="schedule" size={18} className="mt-0.5 shrink-0 text-ink-muted" />{summarizeHours(readHours(b.hours))}</p>
              {b.lat !== null && b.lng !== null && (
                <p className="mt-1 flex items-center gap-2 text-sm text-ink-muted"><Icon name="location_on" size={18} />On the map</p>
              )}
              <div className="mt-4 pt-1">
                <Link href={`/branches/${b.id}`} className={buttonClasses('secondary')}><Icon name="edit" size={18} />Edit<span className="sr-only"> {b.name}</span></Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div role="status" aria-label="Loading branches" className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-44 w-full" />
    </div>
  );
}
