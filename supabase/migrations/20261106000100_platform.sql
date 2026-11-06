-- UGNAYA platform: enums, settings, plan limits, admins and the points maths.
-- Safe to run twice. Postgres 14 syntax only (scripts/sql-tests/README.md).

create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'staff_role') then
    create type staff_role as enum ('owner', 'manager', 'cashier');
  end if;
  if not exists (select 1 from pg_type where typname = 'merchant_status') then
    create type merchant_status as enum ('pending_verification', 'active', 'suspended', 'closed');
  end if;
  if not exists (select 1 from pg_type where typname = 'merchant_category') then
    create type merchant_category as enum ('cafe', 'milk_tea', 'restaurant', 'bakery', 'other_food', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'program_scope') then
    create type program_scope as enum ('merchant', 'network');
  end if;
  if not exists (select 1 from pg_type where typname = 'earning_rule_type') then
    create type earning_rule_type as enum ('per_peso', 'per_visit', 'stamps');
  end if;
  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type transaction_type as enum ('award', 'redeem', 'void', 'adjustment');
  end if;
  if not exists (select 1 from pg_type where typname = 'transaction_status') then
    create type transaction_status as enum ('completed', 'voided');
  end if;
  if not exists (select 1 from pg_type where typname = 'ledger_entry_type') then
    create type ledger_entry_type as enum ('earn', 'redeem', 'void', 'expire', 'adjust', 'bonus', 'write_off');
  end if;
  if not exists (select 1 from pg_type where typname = 'redemption_status') then
    create type redemption_status as enum ('issued', 'used', 'expired', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'plan_code') then
    create type plan_code as enum ('free', 'starter', 'growth', 'business', 'enterprise');
  end if;
end $$;

-- Every rule the server applies that the owner may tune without a migration.
create table if not exists platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into platform_settings (key, value) values
  ('network_enabled', 'false'),
  ('void_window_hours', '12'),
  ('manager_void_window_days', '30'),
  ('redemption_token_minutes', '5'),
  ('network_hold_days', '7'),
  ('web_code_minutes', '5')
on conflict (key) do nothing;

create table if not exists platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- What each plan includes (business plan section 6). Null means unlimited. The website's
-- apps/web/src/lib/plans.ts shows the same numbers.
create table if not exists plan_limits (
  plan plan_code primary key,
  price_centavos integer not null,
  branches integer,
  staff integer,
  rewards integer,
  transactions_per_month integer
);
insert into plan_limits (plan, price_centavos, branches, staff, rewards, transactions_per_month) values
  ('free', 0, 1, 2, 1, 300),
  ('starter', 39900, 1, 5, null, null),
  ('growth', 89900, 3, 15, null, null),
  ('business', 199900, 10, 50, null, null),
  ('enterprise', 500000, null, null, null, null)
on conflict (plan) do nothing;

create or replace function setting_bool(p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::boolean from platform_settings where key = p_key), false)
$$;

create or replace function setting_int(p_key text) returns integer
language sql stable security definer set search_path = public as $$
  select (select (value #>> '{}')::integer from platform_settings where key = p_key)
$$;

create or replace function is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid())
$$;

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Errors the apps act on carry a short code as their whole message (see the Edge Functions).
create or replace function raise_code(p_code text) returns void
language plpgsql as $$
begin
  raise exception using message = p_code, errcode = 'P0001';
end $$;

-- Points for one purchase. packages/rules mirrors this with the same test vectors.
-- Floors, never rounds up: ₱199.50 at 1 per ₱10 is 19.
create or replace function points_for_amount(
  p_rule earning_rule_type,
  p_points_per_unit integer,
  p_unit_centavos integer,
  p_minimum_spend integer,
  p_amount integer
) returns integer
language plpgsql immutable as $$
begin
  if p_amount is null or p_amount < 0 then perform raise_code('amount_invalid'); end if;
  if p_rule = 'per_peso' and (coalesce(p_unit_centavos, 0) <= 0 or coalesce(p_points_per_unit, 0) <= 0) then
    perform raise_code('amount_invalid');
  end if;
  if p_rule = 'per_visit' and coalesce(p_points_per_unit, 0) <= 0 then perform raise_code('amount_invalid'); end if;
  if p_amount < coalesce(p_minimum_spend, 0) then return 0; end if;
  return case p_rule
    when 'per_peso' then (p_amount / p_unit_centavos) * p_points_per_unit
    when 'per_visit' then p_points_per_unit
    when 'stamps' then 1
  end;
end $$;
