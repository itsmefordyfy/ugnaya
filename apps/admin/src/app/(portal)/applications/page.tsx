import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@ugnaya/web-ui';
import { FilterBar, Pagination, Tabs } from '@/components/list-controls';
import { MerchantTable } from '@/components/merchant-table';
import { PageHeader } from '@/components/page-header';
import { RpcProblem } from '@/components/rpc-problem';
import { requireAdmin } from '@/lib/admin';
import { PAGE_SIZE, hrefWith, oneOf, pageOffset, param, parsePage } from '@/lib/paging';
import { callAdmin } from '@/lib/rpc';
import type { MerchantRow, Paged } from '@/lib/types';

export const metadata: Metadata = { title: 'Merchant applications' };

const TABS = [
  { value: 'queue', label: 'All waiting' },
  { value: 'pending_verification', label: 'New' },
  { value: 'under_review', label: 'Under review' },
  { value: 'info_required', label: 'Info requested' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'draft', label: 'Not submitted' },
] as const;
type Tab = (typeof TABS)[number]['value'];

export default function ApplicationsPage({ searchParams }: PageProps<'/applications'>) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Queue searchParams={searchParams} />
    </Suspense>
  );
}

async function Queue({ searchParams }: Pick<PageProps<'/applications'>, 'searchParams'>) {
  await requireAdmin('merchants.view');
  const params = await searchParams;
  const status: Tab = oneOf(param(params, 'status'), TABS.map((t) => t.value), 'queue');
  const q = param(params, 'q');
  const page = parsePage(param(params, 'page'));
  const current = { status: status === 'queue' ? '' : status, q };

  const [list, ...counts] = await Promise.all([
    callAdmin<Paged<MerchantRow>>('admin_list_merchants', { p_status: status, p_search: q || undefined, p_limit: PAGE_SIZE, p_offset: pageOffset(page) }),
    ...TABS.map((t) => callAdmin<Paged<MerchantRow>>('admin_list_merchants', { p_status: t.value, p_limit: 1 })),
  ]);

  return (
    <>
      <PageHeader title="Merchant applications"
        description="Businesses waiting for a decision. “All waiting” is oldest first, so nobody waits longest by accident; the other tabs show the newest first. Open one to review its documents and decide." />
      <Tabs label="Application status" items={TABS.map((t, i) => ({
        label: t.label, href: hrefWith('/applications', current, { status: t.value === 'queue' ? null : t.value }), active: t.value === status,
        count: counts[i].ok ? counts[i].data.total : null,
      }))} />
      <FilterBar path="/applications" q={q} placeholder="Business name, city or id" hidden={{ status: current.status }} clearHref={hrefWith('/applications', { status: current.status })} />
      {!list.ok ? <RpcProblem failure={list} what="applications" /> : (
        <>
          <MerchantTable mode="queue" rows={list.data.rows} emptyTitle={q ? 'No matching applications' : 'Nothing waiting here'}
            emptyBody={q ? 'Try another name or city, or clear the search.' : 'New applications appear here as soon as a business submits one.'} />
          <Pagination path="/applications" params={current} page={page} total={list.data.total} size={PAGE_SIZE} />
        </>
      )}
    </>
  );
}
