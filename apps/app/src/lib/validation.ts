import { isEmail } from '@ugnaya/rules';

export { isEmail } from '@ugnaya/rules';

// Business registration (the business form and its validation) moved to the merchant portal, apps/merchant (2026-11-07).

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

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
