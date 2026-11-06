# staff-unlock

A cashier types their PIN on a shared counter device.

- **Auth:** the device's own session (an anonymous Supabase user registered in `devices` by the owner).
- **Request:** `POST { "pin": "1234" }`
- **200:** `{ "staffGrant": "<token>", "staff": { "id", "displayName", "role" }, "expiresAt": "<ISO time>" }`.
  Keep the grant in memory for the shift (12 hours) and send it with every award, redeem and void.
- **Errors:** 401 `sign_in_required`; 403 `device_not_allowed` (not a registered or a revoked device);
  403 `staff_not_allowed` (wrong PIN, or the person isn't assigned to this branch); 429 `device_locked`
  (five wrong PINs in a row lock the device for 15 minutes, against guessing); 500 `misconfigured`.
