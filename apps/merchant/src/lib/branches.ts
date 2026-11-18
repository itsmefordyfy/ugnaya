import { parseHoursForm, type DayKey, type Hours } from './hours.ts';

export type BranchInput = {
  name: string;
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  active: boolean;
  hours: Hours;
};
export type BranchErrors = Partial<Record<'name' | 'address' | 'city' | 'lat' | 'lng', string>> & { hours?: Partial<Record<DayKey, string>> };

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

/** A coordinate typed by a person: a decimal within the range, at most 6 decimals (the column is numeric(9, 6)). */
function coordinate(value: string, limit: number): number | null | undefined {
  if (value === '') return null;
  if (!/^-?\d{1,3}(\.\d+)?$/.test(value)) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) > limit) return undefined;
  return Math.round(n * 1e6) / 1e6;
}

/** The branch form (merchant_branches: name 1 to 80, address up to 200, optional coordinates, hours). */
export function parseBranchForm(form: FormData): { ok: true; value: BranchInput } | { ok: false; errors: BranchErrors } {
  const errors: BranchErrors = {};
  const name = text(form, 'name');
  if (name.length < 1 || name.length > 80) errors.name = 'Enter a branch name (up to 80 characters), like “SM Naga” or “Main”.';
  const address = text(form, 'address');
  if (address.length > 200) errors.address = 'Keep the address under 200 characters.';
  const city = text(form, 'city');
  if (city.length > 80) errors.city = 'Keep the city under 80 characters.';
  const lat = coordinate(text(form, 'lat'), 90);
  const lng = coordinate(text(form, 'lng'), 180);
  if (lat === undefined) errors.lat = 'Latitude is a number from −90 to 90, like 13.6218.';
  if (lng === undefined) errors.lng = 'Longitude is a number from −180 to 180, like 123.1948.';
  if (lat !== undefined && lng !== undefined && (lat === null) !== (lng === null)) {
    errors[lat === null ? 'lat' : 'lng'] = 'Enter both latitude and longitude, or leave both empty.';
  }
  const hours = parseHoursForm(form);
  if (!hours.ok) errors.hours = hours.errors;

  if (Object.keys(errors).length > 0 || !hours.ok) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name, address: address || null, city: city || null, lat: lat ?? null, lng: lng ?? null,
      active: form.get('active') === 'on', hours: hours.value,
    },
  };
}
