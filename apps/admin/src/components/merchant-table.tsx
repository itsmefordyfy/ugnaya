import Link from 'next/link';
import { EmptyState } from '@ugnaya/web-ui';
import { formatCount, daysSince } from '@/lib/format';
import { CATEGORY, MERCHANT_STATUS, PLAN_LABEL, statusLook } from '@/lib/labels';
import type { MerchantRow } from '@/lib/types';
import { DataTable, type Column } from './data-table';
import { LocalTime } from './local-time';
import { StatusBadge } from './status-badge';

/** The merchants list, as a directory (activity) or as the application queue (time waiting). */
export function MerchantTable({ rows, mode, emptyTitle, emptyBody }: { rows: MerchantRow[]; mode: 'directory' | 'queue'; emptyTitle: string; emptyBody: string }) {
  const columns: Column<MerchantRow>[] = [
    { header: 'Business', primary: true, cell: (m) => <Link href={`/merchants/${m.id}`} className="link font-medium">{m.trade_name}</Link> },
    { header: 'Category', cell: (m) => CATEGORY[m.category] ?? m.category },
    { header: 'City', cell: (m) => m.city ?? '—' },
    { header: 'Status', cell: (m) => <StatusBadge look={statusLook(MERCHANT_STATUS, m.status)} /> },
    { header: 'Plan', cell: (m) => (m.plan ? `${PLAN_LABEL[m.plan] ?? m.plan}${m.founding ? ' · founding' : ''}` : '—') },
    ...(mode === 'directory'
      ? [
          { header: 'Branches', align: 'right', cell: (m) => <span className="tabular">{formatCount(m.branches)}</span> },
          { header: 'Txns (30 d)', align: 'right', cell: (m) => <span className="tabular">{formatCount(m.transactions_30d)}</span> },
          { header: 'Joined', cell: (m) => <LocalTime iso={m.created_at} mode="date" /> },
        ] satisfies Column<MerchantRow>[]
      : [
          { header: 'Registered', cell: (m) => <LocalTime iso={m.created_at} mode="date" /> },
          { header: 'Waiting', align: 'right', cell: (m) => { const d = daysSince(m.created_at); return <span className={`tabular ${d >= 3 ? 'font-semibold text-warning-text' : ''}`}>{d === 0 ? 'Today' : `${d} day${d === 1 ? '' : 's'}`}</span>; } },
        ] satisfies Column<MerchantRow>[]),
  ];
  return <DataTable caption="Merchants" columns={columns} rows={rows} rowKey={(m) => m.id} empty={<EmptyState title={emptyTitle} body={emptyBody} />} />;
}
