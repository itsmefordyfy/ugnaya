-- Super Admin portal, phase 3: role-based access control enforced inside the database.
--   * Five admin roles, each with an explicit list of permissions; everything else is denied.
--   * A permission only counts when the session carries a second factor (aal2).
--   * Granting, changing and revoking admin access is done by audited functions; revocation is immediate.
--   * The audit log becomes append-only for everyone, and carries request id, IP and user agent.
-- Nothing here touches customer or merchant data. Safe to run twice.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'admin_role') then
    create type admin_role as enum ('super_admin', 'operations_admin', 'finance_admin', 'support_admin', 'analyst');
  end if;
end $$;

create table if not exists admin_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role admin_role not null,
  active boolean not null default true,
  display_name text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Every existing platform admin was unrestricted, so they carry over as super admins.
insert into admin_members (user_id, role)
select user_id, 'super_admin' from platform_admins
on conflict (user_id) do nothing;

alter table admin_members enable row level security;
revoke all on admin_members from anon, authenticated;
grant select on admin_members to authenticated;
-- Everyone may read their own row (the portal shows them their role); a super admin with a second factor reads the team.
drop policy if exists "ugnaya: admin_members own select" on admin_members;
create policy "ugnaya: admin_members own select" on admin_members for select to authenticated
  using (user_id = auth.uid() or is_platform_admin());

-- ---------------------------------------------------------------------------------------------------
-- Permissions. Deny by default: a role holds only what is listed here.
-- ---------------------------------------------------------------------------------------------------
create or replace function admin_permissions(p_role admin_role) returns text[]
language sql immutable as $$
  select case p_role
    when 'super_admin' then array[
      'admins.manage', 'settings.manage', 'audit.view', 'analytics.view', 'finance.view', 'finance.export',
      'merchants.view', 'merchants.review', 'merchants.suspend', 'users.view', 'users.view_pii', 'users.suspend',
      'transactions.view', 'transactions.adjust', 'subscriptions.view', 'subscriptions.manage', 'rewards.view',
      'notes.write', 'reports.view', 'reports.export', 'notifications.view']
    when 'operations_admin' then array[
      'analytics.view', 'merchants.view', 'merchants.review', 'merchants.suspend', 'users.view', 'users.suspend',
      'transactions.view', 'subscriptions.view', 'rewards.view', 'notes.write', 'notifications.view']
    when 'finance_admin' then array[
      'analytics.view', 'finance.view', 'finance.export', 'merchants.view', 'subscriptions.view', 'reports.view',
      'reports.export', 'notifications.view']
    when 'support_admin' then array[
      'users.view', 'merchants.view', 'notes.write', 'notifications.view']
    when 'analyst' then array[
      'analytics.view', 'reports.view']
  end
$$;

-- The caller's active admin role, or null (customers, merchants, staff, devices and revoked admins have none).
create or replace function current_admin_role() returns admin_role
language sql stable security definer set search_path = public as $$
  select role from admin_members where user_id = auth.uid() and active and revoked_at is null
$$;

-- True when the session was opened with a second factor (Supabase puts aal2 in the JWT).
create or replace function admin_has_mfa() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

create or replace function has_admin_permission(p_permission text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(admin_has_mfa() and p_permission = any (admin_permissions(current_admin_role())), false)
$$;

create or replace function require_admin_permission(p_permission text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not has_admin_permission(p_permission) then perform raise_code('forbidden'); end if;
end $$;

-- Row-level policies that said "a platform admin may read everything" now mean a super admin with a second
-- factor. Every other role reads through the permission-checked functions, never the tables.
create or replace function is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_admin_role() = 'super_admin' and admin_has_mfa(), false)
$$;

-- ---------------------------------------------------------------------------------------------------
-- The audit log: append-only for everyone, with the request's context.
-- ---------------------------------------------------------------------------------------------------
alter table audit_logs add column if not exists request_id text;
alter table audit_logs add column if not exists ip text;
alter table audit_logs add column if not exists user_agent text;

create or replace function audit_logs_append_only() returns trigger
language plpgsql as $$
begin
  perform raise_code('audit_immutable');
  return null;
end $$;
drop trigger if exists audit_logs_append_only on audit_logs;
create trigger audit_logs_append_only before update or delete on audit_logs
  for each row execute function audit_logs_append_only();
drop trigger if exists audit_logs_no_truncate on audit_logs;
create trigger audit_logs_no_truncate before truncate on audit_logs
  for each statement execute function audit_logs_append_only();
revoke update, delete, truncate on audit_logs from anon, authenticated, service_role;

-- Writes one admin audit row (internal: only the admin functions below call it). The context comes from the admin
-- app: { request_id, ip, user_agent }.
create or replace function admin_log(
  p_action text, p_entity_table text, p_entity_id text, p_before jsonb, p_after jsonb, p_reason text, p_context jsonb,
  p_merchant_id uuid default null
) returns void
language sql security definer set search_path = public as $$
  insert into audit_logs (merchant_id, actor_user_id, actor_role, action, entity_table, entity_id, before, after, reason,
                          request_id, ip, user_agent)
  values (p_merchant_id, auth.uid(), 'admin:' || coalesce(current_admin_role()::text, 'none'), p_action, p_entity_table,
          p_entity_id, p_before, p_after, p_reason,
          left(p_context ->> 'request_id', 100), left(p_context ->> 'ip', 64), left(p_context ->> 'user_agent', 300))
$$;
revoke execute on function admin_log(text, text, text, jsonb, jsonb, text, jsonb, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Admin team management. All of it needs admins.manage and a second factor; all of it is audited.
-- ---------------------------------------------------------------------------------------------------
create or replace function admin_me() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'role', current_admin_role(),
    'mfa', admin_has_mfa(),
    'permissions', case when admin_has_mfa() then to_jsonb(coalesce(admin_permissions(current_admin_role()), '{}'::text[])) else '[]'::jsonb end)
$$;

create or replace function admin_list_members()
returns table (user_id uuid, email text, display_name text, role admin_role, active boolean, created_at timestamptz, revoked_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform require_admin_permission('admins.manage');
  return query
    select m.user_id, u.email::text, m.display_name, m.role, m.active, m.created_at, m.revoked_at
    from admin_members m join auth.users u on u.id = m.user_id
    order by m.created_at;
end $$;

create or replace function admin_grant(p_user uuid, p_role admin_role, p_reason text, p_context jsonb default '{}')
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_existing admin_members%rowtype;
begin
  perform require_admin_permission('admins.manage');
  if length(trim(coalesce(p_reason, ''))) = 0 then perform raise_code('reason_required'); end if;
  if not exists (select 1 from auth.users where id = p_user and not coalesce(is_anonymous, false)) then
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

create or replace function admin_set_role(p_user uuid, p_role admin_role, p_reason text, p_context jsonb default '{}')
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_member admin_members%rowtype;
begin
  perform require_admin_permission('admins.manage');
  if length(trim(coalesce(p_reason, ''))) = 0 then perform raise_code('reason_required'); end if;
  if p_user = auth.uid() then perform raise_code('cannot_change_self'); end if;
  select * into v_member from admin_members where user_id = p_user and active and revoked_at is null for update;
  if not found then perform raise_code('not_admin'); end if;
  if v_member.role = p_role then perform raise_code('no_change'); end if;
  -- Never leave the platform without a super admin.
  if v_member.role = 'super_admin' and not exists (
    select 1 from admin_members where role = 'super_admin' and active and revoked_at is null and user_id <> p_user) then
    perform raise_code('last_super_admin');
  end if;
  update admin_members set role = p_role, updated_at = now() where user_id = p_user;
  perform admin_log('admin.role_changed', 'admin_members', p_user::text,
    jsonb_build_object('role', v_member.role), jsonb_build_object('role', p_role), p_reason, p_context);
end $$;

create or replace function admin_revoke(p_user uuid, p_reason text, p_context jsonb default '{}')
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_member admin_members%rowtype;
begin
  perform require_admin_permission('admins.manage');
  if length(trim(coalesce(p_reason, ''))) = 0 then perform raise_code('reason_required'); end if;
  if p_user = auth.uid() then perform raise_code('cannot_change_self'); end if;
  select * into v_member from admin_members where user_id = p_user and active and revoked_at is null for update;
  if not found then perform raise_code('not_admin'); end if;
  if v_member.role = 'super_admin' and not exists (
    select 1 from admin_members where role = 'super_admin' and active and revoked_at is null and user_id <> p_user) then
    perform raise_code('last_super_admin');
  end if;
  -- Takes effect on the next request: every permission check reads this row.
  update admin_members set active = false, revoked_at = now(), revoked_by = auth.uid(), updated_at = now() where user_id = p_user;
  perform admin_log('admin.revoked', 'admin_members', p_user::text,
    jsonb_build_object('role', v_member.role, 'active', true), jsonb_build_object('active', false), p_reason, p_context);
end $$;

-- An admin records their own session events (sign-in, second factor, sign-out). A fixed list, so the audit log
-- can't be filled with arbitrary text; allowed at aal1 because the second factor happens after sign-in.
create or replace function admin_record_event(p_action text, p_context jsonb default '{}')
returns void
language plpgsql security definer set search_path = public as $$
begin
  if current_admin_role() is null then perform raise_code('forbidden'); end if;
  if p_action not in ('admin.login', 'admin.logout', 'admin.logout_all', 'admin.mfa_enrolled', 'admin.mfa_verified',
                      'admin.session_expired') then
    perform raise_code('invalid_event');
  end if;
  perform admin_log(p_action, 'admin_members', auth.uid()::text, null, null, null, p_context);
end $$;

-- The first super admin, made once from the SQL editor (it runs as postgres) for an existing, confirmed account.
-- Not callable from any app or Edge Function.
create or replace function bootstrap_super_admin(p_email text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
begin
  if exists (select 1 from admin_members where role = 'super_admin' and active and revoked_at is null) then
    perform raise_code('super_admin_exists');
  end if;
  select id into v_user from auth.users where lower(email) = lower(p_email) and not coalesce(is_anonymous, false);
  if v_user is null then perform raise_code('user_not_found'); end if;
  insert into admin_members (user_id, role, active) values (v_user, 'super_admin', true)
  on conflict (user_id) do update set role = 'super_admin', active = true, revoked_at = null, revoked_by = null, updated_at = now();
  insert into audit_logs (actor_user_id, actor_role, action, entity_table, entity_id, after, reason)
  values (null, 'sql', 'admin.bootstrapped', 'admin_members', v_user::text, jsonb_build_object('role', 'super_admin'),
          'First super admin created from the SQL editor');
end $$;
revoke execute on function bootstrap_super_admin(text) from public, anon, authenticated, service_role;

revoke execute on function admin_permissions(admin_role), admin_has_mfa(), require_admin_permission(text) from public, anon, authenticated;
revoke execute on function current_admin_role(), has_admin_permission(text), admin_me(), admin_list_members(),
  admin_grant(uuid, admin_role, text, jsonb), admin_set_role(uuid, admin_role, text, jsonb), admin_revoke(uuid, text, jsonb),
  admin_record_event(text, jsonb) from public, anon;
grant execute on function current_admin_role(), has_admin_permission(text), admin_me(), admin_list_members(),
  admin_grant(uuid, admin_role, text, jsonb), admin_set_role(uuid, admin_role, text, jsonb), admin_revoke(uuid, text, jsonb),
  admin_record_event(text, jsonb) to authenticated;
