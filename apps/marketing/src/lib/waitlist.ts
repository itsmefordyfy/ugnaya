import { isEmail, normalizePhMobile } from '@ugnaya/rules';

export type WaitlistInput = { contact: string; kind: 'email' | 'mobile'; city?: string };

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

export function parseWaitlistForm(form: FormData): { ok: true; value: WaitlistInput } | { ok: false; error: string } {
  const contact = text(form, 'contact');
  const city = text(form, 'city').slice(0, 80);
  const withCity = (value: WaitlistInput): WaitlistInput => (city ? { ...value, city } : value);
  if (isEmail(contact) && contact.length <= 120) return { ok: true, value: withCity({ contact, kind: 'email' }) };
  const mobile = normalizePhMobile(contact);
  if (mobile) return { ok: true, value: withCity({ contact: mobile, kind: 'mobile' }) };
  return { ok: false, error: 'Enter an email address or a Philippine mobile number.' };
}
