const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** A deliberately simple check (one @, a dot in the domain, no spaces). The confirmation email is the real test. */
export function isEmail(value: string): boolean {
  return EMAIL.test(value);
}
