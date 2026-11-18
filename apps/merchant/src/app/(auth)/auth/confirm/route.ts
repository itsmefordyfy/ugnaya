import { NextResponse, type NextRequest } from 'next/server';
import { confirmRequest } from '@/lib/auth/confirm-params';
import { createClient } from '@/lib/supabase/server';

/**
 * The link in the confirmation email lands here: with a one-time `code` from Supabase's default email, or
 * with `token_hash` and `type` from a custom template (supabase/templates/confirm.html, which needs custom SMTP).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const confirm = confirmRequest(searchParams);

  // Neither a code nor a token_hash: the session may be in the URL fragment, which only the browser can read.
  if (confirm.kind === 'none') {
    return NextResponse.redirect(new URL(`/auth/confirm/finish?next=${encodeURIComponent(confirm.next)}`, origin));
  }

  const supabase = await createClient();
  const { error } =
    confirm.kind === 'otp'
      ? await supabase.auth.verifyOtp({ type: confirm.type, token_hash: confirm.tokenHash })
      : await supabase.auth.exchangeCodeForSession(confirm.code);
  if (!error) return NextResponse.redirect(new URL(confirm.next, origin));
  return NextResponse.redirect(new URL('/auth/error?reason=confirm', origin));
}
