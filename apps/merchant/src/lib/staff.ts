import { isEmail } from '@ugnaya/rules';
import type { StaffRole } from './auth/access.ts';

/**
 * Staff and invitation rules for the portal, kept pure so they can be tested. They decide what the screens offer; the
 * database decides what is allowed (merchant_invite_staff, merchant_add_staff and merchant_update_staff check the
 * caller's role inside Postgres).
 */

export type FieldErrors = Record<string, string>;
export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** merchant_invite_staff returns encode(gen_random_bytes(24), 'hex'): 48 lowercase hex characters. */
const TOKEN = /^[0-9a-f]{48}$/;

export const isInviteToken = (token: string | null | undefined): token is string => typeof token === 'string' && TOKEN.test(token);

/** The link the owner copies and sends (no email is sent by UGNAYA). */
export function inviteUrl(base: string, token: string): string {
  return `${base.replace(/\/+$/, '')}/invite/${token}`;
}

export const ROLE_NAMES: Record<StaffRole, string> = { owner: 'Owner', manager: 'Manager', cashier: 'Cashier' };

/** Roles a caller may invite: owners invite managers and cashiers, managers only cashiers, cashiers nobody. */
export function inviteRoleOptions(caller: StaffRole): StaffRole[] {
  if (caller === 'owner') return ['manager', 'cashier'];
  if (caller === 'manager') return ['cashier'];
  return [];
}

export type StaffPerson = { role: StaffRole; userId: string | null };

export type EditRules = {
  canEdit: boolean;
  /** Roles the form offers; a single entry means the role is fixed. */
  roleOptions: StaffRole[];
  canChangeActive: boolean;
  /** Owners always cover the whole business; a manager can't widen their own branches. */
  canChangeBranches: boolean;
};

/**
 * What a caller may change on one staff row, mirroring merchant_update_staff: the owner's role never changes, nobody
 * changes their own role or turns themselves off, managers edit cashiers (and their own name), and a manager needs a
 * login of their own.
 */
export function editRules(caller: StaffPerson & { userId: string }, target: StaffPerson): EditRules {
  const self = target.userId !== null && target.userId === caller.userId;
  const none: EditRules = { canEdit: false, roleOptions: [target.role], canChangeActive: false, canChangeBranches: false };
  if (caller.role === 'cashier') return none;
  if (caller.role === 'manager' && target.role !== 'cashier' && !self) return none;
  if (target.role === 'owner') return { canEdit: true, roleOptions: ['owner'], canChangeActive: false, canChangeBranches: false };
  if (self) return { canEdit: true, roleOptions: [target.role], canChangeActive: false, canChangeBranches: caller.role === 'owner' };
  const roleOptions: StaffRole[] = caller.role === 'owner' && target.userId ? ['manager', 'cashier'] : [target.role === 'manager' ? 'manager' : 'cashier'];
  return { canEdit: true, roleOptions, canChangeActive: true, canChangeBranches: true };
}

export type InviteRow = { accepted_at: string | null; revoked_at: string | null; expires_at: string };
export type InviteState = 'open' | 'accepted' | 'revoked' | 'expired';

export function inviteState(invite: InviteRow, now: Date = new Date()): InviteState {
  if (invite.accepted_at) return 'accepted';
  if (invite.revoked_at) return 'revoked';
  if (new Date(invite.expires_at).getTime() <= now.getTime()) return 'expired';
  return 'open';
}

export const INVITE_STATE_LABEL: Record<InviteState, string> = {
  open: 'Waiting',
  accepted: 'Accepted',
  revoked: 'Cancelled',
  expired: 'Expired',
};

/** A manager may cancel cashier invitations only; owners any open one. */
export const canRevokeInvite = (caller: StaffRole, invite: { role: StaffRole }, state: InviteState): boolean =>
  state === 'open' && (caller === 'owner' || (caller === 'manager' && invite.role === 'cashier'));

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

function displayName(form: FormData, errors: FieldErrors): string {
  const name = text(form, 'displayName');
  if (name.length < 1 || name.length > 80) errors.displayName = 'Enter a name of 1 to 80 characters.';
  return name;
}

/** The branches ticked on the form; none ticked means every branch (stored as null). */
function branchIds(form: FormData, errors: FieldErrors): string[] {
  const ids = [...new Set(form.getAll('branchIds').map((v) => String(v)))];
  if (ids.some((id) => !UUID.test(id))) errors.branchIds = 'Choose branches from the list.';
  return ids;
}

const isRole = (value: string): value is StaffRole => value === 'owner' || value === 'manager' || value === 'cashier';

export type InviteInput = { email: string; displayName: string; role: StaffRole; branchIds: string[] };

export function parseInviteForm(form: FormData, caller: StaffRole): Parsed<InviteInput> {
  const errors: FieldErrors = {};
  const email = text(form, 'email').toLowerCase();
  if (!isEmail(email) || email.length > 200) errors.email = 'Enter a valid email address.';
  const name = displayName(form, errors);
  const role = text(form, 'role');
  if (!isRole(role) || !inviteRoleOptions(caller).includes(role)) errors.role = 'Choose a role.';
  const branches = branchIds(form, errors);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { email, displayName: name, role: role as StaffRole, branchIds: branches } };
}

export type CashierInput = { displayName: string; pin: string; branchIds: string[] };

export function parseCashierForm(form: FormData): Parsed<CashierInput> {
  const errors: FieldErrors = {};
  const name = displayName(form, errors);
  const pin = text(form, 'pin');
  if (!/^[0-9]{4,6}$/.test(pin)) errors.pin = 'A PIN is 4 to 6 digits.';
  else if (text(form, 'pinConfirm') !== pin) errors.pinConfirm = 'The two PINs don’t match.';
  const branches = branchIds(form, errors);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { displayName: name, pin, branchIds: branches } };
}

export type EditInput = { staffId: string; displayName: string; role: StaffRole; branchIds: string[]; active: boolean };

export function parseEditForm(form: FormData): Parsed<EditInput> {
  const errors: FieldErrors = {};
  const staffId = text(form, 'staffId');
  if (!UUID.test(staffId)) errors.staffId = 'That staff member wasn’t found. Refresh the page.';
  const name = displayName(form, errors);
  const role = text(form, 'role');
  if (!isRole(role)) errors.role = 'Choose a role.';
  const branches = branchIds(form, errors);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { staffId, displayName: name, role: role as StaffRole, branchIds: branches, active: form.get('active') === 'on' } };
}

/** Database codes that belong next to a field rather than at the top of the form. */
export const FIELD_FOR_CODE: Record<string, string> = {
  email_invalid: 'email',
  already_staff: 'email',
  user_not_found: 'email',
  name_invalid: 'displayName',
  pin_invalid: 'pin',
  pin_taken: 'pin',
  pin_required: 'pin',
  branch_invalid: 'branchIds',
  login_required: 'role',
};
