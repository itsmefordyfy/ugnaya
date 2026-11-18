import 'server-only';
import { revalidatePath } from 'next/cache';
import type { ActionState } from './action-state';
import { callAdmin, failureText, type AdminFn } from './rpc';
import type { Database } from '@ugnaya/db';

type Fns = Database['public']['Functions'];

/** One audited change: call the admin function, refresh the pages that show it, and report the result to the form. */
export async function runAdmin<K extends AdminFn>(name: K, args: Fns[K]['Args'], paths: string[], message?: string): Promise<ActionState> {
  const result = await callAdmin<unknown, K>(name, args);
  if (!result.ok) return { error: failureText(result) };
  for (const path of paths) revalidatePath(path);
  return { ok: true, message };
}

/** A form value as trimmed text. */
export const text = (form: FormData, key: string): string => String(form.get(key) ?? '').trim();
