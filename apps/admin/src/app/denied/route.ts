import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const REASONS = new Set(['not_admin', 'expired']);

/**
 * Ends a session the portal won't accept (not an administrator, or a session that no longer exists) and returns to
 * sign-in. It has to be a route: cookies can only be cleared here, not while a page renders. Without it the proxy
 * (which trusts a valid token) and the pages (which check the database) would send the browser back and forth forever.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut().catch(() => undefined);
  const reason = request.nextUrl.searchParams.get('reason') ?? '';
  const url = new URL('/login', request.nextUrl.origin);
  if (REASONS.has(reason)) url.searchParams.set('reason', reason);
  const response = NextResponse.redirect(url);
  response.headers.set('Cache-Control', 'no-store');
  response.cookies.delete('ugnaya_admin_seen');
  return response;
}
