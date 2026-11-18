import 'server-only';
import { redirect } from 'next/navigation';
import { urls } from '@/lib/urls';
import { getAccount, getViewer, type Account, type Viewer } from './session';
import { canEnter, destinationFor, type Area } from './roles';

/**
 * Gate for a signed-in area. Not signed in: to sign-in, remembering the page. Signed in as the wrong kind of
 * account: to their own home (the merchant portal for business accounts). The proxy already redirects
 * visitors; this is the check that actually authorises.
 */
export async function requireArea(area: Area, path: string): Promise<{ viewer: Viewer; account: Account }> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(path)}`);
  const account = await getAccount(viewer.id);
  if (!canEnter(area, account.role)) redirect(destinationFor(account.role, urls));
  return { viewer, account };
}
