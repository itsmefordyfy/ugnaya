-- Merchant portal (merchant.ugnaya.com): the application with documents, the business profile and logo,
-- staff invitations, campaigns, the approval gate, platform announcements, and plan editing for admins.
-- Safe to run twice. Postgres 14 syntax only.

-- ---------------------------------------------------------------------------------------------------
-- Business profile: public description, contact, logo
-- ---------------------------------------------------------------------------------------------------
alter table merchants add column if not exists description text check (length(description) <= 500);
alter table merchants add column if not exists contact_email text check (length(contact_email) <= 120);
alter table merchants add column if not exists contact_phone text check (length(contact_phone) <= 20);
alter table merchants add column if not exists website text check (length(website) <= 200);
alter table merchants add column if not exists logo_path text check (length(logo_path) <= 300);
alter table merchants add column if not exists submitted_at timestamptz;
grant update (trade_name, legal_name, address, city, owner_mobile, description, contact_email, contact_phone, website, logo_path)
  on merchants to authenticated;

-- The public directory gains the description and logo (appended, so the view's existing columns keep their order).
create or replace view merchant_directory as
  select id, trade_name, category, city, address, description, logo_path
  from merchants where status = 'active';
grant select on merchant_directory to anon, authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Storage: verification documents are private; logos are public images.
-- Paths always start with the merchant id: <merchant_id>/<file>.
-- ---------------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('merchant-documents', 'merchant-documents', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
       ('merchant-logos', 'merchant-logos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- The merchant a storage path belongs to, or null when the first folder isn't a merchant id.
create or replace function storage_path_merchant(p_name text) returns uuid
language plpgsql immutable as $$
declare
  v_folder text := split_part(p_name, '/', 1);
begin
  if v_folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return null; end if;
  return v_folder::uuid;
end $$;
grant execute on function storage_path_merchant(text) to anon, authenticated;

-- Documents can be added or removed while the application is with the merchant (draft or info requested).
create or replace function merchant_can_edit_application(p_merchant_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from merchants where id = p_merchant_id and status in ('draft', 'pending_verification', 'info_required'))
$$;
grant execute on function merchant_can_edit_application(uuid) to authenticated;

do $$
begin
  execute 'drop policy if exists "ugnaya: merchant documents read" on storage.objects';
  execute $p$create policy "ugnaya: merchant documents read" on storage.objects for select to authenticated using (
    bucket_id = 'merchant-documents' and (
      public.staff_role(public.storage_path_merchant(name)) in ('owner', 'manager')
      or public.has_admin_permission('merchants.view')))$p$;
  execute 'drop policy if exists "ugnaya: merchant documents upload" on storage.objects';
  execute $p$create policy "ugnaya: merchant documents upload" on storage.objects for insert to authenticated with check (
    bucket_id = 'merchant-documents'
    and public.staff_role(public.storage_path_merchant(name)) in ('owner', 'manager')
    and public.merchant_can_edit_application(public.storage_path_merchant(name)))$p$;
  execute 'drop policy if exists "ugnaya: merchant documents delete" on storage.objects';
  execute $p$create policy "ugnaya: merchant documents delete" on storage.objects for delete to authenticated using (
    bucket_id = 'merchant-documents'
    and public.staff_role(public.storage_path_merchant(name)) in ('owner', 'manager')
    and public.merchant_can_edit_application(public.storage_path_merchant(name)))$p$;
  execute 'drop policy if exists "ugnaya: merchant logos read" on storage.objects';
  execute $p$create policy "ugnaya: merchant logos read" on storage.objects for select to anon, authenticated using (
    bucket_id = 'merchant-logos')$p$;
  execute 'drop policy if exists "ugnaya: merchant logos write" on storage.objects';
  execute $p$create policy "ugnaya: merchant logos write" on storage.objects for insert to authenticated with check (
    bucket_id = 'merchant-logos' and public.staff_role(public.storage_path_merchant(name)) in ('owner', 'manager'))$p$;
  execute 'drop policy if exists "ugnaya: merchant logos delete" on storage.objects';
  execute $p$create policy "ugnaya: merchant logos delete" on storage.objects for delete to authenticated using (
    bucket_id = 'merchant-logos' and public.staff_role(public.storage_path_merchant(name)) in ('owner', 'manager'))$p$;
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Verification documents
-- ---------------------------------------------------------------------------------------------------
create table if not exists merchant_documents (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  kind text not null check (kind in ('business_registration', 'tax_registration', 'permit', 'owner_id', 'storefront_photo', 'other')),
  file_path text not null unique check (length(file_path) <= 300),
  file_name text not null check (length(file_name) between 1 and 200),
  content_type text not null,
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists merchant_documents_merchant on merchant_documents (merchant_id, created_at);
alter table merchant_documents enable row level security;
revoke all on merchant_documents from anon, authenticated;
grant select on merchant_documents to authenticated;
drop policy if exists "ugnaya: merchant_documents managers select" on merchant_documents;
create policy "ugnaya: merchant_documents managers select" on merchant_documents for select to authenticated
  using (staff_role(merchant_id) in ('owner', 'manager') or is_platform_admin());

-- Records a file the merchant has just uploaded to merchant-documents/<merchant_id>/…
create or replace function merchant_add_document(
  p_merchant_id uuid, p_kind text, p_file_path text, p_file_name text, p_content_type text, p_size_bytes integer
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  perform require_merchant_manager(p_merchant_id);
  if not merchant_can_edit_application(p_merchant_id) then perform raise_code('application_locked'); end if;
  if storage_path_merchant(p_file_path) is distinct from p_merchant_id then perform raise_code('forbidden'); end if;
  if p_content_type not in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp') then perform raise_code('file_type'); end if;
  if not exists (select 1 from storage.objects where bucket_id = 'merchant-documents' and name = p_file_path) then
    perform raise_code('file_missing');
  end if;
  if (select count(*) from merchant_documents where merchant_id = p_merchant_id) >= 20 then perform raise_code('too_many_documents'); end if;
  insert into merchant_documents (merchant_id, kind, file_path, file_name, content_type, size_bytes, uploaded_by)
  values (p_merchant_id, p_kind, p_file_path, left(p_file_name, 200), p_content_type, p_size_bytes, auth.uid())
  returning id into v_id;
  perform log_audit('document.added', p_merchant_id, 'merchant_documents', v_id::text, null,
    jsonb_build_object('kind', p_kind, 'file_name', left(p_file_name, 200)));
  return v_id;
end $$;

-- Forgets a document (the portal deletes the stored file first). Only while the application is with the merchant.
create or replace function merchant_remove_document(p_document_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_doc merchant_documents%rowtype;
begin
  select * into v_doc from merchant_documents where id = p_document_id for update;
  if not found then perform raise_code('not_found'); end if;
  perform require_merchant_manager(v_doc.merchant_id);
  if not merchant_can_edit_application(v_doc.merchant_id) then perform raise_code('application_locked'); end if;
  delete from merchant_documents where id = p_document_id;
  perform log_audit('document.removed', v_doc.merchant_id, 'merchant_documents', p_document_id::text,
    jsonb_build_object('kind', v_doc.kind, 'file_name', v_doc.file_name), null);
  return v_doc.file_path;
end $$;

-- Admins list a merchant's documents (merchants.view); the admin portal signs a short-lived link to each.
create or replace function admin_merchant_documents(p_merchant_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform require_admin_permission('merchants.view');
  return (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'kind', d.kind, 'file_path', d.file_path,
    'file_name', d.file_name, 'content_type', d.content_type, 'size_bytes', d.size_bytes, 'created_at', d.created_at)
    order by d.created_at), '[]'::jsonb) from merchant_documents d where d.merchant_id = p_merchant_id);
end $$;

-- ---------------------------------------------------------------------------------------------------
-- The application: registering creates a draft; the owner submits it (with at least one document) for review.
-- ---------------------------------------------------------------------------------------------------
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
  perform pg_advisory_xact_lock(hashtext('ugnaya.register_merchant:' || v_user::text));
  if exists (select 1 from merchant_staff where user_id = v_user and role = 'owner') then
    perform raise_code('already_registered');
  end if;
  select coalesce(nullif(trim(raw_user_meta_data ->> 'full_name'), ''), email, 'Owner')
    into v_name from auth.users where id = v_user;

  insert into merchants (trade_name, category, city, address, branch_count_declared, owner_mobile, heard_from,
                         terms_accepted_at, privacy_accepted_at, marketing_consent_at, status)
  values (trim(p_trade_name), p_category, trim(p_city), nullif(trim(p_address), ''), p_branch_count,
          nullif(trim(p_owner_mobile), ''), nullif(trim(p_heard_from), ''),
          now(), now(), case when p_marketing_consent then now() end, 'draft')
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

create or replace function merchant_submit_application(p_merchant_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_status merchant_status;
begin
  if staff_role(p_merchant_id) is distinct from 'owner' then perform raise_code('forbidden'); end if;
  select status into v_status from merchants where id = p_merchant_id for update;
  if v_status::text <> 'draft' then perform raise_code('invalid_transition'); end if;
  if not exists (select 1 from merchant_documents where merchant_id = p_merchant_id) then
    perform raise_code('documents_required');
  end if;
  update merchants set status = 'pending_verification', submitted_at = now() where id = p_merchant_id;
  insert into merchant_reviews (merchant_id, action, from_status, to_status, actor_user_id, actor_kind)
  values (p_merchant_id, 'submitted', v_status, 'pending_verification', auth.uid(), 'merchant');
  perform log_audit('merchant.submitted', p_merchant_id, 'merchants', p_merchant_id::text,
    jsonb_build_object('status', v_status), jsonb_build_object('status', 'pending_verification'));
end $$;

-- ---------------------------------------------------------------------------------------------------
-- The approval gate: until UGNAYA approves the business, it can't publish rewards or campaigns or register
-- counter devices (awarding and redeeming already require an active merchant, assert_counter).
-- ---------------------------------------------------------------------------------------------------
drop policy if exists "ugnaya: rewards managers insert" on rewards;
create policy "ugnaya: rewards managers insert" on rewards for insert to authenticated with check (
  staff_role(merchant_id) in ('owner', 'manager') and program_merchant(program_id) = merchant_id and merchant_is_active(merchant_id));
drop policy if exists "ugnaya: rewards managers update" on rewards;
create policy "ugnaya: rewards managers update" on rewards for update to authenticated
  using (staff_role(merchant_id) in ('owner', 'manager'))
  with check (staff_role(merchant_id) in ('owner', 'manager') and merchant_is_active(merchant_id));
drop policy if exists "ugnaya: devices managers insert" on devices;
create policy "ugnaya: devices managers insert" on devices for insert to authenticated with check (
  staff_role(merchant_id) in ('owner', 'manager') and merchant_is_active(merchant_id));

-- Campaigns and promotions: what the shop announces to its members. Drafts are allowed any time; scheduling
-- or running one needs an approved business.
alter table campaigns add column if not exists description text check (length(description) <= 500);
alter table campaigns add column if not exists created_by uuid references auth.users (id) on delete set null;
grant insert (merchant_id, name, kind, description, audience, starts_at, ends_at, status, created_by) on campaigns to authenticated;
grant update (name, kind, description, audience, starts_at, ends_at, status) on campaigns to authenticated;
drop policy if exists "ugnaya: campaigns managers insert" on campaigns;
create policy "ugnaya: campaigns managers insert" on campaigns for insert to authenticated with check (
  merchant_id is not null and staff_role(merchant_id) in ('owner', 'manager')
  and kind in ('promotion', 'announcement', 'event')
  and (status in ('draft', 'cancelled') or merchant_is_active(merchant_id)));
drop policy if exists "ugnaya: campaigns managers update" on campaigns;
create policy "ugnaya: campaigns managers update" on campaigns for update to authenticated
  using (merchant_id is not null and staff_role(merchant_id) in ('owner', 'manager'))
  with check (staff_role(merchant_id) in ('owner', 'manager') and kind in ('promotion', 'announcement', 'event')
              and (status in ('draft', 'cancelled') or merchant_is_active(merchant_id)));
drop trigger if exists campaigns_updated_at on campaigns;
create trigger campaigns_updated_at before update on campaigns for each row execute function set_updated_at();

-- Admins see every merchant's campaigns (merchants.view).
create or replace function admin_merchant_campaigns(p_merchant_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform require_admin_permission('merchants.view');
  return (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'kind', c.kind, 'status', c.status,
    'starts_at', c.starts_at, 'ends_at', c.ends_at, 'created_at', c.created_at) order by c.created_at desc), '[]'::jsonb)
    from campaigns c where c.merchant_id = p_merchant_id);
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Staff invitations: the owner (or a manager, for cashiers) invites by email; the person opens the link,
-- signs in or registers with that same email, and accepts. Only a hash of the token is stored.
-- ---------------------------------------------------------------------------------------------------
create table if not exists merchant_staff_invites (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  email text not null check (length(email) between 3 and 200),
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  role staff_role not null check (role <> 'owner'),
  branch_ids uuid[],
  token_hash text not null unique,
  expires_at timestamptz not null,
  invited_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists merchant_staff_invites_merchant on merchant_staff_invites (merchant_id, created_at desc);
alter table merchant_staff_invites enable row level security;
revoke all on merchant_staff_invites from anon, authenticated;
grant select (id, merchant_id, email, display_name, role, branch_ids, expires_at, accepted_at, revoked_at, created_at)
  on merchant_staff_invites to authenticated;
drop policy if exists "ugnaya: staff invites managers select" on merchant_staff_invites;
create policy "ugnaya: staff invites managers select" on merchant_staff_invites for select to authenticated
  using (staff_role(merchant_id) in ('owner', 'manager'));

-- Returns the raw token once; the portal turns it into merchant.ugnaya.com/invite/<token>.
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

create or replace function merchant_revoke_invite(p_invite_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_inv merchant_staff_invites%rowtype;
  v_caller staff_role;
begin
  select * into v_inv from merchant_staff_invites where id = p_invite_id for update;
  if not found then perform raise_code('not_found'); end if;
  v_caller := require_merchant_manager(v_inv.merchant_id);
  if v_caller = 'manager' and v_inv.role <> 'cashier' then perform raise_code('forbidden'); end if;
  if v_inv.accepted_at is not null or v_inv.revoked_at is not null then perform raise_code('invite_closed'); end if;
  update merchant_staff_invites set revoked_at = now() where id = p_invite_id;
  perform log_audit('staff.invite_revoked', v_inv.merchant_id, 'merchant_staff_invites', p_invite_id::text);
end $$;

-- What an invitation link shows before accepting (no session needed beyond being signed in).
create or replace function merchant_invite_preview(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_inv merchant_staff_invites%rowtype;
begin
  select * into v_inv from merchant_staff_invites where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found or v_inv.revoked_at is not null or v_inv.accepted_at is not null or v_inv.expires_at < now() then
    perform raise_code('invite_invalid');
  end if;
  return jsonb_build_object('trade_name', (select trade_name from merchants where id = v_inv.merchant_id),
    'role', v_inv.role, 'email', v_inv.email, 'display_name', v_inv.display_name, 'expires_at', v_inv.expires_at);
end $$;

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

-- ---------------------------------------------------------------------------------------------------
-- Platform announcements (admins write with settings.manage; merchants and customers read published ones)
-- ---------------------------------------------------------------------------------------------------
create table if not exists platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  body text not null check (length(trim(body)) between 1 and 2000),
  audience text not null check (audience in ('merchants', 'customers', 'all')),
  published boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table platform_announcements enable row level security;
revoke all on platform_announcements from anon, authenticated;
grant select on platform_announcements to anon, authenticated;
drop policy if exists "ugnaya: announcements published select" on platform_announcements;
create policy "ugnaya: announcements published select" on platform_announcements for select to anon, authenticated
  using (published and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
drop trigger if exists platform_announcements_updated_at on platform_announcements;
create trigger platform_announcements_updated_at before update on platform_announcements
  for each row execute function set_updated_at();

create or replace function admin_list_announcements() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform require_admin_permission('settings.manage');
  return (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb) from platform_announcements a);
end $$;

-- Creates (p_id null) or updates an announcement.
create or replace function admin_save_announcement(
  p_id uuid, p_title text, p_body text, p_audience text, p_published boolean, p_starts_at timestamptz, p_ends_at timestamptz,
  p_context jsonb default '{}'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := p_id;
  v_before jsonb;
begin
  perform require_admin_permission('settings.manage');
  if nullif(trim(coalesce(p_title, '')), '') is null or nullif(trim(coalesce(p_body, '')), '') is null then
    perform raise_code('announcement_invalid');
  end if;
  if p_audience not in ('merchants', 'customers', 'all') then perform raise_code('announcement_invalid'); end if;
  if p_starts_at is not null and p_ends_at is not null and p_ends_at <= p_starts_at then perform raise_code('invalid_range'); end if;
  if v_id is null then
    insert into platform_announcements (title, body, audience, published, starts_at, ends_at, created_by)
    values (trim(p_title), trim(p_body), p_audience, coalesce(p_published, false), p_starts_at, p_ends_at, auth.uid())
    returning id into v_id;
  else
    select to_jsonb(a) into v_before from platform_announcements a where id = v_id for update;
    if v_before is null then perform raise_code('not_found'); end if;
    update platform_announcements
       set title = trim(p_title), body = trim(p_body), audience = p_audience, published = coalesce(p_published, false),
           starts_at = p_starts_at, ends_at = p_ends_at
     where id = v_id;
  end if;
  perform admin_log(case when p_id is null then 'announcement.created' else 'announcement.updated' end,
    'platform_announcements', v_id::text, v_before,
    jsonb_build_object('title', trim(p_title), 'audience', p_audience, 'published', coalesce(p_published, false)), null, p_context);
  return v_id;
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Subscription plans (settings.manage): price and limits. The marketing site's plans.ts shows list prices too
-- and is updated with the site.
-- ---------------------------------------------------------------------------------------------------
create or replace function admin_update_plan(
  p_plan plan_code, p_price_centavos integer, p_branches integer, p_staff integer, p_rewards integer,
  p_transactions_per_month integer, p_reason text, p_context jsonb default '{}'
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reason text;
  v_before jsonb;
begin
  perform require_admin_permission('settings.manage');
  v_reason := require_reason(p_reason);
  if p_price_centavos is null or p_price_centavos < 0 or p_price_centavos > 100000000
     or coalesce(p_branches, 1) < 1 or coalesce(p_staff, 1) < 1 or coalesce(p_rewards, 1) < 1
     or coalesce(p_transactions_per_month, 1) < 1 then
    perform raise_code('invalid_value');
  end if;
  select to_jsonb(p) into v_before from plan_limits p where plan = p_plan for update;
  if v_before is null then perform raise_code('not_found'); end if;
  update plan_limits set price_centavos = p_price_centavos, branches = p_branches, staff = p_staff, rewards = p_rewards,
         transactions_per_month = p_transactions_per_month
   where plan = p_plan;
  perform admin_log('plan.updated', 'plan_limits', p_plan::text, v_before,
    jsonb_build_object('price_centavos', p_price_centavos, 'branches', p_branches, 'staff', p_staff, 'rewards', p_rewards,
                       'transactions_per_month', p_transactions_per_month), v_reason, p_context);
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------------------------------
revoke execute on function merchant_add_document(uuid, text, text, text, text, integer), merchant_remove_document(uuid),
  admin_merchant_documents(uuid), merchant_submit_application(uuid), admin_merchant_campaigns(uuid),
  merchant_invite_staff(uuid, text, text, staff_role, uuid[]), merchant_revoke_invite(uuid), merchant_invite_preview(text),
  merchant_accept_invite(text), admin_list_announcements(),
  admin_save_announcement(uuid, text, text, text, boolean, timestamptz, timestamptz, jsonb),
  admin_update_plan(plan_code, integer, integer, integer, integer, integer, text, jsonb) from public, anon;
grant execute on function merchant_add_document(uuid, text, text, text, text, integer), merchant_remove_document(uuid),
  admin_merchant_documents(uuid), merchant_submit_application(uuid), admin_merchant_campaigns(uuid),
  merchant_invite_staff(uuid, text, text, staff_role, uuid[]), merchant_revoke_invite(uuid), merchant_invite_preview(text),
  merchant_accept_invite(text), admin_list_announcements(),
  admin_save_announcement(uuid, text, text, text, boolean, timestamptz, timestamptz, jsonb),
  admin_update_plan(plan_code, integer, integer, integer, integer, integer, text, jsonb) to authenticated;
