import { createClient } from '@supabase/supabase-js';
import type { Database } from '@ugnaya/db';

/**
 * Supabase for the public site: the publishable key and no session at all (nothing is stored, no cookies are read
 * or set). Visitors can insert into the waitlist and nothing else (row-level security). Sign-in lives on app.ugnaya.com.
 */
export function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (apps/marketing/.env.example).');
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
