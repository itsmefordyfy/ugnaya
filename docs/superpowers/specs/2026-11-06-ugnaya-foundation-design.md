# UGNAYA foundation: monorepo, website and backend

Date: 2026-11-06. Status: draft for the owner's approval.

The business plan this builds from is the Claude doc "UGNAYA Business Plan"
(https://claude.ai/artifact/8PZRKQXnF9XPUaNcoT1H55); the owner keeps a PDF export at
`documents/UGNAYA Business Plan (1).pdf`, and `documents/` is gitignored as in the other apps.
Section numbers below refer to it.

## Intent

UGNAYA is a shared loyalty platform for independent businesses in the Philippines: one customer
wallet and QR code, merchant-owned points and rewards, and later a network balance spendable across
shops. The first target is independent cafés, milk tea shops, restaurants and newly opened food
businesses in Naga City; mid-size and large chains come later (plan sections 4 and 17).

This round builds the foundation the whole product stands on, in this order:

1. The monorepo, with the owner's conventions carried over from CarMind and Bubblie.
2. The public website, with real merchant sign-up.
3. The Supabase backend: the schema, Row Level Security, the points functions and the Edge Functions,
   with tests.

The mobile apps (customer app, business app with owner and cashier modes) are the next round and
are not designed here beyond the folders and shared packages they will slot into.

## Owner decisions (from the conversation of 2026-11-06)

- **Location and shape:** one monorepo at `/Users/cliffordfrancisco/Projects/ugnaya`; the website and
  the mobile apps live in the same repo. Project name `ugnaya`.
- **Order:** website first, then the mobile app.
- **Backend in this round:** the database and the Edge Functions are built now.
- **Supabase:** a separate, new Supabase project for UGNAYA (not CarMind's shared project), with
  migrations managed through the Supabase CLI. The project is created:
  `https://ohicvyappmccynchzukg.supabase.co`.
- **Carry over** the skills, Superpowers, rules and the `package.json` scripts the other apps use.
- **Target market:** cafés, restaurants and new food businesses first; scale to mid-size and large
  businesses later.
- **Pricing shown on the site:** Free, Starter ₱399, Growth ₱899, Business ₱1,999, Enterprise custom
  (plan section 6; the plan marks these as hypotheses to test in the validation interviews, so the
  site must make them easy to change).

## Goals

- A repo a solo developer can work in daily: one `npm install`, one place for lint, typecheck and
  tests, the Claude Code setup and playbook the other apps use.
- A website that sells UGNAYA to a café owner in Naga and lets them sign up for a merchant account
  today, so the founder can start the validation visits with a real sign-up link.
- A backend whose points ledger is correct from day one: balances are sums of an append-only ledger,
  every movement is idempotent, and no client can change a balance.

## Non-goals (this round)

- The Expo apps, the cashier scanning flow, the merchant dashboard screens, the super-admin console.
- Network points in use. The tables and the network program exist in the schema but the network
  stays switched off (a platform setting) until phase 3.
- Billing and subscriptions. The `subscriptions` table exists; no payment provider is wired.
- A Participating Businesses page, an app download page, testimonials, SEO city pages.
- Deploying to Vercel or linking a domain (the owner does that when ready; the site must be ready
  for it).

## Anti-goals

- A points balance that a client can write. If any path lets a customer or a merchant app set a
  balance directly, this round has failed.
- Money handling of any kind: no payments, no settlement, no peso value on points, nothing that
  makes UGNAYA look like an e-money issuer or a payment system operator (plan section 14).
- A website that reads as a generic SaaS template. It must speak to a Naga café owner.
- Copying another app's product decisions as UGNAYA's.

## Constraints

- npm only (no yarn, pnpm or bun), as in every Fordytech app.
- No Docker on this Mac, so `supabase start` (the local stack) is not available. Homebrew Postgres
  (`psql`, `pg_ctl`) is installed, and CarMind and Bubblie already test their SQL on a throwaway
  local Postgres with Supabase stand-ins. Deno is not installed.
- The Supabase project exists: `https://ohicvyappmccynchzukg.supabase.co` (ref
  `ohicvyappmccynchzukg`), given by the owner on 2026-11-06. Linking it (`supabase link`) needs the
  CLI signed in to the owner's Supabase account (`supabase login`) and the database password for
  `supabase db push`; both are the owner's to enter, never written into the repo. Everything must
  also work with no link at all (the SQL tests run on local Postgres).
- Secrets never go in the repo or in a client bundle: Supabase service-role key and any email
  provider key live in Supabase Edge Function secrets; the website only holds the public URL and the
  publishable key in a gitignored `.env.local`.
- Philippine data privacy: the sign-up form and the Privacy Policy must state what is collected and
  why; the schema records consent with timestamps (plan sections 10 and 14).

## The repo

```
ugnaya/
  package.json              npm workspaces: apps/*, packages/*; root scripts (below)
  CLAUDE.md                 what UGNAYA is, stack, current state, owner decisions, open questions
  AGENTS.md                 generic rules for other tools, pointing at CLAUDE.md and the playbook
  README.md                 short human-facing: what it is, how to run each app
  .claude/settings.json     enables the expo and superpowers plugins (as Bubblie)
  .claude/settings.local.json  the owner's usual allow list, with web and supabase commands added
  .claude/skills/ugnaya-platform-design/   Bubblie's platform-design skill with the app renamed
  .claude/skills/ui-ux-pro-max/            copied as is
  docs/superpowers/{specs,plans}/          this document and the plans
  docs/BUILD_AND_RELEASE.md                written in the mobile round; a stub now
  apps/web/                 Next.js: marketing site, merchant sign-up; later the web wallet and
                            merchant dashboard as signed-in route groups
  apps/customer/            (next round) Expo customer app
  apps/business/            (next round) Expo business app, owner + cashier modes
  packages/ui-tokens/       colours, type scale, spacing, radii as plain TypeScript, consumed by the
                            web app's Tailwind theme now and the Expo apps later
  packages/rules/           pure earning and redemption maths (points for an amount under a rule,
                            rounding, caps), unit-tested; used by Edge Functions and the apps
  packages/db/              generated Supabase types (`supabase gen types`) and typed query helpers
  supabase/                 config.toml, migrations/, functions/, tests/, seed.sql
  scripts/                  sql test runner, function test runner, later the release scripts
```

**My call:** plain npm workspaces, no Turborepo or Nx. Three apps and three small packages don't
need a task runner; one can be added later without moving files. Root scripts:

| Script | Does |
| --- | --- |
| `npm run web` | `next dev` in `apps/web` |
| `npm run lint` | lint every workspace (`next lint` / `expo lint` per app, eslint for packages) |
| `npm run typecheck` | `tsc --noEmit` per workspace |
| `npm test` | the package unit tests (`packages/rules`) |
| `npm run test:sql` | the SQL tests on a throwaway local Postgres |
| `npm run test:functions` | the Edge Function tests (Deno) |
| `npm run check` | lint + typecheck + test + test:sql |
| `npm run db:push` | `supabase db push` to the linked project |
| `npm run db:types` | regenerate `packages/db` types from the linked project |
| `npm run functions:deploy` | deploy every Edge Function |

The Expo-specific scripts the owner uses (`ios`, `ios:prod` with `--device "iPhone 18 Pro"`,
`android`, `android:prod`, `release:ios`, `release:android`, `test:siri`), `eas.json`, the release
scripts and the config plugins are copied from Bubblie into each Expo app when that app is
scaffolded in the next round, because they reference the app's own `app.json` and native folders.
This round carries over everything that is repo-level.

`CLAUDE.md` is written from the playbook's template, adapted for a monorepo: one section per app,
the shared packages, the Supabase workflow, and the owner decisions above with their dates. It
links to the business plan doc. The playbook's `NEW_PROJECT_SETUP.md` is followed for the Claude
Code setup; its Expo steps wait for the mobile round.

## The website (`apps/web`)

**Stack, my call:** Next.js 16 (App Router, TypeScript strict, Turbopack), Tailwind CSS 4, ESLint
flat config, as `fordytech-marketing`, so the owner's existing site knowledge transfers. Inter via
`next/font` (plan section 12), light theme by default with a dark mode that follows the system.
Every marketing page is statically generated. `@supabase/ssr` for auth in the sign-up flow.

**Design direction:** plan section 12. Ugnay blue `#2B4ACB` for actions, mango `#FFB020` for
points and rewards (never as text on white), ink `#101828`, surface `#F7F8FA`, cards white; 4 pt
spacing grid; rounded cards; Material Symbols Rounded for icons. The tokens live in
`packages/ui-tokens` and feed Tailwind's theme, so the Expo apps use the same values later. Friendly
and plain, not corporate: photography placeholders for real Naga shops (no stock photos of foreign
cafés), copy that names cafés, milk tea shops and restaurants. The visual tone is the opposite of
`fordytech-marketing`'s dark studio look.

**Logo:** the "Linked U" concept from section 12 (two interlocking rounded loops forming a U, blue
and mango), drawn as an SVG wordmark and mark. The builder draws a first version; the owner may
replace it with a designer's later.

**Pages (all in English; the tagline also in Filipino on Home):**

| Route | Content |
| --- | --- |
| `/` | Hero: "One Wallet. More Places. More Rewards." with the Filipino line under it; who it is for (cafés, milk tea, restaurants, new food businesses in Naga); how it works in three steps (scan, earn, redeem); benefits for businesses; benefits for customers; the pricing summary; merchant CTA (Register your business) and customer CTA (Join the waitlist, since there is no app yet) |
| `/how-it-works` | The customer flow and the counter flow in plain steps, with illustrations of the phone screens described as placeholders |
| `/for-customers` | What a customer gets; the app is "coming soon"; a waitlist form (mobile number or email) |
| `/for-businesses` | The merchant pitch from plan section 7: repeat customers, no cards, customers from nearby shops, the Founding Merchant Program, the New Shop Launch Pack |
| `/pricing` | The four plans and Enterprise, from one data file (`src/lib/plans.ts`) so prices change in one place; the free-tier limits; a note that founding merchants get 40% off for 12 months; FAQ links |
| `/faq` | Merchant and customer questions from the plan (no app needed? what does it cost? do I give rewards to other shops' customers? do points expire? is my data safe?) |
| `/about` | Fordytech Solutions, Naga City, why UGNAYA; contact |
| `/contact` | Email and a short form |
| `/register` | Merchant sign-up (below) |
| `/privacy`, `/terms`, `/merchant-terms` | Drafts written from plan section 14's recommended structure (points have no cash value, are not e-money, may expire with notice, no money moves between merchants), clearly marked as drafts pending counsel in the page footer until the owner removes the mark |
| `/app` (signed in) | "Your application": the merchant's verification status after sign-up, and nothing else yet; the dashboard grows here in a later round |

Each page carries metadata and Open Graph tags; a sitemap and robots file are generated.

**Merchant sign-up (`/register`):**

1. Account: email and password, or Google (Supabase Auth). The site uses `@supabase/ssr`'s
   cookie-based session.
2. Business: trade name, category (café, milk tea, restaurant, bakery, other food, other), city
   (Naga City preselected), address, number of branches, the owner's mobile number, how they heard
   about UGNAYA, and two unticked consent boxes (the Merchant Terms and Privacy Policy; marketing
   emails, optional).
3. Done: "We'll verify your business within one business day and visit you to set up." The
   merchant row is created in `pending_verification`, the signed-in user becomes its owner in
   `merchant_staff`, and the consents are recorded with timestamps.

The two steps are one page with the account step first, so an abandoned form still leaves an
account the founder can follow up. Creating the merchant and the staff row is one SQL function
(`register_merchant`, `SECURITY DEFINER`, callable by an authenticated user for themselves only),
so the two rows can never be half-written. A DTI/SEC permit upload is not asked for here; it is
asked for during verification by the founder in person (plan section 8 lists it in onboarding; my
call is to keep the web form short).

**Notifying the founder, my call:** a database webhook on `merchants` inserts calls an Edge
Function `notify-merchant-signup` that emails the founder through Resend (free tier, 3,000 emails
a month, plan section 13). The function reads the Resend key from Edge Function secrets and does
nothing if the key is missing, so sign-up never depends on email. Customer waitlist entries go to a
`waitlist` table; no email for those.

## The backend (`supabase/`)

The schema is plan section 10, written as versioned migrations in `supabase/migrations`, each
safe to re-run (CarMind's rule), named `YYYYMMDDHHMMSS_<topic>.sql`. The first migration set:

1. `platform`: `platform_settings` (key/value, holds `network_enabled = false`), enums (roles,
   transaction types, ledger entry types, merchant status, program scope, rule types), helper
   functions (`current_user_id()`, `is_platform_admin()`, `staff_role(merchant_id)`).
2. `customers`: `customer_profiles` (with `public_member_id`, birthday month/day, consents with
   timestamps, `deleted_at`), created by a trigger on `auth.users` insert for customer sign-ups
   only (sign-up carries `user_type` in metadata; merchant sign-ups get no profile).
3. `merchants`: `merchants`, `merchant_branches` (PostGIS point for nearby search), `merchant_staff`
   (role, branch scope, hashed PIN), `devices`, `subscriptions`, `register_merchant()`.
4. `loyalty`: `loyalty_programs`, `loyalty_accounts`, `loyalty_transactions`, `points_ledger`,
   `rewards`, `reward_redemptions`, `vouchers`, `campaigns`, `referrals`, `notifications`,
   `merchant_contributions`, `settlement_records` (empty by design), `audit_logs`; the network
   program row (`scope = network`, inactive).
5. `points_functions`: `award_points`, `redeem_reward`, `void_transaction`,
   `issue_redemption_token`, `verify_member_code`, `check_ledger()` (the nightly balance check),
   `expire_points()`; the trigger that rejects `UPDATE`/`DELETE` on `points_ledger`.
6. `rls`: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on every table and the policies for the
   roles in plan section 10's access table; revoke all client write grants on ledger, balance and
   transaction tables (the functions are the only path).
7. `fraud_rules`: per-merchant limits (per customer per day, per transaction), the 7-day hold on
   network points (`available_at`), the flags table and the rules run at the end of `award_points`.

**Invariants the SQL functions enforce** (each one is a test):

- Every award, redeem and void carries an idempotency key unique per merchant; a repeat returns
  the first result and writes nothing.
- A receipt number, when given, is unique per branch.
- `loyalty_accounts.balance` always equals the sum of its `points_ledger` entries (rows are locked
  `FOR UPDATE` inside each function; `check_ledger()` finds any drift).
- A redemption token is single use, expires after 5 minutes, is stored only as a hash, and is
  accepted only by a device of the reward's merchant.
- A void or reversal writes new ledger entries that reference the original; nothing is updated or
  deleted on `points_ledger`.
- A cashier can only act at a branch they are assigned to, from a registered device, and only while
  their `merchant_staff` row is active.
- Network points are not issued while `network_enabled` is false.

**Edge Functions (`supabase/functions`, Deno):**

| Function | Called by | Does |
| --- | --- | --- |
| `award` | business app (next round) | verifies the staff session, device signature, member code and idempotency key; calls `award_points`; returns the new balances |
| `redeem` | business app | verifies the staff session and device; calls `redeem_reward` with the scanned token |
| `void` | business app | same checks; calls `void_transaction` |
| `qr-token` | customer app / web wallet | issues the member's QR secret on login and short-lived redemption tokens (`issue_redemption_token`) |
| `notify-merchant-signup` | database webhook | emails the founder about a new merchant |
| `_shared/` | | request helpers in CarMind's style (`readBody`, `requireUserId`, `respond`, typed field readers) |

The service-role key is used only inside the functions and only for the calls that need it; the
functions otherwise act as the caller under RLS. Each function's contract (request and response
JSON, error codes) is written in a `README.md` next to it, so the mobile round builds against a
fixed interface.

**Member QR, my call for the format:** the customer app shows `U:<public_member_id>:<6-digit
TOTP>` where the TOTP secret is issued per device by `qr-token` at login and verified by
`verify_member_code` on the server with a 30-second step and one step of drift. The web wallet,
which cannot keep a secret as safely, instead asks `qr-token` for a 5-minute signed code. Both
reach the cashier as the same scanned string.

**Seed:** `supabase/seed.sql` creates a platform admin role mapping, the network program, one demo
merchant (a café with two branches, an owner, a manager and a cashier), two rewards and two
customers, for local tests and for the first mobile-round development.

## Tests

- `packages/rules`: unit tests (Node's test runner, as CarMind's `test:*` scripts) for the earning
  maths (per peso, per visit, stamps, minimum spend, rounding down) and the offer guideline check.
- `scripts/sql-tests/run.sh` (`npm run test:sql`): the pattern of Bubblie's `test-supabase-sql.sh`.
  A throwaway Postgres on Homebrew with Supabase stand-ins (`auth.users`, `auth.uid()`, the
  `authenticated`, `anon` and `service_role` roles, PostGIS if available), every migration applied
  twice in order, then `supabase/tests/*.sql` each on a fresh database: the invariants above, plus
  RLS tests that switch roles (a cashier of merchant A reading merchant B's rows gets nothing; a
  customer sees only their own accounts; nobody can `UPDATE points_ledger`). A concurrency test
  runs two `redeem_reward` calls on the same token from two connections (a Node script in the same
  folder) and expects exactly one success.
- `scripts/function-tests` (`npm run test:functions`): Deno tests that run each Edge Function's
  handler against a stub Supabase client (request validation, auth refusal, error shapes). Deno is
  installed with Homebrew (`brew install deno`), an owner step the plan records.
- The website: `next build` must pass with zero type or lint errors; the sign-up flow is checked by
  hand against the hosted project once it exists, and the report says what was seen.

Before anything is called done: `npm run check` is green, and the report lists what was run,
seen, and not checked (the playbook's rule).

## Deployment readiness (not deployment)

- `supabase/config.toml` with the project settings (auth providers: email, Google; site URL and
  redirect URLs for local and production; email confirmations on).
- `docs/SUPABASE_SETUP.md`: the owner's one-time steps: `supabase login`, `supabase link
  --project-ref ohicvyappmccynchzukg`, `npm run db:push`, set the Edge Function secrets (`RESEND_API_KEY`,
  `FOUNDER_EMAIL`), configure the Google OAuth client, add the database webhook for
  `notify-merchant-signup`, run `npm run db:types`.
- `apps/web/.env.example` with the two public variables; Vercel settings described in the README
  (root directory `apps/web`, the two env vars).

## Left to the builder

- Exact Tailwind theme wiring from `ui-tokens`, component structure of the site, the illustration
  placeholders, and copy beyond what the plan gives (keep to the plan's voice: plain, local,
  honest about points).
- Table column types, index names, and the precise policy SQL, within section 10's design.
- The TOTP implementation (a small, audited library in Deno and Postgres `pgcrypto` for HMAC) and
  the device-signature scheme for the business app, documented in the `award` README for the
  mobile round.
- The shape of the `_shared` helpers, the test harness details, and the migration file names.
- Whether `packages/db` ships hand-written helpers in this round or only the generated types
  (generated types are enough until the apps exist).

## Calls made after the builder check (2026-11-06)

A reviewer read the draft as a builder and asked six questions. These four are settled here as my
calls; the owner can overturn any of them.

1. **Email confirmation and the sign-up page.** Confirmations stay on. Signing up with email shows
   "Check your email to continue"; the confirmation link returns to `/register`, which resumes at
   the business step for a signed-in user with no merchant yet (the same resume state covers an
   abandoned form). Google sign-up has no confirmation and goes straight to the business step.
   `register_merchant` runs only for a confirmed, signed-in user.
2. **Staff identity on a shared cashier device.** Two kinds of session, as plan section 9 says:
   - *Owner and manager mode*: their own `auth.users` login (email or Google); `merchant_staff.user_id`
     points at it, and RLS reads `auth.uid()`.
   - *Cashier mode on a shared device*: the owner registers the device from owner mode; the device
     gets its own `auth.users` row (an anonymous sign-in, upgraded to a `devices` row with the
     merchant, branch and a public key). A cashier unlocks it with their PIN; the server checks the
     PIN against `merchant_staff.pin_hash` for staff of that branch and returns a short-lived
     *staff grant* (a signed token, 12 hours, bound to the device). `award`, `redeem` and `void`
     take the device's auth session plus the staff grant, so every ledger row records both the
     device and the person. Cashiers therefore need no login of their own, and `merchant_staff.user_id`
     is nullable (null for PIN-only cashiers). The seed's cashier has a PIN and no auth user.
3. **Plan limits.** `register_merchant` creates a `subscriptions` row on the Free plan with
   `founding = false`; the founder flips `founding` and the pilot plan at verification. A
   `plan_limits` table holds each plan's branch, staff, reward and monthly transaction limits (the
   numbers from section 6) so the website's pricing page and the database read the same source.
   Enforcement of the limits waits for the mobile round, when there are app flows to enforce them in;
   this round records, it does not block.
4. **Branch location and local Postgres.** Branches store `lat` and `lng` as numerics this round;
   the PostGIS geography column and the nearby search move to the mobile round, so no PostGIS
   install is needed now. The local test Postgres is Homebrew's 14 while the hosted project runs 17,
   so migrations use nothing newer than Postgres 14 syntax (the builder keeps a note of this in
   `scripts/sql-tests/README.md`).
5. **Voids.** A cashier may void a transaction they made within the last 12 hours from the same
   device and branch (`void_window_hours`, a platform setting); a manager or owner may void any of
   the merchant's transactions within 30 days. No approval state this round; a void is immediate and
   logged with a reason. Older corrections are platform-admin adjustments.

## Answered by the owner (2026-11-06)

6. **Production domain: `ugnaya.ph`** (owner decision). Supabase's site URL, the auth redirect list,
   the Google OAuth client and the website's metadata use it; one constant in `apps/web` holds it.
7. **Deno may be installed with Homebrew** (owner decision), so `npm run test:functions` runs the
   Edge Function tests locally.

Status: approved for planning once the owner says so in chat.
