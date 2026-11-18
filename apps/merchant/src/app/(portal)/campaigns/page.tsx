import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Skeleton } from '@ugnaya/web-ui';
import { DataError } from '@/components/data-error';
import { LockedNotice } from '@/components/locked-notice';
import { PageHeader } from '@/components/page-header';
import { offsetFrom, Pagination } from '@/components/pagination';
import { requireStaff } from '@/lib/auth/guard';
import { CAMPAIGN_FILTERS, campaignFilter, statusesFor, type CampaignFilter } from '@/lib/campaigns';
import { friendlyError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { CampaignsManager } from './_components/campaigns-manager';

export const metadata: Metadata = { title: 'Campaigns' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const PAGE_SIZE = 20;

const EMPTY: Record<CampaignFilter, { title: string; body: string }> = {
  all: { title: 'No campaigns yet', body: 'Announce a promotion, news or an event to your members. Start with a draft; nothing shows to customers until you schedule or run it.' },
  live: { title: 'Nothing live right now', body: 'Scheduled and running campaigns appear here, and in the UGNAYA app for your customers.' },
  draft: { title: 'No drafts', body: 'Drafts are campaigns you’re still preparing. Only your team sees them.' },
  past: { title: 'No past campaigns', body: 'Ended and cancelled campaigns appear here.' },
};

export default function CampaignsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader
        title="Campaigns and promotions"
        description="Running and scheduled campaigns show to your customers in the UGNAYA app; drafts don’t. Running promotions also appear on customers’ home screens."
      />
      <Suspense fallback={<CampaignsSkeleton />}>
        <Campaigns searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function CampaignsSkeleton() {
  return (
    <div role="status" aria-label="Loading campaigns" className="space-y-3">
      <Skeleton className="h-11 w-80 max-w-full" />
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
    </div>
  );
}

async function Campaigns({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireStaff('campaigns');
  if (ctx.locked) {
    return (
      <LockedNotice feature="Campaigns" status={ctx.merchant.status}>
        Once you’re approved, you’ll announce promotions, news and events that your customers see in the UGNAYA app.
      </LockedNotice>
    );
  }
  const params = await searchParams;
  const filter = campaignFilter(Array.isArray(params.status) ? params.status[0] : params.status);
  const offset = offsetFrom(params.offset);

  const supabase = await createClient();
  let query = supabase
    .from('campaigns')
    .select('id, name, kind, description, status, starts_at, ends_at', { count: 'exact' })
    .eq('merchant_id', ctx.merchant.id);
  const statuses = statusesFor(filter);
  if (statuses) query = query.in('status', statuses);
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1);

  return (
    <>
      <nav aria-label="Filter campaigns" className="mb-6 flex flex-wrap gap-2">
        {CAMPAIGN_FILTERS.map((f) => (
          <Link key={f.value} href={f.value === 'all' ? '/campaigns' : `/campaigns?status=${f.value}`} aria-current={f.value === filter ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-pill border px-4 text-sm font-semibold ${f.value === filter ? 'border-primary bg-primary text-on-primary' : 'border-border-strong bg-card text-primary hover:bg-primary-soft'}`}>
            {f.label}
          </Link>
        ))}
      </nav>
      {error ? (
        <DataError message={friendlyError(error)} />
      ) : (
        <>
          <CampaignsManager campaigns={data ?? []} emptyTitle={EMPTY[filter].title} emptyBody={EMPTY[filter].body} />
          <Pagination total={count ?? 0} limit={PAGE_SIZE} offset={offset} basePath="/campaigns" params={{ status: filter === 'all' ? undefined : filter }} />
        </>
      )}
    </>
  );
}
