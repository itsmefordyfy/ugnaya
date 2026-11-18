import { createServerClient } from '@supabase/ssr';
import type { Database } from '@ugnaya/db';
import { NextResponse, type NextRequest } from 'next/server';
import { isPublicPath } from '@/lib/auth/access';
import { supabaseEnv } from './env';

/**
 * Refreshes the Supabase session cookie on every request (Supabase's Next.js pattern). The cookies are set by this
 * host only (no Domain attribute), so the merchant portal's session is never shared with ugnaya.com, the customer app
 * or the admin portal. It doesn't authorise anything: pages and Server Actions check the session themselves.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const env = supabaseEnv();
  if (!env) return response;

  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        // Responses that set auth cookies must never be cached.
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });
  // Validates the token and refreshes it if needed. Never trust getSession() on the server.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims && data.claims.is_anonymous !== true);

  // A visitor gets a real redirect to sign-in (remembering where they were going).
  const { pathname, search } = request.nextUrl;
  if (!signedIn && !isPublicPath(pathname)) {
    const login = new URL('/login', request.url);
    if (pathname !== '/') login.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  return response;
}
