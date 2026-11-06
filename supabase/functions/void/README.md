# void

A cashier voids one of their own transactions from the same counter device, within 12 hours.
Managers and owners void older transactions (up to 30 days) from owner mode, which calls
`void_transaction` through a later function; this one is cashier mode only.

- **Auth:** the device session, plus the staff grant.
- **Request:** `POST { "idempotencyKey", "staffGrant", "transactionId": "<uuid>", "reason": "wrong amount" }`
- **200:** `{ "transaction_id", "replayed", "voided_transaction_id", "balances": [{ "program_id", "balance" }], "written_off" }`.
  `written_off` > 0 means the customer had already spent some of those points; the balance stops at 0.
- **Errors:** 409 `void_window`, `not_voidable`; 400 `request_invalid` (no reason); 401 `grant_invalid`.
