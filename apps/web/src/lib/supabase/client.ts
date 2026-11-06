import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@ugnaya/db';
import { requireSupabaseEnv } from './env';

/** The browser's Supabase client (Client Components only). */
export function createClient() {
  const { url, key } = requireSupabaseEnv();
  return createBrowserClient<Database>(url, key);
}
