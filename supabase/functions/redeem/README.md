# redeem

The cashier scanned a redemption QR the customer's app or web wallet showed.

- **Auth:** the device session, plus the staff grant.
- **Request:** `POST { "idempotencyKey", "staffGrant", "redemptionCode": "R:<token>" }`
- **200:** `{ "transaction_id", "replayed", "redemption_id", "reward_id", "reward_name", "points_cost", "balance" }`.
  Show `reward_name` big: it's what to hand over.
- **Errors:** 400 `code_invalid` (not an `R:` code); 404 `token_invalid` (unknown, or another merchant's reward);
  409 `token_used`; 410 `token_expired` (5 minutes); 402 `insufficient_points`; 401 `grant_invalid`.
