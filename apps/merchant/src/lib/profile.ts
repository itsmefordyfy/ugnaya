import { isEmail, normalizePhMobile } from '@ugnaya/rules';

export type ProfileInput = {
  trade_name: string;
  legal_name: string | null;
  description: string | null;
  address: string | null;
  city: string;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  owner_mobile: string | null;
};
export type ProfileErrors = Partial<Record<keyof ProfileInput, string>>;

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const optional = (value: string) => (value === '' ? null : value);

/** A web address people type ("kapenijuan.ph", "https://…") as a full https URL, or null when it isn't one. */
export function normalizeWebsite(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes('.') || (url.protocol !== 'https:' && url.protocol !== 'http:')) return null;
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

/**
 * The business profile form. Limits follow the columns' checks (description 500, contact email 120, phone 20,
 * website 200). Customers see the trade name, description, address, city and logo in the app; the rest is for UGNAYA.
 */
export function parseProfileForm(form: FormData): { ok: true; value: ProfileInput } | { ok: false; errors: ProfileErrors } {
  const errors: ProfileErrors = {};
  const tradeName = text(form, 'trade_name');
  if (tradeName.length < 2 || tradeName.length > 80) errors.trade_name = 'Enter the name customers know you by (2 to 80 characters).';
  const legalName = text(form, 'legal_name');
  if (legalName.length > 120) errors.legal_name = 'Keep the registered name under 120 characters.';
  const description = text(form, 'description');
  if (description.length > 500) errors.description = 'Keep the description under 500 characters.';
  const address = text(form, 'address');
  if (address.length > 200) errors.address = 'Keep the address under 200 characters.';
  const city = text(form, 'city');
  if (city.length < 2 || city.length > 80) errors.city = 'Enter the city.';
  const contactEmail = text(form, 'contact_email');
  if (contactEmail && (!isEmail(contactEmail) || contactEmail.length > 120)) errors.contact_email = 'Enter a valid email address.';
  const contactPhone = text(form, 'contact_phone');
  if (contactPhone && !/^[+(\d][\d\s()-]{5,19}$/.test(contactPhone)) errors.contact_phone = 'Enter a phone number (digits, spaces and + only, up to 20).';
  const websiteRaw = text(form, 'website');
  const website = normalizeWebsite(websiteRaw);
  if (websiteRaw && (!website || website.length > 200)) errors.website = 'Enter a web address like kapenijuan.ph.';
  const mobileRaw = text(form, 'owner_mobile');
  const ownerMobile = mobileRaw ? normalizePhMobile(mobileRaw) : null;
  if (mobileRaw && !ownerMobile) errors.owner_mobile = 'Enter a Philippine mobile number, like 0917 123 4567.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      trade_name: tradeName, legal_name: optional(legalName), description: optional(description), address: optional(address),
      city, contact_email: optional(contactEmail), contact_phone: optional(contactPhone), website, owner_mobile: ownerMobile,
    },
  };
}
