/**
 * Operating hours, stored in merchant_branches.hours (jsonb) as one list of opening intervals per day:
 *
 *   { "mon": [{ "open": "08:00", "close": "20:00" }], "tue": [...], ..., "sun": [] }
 *
 * Times are 24-hour "HH:MM" in the branch's local time (Philippine time for now). An empty list means closed that
 * day. A day may have up to two intervals (a lunch break). `close` is always after `open` on the same day; a branch
 * open past midnight closes at 23:59 here (decision: the target shops are cafés and restaurants; overnight hours can
 * be added later without changing the shape). A null `hours` column means "not set yet", not "closed".
 */
export const DAYS = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
] as const;
export type DayKey = (typeof DAYS)[number]['key'];
export type Interval = { open: string; close: string };
export type Hours = Record<DayKey, Interval[]>;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const MAX_INTERVALS = 2;

export const emptyHours = (): Hours => ({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });

/** A sensible starting point for a new branch: 8 AM to 8 PM every day. */
export const defaultHours = (): Hours =>
  Object.fromEntries(DAYS.map((d) => [d.key, [{ open: '08:00', close: '20:00' }]])) as Hours;

/** Reads whatever is stored (possibly null, partial or malformed) into a complete, valid Hours, or null when unset. */
export function readHours(value: unknown): Hours | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const hours = emptyHours();
  for (const { key } of DAYS) {
    const list = source[key];
    if (!Array.isArray(list)) continue;
    hours[key] = list
      .filter((i): i is Interval => Boolean(i) && typeof i === 'object' && TIME.test((i as Interval).open) && TIME.test((i as Interval).close) && (i as Interval).open < (i as Interval).close)
      .slice(0, MAX_INTERVALS)
      .map((i) => ({ open: i.open, close: i.close }));
  }
  return hours;
}

/**
 * The hours part of the branch form: for each day `<day>_closed` (checkbox), `<day>_open_<n>` and `<day>_close_<n>`
 * for n = 0, 1. A second interval left empty is ignored. Intervals must not overlap.
 */
export function parseHoursForm(form: FormData): { ok: true; value: Hours } | { ok: false; errors: Partial<Record<DayKey, string>> } {
  const hours = emptyHours();
  const errors: Partial<Record<DayKey, string>> = {};
  for (const { key, label } of DAYS) {
    if (form.get(`${key}_closed`) === 'on') continue;
    const intervals: Interval[] = [];
    for (let n = 0; n < MAX_INTERVALS; n++) {
      const open = String(form.get(`${key}_open_${n}`) ?? '').trim();
      const close = String(form.get(`${key}_close_${n}`) ?? '').trim();
      if (!open && !close) continue;
      if (!TIME.test(open) || !TIME.test(close)) {
        errors[key] = `${label}: enter both an opening and a closing time.`;
        break;
      }
      if (close <= open) {
        errors[key] = `${label}: closing time must be after opening time.`;
        break;
      }
      intervals.push({ open, close });
    }
    if (errors[key]) continue;
    intervals.sort((a, b) => a.open.localeCompare(b.open));
    if (intervals.length === 2 && intervals[1].open < intervals[0].close) {
      errors[key] = `${label}: the two time ranges overlap.`;
      continue;
    }
    if (intervals.length === 0) {
      errors[key] = `${label}: add opening hours or mark the day closed.`;
      continue;
    }
    hours[key] = intervals;
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: hours };
}

/** "8:00 AM–8:00 PM" for one interval. */
export function formatInterval({ open, close }: Interval): string {
  const t = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    const suffix = h < 12 ? 'AM' : 'PM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
  };
  return `${t(open)}–${t(close)}`;
}

export const formatDay = (intervals: Interval[]): string => (intervals.length === 0 ? 'Closed' : intervals.map(formatInterval).join(', '));

/**
 * A short summary for a list: consecutive days with the same hours are grouped ("Mon–Fri 8:00 AM–8:00 PM; Sat–Sun Closed").
 */
export function summarizeHours(hours: Hours | null): string {
  if (!hours) return 'Hours not set';
  const parts: string[] = [];
  let start = 0;
  for (let i = 1; i <= DAYS.length; i++) {
    const same = i < DAYS.length && formatDay(hours[DAYS[i].key]) === formatDay(hours[DAYS[start].key]);
    if (!same) {
      const range = i - 1 === start ? DAYS[start].short : `${DAYS[start].short}–${DAYS[i - 1].short}`;
      parts.push(`${range} ${formatDay(hours[DAYS[start].key])}`);
      start = i;
    }
  }
  return parts.length === 1 && parts[0].startsWith('Mon–Sun') ? `Every day ${formatDay(hours.mon)}` : parts.join('; ');
}
