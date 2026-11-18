import { createServerClient } from '@supabase/ssr';
import type { Database } from '@ugnaya/db';
import { NextResponse, type NextRequest } from 'next/server';
import { IDLE_COOKIE, IDLE_COOKIE_MAX_AGE_S, IDLE_LIMIT_MS, clientIp, idleExpired, isIpAllowed, parseAllowlist, routeFor, type Gate } from '@/lib/access';
import { buildCsp } from '@/lib/csp';
import { supabaseEnv } from '@/lib/supabase/env';

const HARDENED = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' } as const;

/**
 * The first lines of defence for every request, in order: the optional IP allow-list, a fresh Content-Security-Policy
 * nonce, the session (refreshed and verified with getClaims), the sign-in and second-factor gates, and the idle
 * timeout. It only redirects and refuses; pages and the database authorise.
 */
export async function proxy(request: NextRequest) {
  if (!isIpAllowed(clientIp(request.headers), parseAllowlist(process.env.ADMIN_ALLOWED_IPS))) {
    return new NextResponse('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp({ nonce, development: process.env.NODE_ENV !== 'production', supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '' });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  const { pathname } = request.nextUrl;

  const env = supabaseEnv();
  let gate: Gate = { signedIn: false, aal: null };
  let signOut: (() => Promise<unknown>) | null = null;
  if (env) {
    const supabase = createServerClient<Database>(env.url, env.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request: { headers: requestHeaders } });
          response.headers.set('Content-Security-Policy', csp);
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, { ...options, ...HARDENED });
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    });
    // Verifies the token (and refreshes it if needed). Never trust getSession() on the server.
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (claims && claims.is_anonymous !== true) gate = { signedIn: true, aal: claims.aal === 'aal2' ? 'aal2' : 'aal1' };
    signOut = () => supabase.auth.signOut();
  }

  const redirectTo = async (to: string, reason?: string) => {
    const url = new URL(to, request.url);
    if (reason) url.searchParams.set('reason', reason);
    const redirect = NextResponse.redirect(url);
    redirect.headers.set('Content-Security-Policy', csp);
    redirect.headers.set('Cache-Control', 'no-store');
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  const now = Date.now();
  if (gate.signedIn && signOut && idleExpired(Number(request.cookies.get(IDLE_COOKIE)?.value) || null, now, IDLE_LIMIT_MS)) {
    await signOut();
    const redirect = await redirectTo('/login', 'idle');
    redirect.cookies.delete(IDLE_COOKIE);
    return redirect;
  }

  const to = routeFor(gate, pathname);
  if (to) return redirectTo(to);

  if (gate.signedIn) response.cookies.set(IDLE_COOKIE, String(now), { ...HARDENED, maxAge: IDLE_COOKIE_MAX_AGE_S });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|robots.txt).*)'],
};
