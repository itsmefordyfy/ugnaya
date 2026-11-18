# UGNAYA project completion tracker

Started 2026-11-07, under the owner's grant of autonomy ("make the decisions, don't ask for routine approval").
Updated as work lands. Status words: **Done** (built and verified as described), **Built** (built, partly
verified), **In progress**, **Not started**, **Blocked** (by something only the owner can provide).

Owner's priority order (2026-11-07): 1 customer iOS app, 2 backend, 3 merchant portal, 4 Super Admin portal,
5 marketing site, 6 Android.

## Architecture (decided 2026-11-07)

| App | Folder | Domain | Dev port | Who |
|---|---|---|---|---|
| Marketing | `apps/marketing` | ugnaya.com | 3000 | Public |
| Customer web | `apps/app` | app.ugnaya.com | 3001 | Customers (web wallet); merchant entry points moved out |
| Merchant portal | `apps/merchant` | merchant.ugnaya.com | 3003 | Business owners, managers, branch managers, cashiers |
| Super Admin portal | `apps/admin` | admin.ugnaya.com | 3002 | UGNAYA staff (five roles, MFA) |
| Customer mobile app | `apps/customer` | App Store / Play | — | Customers (React Native + Expo, iOS first) |
| Backend | `supabase/` | the Supabase project (no separate api.ugnaya.com) | — | — |

Each web app is its own deployment with host-only session cookies; sessions are never shared across subdomains.
Authorisation is in Postgres: row-level security plus SECURITY DEFINER functions that check the caller (merchant
role via `staff_role`, branch scope via `my_branch_scope`, admin permission + `aal2` via `require_admin_permission`).
No service-role key in any app.

## 2. Backend (Supabase)

| Feature | Status | Evidence |
|---|---|---|
| Merchant application workflow: draft → pending review → under review → info required → approved / rejected → suspended / reactivated, with history (`merchant_reviews`, append-only) | Done | `10_admin_modules.sql`, pushed 2026-11-07 |
| Verification documents (private bucket `merchant-documents`, path-scoped storage policies, `merchant_documents`) and logos (public `merchant-logos`) | Done | `11_merchant_portal.sql` (folder isolation, file must exist) |
| Approval gate: rewards, campaigns (beyond drafts), counter devices, staff invites need an approved business | Done | `11_merchant_portal.sql` |
| Merchant dashboard, members, transactions, branch performance, campaign figures; branch managers scoped to their branches | Done | `11_merchant_portal.sql` |
| Staff: add (manager by login, cashier by PIN), edit, invitations (hashed single-use token bound to the email, 7 days) | Done | `11_merchant_portal.sql` |
| Web counter: award by member code, redeem voucher, idempotent per submission | Done | `11_merchant_portal.sql` |
| Admin functions: dashboard with date range, applications queue, merchant detail, decisions, notes, users (PII masked without `users.view_pii`), suspend/reactivate users (ban + end sessions), transactions, manual adjustments (idempotent), fraud flags, finance (list-price MRR only), subscriptions, analytics, alerts, settings, plans, announcements, grant admin by email, export audit | Done | `10_admin_modules.sql` |
| Customer app functions: home, wallet (available / held / expiry), activity, vouchers, discovery (search, category, nearby, favourites), merchant profile, rewards with eligibility, push tokens, preferences, account deletion (pseudonymised, ledger kept) | Done | `12_customer_app.sql` |
| In-app notifications on points earned / redeemed / voided / adjusted / expired (deferred trigger) | Done | `12_customer_app.sql` |
| Push sending (`push-dispatch` Edge Function through Expo) | Built | Deno tests 6/6; **not deployed** (deploy was blocked by the session's permission check) and the database webhook is an owner step |
| Security review fixes (migrations `0700`, `0800`): no attaching people to a business by email (invitations only; staff table not directly writable for role/membership); confirmed email to join a business or the admin team; administrator invitations replace grant-by-email; businesses can't read UGNAYA's internal audit rows; documents need `merchants.review` or `users.view_pii`; branch managers confined to their branches; names fixed after submission; logo paths validated; documents editable only in draft / info requested | Done | `13_security_fixes.sql`, pushed |
| Passkeys (WebAuthn MFA) for admins | **Blocked** | Supabase refused for this project ("not currently supported") and quotes it as a paid add-on (Advanced MFA, $75/month). TOTP at AAL2 stays. |

## 1. Customer iOS app (`apps/customer`)

**Built** (Expo SDK 58, Expo Router, TypeScript strict; per-feature detail in `apps/customer/IOS_COMPLETION_TRACKER.md`):
onboarding with Ugi, sign-up / sign-in / reset password (deep link `ugnaya://reset-password`), profile step, Home,
Wallet, My code (TOTP made on the phone, RFC test vectors pass), Discover, merchant profile, scanner (`M:<uuid>`),
rewards and voucher QR, vouchers, activity, notifications, push registration, settings (profile, preferences, password,
privacy, help, terms, delete account), light and dark, release config (`eas.json`, `release:ios`).

| Verified | How |
|---|---|
| Lint, typecheck, 18 unit tests | in the app |
| Sign-up, profile step, sign-in, session survives relaunch, errors, preferences saved, sign-out, account deletion | iPhone 18 Pro simulator against the hosted project |
| Every tab and settings screen, light (main ones dark) | screenshots |

**Blocked:** the member QR and vouchers need the `qr-token` Edge Function **deployed** (it answers 404). No approved
merchant exists yet, so shop, reward and voucher screens were seen only empty. Push needs a device, an EAS project and the
APNs key. Sign in with Apple needs Apple credentials (not built, no dead button). Test customer kept for QA:
`ios.test.customer.1107@ugnaya.com` (member `3GET7ZZ9`).

## 3. Merchant portal (`apps/merchant`, merchant.ugnaya.com, dev 3003)

**Built:** register (account → business → draft) → application (documents to the private bucket, history, the
reviewer's question and the reply, submit) → status everywhere until approved; dashboard (KPIs, daily chart, branches,
campaigns, top rewards, plan usage, announcements); profile and logo (names fixed after submission); branches and hours;
staff (PIN cashiers, invitations with a copyable link, `/invite/[token]`, edit, deactivate); loyalty program with a live
example; rewards; campaigns; customers; transactions; web counter (award by member code, redeem voucher, camera
scanning with typing fallback, one idempotency key per submission); printable store QR; plan and billing (honest: no
invoices yet); activity log. `apps/app` no longer handles merchants (redirects to the portal).

| Verified | How |
|---|---|
| Lint, typecheck, 122 unit tests, production build | 2026-11-07 |
| Visitors redirected to sign-in; public pages at 320–1280 px | dev server, headless Chrome |
| Sign-up → draft → upload (own folder only) → add document → submit → pending review; rewards locked; no other business visible; admin functions refused | API end to end against the hosted project (`e2e.merchant.1107@ugnaya.com`, "UGNAYA Test Café (E2E, delete me)", now in the admin queue) |

**Not verified:** the pages in a browser with a signed-in owner, the counter with a real member code (needs `qr-token`
deployed and an approved business), invitations accepted by a second person, the camera, printing.

## 4. Super Admin portal (`apps/admin`)

**Built:** overview with date range (KPIs, alerts, daily charts; revenue shown only as list-price MRR, collected revenue
"not available"), applications queue and review page (documents through 60-second signed links, history, notes,
decisions by status and permission), merchants directory, users (PII masked without `users.view_pii`, suspend /
reactivate), transactions and fraud flags, manual point adjustments, revenue and subscriptions, analytics, settings
(network switch, windows, plans, announcements), team with **invitation links** (single use, 72 h, bound to a confirmed
email), audit log with filters, CSV exports (audited, formula-injection safe), permission-gated sidebar.

| Verified | How |
|---|---|
| Lint, typecheck, 41 unit tests, production build | 2026-11-07 |
| Visitors redirected to sign-in on every route | dev server |

**Not verified:** anything signed in (needs the owner's authenticator code): the queue with the E2E test application,
decisions, signed document links, exports writing their audit row, charts in a browser.

## 5. Marketing site

| Item | Status |
|---|---|
| Business links (Register your business, business sign-in) go to the merchant portal; customer links to the app | Done (typecheck, lint, tests) |
| Redesign to the refined identity | Not started |

## 6. Android

Not started (after the iOS milestone).

## Tests run

| Suite | Result |
|---|---|
| `npm run test:sql` (14 migrations applied twice, 16 test groups) | pass (2026-11-07) |
| `npm run test:functions` (Deno: lint, check, 12 suites) | pass |
| `npm run check` (lint, typecheck, unit tests in every workspace, 18 SQL groups, Deno) | pass, exit 0 (2026-11-07, final) |
| `next build` for marketing, app, merchant, admin | all pass |
| API end to end against the hosted project (merchant registration to pending review, storage isolation, approval gate, cross-role refusals, customer home) | 17/17 pass |

## Bugs found and fixed

- A temporary table inside a STABLE function (admin user list) would fail at runtime; replaced with a helper function.
- Shared URL tests expected three apps; updated for the merchant portal.
- A branch manager could widen their own branches through `merchant_update_staff` (found by the merchant builder): fixed in `0700`.
- Independent security review of both portals (2026-11-07), all fixed with tests first:
  - HIGH: an owner could attach any existing account to their business by email (enumeration, lock the person out of
    registering or deleting their account, promote to owner).
  - HIGH: open redirect through `next=` with a tab or newline (merchant and customer web apps).
  - HIGH (while email confirmation is off): admin access granted by email could be captured by pre-registering the
    address. Now invitation links.
  - MEDIUM: the admin idle timeout never fired (the cookie expired with the limit). Now a missing stamp counts as idle.
  - MEDIUM: businesses could read UGNAYA's internal audit rows (fraud reasons, admin IPs).
  - MEDIUM: owner ID documents visible to admin roles without access to personal data.
  - LOW: branch-manager scope, names changeable after approval, logo path spoofing, documents removable after submission.

## External dependencies (owner)

| What | Why |
|---|---|
| **`npm run functions:deploy`** (all Edge Functions: `qr-token`, `award`, `redeem`, `void`, `staff-unlock`, `notify-merchant-signup`, `push-dispatch`). The deploy was blocked by this session's permission check | **The iOS app's member QR and vouchers**, the counter app, push |
| (fixed 2026-11-07) The first deploy failed for all seven functions (`Relative import path "@supabase/server" not prefixed…`): the shared `supabase/functions/deno.json` wasn't used. `supabase/config.toml` now sets `import_map` for each function; run `npm run functions:deploy` again | — |
| Approve the E2E test application in the admin portal (your first real admin sign-in), then delete or suspend it before launch | Admin portal check |
| Database webhook: `notifications` INSERT → `push-dispatch`, header `apikey` = secret key | Push notifications |
| Apple Developer account, APNs key uploaded to EAS, EAS project id | iOS push, TestFlight |
| Payment provider decision | Invoices, payments, refunds, collected revenue (merchant billing, admin revenue) |
| Resend (or SMTP) | Decision emails to merchants, confirmation emails; until then merchants see decisions in the portal |
| Re-enable email confirmation (`enable_confirmations = true`, `npx supabase config push`) before real sign-ups | Turned off on the owner's request |
| Passkeys: Supabase Advanced MFA add-on, if wanted | Phishing-resistant admin MFA |
| Vercel projects + DNS for merchant.ugnaya.com and the others | Deployment |
