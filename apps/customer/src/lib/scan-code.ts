/**
 * What the customer's scanner can read. A shop's store code (shown at the counter or on a poster) is `M:<merchant uuid>`; it
 * opens that shop. The customer's own member code (`U:…`) and a voucher (`R:…`) are for the cashier's scanner, so reading one
 * here says so instead of "not a UGNAYA code".
 */
export type ScanResult =
  | { kind: 'merchant'; merchantId: string }
  | { kind: 'member' }
  | { kind: 'voucher' }
  | { kind: 'unknown' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readScan(raw: string): ScanResult {
  const text = raw.trim();
  const merchant = /^M:(.+)$/.exec(text);
  if (merchant && UUID.test(merchant[1])) return { kind: 'merchant', merchantId: merchant[1].toLowerCase() };
  if (/^U:[A-HJ-NP-Z2-9]{8}:\S+$/.test(text)) return { kind: 'member' };
  if (/^R:[0-9a-f]{8,128}$/.test(text)) return { kind: 'voucher' };
  return { kind: 'unknown' };
}
