/**
 * What a handler needs from Supabase, as a small interface: the caller, RPC, and one-row table
 * access with the admin client. index.ts adapts @supabase/server's context to it; tests use a fake.
 */
export type DbError = { message: string };
export type RpcResult<T> = { data: T | null; error: DbError | null };
type Row = Record<string, unknown>;

export interface Ctx {
  userId: string | null;
  isAnonymous: boolean;
  rpc<T = unknown>(fn: string, args: Row): Promise<RpcResult<T>>;
  selectOne<T = Row>(table: string, match: Row): Promise<T | null>;
  insert(table: string, row: Row): Promise<{ error: DbError | null }>;
  update(table: string, values: Row, match: Row): Promise<{ error: DbError | null }>;
}

export type Deps = {
  ctx: Ctx;
  env: (name: string) => string | undefined;
  fetch: typeof fetch;
  now: () => number;
};

// The parts of supabase-js's query builder the adapter uses.
interface Filterable<R> extends PromiseLike<R> {
  eq(column: string, value: unknown): Filterable<R>;
  maybeSingle(): PromiseLike<{ data: Row | null; error: DbError | null }>;
}
interface AdminClient {
  rpc(fn: string, args: Row): PromiseLike<{ data: unknown; error: DbError | null }>;
  from(table: string): {
    select(columns: string): Filterable<{ data: Row[] | null; error: DbError | null }>;
    insert(row: Row): PromiseLike<{ error: DbError | null }>;
    update(values: Row): Filterable<{ error: DbError | null }>;
  };
}

/** @supabase/server's context, as much of it as this file reads. */
export type ServerContext = {
  supabaseAdmin: unknown;
  userClaims: { id?: string } | null;
  jwtClaims: Record<string, unknown> | null;
};

export function adaptContext(server: ServerContext): Ctx {
  const admin = server.supabaseAdmin as AdminClient;
  const filter = <R>(query: Filterable<R>, match: Row) =>
    Object.entries(match).reduce((q, [column, value]) => q.eq(column, value), query);
  return {
    userId: server.userClaims?.id ?? null,
    isAnonymous: server.jwtClaims?.is_anonymous === true,
    async rpc<T>(fn: string, args: Row) {
      const { data, error } = await admin.rpc(fn, args);
      return { data: data as T | null, error };
    },
    async selectOne<T>(table: string, match: Row) {
      const { data, error } = await filter(admin.from(table).select('*'), match).maybeSingle();
      if (error) throw new Error(error.message);
      return data as T | null;
    },
    async insert(table, row) {
      return await admin.from(table).insert(row);
    },
    async update(table, values, match) {
      return await filter(admin.from(table).update(values), match);
    },
  };
}

export function depsFor(server: ServerContext): Deps {
  return { ctx: adaptContext(server), env: (name) => Deno.env.get(name), fetch, now: () => Date.now() };
}
