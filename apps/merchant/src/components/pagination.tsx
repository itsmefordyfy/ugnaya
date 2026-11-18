import Link from 'next/link';
import { Icon } from '@ugnaya/web-ui';
import { formatNumber } from '@/lib/format';

export type PaginationProps = {
  total: number;
  limit: number;
  offset: number;
  basePath: string;
  /** The current filters, kept on every page link. */
  params?: Record<string, string | undefined>;
};

/** "21–40 of 135" with previous and next links; filtering and paging happen in SQL. */
export function Pagination({ total, limit, offset, basePath, params = {} }: PaginationProps) {
  if (total <= limit && offset === 0) return null;
  const href = (nextOffset: number) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) query.set(k, v);
    if (nextOffset > 0) query.set('offset', String(nextOffset));
    const qs = query.toString();
    return `${basePath}${qs ? `?${qs}` : ''}`;
  };
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  const link = 'inline-flex min-h-11 items-center gap-1 rounded-pill border border-border-strong bg-card px-4 text-sm font-semibold text-primary hover:bg-primary-soft';
  const disabled = 'inline-flex min-h-11 items-center gap-1 rounded-pill border border-border px-4 text-sm font-semibold text-ink-disabled';
  return (
    <nav aria-label="Pages" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-muted tabular">{formatNumber(from)}–{formatNumber(to)} of {formatNumber(total)}</p>
      <div className="flex gap-2">
        {offset > 0 ? <Link href={href(Math.max(0, offset - limit))} className={link}><Icon name="chevron_left" size={20} />Previous</Link>
          : <span aria-disabled="true" className={disabled}><Icon name="chevron_left" size={20} />Previous</span>}
        {offset + limit < total ? <Link href={href(offset + limit)} className={link}>Next<Icon name="chevron_right" size={20} /></Link>
          : <span aria-disabled="true" className={disabled}>Next<Icon name="chevron_right" size={20} /></span>}
      </div>
    </nav>
  );
}

/** Reads ?offset= safely (a whole number, zero or more). */
export function offsetFrom(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}
