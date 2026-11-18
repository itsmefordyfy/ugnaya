/** Number and money formatting for the portal. Pure and locale-fixed (en grouping), so server output is stable and tested. */

const GROUPED = new Intl.NumberFormat('en-US');
const TWO_DECIMALS = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "₱1,234.50" from 123450 centavos. Money is stored in integer centavos everywhere; never pass pesos here. */
export function formatPeso(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined || !Number.isFinite(centavos)) return '—';
  const sign = centavos < 0 ? '-' : '';
  return `${sign}₱${TWO_DECIMALS.format(Math.abs(Math.round(centavos)) / 100)}`;
}

/** "12,345". Null or not a number shows a dash, never a misleading zero. */
export function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  return GROUPED.format(Number(n));
}

/** "1,200 pts". Points are never money. A signed variant shows "+50" / "-20" for adjustments. */
export function formatPoints(n: number | null | undefined, { signed = false }: { signed?: boolean } = {}): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  const value = Number(n);
  const sign = signed && value > 0 ? '+' : '';
  return `${sign}${GROUPED.format(value)} pts`;
}

/** "42.5%" from a 0..1 ratio, or a dash. */
export function formatPercent(ratio: number | null | undefined, digits = 1): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(Number(ratio))) return '—';
  return `${(Number(ratio) * 100).toFixed(digits)}%`;
}

/** Pesos typed in a form ("399", "1,999.50") to integer centavos, or null when it isn't a valid amount. */
export function pesosToCentavos(input: string): number | null {
  const cleaned = input.replace(/[₱,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ''] = cleaned.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** "Cafe", "Milk tea", "Pending verification": a database code as words. */
export const humanize = (code: string | null | undefined): string =>
  code ? code.replace(/[_.]/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '—';

/** Whole days between an ISO time and now (for "waiting 3 days"). */
export function daysSince(iso: string, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000));
}

const DAY_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const SHORT_DAY_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** A calendar day ("2026-11-07", a UTC bucket or a plan date) as "Nov 7, 2026". Never shifted into a time zone. */
export function formatDay(day: string | null | undefined, { short = false }: { short?: boolean } = {}): string {
  if (!day) return '—';
  const time = Date.parse(day.length === 10 ? `${day}T00:00:00Z` : day);
  if (Number.isNaN(time)) return '—';
  return (short ? SHORT_DAY_FORMAT : DAY_FORMAT).format(time);
}
