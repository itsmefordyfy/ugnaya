import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Badge, Skeleton } from '@ugnaya/web-ui';
import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';
import { ActionDialog } from '@/components/action-dialog';
import { ReasonField } from '@/components/fields';
import { LocalTime } from '@/components/local-time';
import { PageHeader } from '@/components/page-header';
import { ROLE_LABEL } from '@/lib/labels';
import { revokeInvite } from './actions';
import { InviteAdmin } from './_components/invite-admin';
import { MemberActions } from './_components/member-actions';

export const metadata: Metadata = { title: 'Team' };

export default function TeamPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Members />
    </Suspense>
  );
}

async function Members() {
  const admin = await requireAdmin('admins.manage');
  const supabase = await createClient();
  const [{ data, error }, invites] = await Promise.all([
    supabase.rpc('admin_list_members'),
    supabase.rpc('admin_list_invites'),
  ]);
  if (error) throw new Error(error.message);
  const open = (invites.data ?? []) as { id: string; email: string; role: string; expires_at: string; invited_by: string | null }[];
  return (
    <>
      <PageHeader title="Team"
        description="Administrators and what each may do. There is no public registration: a super admin invites an existing account with a single-use link, and that person must set up an authenticator app before they can do anything."
        actions={
          <InviteAdmin />
        } />
      {open.length > 0 && (
        <section className="mb-6" aria-labelledby="open-invites">
          <h2 id="open-invites" className="mb-2 font-sans text-lg font-semibold">Open invitations</h2>
          <ul className="divide-y divide-divider overflow-hidden rounded-lg border border-border bg-card">
            {open.map((i) => (
              <li key={i.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium">{i.email}</p>
                  <p className="mt-1 text-sm text-ink-muted">{ROLE_LABEL[i.role] ?? i.role} · expires <LocalTime iso={i.expires_at} /></p>
                </div>
                <ActionDialog action={revokeInvite} hidden={{ inviteId: i.id }} triggerLabel="Cancel invitation" title={`Cancel the invitation for ${i.email}?`}
                  description="The link stops working immediately." submitLabel="Cancel invitation" pendingLabel="Cancelling…" successMessage="Invitation cancelled" danger>
                  <ReasonField />
                </ActionDialog>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ul className="divide-y divide-divider overflow-hidden rounded-lg border border-border bg-card">
        {data.map((m) => (
          <li key={m.user_id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium">{m.email}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                <Badge tone="accent">{m.role.replace('_', ' ')}</Badge>
                {m.active ? <Badge tone="success" icon="check_circle">Active</Badge> : <Badge tone="danger" icon="error">Revoked</Badge>}
              </p>
            </div>
            {m.active && <MemberActions userId={m.user_id} email={m.email} role={m.role} isSelf={m.user_id === admin.id} />}
          </li>
        ))}
      </ul>
    </>
  );
}
