import { NETWORK_RULE, type EarningRule, type PerPesoRule } from './earning.ts';

/** A network offer should give back 2% to 3% of the spend needed to earn its points. */
export const OFFER_GUIDELINE = { min: 0.02, max: 0.03 } as const;

export type Offer = { pointsCost: number; retailValueCentavos: number };

/** The reward's value as a share of what a customer spends to earn it. */
export function offerValueRatio(offer: Offer, rule: PerPesoRule): number {
  const spendCentavos = (offer.pointsCost / rule.pointsPerUnit) * rule.unitCentavos;
  return offer.retailValueCentavos / spendCentavos;
}

export function offerWithinGuideline(offer: Offer, rule: EarningRule = NETWORK_RULE): boolean {
  if (rule.kind !== 'per_peso') return false;
  const ratio = offerValueRatio(offer, rule);
  return ratio >= OFFER_GUIDELINE.min && ratio <= OFFER_GUIDELINE.max;
}
