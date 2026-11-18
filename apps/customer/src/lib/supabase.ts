import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/constants/config';

import { AppError } from './errors';
import { secureAuthStorage } from './secure-storage';

/** Whether this build was given the Supabase URL and key (apps/customer/.env). Without them the app says so instead of failing. */
export const supabaseConfigured = SUPABASE_URL.startsWith('https://') && SUPABASE_PUBLISHABLE_KEY.length > 0;

/**
 * One client for the app, signed in as the customer. The session lives in the Keychain (lib/secure-storage). PKCE, so the
 * password-reset link brings back a one-time code this phone exchanges, never tokens in a URL.
 *
 * The database's own generated types (@ugnaya/db) lag behind the customer functions, so the client is untyped and every call
 * goes through `rpc` / the feature api files, which state the shape each function returns (see the migration
 * 20261107000600_customer_app.sql).
 */
export const supabase = createClient(supabaseConfigured ? SUPABASE_URL : 'https://not-configured.invalid', SUPABASE_PUBLISHABLE_KEY || 'missing', {
  auth: {
    storage: secureAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// Refresh the token only while the app is in front: timers don't run reliably in the background.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

/** Calls a database function and returns its JSON, or throws its short error code. */
export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

/**
 * Calls an Edge Function. Its errors arrive as `{ error: "<code>" }` with a status; this reads the code so the screen can say
 * what happened.
 */
export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const context: unknown = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      const payload: unknown = await context.json().catch(() => null);
      const record = payload && typeof payload === 'object' ? (payload as { error?: unknown; code?: unknown }) : {};
      const code = typeof record.error === 'string' ? record.error : null;
      // The function itself isn't deployed (Supabase's gateway answers 404 NOT_FOUND): "being updated", not a vague failure.
      if (!code && context.status === 404 && record.code === 'NOT_FOUND') throw new AppError('function_missing');
      throw new AppError(code ?? (context.status === 401 ? 'sign_in_required' : 'unknown'));
    }
    throw error;
  }
  return data as T;
}
