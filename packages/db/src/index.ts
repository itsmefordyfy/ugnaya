import type { Database } from './database.types.ts';

export type { Database };

type PublicSchema = Database extends { public: infer S } ? S : never;

/** A table's row type, e.g. Tables<'merchants'>. */
export type Tables<T extends string> = PublicSchema extends { Tables: Record<T, { Row: infer R }> } ? R : never;
