-- Merchants (tenants), branches, staff, cashier devices, subscriptions, limits, the audit log,
-- and merchant sign-up and verification. Safe to run twice.

create table if not exists merchants (
  id uuid primary key default gen_random_uuid(),
  trade_name text not null check (length(trim(trade_name)) between 2 and 80),
  legal_name text,
  category merchant_category not null,
  city text not null check (length(trim(city)) between 2 and 80),
  address text check (length(address) <= 200),
  branch_count_declared integer check (branch_count_declared between 1 and 500),
  owner_mobile text check (length(owner_mobile) <= 20),
  heard_from text check (length(heard_from) <= 80),
  status merchant_status not null default 'pending_verification',
  network_participation boolean not null default false,
  terms_accepted_at timestamptz not null,
  privacy_accepted_at timestamptz not null,
  marketing_consent_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists merchants_status on merchants (status);
drop trigger if exists merchants_updated_at on merchants;
create trigger merchants_updated_at before update on merchants for each row execute function set_updated_at();

-- Location is plain latitude and longitude for now; PostGIS and nearby search come with the customer app.
create table if not exists merchant_branches (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  address text check (length(address) <= 200),
  city text,
  lat numeric(9, 6) check (lat between -90 and 90),
  lng numeric(9, 6) check (lng between -180 and 180),
  hours jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists merchant_branches_merchant on merchant_branches (merchant_id);
drop trigger if exists merchant_branches_updated_at on merchant_branches;
create trigger merchant_branches_updated_at before update on merchant_branches for each row execute function set_updated_at();

-- Owners and managers have a login (user_id). Cashiers usually don't: they unlock a shared device
-- with their PIN. branch_ids null means every branch.
create table if not exists merchant_staff (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  role staff_role not null,
  branch_ids uuid[],
  pin_hash text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists merchant_staff_user on merchant_staff (merchant_id, user_id) where user_id is not null;
create index if not exists merchant_staff_merchant on merchant_staff (merchant_id);
create index if not exists merchant_staff_user_id on merchant_staff (user_id) where user_id is not null;
drop trigger if exists merchant_staff_updated_at on merchant_staff;
create trigger merchant_staff_updated_at before update on merchant_staff for each row execute function set_updated_at();

-- A shared counter device: its own anonymous auth user, tied to one merchant and branch.
create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  branch_id uuid not null references merchant_branches (id) on delete cascade,
  user_id uuid unique references auth.users (id) on delete cascade,
  name text,
  public_key text,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists devices_merchant on devices (merchant_id);

create table if not exists subscriptions (
  merchant_id uuid primary key references merchants (id) on delete cascade,
  plan plan_code not null default 'free',
  status text not null default 'active',
  founding boolean not null default false,
  founding_until date,
  period_start date,
  period_end date,
  provider_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists subscriptions_updated_at on subscriptions;
create trigger subscriptions_updated_at before update on subscriptions for each row execute function set_updated_at();

-- Per-merchant fraud limits (business plan section 10), within platform maximums.
create table if not exists merchant_limits (
  merchant_id uuid primary key references merchants (id) on delete cascade,
  max_award_per_tx_centavos integer not null default 3000000 check (max_award_per_tx_centavos > 0),
  max_awards_per_customer_per_day integer not null default 3 check (max_awards_per_customer_per_day > 0)
);

create table if not exists audit_logs (
  id bigserial primary key,
  merchant_id uuid,
  actor_user_id uuid,
  actor_staff_id uuid,
  actor_role text,
  action text not null,
  entity_table text,
  entity_id text,
  before jsonb,
  after jsonb,
  reason text,
  device_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_entity on audit_logs (entity_table, entity_id, created_at);
create index if not exists audit_logs_merchant on audit_logs (merchant_id, created_at);

create or replace function log_audit(
  p_action text, p_merchant_id uuid, p_entity_table text, p_entity_id text,
  p_before jsonb default null, p_after jsonb default null, p_reason text default null,
  p_staff_id uuid default null, p_device_id uuid default null
) returns void
language sql security definer set search_path = public as $$
  insert into audit_logs (merchant_id, actor_user_id, actor_staff_id, actor_role, action, entity_table, entity_id,
                          before, after, reason, device_id)
  values (p_merchant_id, auth.uid(), p_staff_id, auth.role(), p_action, p_entity_table, p_entity_id,
          p_before, p_after, p_reason, p_device_id)
$$;

-- The caller's active role at a merchant, or null.
create or replace function staff_role(p_merchant_id uuid) returns staff_role
language sql stable security definer set search_path = public as $$
  select role from merchant_staff
  where merchant_id = p_merchant_id and user_id = auth.uid() and active
  limit 1
$$;

create or replace function is_staff_of(p_merchant_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select staff_role(p_merchant_id) is not null
$$;

create or replace function staff_at_branch(p_staff_id uuid, p_branch_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from merchant_staff
    where id = p_staff_id and active and (branch_ids is null or p_branch_id = any (branch_ids))
  )
$$;

-- Website sign-up: creates the merchant, its first branch, the owner, a Free subscription and
-- default limits in one transaction. A confirmed, signed-in user only, once.
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
  perform log_audit('merchant.registered', v_merchant, 'merchants', v_merchant::text, null,
                    jsonb_build_object('trade_name', p_trade_name, 'category', p_category, 'city', p_city));
  return v_merchant;
end $$;

-- The founder verifies a merchant after visiting (until there is an admin console, from the SQL editor).
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
  perform log_audit('merchant.verified', p_merchant_id, 'merchants', p_merchant_id::text, null,
                    jsonb_build_object('plan', p_plan, 'founding', p_founding));
end $$;

-- Owners set any PIN; managers set their own and their cashiers'. PINs are 4 to 6 digits and unique
-- within a merchant, because the PIN alone says who is at the counter.
create or replace function set_staff_pin(p_staff_id uuid, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_target merchant_staff%rowtype;
  v_caller staff_role;
begin
  select * into v_target from merchant_staff where id = p_staff_id;
  if not found then perform raise_code('forbidden'); end if;
  v_caller := staff_role(v_target.merchant_id);
  if v_caller is null
     or (v_caller = 'manager' and v_target.role <> 'cashier' and v_target.user_id is distinct from auth.uid())
     or v_caller = 'cashier' then
    perform raise_code('forbidden');
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then perform raise_code('pin_invalid'); end if;
  if exists (
    select 1 from merchant_staff
    where merchant_id = v_target.merchant_id and id <> p_staff_id and active
      and pin_hash is not null and pin_hash = crypt(p_pin, pin_hash)
  ) then
    perform raise_code('pin_taken');
  end if;
  update merchant_staff set pin_hash = crypt(p_pin, gen_salt('bf')) where id = p_staff_id;
  perform log_audit('staff.pin_set', v_target.merchant_id, 'merchant_staff', p_staff_id::text);
end $$;

-- staff-unlock (Edge Function): which staff member this PIN belongs to, on this device's branch.
create or replace function check_staff_pin(p_device_user uuid, p_pin text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_device devices%rowtype;
  v_staff uuid;
begin
  select * into v_device from devices where user_id = p_device_user;
  if not found or v_device.revoked_at is not null then perform raise_code('device_not_allowed'); end if;
  if p_pin is null or p_pin !~ '^[0-9]{4,6}$' then perform raise_code('staff_not_allowed'); end if;
  select id into v_staff from merchant_staff s
  where s.merchant_id = v_device.merchant_id and s.active and s.pin_hash is not null
    and (s.branch_ids is null or v_device.branch_id = any (s.branch_ids))
    and s.pin_hash = crypt(p_pin, s.pin_hash)
  limit 1;
  if v_staff is null then perform raise_code('staff_not_allowed'); end if;
  return v_staff;
end $$;
