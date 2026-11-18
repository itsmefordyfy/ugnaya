/**
 * Voucher codes issued on this phone while the app is open. The server keeps only a hash of each code (it can't show one
 * again), so the code lives here until it expires (5 minutes) and My vouchers can reopen an unexpired one.
 */
export type IssuedVoucher = {
  key: string;
  code: string;
  rewardId: string;
  rewardName: string;
  merchant: string;
  pointsCost: number;
  expiresAt: string;
  issuedAt: string;
};

const vouchers = new Map<string, IssuedVoucher>();

const sameMoment = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) < 1000;

export function keepVoucher(voucher: Omit<IssuedVoucher, 'key'>): IssuedVoucher {
  const key = `${voucher.rewardId}|${Date.parse(voucher.expiresAt)}`;
  const kept = { ...voucher, key };
  vouchers.set(key, kept);
  return kept;
}

export function voucherByKey(key: string): IssuedVoucher | undefined {
  return vouchers.get(key);
}

/** The code for a voucher in My vouchers (matched by reward and expiry), if this phone issued it and it hasn't expired. */
export function findVoucher(rewardId: string, expiresAt: string, now = Date.now()): IssuedVoucher | undefined {
  for (const voucher of vouchers.values()) {
    if (voucher.rewardId === rewardId && sameMoment(voucher.expiresAt, expiresAt) && Date.parse(voucher.expiresAt) > now) return voucher;
  }
  return undefined;
}
