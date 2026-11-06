# award

The cashier scanned a member QR and typed the purchase amount.

- **Auth:** the device session, plus the staff grant from `staff-unlock`.
- **Request:** `POST { "idempotencyKey": "<new uuid per attempt>", "staffGrant", "memberCode": "U:AB2CD3EF:287082",
  "amountCentavos": 20000, "receiptNo"?: "OR-10293" }`. Reuse the same `idempotencyKey` when retrying the same
  purchase after a dropped connection: the answer is the first one, with `"replayed": true`.
- **200:** `{ "transaction_id", "replayed", "merchant": { "program_id", "points_earned", "balance" },
  "network": { "points_earned", "balance", "available_at" } | null }`.
- **Errors:** 401 `grant_invalid`; 404 `invalid_member_code`, `customer_unknown`; 400 `amount_invalid`
  (0, or above the merchant's per-transaction maximum); 409 `receipt_duplicate`; 429 `daily_limit`
  (3 awards per customer per day at this merchant); 403 `merchant_inactive`, `staff_not_allowed`, `device_not_allowed`.
