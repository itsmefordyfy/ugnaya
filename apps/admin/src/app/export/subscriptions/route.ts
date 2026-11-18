import type { NextRequest } from 'next/server';
import { csvExport } from '@/lib/export';
import { PLANS } from '@/lib/labels';
import { oneOf } from '@/lib/paging';
import { callAdmin } from '@/lib/rpc';
import type { Paged, SubscriptionRow } from '@/lib/types';

/** Subscriptions as CSV, with the same filters as /subscriptions. Prices are list prices in centavos, not money collected. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const plan = oneOf(sp.get('plan') ?? '', ['', ...PLANS], '');
  const q = (sp.get('q') ?? '').trim().slice(0, 120);
  return csvExport<SubscriptionRow>('subscriptions',
    (limit, offset) => callAdmin<Paged<SubscriptionRow>>('admin_list_subscriptions', { p_plan: plan || undefined, p_search: q || undefined, p_limit: limit, p_offset: offset }),
    [
      { header: 'merchant_id', value: (s) => s.merchant_id },
      { header: 'merchant', value: (s) => s.trade_name },
      { header: 'merchant_status', value: (s) => s.merchant_status },
      { header: 'plan', value: (s) => s.plan },
      { header: 'status', value: (s) => s.status },
      { header: 'founding', value: (s) => s.founding },
      { header: 'founding_until', value: (s) => s.founding_until },
      { header: 'period_start', value: (s) => s.period_start },
      { header: 'period_end', value: (s) => s.period_end },
      { header: 'list_price_centavos', value: (s) => s.price_centavos },
      { header: 'updated_at_utc', value: (s) => s.updated_at },
    ]);
}
