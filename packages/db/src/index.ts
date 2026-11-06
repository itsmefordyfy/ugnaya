import type { Database } from './database.types.ts';

export type { Database, Json } from './database.types.ts';

type PublicSchema = Database['public'];

/** A table's row, e.g. Tables<'merchants'>. */
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
/** A view's row, e.g. Views<'merchant_directory'>. */
export type Views<T extends keyof PublicSchema['Views']> = PublicSchema['Views'][T]['Row'];
/** An enum's values, e.g. Enums<'merchant_status'>. */
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];

// The jsonb the points functions return (supabase/migrations/20261106000500_points_functions.sql).
// The generated types call them Json; these are their shapes.

export type AwardResult = {
  transaction_id: string;
  replayed: boolean;
  merchant: { program_id: string; points_earned: number; balance: number } | null;
  network: { points_earned: number; balance: number; available_at: string } | null;
};

export type RedeemResult = {
  transaction_id: string;
  replayed: boolean;
  redemption_id: string;
  reward_id: string;
  reward_name: string;
  points_cost: number;
  balance: number;
};

export type VoidResult = {
  transaction_id: string;
  replayed: boolean;
  voided_transaction_id: string;
  balances: { program_id: string; balance: number }[];
  written_off: number;
};

export type IssueTokenResult = {
  redemption_id: string;
  token: string;
  expires_at: string;
  points_cost: number;
  reward_name: string;
};

/** Every error code the points functions and Edge Functions answer with. */
export type ErrorCode =
  | 'merchant_inactive' | 'staff_not_allowed' | 'device_not_allowed' | 'forbidden' | 'sign_in_required'
  | 'request_invalid' | 'amount_invalid' | 'receipt_duplicate' | 'daily_limit' | 'customer_unknown'
  | 'invalid_member_code' | 'token_invalid' | 'token_expired' | 'token_used' | 'insufficient_points'
  | 'reward_unavailable' | 'monthly_cap' | 'first_visit_only' | 'void_window' | 'not_voidable'
  | 'already_registered' | 'pin_invalid' | 'pin_taken' | 'ledger_immutable'
  | 'grant_invalid' | 'code_invalid' | 'misconfigured' | 'internal';
