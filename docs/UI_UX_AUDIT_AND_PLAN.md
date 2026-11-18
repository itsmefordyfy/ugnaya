# UGNAYA UI/UX audit and plan

Written 2026-11-06/07, against the owner's redesign brief and the official brand board. It records what the
repository actually contains, what was wrong, what was done, and what has to be built (not redesigned) next.

## 1. What exists

| Surface in the brief | In the repo today |
|---|---|
| Marketing website | **Built** (`apps/marketing`, Next.js 16, Tailwind 4): home, how it works, for businesses, for customers, pricing, FAQ, about, contact, legal pages, `/brand` |
| Merchant sign-up and sign-in | **Built** (now `apps/app`, Supabase Auth) with a minimal `/merchant` status page |
| Customer web wallet | Not built. Backend pieces exist (`qr-token` function, wallet tables, RLS) |
| Merchant dashboard, super-admin dashboard | Not built. Backend exists (merchants, staff, programs, ledger, audit logs, platform admins, `verify_merchant`) |
| Customer, merchant and staff/POS mobile apps | Not built. No Expo app exists; `apps/customer` and `apps/business` are placeholders in CLAUDE.md. Backend exists (`award`, `redeem`, `void`, `staff-unlock`, `qr-token`) |
| Shared packages | `ui-tokens` (colours, type, spacing, shadows, motion; contrast-tested), `brand` (new: logo and icons), `rules`, `db` |

So Phases 3, 4 and most of 5 of the brief are **new products, not redesigns**: there is no existing screen to
improve and no mock data to avoid replacing. They need their own design (brainstorm, spec, plan) and can be
built on the backend that already exists. This document does not pretend otherwise.

## 2. Findings before this pass, and status

| Finding | Status |
|---|---|
| Palette was the plan's blue and mango; fonts Inter only | Fixed: the brief's palette, Montserrat + Inter, light and dark themes, contrast test in CI |
| Logo was a placeholder I drew | Fixed: the board's symbol recreated as vector (`packages/brand`), all layouts and tones, app icons, favicons, iOS/Android/web PNGs |
| Brand teal used as text on white (2.49:1, fails) | Fixed: text uses a darker teal; fills carry dark ink; enforced by tests |
| Inline links navy, almost the colour of body text | Fixed: purple and underlined |
| Home page was three near-identical icon-card grids | Fixed: wallet preview hero, flat numbered flow, ecosystem diagram, two-sided list section |
| No dialog, toast, empty state, skeleton, status badge | Added: `Dialog` (bottom sheet on phones), `ConfirmDialog`, `Toast`, `EmptyState`, `Skeleton`, `Badge`, `Card`, `TileIcon` |
| Desktop nav wrapped onto 2 to 3 lines at 768 px | Fixed: full nav from 1024 px, menu button below |
| Nav and footer links 20 px tall (below the 44 px touch target) | Fixed |
| Hero left half the tablet width empty | Fixed: two columns from 768 px |
| Missing Supabase key crashed the sign-in page with a stack trace | Fixed: a clear setup notice |
| No automated responsive check | Added: `scripts/responsive-sweep.mjs` |

## 3. Responsive strategy

Mobile-first Tailwind. The brief's bands map to Tailwind's breakpoints: small mobile < 375 (base), mobile 375 to
767 (`sm` 640 refines), tablet 768 to 1023 (`md`), laptop 1024 to 1439 (`lg`, `xl` 1280), large desktop 1440+
(`2xl` 1536). Rules: content max width 1180 (marketing) and 1280 (dashboards); two columns from `md` where
content allows; the full top nav from `lg` and a menu below it; tables become stacked lists under 768 px;
dialogs become bottom sheets under 768 px; 44 px touch targets; safe-area padding on fixed bottom elements;
`minmax(0, 1fr)` grid tracks and `break-words` so long strings never widen a page.

**Result on the website:** 15 pages (every public page, sign-in, register, 404, `/brand`) at 9 widths (320, 375,
390, 430, 768, 1024, 1280, 1440, 1920): no horizontal scroll, nothing past the viewport edge, no touch target
under 40 px. Light default; dark is opt-in (`data-theme="dark"`).

## 4. Plan by application (not started unless marked)

| Order | Application | Notes |
|---|---|---|
| Done | Design system, tokens, logo and icons, marketing website | This pass |
| 1 | **Customer web wallet** (`apps/app`, the `/wallet` area) | Shares the stack, auth and tokens; backend and `qr-token` exist. Home with balance and QR, wallet breakdown, rewards, merchants, vouchers, history, account |
| 2 | **Merchant dashboard** (`apps/app`, the `/merchant` area) | KPIs, customers, rewards and campaigns, staff and branches, transactions table, subscription. Needs the chart and table components (use the `dataviz` skill) |
| 3 | **Super-admin dashboard** | Merchants, settlements, audit logs, platform settings; typed confirmations for sensitive actions; clearly marked as platform admin |
| 4 | **Customer app, merchant app, staff/POS app** (Expo, `apps/customer`, `apps/business`) | Follow the mobile playbook: NativeTabs, Liquid Glass on controls, tokens from `ui-tokens`, logo and icons from `packages/brand/assets/png/expo`. POS prioritises scan-first, 56 px targets, duplicate-transaction protection (the backend already enforces idempotency keys) |

Each needs a short spec first (what the screens show, which functions and tables they read, what is out of scope).
Not started: no app was created for this pass.

## 5. Files and components affected in this pass

New: `packages/brand/**`; `packages/ui-tokens/src/contrast.ts` and its tests; web components `Badge`, `Card`,
`Skeleton`, `TileIcon`, `EmptyState`, `Dialog`, `ConfirmDialog`, `Toast` (+ `toast-state.ts`),
`WalletPreview`, `NetworkDiagram`, `SetupNotice`; the `/brand` page; `scripts/responsive-sweep.mjs`.
Changed: tokens (colours, scale, CSS generator, Tailwind theme), `Logo`, `ButtonLink`, `TextField`, `Steps`, the
site nav and footer, the home page and every page that carried "Naga City" copy, the share image, the browser icons.
Not changed: authentication, database, Edge Functions and their tests, business logic.

## 6. Verification

`npm run check` (lint, typecheck, all package and web tests, SQL tests, Deno tests); builds; the responsive sweep
above; screenshots of the home page (320, 390, 768, 1280), the brand page, and the logo and icon sheet.
**Not checked:** dark mode on every page (screenshots of the home and For customers pages only), the dialog and
toasts by interaction (they render and type-check; the buttons were not clicked), a real device, iOS and Android
icon appearance in the OS, the sign-up and confirmation email round trip.
