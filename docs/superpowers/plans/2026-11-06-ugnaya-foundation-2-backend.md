# UGNAYA foundation, part 2: backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Supabase backend: the schema as re-runnable migrations, Row Level Security, the points functions whose ledger can never drift, the Edge Functions the apps will call, a seed, a local SQL test harness and Deno tests, and the owner's one-time setup guide.

**Architecture:** Every points movement is one `SECURITY DEFINER` Postgres function called by an Edge Function with the admin client after it has checked the caller; clients have no write grants on ledger, balance or transaction tables. Two kinds of session: owners and managers sign in themselves; a shared cashier device is an anonymous auth user tied to a `devices` row, and a cashier unlocks it with a PIN to get a signed 12-hour *staff grant*. SQL tests run on a throwaway Homebrew Postgres 14 with Supabase stand-ins (Bubblie's harness pattern); migrations must therefore use nothing newer than Postgres 14.

**Tech Stack:** Supabase CLI 3 (root dev dependency; `npx supabase`), Postgres 17 hosted / 14 local, `pgcrypto`, Deno 2 (Homebrew) with `npm:@supabase/server@1` in Edge Functions, `jsr:@std/assert` and `jsr:@std/testing` for tests, `pg` (Node) for the concurrency test.

**Spec:** `docs/superpowers/specs/2026-11-06-ugnaya-foundation-design.md` (sections "The backend", "Tests", "Deployment readiness", "Calls made after the builder check" 2 to 5)

## Global Constraints

- Project ref `ohicvyappmccynchzukg`, URL `https://ohicvyappmccynchzukg.supabase.co`, production domain `https://ugnaya.ph`.
- Migrations in `supabase/migrations/2026110600NN00_<topic>.sql`, each safe to run twice (`create … if not exists`, `create or replace`, `drop policy if exists` before `create policy`, `insert … on conflict do nothing`). Postgres 14 syntax only.
- Points carry no peso value anywhere in the schema or the API (no `value_centavos` on points; rewards carry a `retail_value_centavos` for the guideline only). No money moves between merchants; `settlement_records` exists and stays empty.
- Network rate: 1 point per ₱20; network points held 7 days (`available_at`); network issuance off until `platform_settings.network_enabled` is true.
- Voids: a cashier within 12 hours of their own transaction on the same device and branch (`void_window_hours`); manager or owner within 30 days (`manager_void_window_days`).
- Redemption tokens: 32 random bytes, stored as SHA-256 hex, valid 5 minutes (`redemption_token_minutes`), single use, same merchant only.
- Member code: `U:<member_id>:<6-digit TOTP>` (30 s step, one step of drift, SHA-1, RFC 6238) or `U:<member_id>:W<web code>` (random, 5 minutes). Redemption QR: `R:<token>`.
- Function error convention: `raise exception using message = '<code>', errcode = 'P0001'` with `<code>` one of `merchant_inactive`, `staff_not_allowed`, `device_not_allowed`, `amount_invalid`, `daily_limit`, `receipt_duplicate`, `customer_unknown`, `invalid_member_code`, `token_invalid`, `token_expired`, `token_used`, `insufficient_points`, `reward_unavailable`, `monthly_cap`, `first_visit_only`, `void_window`, `not_voidable`, `already_registered`, `sign_in_required`, `forbidden`, `ledger_immutable`. Edge Functions map these to HTTP status and `{ "error": "<code>" }`, and add their own: `grant_invalid` (401), `code_invalid` (400), `misconfigured` (500), `internal` (500).
- Daily limits and monthly caps count in Asia/Manila time: `(created_at at time zone 'Asia/Manila')::date`.
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. A cashier scanning the same customer twice in a row for two real purchases must not be blocked by idempotency: two different keys, two awards (test in Task 5, `03_award.sql`).
2. An award whose points were already spent, then voided: the balance floors at zero and the shortfall is a `write_off` ledger entry, so the ledger still sums to the balance and nothing goes negative (Task 7, `05_void.sql`).
3. Two cashiers redeeming the same token at the same second: exactly one succeeds (Task 9, `concurrent-redeem.mjs`).
4. A merchant suspended after issuing points: awards and redemptions stop, balances and history remain readable to the customer (Task 5 and Task 8, `06_rls.sql`).
5. A device whose auth user is deleted or whose `revoked_at` is set must be refused by every Edge Function before any SQL runs (Task 11, `device.test.ts`).

---

### Task 1: Supabase project files and config

**Files:**
- Create: `supabase/config.toml` (from `npx supabase init`, then edited), `supabase/templates/confirm.html`, `supabase/functions/deno.json`, `supabase/.gitignore` (as generated)
- Modify: `.gitignore` (add `supabase/.temp/`)

**Interfaces:**
- Produces: `config.toml` with `project_id = "ugnaya"`, `[db] major_version = 17`, `[auth] site_url = "https://ugnaya.ph"`, `additional_redirect_urls = ["http://localhost:3000/**", "https://ugnaya.ph/**"]`, `enable_anonymous_sign_ins = true`, `[auth.email] enable_confirmations = true`, `[auth.email.template.confirmation] subject = "Confirm your UGNAYA account"`, `content_path = "./supabase/templates/confirm.html"`, `[auth.external.google] enabled = true`, `client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"`, `secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"`, `[functions.notify-merchant-signup] verify_jwt = false`, and `verify_jwt = true` left for the others.
- `confirm.html`: the link is `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}` (the PKCE pattern from Supabase's passwords guide); plain HTML, UGNAYA blue button, one sentence in English.
- `supabase/functions/deno.json`: `{ "imports": { "@supabase/server": "npm:@supabase/server@1", "@supabase/supabase-js": "npm:@supabase/supabase-js@2", "@std/assert": "jsr:@std/assert@1", "@std/testing": "jsr:@std/testing@1" }, "tasks": { "test": "deno test --allow-env --allow-net=127.0.0.1 tests/" } }`.

- [ ] **Step 1:** `npx supabase init` at the repo root (answer no to VS Code/IntelliJ settings), then edit `config.toml` to the values above.
- [ ] **Step 2: Verify** `npx supabase status` is not usable without Docker; instead run `node -e "require('fs').readFileSync('supabase/config.toml','utf8').includes('ugnaya.ph') || process.exit(1)"` → exit 0, and `git check-ignore supabase/.temp` prints the path.
- [ ] **Step 3: Commit** `"Supabase config: ugnaya.ph, email confirmations, Google, anonymous device sign-ins"`.

---

### Task 2: SQL test harness

**Files:**
- Create: `scripts/sql-tests/run.sh`, `scripts/sql-tests/stand-ins.sql`, `scripts/sql-tests/README.md`, `supabase/tests/00_harness.sql`

**Interfaces:**
- Produces: `npm run test:sql`, which: starts a throwaway Postgres 14 on a Unix socket in `mktemp -d` (Bubblie's `scripts/test-supabase-sql.sh` is the model; copy its `psql_on`, `cleanup`, `initdb`/`pg_ctl` lines); creates roles `anon`, `authenticated`, `service_role` and `supabase_admin` once; applies `stand-ins.sql`; applies every `supabase/migrations/*.sql` in order **twice** on one database and fails if the second run errors; then for each `supabase/tests/*.sql` creates a fresh database (stand-ins + migrations once + `supabase/seed.sql`) and runs the file with `ON_ERROR_STOP`; prints `ok <file>` per file and `all sql tests pass`.
- `stand-ins.sql`: `create schema auth; create schema extensions; create extension if not exists pgcrypto schema extensions; create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', is_anonymous boolean default false, created_at timestamptz default now())`; functions `auth.uid() returns uuid` reading `current_setting('request.jwt.claims', true)::jsonb->>'sub'`, `auth.jwt() returns jsonb`, `auth.role() returns text`; `grant usage on schema extensions to public`; `alter database … set search_path = public, extensions`.
- Test helpers in `00_harness.sql` (applied before each test file; not itself a test): `create or replace function test.as_user(p_user uuid, p_role text default 'authenticated', p_anonymous boolean default false)` which runs `set role` and `set_config('request.jwt.claims', json, true)`; `test.as_service()`; `test.reset()`; `test.assert(p_ok boolean, p_message text)` raising on false; `test.assert_raises(p_sql text, p_code text)` which runs the SQL in a nested block and asserts the exception message equals `p_code`.
- `README.md`: how it works, "Postgres 14 locally vs 17 hosted: use nothing newer than 14", how to add a test, how to run one file (`bash scripts/sql-tests/run.sh 03_award`).

- [ ] **Step 1:** Write `run.sh` (accept an optional filter argument), `stand-ins.sql`, `00_harness.sql`, README.
- [ ] **Step 2: Verify** with an empty migrations folder: `npm run test:sql` → prints `all sql tests pass` with zero test files (the harness must not fail on "no migrations").
- [ ] **Step 3: Commit** `"SQL test harness on local Postgres with Supabase stand-ins"`.

---

### Task 3: Migration 1, platform

**Files:**
- Create: `supabase/migrations/20261106000100_platform.sql`, `supabase/tests/01_schema.sql`

**Interfaces:**
- Produces (public schema): enums `staff_role ('owner','manager','cashier')`, `merchant_status ('pending_verification','active','suspended','closed')`, `merchant_category ('cafe','milk_tea','restaurant','bakery','other_food','other')`, `program_scope ('merchant','network')`, `earning_rule_type ('per_peso','per_visit','stamps')`, `transaction_type ('award','redeem','void','adjustment')`, `transaction_status ('completed','voided')`, `ledger_entry_type ('earn','redeem','void','expire','adjust','bonus','write_off')`, `redemption_status ('issued','used','expired','cancelled')`, `plan_code ('free','starter','growth','business','enterprise')`.
- Tables: `platform_settings(key text primary key, value jsonb not null, updated_at timestamptz default now())` seeded with `network_enabled=false`, `void_window_hours=12`, `manager_void_window_days=30`, `redemption_token_minutes=5`, `network_hold_days=7`, `web_code_minutes=5`; `platform_admins(user_id uuid primary key references auth.users on delete cascade, created_at)`; `plan_limits(plan plan_code primary key, price_centavos int not null, branches int, staff int, rewards int, transactions_per_month int)` seeded free `0,1,2,1,300`, starter `39900,1,5,null,null`, growth `89900,3,15,null,null`, business `199900,10,50,null,null`, enterprise `500000,null,null,null,null` (null = unlimited).
- Functions: `setting_bool(p_key text) returns boolean`, `setting_int(p_key text) returns int` (stable, security definer), `is_platform_admin() returns boolean` (`exists (select 1 from platform_admins where user_id = auth.uid())`), `set_updated_at()` trigger function, `raise_code(p_code text)` (`raise exception using message = p_code, errcode = 'P0001'`), `points_for_amount(p_rule earning_rule_type, p_points_per_unit int, p_unit_centavos int, p_minimum_spend int, p_amount int) returns int` immutable (same semantics and errors as `@ugnaya/rules` `pointsForPurchase`; invalid inputs raise `amount_invalid`).
- Grants: `plan_limits` and `platform_settings` readable by `anon, authenticated`; `platform_admins` by nobody but service role (RLS in Task 8).

- [ ] **Step 1: Write the failing test** `supabase/tests/01_schema.sql`: asserts `points_for_amount('per_peso',1,1000,0,20000) = 20`, `('per_peso',1,2000,0,25000) = 12`, `('per_peso',1,1000,0,19950) = 19`, `('per_peso',1,1000,10000,9999) = 0`, `('per_visit',5,0,0,1) = 5`, `('stamps',0,0,5000,5000) = 1`, `test.assert_raises($$select points_for_amount('per_peso',1,0,0,100)$$, 'amount_invalid')`; `setting_bool('network_enabled') = false`; `(select price_centavos from plan_limits where plan='growth') = 89900`.
- [ ] **Step 2: Run** `npm run test:sql` → FAIL (function missing).
- [ ] **Step 3: Implement the migration.**
- [ ] **Step 4: Run** `npm run test:sql` → `ok 01_schema.sql`, migration applied twice without error.
- [ ] **Step 5: Commit** `"Migration: platform settings, enums, plan limits, points maths"`.

---

### Task 4: Migrations 2 and 3, customers and merchants

**Files:**
- Create: `supabase/migrations/20261106000200_customers.sql`, `supabase/migrations/20261106000300_merchants.sql`, `supabase/tests/02_register_merchant.sql`

**Interfaces:**
- `customer_profiles(user_id uuid pk references auth.users on delete cascade, public_member_id text not null unique, display_name text, birthday_month smallint check 1..12, birthday_day smallint check 1..31, city text, terms_accepted_at timestamptz, marketing_consent_at timestamptz, deleted_at timestamptz, created_at, updated_at)`; `generate_member_id() returns text` (8 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, via `gen_random_bytes`); trigger `handle_new_user()` on `auth.users` insert: when `new.raw_user_meta_data->>'user_type' = 'customer'`, insert a profile with a generated id (retry up to 5 times on unique violation).
- `customer_devices(id uuid pk default gen_random_uuid(), customer_id uuid references customer_profiles(user_id) on delete cascade, totp_secret bytea not null, label text, created_at, revoked_at)`; `member_web_codes(code_hash text primary key, customer_id uuid references customer_profiles(user_id) on delete cascade, expires_at timestamptz not null)`; `waitlist(id uuid pk, contact text not null check (length(contact) between 5 and 120), kind text not null check (kind in ('email','mobile')), city text check (length(city) <= 80), created_at)`.
- `merchants(id uuid pk, trade_name text not null check (length between 2 and 80), legal_name text, category merchant_category not null, city text not null, address text, branch_count_declared int, owner_mobile text, heard_from text, status merchant_status default 'pending_verification', network_participation boolean default false, terms_accepted_at timestamptz not null, privacy_accepted_at timestamptz not null, marketing_consent_at timestamptz, verified_at, verified_by uuid, created_at, updated_at)`; `merchant_branches(id, merchant_id references merchants on delete cascade, name text not null, address text, city text, lat numeric(9,6), lng numeric(9,6), hours jsonb, active boolean default true, created_at, updated_at)` index `(merchant_id)`; `merchant_staff(id uuid pk, merchant_id, user_id uuid references auth.users on delete set null, display_name text not null, role staff_role not null, branch_ids uuid[] null, pin_hash text, active boolean default true, created_at, updated_at)` with `create unique index … on merchant_staff(merchant_id, user_id) where user_id is not null`; `devices(id uuid pk, merchant_id, branch_id references merchant_branches, user_id uuid unique references auth.users on delete cascade, name text, public_key text, last_seen_at, revoked_at, created_at)`; `subscriptions(merchant_id uuid pk references merchants on delete cascade, plan plan_code default 'free', status text default 'active', founding boolean default false, founding_until date, period_start, period_end, provider_customer_id text, created_at, updated_at)`; `merchant_limits(merchant_id uuid pk, max_award_per_tx_centavos int default 2000000, max_awards_per_customer_per_day int default 3)`.
- Functions: `staff_role(p_merchant_id uuid) returns staff_role` (active row for `auth.uid()`, else null); `is_staff_of(p_merchant_id uuid) returns boolean`; `staff_at_branch(p_staff_id uuid, p_branch_id uuid) returns boolean` (`branch_ids is null or p_branch_id = any(branch_ids)`); `register_merchant(p_trade_name text, p_category merchant_category, p_city text, p_address text, p_branch_count int, p_owner_mobile text, p_heard_from text, p_marketing_consent boolean) returns uuid` security definer, `grant execute to authenticated`: raises `sign_in_required` when `auth.uid()` is null or `auth.jwt()->>'is_anonymous' = 'true'`; raises `already_registered` when the user already has an owner row; inserts the merchant (`terms_accepted_at`, `privacy_accepted_at` = now(), `marketing_consent_at` = now() if consented), a branch named `trade_name` with the address, the owner staff row (display_name from `raw_user_meta_data->>'full_name'` else email), a `subscriptions` row (free), a `merchant_limits` row, and an `audit_logs` row (Task 5 creates the table; this function is created in Task 5's migration order, so put `register_merchant` at the end of migration 3 and make `audit_logs` part of migration 3). `verify_merchant(p_merchant_id uuid, p_plan plan_code default 'free', p_founding boolean default false)` security definer: `is_platform_admin()` or raise `forbidden`; sets status active, verified_at/by, subscription plan and founding (`founding_until` = 12 months after today when founding), activates the merchant's default program (Task 5). `check_staff_pin(p_device_user uuid, p_pin text) returns uuid` security definer, service role only: device of that user, not revoked; staff of the device's merchant, active, assigned to the device's branch, `pin_hash = crypt(p_pin, pin_hash)`; returns the staff id or raises `staff_not_allowed`; a PIN of fewer than 4 digits raises too. `set_staff_pin(p_staff_id uuid, p_pin text)` for owners/managers of that merchant (4 to 6 digits; `crypt(p_pin, gen_salt('bf'))`).
- `audit_logs(id bigserial pk, actor_user_id uuid, actor_staff_id uuid, actor_role text, action text not null, entity_table text, entity_id text, before jsonb, after jsonb, reason text, device_id uuid, created_at)` and `log_audit(p_action text, p_entity_table text, p_entity_id text, p_before jsonb, p_after jsonb, p_reason text, p_staff_id uuid, p_device_id uuid)` security definer helper.

- [ ] **Step 1: Write the failing test** `02_register_merchant.sql`: insert an `auth.users` row `u1` with `raw_user_meta_data = '{"user_type":"merchant","full_name":"Juan Dela Cruz"}'`; `test.as_user(u1)`; `select register_merchant('Kape ni Juan','cafe','Naga City','Magsaysay Ave',1,'+639171234567','facebook',true)` returns an id; assert one merchant with status `pending_verification`, one branch named `Kape ni Juan`, one staff row role `owner` display_name `Juan Dela Cruz`, subscription plan `free`, `merchant_limits` row, audit row action `merchant.registered`; second call raises `already_registered`; `test.as_user(u2, 'authenticated', true)` (anonymous) raises `sign_in_required`; `test.reset()` then as a non-admin `verify_merchant(...)` raises `forbidden`; insert `u1` into `platform_admins`, `test.as_user(u1)`, `verify_merchant(id,'growth',true)` → status `active`, plan `growth`, `founding_until` = `current_date + interval '12 months'`; a customer user insert with `user_type = 'customer'` gets a `customer_profiles` row whose `public_member_id ~ '^[A-HJ-NP-Z2-9]{8}$'`, a merchant user gets none; `set_staff_pin` then `check_staff_pin` (needs a device: insert `auth.users` `d1` anonymous, `devices` row for branch) returns the staff id for `1234` and raises `staff_not_allowed` for `9999`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement both migrations.**
- [ ] **Step 4: Run** `npm run test:sql` → `ok 02_register_merchant.sql`.
- [ ] **Step 5: Commit** `"Migrations: customers, merchants, staff, devices, register_merchant"`.

---

### Task 5: Migration 4 (loyalty tables) and `award_points`

**Files:**
- Create: `supabase/migrations/20261106000400_loyalty.sql`, `supabase/migrations/20261106000500_points_functions.sql` (started here, extended in Tasks 6 and 7), `supabase/seed.sql`, `supabase/tests/03_award.sql`

**Interfaces:**
- Migration 4 tables: `loyalty_programs(id uuid pk, merchant_id uuid null references merchants on delete cascade, scope program_scope not null, name text not null, rule_type earning_rule_type not null, points_per_unit int default 1, unit_centavos int default 1000, minimum_spend_centavos int default 0, expiry_months int default 12, active boolean default false, version int default 1, created_at, updated_at)` with `create unique index … on loyalty_programs(scope) where scope = 'network'` and `… on loyalty_programs(merchant_id) where scope = 'merchant'` (one program per merchant this round); `loyalty_accounts(id uuid pk, customer_id uuid references customer_profiles(user_id) on delete cascade, program_id uuid references loyalty_programs on delete cascade, balance int not null default 0 check (balance >= 0), lifetime_earned int default 0, last_activity_at timestamptz default now(), created_at, updated_at, unique (customer_id, program_id))`; `loyalty_transactions(id uuid pk, merchant_id, branch_id, staff_id references merchant_staff, device_id references devices null, customer_id references customer_profiles(user_id), type transaction_type, status transaction_status default 'completed', amount_centavos int, receipt_no text, idempotency_key text not null, reverses_id uuid references loyalty_transactions, reason text, result jsonb, created_at timestamptz default now(), unique (merchant_id, idempotency_key))` plus `create unique index … on loyalty_transactions(branch_id, receipt_no) where receipt_no is not null and type = 'award'` and index `(merchant_id, created_at desc)`, `(customer_id, created_at desc)`; `points_ledger(id bigserial pk, account_id uuid references loyalty_accounts, transaction_id uuid references loyalty_transactions, entry_type ledger_entry_type not null, points int not null check (points <> 0), available_at timestamptz not null default now(), program_version int, created_at timestamptz default now())` index `(account_id, created_at)`; trigger `points_ledger_immutable` before update or delete raising `ledger_immutable`; `rewards(id uuid pk, merchant_id references merchants on delete cascade, program_id references loyalty_programs, name text not null, description text, points_cost int not null check (> 0), retail_value_centavos int, monthly_cap int, stock int, first_visit_only boolean default false, is_network_offer boolean default false, approval_status text default 'approved', active boolean default true, created_at, updated_at)`; `reward_redemptions(id uuid pk, reward_id references rewards, customer_id references customer_profiles(user_id), account_id references loyalty_accounts, transaction_id uuid references loyalty_transactions, token_hash text not null unique, expires_at timestamptz not null, status redemption_status default 'issued', points_cost int not null, used_device_id uuid, created_at, used_at)` index `(reward_id, used_at) where status = 'used'`; `vouchers`, `campaigns`, `referrals`, `notifications`, `merchant_contributions(merchant_id, month date, network_points_issued int, network_points_redeemed int, offer_value_given_centavos int, new_customers_via_network int, primary key (merchant_id, month))`, `settlement_records(id uuid pk, merchant_id, period_start date, period_end date, amount_due_centavos int, amount_owed_centavos int, status text, created_at)`, `fraud_flags(id uuid pk, merchant_id, customer_id, staff_id, device_id, transaction_id, rule text not null, details jsonb, status text default 'open', created_at)` with the column shapes from plan section 10 (the builder chooses types within it).
- Network program row: `insert into loyalty_programs (id, scope, name, rule_type, points_per_unit, unit_centavos, expiry_months, active) values ('00000000-0000-0000-0000-000000000001','network','UGNAYA network points','per_peso',1,2000,12,false) on conflict do nothing`.
- Migration 4 ends with `create or replace function register_merchant(...)` and `create or replace function verify_merchant(...)` (full bodies again, same signatures as migration 3): `register_merchant` now also inserts the merchant's default program (scope `merchant`, name `<trade_name> points`, `per_peso`, 1 per 1000, inactive) and `verify_merchant` activates it. Migration 3's versions must not reference `loyalty_programs` (the table does not exist when Task 4's test runs). This task adds two assertions to `02_register_merchant.sql`: one inactive program after registering, active after verifying.
- `available_balance(p_account_id uuid) returns int` = `coalesce(sum(points),0)` where `available_at <= now()`.
- `award_points(p_idempotency_key text, p_merchant_id uuid, p_branch_id uuid, p_staff_id uuid, p_device_id uuid, p_customer_id uuid, p_amount_centavos int, p_receipt_no text default null) returns jsonb` security definer, execute revoked from public and granted to `service_role` only. Returns `{ "transaction_id", "replayed": bool, "merchant": { "program_id", "points_earned", "balance" } | null, "network": { "points_earned", "balance", "available_at" } | null }`. Order of checks: existing transaction for (merchant, key) → return its stored `result` with `replayed = true`; merchant status `active` else `merchant_inactive`; staff active, of that merchant, `staff_at_branch` else `staff_not_allowed`; device (when given) of that merchant and branch and not revoked else `device_not_allowed`; customer exists and not deleted else `customer_unknown`; amount integer > 0 and ≤ `merchant_limits.max_award_per_tx_centavos` else `amount_invalid`; awards to this customer at this merchant today (Asia/Manila date) < `max_awards_per_customer_per_day` else `daily_limit`; receipt duplicate → `receipt_duplicate` (catch the unique violation); then in order: insert the transaction; for the merchant's active program, lock or create the account `for update`, compute points with `points_for_amount`, insert the ledger `earn` row (skip when 0), update balance/lifetime/last_activity; when `setting_bool('network_enabled')` and `merchants.network_participation` and the network program is active, the same with `available_at = now() + network_hold_days`; store `result` on the transaction; `log_audit('points.awarded', …)`; `run_fraud_rules(transaction_id)` (Task 7; a no-op stub here); return.
- `check_ledger() returns table (account_id uuid, balance int, ledger_sum bigint)` listing mismatches.
- `supabase/seed.sql`: fixed UUIDs (document them at the top): merchant `Kape ni Juan` (`active`, network_participation true) with branches `Magsaysay` and `Centro`; auth users + staff: owner `owner@demo.ugnaya.ph`, manager `manager@demo.ugnaya.ph` (branch Magsaysay), cashier `Ana` (PIN `1234`, no user, both branches); device user (anonymous) + `devices` row for Magsaysay; program `per_peso` 1 per ₱10 active; rewards `Free upsize` 40 points (retail 5000), `Free pastry` 120 points (retail 6000, monthly cap 30); customers `c1` (member id `AB2CD3EF`) and `c2` (`XY7PQ2RS`) with `user_type` customer; a second merchant `Lola's Kitchen` (`active`, restaurant, one branch, owner `owner2@demo.ugnaya.ph`, cashier `Ben` PIN `5678`, one device) so RLS tests have two tenants. Every insert `on conflict do nothing`.

- [ ] **Step 1: Write the failing test** `03_award.sql` (as service role; ids from the seed):
  - `award_points('k1', juan, magsaysay, ana, dev1, c1, 20000)` → `merchant.points_earned = 20`, `balance = 20`, `network` is null (network disabled), `replayed = false`; ledger has 1 row.
  - same key again → same `transaction_id`, `replayed = true`, ledger still 1 row.
  - `award_points('k2', …, c1, 20000, 'OR-1')` then `('k3', …, 'OR-1')` → `receipt_duplicate`; `'k2'` and a new key `'k4'` on the same customer both succeed (two real purchases).
  - amount `0` → `amount_invalid`; `3000001` → `amount_invalid`; `19950` → 19 points.
  - a fourth award to `c1` the same day → `daily_limit` (limit 3 per day; count k1, k2, k4).
  - Ben (Lola's cashier) at Magsaysay → `staff_not_allowed`; Ana at Lola's branch → `staff_not_allowed`; `dev2` (Lola's device) with Ana → `device_not_allowed`; a revoked device → `device_not_allowed`.
  - update `merchants` set status `suspended` → award raises `merchant_inactive`; set back.
  - `update platform_settings set value='true' where key='network_enabled'` → award ₱250 to `c2` → `network.points_earned = 12`, `network.available_at` within 1 minute of `now() + interval '7 days'`, `available_balance(network account) = 0` while `balance = 12`.
  - `check_ledger()` returns no rows; `update loyalty_accounts set balance = balance + 1` on one → `check_ledger()` returns 1 row; `update points_ledger set points = 1` → raises `ledger_immutable`; `delete from points_ledger` → raises.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** migration 4, the first part of migration 5 (`available_balance`, `award_points`, `check_ledger`, stub `run_fraud_rules`), the seed, and the `register_merchant` amendment.
- [ ] **Step 4: Run** `npm run test:sql` → `ok 03_award.sql` (and 01, 02 still ok).
- [ ] **Step 5: Commit** `"Migrations: loyalty tables, append-only ledger, award_points; demo seed"`.

---

### Task 6: Redemption tokens and `redeem_reward`

**Files:**
- Modify: `supabase/migrations/20261106000500_points_functions.sql`
- Create: `supabase/tests/04_redeem.sql`

**Interfaces:**
- `issue_redemption_token(p_customer_id uuid, p_reward_id uuid) returns jsonb` security definer, service role only: reward `active`, merchant `active`, `approval_status = 'approved'` else `reward_unavailable`; account for the reward's program (create if missing) with `available_balance >= points_cost` else `insufficient_points`; `monthly_cap` when the count of `used` redemptions of this reward in the current Asia/Manila month ≥ cap; `first_visit_only` when the reward is first-visit-only and the customer has a completed award at the merchant; `stock` ≤ 0 → `reward_unavailable`; generates `token = encode(gen_random_bytes(32), 'hex')`, stores `token_hash = encode(digest(token, 'sha256'), 'hex')`, `expires_at = now() + redemption_token_minutes`; returns `{ "redemption_id", "token", "expires_at", "points_cost", "reward_name" }`. Points are not deducted at issue.
- `redeem_reward(p_idempotency_key text, p_merchant_id uuid, p_branch_id uuid, p_staff_id uuid, p_device_id uuid, p_token text) returns jsonb` security definer, service role only. Returns `{ "transaction_id", "replayed", "reward_id", "reward_name", "points_cost", "balance" }`. Checks in order: replay → stored result; merchant active; staff/device as in award; redemption by hash `for update` else `token_invalid`; reward's merchant = `p_merchant_id` else `token_invalid`; status `issued` else `token_used` (for `used`) or `token_invalid`; `expires_at > now()` else mark `expired` and raise `token_expired`; account `for update`, `available_balance >= points_cost` else `insufficient_points`; insert transaction type `redeem`, ledger `redeem` row of `-points_cost`, balance and `last_activity_at` updated, redemption `used` with `used_at`, `used_device_id`, `transaction_id`; stock decremented when not null; audit `points.redeemed`.

- [ ] **Step 1: Write the failing test** `04_redeem.sql`: award `c1` 20 points → `issue_redemption_token(c1, upsize)` → `insufficient_points`; two more awards (60) → token issued, `expires_at` within 1 minute of `now() + 5 minutes`; `redeem_reward('r1', juan, magsaysay, ana, dev1, token)` → `points_cost 40`, `balance 20`, redemption status `used`; same key → `replayed = true`; same token with key `'r2'` → `token_used`; a made-up token → `token_invalid`; a token redeemed by Lola's cashier/device at Lola's → `token_invalid`; issue a token then `update reward_redemptions set expires_at = now() - interval '1 second'` → `token_expired` and status `expired`; monthly cap: set `monthly_cap = 1` on pastry, award 240 points, redeem once ok, second issue → `monthly_cap`; `first_visit_only`: insert a first-visit-only reward at Lola's Kitchen (20 points); as service role give `c1` 50 points in Lola's program by inserting a `loyalty_accounts` row and an `adjust` ledger entry (a `test.grant_points(customer, program, points)` helper in `00_harness.sql` does both); `c1` has never been awarded at Lola's → token issued; after one award to `c1` at Lola's → `first_visit_only`; `check_ledger()` empty at the end.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → `ok 04_redeem.sql`.
- [ ] **Step 5: Commit** `"Redemption tokens and redeem_reward"`.

---

### Task 7: Voids, member codes, expiry, fraud rules

**Files:**
- Modify: `supabase/migrations/20261106000500_points_functions.sql`
- Create: `supabase/migrations/20261106000700_fraud_rules.sql`, `supabase/tests/05_void.sql`, `supabase/tests/07_member_code.sql`, `supabase/tests/08_ledger_check_expire.sql`

**Interfaces:**
- `void_transaction(p_idempotency_key text, p_merchant_id uuid, p_staff_id uuid, p_device_id uuid, p_transaction_id uuid, p_reason text) returns jsonb` security definer, service role only. Returns `{ "transaction_id", "replayed", "voided_transaction_id", "balances": [{ "program_id", "balance" }], "written_off": int }`. Rules: original belongs to the merchant, `status = 'completed'`, type `award` or `redeem` else `not_voidable`; reason non-empty else `amount_invalid`; staff role `cashier`: original `staff_id = p_staff_id`, same `device_id`, same branch, `created_at > now() - void_window_hours` else `void_window`; `manager`/`owner`: `created_at > now() - manager_void_window_days` else `void_window`; locks the accounts; inserts a `void` transaction with `reverses_id`; for each ledger row of the original inserts a `void` row with the full negated points; when that would take the balance below 0 (the customer already spent them), it also inserts a `write_off` row of `+shortfall` so the balance lands on 0 and the ledger still sums to the balance, and reports `written_off = shortfall`; marks the original `voided`; for a voided redeem, sets the redemption `cancelled`; audit `points.voided`.
- `verify_member_code(p_code text, p_now timestamptz default now()) returns uuid` security definer, service role only: parses `U:<id>:<code>`; customer by `public_member_id` (not deleted) else `invalid_member_code`; 6 digits → for each non-revoked `customer_devices` secret, `totp(secret, step)` for steps `floor(epoch/30) - 1 .. + 1`; `W…` → `member_web_codes` by `sha256` hash, not expired, deleted after use; returns `customer_id` or raises `invalid_member_code`. `totp(p_secret bytea, p_counter bigint) returns text` immutable: HMAC-SHA1 (`extensions.hmac`) of the counter as 8 big-endian bytes; dynamic truncation (offset = last byte & 0x0f; 31-bit integer from 4 bytes at offset) mod 1,000,000, zero-padded to 6.
- `expire_points() returns int` security definer: for each account whose program has `expiry_months` and `last_activity_at < now() - expiry_months` and `balance > 0`: insert `expire` row `-balance`, set balance 0; returns the count; audit per account.
- Migration 7: `run_fraud_rules(p_transaction_id uuid)` replacing the stub: rule `large_award` when `amount_centavos >= 5 × avg(amount) of the merchant's last 50 awards` and there are at least 20; rule `void_rate` when the staff member's voids ÷ awards over their last 50 transactions > 0.2; each writes a `fraud_flags` row with `details` (the figures). Plus the index `fraud_flags(merchant_id, status)`.

- [ ] **Step 1: Write the failing tests**
  - `05_void.sql`: award `c1` 20 (`k1`, Ana, dev1) → `void_transaction('v1', juan, ana, dev1, tx, 'wrong amount')` → balance 0, original `voided`, void tx has `reverses_id`; replay `'v1'` → `replayed`; voiding the void → `not_voidable`; a new award then `update loyalty_transactions set created_at = now() - interval '13 hours'` → Ana → `void_window`; the manager (`manager`) → succeeds; set `created_at` 31 days back → manager → `void_window`; owner → `void_window`; award 60, redeem 40 (balance 20), void the award → balance 0, `written_off = 40`, a `void` row of −60 and a `write_off` row of +40, `check_ledger()` empty; void the redeem on a fresh award/redeem pair → balance restored, redemption `cancelled`; empty reason → `amount_invalid`; Ben voiding Juan's transaction → `not_voidable`.
  - `07_member_code.sql`: the RFC 6238 SHA-1 vector: secret `'12345678901234567890'::bytea`, `totp(secret, 1) = '287082'` (T = 59 s), `totp(secret, 37037036) = '081804'` (T = 1111111109); insert that secret as `c1`'s device; `verify_member_code('U:AB2CD3EF:287082', to_timestamp(59)) = c1`; the same at `to_timestamp(89)` (one step later, drift) = c1; at `to_timestamp(150)` → `invalid_member_code`; revoked device → invalid; a web code: insert `member_web_codes` with the hash of `'abcDEF123456'` → `verify_member_code('U:AB2CD3EF:WabcDEF123456')` = c1 and the row is gone; expired web code → invalid; `'U:ZZZZZZZZ:287082'` → invalid; `'garbage'` → invalid.
  - `08_ledger_check_expire.sql`: award `c1`, set `last_activity_at = now() - interval '13 months'` → `expire_points() = 1`, balance 0, an `expire` ledger row, `check_ledger()` empty; a fresh account is untouched (`expire_points() = 0`); fraud: 20 awards of ₱100 to rotating customers (insert customers as needed, respect the daily limit by using different customers), then one of ₱2,000 → a `fraud_flags` row with rule `large_award`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → `ok` for 05, 07, 08.
- [ ] **Step 5: Commit** `"Voids with cashier and manager windows, TOTP member codes, expiry, fraud flags"`.

---

### Task 8: Migration 6, Row Level Security and grants

**Files:**
- Create: `supabase/migrations/20261106000600_rls.sql`, `supabase/tests/06_rls.sql`

**Interfaces:**
- Every public table: `alter table … enable row level security` and `force row level security`. Policies (names `ugnaya: <table> <who> <verb>`), `drop policy if exists` first:
  - `customer_profiles`: select/update own row (`user_id = auth.uid()`); select for staff of a merchant where the customer has an account in that merchant's program; insert none (trigger-created); delete none (deletion is a function in a later round).
  - `customer_devices`, `member_web_codes`: no client access (service role only).
  - `waitlist`: insert for `anon` and `authenticated` (`with check (true)`, the table constraints bound lengths); no select.
  - `merchants`: select where `is_staff_of(id)`; update where `staff_role(id) in ('owner','manager')` with check status unchanged (`status = (select status from merchants m where m.id = merchants.id)` is not allowed in RLS on the same table; instead revoke update on the `status`, `verified_at`, `verified_by`, `network_participation` columns from `authenticated` and grant update only on the editable columns); customers: select where `status = 'active'` (the directory).
  - `merchant_branches`: select for staff and, when the merchant is active, for everyone signed in; insert/update/delete for owner and manager.
  - `merchant_staff`: select for staff of the merchant; insert/update/delete for owners (managers may update cashiers only: a second policy with `role = 'cashier'`); the `pin_hash` column revoked from `authenticated` select (use column grants).
  - `devices`: select own device row (`user_id = auth.uid()`) and staff of the merchant; insert/update by owners and managers.
  - `subscriptions`, `merchant_limits`: select for staff; no client writes.
  - `loyalty_programs`: select for staff, for customers with an account, and the network program for everyone signed in; update by owners (rate fields; `version` bumped by a trigger on change).
  - `rewards`: select for staff and for everyone signed in when active; write by owners and managers.
  - `loyalty_accounts`, `points_ledger`, `loyalty_transactions`, `reward_redemptions`: select for the customer (own) and for staff of the merchant (cashiers: only rows of their branches for transactions); no client insert/update/delete (revoke).
  - `vouchers`, `notifications`, `referrals`: customer own select; staff select vouchers of their merchant.
  - `campaigns`, `merchant_contributions`: staff select; owners/managers write campaigns.
  - `platform_settings`, `plan_limits`: select for everyone; `platform_admins`, `audit_logs`, `fraud_flags`, `settlement_records`: `is_platform_admin()` select only; staff of a merchant may select `fraud_flags` and `audit_logs` of their merchant (owner/manager).
- Grants: `revoke all on all tables in schema public from anon, authenticated` then grant per table: select on the tables above; insert/update/delete only where a policy allows; `revoke execute on all functions in schema public from public`, then grant execute: `register_merchant`, `set_staff_pin` to `authenticated`; `points_for_amount`, `setting_*`, `is_*`, `staff_role` to `anon, authenticated`; the points functions, `check_staff_pin`, `verify_member_code`, `issue_redemption_token`, `check_ledger`, `expire_points` to `service_role` only.

- [ ] **Step 1: Write the failing test** `06_rls.sql` (role switching via `test.as_user`): Ana has no user, so use Juan's manager `m1`: as `m1`, `select count(*) from merchants` = 1 (Juan's only); `loyalty_transactions` of Lola's = 0; as Lola's owner the reverse; as customer `c1` (after awards at both merchants), `loyalty_accounts` count = 2, `points_ledger` rows only theirs, `customer_profiles` count = 1; as `c1`, `update loyalty_accounts set balance = 999` → `permission denied`; `insert into points_ledger …` → permission denied; as `m1`, `update merchants set status = 'active'` → permission denied (column grant), `update merchants set address = 'x'` → ok; as `anon`, `insert into waitlist (contact, kind) values ('a@b.ph','email')` → ok, `select count(*) from waitlist` → permission denied; as `c1`, `select * from merchants` shows both active merchants but after `update merchants set status='suspended'` (service) only one; as `m1`, `select pin_hash from merchant_staff` → permission denied, `select display_name from merchant_staff` → ok; as `c1`, `select points_for_amount('per_peso',1,1000,0,20000)` = 20 but `select award_points(...)` → permission denied; `platform_admins` select as `m1` → 0 rows (RLS) and as admin user → rows.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** `npm run test:sql` → all 8 files ok, migrations twice ok.
- [ ] **Step 5: Commit** `"Row Level Security and grants for every table; functions service-role only"`.

---

### Task 9: Concurrency test

**Files:**
- Create: `scripts/sql-tests/concurrent-redeem.mjs`
- Modify: `scripts/sql-tests/run.sh` (runs it after the SQL files), root `package.json` (`pg` dev dependency)

**Interfaces:**
- The script gets `PGHOST` (the socket dir), `PGPORT`, `PGDATABASE` from the harness; opens two `pg` clients; as service role issues one token for `c1` (after awarding 120 points); fires `redeem_reward` with keys `ca`/`cb` on both clients at once (`Promise.allSettled`); asserts exactly one fulfilled and the other rejected with message `token_used`; then asserts `check_ledger()` is empty and the balance is `80`; exits 1 on any failure.

- [ ] **Step 1:** `npm i -D pg`; write the script; add it to `run.sh` after the per-file loop, on a fresh database.
- [ ] **Step 2: Run** `npm run test:sql` → `ok concurrent-redeem` and `all sql tests pass`.
- [ ] **Step 3: Commit** `"Concurrent redeem test: exactly one of two wins"`.

---

### Task 10: Generated types for `@ugnaya/db` from the local database

**Files:**
- Create: `scripts/sql-tests/gen-types.sh`
- Modify: `packages/db/src/database.types.ts`, `packages/db/src/index.ts`, `packages/db/package.json`, root `package.json` (`db:types:local` script)

**Interfaces:**
- `npm run db:types:local`: starts the throwaway Postgres with all migrations (reusing `run.sh`'s functions via `source`), runs `npx supabase gen types typescript --db-url "postgresql://postgres@localhost:$PORT/$DB?host=$WORK" --schema public > packages/db/src/database.types.ts`, stops it. `npm run db:types` (linked project) stays for later.
- `packages/db/src/index.ts`: `export type { Database }`, `export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']`, `export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]`, and `export type AwardResult`, `RedeemResult`, `VoidResult`, `IssueTokenResult` written by hand matching the jsonb shapes in Tasks 5 to 7.

- [ ] **Step 1:** Write the script, run it, commit the generated file.
- [ ] **Step 2: Verify** `npm run typecheck` passes with the real types; `Tables<'merchants'>` has `trade_name`.
- [ ] **Step 3: Commit** `"db: generated Supabase types and result shapes"`.

---

### Task 11: Edge Functions, shared helpers and tests

**Files:**
- Create: `supabase/functions/_shared/http.ts`, `_shared/errors.ts`, `_shared/staff-grant.ts`, `_shared/device.ts`, `_shared/totp.ts`, `supabase/functions/award/index.ts`, `award/handler.ts`, `award/README.md`, `redeem/{index,handler}.ts` + README, `void/{index,handler}.ts` + README, `staff-unlock/{index,handler}.ts` + README, `qr-token/{index,handler}.ts` + README, `notify-merchant-signup/{index,handler}.ts` + README, `supabase/functions/tests/{http,errors,staff-grant,device,totp,award,redeem,void,staff-unlock,qr-token,notify}.test.ts`, `supabase/functions/tests/fakes.ts`, `scripts/function-tests/run.sh`

**Interfaces:**
- Every function: `index.ts` is `export default { fetch: withSupabase({ auth: <mode> }, handle) }`; `handler.ts` exports `handle(req: Request, ctx: SupabaseContext): Promise<Response>` so tests call it with a fake `ctx`.
- `_shared/http.ts` (CarMind's `_shared/http.ts` as the model): `BadRequest` (400), `Unauthorized` (401), `Forbidden` (403), `Conflict` (409), `readBody(req)`, `stringField(body, key)`, `optionalStringField`, `intField(body, key)` (integer), `uuidField`, `respond(run)` (JSON; maps the error classes to their status; unknown errors 500 with `{ error: 'internal' }` and `console.error`).
- `_shared/errors.ts`: `export const SQL_ERROR_STATUS: Record<string, number>` = `merchant_inactive 403, staff_not_allowed 403, device_not_allowed 403, forbidden 403, sign_in_required 401, amount_invalid 400, receipt_duplicate 409, daily_limit 429, customer_unknown 404, invalid_member_code 404, token_invalid 404, token_expired 410, token_used 409, insufficient_points 402, reward_unavailable 404, monthly_cap 409, first_visit_only 409, void_window 409, not_voidable 409, already_registered 409`; `export function rpcErrorResponse(error: { message: string }): Response` → `{ error: code }` with that status, or 500 `{ error: 'internal' }` for an unknown message.
- `_shared/staff-grant.ts`: `type StaffGrant = { staffId: string; deviceId: string; merchantId: string; branchId: string; role: 'owner' | 'manager' | 'cashier'; exp: number }`; `signStaffGrant(grant, secret: string): Promise<string>` (base64url(JSON) + '.' + base64url(HMAC-SHA256) via Web Crypto); `verifyStaffGrant(token: string, secret: string, now = Date.now()): Promise<StaffGrant | null>` (null on bad signature, malformed, or `exp * 1000 <= now`). Secret from `Deno.env.get('STAFF_GRANT_SECRET')`; missing → the function responds 500 `{ error: 'misconfigured' }`.
- `_shared/device.ts`: `requireDevice(ctx): Promise<{ id: string; merchantId: string; branchId: string }>`: `ctx.userClaims?.id` else `Unauthorized('sign_in_required')`; `ctx.supabaseAdmin.from('devices').select('id, merchant_id, branch_id, revoked_at').eq('user_id', id).maybeSingle()`; missing or revoked → `Forbidden('device_not_allowed')`; updates `last_seen_at` (fire and forget).
- `_shared/totp.ts`: `generateTotpSecret(): Uint8Array` (20 random bytes); `base32Encode(bytes): string` (RFC 4648, no padding) for the app to store; `totp(secret, counter): Promise<string>` (same algorithm as the SQL, used only in tests to cross-check the vector).
- Contracts (each README repeats its table):

| Function | auth | Request body | 200 response | Errors |
| --- | --- | --- | --- | --- |
| `staff-unlock` | `user` (the device's anonymous session) | `{ pin: string }` | `{ staffGrant, staff: { id, displayName, role }, expiresAt }` | 401 `sign_in_required`, 403 `device_not_allowed`, 403 `staff_not_allowed` |
| `award` | `user` (device) | `{ idempotencyKey, staffGrant, memberCode, amountCentavos, receiptNo? }` | the `award_points` jsonb | grant invalid or for another device → 401 `grant_invalid`; SQL codes per `SQL_ERROR_STATUS` |
| `redeem` | `user` (device) | `{ idempotencyKey, staffGrant, redemptionCode }` (`R:<token>`) | the `redeem_reward` jsonb | as above; malformed code 400 `code_invalid` |
| `void` | `user` (device) | `{ idempotencyKey, staffGrant, transactionId, reason }` | the `void_transaction` jsonb | as above |
| `qr-token` | `user` (customer) | `{ action: 'device-secret', label? }` → `{ memberId, secretBase32 }` (inserts `customer_devices`); `{ action: 'web-code' }` → `{ memberCode: 'U:<id>:W<code>', expiresAt }`; `{ action: 'redemption', rewardId }` → `{ redemptionCode: 'R:<token>', expiresAt, pointsCost, rewardName }` | 401 if anonymous or no customer profile; SQL codes |
| `notify-merchant-signup` | `secret` (`verify_jwt = false`) | the database webhook payload `{ type: 'INSERT', table: 'merchants', record: {...} }` | `{ sent: true }` or `{ sent: false, reason: 'no_api_key' }` | 400 for any other payload |

- `notify-merchant-signup` sends through Resend: `POST https://api.resend.com/emails` with `Authorization: Bearer ${RESEND_API_KEY}`, `from: 'UGNAYA <noreply@ugnaya.ph>'`, `to: FOUNDER_EMAIL`, subject `New merchant sign-up: <trade_name>`, a plain-text body with trade name, category, city, address, mobile, heard_from, created_at and the merchant id; a non-2xx from Resend → `{ sent: false, reason: 'resend_<status>' }` with 200 (never fails the webhook).
- `tests/fakes.ts`: `fakeCtx({ userId?, anonymous?, rpc?: Record<string, (args) => unknown>, tables?: Record<string, unknown[]> })` returning a `SupabaseContext`-shaped object whose `supabaseAdmin.rpc(name, args)` calls the matching function (throwing → `{ data: null, error: { message } }`) and whose `from(table).select().eq().maybeSingle()` chain resolves from `tables`.
- `scripts/function-tests/run.sh`: `command -v deno || { echo "SKIP: deno not installed (brew install deno)"; exit 0; }` then `cd supabase/functions && deno task test`.

- [ ] **Step 1: Write the failing tests** (`@std/testing/bdd` + `@std/assert`), one `describe` per module:
  - `http.test.ts`: `readBody` rejects non-JSON and arrays with `BadRequest`; `intField` rejects `10.5` and `'10'`; `respond` turns `Forbidden('x')` into 403 `{ error: 'x' }` and a thrown `Error` into 500 `{ error: 'internal' }`.
  - `errors.test.ts`: `rpcErrorResponse({ message: 'token_used' })` → 409 `{ error: 'token_used' }`; unknown → 500.
  - `staff-grant.test.ts`: sign then verify round-trips; a tampered payload → null; expired → null; wrong secret → null.
  - `device.test.ts`: no user → `Unauthorized`; unknown user → `Forbidden('device_not_allowed')`; revoked → `Forbidden`; ok → ids.
  - `totp.test.ts`: `totp('12345678901234567890' as bytes, 1)` = `'287082'`; `base32Encode` of `'Hello!'` bytes... use the RFC 4648 vector `'foobar'` → `'MZXW6YTBOI'`.
  - `award.test.ts`: happy path calls `rpc('verify_member_code', { p_code })` then `rpc('award_points', {...})` with the device's merchant/branch and the grant's staff id, returns the rpc result; grant for another device → 401 `grant_invalid`; `rpc` throwing `daily_limit` → 429; missing `amountCentavos` → 400.
  - `redeem.test.ts`, `void.test.ts`: happy path and one SQL error each; malformed redemption code → 400 `code_invalid`.
  - `staff-unlock.test.ts`: ok → a grant that verifies with `exp` 12 h ahead; `check_staff_pin` throwing → 403.
  - `qr-token.test.ts`: anonymous user → 401; `device-secret` inserts a device and returns base32 of 20 bytes (32 chars); `web-code` returns `U:<id>:W` + 16 base64url chars and inserts a hash; `redemption` returns `R:` + the rpc token.
  - `notify.test.ts`: no `RESEND_API_KEY` → `{ sent: false, reason: 'no_api_key' }`; with a key, `fetch` is stubbed and called with the Resend URL and a body naming the trade name; a non-insert payload → 400.
- [ ] **Step 2:** `brew install deno`; run `npm run test:functions` → FAIL (modules missing).
- [ ] **Step 3: Implement** the shared modules, the six functions and their READMEs.
- [ ] **Step 4: Run** `npm run test:functions` → all pass; `cd supabase/functions && deno check **/*.ts` → exit 0.
- [ ] **Step 5: Commit** `"Edge Functions: staff-unlock, award, redeem, void, qr-token, notify-merchant-signup, with Deno tests"`.

---

### Task 12: Owner setup guide and `CLAUDE.md`

**Files:**
- Create: `docs/SUPABASE_SETUP.md`
- Modify: `CLAUDE.md` (Current state, Commands), `README.md`

**Interfaces:**
- `docs/SUPABASE_SETUP.md`, the owner's one-time steps in order, each with its exact command: `npx supabase login`; `npx supabase link --project-ref ohicvyappmccynchzukg` (asks for the database password); `npm run db:push`; `npx supabase config push` (site URL, redirects, email confirmations, Google, anonymous sign-ins); set the Google OAuth client in Google Cloud with redirect `https://ohicvyappmccynchzukg.supabase.co/auth/v1/callback` and put the id and secret in `supabase/.env` (gitignored) as `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET` before `config push`; `npx supabase secrets set RESEND_API_KEY=… FOUNDER_EMAIL=… STAFF_GRANT_SECRET=$(openssl rand -hex 32)`; `npm run functions:deploy`; create the database webhook in the dashboard (Database → Webhooks: table `merchants`, event INSERT, type Supabase Edge Function `notify-merchant-signup`, with the project's secret key in the header `@supabase/server`'s `secret` mode expects; the function README states the exact header after checking the package README); make yourself a platform admin: `insert into platform_admins (user_id) values ('<your auth user id>')` in the SQL editor; `npm run db:types`; Resend: verify the `ugnaya.ph` domain so `noreply@ugnaya.ph` can send; what each step unlocks and how to check it (a query or a curl per step).
- `CLAUDE.md` Current state: "2026-11-06: backend migrations 1 to 7, functions, seed; SQL tests (8 files + concurrency) and Deno tests pass locally; nothing pushed to the hosted project yet (owner's `docs/SUPABASE_SETUP.md`)." Commands: add `npm run db:types:local`.

- [ ] **Step 1:** Write the guide and the doc updates.
- [ ] **Step 2: Verify** `npm run check` → lint, typecheck, package tests, `all sql tests pass`, Deno tests pass.
- [ ] **Step 3: Commit** `"Supabase setup guide for the owner; backend state in CLAUDE.md"`.
