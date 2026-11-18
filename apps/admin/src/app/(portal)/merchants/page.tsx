import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Icon, Skeleton, buttonClasses } from '@ugnaya/web-ui';
import { FilterBar, Pagination, SelectFilter } from '@/components/list-controls';
import { MerchantTable } from '@/components/merchant-table';
import { PageHeader } from '@/components/page-header';
import { RpcProblem } from '@/components/rpc-problem';
import { requireAdmin } from '@/lib/admin';
import { MERCHANT_STATUS, MERCHANT_STATUSES } from '@/lib/labels';
import { PAGE_SIZE, hrefWith, oneOf, pageOffset, param, parsePage } from '@/lib/paging';
import { callAdmin } from '@/lib/rpc';
import type { MerchantRow, Paged } from '@/lib/types';

export const metadata: Metadata = { title: 'Merchants' };

export default function MerchantsPage({ searchParams }: PageProps<'/merchants'>) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Directory searchParams={searchParams} />
    </Suspense>
  );
}

async function Directory({ searchParams }: Pick<PageProps<'/merchants'>, 'searchParams'>) {
  const admin = await requireAdmin('merchants.view');
  const params = await searchParams;
  const status = oneOf(param(params, 'status'), ['', ...MERCHANT_STATUSES], '');
  const q = param(params, 'q');
  const page = parsePage(param(params, 'page'));
  const current = { status, q };
  const canExport = admin.permissions.includes('reports.export') || admin.permissions.includes('finance.export');

  const list = await callAdmin<Paged<MerchantRow>>('admin_list_merchants', {
    p_status: status || undefined, p_search: q || undefined, p_limit: PAGE_SIZE, p_offset: pageOffset(page),
  });

  return (
    <>
      <PageHeader title="Merchants" description="Every business on UGNAYA. Transactions are counted over the last 30 days."
        actions={canExport && (
          <a href={hrefWith('/export/merchants', current)} className={buttonClasses('secondary')} download>
            <Icon name="download" size={18} />Export CSV
          </a>
        )} />
      <FilterBar path="/merchants" q={q} placeholder="Business name, city or id" clearHref="/merchants">
        <SelectFilter name="status" label="Status" value={status}
          options={[{ value: '', label: 'All statuses' }, ...MERCHANT_STATUSES.map((s) => ({ value: s, label: MERCHANT_STATUS[s].label }))]} />
      </FilterBar>
      {!list.ok ? <RpcProblem failure={list} what="merchants" /> : (
        <>
          <MerchantTable mode="directory" rows={list.data.rows} emptyTitle={q || status ? 'No matching merchants' : 'No merchants yet'}
            emptyBody={q || status ? 'Try another search or status.' : 'Businesses appear here when they register.'} />
          <Pagination path="/merchants" params={current} page={page} total={list.data.total} size={PAGE_SIZE} />
        </>
      )}
    </>
  );
}
