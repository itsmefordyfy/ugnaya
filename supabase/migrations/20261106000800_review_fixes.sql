-- Fixes from the foundation's code review (2026-11-06). Safe to run twice.
-- 1. Cashier PINs can't be brute-forced: five wrong PINs lock a device for 15 minutes.
-- 2. One owner can't end up with two businesses by registering twice at the same moment.
-- 3. A customer keeps seeing the name of a shop's program after the shop is suspended.

-- 1. PIN lockout -------------------------------------------------------------------------------
alter table devices add column if not exists pin_failures integer not null default 0;
alter table devices add column if not exists pin_locked_until timestamptz;

-- Which staff member this PIN belongs to on this device's branch, or null for a wrong PIN.
-- Returns null rather than raising so the failure count is saved (a raise would roll it back).
create or replace function check_staff_pin(p_device_user uuid, p_pin text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_device devices%rowtype;
  v_staff uuid;
begin
  select * into v_device from devices where user_id = p_device_user for update;
  if not found or v_device.revoked_at is not null then perform raise_code('device_not_allowed'); end if;
  if v_device.pin_locked_until is not null and v_device.pin_locked_until > now() then
    perform raise_code('device_locked');
  end if;

  if p_pin is not null and p_pin ~ '^[0-9]{4,6}$' then
    select id into v_staff from merchant_staff s
    where s.merchant_id = v_device.merchant_id and s.active and s.pin_hash is not null
      and (s.branch_ids is null or v_device.branch_id = any (s.branch_ids))
      and s.pin_hash = crypt(p_pin, s.pin_hash)
    limit 1;
  end if;

  if v_staff is null then
    update devices
       set pin_failures = case when pin_failures + 1 >= 5 then 0 else pin_failures + 1 end,
           pin_locked_until = case when pin_failures + 1 >= 5 then now() + interval '15 minutes' else pin_locked_until end
     where id = v_device.id;
    return null;
  end if;
  update devices set pin_failures = 0, pin_locked_until = null where id = v_device.id;
  return v_staff;
end $$;
revoke execute on function check_staff_pin(uuid, text) from public, anon, authenticated;
grant execute on function check_staff_pin(uuid, text) to service_role;

-- 2. One business per owner, even under a double submit ------------------------------------------
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
  -- Two calls for the same person queue here, so the second sees the first one's owner row.
  perform pg_advisory_xact_lock(hashtext('ugnaya.register_merchant:' || v_user::text));
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
revoke execute on function register_merchant(text, merchant_category, text, text, integer, text, text, boolean) from public, anon;
grant execute on function register_merchant(text, merchant_category, text, text, integer, text, text, boolean) to authenticated, service_role;

-- 3. A customer's own programs stay readable --------------------------------------------------------
create or replace function has_account_in(p_program_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from loyalty_accounts where program_id = p_program_id and customer_id = auth.uid())
$$;
revoke execute on function has_account_in(uuid) from public, anon;
grant execute on function has_account_in(uuid) to authenticated, service_role;

drop policy if exists "ugnaya: loyalty_programs select" on loyalty_programs;
create policy "ugnaya: loyalty_programs select" on loyalty_programs for select to authenticated using (
  scope = 'network' or is_staff_of(merchant_id) or merchant_is_active(merchant_id)
  or has_account_in(id) or is_platform_admin()
);
