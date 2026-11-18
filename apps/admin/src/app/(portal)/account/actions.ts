'use server';

import { redirect } from 'next/navigation';
import { requestContext } from '@/lib/request-context';
import { createClient } from '@/lib/supabase/server';

/** Ends this session on every device (audited first, while the session still counts). */
export async function signOutEverywhere() {
  const supabase = await createClient();
  await supabase.rpc('admin_record_event', { p_action: 'admin.logout_all', p_context: await requestContext() });
  await supabase.auth.signOut({ scope: 'global' });
  redirect('/login');
}
