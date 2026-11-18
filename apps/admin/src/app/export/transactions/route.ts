import type { NextRequest } from 'next/server';
import { dayBounds } from '@/lib/date-range';
import { csvExport } from '@/lib/export';
import { TRANSACTION_TYPES } from '@/lib/labels';
import { isUuid, oneOf } from '@/lib/paging';
import { callAdmin } from '@/lib/rpc';
import type { Paged, TransactionRow } from '@/lib/types';

/** Transactions as CSV, with the same filters as /transactions. Amounts are centavos and points are points, in separate columns. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const merchant = sp.get('merchant') ?? '';
  const type = oneOf(sp.get('type') ?? '', ['', ...TRANSACTION_TYPES], '');
  const status = oneOf(sp.get('status') ?? '', ['', 'completed', 'voided'], '');
  const q = (sp.get('q') ?? '').trim().slice(0, 120);
  const { since, until } = dayBounds(sp.get('from'), sp.get('to'));
  return csvExport<TransactionRow>('transactions',
    (limit, offset) => callAdmin<Paged<TransactionRow>>('admin_list_transactions', {
      p_merchant_id: isUuid(merchant) ? merchant : undefined, p_type: type || undefined, p_status: status || undefined,
      p_from: since ?? undefined, p_to: until ?? undefined, p_search: q || undefined, p_limit: limit, p_offset: offset,
    }),
    [
      { header: 'id', value: (t) => t.id },
      { header: 'created_at_utc', value: (t) => t.created_at },
      { header: 'merchant_id', value: (t) => t.merchant_id },
      { header: 'merchant', value: (t) => t.merchant },
      { header: 'branch', value: (t) => t.branch },
      { header: 'staff', value: (t) => t.staff },
      { header: 'member_id', value: (t) => t.member_id },
      { header: 'type', value: (t) => t.type },
      { header: 'status', value: (t) => t.status },
      { header: 'amount_centavos', value: (t) => t.amount_centavos },
      { header: 'points', value: (t) => t.points },
      { header: 'receipt_no', value: (t) => t.receipt_no },
      { header: 'reason', value: (t) => t.reason },
      { header: 'reverses_id', value: (t) => t.reverses_id },
    ]);
}
