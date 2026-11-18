export type NumericMode = 'integer' | 'decimal';

/**
 * Keeps only digits, plus one decimal point in decimal mode. Applied on every change, so pasted
 * or hardware-keyboard text is filtered too.
 *
 * Commas are thousands separators ("1,250.50" → "1250.50") unless the text has no dot and ends in
 * a comma plus 1–2 digits, the decimal-comma style ("4,2" → "4.2").
 */
export function sanitizeNumeric(text: string, mode: NumericMode): string {
  if (mode === 'integer') return text.replace(/\D/g, '');
  const isDecimalComma = !text.includes('.') && /,\d{0,2}$/.test(text) && text.split(',').length === 2;
  const normalized = isDecimalComma ? text.replace(',', '.') : text.replace(/,/g, '');
  const [whole, ...fraction] = normalized.replace(/[^\d.]/g, '').split('.');
  return fraction.length > 0 ? `${whole}.${fraction.join('')}` : whole;
}
