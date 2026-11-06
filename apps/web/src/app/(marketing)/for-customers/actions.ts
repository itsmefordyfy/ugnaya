'use server';

import { createClient } from '@/lib/supabase/server';
import { parseWaitlistForm } from '@/lib/validation';

export type WaitlistState = { ok?: boolean; error?: string };

export async function joinWaitlist(_previous: WaitlistState, form: FormData): Promise<WaitlistState> {
  // A field people can't see: bots fill it in, people don't. Pretend it worked.
  if (String(form.get('website') ?? '') !== '') return { ok: true };
  const parsed = parseWaitlistForm(form);
  if (!parsed.ok) return { error: parsed.error };
  try {
    const supabase = await createClient();
    // Visitors may insert into the waitlist and nothing else (RLS); nobody can read it from the site.
    const { error } = await supabase.from('waitlist').insert(parsed.value);
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (error) {
    console.error('waitlist insert failed', error);
    return { error: 'We couldn’t add you right now. Please try again in a minute.' };
  }
}
