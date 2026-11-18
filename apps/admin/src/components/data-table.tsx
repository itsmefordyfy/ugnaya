import type { ReactNode } from 'react';

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  /** The column that names the row: on a phone it heads the card without a label. */
  primary?: boolean;
  className?: string;
};

export type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  caption: string;
  empty: ReactNode;
};

/**
 * A dense table from 768 px; below it each row becomes a stacked card with labelled values. One markup for both, so
 * nothing is fetched or rendered twice. The rows are one page from the database (never the whole table).
 */
export function DataTable<T>({ columns, rows, rowKey, caption, empty }: DataTableProps<T>) {
  if (rows.length === 0) return <div className="rounded-lg border border-border bg-card">{empty}</div>;
  return (
    <div className="md:overflow-x-auto md:rounded-lg md:border md:border-border md:bg-card">
      <table className="w-full text-sm max-md:block">
        <caption className="sr-only">{caption}</caption>
        <thead className="max-md:sr-only">
          <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-ink-muted">
            {columns.map((c) => (
              <th key={c.header} scope="col" className={`whitespace-nowrap px-3 py-2.5 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="max-md:block max-md:space-y-3">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-divider last:border-b-0 hover:bg-surface max-md:block max-md:rounded-lg max-md:border max-md:border-border max-md:bg-card max-md:p-3">
              {columns.map((c) => (
                <td key={c.header} className={`px-3 py-2.5 align-top max-md:flex max-md:items-start max-md:justify-between max-md:gap-4 max-md:px-0 max-md:py-1 ${c.align === 'right' ? 'md:text-right' : ''} ${c.primary ? 'max-md:pb-2 max-md:text-base max-md:font-semibold' : ''} ${c.className ?? ''}`}>
                  {!c.primary && <span className="shrink-0 text-xs text-ink-muted md:hidden">{c.header}</span>}
                  <span className="min-w-0 max-md:text-right md:contents">{c.cell(row)}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
