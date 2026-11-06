-- Customers: profiles with a member id, their app devices (TOTP secrets), web wallet codes,
-- and the pre-launch waitlist. Safe to run twice.

create table if not exists customer_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  public_member_id text not null unique,
  display_name text,
  birthday_month smallint check (birthday_month between 1 and 12),
  birthday_day smallint check (birthday_day between 1 and 31),
  city text,
  terms_accepted_at timestamptz,
  marketing_consent_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists customer_profiles_updated_at on customer_profiles;
create trigger customer_profiles_updated_at before update on customer_profiles
  for each row execute function set_updated_at();

-- 8 characters a cashier can read aloud: no I, O, 0 or 1 (packages/rules parseMemberCode).
create or replace function generate_member_id() returns text
language plpgsql volatile set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := gen_random_bytes(8);
  result text := '';
begin
  for i in 0..7 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return result;
end $$;

-- A customer sign-up carries user_type = customer in its metadata; merchants and cashier devices don't.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'user_type', '') <> 'customer' then
    return new;
  end if;
  for attempt in 1..5 loop
    begin
      insert into customer_profiles (user_id, public_member_id, display_name)
      values (new.id, generate_member_id(), nullif(new.raw_user_meta_data ->> 'full_name', ''));
      return new;
    exception when unique_violation then
      if exists (select 1 from customer_profiles where user_id = new.id) then return new; end if;
    end;
  end loop;
  raise exception 'could not generate a member id';
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- One row per phone running the customer app: the secret behind its rotating QR code.
create table if not exists customer_devices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer_profiles (user_id) on delete cascade,
  totp_secret bytea not null,
  label text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists customer_devices_customer on customer_devices (customer_id);

-- Short-lived codes for the web wallet, which can't keep a secret as safely. Stored only as hashes.
create table if not exists member_web_codes (
  code_hash text primary key,
  customer_id uuid not null references customer_profiles (user_id) on delete cascade,
  expires_at timestamptz not null
);

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  contact text not null check (length(contact) between 5 and 120),
  kind text not null check (kind in ('email', 'mobile')),
  city text check (length(city) <= 80),
  created_at timestamptz not null default now()
);
