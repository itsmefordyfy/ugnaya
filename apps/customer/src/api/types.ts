/**
 * The JSON the customer functions return (supabase/migrations/20261107000600_customer_app.sql). Written by hand because the
 * generated @ugnaya/db types don't cover these functions' jsonb shapes.
 */

export type MerchantCategory = 'cafe' | 'milk_tea' | 'restaurant' | 'bakery' | 'other_food' | 'other';
export type RuleType = 'per_peso' | 'per_visit' | 'stamps';
export type TransactionType = 'award' | 'redeem' | 'void' | 'adjustment';
export type RedemptionStatus = 'issued' | 'used' | 'expired' | 'cancelled';

export type EarningRule = {
  type: RuleType | null;
  points_per_unit: number | null;
  unit_centavos: number | null;
  minimum_spend_centavos: number | null;
};

export type WalletAccount = {
  account_id: string;
  program_id: string;
  scope: 'merchant' | 'network';
  program: string;
  merchant_id: string | null;
  merchant: string | null;
  logo_path: string | null;
  category: MerchantCategory | null;
  merchant_active: boolean;
  balance: number;
  available: number;
  lifetime_earned: number;
  last_activity_at: string;
  expires_at: string | null;
  rule: EarningRule;
};

export type Wallet = {
  member_id: string;
  network_enabled: boolean;
  accounts: WalletAccount[];
};

export type Activity = {
  id: string;
  created_at: string;
  type: TransactionType;
  status: 'completed' | 'voided';
  merchant_id: string;
  merchant: string;
  branch: string | null;
  amount_centavos: number | null;
  receipt_no: string | null;
  reason: string | null;
  points: number;
  merchant_points: number;
  network_points: number;
  reward: string | null;
};

export type Redemption = {
  id: string;
  created_at: string;
  reward_id: string;
  reward: string;
  merchant_id: string;
  merchant: string;
  points_cost: number;
  used_at: string | null;
  expires_at: string;
  status: RedemptionStatus;
};

export type MerchantSummary = {
  id: string;
  trade_name: string;
  category: MerchantCategory;
  city: string | null;
  description: string | null;
  logo_path: string | null;
  distance_km: number | null;
  branches: number;
  rewards: number;
  favorite: boolean;
  balance: number | null;
};

export type Branch = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  /** Opening hours as the merchant portal stores them (jsonb); read with `hoursLines`. */
  hours: unknown;
  distance_km: number | null;
};

export type MerchantReward = {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  first_visit_only: boolean;
  in_stock: boolean;
  eligible: boolean;
};

export type Campaign = {
  id: string;
  name: string;
  kind: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

export type MerchantDetail = {
  merchant: {
    id: string;
    trade_name: string;
    category: MerchantCategory;
    city: string | null;
    address: string | null;
    description: string | null;
    logo_path: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    website: string | null;
  };
  program: {
    name: string | null;
    rule_type: RuleType | null;
    points_per_unit: number | null;
    unit_centavos: number | null;
    minimum_spend_centavos: number | null;
    expiry_months: number | null;
    active: boolean | null;
  };
  balance: number;
  favorite: boolean;
  branches: Branch[];
  rewards: MerchantReward[];
  campaigns: Campaign[];
};

export type Reward = {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  merchant_id: string;
  merchant: string;
  logo_path: string | null;
  balance: number;
  in_stock: boolean;
  eligible: boolean;
};

export type Promotion = {
  id: string;
  name: string;
  kind: string;
  description: string | null;
  merchant_id: string;
  merchant: string;
  ends_at: string | null;
};

export type Announcement = { id: string; title: string; body: string };

export type Home = {
  profile: { display_name: string | null; member_id: string; onboarded_at: string | null } | null;
  points: { merchant: number; network: number };
  unread_notifications: number;
  featured_rewards: Reward[];
  nearby: MerchantSummary[];
  promotions: Promotion[];
  announcements: Announcement[];
  recent_activity: Activity[];
};

export type CustomerProfile = {
  user_id: string;
  public_member_id: string;
  display_name: string | null;
  birthday_month: number | null;
  birthday_day: number | null;
  city: string | null;
  terms_accepted_at: string | null;
  marketing_consent_at: string | null;
  notify_points: boolean;
  notify_offers: boolean;
  notify_expiry: boolean;
  onboarded_at: string | null;
  deleted_at: string | null;
};

export type InAppNotification = {
  id: string;
  kind: string | null;
  title: string | null;
  body: string | null;
  data: { transaction_id?: string; merchant_id?: string; account_id?: string } | null;
  read_at: string | null;
  created_at: string;
};

export type RedemptionCode = { redemptionCode: string; expiresAt: string; pointsCost: number; rewardName: string };
export type DeviceSecret = { memberId: string; secretBase32: string };
