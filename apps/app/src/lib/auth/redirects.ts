const BASE = 'https://same-site.invalid';

/**
 * A `next` parameter is followed only if it stays on this site (no open redirects). Browsers strip tabs and newlines
 * while parsing a URL, so "/\t/evil.example" would become "//evil.example": any control character or whitespace is
 * refused, and what remains must parse back to this same origin.
 */
export function safeNext(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  if (/[\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    if (new URL(value, BASE).origin !== BASE) return null;
  } catch {
    return null;
  }
  return value;
}
