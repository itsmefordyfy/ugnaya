/** Labels and URL filters for the transactions and customers lists. Pure, so it is tested. */

export const TRANSACTION_TYPES = [
  { value: 'award', label: 'Points awarded' },
  { value: 'redeem', label: 'Reward redeemed' },
  { value: 'void', label: 'Void' },
  { value: 'adjustment', label: 'Adjustment' },
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number]['value'];

export const typeLabel = (type: string): string => TRANSACTION_TYPES.find((t) => t.value === type)?.label ?? type;

const first = (v: string | string[] | undefined): string => String((Array.isArray(v) ? v[0] : v) ?? '').trim();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ?type= is one of the four types or nothing. */
export function parseType(v: string | string[] | undefined): TransactionType | null {
  const t = first(v);
  return TRANSACTION_TYPES.some((x) => x.value === t) ? (t as TransactionType) : null;
}

/** ?branch= is a branch id (a uuid) or nothing; anything else is ignored rather than sent to the database. */
export function parseBranch(v: string | string[] | undefined): string | null {
  const b = first(v);
  return UUID.test(b) ? b.toLowerCase() : null;
}

/** ?q= search text, trimmed and capped. */
export function parseSearch(v: string | string[] | undefined): string {
  return first(v).slice(0, 80);
}

/** Points with a sign: "+12", "−60", "0". */
export function signedPoints(points: number): string {
  if (points > 0) return `+${points.toLocaleString('en-PH')}`;
  if (points < 0) return `−${Math.abs(points).toLocaleString('en-PH')}`;
  return '0';
}

/** Rows from merchant_customers / merchant_transactions (jsonb): read defensively. */
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {});
const num = (v: unknown): number => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : 0);
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

export type CustomerRow = { memberId: string; name: string | null; balance: number; lifetimeEarned: number; joinedAt: string | null; lastActivityAt: string | null; visits: number };
export type TransactionRow = {
  id: string; createdAt: string | null; type: string; status: string; amountCentavos: number | null; receiptNo: string | null;
  reason: string | null; branch: string | null; staff: string | null; memberId: string | null; points: number;
};

export function readPage<T>(raw: unknown, row: (r: Obj) => T): { total: number; rows: T[] } {
  const page = obj(raw);
  return { total: num(page.total), rows: Array.isArray(page.rows) ? page.rows.map((r) => row(obj(r))) : [] };
}

export const readCustomer = (r: Obj): CustomerRow => ({
  memberId: str(r.member_id) ?? '—', name: str(r.name), balance: num(r.balance), lifetimeEarned: num(r.lifetime_earned),
  joinedAt: str(r.joined_at), lastActivityAt: str(r.last_activity_at), visits: num(r.visits),
});

export const readTransaction = (r: Obj): TransactionRow => ({
  id: str(r.id) ?? '', createdAt: str(r.created_at), type: str(r.type) ?? '', status: str(r.status) ?? 'completed',
  amountCentavos: r.amount_centavos === null || r.amount_centavos === undefined ? null : num(r.amount_centavos),
  receiptNo: str(r.receipt_no), reason: str(r.reason), branch: str(r.branch), staff: str(r.staff), memberId: str(r.member_id), points: num(r.points),
});
