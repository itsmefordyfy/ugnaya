import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type Viewer = { id: string; email: string | null; name: string | null };
export type OwnedMerchant = { id: string; tradeName: string; status: string };

/** The signed-in person (a real account, not a cashier device), checked with Supabase. */
export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous) return null;
  const name = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null;
  return { id: user.id, email: user.email ?? null, name };
}

/** The business the signed-in person owns, if any (RLS limits the query to their own rows). */
export async function getOwnedMerchant(viewerId: string): Promise<OwnedMerchant | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('merchant_staff')
    .select('merchant_id, merchants(id, trade_name, status)')
    .eq('user_id', viewerId)
    .eq('role', 'owner')
    .eq('active', true)
    .maybeSingle();
  if (error) throw new Error(`Could not load your business: ${error.message}`);
  const merchant = data?.merchants;
  if (!merchant) return null;
  return { id: merchant.id, tradeName: merchant.trade_name, status: merchant.status };
}
