# UGNAYA foundation: decisions made during the build

Every place the build departed from, or settled something left open by, the design and the three plans, in the order made. Each line ends with what it costs if the call was wrong. Then the final review's outcome and the findings deferred. Copied from the executor's ledgers on 2026-11-06.

## Plan: 2026-11-06-ugnaya-foundation-1-monorepo.md

- Setup: Ruling: new repo; main holds only the design and plans (aa5060c); all work on branch `foundation` — never implement on main — cost if wrong: none, merge when approved.
- Setup: Ruling: commit trailer is `Co-Authored-By: Claude Opus 5.5` (session model changed; the harness attribution wins over the plan text) — cost if wrong: cosmetic.
- T3 (ui-tokens write-css.mjs <outFile>) → plan 3 T1 predev/prebuild: matches.
- T4 normalizePhMobile → plan 3 T3 `normalizeMobile` "re-exported": Ruling: plan 3 re-exports it as `export { normalizePhMobile as normalizeMobile }` — names differ by design, no conflict.
- T4 parseMemberCode alphabet [A-HJ-NP-Z2-9]{8} vs plan 2 generate_member_id alphabet ABCDEFGHJKLMNPQRSTUVWXYZ23456789: same set. Seed ids AB2CD3EF, XY7PQ2RS valid.
- T4 web code `W` + 10..64 base64url vs plan 2 qr-token W + 16 chars and test W + 12: inside range.
- T5 db placeholder → plan 2 T10 replaces it: matches.
- Task 1: Ruling: platform-design skill's Bubblie font line replaced with Inter (spec section 12) and SDK 57 pinned line generalised — copied text would have contradicted the spec — cost if wrong: one paragraph
- Task 2: Ruling: added @types/node@22 and "types": ["node"] to the base config — node:test and node:assert imports in Tasks 3-4 need them — cost if wrong: one dev dependency
- Task 3: Ruling: package test script is node --test "src/**/*.test.ts" (a glob), not "src/" — Node 22 treats a bare directory as a module path and fails — applies to every package's test script — cost if wrong: none
- Task 3: Ruling: root eslint gives all files Node globals (globals package) — scripts use process/console — cost if wrong: browser code in packages would not get no-undef on Node globals
- Task 4: Ruling: NETWORK_RULE typed as the exported PerPesoRule (narrower than the brief's EarningRule) — offerValueRatio needs a per-peso rule and every EarningRule consumer still accepts it — cost if wrong: none
- Task 4: Ruling: redemption token pattern is lowercase hex 8..128 chars — plan 2 issues 64-char hex tokens — cost if wrong: a non-hex token format later needs this regex changed
- Task 5: Ruling: db has no test script at all (the brief's no-op test script dropped) — npm test --workspaces --if-present skips it cleanly — cost if wrong: none
- Task 5: Ruling: Tables<T> typed against a conditional PublicSchema so it compiles on the placeholder — plan 2 Task 10 rewrites index.ts on real types

## Plan: 2026-11-06-ugnaya-foundation-2-backend.md

- T2 harness → every SQL task: test helpers test.as_user/as_service/reset/assert/assert_raises (+ test.grant_points added for T6).
- T3 points_for_amount ↔ @ugnaya/rules pointsForPurchase: same vectors (README) — check T3 test values against rules README: match.
- T4 register_merchant/verify_merchant ↔ T5 redefinition at end of migration 4: plan says migration 3 versions must not touch loyalty_programs — consistent.
- T4 audit_logs in migration 3 ↔ log_audit used by T5-T7: consistent.
- T5 award_points jsonb ↔ T10 AwardResult, T11 award handler: shapes from T5; T10/T11 consume.
- T7 verify_member_code ↔ T11 award handler (rpc 'verify_member_code', p_code): consistent.
- T4 check_staff_pin(p_device_user, p_pin) ↔ T11 staff-unlock: consistent.
- T6 issue_redemption_token(p_customer_id, p_reward_id) ↔ T11 qr-token redemption: consistent.
- T8 grants: points functions service_role only ↔ T11 uses ctx.supabaseAdmin.rpc: consistent.
- Task 1: Ruling: redirect list also allows 127.0.0.1:3000 and www.ugnaya.ph — local dev opens either host; www is a common alias — cost if wrong: two extra allowed redirect hosts the owner controls
- Task 2: Ruling: helpers live in scripts/sql-tests/helpers.sql (not supabase/tests/00_harness.sql), roles in roles.sql — supabase/tests then holds only real tests and run.sh needs no skip rule — cost if wrong: none
- Task 2: Ruling: concurrency tests are scripts/sql-tests/*.test.mjs, run by run.sh on their own fresh database — T9's file becomes concurrent-redeem.test.mjs — cost if wrong: none
- Task 2: Ruling: stand-ins mirror Supabase's default grants (all on new tables/functions to anon, authenticated, service_role) — so T8 must revoke what clients may not do, as on the hosted project — cost if wrong: a test passing locally that fails hosted
- Task 3: Ruling: per_visit uses p_points_per_unit as its points and raises amount_invalid when ≤ 0 (mirrors rules) — the brief's signature has no separate points arg — cost if wrong: none
- Task 4: Ruling: new error codes pin_invalid (PIN not 4-6 digits) and pin_taken (another active staff of the merchant has that PIN) — the PIN alone identifies the cashier, so it must be unique per merchant — Edge Function map gets both (400, 409) — cost if wrong: owners must pick distinct PINs
- Task 4: Ruling: merchant_limits.max_award_per_tx_centavos default 3,000,000 (₱30,000), not the brief's 2,000,000 — T5's own test expects 3,000,001 to be the first refused amount — cost if wrong: one default
- Task 4: Ruling: managers may set their own PIN as well as cashiers' — a manager also works the counter — cost if wrong: none
- Task 4: Ruling: audit_logs gains merchant_id (indexed) — T8's 'owners see their merchant's audit log' policy needs it — cost if wrong: none
- Task 5: Ruling: tables with points history are ON DELETE RESTRICT (accounts, transactions, ledger, programs) instead of cascade — a cascade would hit the immutable ledger anyway; customers leave by pseudonymisation (later function) — cost if wrong: deleting an auth user with history fails until that function exists
- Task 5: Ruling: new code request_invalid for a missing or over-long idempotency key (400) — no listed code fit — cost if wrong: none
- Task 5: Ruling: shared helpers lock_account, post_entry, assert_counter added to migration 5 — redeem and void need the same checks — cost if wrong: none
- Task 5: Ruling: a merchant with no active program raises merchant_inactive on award — awarding nothing isn't a useful outcome — cost if wrong: a verified merchant whose program the owner switched off can't award
- Task 5: Ruling: daily-limit count excludes voided awards; the 19950 case moved to c2 so c1's daily limit is reached exactly at the 4th award — cost if wrong: none
- Task 6: Ruling: an expired token is refused with token_expired but NOT marked 'expired' in the table — raising rolls back any update in the same call; expires_at is the truth and a later cleanup can mark them — cost if wrong: dashboards counting 'issued' tokens include expired ones until cleanup
- Task 6: Ruling: first_visit_only is checked when the token is issued, not when it is redeemed — the redeeming visit often has its own award first, which would block the reward it was meant for — cost if wrong: a customer could issue the token before a first visit and use it later
- Task 6: Ruling: added a 'two tokens for the same points' case — balance is checked at scan time, so the second scan gets insufficient_points
- Task 7: Ruling: an empty void reason raises request_invalid, not amount_invalid — consistent with T5's request_invalid — cost if wrong: none
- Task 7: Ruling: managers and owners void from owner mode with no device (p_device_id null); a manager only at their branches — cashiers must use the original device — cost if wrong: none
- Task 7: Ruling: the write-off row is posted before the void row — balance has a >= 0 check, so a void of -60 on a balance of 20 must follow the +40 write-off — cost if wrong: none
- Task 7: Ruling: voiding a redemption with stock gives the stock back — cost if wrong: one unit miscounted
- Task 7: Ruling: void_rate rule implemented and tested (brief only named it) — flagged when voids/awards > 0.2 over the staff member's last 50, with at least 10 awards — cost if wrong: noisy flags for small shops
- Task 7: Ruling: web codes are consumed at verify time (deleted) even if the award that follows fails — the web wallet makes a new one in a tap — cost if wrong: a retry needs a fresh QR
- Task 8: Ruling: merchants and merchant_branches are staff/admin-only tables; the public directory is two views (merchant_directory, branch_directory) exposing only public columns of active merchants — the brief's 'everyone signed in reads active merchants' contradicted its own test and would expose owner_mobile and consents — cost if wrong: apps read the directory from views, not tables
- Task 8: Ruling: RLS enabled but NOT forced — the brief said force; forcing would subject the postgres-owned SECURITY DEFINER functions and views to RLS on the hosted project (untestable locally, where the superuser bypasses even forced RLS) — cost if wrong: the table owner can read past RLS, which only migrations and definer functions do
- Task 8: Ruling: default privileges revoked for future tables/functions (schema-level for anon/authenticated and the global PUBLIC execute default) — new SECURITY DEFINER functions would otherwise be callable by anyone — tested with a later function — cost if wrong: future migrations must grant explicitly
- Task 8: Ruling: test 02's visitor case now expects 'permission denied' (no execute right) instead of sign_in_required — stricter, the function's own check still covers anonymous devices — cost if wrong: none
- Task 8: Ruling: verify_merchant execute granted to authenticated (it checks is_platform_admin itself) so the founder can run it while signed in — cost if wrong: none
- Task 9: Ruling: file is scripts/sql-tests/concurrent-redeem.test.mjs (T2 ruling), with a deterministic case (A holds its transaction, B must wait then get token_used) besides the simultaneous one — Promise.all alone may not overlap — cost if wrong: none
- Task 10: Ruling: types generated with CLI 3's gen types --remote=<postgres url> against the throwaway Postgres on 127.0.0.1 (no Docker needed); output left unformatted (no formatter in this repo by the owner's rule) — cost if wrong: a noisy diff when regenerated
- Task 10: Ruling: added Views<> and an ErrorCode union, and src/types.check.ts (compile-time assertions) as the package's test — cost if wrong: none
- Task 11: Ruling: handlers take a small Ctx interface (userId, isAnonymous, rpc, selectOne, insert, update) built from @supabase/server's context by _shared/context.ts — tests fake four methods instead of the supabase-js query chain — cost if wrong: none; the adapter is type-checked against the real package
- Task 11: Ruling: requireCounter also checks the grant's merchant matches the device's — a grant is device-bound already, merchant check is belt and braces — cost if wrong: none
- Task 11: Ruling: notify-merchant-signup's webhook sends the secret key in the apikey header (@supabase/server secret mode reads only apikey; legacy service-role JWT not accepted, per its README) — cost if wrong: the webhook gets 401 until the header is fixed
- Task 11: Ruling: the void function is cashier mode only; manager/owner voids from owner mode come with the business app — cost if wrong: none
- Task 11: Ruling: test:functions runs deno lint + deno check (entry points, downloads @supabase/server) + deno test — cost if wrong: needs network on first run
- Task 12: Ruling: db:push and db:types pass --remote — CLI 3 targets the local database by default — cost if wrong: none
- Task 12: Ruling: Google sign-in ships enabled = false in config.toml; the guide says to flip it once the OAuth client exists — pushing it on with unset env() credentials would fail config push — cost if wrong: one line to change
- Task 12: Ruling: guide step 10 runs verify_merchant as yourself by setting request.jwt.claims in the SQL Editor (it runs as postgres, so auth.uid() is null) — no admin console yet — cost if wrong: the founder verifies via the console later

## Plan: 2026-11-06-ugnaya-foundation-3-website.md

- T1 predev/prebuild → packages/ui-tokens/scripts/write-css.mjs <outFile>: exists (plan 1 T3).
- T3 validation normalizeMobile ← @ugnaya/rules normalizePhMobile: re-export under the plan's name.
- T3 plans.ts prices/limits ↔ plan_limits seed (migration 1): 0/39900/89900/199900/null(500000 "from about") — Enterprise shows "from about ₱5,000"; plan_limits has 500000: consistent.
- T7 register_merchant(p_trade_name, p_category, p_city, p_address, p_branch_count, p_owner_mobile, p_heard_from, p_marketing_consent) ↔ migration 4: matches; errors already_registered, sign_in_required. Visitor (anon) now gets permission denied, not sign_in_required → T7 maps any error whose message starts with 'permission denied' to the sign-in redirect too.
- T8 waitlist insert (contact, kind, city) ↔ migration 6 grants insert on those columns to anon and authenticated: matches.
- T7/T8 getOwnedMerchant: merchant_staff (role owner, user_id = me) join merchants — RLS lets staff read both: matches.
- T6 createServerClient<Database> ← packages/db generated types: exists.
- Task 1: Ruling: kept create-next-app 16.4's defaults cacheComponents and partialPrefetching — marketing pages prerender; every cookie/searchParams read goes inside <Suspense> (bundled docs: authentication-with-cache-components.md) — cost if wrong: switch the flag off and drop the boundaries
- Task 1: Ruling: web tsconfig keeps Next's generated options plus allowImportingTsExtensions and target ES2022 instead of extending tsconfig.base (NodeNext would break Next's bundler resolution) — packages import with .ts extensions — cost if wrong: none
- Task 1: Ruling: next-agent AGENTS.md from create-next-app kept in apps/web (Next re-adds it on dev); .env.example un-ignored at root and in apps/web — cost if wrong: none
- Task 2: Ruling: icons are inline SVG paths copied from @material-symbols/svg-400 (Rounded) by apps/web/scripts/build-icons.mjs — Material Symbols isn't in next/font and an icon font would load ~MBs — cost if wrong: none
- Task 2: Ruling: Inter loaded as one variable font file (no weight list) — ui-ux-pro-max nextjs 'use variable fonts' — cost if wrong: none
- Task 2: Ruling: added app/icon.svg, not-found.tsx, error.tsx (retry prop, per this version's docs); removed the template favicon.ico — cost if wrong: none
- Task 3: Ruling: registerStep takes { user: { id } | null } (no emailConfirmed) — with confirmations on Supabase gives no session before confirming, so a signed-in user is always confirmed — cost if wrong: none
- Task 3: Ruling: categories, heard-from options and their labels live in lib/validation.ts so the form and the parser share one list — cost if wrong: none
- Task 4: Ruling: home follows ui-ux-pro-max's closest landing pattern (Hero > Problem > Solution > CTA) without the testimonials section — the spec forbids invented testimonials and there are none yet — cost if wrong: none
- Task 4: Ruling: /contact is a mailto button, not a formsubmit.co form — hello@ugnaya.ph isn't confirmed to exist, and a form posting to an unverified inbox loses messages silently — cost if wrong: add the form once the address works
- Task 4: Ruling: button variants reward and onPrimary added to ButtonLink instead of !important overrides — cost if wrong: none
- Task 5: Ruling: a small tested Markdown renderer (lib/markdown.ts + components/ui/prose.tsx; ##, ###, lists, bold, safe links) instead of a react-markdown dependency — cost if wrong: a richer document needs the parser extended
- Task 5: Ruling: legal content lives in src/content/*.ts modules exporting the Markdown string, not .md files read with fs — no filesystem reads, so Cache Components prerenders them with no special handling — cost if wrong: none
- Task 6: Ruling: gateFor(path, { signedIn, hasMerchant }) — /login sends a signed-in owner to /app and a signed-in user with no business to /register; /app redirects to /login?next=/app — plus safeNext() so a next parameter never leaves the site (open-redirect guard, tested) — cost if wrong: none
- Task 6: Ruling: the proxy passes setAll's no-cache headers to the response (this @supabase/ssr version supplies them so auth responses are never cached) and does nothing when the Supabase env is missing, so the marketing site runs without it — cost if wrong: none
- Task 6: Ruling: 'Continue with Google' shows only when NEXT_PUBLIC_GOOGLE_SIGN_IN=true — Google ships off in config.toml (plan 2 T12), and a button that always errors would be worse than none — cost if wrong: one env var
- Task 6: Ruling: getViewer uses auth.getUser() (checked with Supabase) and treats anonymous users (cashier devices) as signed out — cost if wrong: one auth call per signed-in page
- Task 6: Ruling: shared form primitives TextField, SubmitButton, FormMessage in components/ui; the Google button in the (auth) group's private _components — cost if wrong: none
- Task 7: Ruling: the tested core is lib/register-merchant.ts (registerMerchantCore), not inside actions.ts — the actions file imports the server Supabase client (server-only), which can't load in Node's test runner — cost if wrong: none
- Task 7: Ruling: 'permission denied…' from register_merchant also redirects to /login?next=/register — since plan 2 T8 a visitor has no execute right and gets that instead of sign_in_required — cost if wrong: none
- Task 7: Ruling: the check-email step reads the address from a short-lived httpOnly cookie set by the sign-up action, not ?email= in the URL — keeps a personal email out of URLs and server logs — cost if wrong: the resend button is hidden if cookies are blocked
- Task 7: Ruling: the confirmation link returns to the origin the owner signed up on (Origin header, else ugnaya.ph) so local sign-ups confirm on localhost — localhost is in the allowed redirects — cost if wrong: none
- Task 8: Ruling: the proxy answers /app with a 307 to /login?next=/app when the validated claims show no (non-anonymous) session — a redirect from inside a streamed Suspense boundary can only happen in the browser (200 + client redirect); the page still checks itself — cost if wrong: none
- Task 8: Ruling: server createClient reads cookies() before the env check, so prerendering stops at the request-time read instead of throwing at build when env vars are absent — cost if wrong: none
- Task 8: Ruling: the waitlist has a hidden honeypot field (bots fill it; the action pretends success) instead of a rate limiter — cheapest bot deterrent with no store — cost if wrong: determined bots still get through; add a rate limit then
- Task 9: Ruling: hand test against the hosted project NOT run — the owner hasn't done docs/SUPABASE_SETUP.md and there is no publishable key; the plan's precondition says to run local checks only and record it — cost if wrong: sign-up, the confirmation email, the business step, /app with a session and the waitlist insert are unverified end to end
- Final: Ruling: re-graded by effect; all 5 Important kept Important (#4 is a deployment step, fixed in docs, no test possible); no Minor re-graded up — each is either guarded elsewhere (assert_counter, merchant status checks) or belongs to the mobile round

## Final review (fresh reviewer, whole branch)

- Final review: dispatched (model fable, whole branch aa5060c..cb9a055, filtered diff): 0 Critical, 5 Important, 9 Minor; verdict 'With fixes'.
- Final: Ruling: re-graded by effect; all 5 Important kept Important (#4 is a deployment step, fixed in docs, no test possible); no Minor re-graded up — each is either guarded elsewhere (assert_counter, merchant status checks) or belongs to the mobile round
- Final: fixed confirmation link always went to production and dropped next — confirm-url.test.ts (template uses {{ .RedirectTo }}, redirect is <origin>/auth/confirm) RED→GREEN, web suite 28/28. CORRECTS the Task 7 ruling: before this fix local sign-ups did NOT confirm on localhost
- Final: fixed cashier PIN brute force — 02_register_merchant.sql (5 wrong PINs lock the device 15 min, right PIN resets) RED→GREEN; staff-unlock.test.ts device_locked → 429 RED→GREEN; migration 20261106000800; check_staff_pin now returns null for a wrong PIN so the failure count survives
- Final: fixed two businesses for one owner on a concurrent double submit — register-concurrent.test.mjs (second call waits, then already_registered; one owner row) RED→GREEN; advisory xact lock in register_merchant
- Final: fixed a suspended shop's program unreadable by its customers — 06_rls.sql (customer with an account still reads the program; a stranger doesn't) RED→GREEN; has_account_in() in the loyalty_programs policy
- Final: fixed (docs) Edge Functions refuse legacy HS256 sessions — SUPABASE_SETUP.md step 7 now checks JWT Signing Keys first; CLAUDE.md gotcha
- Final: suite after fix pass: npm run check → lint 0, typecheck 0, web 28/28, packages 18/18, SQL 8 migrations twice + 8 files + 2 concurrency tests, Deno 11 files/39 steps; next build 0

## Deferred minor findings

- devices/merchant_staff inserts accept any user_id and devices.branch_id isn't checked against the merchant (SQL functions still refuse cross-tenant use) — mobile round, register_device()
- owners can switch their program active before verification (every award checks merchant status) — drop active from the grant later
- unbounded customer_devices per customer; no cleanup of expired web codes and stale issued redemptions
- the spec's device-signature scheme replaced by the anonymous device session without a written note; devices.public_key unused
- register_merchant doesn't itself require email_confirmed_at (holds today because confirmations are on)
- TOTP codes replayable within their 90-second window (no last-used counter)
- pin_taken tells a manager another staff member's PIN exists
- /register?step=check-email with no cookie shows no address, and doesn't say 'already have an account? sign in' for Supabase's anti-enumeration fake success
- getOwnedMerchant throws on two rows (now impossible after the advisory lock)
