/** Axis maths for the server-rendered SVG charts. Pure. */

/** A round ceiling for an axis: 0 -> 1, 7 -> 8, 43 -> 50, 1234 -> 1500. */
export function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (value <= step * base) return Math.max(1, Math.round(step * base * 1e6) / 1e6);
  }
  return 10 * base;
}

/** Evenly spaced gridline values from 0 to max (count intervals). Integers when max allows. */
export function ticks(max: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, i) => {
    const v = (max * i) / count;
    return max >= count ? Math.round(v) : Math.round(v * 100) / 100;
  });
}

/** Which bars get a date label under them, so labels never collide: about `maxLabels`, always the first and last. */
export function labelIndexes(length: number, maxLabels = 6): Set<number> {
  if (length <= 0) return new Set();
  if (length <= maxLabels) return new Set(Array.from({ length }, (_, i) => i));
  const step = Math.ceil((length - 1) / (maxLabels - 1));
  const set = new Set<number>();
  for (let i = 0; i < length; i += step) set.add(i);
  // Drop a label that would sit right next to the last one.
  for (const i of set) if (i !== length - 1 && length - 1 - i < step / 2) set.delete(i);
  set.add(length - 1);
  return set;
}
