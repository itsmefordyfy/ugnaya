import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { Badge, EmptyState, Skeleton, type BadgeProps } from '@ugnaya/web-ui';
import { DataError } from '@/components/data-error';
import { LockedNotice } from '@/components/locked-notice';
import { PageHeader, Panel } from '@/components/page-header';
import { canInviteStaff, roleLabel } from '@/lib/auth/access';
import { requireStaff } from '@/lib/auth/guard';
import { friendlyError } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { canRevokeInvite, editRules, INVITE_STATE_LABEL, inviteRoleOptions, inviteState, type InviteState } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';
import { CashierDialog } from './_components/cashier-dialog';
import { EditStaffDialog } from './_components/edit-staff-dialog';
import { InviteDialog } from './_components/invite-dialog';
import { RevokeInviteButton } from './_components/revoke-invite-button';

export const metadata: Metadata = { title: 'Staff' };

export default function StaffPage() {
  return (
    <Suspense fallback={<StaffSkeleton />}>
      <StaffContent />
    </Suspense>
  );
}

const STATE_TONE: Record<InviteState, BadgeProps['tone']> = { open: 'info', accepted: 'success', revoked: 'neutral', expired: 'warning' };
const STATE_ICON: Record<InviteState, NonNullable<BadgeProps['icon']>> = { open: 'schedule', accepted: 'check_circle', revoked: 'cancel', expired: 'timer' };

async function StaffContent() {
  const ctx = await requireStaff('staff');
  const supabase = await createClient();
  const [staff, branches, invites] = await Promise.all([
    supabase.from('merchant_staff').select('id, user_id, display_name, role, branch_ids, active, created_at')
      .eq('merchant_id', ctx.merchant.id).order('created_at'),
    supabase.from('merchant_branches').select('id, name, active').eq('merchant_id', ctx.merchant.id).order('created_at'),
    supabase.from('merchant_staff_invites').select('id, email, display_name, role, branch_ids, expires_at, accepted_at, revoked_at, created_at')
      .eq('merchant_id', ctx.merchant.id).order('created_at', { ascending: false }).limit(25),
  ]);

  const header = (actions?: ReactNode) => (
    <PageHeader title="Staff" description="Who works at your business, what they can do, and the branches they cover." actions={actions} />
  );
  const error = staff.error ?? branches.error;
  if (error) return <>{header()}<DataError message={friendlyError(error)} /></>;

  const branchList = branches.data ?? [];
  const branchName = new Map(branchList.map((b) => [b.id, b.name]));
  const inviteRoles = inviteRoleOptions(ctx.role);
  const invitesOpen = canInviteStaff(ctx.merchant.status);
  const caller = { role: ctx.role, userId: ctx.viewer.id };
  // Active people first, then by role, then by when they joined.
  const order = { owner: 0, manager: 1, cashier: 2 } as const;
  const people = [...(staff.data ?? [])].sort((a, b) => Number(b.active) - Number(a.active) || order[a.role] - order[b.role]);
  const branchesText = (ids: string[] | null) =>
    ids && ids.length > 0 ? ids.map((id) => branchName.get(id) ?? 'Removed branch').join(', ') : 'All branches';

  return (
    <>
      {header(
        <>
          {invitesOpen && inviteRoles.length > 0 && <InviteDialog roles={inviteRoles} branches={branchList} />}
          <CashierDialog branches={branchList} />
        </>,
      )}

      <div className="space-y-8">
        <Panel id="team" title="Team" description="Roles: the owner runs everything; managers run the business (a branch manager only their branches); cashiers work the counter.">
          {people.length === 0 ? (
            <EmptyState title="No staff yet" body="Invite a manager or cashier, or add a cashier with a PIN for the counter tablet." />
          ) : (
            <ul className="-my-3 divide-y divide-divider">
              {people.map((p) => {
                const rules = editRules(caller, { role: p.role, userId: p.user_id });
                const isYou = p.user_id === ctx.viewer.id;
                return (
                  <li key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {p.display_name}
                        {isYou && <span className="text-sm font-normal text-ink-muted">(you)</span>}
                      </p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {p.role === 'owner' ? 'Whole business' : branchesText(p.branch_ids)}
                        {' · '}
                        {p.user_id ? 'Own sign-in' : 'PIN only (counter tablet)'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={p.role === 'owner' ? 'accent' : 'neutral'} icon={p.role === 'cashier' ? 'point_of_sale' : p.role === 'owner' ? 'workspace_premium' : 'manage_accounts'}>
                        {roleLabel(p.role, p.branch_ids)}
                      </Badge>
                      {!p.active && <Badge tone="warning" icon="pause_circle">Off</Badge>}
                      {rules.canEdit && (
                        <EditStaffDialog
                          person={{ id: p.id, displayName: p.display_name, role: p.role, branchIds: p.branch_ids, active: p.active, hasLogin: Boolean(p.user_id) }}
                          rules={rules}
                          branches={branchList}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel id="invitations" title="Invitations" description="Links you’ve created for people to join with their own sign-in. Each works once and expires after 7 days.">
          {!invitesOpen ? (
            <LockedNotice feature="Staff invitations" status={ctx.merchant.status}>
              You can still add cashiers with a PIN for the counter tablet now.
            </LockedNotice>
          ) : invites.error ? (
            <DataError message={friendlyError(invites.error)} />
          ) : (invites.data ?? []).length === 0 ? (
            <EmptyState title="No invitations yet" body="Invite a manager or cashier: you’ll get a link to send them, and they join with their own email."
              action={inviteRoles.length > 0 ? <InviteDialog roles={inviteRoles} branches={branchList} /> : undefined} />
          ) : (
            <ul className="-my-3 divide-y divide-divider">
              {(invites.data ?? []).map((inv) => {
                const state = inviteState(inv);
                return (
                  <li key={inv.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{inv.display_name}</p>
                      <p className="mt-1 break-all text-sm text-ink-muted">{inv.email}</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {roleLabel(inv.role, inv.branch_ids)} · {branchesText(inv.branch_ids)} ·{' '}
                        <span className="tabular">{state === 'open' ? `expires ${formatDate(inv.expires_at)}` : `sent ${formatDate(inv.created_at)}`}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={STATE_TONE[state]} icon={STATE_ICON[state]}>{INVITE_STATE_LABEL[state]}</Badge>
                      {canRevokeInvite(ctx.role, inv, state) && <RevokeInviteButton inviteId={inv.id} email={inv.email} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function StaffSkeleton() {
  return (
    <div role="status" aria-label="Loading staff">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div className="space-y-3 rounded-lg border border-border bg-card p-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
