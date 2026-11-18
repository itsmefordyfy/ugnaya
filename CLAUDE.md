# CLAUDE.md

UGNAYA is a shared loyalty platform for independent businesses, worldwide (owner's call, 2026-11-06: no city or country in public copy): one customer
wallet and QR code, merchant-owned points and rewards, and later a network balance spendable across
participating shops. The first target is independent cafés, milk tea shops, restaurants and newly
opened food businesses (any city); mid-size and large chains come later. Business plan: the Claude
doc "UGNAYA Business Plan" (https://claude.ai/artifact/8PZRKQXnF9XPUaNcoT1H55), and the owner's PDF
export at `documents/UGNAYA Business Plan (1).pdf` (gitignored). Design of the current foundation:
`docs/superpowers/specs/2026-11-06-ugnaya-foundation-design.md`.

This app follows the owner's mobile app playbook (the `mobile-app-playbook` skill, installed for
every project at `~/.claude/skills/mobile-app-playbook/`). Load it at the start of any work here.
This file is the source of truth for this app: where it and the playbook differ, this file wins.

## Layout

```
apps/marketing/      Next.js: the public site, ugnaya.com (no sign-in, no session; waitlist only)
apps/app/            Next.js: the customer web app, app.ugnaya.com (customer sign-in, register, password reset, web wallet); merchant entry points redirect to the merchant portal
apps/merchant/       Next.js: the merchant portal, merchant.ugnaya.com (dev 3003): registration and application with documents, dashboard, profile and logo, branches and hours, staff and invitations, loyalty program, rewards, campaigns, customers, transactions, web counter, store QR, plan, activity (apps/merchant/README.md)
apps/admin/          Next.js: the super-admin portal, admin.ugnaya.com. Sign-in + mandatory authenticator code, role-based (docs/ADMIN_PORTAL_ARCHITECTURE.md): overview, applications and review, merchants, users, transactions and fraud flags, revenue, subscriptions, analytics, settings (plans, announcements), team, audit, exports
                     (deployment and domains: docs/DEPLOYMENT.md)
apps/customer/       React Native + Expo customer app, iOS first (apps/customer/IOS_COMPLETION_TRACKER.md)
apps/business/       (not created yet) Expo counter app for shared devices; until then the merchant portal's web counter awards and redeems
packages/web-ui/     components, base CSS and URL helpers shared by the three Next.js apps
packages/brand/      the logo (traced vector from the owner's brand board), app icons and favicons: SVG sources, iOS/Android/web PNGs; `npm run build --workspace @ugnaya/brand`
packages/ui-tokens/  the brand's colours (light and dark), type scale, spacing, radii, shadows, motion; CSS variables and the Tailwind theme for the web, constants for the apps; `contrast.test.ts` enforces WCAG contrast
packages/rules/      pure earning and redemption maths, member and redemption codes, PH mobile numbers
packages/db/         Supabase types and result shapes
supabase/            config.toml, migrations, Edge Functions, tests, seed
scripts/             SQL and Edge Function test runners
docs/                design, plans, setup and release guides
```

## Stack in use

- **Repo:** npm workspaces (`apps/*`, `packages/*`), no task runner. Node 22. npm only.
- **Packages:** TypeScript source consumed directly (`main: src/index.ts`); tests use Node's built-in runner.
- **Web:** Next.js 16.4 (App Router, Cache Components), React 19, Tailwind CSS 4, `@supabase/ssr` 0.12.
  Structure and conventions: `apps/marketing/README.md` and `apps/app/README.md` (route groups, Server Components by default, Server
  Actions, `server-only`). Read `node_modules/next/dist/docs` before using a Next API you're unsure of.
- **Backend:** Supabase project `ohicvyappmccynchzukg` (Postgres 17 hosted, Singapore); Supabase CLI 3 as
  a root dev dependency; Deno 2 Edge Functions with `@supabase/server` 1 (Deno from Homebrew for tests).
  Contracts: `supabase/functions/README.md`; owner's setup: `docs/SUPABASE_SETUP.md`.
- **Mobile:** `apps/customer` (`@ugnaya/customer`): Expo SDK 58, React Native 0.88, Expo Router, React Query, supabase-js
  (session in the Keychain via `expo-secure-store`), iOS first. Its own tokens in `src/constants/theme.ts` (the owner's app
  identity: Midnight Navy, Warm Ivory, Muted Teal; Manrope headings and figures, Inter text). Run from `apps/customer`:
  `npm run ios` (iPhone 18 Pro simulator), `npm run check`. Status and remaining work: `apps/customer/IOS_COMPLETION_TRACKER.md`.
  React 19.3.0 is shared with the web apps, so the workspace hoists one React; the app needs no Metro monorepo config (SDK 58
  finds the workspace root itself).

## Commands

```bash
npm install              # once, at the root
npm run marketing        # ugnaya.com on :3000
npm run app              # app.ugnaya.com on :3001
npm run admin            # admin.ugnaya.com on :3002
npm run lint             # every workspace
npm run typecheck        # every workspace
npm test                 # package and web unit tests
npm run test:sql         # migrations and SQL tests on a throwaway local Postgres
npm run test:functions   # Edge Functions: deno lint, deno check, deno test
npm run check            # all of the above
npm run db:push          # push migrations to the linked project (CLI 3 needs --remote; the script has it)
npm run db:types         # regenerate packages/db types from the linked project
npm run db:types:local   # the same from the migrations on a throwaway local Postgres
npm run functions:deploy # deploy every Edge Function
npx supabase <command>   # the CLI; the Homebrew `supabase` on this Mac is broken, use npx
```

Done means the playbook's definition (`docs/TESTING_CHECKLIST.md` in the skill): `npm run check`
green, and the report says what was run, seen and not checked.

## Current state

- 2026-11-07: **Customer app, iOS first** (`apps/customer`, owner's autonomy brief): onboarding with Ugi, sign-up/in, reset
  password (deep link `ugnaya://reset-password`), profile step, Home, Wallet, My code (TOTP made on the phone), Discover,
  merchant profile, rewards and vouchers, activity, notifications, push registration, settings, delete account. Built and
  run on the iPhone 18 Pro simulator against the hosted project: sign-up, profile step, sign-in, sign-out, profile and
  preference saves and account deletion worked. **Blocked on the backend:** the `qr-token` Edge Function answers 404 (not
  deployed), so no member code or voucher can be issued yet; no active merchant exists, so shop, reward and voucher screens
  were seen only empty (and with sample data held in memory for a layout check). Push needs `eas init` and an APNs key.

- 2026-11-07: **Platform build (owner's autonomy brief).** Migrations `20261107000200` to `0700` (pushed to the
  hosted project the same day): review states and draft, admin modules, merchant dashboard, merchant portal
  (documents, logos, invites, campaigns, gate, announcements, plans), customer app (wallet, discovery, favourites,
  notifications, push tokens, account deletion, web counter), and a fix so a branch manager can't widen their own
  access. SQL tests `10`–`12`; `push-dispatch` Edge Function (tested, **not deployed**: run
  `npm run functions:deploy` and add its webhook, docs/SUPABASE_SETUP.md 8b). Admin modules and the merchant portal
  built (lint, typecheck, unit tests, production builds, visitor redirects). **Not verified with real signed-in
  sessions:** admin (needs the owner's authenticator), merchant flows, uploads, counter. Progress:
  `PROJECT_COMPLETION_TRACKER.md`.

- 2026-11-06: monorepo, `ui-tokens` and `rules` (tested), `db` (generated types).
- 2026-11-06: backend: 8 migrations (platform, customers, merchants, loyalty, points functions, RLS,
  fraud rules, review fixes: PIN lockout, one business per owner, programs readable by their customers), demo seed, 6 Edge Functions. SQL tests (8 files plus a two-connection concurrency test)
  and Deno tests pass locally. **Nothing is on the hosted project yet**: the owner runs
  `docs/SUPABASE_SETUP.md`. Not verified: the migrations on Postgres 17, `config push`, the deployed
  functions, the webhook, Resend, Google sign-in.
- 2026-11-07: **Ugi the mascot** (owner's board): ten poses cut out by `packages/brand/tools/extract_mascot.py`, `<Ugi>` in `@ugnaya/web-ui`, no animation (owner's call); used on the marketing site (hero from 640 px, Meet Ugi, closing bands, 404) and the app (sign-in panel from 1024 px, check-email, reset sent, errors, wallet and staff empty states, 404). Seven requested expressions are not on the board (need artwork). Sign-in/registration: split layout from 1024 px, password show/hide (`PasswordField`), merchant two-step progress bar. Header logo: wordmark centred on the symbol; the tagline-under-logo experiment was reverted at the owner's request.
- 2026-11-07: **Super Admin Portal, phases 1 to 3** (owner's brief): `apps/admin` (own deployment, session, layout; no registration; password then authenticator code; nonce-based CSP; optional IP allow-list; 30-minute idle timeout) and the database side (migration `20261107000100_admin_rbac.sql`): five roles with explicit permissions, a permission only counts at `aal2`, `is_platform_admin()` now means a super admin at aal2, audited grant/change/revoke, append-only `audit_logs`, `bootstrap_super_admin()`. `platform_admins` is legacy (kept, no longer authoritative). **Not built:** the dashboard, user/merchant/transaction/finance/subscription modules, the admin invitation Edge Function, notifications, reports. **Not verified:** a real admin sign-in with MFA against the hosted project. Finance needs a payment provider decision (docs/ADMIN_PORTAL_ARCHITECTURE.md section 7).
- 2026-11-07: the old `apps/web` is split into `apps/marketing` and `apps/app` (owner's brief: separate experiences, domains, deployments and sessions). Marketing has no auth at all and links to the app with `?type=` preserved; the app owns sign-in, registration (customer or merchant), forgot/reset password and role routing (`lib/auth/roles.ts`: **no admin routing since 2026-11-08, owner's call: the admin portal is reached only by its own address and sign-in, never from marketing or this app's sign-in**; owner to `/merchant`, staff to `/pos`, customer to `/wallet`); `/wallet` and `/pos` are honest placeholders (member ID only). Old marketing URLs (`/login`, `/register`, `/app`, `/auth/*`) redirect to the app. Verified: both build, redirects and link targets, route protection, headers, no marketing cookies. **Not verified:** the full sign-up, confirmation and password-reset email round trip, role routing with real accounts.
- 2026-11-06: website (formerly `apps/web`): home, how it works, businesses, customers, pricing, FAQ, about, contact,
  privacy/terms/merchant terms (drafts pending counsel), sign-in, two-step merchant registration, customer
  waitlist, `/app` application status, sitemap, robots, share image. Seen in headless Chrome at 360 to 1440
  px, light and dark, no sideways scroll. **Not verified against the hosted Supabase project** (needs the
  owner's setup and the publishable key in `apps/app/.env.local`): real sign-up, the confirmation email and
  link, the business step, `/app` with a session, the waitlist insert, Google sign-in. Not deployed.

## Owner decisions

- **Autonomy (2026-11-07):** the owner granted full autonomy for routine development; decisions are recorded in
  `PROJECT_COMPLETION_TRACKER.md` instead of asked. Stop only for irreversible, costly or external actions.
- **Priorities (2026-11-07):** 1 customer iOS app, 2 backend, 3 merchant portal, 4 Super Admin portal, 5 marketing
  site, 6 Android. Mobile apps are React Native + Expo.
- **Four web experiences (2026-11-07):** marketing (ugnaya.com), customer web (app.ugnaya.com), merchant portal
  (merchant.ugnaya.com), admin (admin.ugnaya.com); separate deployments and sessions; no public admin registration.
- **Merchant application (2026-11-07):** registering creates a **draft**; the owner uploads documents and submits
  (pending review); admins start review, request information, approve (plan, founding), reject, reopen, suspend,
  reactivate; every step in `merchant_reviews` (append-only) and the audit log. Until approved: no rewards,
  campaigns beyond drafts, counter devices or staff invitations (enforced in the database).
- **App identity (2026-11-07, mobile):** Midnight Navy #172554, Warm Ivory #F7F7F4, Muted Teal #5B8C85, White, Border
  #E8EAEF, Slate #64748B; Manrope headings, Inter text. The web keeps its tokens until the marketing redesign.
- **Passkeys (2026-11-07):** not enabled: Supabase refused WebAuthn MFA for the project and quotes a paid add-on;
  admins use TOTP at AAL2.

- **Repo (2026-11-06):** one monorepo at `~/Projects/ugnaya`; the website and the mobile apps live in it.
- **Order (2026-11-06):** website first, then the mobile apps.
- **Backend now (2026-11-06):** the database and the Edge Functions are built with the website.
- **Supabase (2026-11-06):** a separate project for UGNAYA (`https://ohicvyappmccynchzukg.supabase.co`),
  not CarMind's shared one; migrations through the Supabase CLI.
- **Carry over (2026-11-06):** the skills, Superpowers, rules and `package.json` scripts of the other apps.
- **Market (2026-11-06):** cafés, restaurants and newly opened food businesses first; mid-size and large
  businesses later.
- **Prices on the site (2026-11-06):** Free, Starter ₱399, Growth ₱899, Business ₱1,999, Enterprise custom;
  hypotheses to test in the validation interviews, so they live in one data file.
- **Domains (2026-11-07, replaces `ugnaya.ph`):** `ugnaya.com` (marketing), `app.ugnaya.com` (product), `admin.ugnaya.com` (admin), `api.ugnaya.com` only if the API is ever independently hosted. Contact address assumed `hello@ugnaya.com` (owner to confirm the mailbox exists).
- **Deno (2026-11-06):** may be installed with Homebrew for the Edge Function tests.

Calls made after the design review (2026-11-06), the owner may overturn any:

- Email sign-up needs confirmation; the link returns to `/register` at the business step. Google skips it.
- Owners and managers sign in themselves; a shared cashier device is its own anonymous auth user tied to a
  `devices` row, unlocked by each cashier's PIN for a 12-hour staff grant. Cashiers have no login.
- Plan limits are recorded (`plan_limits`, `subscriptions`), not enforced, until the mobile apps exist.
- Branches store latitude and longitude as numbers; PostGIS and nearby search come with the customer app.
- Voids: a cashier within 12 hours of their own transaction on the same device; a manager or owner within
  30 days; no approval step.
- New merchant sign-ups email the founder through Resend; sign-up never depends on the email.
- Plain npm workspaces; Next.js 16, Tailwind 4, Montserrat (headlines) + Inter (text), **light by default whatever the system says** (owner's call, 2026-11-06); dark exists in the tokens and applies only with `data-theme="dark"` (no toggle yet). Brand and design rules: `docs/BRAND_AND_DESIGN_SYSTEM.md`.

## Open questions

- The Resend account, and which address receives new-merchant emails (`FOUNDER_EMAIL`).
- The Google OAuth client for "Continue with Google".
- The public contact address (the site uses `hello@ugnaya.com` until told otherwise; `/contact` is a
  mailto link until that inbox exists).
- The Supabase publishable key for `apps/app/.env.local` (and marketing's, for the waitlist) and Vercel.
- A real logo (the site has a first-version "Linked U") and real shop photos for the marketing pages.
- When to add a git remote and push (none yet).

## Gotchas

- Supabase CLI 3 targets the **local** database by default: `db push`, `gen types` and friends need
  `--remote` to reach the linked project (the npm scripts pass it).
- The SQL Editor runs as `postgres`, so functions that check the signed-in user (`verify_merchant`)
  refuse there; `docs/SUPABASE_SETUP.md` step 10 shows how to run them as yourself.
- RLS is enabled, not forced: the postgres-owned SECURITY DEFINER functions and the directory views
  read past it on purpose. Clients get nothing unless a migration grants it, including new functions.
- The confirmation email links to `{{ .RedirectTo }}` (the `emailRedirectTo` the site sends, its own
  `/auth/confirm`), not to the Site URL, so local sign-ups confirm on localhost. Any new sign-up path must
  pass `confirmationRedirect(origin)` (`apps/app/src/lib/auth/confirm-url.ts`).
- Edge Functions need the project on JWT Signing Keys (`@supabase/server` refuses legacy HS256 sessions).
- No Docker on this Mac, so `supabase start` (the local stack) is unavailable. SQL tests run on a
  throwaway Homebrew Postgres 14 with Supabase stand-ins; migrations must use nothing newer than
  Postgres 14 although the hosted project runs 17.
- The Homebrew `supabase` binary crashes; use `npx supabase` (the root dev dependency).
- `documents/` (the business plan) is gitignored, as in the other apps.
