# Setting up UGNAYA's Supabase project

One-time steps for the owner, in order. Project: `ohicvyappmccynchzukg`
(`https://ohicvyappmccynchzukg.supabase.co`). Run every command from the repo root. Use `npx supabase`,
not the Homebrew `supabase` (it crashes on this Mac). Nothing here goes into git: passwords and keys are
typed at the prompt or kept in gitignored files.

Each step says what it unlocks and how to check it.

## 1. Sign the CLI in

```bash
npx supabase login
```

Opens the browser. **Check:** `npx supabase projects list` shows `ohicvyappmccynchzukg`.

## 2. Link this repo to the project

```bash
npx supabase link --project-ref ohicvyappmccynchzukg
```

It asks for the **database password** (Project Settings → Database). **Check:** `supabase/.temp/project-ref`
contains the ref.

## 3. Create the database

```bash
npm run db:push        # supabase db push --remote
```

Applies the migrations in `supabase/migrations` (14 as of 2026-11-07, all pushed that day). The demo data in `supabase/seed.sql` is **not**
pushed (only `--include-seed` would push it; don't). **Check** in the SQL Editor:

```sql
select count(*) from loyalty_programs where scope = 'network';   -- 1
select count(*) from plan_limits;                                 -- 5
select relname from pg_class where relname = 'merchant_directory'; -- 1 row
```

## 4. Google sign-in (optional now, needed for "Continue with Google")

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → Web application.
2. Authorised JavaScript origins: `https://app.ugnaya.com`, `http://localhost:3001`.
3. Authorised redirect URI: `https://ohicvyappmccynchzukg.supabase.co/auth/v1/callback`.
4. Put the two values in `supabase/.env` (gitignored):

   ```
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=…apps.googleusercontent.com
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=…
   ```

5. Set `enabled = true` under `[auth.external.google]` in `supabase/config.toml` (it ships off, so step 5
   works before Google is set up).

## 5. Push the auth settings

```bash
npx supabase config diff     # review first
npx supabase config push
```

Sets the site URL (`https://app.ugnaya.com`), the allowed redirects (the app and admin origins, production and localhost), email
confirmation on, Google (when enabled), and anonymous sign-ins (shared cashier devices).

**The branded confirmation email is not pushed yet:** on the free plan with Supabase's built-in email sender,
Supabase refuses template changes (`Email template modification is not available for free tier projects using
the default email provider`), so the template is commented out in `config.toml`. Sign-up still works: the default
email's link carries a one-time code that `/auth/confirm` accepts (a link that returns the session after the `#` is
handled in the browser by `/auth/confirm/finish`). Open the link in the same browser you registered in. After
step 9 (custom SMTP with Resend), uncomment the template lines in `config.toml` and push again. **Check:** Authentication → URL Configuration shows `https://ugnaya.ph`; Authentication →
Sign In / Providers shows Email (confirm email on), Anonymous on.

## 6. Edge Function secrets

```bash
npx supabase secrets set STAFF_GRANT_SECRET=$(openssl rand -hex 32)
npx supabase secrets set FOUNDER_EMAIL=you@example.com RESEND_API_KEY=re_…
```

`STAFF_GRANT_SECRET` signs cashier sessions; changing it signs every cashier out. The Resend key can
wait: without it sign-ups still work and the email is skipped. **Check:** `npx supabase secrets list`.

## 7. Deploy the Edge Functions

**First, check the project signs sessions with JWT Signing Keys** (Project Settings → JWT Keys: the
current key is an asymmetric one, ECC or RSA, not "Legacy JWT secret"). The functions use
`@supabase/server`, which verifies sessions against the project's published keys and refuses tokens
signed with the legacy shared secret: on a legacy project every function would answer `INVALID_JWT`.
New projects use signing keys by default; if yours shows the legacy secret, migrate to signing keys
there first.

```bash
npm run functions:deploy
```

Deploys `staff-unlock`, `award`, `redeem`, `void`, `qr-token`, `notify-merchant-signup` and `push-dispatch` (Docker
isn't needed; the CLI deploys through the API). Each function's block in `supabase/config.toml` points at the shared
`supabase/functions/deno.json` (`import_map`); without it the bundler fails with `Relative import path "@supabase/server"
not prefixed with / or ./ or ../`. **Check:** `npx supabase functions list` shows seven, and

```bash
curl -s -X POST https://ohicvyappmccynchzukg.supabase.co/functions/v1/award
```

answers `401` (no session), not `404`.

## 8. The new-merchant email webhook

Dashboard → Database → Webhooks → Create:

- Table `merchants`, event **Insert**.
- Type **Supabase Edge Functions**, function `notify-merchant-signup`, method POST.
- HTTP header **`apikey`** = the project's **secret key** (`sb_secret_…`, Project Settings → API keys).
  Not the legacy `service_role` JWT: the function's `secret` mode reads only the `apikey` header.

**Check:** after step 10's test sign-up, Edge Functions → `notify-merchant-signup` → Logs shows a 200.

## 8b. Push notifications (customer app)

1. Deploy: `npx supabase functions deploy push-dispatch` (or `npm run functions:deploy`).
2. Dashboard → Database → Webhooks → Create: table `notifications`, event **Insert**, type Supabase Edge Functions,
   function `push-dispatch`, method POST, HTTP header **`apikey`** = the project's secret key (as step 8).
3. iPhones also need the APNs key in the EAS project (`eas credentials`, iOS → Push Notifications).

**Check:** earn points with a test customer whose phone allowed notifications; Edge Functions → `push-dispatch` → Logs
shows `{ "sent": 1 }`.

## 9. Resend (for the email in step 8)

Create a Resend account, add and verify the domain `ugnaya.com` (DNS records at your domain registrar),
create an API key, and set it in step 6. The sender is `noreply@ugnaya.com`.

## 10. Make yourself the first super admin

Admins are controlled by roles and a second factor (see `docs/ADMIN_PORTAL_ARCHITECTURE.md`). Create a dedicated account (sign up
in the app with its own email and confirm it), then in the SQL Editor:

```sql
select bootstrap_super_admin('you@example.com');
```

It works once: it refuses if a super admin already exists, and no app or Edge Function can call it. Then sign in at
`admin.ugnaya.com/login`; the first time you set up an authenticator app. Until the merchant approval screen is built (Phase 6), approving a
business still means running `verify_merchant` in the SQL Editor, which now also needs a super admin session with a second factor, so it
cannot be run as the SQL Editor's own `postgres` user any more: sign in to the portal and call it from there when that screen exists, or
temporarily use the `set_config` form with `'aal'` set to `'aal2'` for your user id:

```sql
select set_config('request.jwt.claims', json_build_object('sub', '<your auth user id>', 'aal', 'aal2')::text, true);
select verify_merchant('<merchant id>', 'growth', true);
```

(both lines in one run).

## 11. Types for the apps

```bash
npm run db:types       # from the linked project
```

`npm run db:types:local` gives the same result from the migrations without a link.

## Later: nightly jobs

When there are real customers, schedule the ledger check and expiry with pg_cron (Database →
Extensions → enable `pg_cron`), then:

```sql
select cron.schedule('ugnaya-check-ledger', '0 18 * * *', $$select * from check_ledger()$$);   -- 2 am Manila
select cron.schedule('ugnaya-expire-points', '30 18 * * *', $$select expire_points()$$);
```

`check_ledger()` returning rows is an incident: a balance differs from its ledger.
