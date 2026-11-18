-- Fixes from the portal security review (2026-11-07). Safe to run twice. Postgres 14 syntax only.
--  1. Nobody is attached to a business by email without accepting an invitation; the staff table's role and
--     membership can't be written directly (only names, branches and the active flag, by the policies).
--  2. Joining a business or the admin team needs a confirmed email; administrators join only through a
--     single-use invitation token handed over by a super admin (grant-by-email is withdrawn), so pre-registering
--     someone's address gets an attacker nothing.
--  3. Businesses no longer read UGNAYA's internal audit rows (they get decisions through merchant_reviews).
--  4. Verification documents need merchants.review or users.view_pii.
--  5. Branch managers stay inside their branches (branches, staff, invitations).
--  6. An approved business's name and legal name are fixed (UGNAYA changes them); a logo path must be its own file.
--  7. Documents can be added or removed only while the application is with the business (draft, info requested).

-- 1 ---------------------------------------------------------------------------------------------------
create or replace function merchant_add_staff(
  p_merchant_id uuid, p_display_name text, p_role staff_role, p_email text default null,
  p_branch_ids uuid[] default null, p_pin text default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid;
  v_scope uuid[];
begin
  perform require_merchant_manager(p_merchant_id);
  -- Anyone with a login joins through an invitation they accept themselves (merchant_invite_staff).
  if nullif(trim(coalesce(p_email, '')), '') is not null or p_role <> 'cashier' then perform raise_code('use_invite'); end if;
  if nullif(trim(coalesce(p_display_name, '')), '') is null or length(trim(p_display_name)) > 80 then
    perform raise_code('name_invalid');
  end if;
  if nullif(p_pin, '') is null then perform raise_code('pin_required'); end if;
  if p_pin !~ '^[0-9]{4,6}$' then perform raise_code('pin_invalid'); end if;
  v_scope := my_branch_scope(p_merchant_id);
  if v_scope is not null and (nullif(p_branch_ids, '{}') is null or not p_branch_ids <@ v_scope) then
    perform raise_code('branch_out_of_scope');
  end if;
  if p_branch_ids is not null and exists (
    select 1 from unnest(p_branch_ids) b where not exists (
      select 1 from merchant_branches mb where mb.id = b and mb.merchant_id = p_merchant_id)) then
    perform raise_code('branch_invalid');
  end if;
  if exists (select 1 from merchant_staff where merchant_id = p_merchant_id and active and pin_hash is not null
             and pin_hash = crypt(p_pin, pin_hash)) then
    perform raise_code('pin_taken');
  end if;
  insert into merchant_staff (merchant_id, display_name, role, branch_ids, pin_hash)
  values (p_merchant_id, trim(p_display_name), 'cashier', nullif(p_branch_ids, '{}'), crypt(p_pin, gen_salt('bf')))
  returning id into v_id;
  perform log_audit('staff.added', p_merchant_id, 'merchant_staff', v_id::text, null,
    jsonb_build_object('name', trim(p_display_name), 'role', 'cashier', 'has_login', false));
  return v_id;
end $$;

revoke insert, update on merchant_staff from authenticated;
grant update (display_name, branch_ids, active) on merchant_staff to authenticated;
grant execute on function my_branch_scope(uuid) to authenticated;
drop policy if exists "ugnaya: merchant_staff owner insert" on merchant_staff;
drop policy if exists "ugnaya: merchant_staff manager updates cashiers" on merchant_staff;
create policy "ugnaya: merchant_staff manager updates cashiers" on merchant_staff for update to authenticated
  using (staff_role(merchant_id) = 'manager' and role = 'cashier'
         and (my_branch_scope(merchant_id) is null or (branch_ids is not null and branch_ids <@ my_branch_scope(merchant_id))))
  with check (staff_role(merchant_id) = 'manager' and role = 'cashier'
         and (my_branch_scope(merchant_id) is null or (branch_ids is not null and branch_ids <@ my_branch_scope(merchant_id))));

create or replace function merchant_update_staff(
  p_staff_id uuid, p_display_name text, p_role staff_role, p_branch_ids uuid[], p_active boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_s merchant_staff%rowtype;
  v_caller staff_role;
begin
  select * into v_s from merchant_staff where id = p_staff_id for update;
  if not found then perform raise_code('forbidden'); end if;
  v_caller := require_merchant_manager(v_s.merchant_id);
  if v_caller = 'manager' and v_s.role <> 'cashier' and v_s.user_id is distinct from auth.uid() then
    perform raise_code('forbidden');
  end if;
  if (v_s.role = 'owner') <> (p_role = 'owner') then perform raise_code('forbidden'); end if;
  if v_caller = 'manager' and p_role not in ('cashier') and v_s.user_id is distinct from auth.uid() then
    perform raise_code('forbidden');
  end if;
  -- Your own row: only the name. Otherwise a branch manager could widen their branches or role themselves.
  if v_s.user_id = auth.uid() and (p_role <> v_s.role or not p_active
      or nullif(p_branch_ids, '{}') is distinct from v_s.branch_ids) then
    perform raise_code('cannot_change_self');
  end if;
  if p_role = 'manager' and v_s.user_id is null then perform raise_code('login_required'); end if;
  if nullif(trim(coalesce(p_display_name, '')), '') is null or length(trim(p_display_name)) > 80 then
    perform raise_code('name_invalid');
  end if;
  -- A branch manager manages only cashiers who work inside their branches, and only within them.
  if my_branch_scope(v_s.merchant_id) is not null and v_s.user_id is distinct from auth.uid() and (
       v_s.branch_ids is null or not v_s.branch_ids <@ my_branch_scope(v_s.merchant_id)
       or nullif(p_branch_ids, '{}') is null or not p_branch_ids <@ my_branch_scope(v_s.merchant_id)) then
    perform raise_code('branch_out_of_scope');
  end if;
  if p_branch_ids is not null and exists (
    select 1 from unnest(p_branch_ids) b where not exists (
      select 1 from merchant_branches mb where mb.id = b and mb.merchant_id = v_s.merchant_id)) then
    perform raise_code('branch_invalid');
  end if;
  update merchant_staff
     set display_name = trim(p_display_name), role = p_role, branch_ids = nullif(p_branch_ids, '{}'), active = p_active
   where id = p_staff_id;
  perform log_audit('staff.updated', v_s.merchant_id, 'merchant_staff', p_staff_id::text,
    jsonb_build_object('name', v_s.display_name, 'role', v_s.role, 'active', v_s.active, 'branch_ids', v_s.branch_ids),
    jsonb_build_object('name', trim(p_display_name), 'role', p_role, 'active', p_active, 'branch_ids', p_branch_ids));
end $$;

create or replace function merchant_invite_staff(
  p_merchant_id uuid, p_email text, p_display_name text, p_role staff_role, p_branch_ids uuid[] default null
) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_caller staff_role;
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  v_caller := require_merchant_manager(p_merchant_id);
  if not merchant_is_active(p_merchant_id) then perform raise_code('merchant_not_approved'); end if;
  if p_role = 'owner' or (v_caller = 'manager' and p_role <> 'cashier') then perform raise_code('forbidden'); end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform raise_code('email_invalid'); end if;
  if nullif(trim(coalesce(p_display_name, '')), '') is null or length(trim(p_display_name)) > 80 then
    perform raise_code('name_invalid');
  end if;
  if exists (select 1 from merchant_staff s join auth.users u on u.id = s.user_id
             where s.merchant_id = p_merchant_id and lower(u.email) = v_email) then
    perform raise_code('already_staff');
  end if;
  if my_branch_scope(p_merchant_id) is not null
     and (nullif(p_branch_ids, '{}') is null or not p_branch_ids <@ my_branch_scope(p_merchant_id)) then
    perform raise_code('branch_out_of_scope');
  end if;
  if p_branch_ids is not null and exists (
    select 1 from unnest(p_branch_ids) b where not exists (
      select 1 from merchant_branches mb where mb.id = b and mb.merchant_id = p_merchant_id)) then
    perform raise_code('branch_invalid');
  end if;
  -- One open invitation per email per business: a new one replaces the old.
  update merchant_staff_invites set revoked_at = now()
   where merchant_id = p_merchant_id and lower(email) = v_email and accepted_at is null and revoked_at is null;
  insert into merchant_staff_invites (merchant_id, email, display_name, role, branch_ids, token_hash, expires_at, invited_by)
  values (p_merchant_id, v_email, trim(p_display_name), p_role, nullif(p_branch_ids, '{}'),
          encode(digest(v_token, 'sha256'), 'hex'), now() + interval '7 days', auth.uid());
  perform log_audit('staff.invited', p_merchant_id, 'merchant_staff_invites', v_email, null,
    jsonb_build_object('email', v_email, 'role', p_role));
  return v_token;
end $$;

-- 2 ---------------------------------------------------------------------------------------------------
create or replace function merchant_accept_invite(p_token text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_inv merchant_staff_invites%rowtype;
  v_email text;
  v_staff uuid;
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then perform raise_code('sign_in_required'); end if;
  select * into v_inv from merchant_staff_invites
   where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') for update;
  if not found or v_inv.revoked_at is not null or v_inv.accepted_at is not null or v_inv.expires_at < now() then
    perform raise_code('invite_invalid');
  end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is distinct from lower(v_inv.email) then perform raise_code('invite_wrong_account'); end if;
  -- An address someone typed but never proved is not enough to join a business.
  if not exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null) then
    perform raise_code('email_unconfirmed');
  end if;
  if v_email is distinct from lower(v_inv.email) then perform raise_code('invite_wrong_account'); end if;
  if exists (select 1 from merchant_staff where merchant_id = v_inv.merchant_id and user_id = auth.uid()) then
    perform raise_code('already_staff');
  end if;
  insert into merchant_staff (merchant_id, user_id, display_name, role, branch_ids)
  values (v_inv.merchant_id, auth.uid(), v_inv.display_name, v_inv.role, v_inv.branch_ids)
  returning id into v_staff;
  update merchant_staff_invites set accepted_at = now(), accepted_by = auth.uid() where id = v_inv.id;
  perform log_audit('staff.invite_accepted', v_inv.merchant_id, 'merchant_staff', v_staff::text, null,
    jsonb_build_object('role', v_inv.role));
  return v_inv.merchant_id;
end $$;

create or replace function admin_grant(p_user uuid, p_role admin_role, p_reason text, p_context jsonb default '{}')
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_existing admin_members%rowtype;
begin
  perform require_admin_permission('admins.manage');
  if length(trim(coalesce(p_reason, ''))) = 0 then perform raise_code('reason_required'); end if;
  if not exists (select 1 from auth.users where id = p_user and not coalesce(is_anonymous, false) and email_confirmed_at is not null) then
    perform raise_code('user_not_found');
  end if;
  if p_user = auth.uid() then perform raise_code('cannot_change_self'); end if;
  select * into v_existing from admin_members where user_id = p_user;
  if found and v_existing.active and v_existing.revoked_at is null then perform raise_code('already_admin'); end if;

  insert into admin_members (user_id, role, active, created_by)
  values (p_user, p_role, true, auth.uid())
  on conflict (user_id) do update
    set role = excluded.role, active = true, revoked_at = null, revoked_by = null, created_by = auth.uid(), updated_at = now();
  perform admin_log('admin.granted', 'admin_members', p_user::text,
    case when found then jsonb_build_object('role', v_existing.role, 'active', v_existing.active) end,
    jsonb_build_object('role', p_role, 'active', true), p_reason, p_context);
end $$;

revoke execute on function admin_grant_by_email(text, admin_role, text, jsonb) from public, anon, authenticated;

create table if not exists admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (length(email) between 3 and 200),
  role admin_role not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  reason text,
  invited_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
alter table admin_invites enable row level security;
revoke all on admin_invites from anon, authenticated;

-- Returns the raw token once. The super admin hands the link to the person directly (not by an email the
-- platform sends): someone who registered that address first still can't accept without it.
create or replace function admin_invite(p_email text, p_role admin_role, p_reason text, p_context jsonb default '{}') returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_reason text;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_id uuid;
begin
  perform require_admin_permission('admins.manage');
  v_reason := require_reason(p_reason);
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform raise_code('email_invalid'); end if;
  if exists (select 1 from admin_members a join auth.users u on u.id = a.user_id
             where lower(u.email) = v_email and a.active and a.revoked_at is null) then
    perform raise_code('already_admin');
  end if;
  update admin_invites set revoked_at = now() where lower(email) = v_email and accepted_at is null and revoked_at is null;
  insert into admin_invites (email, role, token_hash, expires_at, reason, invited_by)
  values (v_email, p_role, encode(digest(v_token, 'sha256'), 'hex'), now() + interval '72 hours', v_reason, auth.uid())
  returning id into v_id;
  perform admin_log('admin.invited', 'admin_invites', v_id::text, null, jsonb_build_object('email', v_email, 'role', p_role),
    v_reason, p_context);
  return v_token;
end $$;

create or replace function admin_list_invites() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform require_admin_permission('admins.manage');
  return (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'email', i.email, 'role', i.role, 'expires_at', i.expires_at,
    'created_at', i.created_at, 'invited_by', u.email::text) order by i.created_at desc), '[]'::jsonb)
    from admin_invites i left join auth.users u on u.id = i.invited_by
    where i.accepted_at is null and i.revoked_at is null and i.expires_at > now());
end $$;

create or replace function admin_revoke_invite(p_invite_id uuid, p_reason text, p_context jsonb default '{}') returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reason text;
begin
  perform require_admin_permission('admins.manage');
  v_reason := require_reason(p_reason);
  update admin_invites set revoked_at = now() where id = p_invite_id and accepted_at is null and revoked_at is null;
  if not found then perform raise_code('invite_closed'); end if;
  perform admin_log('admin.invite_revoked', 'admin_invites', p_invite_id::text, null, null, v_reason, p_context);
end $$;

-- Any signed-in person may look at an invitation they hold (to see what they're accepting).
create or replace function admin_invite_preview(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_inv admin_invites%rowtype;
begin
  select * into v_inv from admin_invites where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found or v_inv.revoked_at is not null or v_inv.accepted_at is not null or v_inv.expires_at < now() then
    perform raise_code('invite_invalid');
  end if;
  return jsonb_build_object('email', v_inv.email, 'role', v_inv.role, 'expires_at', v_inv.expires_at);
end $$;

-- Accepting works at aal1 (the second factor is enrolled right after, and nothing works before it).
create or replace function admin_accept_invite(p_token text, p_context jsonb default '{}') returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_inv admin_invites%rowtype;
  v_email text;
  v_confirmed boolean;
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then perform raise_code('sign_in_required'); end if;
  select * into v_inv from admin_invites where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') for update;
  if not found or v_inv.revoked_at is not null or v_inv.accepted_at is not null or v_inv.expires_at < now() then
    perform raise_code('invite_invalid');
  end if;
  select lower(email), email_confirmed_at is not null into v_email, v_confirmed from auth.users where id = auth.uid();
  if v_email is distinct from lower(v_inv.email) then perform raise_code('invite_wrong_account'); end if;
  if not v_confirmed then perform raise_code('email_unconfirmed'); end if;
  insert into admin_members (user_id, role, active, created_by) values (auth.uid(), v_inv.role, true, v_inv.invited_by)
  on conflict (user_id) do update
    set role = excluded.role, active = true, revoked_at = null, revoked_by = null, created_by = excluded.created_by, updated_at = now();
  update admin_invites set accepted_at = now(), accepted_by = auth.uid() where id = v_inv.id;
  perform admin_log('admin.invite_accepted', 'admin_members', auth.uid()::text, null, jsonb_build_object('role', v_inv.role),
    null, p_context);
end $$;

revoke execute on function admin_invite(text, admin_role, text, jsonb), admin_list_invites(), admin_revoke_invite(uuid, text, jsonb),
  admin_invite_preview(text), admin_accept_invite(text, jsonb) from public, anon;
grant execute on function admin_invite(text, admin_role, text, jsonb), admin_list_invites(), admin_revoke_invite(uuid, text, jsonb),
  admin_invite_preview(text), admin_accept_invite(text, jsonb) to authenticated;

-- 3 ---------------------------------------------------------------------------------------------------
drop policy if exists "ugnaya: audit_logs managers select" on audit_logs;
create policy "ugnaya: audit_logs managers select" on audit_logs for select to authenticated using (
  is_platform_admin()
  or (merchant_id is not null and staff_role(merchant_id) in ('owner', 'manager') and coalesce(actor_role, '') not like 'admin:%'));

-- 4 ---------------------------------------------------------------------------------------------------
create or replace function admin_merchant_documents(p_merchant_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (has_admin_permission('merchants.review') or has_admin_permission('users.view_pii')) then
    perform raise_code('forbidden');
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'kind', d.kind, 'file_path', d.file_path,
    'file_name', d.file_name, 'content_type', d.content_type, 'size_bytes', d.size_bytes, 'created_at', d.created_at)
    order by d.created_at), '[]'::jsonb) from merchant_documents d where d.merchant_id = p_merchant_id);
end $$;

do $$
begin
  execute 'drop policy if exists "ugnaya: merchant documents read" on storage.objects';
  execute $p$create policy "ugnaya: merchant documents read" on storage.objects for select to authenticated using (
    bucket_id = 'merchant-documents' and (
      public.staff_role(public.storage_path_merchant(name)) in ('owner', 'manager')
      or public.has_admin_permission('merchants.review') or public.has_admin_permission('users.view_pii')))$p$;
end $$;

-- 5 ---------------------------------------------------------------------------------------------------
drop policy if exists "ugnaya: merchant_branches managers insert" on merchant_branches;
create policy "ugnaya: merchant_branches managers insert" on merchant_branches for insert to authenticated with check (
  staff_role(merchant_id) = 'owner' or (staff_role(merchant_id) = 'manager' and my_branch_scope(merchant_id) is null));
drop policy if exists "ugnaya: merchant_branches managers update" on merchant_branches;
create policy "ugnaya: merchant_branches managers update" on merchant_branches for update to authenticated
  using (staff_role(merchant_id) = 'owner'
         or (staff_role(merchant_id) = 'manager' and (my_branch_scope(merchant_id) is null or id = any (my_branch_scope(merchant_id)))))
  with check (staff_role(merchant_id) = 'owner'
         or (staff_role(merchant_id) = 'manager' and (my_branch_scope(merchant_id) is null or id = any (my_branch_scope(merchant_id)))));

-- 6 ---------------------------------------------------------------------------------------------------
create or replace function merchants_guard_identity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Only business users are limited; admins' functions and the server roles are not.
  if coalesce(auth.role(), '') <> 'authenticated' or is_platform_admin() then return new; end if;
  if (new.trade_name, new.legal_name) is distinct from (old.trade_name, old.legal_name)
     and old.status::text not in ('draft', 'info_required') then
    perform raise_code('identity_locked');
  end if;
  if new.logo_path is distinct from old.logo_path and new.logo_path is not null
     and new.logo_path !~ ('^' || new.id::text || '/logo-[A-Za-z0-9_-]{1,64}\.(png|jpe?g|webp)$') then
    perform raise_code('logo_invalid');
  end if;
  return new;
end $$;
drop trigger if exists merchants_guard_identity on merchants;
create trigger merchants_guard_identity before update on merchants for each row execute function merchants_guard_identity();

-- 7 ---------------------------------------------------------------------------------------------------
create or replace function merchant_can_edit_application(p_merchant_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from merchants where id = p_merchant_id and status in ('draft', 'info_required'))
$$;
