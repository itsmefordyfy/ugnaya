import 'server-only';
import type { Database } from '@ugnaya/db';
import { friendlyError } from './errors';
import { createClient } from './supabase/server';

type Fns = Database['public']['Functions'];
export type AdminFn = Extract<keyof Fns, `admin_${string}`>;

export type RpcFailure = { ok: false; code: string; message: string; missing: boolean };
export type RpcResult<T> = { ok: true; data: T } | RpcFailure;

/**
 * Calls one admin_* function as the signed-in administrator (their own session and the publishable key: the database
 * checks the permission and the second factor). Never throws: a page shows the failure in place, so one module that
 * isn't on the database yet doesn't take the whole portal down. `T` is the jsonb shape documented in lib/types.ts.
 */
export async function callAdmin<T, K extends AdminFn = AdminFn>(name: K, args?: Fns[K]['Args']): Promise<RpcResult<T>> {
  const supabase = await createClient();
  // The generated Args types are kept at the call site (Fns[K]['Args']); supabase-js's overloads can't follow a generic K.
  const { data, error } = await (supabase.rpc as (fn: string, a?: object) => ReturnType<typeof supabase.rpc>)(name, args ?? {});
  if (error) {
    const missing = error.code === 'PGRST202' || error.code === '42883';
    return { ok: false, code: error.code ?? '', message: missing ? 'not_deployed' : error.message, missing };
  }
  return { ok: true, data: data as T };
}

/** For actions: the person-facing sentence for a failure. */
export const failureText = (failure: RpcFailure): string =>
  failure.missing ? 'This feature’s database functions aren’t on this project yet. Push the latest migrations, then try again.' : friendlyError(failure.message);
