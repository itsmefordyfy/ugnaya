/** Money is stored in centavos and shown in pesos; points are whole numbers. Display in the Philippines' conventions. */

const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PESO_WHOLE = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const NUMBER = new Intl.NumberFormat('en-PH');

/** ₱1,234.50, or ₱1,234 when `whole` and the amount has no centavos. */
export function formatPesos(centavos: number, { whole = false }: { whole?: boolean } = {}): string {
  return whole && centavos % 100 === 0 ? PESO_WHOLE.format(centavos / 100) : PESO.format(centavos / 100);
}

export const formatNumber = (n: number): string => NUMBER.format(n);

/** "1 point", "1,250 points". */
export const formatPoints = (n: number): string => `${NUMBER.format(n)} ${Math.abs(n) === 1 ? 'point' : 'points'}`;

/**
 * Pesos typed by a person ("1,250", "₱99.5", "120.00") to whole centavos, or null when it isn't an amount.
 * At most two decimals; never negative.
 */
export function parsePesos(input: string | null | undefined): number | null {
  const cleaned = String(input ?? '').replace(/[₱,\s]/g, '').replace(/^php/i, '');
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ''] = cleaned.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** Centavos to the plain pesos string an input shows ("1250.5" becomes "1250.50"). */
export const centavosToInput = (centavos: number | null | undefined): string =>
  centavos === null || centavos === undefined ? '' : (centavos / 100).toFixed(2).replace(/\.00$/, '');

const DATE = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' });
const DATE_TIME = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' });
const DAY = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });

/** Dates are shown in Philippine time, the same day boundary the database uses for daily limits. */
export const formatDate = (iso: string | null | undefined): string => (iso ? DATE.format(new Date(iso)) : '—');
export const formatDateTime = (iso: string | null | undefined): string => (iso ? DATE_TIME.format(new Date(iso)) : '—');
export const formatDay = (iso: string): string => DAY.format(new Date(iso));

/** A timestamptz to the value of an <input type="datetime-local"> in Philippine time (UTC+8, no daylight saving). */
export function toManilaInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(new Date(iso).getTime() + 8 * 3600_000);
  return date.toISOString().slice(0, 16);
}

/** The value of an <input type="datetime-local">, read as Philippine time, to an ISO timestamp; null when empty or invalid. */
export function fromManilaInput(value: string | null | undefined): string | null {
  const v = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const date = new Date(`${v}:00+08:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
