import 'server-only';
import { requireAdmin } from './admin';
import { exportFileName, toCsv, type CsvColumn } from './csv';
import { todayUtc } from './date-range';
import { requestContext } from './request-context';
import { callAdmin, failureText } from './rpc';
import type { Paged } from './types';

export const EXPORT_PAGE = 1000;
export const EXPORT_MAX_ROWS = 20_000;

type Fetch<T> = (limit: number, offset: number) => ReturnType<typeof callAdmin<Paged<T>>>;

const plain = (status: number, body: string) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });

/**
 * A CSV download. Needs reports.export or finance.export on top of the list's own permission (checked by its
 * function). Reads the list a page of 1,000 at a time, at most 20,000 rows, and records the export in the audit log
 * BEFORE any data leaves: if the audit row can't be written, nothing is sent.
 */
export async function csvExport<T>(what: 'merchants' | 'transactions' | 'subscriptions', fetchPage: Fetch<T>, columns: CsvColumn<T>[]): Promise<Response> {
  const admin = await requireAdmin();
  if (!admin.permissions.includes('reports.export') && !admin.permissions.includes('finance.export')) return plain(404, 'Not found');

  const rows: T[] = [];
  let total = 0;
  for (let offset = 0; offset < EXPORT_MAX_ROWS; offset += EXPORT_PAGE) {
    const page = await fetchPage(Math.min(EXPORT_PAGE, EXPORT_MAX_ROWS - offset), offset);
    if (!page.ok) return plain(page.message === 'forbidden' ? 403 : 500, failureText(page));
    total = page.data.total;
    rows.push(...page.data.rows);
    if (page.data.rows.length < EXPORT_PAGE || rows.length >= total) break;
  }

  const recorded = await callAdmin<null>('admin_record_export', { p_what: what, p_rows: rows.length, p_context: await requestContext() });
  if (!recorded.ok) return plain(recorded.message === 'forbidden' ? 403 : 500, `The export couldn’t be recorded in the audit log, so it wasn’t sent. ${failureText(recorded)}`);

  return new Response(toCsv(columns, rows), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFileName(what, todayUtc())}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      // Tells a script or a careful reader that the file stopped at the row limit.
      'X-Export-Rows': String(rows.length),
      'X-Export-Total': String(total),
      'X-Export-Truncated': String(total > rows.length),
    },
  });
}
