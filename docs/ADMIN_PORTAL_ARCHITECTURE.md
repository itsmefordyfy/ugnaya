# Super Admin Portal: repository audit and architecture plan

Written 2026-11-07 against the owner's brief. Every statement about the database was read from
`supabase/migrations` (not assumed). Anything the brief asks for that has no source data is listed as a gap and
is not shown as a number until the source exists.

## 1. Repository audit

| Area | Today |
|---|---|
| Apps | `apps/marketing` (ugnaya.com), being split from the old `apps/web`; `apps/app` (app.ugnaya.com) in progress; no Expo apps; no admin app |
| Shared | `packages/ui-tokens`, `brand`, `rules`, `db`, and (new) `web-ui` for the Next.js apps |
| Auth | Supabase Auth (email + password). Anonymous sign-ins for cashier devices. TOTP MFA is enabled on the project |
| Roles in the database | `staff_role` owner/manager/cashier per merchant; customers (`customer_profiles`); **one flat `platform_admins` table**: any row is a full administrator, no MFA requirement, no permissions |
| Admin functions today | `verify_merchant(id, plan, founding)` only (approve; no reason, no rejection, no history) |
| Edge Functions | `award`, `redeem`, `void`, `qr-token`, `staff-unlock`, `notify-merchant-signup`; none are admin functions |
| Billing | `subscriptions` (plan, status, period, `provider_customer_id`) and `plan_limits` (list prices). **No payment provider, no invoices, no payments** |
| Audit log | `audit_logs` (actor, role, action, entity, before/after, reason, device) written by `log_audit()`. **Not append-only: rows can be updated or deleted**, and there is no IP, request id or session id |

## 2. What the brief needs versus what exists

| Capability | Source in the database | Verdict |
|---|---|---|
| Customers, merchants, branches, staff counts | `customer_profiles`, `merchants`, `merchant_branches`, `merchant_staff` | Available |
| Merchant statuses | `merchants.status`: pending_verification, active, suspended, closed | **Partly**: no rejected, under review or info-required; no reason or decision history |
| Customer approvals | none (customers sign up freely) | **No source**: show "not applicable", not zero |
| User suspension, last login, email | `auth.users` (banned_until, last_sign_in_at, email) | Readable only server-side; suspending needs the Auth Admin API (Edge Function) |
| Transactions, points earned/redeemed, expiry, voids | `loyalty_transactions`, `points_ledger` (append-only, `earn/redeem/void/expire/adjust/bonus/write_off`) | Available |
| Outstanding points liability | `loyalty_accounts.balance` | Available **in points**; never in currency |
| Network vs merchant points | `loyalty_programs.scope` | Available |
| Rewards, redemptions, vouchers | `rewards`, `reward_redemptions`, `vouchers` | Available |
| Campaigns | `campaigns` (name, kind, audience, dates, status) | **Partly**: no participation or effectiveness data |
| Subscriptions by plan, status | `subscriptions` | Available |
| MRR / ARR | `subscriptions` x `plan_limits.price_centavos` | **List-price MRR only**: founding discounts and free pilots are not recorded, so it overstates; label it so |
| Collected revenue, invoices, payments, failed payments, refunds, discounts, renewals | none | **No source.** Needs a billing provider and tables; not shown until then |
| Settlements | `settlement_records` (draft amounts per period) | Partly: no reconciliation ledger |
| Merchant documents | none | **No source**: needs a private storage bucket, a table and an upload step in the merchant app |
| Support history, internal notes | none | New table for notes; no ticketing system exists |
| Notifications | `notifications` is for end-user messages, not admin alerts | New table |
| Daily/weekly/monthly active | `loyalty_transactions.customer_id` | **"Transacting" users only**: app opens are not tracked |
| Retention | derived from `loyalty_transactions` | Computable (definition below) |

## 3. Security architecture (defence in depth)

1. **Authorisation lives in Postgres, not in the app.** Every admin read and write is a `security definer` function that checks, inside the database, that the caller (a) is an active admin, (b) signed in with a second factor (`auth.jwt()->>'aal' = 'aal2'`), and (c) holds the specific permission. A forged route, a leaked publishable key or a modified frontend cannot get past it.
2. **No service-role key in any Next.js app.** The admin app uses the signed-in admin's own session and the publishable key. The few operations that genuinely need the Auth Admin API (inviting an admin, suspending a user, ending sessions) are **Edge Functions** that verify the caller's permission first and hold the secret key in Supabase's secret store.
3. **RBAC, deny by default.** Roles `super_admin`, `operations_admin`, `finance_admin`, `support_admin`, `analyst`, each mapped to explicit permissions (`merchants.review`, `merchants.suspend`, `users.view`, `users.view_pii`, `finance.view`, `finance.export`, `analytics.view`, `transactions.view`, `audit.view`, `admins.manage`, `notes.write`, ...). Role and permission changes are audited. Revoking an admin takes effect on their next request, because the check reads the table every time.
4. **The old flat `platform_admins` becomes a compatibility view.** Existing row-level policies that grant "admin sees everything" are tightened to super admins at AAL2 only; every other role reads through the permission-checked functions.
5. **Append-only audit log.** A trigger blocks `update` and `delete` on `audit_logs` for everyone; admin actions write their audit row **in the same transaction** as the change (all or nothing), with actor, role, action, target, before/after, reason, request id, IP and user agent where the app supplies them.
6. **No public admin registration.** The admin app has no register route. The first super admin is bootstrapped once by SQL (documented); later admins are invited by a super admin through an Edge Function. Accounts must enrol TOTP before they can do anything.
7. **Passkeys:** Supabase Auth has a WebAuthn factor, but on 2026-11-07 enabling it on this project was refused ("Enabling of MFA with WebAuthn not currently supported") and the CLI quoted it as a paid add-on (Advanced MFA, $75/month, then $10/month). A home-made passkey check cannot raise Supabase's `aal`, which the database requires, so it would not be a real second factor. TOTP at AAL2 stays enforced; passkeys need the owner to enable the add-on (then `[auth.mfa.web_authn]` in `config.toml` and a split ceremony: server actions enrol/challenge/verify, the browser only calls `navigator.credentials`, because the admin session cookies are HttpOnly).
8. **App hardening (admin app):** host-only Secure/HttpOnly/SameSite cookies, a 30-minute idle timeout, "sign out everywhere", strict Content-Security-Policy, HSTS, `X-Frame-Options: DENY`, `noindex`, no third-party scripts, an optional IP allow-list checked in the proxy (`ADMIN_ALLOWED_IPS`). Network controls (VPN, Cloudflare Access) are documented as the next layer; a hidden subdomain is never treated as a control.
9. **Rate limiting:** Supabase Auth's limits apply to sign-in; failed sign-ins are recorded by a function (Phase 11) so brute force is visible. Stronger throttling needs an edge layer.

## 4. Data model additions (new migrations; nothing existing is altered destructively)

`admin_members` (user, role, active, who added, revoked at/by), the permission function, `admin_session_check()`, an
append-only trigger and extra columns on `audit_logs` (request id, IP, user agent), `merchant_reviews` (decision
history: submitted, under review, info requested/provided, approved, rejected, suspended, reactivated; admin, reason,
time) plus three new `merchant_status` values (`under_review`, `info_required`, `rejected`), `admin_notes`,
`admin_notifications`, `merchant_documents` (with a private bucket), and aggregate functions for the dashboard.
Billing tables (`invoices`, `payments`) wait for the provider decision (section 7).

## 5. Application architecture

A third Next.js app, `apps/admin` (admin.ugnaya.com, dev port 3002), beside `marketing` (3000) and `app` (3001), all using
`packages/web-ui`, `ui-tokens` and `brand`. Its own layout (sidebar, top bar, no marketing), its own session cookies,
its own deployment. Data tables are paginated, sorted and filtered **in SQL**; the browser never receives whole tables.
Charts and KPIs come from aggregate functions over the real tables.

## 6. Metric definitions (so numbers are never ambiguous)

- Points earned = sum of `earn` + `bonus` ledger points; redeemed = sum of `redeem`; liability = sum of `loyalty_accounts.balance` (points, not money).
- Active customer (period) = a customer with at least one completed transaction in it. Customer retention (period) = active in this period and the previous one / active in the previous one. Merchant retention uses merchants with at least one transaction.
- MRR (list-price) = sum of `plan_limits.price_centavos` for active paid subscriptions; ARR = 12 x MRR; both labelled "list price, not collected".
- Points are never added to revenue, and revenue is never derived from points.

## 7. Open decisions

1. **Payment provider** (Stripe, Paddle, PayMongo, Xendit...). Without it there are no invoices, payments, failed payments, refunds or collected revenue to report.
2. **Email sender** (Resend/SMTP): approvals, rejections and admin alerts need it; the free Supabase sender cannot send them.
3. **Document storage for business verification:** private bucket plus an upload step in the merchant app.
4. **Network access:** VPN, Cloudflare Access or an IP allow-list for admin.ugnaya.com.
5. **Phishing-resistant MFA** route (see 3.7).

## 8. Phases and status

| Phase | Scope | Status |
|---|---|---|
| 1 | Repository and database audit, this plan | Done (this document) |
| 2 | Admin app, admin sign-in, mandatory MFA, hardened headers, idle timeout | **Built** (`apps/admin`); see section 9 for what is verified |
| 3 | RBAC: roles, permissions, enforcement in SQL, audit trigger, grant/change/revoke, revocation, with tests | **Built** (migration `20261107000100_admin_rbac.sql`, `09_admin_rbac.sql`). **Not built:** the admin *invitation* Edge Function (creating the new admin's auth account); until then admins are bootstrapped by SQL and cannot yet be added from the portal |
| 4 | Dashboard KPIs and charts from real aggregates | Planned |
| 5 | User management | Planned |
| 6 | Merchant applications and approval workflow | Planned (highest value after 3) |
| 7 to 12 | Business intelligence, finance, transactions/rewards/campaigns, subscriptions, notifications, reports | Planned; finance and billing blocked on decision 1 |
| 13 | Security testing and responsive QA | After each phase, and at the end |

## 9. Verification of phases 2 and 3

**Tested automatically:** 51 SQL assertions in `supabase/tests/09_admin_rbac.sql` (customers, merchant owners, cashier devices and anonymous callers
hold no permission even with a second factor; a super admin without the second factor can do nothing; each role holds exactly its permissions;
row-level access is super-admin-at-aal2 only; grant, role change and revoke are audited with actor, reason, request id, IP and user agent and take
effect on the next request; nobody changes their own access; the audit log cannot be updated, deleted or truncated, even by the table owner;
the first super admin can only be created from the SQL editor); the pure access rules (who reaches which page, the IP allow-list, the idle
timeout) and the Content-Security-Policy builder in `apps/admin` (12 tests).

**Checked against a running build:** a visitor reaches only `/login` (every other path redirects), the sign-in page has no registration link,
every script carries the per-request CSP nonce, security headers and `no-store` are set, no cookie is issued to a visitor, the IP allow-list
returns 403 outside the list (exact addresses, IPv4 ranges, first hop of `x-forwarded-for`), and no secret or service-role key appears in any
browser bundle of any app.

**Not verified:** a real admin signing in (password, then authenticator enrolment and verification) against the hosted project, the team and
audit pages with real data, the idle timeout in a browser, "sign out everywhere", phishing-resistant MFA (not available in Supabase Auth), the
audit of *failed* sign-ins (Phase 11), and the admin portal at tablet and phone widths (the layout is built for them; the responsive sweep has
not been run on it yet).

## 10. First super admin (once, by the owner)

1. Create the account: sign up in the **app** with a dedicated email, or use an existing dedicated account. (A later phase creates admin
   accounts through an invitation instead.)
2. In the Supabase SQL editor: `select bootstrap_super_admin('you@example.com');` It refuses if a super admin already exists, and cannot be
   called from any app or Edge Function.
3. Open `admin.ugnaya.com/login`, sign in, set up the authenticator app, and verify the code. Nothing in the portal works before that.

## 11. Portal modules (built 2026-11-07, phases 4 to 12 in the app)

Every module in `apps/admin` reads and writes only through the `admin_*` functions with the administrator's own session
(`lib/rpc.ts` `callAdmin`), and every page calls `requireAdmin(permission)`. Mutations are server actions in `src/actions/`
(plus `team/actions.ts`) that send `p_context` and a reason where the function needs one, then `revalidatePath`.

| Route | Function(s) | Permission |
|---|---|---|
| `/` Overview | `admin_dashboard`, `admin_alerts` | analytics.view (else a short "your access" card), notifications.view for alerts |
| `/applications`, `/merchants`, `/merchants/[id]` | `admin_list_merchants`, `admin_merchant_detail`, `admin_merchant_documents`, `admin_merchant_campaigns`, `admin_list_notes`/`admin_add_note`, `admin_review_merchant`, `admin_list_transactions` | merchants.view (+ review/suspend/notes.write/transactions.view per action) |
| `/merchants/[id]/documents/[documentId]` | signs a 60-second storage URL on click and redirects (303, no-store) | merchants.view |
| `/users`, `/users/[id]` | `admin_list_users`, `admin_user_detail`, `admin_set_user_suspended`, notes | users.view, users.suspend |
| `/transactions` (+ `?tab=flags`) | `admin_list_transactions`, `admin_adjust_points`, `admin_list_fraud_flags`, `admin_resolve_fraud_flag` | transactions.view, transactions.adjust, merchants.review |
| `/revenue`, `/subscriptions` | `admin_finance`, `admin_list_subscriptions`, `admin_update_subscription` | finance.view, subscriptions.view/manage |
| `/analytics` | `admin_analytics` | analytics.view |
| `/settings` | `admin_settings`/`admin_set_setting`, `plan_limits` (select RLS)/`admin_update_plan`, `admin_list_announcements`/`admin_save_announcement` | settings.manage |
| `/team` | adds `admin_grant_by_email` | admins.manage |
| `/reports`, `/export/{merchants,transactions,subscriptions}` | the list function (1,000 a page, at most 20,000 rows), then `admin_record_export` **before** the file is sent | reports.view or an export permission; export needs reports.export or finance.export |
| `/audit` | `audit_logs` select (super admin RLS), filters: action prefix, administrator, UTC days | audit.view |

Decisions made while building (the owner may overturn any):

- **A module whose function isn't on the database yet shows an in-place notice** (PGRST202), not an error page, so one
  missing function doesn't take the portal down. Failures never show as zeros.
- **Headers and buttons render only after the permission check**, so a role without access gets a plain 404 with no hint.
- **Timestamps** render in the viewer's locale and time zone in the browser (UTC on the server, swapped after hydration);
  daily buckets, date filters and CSV times are UTC and labelled so.
- **Documents** are signed when clicked, not when the page renders, so no link outlives 60 seconds unused.
- **Application tabs:** "All waiting" is oldest first (the database orders the queue that way); the single-status tabs
  are newest first, as `admin_list_merchants` orders them. A "Not submitted" tab lists drafts.
- **Manual adjustments** generate the idempotency key when the dialog opens and keep it across retries of that form, so
  a double submit applies once. The merchant pickers list up to 1,000 merchants by name.
- **CSV:** UTF-8 with a byte-order mark, CRLF, RFC 4180 quoting; text starting with `= + - @`, tab or CR gets a leading
  apostrophe; numbers are left as numbers (a negative points value is data, not a formula). Responses carry
  `X-Export-Rows`, `X-Export-Total` and `X-Export-Truncated`.
- **Charts** are server-rendered SVG bars with HTML labels (no chart script under the nonce CSP), a native tooltip per day
  and a "Show as table" view.
- **Nav badges** come from `admin_alerts` on each portal render (it runs `check_ledger()`; if that gets slow, cache it).
- The finance view shows list-price MRR/ARR and points liability only; payment history, failed payments, refunds and
  receivables say "Not available until a payment provider is connected". Merchant categories are a database enum
  ("changing categories requires a database migration").

**Not verified yet:** any module with a signed-in administrator against the hosted project (no admin session was
available): the real data shapes, the review workflow end to end, signed document links, exports' audit rows, the
dialogs in a browser, and the phone layout with real rows. Verified: lint, typecheck, unit tests (CSV, money, date range,
paging, review rules, chart scale, every admin error code has a sentence), `next build`, and that a visitor is redirected
to `/login` from every new route.
