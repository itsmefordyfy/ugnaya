import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Badge, EmptyState, Icon, Skeleton } from '@ugnaya/web-ui';
import { DataTable } from '@/components/data-table';
import { FilterBar, Pagination, Tabs } from '@/components/list-controls';
import { LocalTime } from '@/components/local-time';
import { PageHeader } from '@/components/page-header';
import { RpcProblem } from '@/components/rpc-problem';
import { requireAdmin } from '@/lib/admin';
import { PAGE_SIZE, hrefWith, oneOf, pageOffset, param, parsePage } from '@/lib/paging';
import { callAdmin } from '@/lib/rpc';
import type { UserList } from '@/lib/types';

export const metadata: Metadata = { title: 'Users' };

const KINDS = [
  { value: '', label: 'All' },
  { value: 'customer', label: 'Customers' },
  { value: 'merchant_staff', label: 'Merchant staff' },
  { value: 'admin', label: 'Admins' },
] as const;

export default function UsersPage({ searchParams }: PageProps<'/users'>) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <List searchParams={searchParams} />
    </Suspense>
  );
}

async function List({ searchParams }: Pick<PageProps<'/users'>, 'searchParams'>) {
  await requireAdmin('users.view');
  const params = await searchParams;
  const kind = oneOf(param(params, 'kind'), KINDS.map((k) => k.value), '');
  const q = param(params, 'q');
  const page = parsePage(param(params, 'page'));
  const current = { kind, q };
  const list = await callAdmin<UserList>('admin_list_users', { p_kind: kind || undefined, p_search: q || undefined, p_limit: PAGE_SIZE, p_offset: pageOffset(page) });

  return (
    <>
      <PageHeader title="Users" description="Everyone with a sign-in: customers, business owners and staff, and administrators. Shared cashier devices are not people and aren’t listed." />
      <Tabs label="Kind of user" items={KINDS.map((k) => ({ label: k.label, href: hrefWith('/users', current, { kind: k.value || null }), active: k.value === kind }))} />
      <FilterBar path="/users" q={q} hidden={{ kind }} clearHref={hrefWith('/users', { kind })}
        placeholder={list.ok && list.data.pii ? 'Name, email, member ID or user id' : 'Name, member ID or user id'} />
      {!list.ok ? <RpcProblem failure={list} what="users" /> : (
        <>
          {!list.data.pii && (
            <p className="mb-3 flex items-center gap-2 text-xs text-ink-muted"><Icon name="visibility_off" size={16} />
              Email addresses are masked for your role (full addresses need users.view_pii), and search doesn’t match them.</p>
          )}
          <DataTable caption="Users" rows={list.data.rows} rowKey={(u) => u.id}
            empty={<EmptyState title={q ? 'No matching people' : 'Nobody here yet'} body={q ? 'Try another name or member ID.' : 'People appear here when they sign up.'} />}
            columns={[
              { header: 'Name', primary: true, cell: (u) => <Link className="link font-medium" href={`/users/${u.id}`}>{u.name || 'Unnamed'}</Link> },
              { header: 'Email', cell: (u) => <span className="break-all">{u.email ?? '—'}</span> },
              { header: 'Member ID', cell: (u) => <span className="font-mono text-xs">{u.member_id ?? '—'}</span> },
              { header: 'Roles', cell: (u) => (
                <span className="flex flex-wrap justify-end gap-1 md:justify-start">
                  {u.is_customer && <Badge>Customer</Badge>}{u.is_staff && <Badge tone="info">Staff</Badge>}{u.is_admin && <Badge tone="accent">Admin</Badge>}
                  {!u.is_customer && !u.is_staff && !u.is_admin && <span className="text-ink-muted">—</span>}
                </span>
              ) },
              { header: 'Joined', cell: (u) => <LocalTime iso={u.created_at} mode="date" /> },
              { header: 'Last sign-in', cell: (u) => <LocalTime iso={u.last_sign_in_at} /> },
              { header: 'Status', cell: (u) => (u.suspended ? <Badge tone="danger" icon="block">Suspended</Badge> : <Badge tone="success" icon="check_circle">Active</Badge>) },
            ]} />
          <Pagination path="/users" params={current} page={page} total={list.data.total} size={PAGE_SIZE} />
        </>
      )}
    </>
  );
}
