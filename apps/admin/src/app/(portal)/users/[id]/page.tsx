import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Badge, Skeleton } from '@ugnaya/web-ui';
import { setUserSuspended } from '@/actions/users';
import { ActionDialog } from '@/components/action-dialog';
import { DataTable } from '@/components/data-table';
import { ReasonField } from '@/components/fields';
import { LocalTime } from '@/components/local-time';
import { NotesPanel } from '@/components/notes-panel';
import { DetailList, PageHeader, Section } from '@/components/page-header';
import { RpcProblem } from '@/components/rpc-problem';
import { StatusBadge } from '@/components/status-badge';
import { requireAdmin } from '@/lib/admin';
import { formatPeso, formatPoints } from '@/lib/format';
import { ROLE_LABEL, TRANSACTION_STATUS, TRANSACTION_TYPE, statusLook } from '@/lib/labels';
import { isUuid } from '@/lib/paging';
import { callAdmin } from '@/lib/rpc';
import type { UserDetail } from '@/lib/types';

export const metadata: Metadata = { title: 'User' };

export default function UserPage({ params }: PageProps<'/users/[id]'>) {
  return (
    <Suspense fallback={<Skeleton className="h-[32rem] w-full" />}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: Pick<PageProps<'/users/[id]'>, 'params'>) {
  const admin = await requireAdmin('users.view');
  const can = (p: string) => admin.permissions.includes(p);
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const detail = await callAdmin<UserDetail>('admin_user_detail', { p_user_id: id });
  if (!detail.ok) {
    if (detail.message === 'user_not_found') notFound();
    return <><PageHeader title="User" back={{ href: '/users', label: 'Users' }} /><RpcProblem failure={detail} what="this person" /></>;
  }
  const d = detail.data;
  const u = d.user;
  const name = u.name || d.customer?.display_name || 'Unnamed';
  // The database refuses suspending yourself or an administrator; the button isn't offered either.
  const canSuspend = can('users.suspend') && !d.admin_role && u.id !== admin.id;

  return (
    <>
      <PageHeader title={name} back={{ href: '/users', label: 'Users' }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {u.suspended ? <Badge tone="danger" icon="block">Suspended</Badge> : <Badge tone="success" icon="check_circle">Active</Badge>}
            {d.customer && <Badge>Customer</Badge>}
            {d.memberships.length > 0 && <Badge tone="info">Merchant staff</Badge>}
            {d.admin_role && <Badge tone="accent">{ROLE_LABEL[d.admin_role] ?? d.admin_role}</Badge>}
          </span>
        }
        actions={canSuspend && (u.suspended ? (
          <ActionDialog action={setUserSuspended} hidden={{ userId: u.id, suspended: 'false' }} triggerVariant="primary" triggerIcon="how_to_reg"
            triggerLabel="Reactivate" title={`Reactivate ${name}?`} description="They can sign in again." submitLabel="Reactivate account"
            pendingLabel="Saving…" successMessage="Account reactivated"><ReasonField /></ActionDialog>
        ) : (
          <ActionDialog action={setUserSuspended} hidden={{ userId: u.id, suspended: 'true' }} triggerVariant="danger" triggerIcon="person_off" danger
            triggerLabel="Suspend" title={`Suspend ${name}?`}
            description="They are signed out everywhere and can’t sign in. A token already issued keeps working until it expires (at most an hour). Their points and history are kept."
            submitLabel="Suspend account" pendingLabel="Saving…" successMessage="Account suspended"><ReasonField /></ActionDialog>
        ))} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Section title="Account" description={d.pii ? undefined : 'Email, city and birthday are hidden or masked for your role (users.view_pii).'}>
            <DetailList items={[
              { label: 'Email', value: <span className="break-all">{u.email}</span> },
              { label: 'Email confirmed', value: u.email_confirmed_at ? <LocalTime iso={u.email_confirmed_at} /> : 'Not yet' },
              { label: 'Joined', value: <LocalTime iso={u.created_at} /> },
              { label: 'Last sign-in', value: <LocalTime iso={u.last_sign_in_at} /> },
              { label: 'User id', value: <span className="font-mono text-xs">{u.id}</span> },
            ]} />
          </Section>

          {d.customer && (
            <Section title="Customer profile">
              <DetailList items={[
                { label: 'Member ID', value: <span className="font-mono">{d.customer.member_id}</span> },
                { label: 'Display name', value: d.customer.display_name },
                { label: 'City', value: d.pii ? d.customer.city : 'Hidden' },
                { label: 'Birthday', value: d.pii ? d.customer.birthday : 'Hidden' },
                { label: 'Marketing consent', value: d.customer.marketing_consent_at ? <LocalTime iso={d.customer.marketing_consent_at} /> : 'No' },
                { label: 'Deleted', value: d.customer.deleted_at ? <LocalTime iso={d.customer.deleted_at} /> : 'No' },
              ]} />
            </Section>
          )}

          <Section title="Recent transactions" description="The latest 20.">
            <DataTable caption="Recent transactions" rows={d.transactions} rowKey={(t) => t.id}
              empty={<p className="p-4 text-sm text-ink-muted">No transactions.</p>}
              columns={[
                { header: 'When', primary: true, cell: (t) => <LocalTime iso={t.created_at} /> },
                { header: 'Merchant', cell: (t) => t.merchant },
                { header: 'Type', cell: (t) => TRANSACTION_TYPE[t.type] ?? t.type },
                { header: 'Amount', align: 'right', cell: (t) => <span className="tabular">{formatPeso(t.amount_centavos)}</span> },
                { header: 'Points', align: 'right', cell: (t) => <span className="tabular">{formatPoints(t.points, { signed: true })}</span> },
                { header: 'Status', cell: (t) => <StatusBadge look={statusLook(TRANSACTION_STATUS, t.status)} /> },
              ]} />
          </Section>

          <NotesPanel entityType="user" entityId={u.id} canWrite={can('notes.write')} />
        </div>

        <div className="space-y-6">
          <Section title="Points balances" description="Points, never money.">
            {d.accounts.length === 0 ? <p className="text-sm text-ink-muted">No loyalty accounts.</p> : (
              <ul className="divide-y divide-divider text-sm">
                {d.accounts.map((a, i) => (
                  <li key={`${a.program}-${i}`} className="py-2">
                    <p className="flex justify-between gap-2"><span className="truncate font-medium">{a.merchant ?? a.program}</span><span className="tabular">{formatPoints(a.balance)}</span></p>
                    <p className="text-xs text-ink-muted">{a.scope === 'network' ? 'Network' : 'Merchant'} · {formatPoints(a.lifetime_earned)} earned · last <LocalTime iso={a.last_activity_at} mode="date" /></p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="Businesses">
            {d.memberships.length === 0 ? <p className="text-sm text-ink-muted">Not staff at any business.</p> : (
              <ul className="divide-y divide-divider text-sm">
                {d.memberships.map((m) => (
                  <li key={m.merchant_id} className="flex items-center justify-between gap-2 py-2">
                    {can('merchants.view') ? <Link className="link truncate" href={`/merchants/${m.merchant_id}`}>{m.trade_name}</Link> : <span className="truncate">{m.trade_name}</span>}
                    <span className="flex gap-1"><Badge>{m.role}</Badge>{!m.active && <Badge tone="danger">Inactive</Badge>}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
