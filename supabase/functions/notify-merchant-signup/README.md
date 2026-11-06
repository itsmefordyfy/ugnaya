# notify-merchant-signup

Emails the founder when a merchant registers on the website, through Resend.

- **Called by:** a database webhook (Database → Webhooks): table `merchants`, event INSERT, type
  "Supabase Edge Functions", function `notify-merchant-signup`, with an HTTP header
  **`apikey: <the project's secret key>`** (`sb_secret_…`, from Project Settings → API keys). The
  function runs in `@supabase/server`'s `secret` mode, which reads the `apikey` header only and does
  not accept the legacy service-role JWT. `verify_jwt = false` in `supabase/config.toml`.
- **Request:** Supabase's webhook payload `{ "type": "INSERT", "table": "merchants", "record": { … } }`.
- **200:** `{ "sent": true }`, or `{ "sent": false, "reason": "no_api_key" | "no_founder_email" | "resend_<status>" | "resend_unreachable" }`.
  It never fails the webhook: sign-up doesn't depend on the email.
- **Errors:** 400 for any other payload; 401 without the secret key.
- **Secrets:** `RESEND_API_KEY`, `FOUNDER_EMAIL`. The sender is `noreply@ugnaya.ph`, so `ugnaya.ph` must be
  verified in Resend.
