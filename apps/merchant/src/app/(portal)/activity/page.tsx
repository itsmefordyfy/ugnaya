import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EmptyState, Skeleton } from '@ugnaya/web-ui';
import { DataError } from '@/components/data-error';
import { PageHeader } from '@/components/page-header';
import { Pagination, offsetFrom } from '@/components/pagination';
import { actionLabel, actorLabel, changeSummary } from '@/lib/activity';
import { requireStaff } from '@/lib/auth/guard';
import { friendlyError } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Activity log' };

const LIMIT = 25;

export default function ActivityPage({ searchParams }: PageProps<'/activity'>) {
  return (
    <>
      <PageHeader
        title="Activity log"
        description="A permanent record of what happened in your business on UGNAYA: your team’s changes, points at the counter and UGNAYA’s decisions. Entries can’t be edited or deleted."
      />
      <Suspense fallback={<ActivitySkeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Content({ searchParams }: Pick<PageProps<'/activity'>, 'searchParams'>) {
  const params = await searchParams;
  const ctx = await requireStaff('activity');
  const offset = offsetFrom(params.offset);
  const supabase = await createClient();
  // Owners and managers read their business's entries (row-level security on audit_logs).
  const { data, error, count } = await supabase
    .from('audit_logs')
    .select('id, created_at, action, actor_role, entity_table, entity_id, reason, before, after', { count: 'exact' })
    .eq('merchant_id', ctx.merchant.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + LIMIT - 1);

  if (error) return <DataError message={friendlyError(error)} />;
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <EmptyState title="Nothing recorded yet" body="Registering, documents, staff changes, points and UGNAYA’s review steps are recorded here as they happen." />
      </div>
    );
  }

  return (
    <>
      <ol className="overflow-hidden rounded-lg border border-border bg-card">
        {data.map((row) => {
          const summary = changeSummary(row.action, row.before, row.after);
          const team = row.actor_role?.startsWith('admin:');
          return (
            <li key={row.id} className="flex flex-col gap-1 border-b border-divider px-4 py-4 last:border-0 sm:flex-row sm:gap-6 sm:px-6">
              <time dateTime={row.created_at} className="shrink-0 text-sm text-ink-muted tabular sm:w-44">{formatDateTime(row.created_at)}</time>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{actionLabel(row.action)}</p>
                {summary && <p className="mt-0.5 text-sm text-ink-muted">{summary}</p>}
                {row.reason && (
                  <p className="mt-1 whitespace-pre-line text-sm">
                    <span className="font-medium">{team ? 'UGNAYA’s note: ' : 'Note: '}</span>{row.reason}
                  </p>
                )}
              </div>
              <p className="shrink-0 text-sm text-ink-muted sm:w-32 sm:text-right">{actorLabel(row.actor_role)}</p>
            </li>
          );
        })}
      </ol>
      <Pagination total={count ?? data.length} limit={LIMIT} offset={offset} basePath="/activity" />
    </>
  );
}

function ActivitySkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-2 rounded-lg border border-border bg-card p-4">
      {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );
}
