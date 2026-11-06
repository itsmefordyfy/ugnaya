/**
 * UGNAYA's plans (business plan section 6). The numbers match the database's plan_limits table
 * (supabase/migrations/20261106000100_platform.sql); change both together. Prices are hypotheses
 * to test in the validation interviews, which is why they live in this one file.
 */
export type PlanCode = 'free' | 'starter' | 'growth' | 'business' | 'enterprise';

export type Plan = {
  code: PlanCode;
  name: string;
  /** Per month; null for Enterprise (quoted). */
  priceCentavos: number | null;
  priceNote?: string;
  blurb: string;
  branches: number | null;
  staff: number | null;
  rewards: number | null;
  transactionsPerMonth: number | null;
  features: string[];
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  {
    code: 'free', name: 'Free', priceCentavos: 0, blurb: 'Try digital loyalty at one counter.',
    branches: 1, staff: 2, rewards: 1, transactionsPerMonth: 300,
    features: ['Points or stamps for your shop', '1 reward', 'Basic directory listing', 'Weekly summary'],
  },
  {
    code: 'starter', name: 'Starter', priceCentavos: 39900, blurb: 'A full loyalty program for one shop.',
    branches: 1, staff: 5, rewards: null, transactionsPerMonth: null,
    features: ['Unlimited rewards and customers', 'Welcome and birthday rewards', 'Your full customer list', 'One push campaign a month', 'Monthly results report'],
  },
  {
    code: 'growth', name: 'Growth', priceCentavos: 89900, blurb: 'Bring back regulars and meet new customers.',
    branches: 3, staff: 15, rewards: null, transactionsPerMonth: null, highlight: true,
    features: ['Everything in Starter', 'Up to 3 branches', 'Win-back campaigns and customer segments', 'Network offers to customers of nearby shops (coming with the network)', 'Highlighted in the directory', 'Same-day chat support'],
  },
  {
    code: 'business', name: 'Business', priceCentavos: 199900, blurb: 'For local chains and busy multi-branch shops.',
    branches: 10, staff: 50, rewards: null, transactionsPerMonth: null,
    features: ['Everything in Growth', 'Up to 10 branches (₱199 each after)', 'Branch comparison and staff reports', 'Fraud checks', 'POS integration and API (coming)', 'Priority phone support'],
  },
  {
    code: 'enterprise', name: 'Enterprise', priceCentavos: null, priceNote: 'From about ₱5,000', blurb: 'Regional chains, franchises and associations.',
    branches: null, staff: null, rewards: null, transactionsPerMonth: null,
    features: ['Unlimited branches and staff', 'Your own branding (white label)', 'Custom network rules', 'Data export', 'Account manager and SLA'],
  },
];

/** The Founding Merchant Program (business plan section 7). */
export const FOUNDING = { discountPercent: 40, months: 12, pilotDays: 90 } as const;

const pesos = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** ₱399, ₱1,999, ₱0: no centavos for whole amounts. */
export function formatPeso(centavos: number): string {
  return `₱${pesos.format(centavos / 100)}`;
}
