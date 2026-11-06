# Edge Functions

Deno, deployed with `npm run functions:deploy`. Each folder: `index.ts` (wires `@supabase/server`),
`handler.ts` (the logic, tested), `README.md` (the contract). Shared code in `_shared/`, tests in
`tests/` (`npm run test:functions`: `deno lint`, `deno check`, `deno test`).

Errors are always `{ "error": "<code>" }` (plus `"detail"` for bad input) with these statuses:

| Status | Codes |
| --- | --- |
| 400 | `request_invalid`, `amount_invalid`, `pin_invalid`, `code_invalid` |
| 401 | `sign_in_required`, `grant_invalid` |
| 402 | `insufficient_points` |
| 403 | `merchant_inactive`, `staff_not_allowed`, `device_not_allowed`, `forbidden` |
| 404 | `customer_unknown`, `invalid_member_code`, `token_invalid`, `reward_unavailable` |
| 409 | `receipt_duplicate`, `token_used`, `monthly_cap`, `first_visit_only`, `void_window`, `not_voidable`, `already_registered`, `pin_taken` |
| 410 | `token_expired` |
| 429 | `daily_limit` |
| 500 | `misconfigured` (a secret is missing), `internal` |

Secrets (`npx supabase secrets set …`): `STAFF_GRANT_SECRET` (32+ random bytes, hex), `RESEND_API_KEY`,
`FOUNDER_EMAIL`. `SUPABASE_URL` and the keys are injected by Supabase.

| Function | Who calls it | Contract |
| --- | --- | --- |
| `staff-unlock` | business app, cashier mode | [staff-unlock/README.md](staff-unlock/README.md) |
| `award` | business app, cashier mode | [award/README.md](award/README.md) |
| `redeem` | business app, cashier mode | [redeem/README.md](redeem/README.md) |
| `void` | business app, cashier mode | [void/README.md](void/README.md) |
| `qr-token` | customer app and web wallet | [qr-token/README.md](qr-token/README.md) |
| `notify-merchant-signup` | database webhook | [notify-merchant-signup/README.md](notify-merchant-signup/README.md) |
