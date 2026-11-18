import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Icon, Skeleton, buttonClasses, type IconName } from '@ugnaya/web-ui';
import { PageHeader } from '@/components/page-header';
import { requireAdmin } from '@/lib/admin';
import { EXPORT_MAX_ROWS } from '@/lib/export';

export const metadata: Metadata = { title: 'Reports & exports' };

export default function ReportsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Content />
    </Suspense>
  );
}

const EXPORTS: { what: string; title: string; body: string; icon: IconName; list: string; needs: string }[] = [
  { what: 'merchants', title: 'Merchants', body: 'Every business with category, city, status, plan, branches and 30-day transactions.', icon: 'storefront', list: '/merchants', needs: 'merchants.view' },
  { what: 'transactions', title: 'Transactions', body: 'Awards, redemptions, voids and adjustments, with amounts in centavos and points in their own column.', icon: 'receipt_long', list: '/transactions', needs: 'transactions.view' },
  { what: 'subscriptions', title: 'Subscriptions', body: 'Each business’s plan, status, founding terms and list price (not money collected).', icon: 'workspace_premium', list: '/subscriptions', needs: 'subscriptions.view' },
];

async function Content() {
  const admin = await requireAdmin();
  const can = (p: string) => admin.permissions.includes(p);
  if (!can('reports.view') && !can('reports.export') && !can('finance.export')) {
    notFound();
  }
  const canExport = can('reports.export') || can('finance.export');
  return (
    <>
      <PageHeader title="Reports & exports"
        description={`CSV files of the lists in the portal. Every export is recorded in the audit log (who, what, how many rows). Files hold at most ${EXPORT_MAX_ROWS.toLocaleString('en-US')} rows; times are UTC. To export a filtered list, filter it on its page and use Export CSV there.`} />
      {!canExport && (
        <p className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-surface p-3 text-sm text-ink-muted">
          <Icon name="lock" size={18} /> Your role can view reports but not export them (that needs reports.export or finance.export).
        </p>
      )}
      <ul className="grid gap-3 md:grid-cols-3">
        {EXPORTS.map((e) => (
          <li key={e.what} className="flex flex-col rounded-lg border border-border bg-card p-4">
            <p className="flex items-center gap-2 font-sans font-semibold"><Icon name={e.icon} size={20} />{e.title}</p>
            <p className="mt-1 flex-1 text-sm text-ink-muted">{e.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {canExport && can(e.needs) ? (
                <a href={`/export/${e.what}`} download className={buttonClasses('primary')}><Icon name="download" size={18} />Download CSV</a>
              ) : (
                <span className="text-xs text-ink-muted">{canExport ? `Needs ${e.needs} to read this list.` : 'Export not included in your role.'}</span>
              )}
              {can(e.needs) && <Link href={e.list} className={buttonClasses('secondary')}>Open list</Link>}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-ink-muted">Spreadsheet safety: text that starts with =, +, − or @ is prefixed with an apostrophe so it can’t run as a formula.</p>
    </>
  );
}
