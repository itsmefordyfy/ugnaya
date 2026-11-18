/** The Overview's date range from the URL (?range=7|30|90|custom&from=&to=). Days are UTC calendar days, inclusive. Pure. */

export const RANGE_PRESETS = ['7', '30', '90'] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number] | 'custom';
export type DateRange = { preset: RangePreset; from: string; to: string; days: number; error?: string };

/** The database refuses ranges longer than this (admin_dashboard: to - from > 730 days). */
export const MAX_RANGE_DAYS = 731;

const DAY = 86_400_000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A valid YYYY-MM-DD (a real calendar day), else null. */
export function parseDay(value: unknown): string | null {
  if (typeof value !== 'string' || !ISO_DAY.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== value) return null;
  return value;
}

export const todayUtc = (now: number = Date.now()): string => new Date(now).toISOString().slice(0, 10);

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
}

/** Inclusive day count: 2026-11-01 to 2026-11-07 is 7. */
export function dayCount(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY) + 1;
}

function preset(days: number, today: string, error?: string): DateRange {
  return { preset: String(days) as RangePreset, from: addDays(today, -(days - 1)), to: today, days, ...(error ? { error } : {}) };
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Defaults to the last 30 days. A broken custom range falls back to 30 days and says why. */
export function parseRange(params: Params, today: string = todayUtc()): DateRange {
  const range = one(params.range);
  if (range === '7' || range === '30' || range === '90') return preset(Number(range), today);
  if (range !== 'custom') return preset(30, today);

  const from = parseDay(one(params.from));
  const to = parseDay(one(params.to));
  if (!from || !to) return preset(30, today, 'Choose both a start and an end date.');
  if (from > to) return preset(30, today, 'The start date must be on or before the end date.');
  const days = dayCount(from, to);
  if (days > MAX_RANGE_DAYS) return preset(30, today, 'Choose a range of at most two years.');
  return { preset: 'custom', from, to, days };
}

/** Optional single-day filters (transactions, audit): UTC day bounds as ISO timestamps, end exclusive. */
export function dayBounds(from: unknown, to: unknown): { since: string | null; until: string | null } {
  const f = parseDay(from);
  const t = parseDay(to);
  return { since: f ? `${f}T00:00:00Z` : null, until: t ? `${addDays(t, 1)}T00:00:00Z` : null };
}
