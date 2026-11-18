import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@ugnaya/db';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { requireSupabaseEnv } from './env';

/** Session cookies for the admin portal: never readable by scripts, only over HTTPS in production. */
export const HARDENED = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' } as const;

/** Supabase as the signed-in visitor, for Server Components, Server Actions and Route Handlers. */
export async function createClient() {
  // Read the request first: it marks the caller as request-time, so prerendering stops here
  // instead of running into the env check at build time.
  const cookieStore = await cookies();
  // supabase-js reads the clock (is this session about to expire?) before it calls Supabase. Next rejects a
  // time read that happens before the route has asked for live data (blocking-prerender-current-time), which
  // hit signed-in visitors on /register. Everything that follows is therefore explicitly request-time.
  await connection();
  const { url, key } = requireSupabaseEnv();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, { ...options, ...HARDENED });
        } catch {
          // Called from a Server Component, which can't set cookies; the proxy refreshes them instead.
        }
      },
    },
  });
}
