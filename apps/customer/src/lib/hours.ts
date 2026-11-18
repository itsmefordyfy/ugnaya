/**
 * A branch's opening hours as lines to show. The merchant portal stores them as jsonb and their shape isn't fixed yet, so this
 * reads the shapes a portal would plausibly write (a note, a list of lines, a day-by-day map, a list of day objects) and
 * anything else as nothing rather than a wrong line.
 */

const DAYS: [string[], string][] = [
  [['mon', 'monday'], 'Mon'],
  [['tue', 'tues', 'tuesday'], 'Tue'],
  [['wed', 'wednesday'], 'Wed'],
  [['thu', 'thur', 'thurs', 'thursday'], 'Thu'],
  [['fri', 'friday'], 'Fri'],
  [['sat', 'saturday'], 'Sat'],
  [['sun', 'sunday'], 'Sun'],
];

const dayLabel = (key: string) => DAYS.find(([names]) => names.includes(key.toLowerCase()))?.[1] ?? null;
const dayIndex = (key: string) => DAYS.findIndex(([names]) => names.includes(key.toLowerCase()));

function span(value: unknown): string | null {
  if (value === null || value === false) return 'Closed';
  if (typeof value === 'string') return value.trim() ? value.trim().replace(/\s*-\s*/, '–') : null;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (record.closed === true) return 'Closed';
    const open = record.open ?? record.opens ?? record.from ?? record.start;
    const close = record.close ?? record.closes ?? record.to ?? record.end;
    if (typeof open === 'string' && typeof close === 'string') return `${open}–${close}`;
  }
  return null;
}

export function hoursLines(hours: unknown): string[] {
  if (typeof hours === 'string') return hours.trim() ? [hours.trim()] : [];
  if (Array.isArray(hours)) {
    return hours.flatMap((entry): string[] => {
      if (typeof entry === 'string') return entry.trim() ? [entry.trim()] : [];
      if (entry && typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        const day = record.day ?? record.days ?? record.label;
        const time = span(record);
        if (typeof day === 'string' && time) return [`${dayLabel(day) ?? day}: ${time}`];
      }
      return [];
    });
  }
  if (hours && typeof hours === 'object') {
    const record = hours as Record<string, unknown>;
    if (typeof record.note === 'string' && Object.keys(record).length === 1) return [record.note];
    return Object.entries(record)
      .filter(([key]) => dayIndex(key) >= 0)
      .sort(([a], [b]) => dayIndex(a) - dayIndex(b))
      .flatMap(([key, value]) => {
        const time = span(value);
        return time ? [`${dayLabel(key)}: ${time}`] : [];
      });
  }
  return [];
}
