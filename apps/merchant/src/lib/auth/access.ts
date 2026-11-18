import type { IconName } from '@ugnaya/web-ui';
import { safeNext } from './redirects.ts';

/**
 * Who may open which part of the portal. This is convenience only: it decides what the navigation shows and where a
 * page sends someone who can't use it. The database decides what anyone can actually read or change (row-level
 * security and the SECURITY DEFINER functions check staff_role inside Postgres).
 */
export type StaffRole = 'owner' | 'manager' | 'cashier';
export type MerchantStatus =
  | 'draft' | 'pending_verification' | 'under_review' | 'info_required' | 'rejected' | 'active' | 'suspended' | 'closed';

export type Section =
  | 'dashboard' | 'application' | 'counter' | 'customers' | 'transactions' | 'loyalty' | 'rewards' | 'campaigns'
  | 'profile' | 'branches' | 'staff' | 'billing' | 'activity';

export type SectionInfo = {
  path: string;
  label: string;
  icon: IconName;
  group: 'Business' | 'Loyalty' | 'Settings';
  roles: readonly StaffRole[];
  /** Locked until UGNAYA approves the business (the database refuses these too). */
  needsActive: boolean;
};

const MANAGERS = ['owner', 'manager'] as const;

export const SECTIONS: Record<Section, SectionInfo> = {
  dashboard: { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', group: 'Business', roles: MANAGERS, needsActive: false },
  application: { path: '/application', label: 'Application', icon: 'verified', group: 'Business', roles: MANAGERS, needsActive: false },
  counter: { path: '/counter', label: 'Counter', icon: 'point_of_sale', group: 'Loyalty', roles: ['owner', 'manager', 'cashier'], needsActive: true },
  customers: { path: '/customers', label: 'Customers', icon: 'groups', group: 'Loyalty', roles: MANAGERS, needsActive: false },
  transactions: { path: '/transactions', label: 'Transactions', icon: 'receipt_long', group: 'Loyalty', roles: MANAGERS, needsActive: false },
  loyalty: { path: '/loyalty', label: 'Loyalty program', icon: 'loyalty', group: 'Loyalty', roles: MANAGERS, needsActive: false },
  rewards: { path: '/rewards', label: 'Rewards', icon: 'redeem', group: 'Loyalty', roles: MANAGERS, needsActive: true },
  campaigns: { path: '/campaigns', label: 'Campaigns', icon: 'campaign', group: 'Loyalty', roles: MANAGERS, needsActive: true },
  profile: { path: '/profile', label: 'Business profile', icon: 'storefront', group: 'Settings', roles: MANAGERS, needsActive: false },
  branches: { path: '/branches', label: 'Branches & hours', icon: 'location_on', group: 'Settings', roles: MANAGERS, needsActive: false },
  staff: { path: '/staff', label: 'Staff', icon: 'manage_accounts', group: 'Settings', roles: MANAGERS, needsActive: false },
  billing: { path: '/billing', label: 'Plan & billing', icon: 'payments', group: 'Settings', roles: MANAGERS, needsActive: false },
  activity: { path: '/activity', label: 'Activity log', icon: 'history', group: 'Settings', roles: MANAGERS, needsActive: false },
};

export const SECTION_ORDER: Section[] = [
  'dashboard', 'application', 'counter', 'customers', 'transactions', 'loyalty', 'rewards', 'campaigns',
  'profile', 'branches', 'staff', 'billing', 'activity',
];

export function canView(section: Section, role: StaffRole): boolean {
  return SECTIONS[section].roles.includes(role);
}

/** Locked sections stay visible (so the owner sees what approval unlocks) but show an explanation instead of the tool. */
export function isLocked(section: Section, status: MerchantStatus): boolean {
  return SECTIONS[section].needsActive && status !== 'active';
}

/** Staff invitations need an approved business (merchant_invite_staff refuses otherwise); the staff list does not. */
export const canInviteStaff = (status: MerchantStatus) => status === 'active';

/** Only the owner submits the application and edits the earning rule (merchant_submit_application, loyalty_programs RLS). */
export const isOwner = (role: StaffRole) => role === 'owner';

/** Where someone starts: cashiers at the counter, owners and managers at the dashboard once approved, the application before. */
export function homePath(role: StaffRole, status: MerchantStatus): string {
  if (role === 'cashier') return SECTIONS.counter.path;
  return status === 'active' ? SECTIONS.dashboard.path : SECTIONS.application.path;
}

/** The navigation for a role, in order and grouped. */
export function navFor(role: StaffRole): (SectionInfo & { key: Section })[] {
  return SECTION_ORDER.filter((s) => canView(s, role)).map((key) => ({ key, ...SECTIONS[key] }));
}

/** The section a path belongs to, if any. */
export function sectionOf(pathname: string): Section | null {
  return SECTION_ORDER.find((s) => pathname === SECTIONS[s].path || pathname.startsWith(`${SECTIONS[s].path}/`)) ?? null;
}

/** Role names people read. A manager limited to some branches is a branch manager. */
export function roleLabel(role: StaffRole, branchIds: readonly string[] | null | undefined): string {
  if (role === 'owner') return 'Owner';
  if (role === 'cashier') return 'Cashier';
  return branchIds && branchIds.length > 0 ? 'Branch manager' : 'Manager';
}

const PUBLIC_EXACT = new Set(['/login', '/register', '/forgot-password', '/logout']);

/**
 * Pages a visitor may open. Everything else needs a signed-in person (the proxy redirects to sign-in; each page checks
 * again). /register's later steps and /invite/<token> ask for a session themselves.
 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.has(pathname) || pathname === '/auth' || pathname.startsWith('/auth/') || pathname.startsWith('/invite/');
}

/** After signing in: the page they asked for when it is a safe path on this site, otherwise the front door (which routes by role). */
export function signInRedirect(next: string | null | undefined): string {
  const wanted = safeNext(next);
  if (!wanted || wanted.startsWith('/login') || wanted.startsWith('/logout')) return '/';
  return wanted;
}
