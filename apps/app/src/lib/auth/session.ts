import 'server-only';
import { supabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { resolveRole, type Role } from './roles';

export type Viewer = { id: string; email: string | null; name: string | null };
export type OwnedMerchant = { id: string; tradeName: string; status: string };
export type Account = {
  role: Role;
  /** The business of an owner or staff member. */
  merchant: OwnedMerchant | null;
  /** A customer's 8-character member ID. */
  memberId: string | null;
  displayName: string | null;
};

/** The signed-in person (a real account, not a cashier device), checked with Supabase. */
export async function getViewer(): Promise<Viewer | null> {
  // Without the Supabase values nobody can be signed in; the auth pages say what is missing.
  if (!supabaseEnv()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous) return null;
  const name = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;
  return { id: user.id, email: user.email ?? null, name };
}

const RANK = { owner: 0, manager: 1, cashier: 2 } as const;

/**
 * What this person is, read from the database. Each query is limited to the person's own rows by row-level
 * security, so nothing here can be spoofed from the browser.
 */
export async function getAccount(viewerId: string): Promise<Account> {
  const supabase = await createClient();
  const [staff, customer] = await Promise.all([
    supabase
      .from('merchant_staff')
      .select('role, merchants(id, trade_name, status)')
      .eq('user_id', viewerId)
      .eq('active', true),
    supabase.from('customer_profiles').select('public_member_id, display_name').eq('user_id', viewerId).maybeSingle(),
  ]);
  if (staff.error) throw new Error(`Could not load your account: ${staff.error.message}`);
  if (customer.error) throw new Error(`Could not load your account: ${customer.error.message}`);

  const best = [...(staff.data ?? [])].sort((a, b) => RANK[a.role] - RANK[b.role])[0];
  const merchant = best?.merchants ?? null;
  return {
    role: resolveRole({ staffRole: best?.role ?? null, isCustomer: Boolean(customer.data) }),
    merchant: merchant ? { id: merchant.id, tradeName: merchant.trade_name, status: merchant.status } : null,
    memberId: customer.data?.public_member_id ?? null,
    displayName: customer.data?.display_name ?? null,
  };
}
