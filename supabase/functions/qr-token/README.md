# qr-token

Makes what the customer's QR codes carry.

- **Auth:** a signed-in customer (not anonymous, with a `customer_profiles` row).
- `POST { "action": "device-secret", "label"?: "Maria's phone" }` → `{ "memberId", "secretBase32" }`.
  Called once per phone after sign-in. The app stores the secret in the Keychain / Keystore and shows
  `U:<memberId>:<6-digit TOTP>` (RFC 6238, SHA-1, 30-second step), refreshing every 30 seconds.
- `POST { "action": "web-code" }` → `{ "memberCode": "U:<memberId>:W<code>", "expiresAt" }`. For the web
  wallet: single use, 5 minutes.
- `POST { "action": "redemption", "rewardId": "<uuid>" }` → `{ "redemptionCode": "R:<token>", "expiresAt",
  "pointsCost", "rewardName" }`. Points are taken when the cashier scans it, not now.
- **Errors:** 401 `sign_in_required`; for `redemption`, 402 `insufficient_points`, 404 `reward_unavailable`,
  409 `monthly_cap`, `first_visit_only`.
