/** A Philippine mobile number in E.164 (+639XXXXXXXXX), or null when it isn't one. */
export function normalizePhMobile(input: string): string | null {
  const digits = input.replace(/[\s\-.()]/g, '').replace(/^\+/, '');
  if (!/^\d+$/.test(digits)) return null;
  let national: string;
  if (digits.startsWith('63') && digits.length === 12) national = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 11) national = digits.slice(1);
  else if (digits.length === 10) national = digits;
  else return null;
  return national.startsWith('9') ? `+63${national}` : null;
}
