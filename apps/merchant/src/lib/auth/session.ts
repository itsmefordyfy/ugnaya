import 'server-only';
import { cache } from 'react';
import { supabaseEnv } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import type { MerchantStatus, StaffRole } from './access';

export type Viewer = { id: string; email: string | null; name: string | null };
export type Membership = {
  staffId: string;
  role: StaffRole;
  /** The branches this person is limited to, or null for the whole business. */
  branchIds: string[] | null;
  displayName: string;
  merchant: { id: string; tradeName: string; status: MerchantStatus; logoPath: string | null };
};

/** The signed-in person (a real account, not a cashier device), checked with Supabase. Once per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  // Without the Supabase values nobody can be signed in; the auth pages say what is missing.
  if (!supabaseEnv()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous) return null;
  const name = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;
  return { id: user.id, email: user.email ?? null, name };
});

const RANK: Record<StaffRole, number> = { owner: 0, manager: 1, cashier: 2 };

/**
 * The business this person works for and their role there, read from the database (row-level security limits the
 * query to their own rows, so nothing here can be spoofed). Someone on the staff of two businesses gets the one where
 * their role is strongest (decision recorded in the README; a business switcher can come later).
 */
export const getMembership = cache(async (viewerId: string): Promise<Membership | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('merchant_staff')
    .select('id, role, branch_ids, display_name, created_at, merchants(id, trade_name, status, logo_path)')
    .eq('user_id', viewerId)
    .eq('active', true);
  if (error) throw new Error(`Could not load your business: ${error.message}`);
  const best = [...(data ?? [])]
    .filter((row) => row.merchants)
    .sort((a, b) => RANK[a.role] - RANK[b.role] || a.created_at.localeCompare(b.created_at))[0];
  if (!best?.merchants) return null;
  return {
    staffId: best.id,
    role: best.role,
    branchIds: best.branch_ids && best.branch_ids.length > 0 ? best.branch_ids : null,
    displayName: best.display_name,
    merchant: {
      id: best.merchants.id,
      tradeName: best.merchants.trade_name,
      status: best.merchants.status,
      logoPath: best.merchants.logo_path,
    },
  };
});
