/** URL-driven lists (?q=&status=&page=). Pure. */

export const PAGE_SIZE = 25;

type Params = Record<string, string | string[] | undefined>;

/** The first value of a search param, trimmed, or '' . */
export const param = (params: Params, key: string): string => {
  const v = params[key];
  return (Array.isArray(v) ? v[0] ?? '' : v ?? '').trim();
};

/** One of the allowed values, else the fallback (so a hand-edited URL can't send anything else to the database). */
export function oneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Page number from the URL: a positive integer, else 1. */
export function parsePage(value: string): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 100_000 ? n : 1;
}

export const pageOffset = (page: number, size: number = PAGE_SIZE): number => (page - 1) * size;

export const lastPage = (total: number, size: number = PAGE_SIZE): number => Math.max(1, Math.ceil(total / size));

/** "/merchants?q=kape&status=active&page=2": empty values are left out, so links stay short. */
export function hrefWith(path: string, current: Record<string, string>, changes: Record<string, string | number | null> = {}): string {
  const merged: Record<string, string> = { ...current };
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === '') delete merged[key];
    else merged[key] = String(value);
  }
  // Page 1 is the default; changing a filter resets the page unless the change sets one.
  if (!('page' in changes)) delete merged.page;
  if (merged.page === '1') delete merged.page;
  const query = new URLSearchParams(Object.entries(merged).filter(([, v]) => v !== '')).toString();
  return query ? `${path}?${query}` : path;
}

/** Text for an ILIKE prefix filter, with % and _ taken literally. */
export const likePrefix = (text: string): string => `${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export const isUuid = (value: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
