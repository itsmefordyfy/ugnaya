import { createServerClient } from '@supabase/ssr';
import type { Database } from '@ugnaya/db';
import { NextResponse, type NextRequest } from 'next/server';
import { isPublicPath } from '@/lib/auth/roles';
import { supabaseEnv } from './env';

/**
 * Refreshes the Supabase session cookie on every request (Supabase's Next.js pattern). It doesn't
 * authorise anything: pages and Server Actions check the session themselves.
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

  // Everything but sign-in, registration and password recovery needs a signed-in person. A visitor gets a real
  // redirect to sign-in (remembering where they were going); pages and actions check the session again themselves.
  const { pathname, search } = request.nextUrl;
  if (!signedIn && !isPublicPath(pathname)) {
    const login = new URL('/login', request.url);
    if (pathname !== '/') login.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  return response;
}
