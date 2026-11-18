import type { NextRequest } from 'next/server';
import { csvExport } from '@/lib/export';
import { MERCHANT_STATUSES } from '@/lib/labels';
import { oneOf } from '@/lib/paging';
import { callAdmin } from '@/lib/rpc';
import type { MerchantRow, Paged } from '@/lib/types';

/** The merchants directory as CSV, with the same filters as /merchants (status, q). */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const status = oneOf(sp.get('status') ?? '', ['', 'queue', ...MERCHANT_STATUSES], '');
  const q = (sp.get('q') ?? '').trim().slice(0, 120);
  return csvExport<MerchantRow>('merchants',
    (limit, offset) => callAdmin<Paged<MerchantRow>>('admin_list_merchants', { p_status: status || undefined, p_search: q || undefined, p_limit: limit, p_offset: offset }),
    [
      { header: 'id', value: (m) => m.id },
      { header: 'name', value: (m) => m.trade_name },
      { header: 'category', value: (m) => m.category },
      { header: 'city', value: (m) => m.city },
      { header: 'status', value: (m) => m.status },
      { header: 'plan', value: (m) => m.plan },
      { header: 'founding', value: (m) => m.founding },
      { header: 'branches', value: (m) => m.branches },
      { header: 'transactions_30d', value: (m) => m.transactions_30d },
      { header: 'joined_at_utc', value: (m) => m.created_at },
      { header: 'approved_at_utc', value: (m) => m.verified_at },
    ]);
}
