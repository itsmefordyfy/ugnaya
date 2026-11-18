import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Section } from './access';
import { requireStaff, type StaffContext } from './guard';

/**
 * For Server Actions: the same gate as the page (signed in, on the staff, a role that may use this section), plus a
 * Supabase client acting as that person. Never trust a merchant id from the form: use `ctx.merchant.id`.
 */
export async function actionContext(section: Section): Promise<{ ctx: StaffContext; supabase: Awaited<ReturnType<typeof createClient>> }> {
  const ctx = await requireStaff(section);
  const supabase = await createClient();
  return { ctx, supabase };
}

/** A fresh idempotency key or random id on the server (one per form submission when the browser didn't send one). */
export const randomId = (): string => crypto.randomUUID();
