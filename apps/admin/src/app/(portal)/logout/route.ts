import { NextResponse, type NextRequest } from 'next/server';
import { requestContext } from '@/lib/request-context';
import { createClient } from '@/lib/supabase/server';

/** Sign out (a form POST, so a prefetch can't end a session). The event is audited first, while the session still counts. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.rpc('admin_record_event', { p_action: 'admin.logout', p_context: await requestContext() });
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.nextUrl.origin), { status: 303 });
}
