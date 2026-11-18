import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EmptyState, Skeleton } from '@ugnaya/web-ui';
import { DataTable } from '@/components/data-table';
import { DateFilter, FilterBar, Pagination, SelectFilter } from '@/components/list-controls';
import { LocalTime } from '@/components/local-time';
import { PageHeader } from '@/components/page-header';
import { requireAdmin } from '@/lib/admin';
import { dayBounds, parseDay } from '@/lib/date-range';
import { isUuid, likePrefix, param, parsePage } from '@/lib/paging';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Audit log' };
const PAGE_SIZE = 50;

// Common action prefixes, offered as suggestions. Any prefix can be typed.
const PREFIXES = ['admin.', 'merchant.', 'user.', 'points.', 'fraud_flag.', 'subscription.', 'setting.', 'plan.', 'announcement.', 'note.', 'export.', 'document.'];

export default function AuditPage({ searchParams }: PageProps<'/audit'>) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Entries searchParams={searchParams} />
    </Suspense>
  );
}

async function Entries({ searchParams }: Pick<PageProps<'/audit'>, 'searchParams'>) {
  const admin = await requireAdmin('audit.view');
  const params = await searchParams;
  const page = parsePage(param(params, 'page'));
  // `scope=admin` is the old "Admin actions" link; it means the admin. prefix.
  const action = (param(params, 'action') || (param(params, 'scope') === 'admin' ? 'admin.' : '')).slice(0, 60);
  const actorParam = param(params, 'actor');
  const actor = isUuid(actorParam) ? actorParam : '';
  const from = parseDay(param(params, 'from')) ?? '';
  const to = parseDay(param(params, 'to')) ?? '';
  const current = { action, actor, from, to };
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  // Administrators by id, for the actor filter and names in the list (the team list needs admins.manage).
  const members = admin.permissions.includes('admins.manage') ? (await supabase.rpc('admin_list_members')).data ?? [] : [];
  const emailOf = new Map(members.map((m) => [m.user_id, m.email]));

  const { since, until } = dayBounds(from, to);
  let query = supabase.from('audit_logs').select('id, created_at, actor_user_id, actor_role, action, entity_table, entity_id, reason, ip, request_id', { count: 'exact' })
    .order('id', { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
  if (action) query = query.like('action', likePrefix(action));
  if (actor) query = query.eq('actor_user_id', actor);
  if (since) query = query.gte('created_at', since);
  if (until) query = query.lt('created_at', until);
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  type Entry = (typeof data)[number];

  return (
    <>
      <PageHeader title="Audit log" description="Every sensitive action, newest first. The log is append-only: nobody, including administrators, can edit or delete an entry. Dates filter by UTC day; times show in your time zone." />
      <FilterBar path="/audit" clearHref="/audit">
        <label className="block text-xs font-medium text-ink-muted">
          Action starts with
          <input name="action" list="audit-prefixes" defaultValue={action} maxLength={60} placeholder="e.g. merchant."
            className="mt-1 block min-h-11 w-full rounded-md border border-border-strong bg-card px-3 font-mono text-sm text-ink md:w-48" />
          <datalist id="audit-prefixes">{PREFIXES.map((p) => <option key={p} value={p} />)}</datalist>
        </label>
        {members.length > 0 ? (
          <SelectFilter name="actor" label="Administrator" value={actor}
            options={[{ value: '', label: 'Anyone' }, ...members.map((m) => ({ value: m.user_id, label: `${m.email}${m.active ? '' : ' (revoked)'}` }))]} />
        ) : (
          <label className="block text-xs font-medium text-ink-muted">Actor user id
            <input name="actor" defaultValue={actor} className="mt-1 block min-h-11 w-full rounded-md border border-border-strong bg-card px-3 font-mono text-sm text-ink md:w-72" />
          </label>
        )}
        <DateFilter name="from" label="From (UTC day)" value={from} />
        <DateFilter name="to" label="To (UTC day)" value={to} />
      </FilterBar>
      <DataTable<Entry> caption="Audit log entries" rows={data} rowKey={(e) => e.id}
        empty={<EmptyState title="No entries" body={Object.values(current).some(Boolean) ? 'Nothing matches these filters.' : 'Actions appear here as they happen.'} />}
        columns={[
          { header: 'When', primary: true, cell: (e) => <LocalTime iso={e.created_at} /> },
          { header: 'Action', cell: (e) => <span className="font-mono text-xs">{e.action}</span> },
          { header: 'Target', cell: (e) => <span className="break-all text-xs">{e.entity_table ?? '—'}{e.entity_id ? ` · ${e.entity_id}` : ''}</span> },
          { header: 'Reason', cell: (e) => (e.reason ? <span className="line-clamp-3 whitespace-pre-wrap break-words" title={e.reason}>{e.reason}</span> : <span className="text-ink-muted">—</span>) },
          { header: 'Actor', cell: (e) => (
            <span className="text-xs">{(e.actor_user_id && emailOf.get(e.actor_user_id)) ?? e.actor_role ?? '—'}
              {e.actor_user_id && emailOf.has(e.actor_user_id) && <span className="block text-ink-muted">{e.actor_role}</span>}</span>
          ) },
          { header: 'IP · request', cell: (e) => <span className="break-all font-mono text-[11px] text-ink-muted">{e.ip ?? '—'}{e.request_id ? <><br />{e.request_id}</> : null}</span> },
        ]} />
      <Pagination path="/audit" params={current} page={page} total={count ?? 0} size={PAGE_SIZE} />
    </>
  );
}
