import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, buttonClasses } from '@ugnaya/web-ui';
import { hrefWith, lastPage } from '@/lib/paging';

/** Filters as a plain GET form: they work without JavaScript and every state is a shareable URL. */
export function FilterBar({ path, q, placeholder, hidden, children, clearHref }: {
  path: string; q?: string; placeholder?: string; hidden?: Record<string, string>; children?: ReactNode; clearHref?: string;
}) {
  return (
    <form method="get" action={path} role="search" className="mb-4 flex flex-col gap-3 rounded-lg border border-border bg-card p-3 md:flex-row md:flex-wrap md:items-end">
      {hidden && Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      {placeholder !== undefined && (
        <label className="block min-w-0 flex-1 text-xs font-medium text-ink-muted md:min-w-64">
          Search
          <span className="relative mt-1 block">
            <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input type="search" name="q" defaultValue={q} placeholder={placeholder} maxLength={120}
              className="block min-h-11 w-full rounded-md border border-border-strong bg-card py-2 pl-9 pr-3 text-sm text-ink" />
          </span>
        </label>
      )}
      {children}
      <div className="flex gap-2">
        <button type="submit" className={buttonClasses('primary')}>Apply</button>
        {clearHref && <Link href={clearHref} className={buttonClasses('secondary')}>Clear</Link>}
      </div>
    </form>
  );
}

export function SelectFilter({ name, label, value, options }: {
  name: string; label: string; value: string; options: { value: string; label: string }[];
}) {
  return (
    <label className="block text-xs font-medium text-ink-muted">
      {label}
      <select name={name} defaultValue={value} className="mt-1 block min-h-11 w-full rounded-md border border-border-strong bg-card px-3 text-sm text-ink md:w-auto">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function DateFilter({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <label className="block text-xs font-medium text-ink-muted">
      {label}
      <input type="date" name={name} defaultValue={value} className="mt-1 block min-h-11 w-full rounded-md border border-border-strong bg-card px-3 text-sm text-ink md:w-auto" />
    </label>
  );
}

export type TabItem = { label: string; href: string; active: boolean; count?: number | null };

/** Link tabs (each one a URL). Scrolls sideways on a phone instead of wrapping. */
export function Tabs({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <nav aria-label={label} className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-border">
        {items.map((t) => (
          <li key={t.href}>
            <Link href={t.href} aria-current={t.active ? 'page' : undefined}
              className={`-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium ${t.active ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink'}`}>
              {t.label}
              {t.count !== undefined && t.count !== null && (
                <span className="tabular rounded-pill bg-primary-soft px-2 py-0.5 text-xs text-primary">{t.count}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Pagination({ path, params, page, total, size }: {
  path: string; params: Record<string, string>; page: number; total: number; size: number;
}) {
  const last = lastPage(total, size);
  const first = total === 0 ? 0 : (page - 1) * size + 1;
  const end = Math.min(total, page * size);
  return (
    <nav aria-label="Pages" className="mt-4 flex flex-col items-center justify-between gap-2 text-sm sm:flex-row">
      <p className="tabular text-ink-muted">{total === 0 ? 'No results' : `Showing ${first.toLocaleString('en-US')}–${end.toLocaleString('en-US')} of ${total.toLocaleString('en-US')}`}</p>
      <div className="flex items-center gap-2">
        {page > 1
          ? <Link className={buttonClasses('secondary')} href={hrefWith(path, params, { page: page - 1 })}><Icon name="chevron_left" size={18} />Previous</Link>
          : <span className={`${buttonClasses('secondary')} pointer-events-none opacity-50`} aria-disabled="true"><Icon name="chevron_left" size={18} />Previous</span>}
        <span className="tabular px-2 text-ink-muted">Page {page} of {last}</span>
        {page < last
          ? <Link className={buttonClasses('secondary')} href={hrefWith(path, params, { page: page + 1 })}>Next<Icon name="chevron_right" size={18} /></Link>
          : <span className={`${buttonClasses('secondary')} pointer-events-none opacity-50`} aria-disabled="true">Next<Icon name="chevron_right" size={18} /></span>}
      </div>
    </nav>
  );
}
