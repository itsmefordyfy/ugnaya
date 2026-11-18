import { pointsForPurchase, type EarningRule } from '@ugnaya/rules';
import { formatPesos, parsePesos } from './format.ts';

/**
 * The merchant's own earning rule (loyalty_programs, scope 'merchant'). The SQL function points_for_amount is the
 * authority at the counter; pointsForPurchase in @ugnaya/rules mirrors it, so the example here matches what the
 * counter will award. Only the owner may change it (RLS); a changed rule is a new version and past points keep theirs.
 */
export type RuleType = 'per_peso' | 'per_visit' | 'stamps';

export const RULE_TYPES: readonly { value: RuleType; label: string; explain: string }[] = [
  { value: 'per_peso', label: 'Points for every peso spent', explain: 'Customers earn points in proportion to what they spend, for example 1 point for every ₱10.' },
  { value: 'per_visit', label: 'Points per visit', explain: 'Every qualifying purchase earns the same number of points, whatever the amount.' },
  { value: 'stamps', label: 'Stamp card', explain: 'Every qualifying purchase earns one stamp, like a paper card. Rewards cost a number of stamps.' },
];

export type ProgramInput = {
  name: string;
  ruleType: RuleType;
  pointsPerUnit: number;
  unitCentavos: number;
  minimumSpendCentavos: number;
  /** null: points never expire. */
  expiryMonths: number | null;
  active: boolean;
};

export type ProgramFieldErrors = Partial<Record<keyof ProgramInput, string>>;

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

export function isRuleType(value: unknown): value is RuleType {
  return value === 'per_peso' || value === 'per_visit' || value === 'stamps';
}

/** Reads the program form. Fields a rule doesn't use keep their stored value (passed in `current`). */
export function parseProgramForm(
  form: FormData,
  current: { pointsPerUnit: number; unitCentavos: number },
): { ok: true; value: ProgramInput } | { ok: false; errors: ProgramFieldErrors } {
  const errors: ProgramFieldErrors = {};
  const name = text(form, 'name');
  if (name.length < 2 || name.length > 80) errors.name = 'Name the program (2 to 80 characters), for example “Kape ni Juan points”.';
  const ruleType = text(form, 'ruleType');
  if (!isRuleType(ruleType)) errors.ruleType = 'Choose how customers earn.';

  let pointsPerUnit = current.pointsPerUnit;
  let unitCentavos = current.unitCentavos;
  if (ruleType === 'per_peso' || ruleType === 'per_visit') {
    const points = Number(text(form, 'pointsPerUnit'));
    if (!Number.isInteger(points) || points < 1 || points > 10000) errors.pointsPerUnit = 'Enter a whole number of points from 1 to 10,000.';
    else pointsPerUnit = points;
  }
  if (ruleType === 'per_peso') {
    const unit = parsePesos(text(form, 'unitPesos'));
    if (unit === null || unit < 100 || unit > 100000000) errors.unitCentavos = 'Enter an amount of at least ₱1.';
    else unitCentavos = unit;
  }
  const minimumRaw = text(form, 'minimumSpendPesos');
  const minimum = minimumRaw === '' ? 0 : parsePesos(minimumRaw);
  if (minimum === null) errors.minimumSpendCentavos = 'Enter the minimum in pesos, or leave it empty for none.';

  const expiryRaw = text(form, 'expiryMonths');
  let expiryMonths: number | null = null;
  if (expiryRaw !== '' && expiryRaw !== 'never') {
    const months = Number(expiryRaw);
    if (!Number.isInteger(months) || months < 1 || months > 36) errors.expiryMonths = 'Choose 1 to 36 months, or “Never”.';
    else expiryMonths = months;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name, ruleType: ruleType as RuleType, pointsPerUnit, unitCentavos,
      minimumSpendCentavos: minimum ?? 0, expiryMonths, active: form.get('active') === 'on',
    },
  };
}

/** The rule in the shape the shared maths takes. */
export function earningRule(p: Pick<ProgramInput, 'ruleType' | 'pointsPerUnit' | 'unitCentavos' | 'minimumSpendCentavos'>): EarningRule {
  switch (p.ruleType) {
    case 'per_peso':
      return { kind: 'per_peso', pointsPerUnit: p.pointsPerUnit, unitCentavos: p.unitCentavos, minimumSpendCentavos: p.minimumSpendCentavos };
    case 'per_visit':
      return { kind: 'per_visit', points: p.pointsPerUnit, minimumSpendCentavos: p.minimumSpendCentavos };
    case 'stamps':
      return { kind: 'stamps', minimumSpendCentavos: p.minimumSpendCentavos };
  }
}

/** What the counter awards for one purchase, or null when the rule isn't complete enough to compute. */
export function examplePoints(p: Pick<ProgramInput, 'ruleType' | 'pointsPerUnit' | 'unitCentavos' | 'minimumSpendCentavos'>, amountCentavos: number): number | null {
  try {
    return pointsForPurchase(earningRule(p), amountCentavos);
  } catch {
    return null;
  }
}

const unitWord = (ruleType: RuleType, n: number) =>
  ruleType === 'stamps' ? (n === 1 ? 'stamp' : 'stamps') : n === 1 ? 'point' : 'points';

/** The rule in one plain sentence. */
export function describeRule(p: Pick<ProgramInput, 'ruleType' | 'pointsPerUnit' | 'unitCentavos' | 'minimumSpendCentavos'>): string {
  const minimum = p.minimumSpendCentavos > 0 ? ` on purchases of ${formatPesos(p.minimumSpendCentavos, { whole: true })} or more` : '';
  switch (p.ruleType) {
    case 'per_peso':
      return `Customers earn ${p.pointsPerUnit} ${unitWord('per_peso', p.pointsPerUnit)} for every ${formatPesos(p.unitCentavos, { whole: true })} spent${minimum}. Partial amounts don’t round up.`;
    case 'per_visit':
      return `Customers earn ${p.pointsPerUnit} ${unitWord('per_visit', p.pointsPerUnit)} each time they buy${minimum}, whatever the amount.`;
    case 'stamps':
      return `Customers earn 1 stamp each time they buy${minimum}.`;
  }
}

/** "₱250 earns 25 points." for a sample purchase, or why it earns nothing. */
export function describeExample(p: Pick<ProgramInput, 'ruleType' | 'pointsPerUnit' | 'unitCentavos' | 'minimumSpendCentavos'>, amountCentavos: number): string {
  const points = examplePoints(p, amountCentavos);
  const amount = formatPesos(amountCentavos, { whole: true });
  if (points === null) return 'Fill in the rule to see an example.';
  if (points === 0 && amountCentavos < p.minimumSpendCentavos) return `A ${amount} purchase earns nothing: it’s below the ${formatPesos(p.minimumSpendCentavos, { whole: true })} minimum.`;
  return `A ${amount} purchase earns ${points.toLocaleString('en-PH')} ${unitWord(p.ruleType, points)}.`;
}

export function describeExpiry(months: number | null): string {
  if (months === null) return 'Points never expire.';
  return `Points expire if a customer doesn’t earn or redeem here for ${months} ${months === 1 ? 'month' : 'months'}.`;
}

export const EXPIRY_OPTIONS = [
  { value: 'never', label: 'Never' },
  ...[3, 6, 9, 12, 18, 24, 36].map((m) => ({ value: String(m), label: `${m} months without a visit` })),
];
