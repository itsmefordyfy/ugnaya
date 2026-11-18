/** Formatting in the phone's locale, with the app's own words. */

const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

export function formatPoints(points: number): string {
  return integer.format(points);
}

/** "1 point", "1,250 points". */
export function pointsLabel(points: number): string {
  return `${formatPoints(points)} ${Math.abs(points) === 1 ? 'point' : 'points'}`;
}

/** "+25", "−120": the sign is part of the figure in histories. */
export function signedPoints(points: number): string {
  if (points > 0) return `+${formatPoints(points)}`;
  if (points < 0) return `−${formatPoints(Math.abs(points))}`;
  return '0';
}

/** Centavos as pesos: "₱1,250.00" ("₱1,250" for a whole amount). */
export function formatPesos(centavos: number): string {
  const whole = centavos % 100 === 0;
  return `₱${new Intl.NumberFormat(undefined, { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(centavos / 100)}`;
}

/** The earning rule in words: "1 point per ₱10", "2 points per visit". */
export function ruleText(rule: { type?: string | null; rule_type?: string | null; points_per_unit: number | null; unit_centavos: number | null; minimum_spend_centavos?: number | null }): string {
  const type = rule.type ?? rule.rule_type ?? 'per_peso';
  const points = rule.points_per_unit ?? 1;
  const minimum = rule.minimum_spend_centavos ? ` (minimum spend ${formatPesos(rule.minimum_spend_centavos)})` : '';
  if (type === 'per_visit') return `${pointsLabel(points)} per visit${minimum}`;
  if (type === 'stamps') return `1 stamp per visit${minimum}`;
  return `${pointsLabel(points)} per ${formatPesos(rule.unit_centavos ?? 100)}${minimum}`;
}

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${dateFormat.format(date)}, ${timeFormat.format(date)}`;
}

/** "Today, 3:20 PM", "Yesterday, 9:05 AM", "Nov 3, 3:20 PM", or with the year when it isn't this year. */
export function formatWhen(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const time = timeFormat.format(date);
  if (date.getTime() >= startOfToday) return `Today, ${time}`;
  if (date.getTime() >= startOfToday - 86_400_000) return `Yesterday, ${time}`;
  return `${date.getFullYear() === now.getFullYear() ? dayFormat.format(date) : dateFormat.format(date)}, ${time}`;
}

/** "350 m", "1.2 km", "12 km". */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/** "4:59" for a countdown. */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Time of day greeting for Home. */
export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
