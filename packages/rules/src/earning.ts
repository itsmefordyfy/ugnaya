/**
 * Points earned for one purchase. The SQL function points_for_amount is the authority at runtime;
 * this mirror shares its test vectors (README) so the apps can preview what the server will award.
 */
export type EarningRule =
  | { kind: 'per_peso'; pointsPerUnit: number; unitCentavos: number; minimumSpendCentavos: number }
  | { kind: 'per_visit'; points: number; minimumSpendCentavos: number }
  | { kind: 'stamps'; minimumSpendCentavos: number };

export type PerPesoRule = Extract<EarningRule, { kind: 'per_peso' }>;

/** One network point per ₱20 spent (business plan section 5). */
export const NETWORK_RULE: PerPesoRule = { kind: 'per_peso', pointsPerUnit: 1, unitCentavos: 2000, minimumSpendCentavos: 0 };

const isWhole = (n: number) => Number.isInteger(n) && n >= 0;

export function pointsForPurchase(rule: EarningRule, amountCentavos: number): number {
  if (!isWhole(amountCentavos)) throw new RangeError('amount must be a whole number of centavos, zero or more');
  if (rule.kind === 'per_peso' && (rule.unitCentavos <= 0 || rule.pointsPerUnit <= 0)) {
    throw new RangeError('a per-peso rule needs a positive unit and positive points');
  }
  if (rule.kind === 'per_visit' && rule.points <= 0) throw new RangeError('a per-visit rule needs positive points');
  if (amountCentavos < rule.minimumSpendCentavos) return 0;
  switch (rule.kind) {
    case 'per_peso':
      // Floor, never round: ₱199.50 at 1 per ₱10 is 19 points.
      return Math.floor(amountCentavos / rule.unitCentavos) * rule.pointsPerUnit;
    case 'per_visit':
      return rule.points;
    case 'stamps':
      return 1;
  }
}
