// Compile-time checks that the generated types carry the schema (run by `npm run typecheck`).
import type { Enums, Tables, Views } from './index.ts';

type Expect<T extends true> = T;
type Has<T, K extends string> = K extends keyof T ? true : false;

export type Checks = [
  Expect<Has<Tables<'merchants'>, 'trade_name'>>,
  Expect<Has<Tables<'points_ledger'>, 'available_at'>>,
  Expect<Has<Views<'merchant_directory'>, 'trade_name'>>,
  Expect<'cashier' extends Enums<'staff_role'> ? true : false>,
];
