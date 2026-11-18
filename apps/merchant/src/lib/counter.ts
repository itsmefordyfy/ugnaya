import { parseMemberCode, parseRedemptionCode } from '@ugnaya/rules';
import { friendlyError } from './errors.ts';
import { parsePesos } from './format.ts';

/**
 * The web counter's rules, kept pure so they can be tested: reading the award and redeem forms, and turning what
 * counter_award / counter_redeem answer into what the cashier sees. The database decides; these only catch typing
 * mistakes early and phrase the answer.
 */

/** One key per form submission (a UUID from the browser); the database answers a repeat with the first result. */
const KEY = /^[A-Za-z0-9-]{8,100}$/;
export const isIdempotencyKey = (value: unknown): value is string => typeof value === 'string' && KEY.test(value);

/** What a cashier typed or scanned, tidied: `u:abcd2345:123456` becomes `U:ABCD2345:123456` (the web code keeps its case). */
export function normalizeMemberCode(input: string): string {
  const parts = input.trim().replace(/\s+/g, '').split(':');
  if (parts.length !== 3) return input.trim();
  const [prefix, memberId, code] = parts;
  return `${prefix.toUpperCase()}:${memberId.toUpperCase()}:${code}`;
}

/** A voucher code is `R:<hex token>`; a bare token is accepted too (the code under the customer's QR). */
export function normalizeVoucherCode(input: string): string {
  const v = input.trim().replace(/\s+/g, '');
  if (/^[rR]:/.test(v)) return `R:${v.slice(2).toLowerCase()}`;
  if (/^[0-9a-fA-F]{8,128}$/.test(v)) return `R:${v.toLowerCase()}`;
  return v;
}

/** Whether a scanned value is the kind of code this form expects (so the camera ignores anything else). */
export const looksLikeMemberCode = (raw: string): boolean => parseMemberCode(normalizeMemberCode(raw)) !== null;
export const looksLikeVoucherCode = (raw: string): boolean => parseRedemptionCode(normalizeVoucherCode(raw)) !== null;

export type AwardInput = { branchId: string; memberCode: string; amountCentavos: number; receiptNo: string | null; idempotencyKey: string };
export type RedeemInput = { branchId: string; code: string; idempotencyKey: string };
export type Parsed<T> = { ok: true; value: T } | { ok: false; fieldErrors: Record<string, string>; error?: string };

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

/** The largest single purchase the counter takes unless the business's own limit is lower (merchant_limits default). */
export const MAX_AWARD_CENTAVOS = 3_000_000;

export function parseAwardForm(form: FormData): Parsed<AwardInput> {
  const fieldErrors: Record<string, string> = {};
  const branchId = text(form, 'branchId');
  const memberCode = normalizeMemberCode(text(form, 'memberCode'));
  if (!parseMemberCode(memberCode)) fieldErrors.memberCode = 'Scan the customer’s QR, or type the code under it (U:XXXXXXXX:123456).';
  const amountCentavos = parsePesos(text(form, 'amount'));
  if (amountCentavos === null || amountCentavos <= 0) fieldErrors.amount = 'Enter the amount spent in pesos, like 250 or 99.50.';
  else if (amountCentavos > MAX_AWARD_CENTAVOS) fieldErrors.amount = 'That’s more than ₱30,000 for one purchase. Check the amount.';
  const receipt = text(form, 'receiptNo');
  if (receipt.length > 40) fieldErrors.receiptNo = 'Keep the receipt number under 40 characters.';
  const idempotencyKey = text(form, 'idempotencyKey');
  if (!branchId || !isIdempotencyKey(idempotencyKey)) return { ok: false, fieldErrors, error: 'Choose your branch, then try again.' };
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, value: { branchId, memberCode, amountCentavos: amountCentavos as number, receiptNo: receipt || null, idempotencyKey } };
}

export function parseRedeemForm(form: FormData): Parsed<RedeemInput> {
  const branchId = text(form, 'branchId');
  const code = normalizeVoucherCode(text(form, 'voucherCode'));
  const idempotencyKey = text(form, 'idempotencyKey');
  if (!branchId || !isIdempotencyKey(idempotencyKey)) return { ok: false, fieldErrors: {}, error: 'Choose your branch, then try again.' };
  if (!parseRedemptionCode(code)) return { ok: false, fieldErrors: { voucherCode: 'Scan the voucher QR in the customer’s app, or type the code (R:…).' } };
  return { ok: true, value: { branchId, code, idempotencyKey } };
}

export type AwardOutcome = {
  kind: 'award';
  transactionId: string;
  replayed: boolean;
  pointsEarned: number;
  balance: number | null;
  network: { pointsEarned: number; availableAt: string } | null;
};
export type RedeemOutcome = { kind: 'redeem'; transactionId: string; replayed: boolean; rewardName: string; pointsCost: number; balance: number };
export type ErrorOutcome = { kind: 'error'; code: string; message: string; nextStep: string };
export type CounterOutcome = AwardOutcome | RedeemOutcome | ErrorOutcome;

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

/** counter_award's jsonb (AwardResult in @ugnaya/db), read defensively. */
export function awardOutcome(result: unknown): AwardOutcome {
  const r = obj(result) ?? {};
  const merchant = obj(r.merchant);
  const network = obj(r.network);
  return {
    kind: 'award',
    transactionId: str(r.transaction_id),
    replayed: r.replayed === true,
    pointsEarned: num(merchant?.points_earned),
    balance: merchant ? num(merchant.balance) : null,
    network: network ? { pointsEarned: num(network.points_earned), availableAt: str(network.available_at) } : null,
  };
}

/** counter_redeem's jsonb (RedeemResult in @ugnaya/db), read defensively. */
export function redeemOutcome(result: unknown): RedeemOutcome {
  const r = obj(result) ?? {};
  return {
    kind: 'redeem',
    transactionId: str(r.transaction_id),
    replayed: r.replayed === true,
    rewardName: str(r.reward_name, 'the reward'),
    pointsCost: num(r.points_cost),
    balance: num(r.balance),
  };
}

/** The one thing to do next for each refusal, said at the counter with a customer waiting. */
const NEXT_STEP: Record<string, string> = {
  invalid_member_code: 'Ask the customer to refresh their QR code, then scan again.',
  customer_unknown: 'Ask the customer to open the UGNAYA app and check they’re signed in.',
  token_invalid: 'Check the code, or ask the customer to show the voucher again.',
  token_expired: 'Ask the customer to claim the reward again in their app.',
  token_used: 'Don’t hand the reward over again. Check the transactions list if unsure.',
  insufficient_points: 'The customer can choose a smaller reward, or earn more points first.',
  monthly_cap: 'Offer another reward this month.',
  reward_unavailable: 'Offer another reward.',
  first_visit_only: 'Offer another reward.',
  daily_limit: 'No points can be added today. They can earn again tomorrow.',
  receipt_duplicate: 'Check the receipt number, or leave it blank.',
  amount_invalid: 'Check the amount and try again.',
  merchant_inactive: 'Ask the owner to check the loyalty program and the application status.',
  staff_not_allowed: 'Choose a branch you work at, or ask the owner to add you to this branch.',
  forbidden: 'Ask the owner to check your staff access.',
};

export function errorOutcome(error: { message?: string; code?: string } | null | undefined): ErrorOutcome {
  const code = error?.message ?? 'unknown';
  return { kind: 'error', code, message: friendlyError(error), nextStep: NEXT_STEP[code] ?? 'Try again. If it keeps happening, ask the owner.' };
}
