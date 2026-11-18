/**
 * The jsonb shapes the admin_* functions return (supabase/migrations/20261107000300_admin_modules.sql and
 * 20261107000500_merchant_portal.sql). The generated types call them Json; these are what is inside.
 */

export type Paged<T> = { total: number; rows: T[] };

export type DailyPoint = {
  day: string; transactions: number; new_customers: number; new_merchants: number; points_earned: number; points_redeemed: number;
  active_customers?: number;
};

export type Dashboard = {
  from: string; to: string;
  merchants: { total: number; by_status: Record<string, number> };
  new_merchants: number; pending_reviews: number; branches: number; active_subscriptions: number;
  customers: { total: number; new: number; active: number };
  transactions: { total: number; award: number; redeem: number; void: number; adjustment: number };
  transactions_all_time: number;
  points: { earned: number; redeemed: number };
  liability_points: number; open_fraud_flags: number;
  mrr_list_centavos: number | null;
  daily: DailyPoint[];
};

export type Alerts = {
  new_applications: number; oldest_application_at: string | null; awaiting_review: number; answers_received: number;
  waiting_on_merchant: number; open_fraud_flags: number; ledger_mismatches: number;
};

export type MerchantRow = {
  id: string; trade_name: string; category: string; city: string | null; status: string; plan: string | null; founding: boolean;
  created_at: string; verified_at: string | null; branches: number; transactions_30d: number;
};

export type MerchantDetail = {
  merchant: {
    id: string; trade_name: string; legal_name: string | null; category: string; city: string | null; address: string | null;
    branch_count_declared: number | null; owner_mobile: string | null; heard_from: string | null; status: string;
    network_participation: boolean | null; terms_accepted_at: string | null; marketing_consent_at: string | null;
    verified_at: string | null; created_at: string;
  };
  contact_visible: boolean;
  owner: { user_id: string | null; name: string | null; email: string | null } | null;
  subscription: {
    plan: string; status: string; founding: boolean; founding_until: string | null; period_start: string | null; period_end: string | null;
    price_centavos: number;
  } | null;
  program: {
    id: string; name: string; rule_type: string; points_per_unit: number; unit_centavos: number | null; minimum_spend_centavos: number | null;
    expiry_months: number | null; active: boolean; version: number;
  } | null;
  branches: { id: string; name: string; address: string | null; city: string | null; active: boolean }[];
  staff: { id: string; name: string; role: string; active: boolean; has_login: boolean }[];
  devices: number;
  rewards: { id: string; name: string; points_cost: number; active: boolean }[];
  stats: {
    members: number; transactions_total: number; transactions_30d: number; points_issued: number; points_redeemed: number;
    liability_points: number; open_fraud_flags: number;
  };
  reviews: {
    id: number; action: string; from_status: string | null; to_status: string | null; reason: string | null; actor_kind: string;
    actor_email: string | null; created_at: string;
  }[];
};

export type MerchantDocument = { id: string; kind: string; file_path: string; file_name: string; content_type: string; size_bytes: number; created_at: string };
export type Campaign = { id: string; name: string; kind: string; status: string; starts_at: string | null; ends_at: string | null; created_at: string };
export type Note = { id: number; body: string; author_email: string | null; created_at: string };

export type UserRow = {
  id: string; name: string | null; email: string | null; member_id: string | null; is_customer: boolean; is_staff: boolean; is_admin: boolean;
  created_at: string; last_sign_in_at: string | null; suspended: boolean;
};
export type UserList = Paged<UserRow> & { pii: boolean };

export type UserDetail = {
  pii: boolean;
  user: { id: string; email: string | null; name: string | null; created_at: string; last_sign_in_at: string | null; email_confirmed_at: string | null; suspended: boolean };
  customer: {
    member_id: string; display_name: string | null; city: string | null; birthday: string | null; marketing_consent_at: string | null;
    deleted_at: string | null; created_at: string;
  } | null;
  admin_role: string | null;
  memberships: { merchant_id: string; trade_name: string; role: string; active: boolean }[];
  accounts: { program: string; scope: string; merchant: string | null; balance: number; lifetime_earned: number; last_activity_at: string | null }[];
  transactions: { id: string; created_at: string; merchant: string; type: string; status: string; amount_centavos: number | null; points: number }[];
};

export type TransactionRow = {
  id: string; created_at: string; merchant_id: string; merchant: string; branch: string | null; staff: string | null; member_id: string | null;
  type: string; status: string; amount_centavos: number | null; receipt_no: string | null; reason: string | null; reverses_id: string | null;
  points: number;
};

export type FraudFlag = {
  id: string; created_at: string; rule: string; details: Record<string, unknown> | null; status: string; merchant_id: string | null;
  merchant: string | null; member_id: string | null; staff: string | null; transaction_id: string | null;
};

export type Finance = {
  plans: { plan: string; price_centavos: number; active_merchants: number; founding: number; all_merchants: number }[];
  mrr_list_centavos: number; paying_merchants: number; subscription_statuses: Record<string, number>;
  liability_points: { merchant: number; network: number }; settlement_records: number;
};

export type SubscriptionRow = {
  merchant_id: string; trade_name: string; merchant_status: string; plan: string; status: string; founding: boolean;
  founding_until: string | null; period_start: string | null; period_end: string | null; price_centavos: number; updated_at: string;
};

export type Analytics = {
  days: number; since: string; active_customers: number; active_customers_previous: number; customer_retention: number | null;
  transacting_merchants: number; daily: DailyPoint[];
  by_category: { category: string; merchants: number }[];
  top_merchants: { merchant_id: string; trade_name: string; transactions: number; customers: number }[];
};

export type Setting = { key: string; value: unknown; updated_at: string };

export type Announcement = {
  id: string; title: string; body: string; audience: string; published: boolean; starts_at: string | null; ends_at: string | null;
  created_at: string; updated_at: string;
};
