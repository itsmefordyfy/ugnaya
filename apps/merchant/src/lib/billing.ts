/** Plan names people read, and the Founding Merchant offer as published on ugnaya.com (apps/marketing/src/lib/plans.ts). */
export const PLAN_NAMES: Record<string, string> = {
  free: 'Free', starter: 'Starter', growth: 'Growth', business: 'Business', enterprise: 'Enterprise',
};

export const FOUNDING = { discountPercent: 40, months: 12, pilotDays: 90 } as const;

/** The founding price: 40% off the list price, rounded down to the centavo. */
export const foundingPrice = (listCentavos: number): number => Math.floor((listCentavos * (100 - FOUNDING.discountPercent)) / 100);

export const SUBSCRIPTION_STATUS: Record<string, string> = {
  active: 'Active', trialing: 'Pilot', past_due: 'Payment overdue', cancelled: 'Cancelled', canceled: 'Cancelled', paused: 'Paused',
};

/** "3 of 5", or "3 (no limit)" when the plan has none. */
export function usageText(used: number, limit: number | null | undefined): string {
  return limit === null || limit === undefined ? `${used} (no limit)` : `${used} of ${limit}`;
}

/** Share of the limit used, 0..1, or null when there is no limit. */
export function usageShare(used: number, limit: number | null | undefined): number | null {
  if (limit === null || limit === undefined || limit <= 0) return null;
  return Math.min(1, used / limit);
}

/** The first moment of the current month in Philippine time, as an ISO timestamp (the month the plan counts in). */
export function manilaMonthStart(now: Date = new Date()): string {
  const manila = new Date(now.getTime() + 8 * 3600_000);
  return new Date(Date.UTC(manila.getUTCFullYear(), manila.getUTCMonth(), 1) - 8 * 3600_000).toISOString();
}
