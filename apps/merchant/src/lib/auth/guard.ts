import 'server-only';
import { redirect } from 'next/navigation';
import { canView, homePath, isLocked, SECTIONS, type Section } from './access';
import { getMembership, getViewer, type Membership, type Viewer } from './session';

export type StaffContext = Membership & { viewer: Viewer; locked: boolean };

/**
 * Gate for every portal page. Not signed in: to sign-in, remembering the page. Signed in without a business: to the
 * business step of registration. A role that can't use this section: to their own start page. The proxy already
 * redirects visitors; this is the page's own check, and the database checks every read and write again.
 */
export async function requireStaff(section: Section): Promise<StaffContext> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(SECTIONS[section].path)}`);
  const membership = await getMembership(viewer.id);
  if (!membership) redirect('/register');
  if (!canView(section, membership.role)) redirect(homePath(membership.role, membership.merchant.status));
  return { ...membership, viewer, locked: isLocked(section, membership.merchant.status) };
}
