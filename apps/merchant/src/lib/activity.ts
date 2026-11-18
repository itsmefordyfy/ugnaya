/**
 * The activity log, in plain words. audit_logs rows are written by log_audit (staff and system actions, actor_role is
 * the Postgres role: 'authenticated' or 'service_role') and admin_log (UGNAYA's team, actor_role 'admin:<role>').
 * Pure, so it is tested.
 */
import { documentKindLabel } from './storage.ts';

const ACTIONS: Record<string, string> = {
  'merchant.registered': 'Business registered',
  'merchant.submitted': 'Application sent for review',
  'merchant.info_provided': 'Replied to UGNAYA’s question',
  'merchant.verified': 'Business verified',
  'merchant.start_review': 'UGNAYA started reviewing the application',
  'merchant.request_info': 'UGNAYA asked for more information',
  'merchant.approve': 'Business approved',
  'merchant.reject': 'Application rejected',
  'merchant.reopen': 'Application reopened',
  'merchant.suspend': 'Business suspended',
  'merchant.reactivate': 'Business reactivated',
  'document.added': 'Document uploaded',
  'document.removed': 'Document removed',
  'staff.added': 'Staff member added',
  'staff.updated': 'Staff member changed',
  'staff.invited': 'Staff member invited',
  'staff.invite_revoked': 'Invitation cancelled',
  'staff.invite_accepted': 'Invitation accepted',
  'staff.pin_set': 'Staff PIN changed',
  'points.awarded': 'Points awarded',
  'points.redeemed': 'Reward redeemed',
  'points.voided': 'Transaction voided',
  'points.expired': 'Points expired',
  'points.adjusted': 'Points adjusted by UGNAYA',
  'subscription.updated': 'Plan changed by UGNAYA',
};

/** "staff.invite_revoked" with no entry becomes "Staff: invite revoked". */
export function actionLabel(action: string): string {
  if (ACTIONS[action]) return ACTIONS[action];
  const [area, ...rest] = action.split('.');
  const what = rest.join(' ').replace(/[_.]+/g, ' ').trim();
  const nice = (area ?? '').replace(/_/g, ' ');
  const head = nice.charAt(0).toUpperCase() + nice.slice(1);
  return what ? `${head}: ${what}` : head || 'Activity';
}

/** Who did it, as a kind (never a raw Postgres role). */
export function actorLabel(actorRole: string | null | undefined): string {
  if (!actorRole) return 'System';
  if (actorRole.startsWith('admin:')) return 'UGNAYA team';
  if (actorRole === 'authenticated') return 'Your team';
  if (actorRole === 'service_role' || actorRole === 'postgres') return 'UGNAYA system';
  return 'System';
}

const STATUS: Record<string, string> = {
  draft: 'Draft', pending_verification: 'Pending review', under_review: 'Under review', info_required: 'Additional information required',
  rejected: 'Rejected', active: 'Approved', suspended: 'Suspended', closed: 'Closed',
};
const ROLE: Record<string, string> = { owner: 'Owner', manager: 'Manager', cashier: 'Cashier' };
const FIELD: Record<string, string> = {
  name: 'Name', role: 'Role', active: 'Active', status: 'Status', kind: 'Document', file_name: 'File', email: 'Email',
  trade_name: 'Business name', category: 'Category', city: 'City', plan: 'Plan', founding: 'Founding merchant',
  balance: 'Balance', has_login: 'Has a sign-in',
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null);

function show(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (key === 'status' && typeof value === 'string') return STATUS[value] ?? value;
  if (key === 'role' && typeof value === 'string') return ROLE[value] ?? value;
  if (key === 'kind' && typeof value === 'string') return documentKindLabel(value);
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number' || typeof value === 'string') return String(value).slice(0, 80);
  return null;
}

/**
 * A short readable summary of what changed: at most three "Field: value" parts, before → after where both exist. Points
 * actions say the points. Ids, branch lists and nested data are left out; the database keeps the full record.
 */
export function changeSummary(action: string, before: unknown, after: unknown): string | null {
  const a = obj(after);
  const b = obj(before);
  if (action === 'points.awarded' && a) {
    const earned = obj(a.merchant)?.points_earned;
    return typeof earned === 'number' ? `+${earned} point${earned === 1 ? '' : 's'}` : null;
  }
  if (action === 'points.redeemed' && a) {
    const parts = [typeof a.reward_name === 'string' ? a.reward_name : null, typeof a.points_cost === 'number' ? `−${a.points_cost} points` : null];
    return parts.filter(Boolean).join(', ') || null;
  }
  if (action === 'points.expired' && b && typeof b.balance === 'number') return `${b.balance} points expired`;

  const keys = [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])].filter((k) => FIELD[k]);
  const parts: string[] = [];
  for (const key of keys) {
    const from = b ? show(key, b[key]) : null;
    const to = a ? show(key, a[key]) : null;
    if (from !== null && to !== null) {
      if (from !== to) parts.push(`${FIELD[key]}: ${from} → ${to}`);
    } else if (to !== null) parts.push(`${FIELD[key]}: ${to}`);
    else if (from !== null && !a) parts.push(`${FIELD[key]}: ${from}`);
    if (parts.length === 3) break;
  }
  return parts.length ? parts.join(' · ') : null;
}
