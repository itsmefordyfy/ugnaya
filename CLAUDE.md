# CLAUDE.md

UGNAYA is a shared loyalty platform for independent businesses in the Philippines: one customer
wallet and QR code, merchant-owned points and rewards, and later a network balance spendable across
participating shops. The first target is independent cafés, milk tea shops, restaurants and newly
opened food businesses in Naga City; mid-size and large chains come later. Business plan: the Claude
doc "UGNAYA Business Plan" (https://claude.ai/artifact/8PZRKQXnF9XPUaNcoT1H55), and the owner's PDF
export at `documents/UGNAYA Business Plan (1).pdf` (gitignored). Design of the current foundation:
`docs/superpowers/specs/2026-11-06-ugnaya-foundation-design.md`.

This app follows the owner's mobile app playbook (the `mobile-app-playbook` skill, installed for
every project at `~/.claude/skills/mobile-app-playbook/`). Load it at the start of any work here.
This file is the source of truth for this app: where it and the playbook differ, this file wins.

## Layout

```
apps/web/            Next.js: marketing site and merchant sign-up; later the web wallet and merchant dashboard
apps/customer/       (not created yet) Expo customer app
apps/business/       (not created yet) Expo business app, owner and cashier modes
packages/ui-tokens/  colours, type scale, spacing, radii; CSS variables for the web, constants for the apps
packages/rules/      pure earning and redemption maths, member and redemption codes, PH mobile numbers
packages/db/         Supabase types and result shapes
supabase/            config.toml, migrations, Edge Functions, tests, seed
scripts/             SQL and Edge Function test runners
docs/                design, plans, setup and release guides
```

## Stack in use

- **Repo:** npm workspaces (`apps/*`, `packages/*`), no task runner. Node 22. npm only.
- **Packages:** TypeScript source consumed directly (`main: src/index.ts`); tests use Node's built-in runner.
- **Web:** Next.js 16, React 19, Tailwind CSS 4, `@supabase/ssr` (not created yet).
- **Backend:** Supabase project `ohicvyappmccynchzukg` (Postgres 17 hosted, Singapore); Supabase CLI 3 as
  a root dev dependency; Deno Edge Functions with `@supabase/server` (not created yet).
- **Mobile:** not created yet; Expo SDK 58 when it is.

## Commands

```bash
npm install              # once, at the root
npm run web              # Next.js dev server (apps/web)
npm run lint             # every workspace
npm run typecheck        # every workspace
npm test                 # package and web unit tests
npm run test:sql         # migrations and SQL tests on a throwaway local Postgres
npm run test:functions   # Edge Function tests (Deno)
npm run check            # all of the above
npm run db:push          # push migrations to the linked Supabase project
npm run db:types         # regenerate packages/db types from the linked project
npm run functions:deploy # deploy every Edge Function
npx supabase <command>   # the CLI; the Homebrew `supabase` on this Mac is broken, use npx
```

Done means the playbook's definition (`docs/TESTING_CHECKLIST.md` in the skill): `npm run check`
green, and the report says what was run, seen and not checked.

## Current state

- 2026-11-06: repo created from the design and plans; nothing built yet.

## Owner decisions

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
- **Domain (2026-11-06):** `ugnaya.ph`.
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
- Plain npm workspaces; Next.js 16, Tailwind 4, Inter, light theme following the system for dark.

## Open questions

- The Resend account, and which address receives new-merchant emails (`FOUNDER_EMAIL`).
- The Google OAuth client for "Continue with Google".
- The public contact address (the site uses `hello@ugnaya.ph` until told otherwise).
- When to add a git remote and push (none yet).

## Gotchas

- No Docker on this Mac, so `supabase start` (the local stack) is unavailable. SQL tests run on a
  throwaway Homebrew Postgres 14 with Supabase stand-ins; migrations must use nothing newer than
  Postgres 14 although the hosted project runs 17.
- The Homebrew `supabase` binary crashes; use `npx supabase` (the root dev dependency).
- `documents/` (the business plan) is gitignored, as in the other apps.
