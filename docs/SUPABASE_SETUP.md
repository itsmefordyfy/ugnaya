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

Applies the seven migrations in `supabase/migrations`. The demo data in `supabase/seed.sql` is **not**
pushed (only `--include-seed` would push it; don't). **Check** in the SQL Editor:

```sql
select count(*) from loyalty_programs where scope = 'network';   -- 1
select count(*) from plan_limits;                                 -- 5
select relname from pg_class where relname = 'merchant_directory'; -- 1 row
```

## 4. Google sign-in (optional now, needed for "Continue with Google")

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → Web application.
2. Authorised JavaScript origins: `https://ugnaya.ph`, `http://localhost:3000`.
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

Sets the site URL (`https://ugnaya.ph`), the allowed redirects (localhost and ugnaya.ph), email
confirmation on, the UGNAYA confirmation email, Google, and anonymous sign-ins (shared cashier
devices). **Check:** Authentication → URL Configuration shows `https://ugnaya.ph`; Authentication →
Sign In / Providers shows Email (confirm email on), Anonymous on.

## 6. Edge Function secrets

```bash
npx supabase secrets set STAFF_GRANT_SECRET=$(openssl rand -hex 32)
npx supabase secrets set FOUNDER_EMAIL=you@example.com RESEND_API_KEY=re_…
```

`STAFF_GRANT_SECRET` signs cashier sessions; changing it signs every cashier out. The Resend key can
wait: without it sign-ups still work and the email is skipped. **Check:** `npx supabase secrets list`.

## 7. Deploy the Edge Functions

```bash
npm run functions:deploy
```

Deploys `staff-unlock`, `award`, `redeem`, `void`, `qr-token` and `notify-merchant-signup` (Docker isn't
needed; the CLI deploys through the API). **Check:** `npx supabase functions list` shows six, and

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

## 9. Resend (for the email in step 8)

Create a Resend account, add and verify the domain `ugnaya.ph` (DNS records at your domain registrar),
create an API key, and set it in step 6. The sender is `noreply@ugnaya.ph`.

## 10. Make yourself the platform admin

Sign up on the website (`/register`) with your own email, confirm it, then in the SQL Editor:

```sql
insert into platform_admins (user_id)
select id from auth.users where email = 'you@example.com';
```

Verify a merchant after visiting them (founding merchants get the founding flag):

```sql
select verify_merchant('<merchant id>', 'growth', true);
```

The SQL Editor runs as `postgres`, not as you, so `verify_merchant` from the editor refuses
(`forbidden`): it checks the signed-in user. Until the admin console exists, run it as yourself:

```sql
select set_config('request.jwt.claims', json_build_object('sub', '<your auth user id>')::text, true);
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
