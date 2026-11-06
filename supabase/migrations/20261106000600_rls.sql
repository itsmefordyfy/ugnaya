-- Row Level Security and grants for every table, and execute rights for every function.
-- Clients (anon, authenticated) read through RLS and never write points: the points functions are
-- for the service role (Edge Functions) only. Safe to run twice.
--
-- RLS is enabled, not forced: the tables' owner (postgres) bypasses it, which is what the
-- SECURITY DEFINER functions and the directory views rely on.

-- Nothing is open to clients unless granted below, including objects later migrations create.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
-- Postgres also grants execute on every new function to PUBLIC by a global default; drop that too.
alter default privileges revoke execute on functions from public;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Helpers the policies call. SECURITY DEFINER so a policy never recurses into another table's RLS.
create or replace function customer_visible_to_staff(p_customer_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from loyalty_accounts a join loyalty_programs p on p.id = a.program_id
    where a.customer_id = p_customer_id and p.merchant_id is not null and is_staff_of(p.merchant_id)
  )
$$;

create or replace function program_merchant(p_program_id uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select merchant_id from loyalty_programs where id = p_program_id
$$;

create or replace function account_customer(p_account_id uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select customer_id from loyalty_accounts where id = p_account_id
$$;

create or replace function account_merchant(p_account_id uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select p.merchant_id from loyalty_accounts a join loyalty_programs p on p.id = a.program_id where a.id = p_account_id
$$;

create or replace function reward_merchant(p_reward_id uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select merchant_id from rewards where id = p_reward_id
$$;

-- The caller's cashier device, when the caller is one.
create or replace function my_device_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from devices where user_id = auth.uid() and revoked_at is null
$$;

create or replace function merchant_is_active(p_merchant_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from merchants where id = p_merchant_id and status = 'active')
$$;

-- Execute rights: what policies call, the public maths, and the two website actions.
grant execute on function raise_code(text), points_for_amount(earning_rule_type, integer, integer, integer, integer),
  setting_bool(text), setting_int(text) to anon, authenticated;
grant execute on function is_platform_admin(), staff_role(uuid), is_staff_of(uuid), staff_at_branch(uuid, uuid),
  customer_visible_to_staff(uuid), program_merchant(uuid), account_customer(uuid), account_merchant(uuid),
  reward_merchant(uuid), my_device_id(), merchant_is_active(uuid) to authenticated;
grant execute on function register_merchant(text, merchant_category, text, text, integer, text, text, boolean),
  verify_merchant(uuid, plan_code, boolean), set_staff_pin(uuid, text) to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['platform_settings', 'platform_admins', 'plan_limits', 'customer_profiles', 'customer_devices',
    'member_web_codes', 'waitlist', 'merchants', 'merchant_branches', 'merchant_staff', 'devices', 'subscriptions',
    'merchant_limits', 'audit_logs', 'loyalty_programs', 'loyalty_accounts', 'loyalty_transactions', 'points_ledger',
    'rewards', 'reward_redemptions', 'vouchers', 'campaigns', 'referrals', 'notifications', 'merchant_contributions',
    'settlement_records', 'fraud_flags']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Re-runnable policy creation: drop by name, then create.
create or replace function pg_temp.policy(p_name text, p_table text, p_command text, p_roles text, p_using text, p_check text default null)
returns void language plpgsql as $$
begin
  execute format('drop policy if exists %I on %I', p_name, p_table);
  execute format('create policy %I on %I for %s to %s %s %s', p_name, p_table, p_command, p_roles,
    case when p_using is not null then 'using (' || p_using || ')' else '' end,
    case when p_check is not null then 'with check (' || p_check || ')' else '' end);
end $$;

-- Platform
grant select on platform_settings, plan_limits to anon, authenticated;
select pg_temp.policy('ugnaya: platform_settings everyone select', 'platform_settings', 'select', 'anon, authenticated', 'true');
select pg_temp.policy('ugnaya: plan_limits everyone select', 'plan_limits', 'select', 'anon, authenticated', 'true');
grant select on platform_admins to authenticated;
select pg_temp.policy('ugnaya: platform_admins admin select', 'platform_admins', 'select', 'authenticated', 'is_platform_admin()');

-- Customers
grant select on customer_profiles to authenticated;
grant update (display_name, birthday_month, birthday_day, city, terms_accepted_at, marketing_consent_at) on customer_profiles to authenticated;
select pg_temp.policy('ugnaya: customer_profiles own select', 'customer_profiles', 'select', 'authenticated', 'user_id = auth.uid()');
select pg_temp.policy('ugnaya: customer_profiles staff select', 'customer_profiles', 'select', 'authenticated', 'customer_visible_to_staff(user_id)');
select pg_temp.policy('ugnaya: customer_profiles admin select', 'customer_profiles', 'select', 'authenticated', 'is_platform_admin()');
select pg_temp.policy('ugnaya: customer_profiles own update', 'customer_profiles', 'update', 'authenticated', 'user_id = auth.uid()', 'user_id = auth.uid()');
-- customer_devices and member_web_codes: service role only (no grants, no policies).

grant insert (contact, kind, city) on waitlist to anon, authenticated;
select pg_temp.policy('ugnaya: waitlist everyone insert', 'waitlist', 'insert', 'anon, authenticated', null, 'true');

-- Merchants: staff see and edit their own; the public directory is the views below.
grant select on merchants to authenticated;
grant update (trade_name, legal_name, address, city, owner_mobile) on merchants to authenticated;
select pg_temp.policy('ugnaya: merchants staff select', 'merchants', 'select', 'authenticated', 'is_staff_of(id) or is_platform_admin()');
select pg_temp.policy('ugnaya: merchants managers update', 'merchants', 'update', 'authenticated',
  $p$staff_role(id) in ('owner', 'manager')$p$, $p$staff_role(id) in ('owner', 'manager')$p$);

grant select on merchant_branches to authenticated;
grant insert (merchant_id, name, address, city, lat, lng, hours, active) on merchant_branches to authenticated;
grant update (name, address, city, lat, lng, hours, active) on merchant_branches to authenticated;
select pg_temp.policy('ugnaya: merchant_branches staff select', 'merchant_branches', 'select', 'authenticated', 'is_staff_of(merchant_id) or is_platform_admin()');
select pg_temp.policy('ugnaya: merchant_branches managers insert', 'merchant_branches', 'insert', 'authenticated', null,
  $p$staff_role(merchant_id) in ('owner', 'manager')$p$);
select pg_temp.policy('ugnaya: merchant_branches managers update', 'merchant_branches', 'update', 'authenticated',
  $p$staff_role(merchant_id) in ('owner', 'manager')$p$, $p$staff_role(merchant_id) in ('owner', 'manager')$p$);

-- Staff: never the PIN hash.
grant select (id, merchant_id, user_id, display_name, role, branch_ids, active, created_at, updated_at) on merchant_staff to authenticated;
grant insert (merchant_id, user_id, display_name, role, branch_ids, active) on merchant_staff to authenticated;
grant update (display_name, role, branch_ids, active) on merchant_staff to authenticated;
select pg_temp.policy('ugnaya: merchant_staff staff select', 'merchant_staff', 'select', 'authenticated', 'is_staff_of(merchant_id) or is_platform_admin()');
select pg_temp.policy('ugnaya: merchant_staff owner insert', 'merchant_staff', 'insert', 'authenticated', null, $p$staff_role(merchant_id) = 'owner'$p$);
select pg_temp.policy('ugnaya: merchant_staff owner update', 'merchant_staff', 'update', 'authenticated',
  $p$staff_role(merchant_id) = 'owner'$p$, $p$staff_role(merchant_id) = 'owner'$p$);
select pg_temp.policy('ugnaya: merchant_staff manager updates cashiers', 'merchant_staff', 'update', 'authenticated',
  $p$staff_role(merchant_id) = 'manager' and role = 'cashier'$p$, $p$staff_role(merchant_id) = 'manager' and role = 'cashier'$p$);

grant select on devices to authenticated;
grant insert (merchant_id, branch_id, user_id, name, public_key) on devices to authenticated;
grant update (name, revoked_at) on devices to authenticated;
select pg_temp.policy('ugnaya: devices own select', 'devices', 'select', 'authenticated', 'user_id = auth.uid()');
select pg_temp.policy('ugnaya: devices staff select', 'devices', 'select', 'authenticated', 'is_staff_of(merchant_id)');
select pg_temp.policy('ugnaya: devices managers insert', 'devices', 'insert', 'authenticated', null, $p$staff_role(merchant_id) in ('owner', 'manager')$p$);
select pg_temp.policy('ugnaya: devices managers update', 'devices', 'update', 'authenticated',
  $p$staff_role(merchant_id) in ('owner', 'manager')$p$, $p$staff_role(merchant_id) in ('owner', 'manager')$p$);

grant select on subscriptions, merchant_limits, merchant_contributions to authenticated;
select pg_temp.policy('ugnaya: subscriptions staff select', 'subscriptions', 'select', 'authenticated', 'is_staff_of(merchant_id) or is_platform_admin()');
select pg_temp.policy('ugnaya: merchant_limits staff select', 'merchant_limits', 'select', 'authenticated', 'is_staff_of(merchant_id) or is_platform_admin()');
select pg_temp.policy('ugnaya: merchant_contributions staff select', 'merchant_contributions', 'select', 'authenticated', 'is_staff_of(merchant_id) or is_platform_admin()');

-- Audit, fraud and settlements: platform admins; owners and managers for their merchant.
grant select on audit_logs, fraud_flags, settlement_records to authenticated;
select pg_temp.policy('ugnaya: audit_logs managers select', 'audit_logs', 'select', 'authenticated',
  $p$is_platform_admin() or (merchant_id is not null and staff_role(merchant_id) in ('owner', 'manager'))$p$);
select pg_temp.policy('ugnaya: fraud_flags managers select', 'fraud_flags', 'select', 'authenticated',
  $p$is_platform_admin() or staff_role(merchant_id) in ('owner', 'manager')$p$);
select pg_temp.policy('ugnaya: settlement_records owner select', 'settlement_records', 'select', 'authenticated',
  $p$is_platform_admin() or staff_role(merchant_id) = 'owner'$p$);

-- Loyalty: read-only for clients. Points move only through the service-role functions.
grant select on loyalty_programs, loyalty_accounts, loyalty_transactions, points_ledger, rewards, reward_redemptions,
  vouchers, campaigns, referrals, notifications to authenticated;
grant update (name, rule_type, points_per_unit, unit_centavos, minimum_spend_centavos, expiry_months, active) on loyalty_programs to authenticated;
select pg_temp.policy('ugnaya: loyalty_programs select', 'loyalty_programs', 'select', 'authenticated',
  $p$scope = 'network' or is_staff_of(merchant_id) or merchant_is_active(merchant_id) or is_platform_admin()$p$);
select pg_temp.policy('ugnaya: loyalty_programs owner update', 'loyalty_programs', 'update', 'authenticated',
  $p$scope = 'merchant' and staff_role(merchant_id) = 'owner'$p$, $p$scope = 'merchant' and staff_role(merchant_id) = 'owner'$p$);

select pg_temp.policy('ugnaya: loyalty_accounts select', 'loyalty_accounts', 'select', 'authenticated',
  'customer_id = auth.uid() or is_staff_of(program_merchant(program_id)) or is_platform_admin()');
select pg_temp.policy('ugnaya: points_ledger select', 'points_ledger', 'select', 'authenticated',
  'account_customer(account_id) = auth.uid() or is_staff_of(account_merchant(account_id)) or is_platform_admin()');
select pg_temp.policy('ugnaya: loyalty_transactions select', 'loyalty_transactions', 'select', 'authenticated',
  'customer_id = auth.uid() or is_staff_of(merchant_id) or (device_id is not null and device_id = my_device_id()) or is_platform_admin()');

grant insert (merchant_id, program_id, name, description, points_cost, retail_value_centavos, monthly_cap, stock, first_visit_only, active) on rewards to authenticated;
grant update (name, description, points_cost, retail_value_centavos, monthly_cap, stock, first_visit_only, active) on rewards to authenticated;
select pg_temp.policy('ugnaya: rewards select', 'rewards', 'select', 'authenticated',
  '(active and merchant_is_active(merchant_id)) or is_staff_of(merchant_id) or is_platform_admin()');
select pg_temp.policy('ugnaya: rewards managers insert', 'rewards', 'insert', 'authenticated', null,
  $p$staff_role(merchant_id) in ('owner', 'manager') and program_merchant(program_id) = merchant_id$p$);
select pg_temp.policy('ugnaya: rewards managers update', 'rewards', 'update', 'authenticated',
  $p$staff_role(merchant_id) in ('owner', 'manager')$p$, $p$staff_role(merchant_id) in ('owner', 'manager')$p$);

select pg_temp.policy('ugnaya: reward_redemptions select', 'reward_redemptions', 'select', 'authenticated',
  'customer_id = auth.uid() or is_staff_of(reward_merchant(reward_id)) or is_platform_admin()');
select pg_temp.policy('ugnaya: vouchers select', 'vouchers', 'select', 'authenticated',
  'customer_id = auth.uid() or (merchant_id is not null and is_staff_of(merchant_id))');
select pg_temp.policy('ugnaya: campaigns staff select', 'campaigns', 'select', 'authenticated', 'is_staff_of(merchant_id) or is_platform_admin()');
select pg_temp.policy('ugnaya: referrals own select', 'referrals', 'select', 'authenticated', 'referrer_id = auth.uid() or referee_id = auth.uid()');
select pg_temp.policy('ugnaya: notifications own select', 'notifications', 'select', 'authenticated', 'recipient_id = auth.uid()');

-- The public directory: only what a customer should see of active merchants and branches.
-- Owned by postgres, so they read past RLS; their columns are the whole of what's exposed.
create or replace view merchant_directory as
  select id, trade_name, category, city, address
  from merchants where status = 'active';
create or replace view branch_directory as
  select b.id, b.merchant_id, b.name, b.address, b.city, b.lat, b.lng, b.hours
  from merchant_branches b join merchants m on m.id = b.merchant_id
  where m.status = 'active' and b.active;
grant select on merchant_directory, branch_directory to anon, authenticated;
