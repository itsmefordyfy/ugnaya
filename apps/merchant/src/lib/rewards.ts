import { offerValueRatio, type PerPesoRule } from '@ugnaya/rules';
import { parsePesos } from './format.ts';

/** A reward the shop offers for points (table rewards; owners and managers may add and edit, once the business is approved). */
export type RewardInput = {
  name: string;
  description: string | null;
  pointsCost: number;
  retailValueCentavos: number | null;
  /** How many may be claimed per calendar month, or null for no limit. */
  monthlyCap: number | null;
  /** How many are left, or null when it never runs out. Each redemption takes one. */
  stock: number | null;
  firstVisitOnly: boolean;
  active: boolean;
};

export type RewardFieldErrors = Partial<Record<keyof RewardInput, string>>;

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

/** An optional whole number: empty is null; anything else must be within [min, max]. */
function optionalWhole(raw: string, min: number, max: number): number | null | undefined {
  if (raw === '') return null;
  const n = Number(raw.replace(/,/g, ''));
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
}

export function parseRewardForm(form: FormData): { ok: true; value: RewardInput } | { ok: false; errors: RewardFieldErrors } {
  const errors: RewardFieldErrors = {};
  const name = text(form, 'name');
  if (name.length < 1 || name.length > 80) errors.name = 'Name the reward (up to 80 characters), for example “Free iced coffee”.';
  const description = text(form, 'description');
  if (description.length > 300) errors.description = 'Keep the description under 300 characters.';
  const pointsCost = optionalWhole(text(form, 'pointsCost'), 1, 1_000_000);
  if (pointsCost === null || pointsCost === undefined) errors.pointsCost = 'Enter how many points it costs (a whole number, 1 or more).';
  const valueRaw = text(form, 'retailValuePesos');
  const retailValueCentavos = valueRaw === '' ? null : parsePesos(valueRaw);
  if (valueRaw !== '' && retailValueCentavos === null) errors.retailValueCentavos = 'Enter the menu price in pesos, or leave it empty.';
  const monthlyCap = optionalWhole(text(form, 'monthlyCap'), 1, 1_000_000);
  if (monthlyCap === undefined) errors.monthlyCap = 'Enter a whole number of 1 or more, or leave it empty for no limit.';
  const stock = optionalWhole(text(form, 'stock'), 0, 1_000_000);
  if (stock === undefined) errors.stock = 'Enter a whole number of 0 or more, or leave it empty if it never runs out.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name, description: description || null, pointsCost: pointsCost as number, retailValueCentavos,
      monthlyCap: monthlyCap ?? null, stock: stock ?? null,
      firstVisitOnly: form.get('firstVisitOnly') === 'on', active: form.get('active') === 'on',
    },
  };
}

/** The columns the database lets a manager write (rewards insert/update grants). */
export const rewardColumns = (r: RewardInput) => ({
  name: r.name,
  description: r.description,
  points_cost: r.pointsCost,
  retail_value_centavos: r.retailValueCentavos,
  monthly_cap: r.monthlyCap,
  stock: r.stock,
  first_visit_only: r.firstVisitOnly,
  active: r.active,
});

/**
 * How generous a reward is for a points-per-peso program: its menu price as a share of what a customer spends to earn
 * its points. Guidance only (many shops give 2% to 10% back); null when it can't be worked out.
 */
export function valueBack(reward: { pointsCost: number; retailValueCentavos: number | null }, program: { ruleType: string; pointsPerUnit: number; unitCentavos: number }): number | null {
  if (program.ruleType !== 'per_peso' || !reward.retailValueCentavos || reward.pointsCost <= 0) return null;
  const rule: PerPesoRule = { kind: 'per_peso', pointsPerUnit: program.pointsPerUnit, unitCentavos: program.unitCentavos, minimumSpendCentavos: 0 };
  return offerValueRatio({ pointsCost: reward.pointsCost, retailValueCentavos: reward.retailValueCentavos }, rule);
}

/** "Customers get about 5% back" plus a gentle note when it looks very low or very high. Never blocks saving. */
export function valueBackHint(ratio: number | null): string | null {
  if (ratio === null) return null;
  const pct = ratio * 100;
  const shown = pct < 1 ? pct.toFixed(1) : String(Math.round(pct));
  if (pct < 1) return `Customers get about ${shown}% of their spend back. That may feel out of reach; many shops give 2% to 10%.`;
  if (pct > 20) return `Customers get about ${shown}% of their spend back. That’s very generous; check it’s what you intend.`;
  return `Customers get about ${shown}% of their spend back.`;
}

/** The reward's state as one word for the list. */
export function rewardState(r: { active: boolean; stock: number | null }): 'off' | 'out_of_stock' | 'live' {
  if (!r.active) return 'off';
  if (r.stock !== null && r.stock <= 0) return 'out_of_stock';
  return 'live';
}
