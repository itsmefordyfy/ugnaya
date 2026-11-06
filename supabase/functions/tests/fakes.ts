import type { Ctx, Deps } from '../_shared/context.ts';

type Row = Record<string, unknown>;

export type FakeOptions = {
  userId?: string | null;
  anonymous?: boolean;
  rpc?: Record<string, (args: Row) => unknown>;
  tables?: Record<string, Row[]>;
};

/** An in-memory stand-in for the Supabase admin client, recording what the handler wrote. */
export function fakeCtx(options: FakeOptions = {}): Ctx & { tables: Record<string, Row[]>; rpcCalls: { fn: string; args: Row }[] } {
  const tables: Record<string, Row[]> = structuredClone(options.tables ?? {});
  const rpcCalls: { fn: string; args: Row }[] = [];
  const matches = (row: Row, match: Row) => Object.entries(match).every(([k, v]) => row[k] === v);
  return {
    userId: options.userId ?? null,
    isAnonymous: options.anonymous ?? false,
    tables,
    rpcCalls,
    rpc(fn, args) {
      rpcCalls.push({ fn, args });
      const impl = options.rpc?.[fn];
      if (!impl) return Promise.resolve({ data: null, error: { message: `no fake for ${fn}` } });
      try {
        return Promise.resolve({ data: impl(args) as never, error: null });
      } catch (error) {
        return Promise.resolve({ data: null, error: { message: (error as Error).message } });
      }
    },
    selectOne(table, match) {
      return Promise.resolve((tables[table] ?? []).find((row) => matches(row, match)) as never ?? null);
    },
    insert(table, row) {
      (tables[table] ??= []).push(row);
      return Promise.resolve({ error: null });
    },
    update(table, values, match) {
      for (const row of tables[table] ?? []) if (matches(row, match)) Object.assign(row, values);
      return Promise.resolve({ error: null });
    },
  };
}

export function fakeDeps(ctx: Ctx, env: Record<string, string> = {}, fetchImpl?: typeof fetch, now = 1_800_000_000_000): Deps {
  return {
    ctx,
    env: (name) => env[name],
    fetch: fetchImpl ?? (() => Promise.reject(new Error('no network in tests'))),
    now: () => now,
  };
}

export const post = (body: unknown) =>
  new Request('http://localhost/fn', { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });

export const DEVICE_USER = '52000000-0000-4000-8000-0000000000d1';
export const DEVICE = { id: '54000000-0000-4000-8000-000000000001', merchant_id: '50000000-0000-4000-8000-000000000001',
  branch_id: '51000000-0000-4000-8000-000000000001', user_id: DEVICE_USER, revoked_at: null };
export const SECRET = 'test-staff-grant-secret-0123456789abcdef';
