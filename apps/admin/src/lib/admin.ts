import 'server-only';
import type { AdminRole } from '@ugnaya/db';
import { notFound, redirect } from 'next/navigation';
import { supabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export type Admin = { id: string; email: string | null; role: AdminRole; permissions: string[] };

type Me = { role: AdminRole | null; mfa: boolean; permissions: string[] };

/**
 * The signed-in administrator, as the DATABASE sees them (admin_me): role, whether the session has its second
 * factor, and the permissions that role holds. The browser supplies none of it.
 */
export async function getAdmin(): Promise<{ id: string; email: string | null; me: Me } | null> {
  if (!supabaseEnv()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous) return null;
  const { data: me, error } = await supabase.rpc('admin_me');
  if (error) throw new Error(`Could not read your admin access: ${error.message}`);
  return { id: user.id, email: user.email ?? null, me: me as unknown as Me };
}

/**
 * Guard for every portal page. Not signed in: sign-in. Signed in but not an administrator: signed out with a notice.
 * No second factor yet: the code step. Missing the page's permission: a plain "not found" (no hint a page exists).
 * The proxy already redirects; this is the check that authorises, and the database checks again on every query.
 */
export async function requireAdmin(permission?: string): Promise<Admin> {
  const admin = await getAdmin();
  // Not signed in at the database although the proxy let us through (a revoked or expired session): clear it properly.
  if (!admin) redirect('/denied?reason=expired');
  if (!admin.me.role) redirect('/denied?reason=not_admin');
  if (!admin.me.mfa) redirect('/mfa');
  if (permission && !admin.me.permissions.includes(permission)) notFound();
  return { id: admin.id, email: admin.email, role: admin.me.role, permissions: admin.me.permissions };
}
