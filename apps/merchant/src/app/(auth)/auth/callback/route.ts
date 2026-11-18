import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '@/lib/auth/redirects';
import { createClient } from '@/lib/supabase/server';

/** Google sign-in returns here with a code to exchange for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next')) ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL('/auth/error?reason=oauth', origin));
}
