import { isEmail, normalizePhMobile } from '@ugnaya/rules';

export { isEmail, normalizePhMobile as normalizeMobile } from '@ugnaya/rules';

export const CATEGORIES = [
  { value: 'cafe', label: 'Café or coffee shop' },
  { value: 'milk_tea', label: 'Milk tea or dessert shop' },
  { value: 'restaurant', label: 'Restaurant or eatery' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'other_food', label: 'Other food business' },
  { value: 'other', label: 'Other' },
] as const;
export type Category = (typeof CATEGORIES)[number]['value'];

export const HEARD_FROM = [
  { value: 'visit', label: 'Visited by UGNAYA' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'referral', label: 'A friend or another shop' },
  { value: 'other', label: 'Other' },
] as const;

export type RegisterInput = {
  tradeName: string;
  category: Category;
  city: string;
  address: string;
  branchCount: number;
  ownerMobile: string;
  heardFrom: string;
  acceptTerms: true;
  marketingConsent: boolean;
};

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

export function parseRegisterForm(form: FormData):
  | { ok: true; value: RegisterInput }
  | { ok: false; errors: FieldErrors<RegisterInput> } {
  const errors: FieldErrors<RegisterInput> = {};
  const tradeName = text(form, 'tradeName');
  if (tradeName.length < 2 || tradeName.length > 80) errors.tradeName = 'Enter your business name (2 to 80 characters).';
  const category = text(form, 'category');
  if (!CATEGORIES.some((c) => c.value === category)) errors.category = 'Choose what kind of business it is.';
  const city = text(form, 'city');
  if (city.length < 2 || city.length > 80) errors.city = 'Enter the city.';
  const address = text(form, 'address');
  if (address.length > 200) errors.address = 'Keep the address under 200 characters.';
  const branchCount = Number(text(form, 'branchCount'));
  if (!Number.isInteger(branchCount) || branchCount < 1 || branchCount > 50) errors.branchCount = 'Enter a number of branches from 1 to 50.';
  const ownerMobile = normalizePhMobile(text(form, 'ownerMobile'));
  if (!ownerMobile) errors.ownerMobile = 'Enter a Philippine mobile number, like 0917 123 4567.';
  const heardFrom = text(form, 'heardFrom').slice(0, 80);
  if (form.get('acceptTerms') !== 'on') errors.acceptTerms = 'Please accept the Merchant Terms and Privacy Policy to register.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      tradeName, category: category as Category, city, address, branchCount,
      ownerMobile: ownerMobile as string, heardFrom, acceptTerms: true,
      marketingConsent: form.get('marketingConsent') === 'on',
    },
  };
}

export type SignUpInput = { fullName: string; email: string; password: string };

export function parseSignUpForm(form: FormData):
  | { ok: true; value: SignUpInput }
  | { ok: false; errors: FieldErrors<SignUpInput> } {
  const errors: FieldErrors<SignUpInput> = {};
  const fullName = text(form, 'fullName');
  if (fullName.length < 2 || fullName.length > 80) errors.fullName = 'Enter your name.';
  const email = text(form, 'email');
  if (!isEmail(email) || email.length > 120) errors.email = 'Enter a valid email address.';
  const password = String(form.get('password') ?? '');
  if (password.length < 8 || password.length > 72) errors.password = 'Use at least 8 characters.';
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { fullName, email, password } };
}

export function parseNewPassword(form: FormData): { ok: true; value: string } | { ok: false; error: string } {
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');
  if (password.length < 8 || password.length > 72) return { ok: false, error: 'Use at least 8 characters.' };
  if (password !== confirm) return { ok: false, error: 'The two passwords don’t match.' };
  return { ok: true, value: password };
}
