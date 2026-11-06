-- Loyalty: programs, accounts, the append-only points ledger, transactions, rewards, redemptions,
-- and the tables later phases fill (vouchers, campaigns, referrals, notifications, network
-- contributions, settlements, fraud flags). Safe to run twice.
--
-- Anything with points history is ON DELETE RESTRICT: points are never removed by a cascade.
-- Customers leave by being pseudonymised (a later account-deletion function), merchants by status.

create table if not exists loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants (id) on delete restrict,
  scope program_scope not null,
  name text not null,
  rule_type earning_rule_type not null default 'per_peso',
  points_per_unit integer not null default 1 check (points_per_unit > 0),
  unit_centavos integer not null default 1000 check (unit_centavos > 0),
  minimum_spend_centavos integer not null default 0 check (minimum_spend_centavos >= 0),
  expiry_months integer default 12 check (expiry_months between 1 and 36),
  active boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((scope = 'network') = (merchant_id is null))
);
create unique index if not exists loyalty_programs_one_network on loyalty_programs (scope) where scope = 'network';
create unique index if not exists loyalty_programs_one_per_merchant on loyalty_programs (merchant_id) where scope = 'merchant';

-- A changed earning rule is a new version; ledger rows record the version they were earned under.
create or replace function loyalty_programs_versioning() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if (new.rule_type, new.points_per_unit, new.unit_centavos, new.minimum_spend_centavos, new.expiry_months)
     is distinct from (old.rule_type, old.points_per_unit, old.unit_centavos, old.minimum_spend_centavos, old.expiry_months) then
    new.version := old.version + 1;
  end if;
  return new;
end $$;
drop trigger if exists loyalty_programs_versioning on loyalty_programs;
create trigger loyalty_programs_versioning before update on loyalty_programs
  for each row execute function loyalty_programs_versioning();

insert into loyalty_programs (id, merchant_id, scope, name, rule_type, points_per_unit, unit_centavos, expiry_months, active)
values ('00000000-0000-0000-0000-000000000001', null, 'network', 'UGNAYA network points', 'per_peso', 1, 2000, 12, false)
on conflict do nothing;

create table if not exists loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer_profiles (user_id) on delete restrict,
  program_id uuid not null references loyalty_programs (id) on delete restrict,
  balance integer not null default 0 check (balance >= 0),
  lifetime_earned integer not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, program_id)
);
create index if not exists loyalty_accounts_program on loyalty_accounts (program_id);

create table if not exists loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete restrict,
  branch_id uuid references merchant_branches (id) on delete restrict,
  staff_id uuid references merchant_staff (id) on delete restrict,
  device_id uuid references devices (id) on delete restrict,
  customer_id uuid not null references customer_profiles (user_id) on delete restrict,
  type transaction_type not null,
  status transaction_status not null default 'completed',
  amount_centavos integer check (amount_centavos > 0),
  receipt_no text check (length(receipt_no) <= 40),
  idempotency_key text not null check (length(idempotency_key) between 1 and 100),
  reverses_id uuid references loyalty_transactions (id) on delete restrict,
  reason text check (length(reason) <= 300),
  result jsonb,
  created_at timestamptz not null default now(),
  constraint loyalty_transactions_idempotency unique (merchant_id, idempotency_key)
);
create unique index if not exists loyalty_transactions_receipt on loyalty_transactions (branch_id, receipt_no)
  where receipt_no is not null and type = 'award';
create index if not exists loyalty_transactions_merchant_time on loyalty_transactions (merchant_id, created_at desc);
create index if not exists loyalty_transactions_customer_time on loyalty_transactions (customer_id, created_at desc);
create index if not exists loyalty_transactions_staff_time on loyalty_transactions (staff_id, created_at desc);

-- The ledger: every balance is the sum of its rows. Rows are never updated or deleted; a correction
-- is a new row. available_at holds network points before they can be spent elsewhere.
create table if not exists points_ledger (
  id bigserial primary key,
  account_id uuid not null references loyalty_accounts (id) on delete restrict,
  transaction_id uuid references loyalty_transactions (id) on delete restrict,
  entry_type ledger_entry_type not null,
  points integer not null check (points <> 0),
  available_at timestamptz not null default now(),
  program_version integer,
  created_at timestamptz not null default now()
);
create index if not exists points_ledger_account on points_ledger (account_id, created_at);
create index if not exists points_ledger_transaction on points_ledger (transaction_id);

create or replace function points_ledger_immutable() returns trigger
language plpgsql as $$
begin
  perform raise_code('ledger_immutable');
  return null;
end $$;
drop trigger if exists points_ledger_immutable on points_ledger;
create trigger points_ledger_immutable before update or delete on points_ledger
  for each row execute function points_ledger_immutable();
drop trigger if exists points_ledger_no_truncate on points_ledger;
create trigger points_ledger_no_truncate before truncate on points_ledger
  for each statement execute function points_ledger_immutable();

create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  program_id uuid not null references loyalty_programs (id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 80),
  description text check (length(description) <= 300),
  points_cost integer not null check (points_cost > 0),
  retail_value_centavos integer check (retail_value_centavos >= 0),
  monthly_cap integer check (monthly_cap > 0),
  stock integer check (stock >= 0),
  first_visit_only boolean not null default false,
  is_network_offer boolean not null default false,
  approval_status text not null default 'approved' check (approval_status in ('pending', 'approved', 'rejected')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rewards_program on rewards (program_id) where active;
drop trigger if exists rewards_updated_at on rewards;
create trigger rewards_updated_at before update on rewards for each row execute function set_updated_at();

create table if not exists reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references rewards (id) on delete restrict,
  customer_id uuid not null references customer_profiles (user_id) on delete restrict,
  account_id uuid not null references loyalty_accounts (id) on delete restrict,
  transaction_id uuid references loyalty_transactions (id) on delete restrict,
  token_hash text not null unique,
  expires_at timestamptz not null,
  status redemption_status not null default 'issued',
  points_cost integer not null check (points_cost > 0),
  used_device_id uuid references devices (id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists reward_redemptions_used on reward_redemptions (reward_id, used_at) where status = 'used';
create index if not exists reward_redemptions_customer on reward_redemptions (customer_id, created_at desc);

create table if not exists vouchers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer_profiles (user_id) on delete cascade,
  merchant_id uuid references merchants (id) on delete cascade,
  campaign_id uuid,
  kind text not null check (kind in ('welcome', 'birthday', 'campaign')),
  title text not null,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  used_transaction_id uuid references loyalty_transactions (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists vouchers_customer on vouchers (customer_id);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants (id) on delete cascade,
  name text not null,
  kind text not null,
  audience jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'running', 'ended', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaigns_merchant on campaigns (merchant_id, status);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references customer_profiles (user_id) on delete cascade,
  referee_id uuid not null unique references customer_profiles (user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'rewarded', 'void')),
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  channel text not null check (channel in ('push', 'sms', 'email')),
  template text not null,
  campaign_id uuid references campaigns (id) on delete set null,
  status text not null default 'queued',
  provider_id text,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient on notifications (recipient_id, created_at desc);

-- Each merchant's monthly position in the network, in points (no money moves; business plan section 5).
create table if not exists merchant_contributions (
  merchant_id uuid not null references merchants (id) on delete cascade,
  month date not null,
  network_points_issued integer not null default 0,
  network_points_redeemed integer not null default 0,
  offer_value_given_centavos integer not null default 0,
  new_customers_via_network integer not null default 0,
  primary key (merchant_id, month)
);

-- Exists for a settlement model a lawyer may approve later. Stays empty: no money moves between
-- merchants through UGNAYA (business plan section 14).
create table if not exists settlement_records (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete restrict,
  period_start date not null,
  period_end date not null,
  amount_due_centavos integer not null default 0,
  amount_owed_centavos integer not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists fraud_flags (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants (id) on delete cascade,
  customer_id uuid references customer_profiles (user_id) on delete set null,
  staff_id uuid references merchant_staff (id) on delete set null,
  device_id uuid references devices (id) on delete set null,
  transaction_id uuid references loyalty_transactions (id) on delete set null,
  rule text not null,
  details jsonb,
  status text not null default 'open' check (status in ('open', 'dismissed', 'confirmed')),
  created_at timestamptz not null default now()
);
create index if not exists fraud_flags_merchant on fraud_flags (merchant_id, status);

-- Sign-up and verification again, now that programs exist: a new merchant gets its own points
-- program (1 point per ₱10, off until verified).
create or replace function register_merchant(
  p_trade_name text, p_category merchant_category, p_city text, p_address text,
  p_branch_count integer, p_owner_mobile text, p_heard_from text, p_marketing_consent boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_merchant uuid;
  v_name text;
begin
  if v_user is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    perform raise_code('sign_in_required');
  end if;
  if exists (select 1 from merchant_staff where user_id = v_user and role = 'owner') then
    perform raise_code('already_registered');
  end if;
  select coalesce(nullif(trim(raw_user_meta_data ->> 'full_name'), ''), email, 'Owner')
    into v_name from auth.users where id = v_user;

  insert into merchants (trade_name, category, city, address, branch_count_declared, owner_mobile, heard_from,
                         terms_accepted_at, privacy_accepted_at, marketing_consent_at)
  values (trim(p_trade_name), p_category, trim(p_city), nullif(trim(p_address), ''), p_branch_count,
          nullif(trim(p_owner_mobile), ''), nullif(trim(p_heard_from), ''),
          now(), now(), case when p_marketing_consent then now() end)
  returning id into v_merchant;

  insert into merchant_branches (merchant_id, name, address, city)
  values (v_merchant, trim(p_trade_name), nullif(trim(p_address), ''), trim(p_city));
  insert into merchant_staff (merchant_id, user_id, display_name, role)
  values (v_merchant, v_user, coalesce(v_name, 'Owner'), 'owner');
  insert into subscriptions (merchant_id) values (v_merchant);
  insert into merchant_limits (merchant_id) values (v_merchant);
  insert into loyalty_programs (merchant_id, scope, name, rule_type, points_per_unit, unit_centavos, active)
  values (v_merchant, 'merchant', trim(p_trade_name) || ' points', 'per_peso', 1, 1000, false);
  perform log_audit('merchant.registered', v_merchant, 'merchants', v_merchant::text, null,
                    jsonb_build_object('trade_name', p_trade_name, 'category', p_category, 'city', p_city));
  return v_merchant;
end $$;

create or replace function verify_merchant(p_merchant_id uuid, p_plan plan_code default 'free', p_founding boolean default false)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then perform raise_code('forbidden'); end if;
  update merchants set status = 'active', verified_at = now(), verified_by = auth.uid() where id = p_merchant_id;
  if not found then perform raise_code('forbidden'); end if;
  update subscriptions
     set plan = p_plan, founding = p_founding,
         founding_until = case when p_founding then (current_date + interval '12 months')::date end
   where merchant_id = p_merchant_id;
  update loyalty_programs set active = true where merchant_id = p_merchant_id and scope = 'merchant';
  perform log_audit('merchant.verified', p_merchant_id, 'merchants', p_merchant_id::text, null,
                    jsonb_build_object('plan', p_plan, 'founding', p_founding));
end $$;
