-- Super Admin portal, phases 4 to 12: dashboard, merchant review, users, transactions, fraud, finance,
-- analytics, alerts, settings and notes. Every function checks the caller's permission and second factor
-- (require_admin_permission) inside the database, and every change writes its audit row in the same
-- transaction. Lists are filtered and paginated here, so the browser never receives whole tables.
-- Safe to run twice. Postgres 14 syntax only.

-- ---------------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------------

-- Each step of a merchant's application and later life (approve, reject, suspend…), with who and why.
-- The owner sees their own history, so an "information requested" message reaches them.
create table if not exists merchant_reviews (
  id bigserial primary key,
  merchant_id uuid not null references merchants (id) on delete cascade,
  action text not null,
  from_status merchant_status,
  to_status merchant_status,
  reason text check (length(reason) <= 2000),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_kind text not null check (actor_kind in ('admin', 'merchant')),
  created_at timestamptz not null default now()
);
create index if not exists merchant_reviews_merchant on merchant_reviews (merchant_id, created_at desc);
alter table merchant_reviews enable row level security;
revoke all on merchant_reviews from anon, authenticated;
grant select on merchant_reviews to authenticated;
drop policy if exists "ugnaya: merchant_reviews managers select" on merchant_reviews;
create policy "ugnaya: merchant_reviews managers select" on merchant_reviews for select to authenticated
  using (staff_role(merchant_id) in ('owner', 'manager') or is_platform_admin());

-- Internal notes about a merchant or a person. Admin-only: no client grants at all, functions only.
create table if not exists admin_notes (
  id bigserial primary key,
  entity_type text not null check (entity_type in ('merchant', 'user')),
  entity_id text not null,
  body text not null check (length(trim(body)) between 1 and 4000),
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists admin_notes_entity on admin_notes (entity_type, entity_id, created_at desc);
alter table admin_notes enable row level security;
revoke all on admin_notes from anon, authenticated;

-- Reviews and notes are history: never edited or deleted (same rule as the audit log).
drop trigger if exists merchant_reviews_append_only on merchant_reviews;
create trigger merchant_reviews_append_only before update or delete on merchant_reviews
  for each row execute function audit_logs_append_only();
drop trigger if exists admin_notes_append_only on admin_notes;
create trigger admin_notes_append_only before update or delete on admin_notes
  for each row execute function audit_logs_append_only();
revoke update, delete, truncate on merchant_reviews, admin_notes from anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------
-- Small helpers (internal)
-- ---------------------------------------------------------------------------------------------------

-- "ana@example.com" -> "a***@example.com". Admins without users.view_pii see addresses this way.
create or replace function mask_email(p_email text) returns text
language sql immutable as $$
  select case
    when p_email is null then null
    when position('@' in p_email) <= 1 then '***'
    else left(p_email, 1) || '***' || substr(p_email, position('@' in p_email))
  end
$$;

-- A search box's text as an ILIKE pattern, with % and _ taken literally. Null for an empty search.
create or replace function search_pattern(p_search text) returns text
language sql immutable as $$
  select case when nullif(trim(coalesce(p_search, '')), '') is null then null
    else '%' || replace(replace(replace(trim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%' end
$$;

create or replace function page_limit(p_limit integer) returns integer
language sql immutable as $$ select least(greatest(coalesce(p_limit, 25), 1), 1000) $$;

create or replace function page_offset(p_offset integer) returns integer
language sql immutable as $$ select greatest(coalesce(p_offset, 0), 0) $$;

create or replace function require_reason(p_reason text) returns text
language plpgsql immutable as $$
begin
  if nullif(trim(coalesce(p_reason, '')), '') is null then perform raise_code('reason_required'); end if;
  if length(p_reason) > 2000 then perform raise_code('reason_too_long'); end if;
  return trim(p_reason);
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Dashboard (analytics.view). Money appears only for finance.view, and only as list-price MRR.
-- ---------------------------------------------------------------------------------------------------
-- p_from / p_to are calendar days (UTC), inclusive; by default the last 30 days. Totals ("now") ignore the range.
create or replace function admin_dashboard(p_from date default null, p_to date default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_to date := coalesce(p_to, current_date);
  v_from date := coalesce(p_from, coalesce(p_to, current_date) - 29);
  v_since timestamptz;
  v_until timestamptz;
begin
  perform require_admin_permission('analytics.view');
  if v_from > v_to or v_to - v_from > 730 then perform raise_code('invalid_range'); end if;
  v_since := v_from::timestamptz;
  v_until := (v_to + 1)::timestamptz;
  return jsonb_build_object(
    'from', v_from, 'to', v_to,
    'merchants', (
      select jsonb_build_object('total', coalesce(sum(n), 0), 'by_status', coalesce(jsonb_object_agg(status, n), '{}'::jsonb))
      from (select status::text as status, count(*) as n from merchants group by status) s),
    'new_merchants', (select count(*) from merchants where created_at >= v_since and created_at < v_until),
    'pending_reviews', (select count(*) from merchants where status in ('pending_verification', 'under_review', 'info_required')),
    'branches', (select count(*) from merchant_branches b join merchants m on m.id = b.merchant_id where b.active and m.status = 'active'),
    'active_subscriptions', (select count(*) from subscriptions s join merchants m on m.id = s.merchant_id
                             where s.status = 'active' and m.status = 'active'),
    'customers', jsonb_build_object(
      'total', (select count(*) from customer_profiles where deleted_at is null),
      'new', (select count(*) from customer_profiles where deleted_at is null and created_at >= v_since and created_at < v_until),
      'active', (select count(distinct customer_id) from loyalty_transactions
                 where created_at >= v_since and created_at < v_until and status = 'completed' and type in ('award', 'redeem'))),
    'transactions', (
      select jsonb_build_object('total', count(*),
        'award', count(*) filter (where type = 'award'), 'redeem', count(*) filter (where type = 'redeem'),
        'void', count(*) filter (where type = 'void'), 'adjustment', count(*) filter (where type = 'adjustment'))
      from loyalty_transactions where created_at >= v_since and created_at < v_until),
    'transactions_all_time', (select count(*) from loyalty_transactions),
    'points', (
      select jsonb_build_object(
        'earned', coalesce(sum(points) filter (where entry_type in ('earn', 'bonus')), 0),
        'redeemed', coalesce(-sum(points) filter (where entry_type = 'redeem'), 0))
      from points_ledger where created_at >= v_since and created_at < v_until),
    'liability_points', (select coalesce(sum(balance), 0) from loyalty_accounts),
    'open_fraud_flags', (select count(*) from fraud_flags where status = 'open'),
    'mrr_list_centavos', case when has_admin_permission('finance.view') then (
      select coalesce(sum(p.price_centavos), 0) from subscriptions s
      join plan_limits p on p.plan = s.plan join merchants m on m.id = s.merchant_id
      where s.status = 'active' and m.status = 'active' and s.plan <> 'free') end,
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d::date, 'transactions', coalesce(t.n, 0), 'new_customers', coalesce(c.n, 0),
        'new_merchants', coalesce(m.n, 0), 'points_earned', coalesce(p.earned, 0), 'points_redeemed', coalesce(p.redeemed, 0))
        order by d), '[]'::jsonb)
      from generate_series(v_since, v_until - interval '1 day', interval '1 day') d
      left join (select date_trunc('day', created_at) as day, count(*) as n from loyalty_transactions
                 where created_at >= v_since and created_at < v_until group by 1) t on t.day = d
      left join (select date_trunc('day', created_at) as day, count(*) as n from customer_profiles
                 where created_at >= v_since and created_at < v_until group by 1) c on c.day = d
      left join (select date_trunc('day', created_at) as day, count(*) as n from merchants
                 where created_at >= v_since and created_at < v_until group by 1) m on m.day = d
      left join (select date_trunc('day', created_at) as day,
                        sum(points) filter (where entry_type in ('earn', 'bonus')) as earned,
                        -sum(points) filter (where entry_type = 'redeem') as redeemed
                 from points_ledger where created_at >= v_since and created_at < v_until group by 1) p on p.day = d)
  );
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Merchants (merchants.view / merchants.review / merchants.suspend)
-- ---------------------------------------------------------------------------------------------------

-- p_status: a merchant_status, 'queue' (waiting for a decision, oldest first) or null for all.
create or replace function admin_list_merchants(
  p_status text default null, p_search text default null, p_limit integer default 25, p_offset integer default 0
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_pattern text := search_pattern(p_search);
  v_total bigint;
  v_rows jsonb;
begin
  perform require_admin_permission('merchants.view');
  select count(*) into v_total from merchants m
  where (nullif(p_status, '') is null
         or (p_status = 'queue' and m.status in ('pending_verification', 'under_review', 'info_required'))
         or m.status::text = p_status)
    and (v_pattern is null or m.trade_name ilike v_pattern or m.city ilike v_pattern or m.id::text = trim(p_search));

  select coalesce(jsonb_agg(r.row order by r.rn), '[]'::jsonb) into v_rows from (
    select row_number() over () as rn, jsonb_build_object(
      'id', m.id, 'trade_name', m.trade_name, 'category', m.category, 'city', m.city, 'status', m.status,
      'plan', s.plan, 'founding', coalesce(s.founding, false), 'created_at', m.created_at, 'verified_at', m.verified_at,
      'branches', (select count(*) from merchant_branches b where b.merchant_id = m.id and b.active),
      'transactions_30d', (select count(*) from loyalty_transactions t
                           where t.merchant_id = m.id and t.created_at >= now() - interval '30 days')) as row
    from merchants m left join subscriptions s on s.merchant_id = m.id
    where (nullif(p_status, '') is null
           or (p_status = 'queue' and m.status in ('pending_verification', 'under_review', 'info_required'))
           or m.status::text = p_status)
      and (v_pattern is null or m.trade_name ilike v_pattern or m.city ilike v_pattern or m.id::text = trim(p_search))
    order by case when p_status = 'queue' then m.created_at end asc, m.created_at desc
    limit page_limit(p_limit) offset page_offset(p_offset)
  ) r;
  return jsonb_build_object('total', v_total, 'rows', v_rows);
end $$;

-- Everything an admin needs to decide about one merchant. Contact details (owner email and mobile)
-- go to admins who review merchants or may see personal data.
create or replace function admin_merchant_detail(p_merchant_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_m merchants%rowtype;
  v_contact boolean;
  v_program uuid;
begin
  perform require_admin_permission('merchants.view');
  select * into v_m from merchants where id = p_merchant_id;
  if not found then perform raise_code('merchant_not_found'); end if;
  v_contact := has_admin_permission('merchants.review') or has_admin_permission('users.view_pii');
  select id into v_program from loyalty_programs where merchant_id = p_merchant_id and scope = 'merchant';

  return jsonb_build_object(
    'merchant', jsonb_build_object(
      'id', v_m.id, 'trade_name', v_m.trade_name, 'legal_name', v_m.legal_name, 'category', v_m.category,
      'city', v_m.city, 'address', v_m.address, 'branch_count_declared', v_m.branch_count_declared,
      'owner_mobile', case when v_contact then v_m.owner_mobile end, 'heard_from', v_m.heard_from,
      'status', v_m.status, 'network_participation', v_m.network_participation,
      'terms_accepted_at', v_m.terms_accepted_at, 'marketing_consent_at', v_m.marketing_consent_at,
      'verified_at', v_m.verified_at, 'created_at', v_m.created_at),
    'contact_visible', v_contact,
    'owner', (
      select jsonb_build_object('user_id', s.user_id, 'name', s.display_name,
        'email', case when v_contact then u.email::text else mask_email(u.email::text) end)
      from merchant_staff s left join auth.users u on u.id = s.user_id
      where s.merchant_id = p_merchant_id and s.role = 'owner' order by s.created_at limit 1),
    'subscription', (
      select jsonb_build_object('plan', s.plan, 'status', s.status, 'founding', s.founding,
        'founding_until', s.founding_until, 'period_start', s.period_start, 'period_end', s.period_end,
        'price_centavos', p.price_centavos)
      from subscriptions s join plan_limits p on p.plan = s.plan where s.merchant_id = p_merchant_id),
    'program', (
      select jsonb_build_object('id', g.id, 'name', g.name, 'rule_type', g.rule_type, 'points_per_unit', g.points_per_unit,
        'unit_centavos', g.unit_centavos, 'minimum_spend_centavos', g.minimum_spend_centavos,
        'expiry_months', g.expiry_months, 'active', g.active, 'version', g.version)
      from loyalty_programs g where g.id = v_program),
    'branches', (
      select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'address', b.address, 'city', b.city,
        'active', b.active) order by b.created_at), '[]'::jsonb)
      from merchant_branches b where b.merchant_id = p_merchant_id),
    'staff', (
      select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'name', s.display_name, 'role', s.role, 'active', s.active,
        'has_login', s.user_id is not null) order by s.created_at), '[]'::jsonb)
      from merchant_staff s where s.merchant_id = p_merchant_id),
    'devices', (select count(*) from devices d where d.merchant_id = p_merchant_id and d.revoked_at is null),
    'rewards', (
      select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'points_cost', r.points_cost,
        'active', r.active) order by r.points_cost), '[]'::jsonb)
      from rewards r where r.merchant_id = p_merchant_id),
    'stats', jsonb_build_object(
      'members', (select count(*) from loyalty_accounts a where a.program_id = v_program),
      'transactions_total', (select count(*) from loyalty_transactions t where t.merchant_id = p_merchant_id),
      'transactions_30d', (select count(*) from loyalty_transactions t
                           where t.merchant_id = p_merchant_id and t.created_at >= now() - interval '30 days'),
      'points_issued', (select coalesce(sum(l.points), 0) from points_ledger l join loyalty_accounts a on a.id = l.account_id
                        where a.program_id = v_program and l.entry_type in ('earn', 'bonus')),
      'points_redeemed', (select coalesce(-sum(l.points), 0) from points_ledger l join loyalty_accounts a on a.id = l.account_id
                          where a.program_id = v_program and l.entry_type = 'redeem'),
      'liability_points', (select coalesce(sum(a.balance), 0) from loyalty_accounts a where a.program_id = v_program),
      'open_fraud_flags', (select count(*) from fraud_flags f where f.merchant_id = p_merchant_id and f.status = 'open')),
    'reviews', (
      select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'action', r.action, 'from_status', r.from_status,
        'to_status', r.to_status, 'reason', r.reason, 'actor_kind', r.actor_kind,
        'actor_email', case when r.actor_kind = 'admin' then u.email::text end, 'created_at', r.created_at)
        order by r.created_at desc), '[]'::jsonb)
      from merchant_reviews r left join auth.users u on u.id = r.actor_user_id where r.merchant_id = p_merchant_id)
  );
end $$;

-- One step of the review workflow. Allowed moves:
--   start_review  pending_verification | info_required -> under_review
--   request_info  pending_verification | under_review  -> info_required   (reason = the question for the owner)
--   approve       pending_verification | under_review | info_required -> active (plan and founding optional)
--   reject        pending_verification | under_review | info_required -> rejected
--   reopen        rejected  -> under_review
--   suspend       active    -> suspended   (merchants.suspend)
--   reactivate    suspended -> active      (merchants.suspend)
-- Everything but start_review and approve needs a reason.
create or replace function admin_review_merchant(
  p_merchant_id uuid, p_action text, p_reason text default null, p_plan plan_code default null,
  p_founding boolean default null, p_context jsonb default '{}'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_m merchants%rowtype;
  v_to merchant_status;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_from text;
begin
  if p_action in ('suspend', 'reactivate') then
    perform require_admin_permission('merchants.suspend');
  else
    perform require_admin_permission('merchants.review');
  end if;
  if p_action not in ('start_review', 'approve') then v_reason := require_reason(p_reason); end if;
  if length(v_reason) > 2000 then perform raise_code('reason_too_long'); end if;

  select * into v_m from merchants where id = p_merchant_id for update;
  if not found then perform raise_code('merchant_not_found'); end if;
  v_from := v_m.status::text;

  if p_action = 'start_review' and v_from in ('pending_verification', 'info_required') then v_to := 'under_review';
  elsif p_action = 'request_info' and v_from in ('pending_verification', 'under_review') then v_to := 'info_required';
  elsif p_action = 'approve' and v_from in ('pending_verification', 'under_review', 'info_required') then v_to := 'active';
  elsif p_action = 'reject' and v_from in ('pending_verification', 'under_review', 'info_required') then v_to := 'rejected';
  elsif p_action = 'reopen' and v_from = 'rejected' then v_to := 'under_review';
  elsif p_action = 'suspend' and v_from = 'active' then v_to := 'suspended';
  elsif p_action = 'reactivate' and v_from = 'suspended' then v_to := 'active';
  elsif p_action not in ('start_review', 'request_info', 'approve', 'reject', 'reopen', 'suspend', 'reactivate') then
    perform raise_code('invalid_action');
  else
    perform raise_code('invalid_transition');
  end if;

  if p_action = 'approve' then
    update merchants set status = v_to, verified_at = now(), verified_by = auth.uid() where id = p_merchant_id;
    update subscriptions
       set plan = coalesce(p_plan, plan), founding = coalesce(p_founding, founding),
           founding_until = case when coalesce(p_founding, founding)
                                 then coalesce(founding_until, (current_date + interval '12 months')::date) end
     where merchant_id = p_merchant_id;
    update loyalty_programs set active = true where merchant_id = p_merchant_id and scope = 'merchant';
  else
    update merchants set status = v_to where id = p_merchant_id;
  end if;

  insert into merchant_reviews (merchant_id, action, from_status, to_status, reason, actor_user_id, actor_kind)
  values (p_merchant_id, p_action, v_m.status, v_to, v_reason, auth.uid(), 'admin');
  perform admin_log('merchant.' || p_action, 'merchants', p_merchant_id::text,
    jsonb_build_object('status', v_from),
    jsonb_build_object('status', v_to) || case when p_action = 'approve'
      then jsonb_build_object('plan', coalesce(p_plan::text, (select plan::text from subscriptions where merchant_id = p_merchant_id)),
                              'founding', coalesce(p_founding, false)) else '{}'::jsonb end,
    v_reason, p_context, p_merchant_id);
  return jsonb_build_object('status', v_to);
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Notes (notes.write to add; reading follows the entity's view permission)
-- ---------------------------------------------------------------------------------------------------
create or replace function admin_add_note(p_entity_type text, p_entity_id text, p_body text, p_context jsonb default '{}')
returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
begin
  perform require_admin_permission('notes.write');
  if p_entity_type not in ('merchant', 'user') then perform raise_code('invalid_entity'); end if;
  if nullif(trim(coalesce(p_body, '')), '') is null then perform raise_code('note_required'); end if;
  if length(p_body) > 4000 then perform raise_code('note_too_long'); end if;
  if p_entity_type = 'merchant' and not exists (select 1 from merchants where id::text = p_entity_id) then
    perform raise_code('merchant_not_found');
  end if;
  if p_entity_type = 'user' and not exists (select 1 from auth.users where id::text = p_entity_id) then
    perform raise_code('user_not_found');
  end if;
  insert into admin_notes (entity_type, entity_id, body, author_id) values (p_entity_type, p_entity_id, trim(p_body), auth.uid())
  returning id into v_id;
  perform admin_log('note.added', 'admin_notes', v_id::text, null, jsonb_build_object('entity_type', p_entity_type,
    'entity_id', p_entity_id), null, p_context,
    case when p_entity_type = 'merchant' then p_entity_id::uuid end);
  return v_id;
end $$;

create or replace function admin_list_notes(p_entity_type text, p_entity_id text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if p_entity_type = 'merchant' then perform require_admin_permission('merchants.view');
  elsif p_entity_type = 'user' then perform require_admin_permission('users.view');
  else perform raise_code('invalid_entity');
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'body', n.body, 'author_email', u.email::text,
      'created_at', n.created_at) order by n.created_at desc), '[]'::jsonb)
    from admin_notes n left join auth.users u on u.id = n.author_id
    where n.entity_type = p_entity_type and n.entity_id = p_entity_id);
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Users (users.view; addresses and birthdays need users.view_pii; suspending needs users.suspend)
-- ---------------------------------------------------------------------------------------------------

-- Every signed-in person (not cashier devices) with what they are on the platform. Internal: the list below reads it.
create or replace function admin_user_rows()
returns table (id uuid, name text, email text, member_id text, is_customer boolean, is_staff boolean, is_admin boolean,
               created_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz)
language sql stable security definer set search_path = public as $$
  select u.id,
    coalesce(cp.display_name, (select s.display_name from merchant_staff s where s.user_id = u.id order by s.created_at limit 1),
             a.display_name, u.raw_user_meta_data ->> 'full_name'),
    u.email::text, cp.public_member_id, cp.user_id is not null,
    exists (select 1 from merchant_staff s where s.user_id = u.id),
    coalesce(a.active and a.revoked_at is null, false),
    u.created_at, u.last_sign_in_at, u.banned_until
  from auth.users u
  left join customer_profiles cp on cp.user_id = u.id
  left join admin_members a on a.user_id = u.id
  where not coalesce(u.is_anonymous, false)
$$;

-- p_kind: 'customer', 'merchant_staff', 'admin' or null for everyone. Cashier devices (anonymous) are never listed.
create or replace function admin_list_users(
  p_kind text default null, p_search text default null, p_limit integer default 25, p_offset integer default 0
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_pii boolean;
  v_pattern text := search_pattern(p_search);
  v_total bigint;
  v_rows jsonb;
begin
  perform require_admin_permission('users.view');
  v_pii := has_admin_permission('users.view_pii');


  select count(*) into v_total from admin_user_rows() x
  where (nullif(p_kind, '') is null or (p_kind = 'customer' and x.is_customer) or (p_kind = 'merchant_staff' and x.is_staff)
         or (p_kind = 'admin' and x.is_admin))
    and (v_pattern is null or x.name ilike v_pattern or x.member_id ilike v_pattern or x.id::text = trim(p_search)
         or (v_pii and x.email ilike v_pattern));

  select coalesce(jsonb_agg(r.row order by r.created_at desc), '[]'::jsonb) into v_rows from (
    select x.created_at, jsonb_build_object(
      'id', x.id, 'name', x.name, 'email', case when v_pii then x.email else mask_email(x.email) end,
      'member_id', x.member_id, 'is_customer', x.is_customer, 'is_staff', x.is_staff, 'is_admin', x.is_admin,
      'created_at', x.created_at, 'last_sign_in_at', x.last_sign_in_at,
      'suspended', coalesce(x.banned_until > now(), false)) as row
    from admin_user_rows() x
    where (nullif(p_kind, '') is null or (p_kind = 'customer' and x.is_customer) or (p_kind = 'merchant_staff' and x.is_staff)
           or (p_kind = 'admin' and x.is_admin))
      and (v_pattern is null or x.name ilike v_pattern or x.member_id ilike v_pattern or x.id::text = trim(p_search)
           or (v_pii and x.email ilike v_pattern))
    order by x.created_at desc
    limit page_limit(p_limit) offset page_offset(p_offset)
  ) r;
  return jsonb_build_object('total', v_total, 'rows', v_rows, 'pii', v_pii);
end $$;

create or replace function admin_user_detail(p_user_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_pii boolean;
  v_u auth.users%rowtype;
  v_cp customer_profiles%rowtype;
begin
  perform require_admin_permission('users.view');
  v_pii := has_admin_permission('users.view_pii');
  select * into v_u from auth.users where id = p_user_id and not coalesce(is_anonymous, false);
  if not found then perform raise_code('user_not_found'); end if;
  select * into v_cp from customer_profiles where user_id = p_user_id;

  return jsonb_build_object(
    'pii', v_pii,
    'user', jsonb_build_object('id', v_u.id,
      'email', case when v_pii then v_u.email::text else mask_email(v_u.email::text) end,
      'name', coalesce(v_cp.display_name, v_u.raw_user_meta_data ->> 'full_name'),
      'created_at', v_u.created_at, 'last_sign_in_at', v_u.last_sign_in_at, 'email_confirmed_at', v_u.email_confirmed_at,
      'suspended', coalesce(v_u.banned_until > now(), false)),
    'customer', case when v_cp.user_id is null then null else jsonb_build_object(
      'member_id', v_cp.public_member_id, 'display_name', v_cp.display_name,
      'city', case when v_pii then v_cp.city end,
      'birthday', case when v_pii and v_cp.birthday_month is not null then v_cp.birthday_month || '/' || v_cp.birthday_day end,
      'marketing_consent_at', v_cp.marketing_consent_at, 'deleted_at', v_cp.deleted_at, 'created_at', v_cp.created_at) end,
    'admin_role', (select role from admin_members where user_id = p_user_id and active and revoked_at is null),
    'memberships', (
      select coalesce(jsonb_agg(jsonb_build_object('merchant_id', m.id, 'trade_name', m.trade_name, 'role', s.role,
        'active', s.active) order by s.created_at), '[]'::jsonb)
      from merchant_staff s join merchants m on m.id = s.merchant_id where s.user_id = p_user_id),
    'accounts', (
      select coalesce(jsonb_agg(jsonb_build_object('program', g.name, 'scope', g.scope, 'merchant', m.trade_name,
        'balance', a.balance, 'lifetime_earned', a.lifetime_earned, 'last_activity_at', a.last_activity_at)
        order by a.last_activity_at desc), '[]'::jsonb)
      from loyalty_accounts a join loyalty_programs g on g.id = a.program_id left join merchants m on m.id = g.merchant_id
      where a.customer_id = p_user_id),
    'transactions', (
      select coalesce(jsonb_agg(t.row order by t.created_at desc), '[]'::jsonb) from (
        select x.created_at, jsonb_build_object('id', x.id, 'created_at', x.created_at, 'merchant', m.trade_name,
          'type', x.type, 'status', x.status, 'amount_centavos', x.amount_centavos,
          'points', (select coalesce(sum(l.points), 0) from points_ledger l where l.transaction_id = x.id)) as row
        from loyalty_transactions x join merchants m on m.id = x.merchant_id
        where x.customer_id = p_user_id order by x.created_at desc limit 20) t)
  );
end $$;

-- Suspending bans the account at Supabase Auth (no new sign-ins or token refreshes) and ends its sessions.
-- An access token already issued stays valid until it expires (at most an hour); admins can't be suspended here.
create or replace function admin_set_user_suspended(p_user_id uuid, p_suspended boolean, p_reason text, p_context jsonb default '{}')
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reason text;
  v_before timestamptz;
begin
  perform require_admin_permission('users.suspend');
  v_reason := require_reason(p_reason);
  if p_user_id = auth.uid() then perform raise_code('cannot_change_self'); end if;
  if exists (select 1 from admin_members where user_id = p_user_id and active and revoked_at is null) then
    perform raise_code('cannot_suspend_admin');
  end if;
  select banned_until into v_before from auth.users where id = p_user_id and not coalesce(is_anonymous, false) for update;
  if not found then perform raise_code('user_not_found'); end if;
  if p_suspended = coalesce(v_before > now(), false) then perform raise_code('no_change'); end if;

  update auth.users set banned_until = case when p_suspended then now() + interval '100 years' end where id = p_user_id;
  if p_suspended then delete from auth.sessions where user_id = p_user_id; end if;
  perform admin_log(case when p_suspended then 'user.suspended' else 'user.reactivated' end, 'auth.users', p_user_id::text,
    jsonb_build_object('suspended', coalesce(v_before > now(), false)), jsonb_build_object('suspended', p_suspended),
    v_reason, p_context);
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Transactions (transactions.view; manual corrections need transactions.adjust)
-- ---------------------------------------------------------------------------------------------------
create or replace function admin_list_transactions(
  p_merchant_id uuid default null, p_type text default null, p_status text default null,
  p_from timestamptz default null, p_to timestamptz default null, p_search text default null,
  p_limit integer default 25, p_offset integer default 0
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_pattern text := search_pattern(p_search);
  v_total bigint;
  v_rows jsonb;
begin
  perform require_admin_permission('transactions.view');
  select count(*) into v_total from loyalty_transactions x
  left join customer_profiles cp on cp.user_id = x.customer_id
  where (p_merchant_id is null or x.merchant_id = p_merchant_id)
    and (nullif(p_type, '') is null or x.type::text = p_type)
    and (nullif(p_status, '') is null or x.status::text = p_status)
    and (p_from is null or x.created_at >= p_from) and (p_to is null or x.created_at < p_to)
    and (v_pattern is null or cp.public_member_id ilike v_pattern or x.receipt_no ilike v_pattern or x.id::text = trim(p_search));

  select coalesce(jsonb_agg(r.row order by r.created_at desc), '[]'::jsonb) into v_rows from (
    select x.created_at, jsonb_build_object(
      'id', x.id, 'created_at', x.created_at, 'merchant_id', x.merchant_id, 'merchant', m.trade_name,
      'branch', b.name, 'staff', s.display_name, 'member_id', cp.public_member_id, 'type', x.type, 'status', x.status,
      'amount_centavos', x.amount_centavos, 'receipt_no', x.receipt_no, 'reason', x.reason, 'reverses_id', x.reverses_id,
      'points', (select coalesce(sum(l.points), 0) from points_ledger l where l.transaction_id = x.id)) as row
    from loyalty_transactions x
    join merchants m on m.id = x.merchant_id
    left join merchant_branches b on b.id = x.branch_id
    left join merchant_staff s on s.id = x.staff_id
    left join customer_profiles cp on cp.user_id = x.customer_id
    where (p_merchant_id is null or x.merchant_id = p_merchant_id)
      and (nullif(p_type, '') is null or x.type::text = p_type)
      and (nullif(p_status, '') is null or x.status::text = p_status)
      and (p_from is null or x.created_at >= p_from) and (p_to is null or x.created_at < p_to)
      and (v_pattern is null or cp.public_member_id ilike v_pattern or x.receipt_no ilike v_pattern or x.id::text = trim(p_search))
    order by x.created_at desc
    limit page_limit(p_limit) offset page_offset(p_offset)
  ) r;
  return jsonb_build_object('total', v_total, 'rows', v_rows);
end $$;

-- A manual correction to a customer's points at one merchant: a new `adjustment` transaction and an `adjust`
-- ledger row (nothing is edited). Idempotent on the key; a balance can never go below zero.
create or replace function admin_adjust_points(
  p_member_id text, p_merchant_id uuid, p_points integer, p_reason text, p_idempotency_key text, p_context jsonb default '{}'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_reason text;
  v_customer uuid;
  v_program uuid;
  v_account loyalty_accounts;
  v_tx uuid;
  v_existing loyalty_transactions%rowtype;
  v_balance integer;
begin
  perform require_admin_permission('transactions.adjust');
  v_reason := require_reason(p_reason);
  if p_points is null or p_points = 0 or abs(p_points) > 100000 then perform raise_code('points_invalid'); end if;
  if nullif(trim(coalesce(p_idempotency_key, '')), '') is null then perform raise_code('idempotency_required'); end if;

  select * into v_existing from loyalty_transactions where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then return coalesce(v_existing.result, '{}'::jsonb) || jsonb_build_object('replayed', true); end if;

  select user_id into v_customer from customer_profiles where public_member_id = upper(trim(p_member_id)) and deleted_at is null;
  if v_customer is null then perform raise_code('customer_not_found'); end if;
  select id into v_program from loyalty_programs where merchant_id = p_merchant_id and scope = 'merchant';
  if v_program is null then perform raise_code('merchant_not_found'); end if;

  v_account := lock_account(v_customer, v_program);
  if v_account.balance + p_points < 0 then perform raise_code('insufficient_points'); end if;
  insert into loyalty_transactions (merchant_id, customer_id, type, idempotency_key, reason)
  values (p_merchant_id, v_customer, 'adjustment', p_idempotency_key, v_reason)
  returning id into v_tx;
  v_balance := post_entry(v_account.id, v_tx, 'adjust', p_points);
  update loyalty_transactions
     set result = jsonb_build_object('transaction_id', v_tx, 'points', p_points, 'balance', v_balance)
   where id = v_tx;
  perform admin_log('points.adjusted', 'loyalty_transactions', v_tx::text, jsonb_build_object('balance', v_account.balance),
    jsonb_build_object('balance', v_balance, 'points', p_points, 'member_id', upper(trim(p_member_id))),
    v_reason, p_context, p_merchant_id);
  return jsonb_build_object('transaction_id', v_tx, 'points', p_points, 'balance', v_balance, 'replayed', false);
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Fraud flags (transactions.view to read, merchants.review to decide)
-- ---------------------------------------------------------------------------------------------------
create or replace function admin_list_fraud_flags(p_status text default 'open', p_limit integer default 25, p_offset integer default 0)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform require_admin_permission('transactions.view');
  return jsonb_build_object(
    'total', (select count(*) from fraud_flags where nullif(p_status, '') is null or status = p_status),
    'rows', (select coalesce(jsonb_agg(r.row order by r.created_at desc), '[]'::jsonb) from (
      select f.created_at, jsonb_build_object('id', f.id, 'created_at', f.created_at, 'rule', f.rule, 'details', f.details,
        'status', f.status, 'merchant_id', f.merchant_id, 'merchant', m.trade_name, 'member_id', cp.public_member_id,
        'staff', s.display_name, 'transaction_id', f.transaction_id) as row
      from fraud_flags f
      left join merchants m on m.id = f.merchant_id
      left join customer_profiles cp on cp.user_id = f.customer_id
      left join merchant_staff s on s.id = f.staff_id
      where nullif(p_status, '') is null or f.status = p_status
      order by f.created_at desc limit page_limit(p_limit) offset page_offset(p_offset)) r));
end $$;

create or replace function admin_resolve_fraud_flag(p_flag_id uuid, p_status text, p_reason text, p_context jsonb default '{}')
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reason text;
  v_flag fraud_flags%rowtype;
begin
  perform require_admin_permission('merchants.review');
  v_reason := require_reason(p_reason);
  if p_status not in ('dismissed', 'confirmed') then perform raise_code('invalid_status'); end if;
  select * into v_flag from fraud_flags where id = p_flag_id for update;
  if not found then perform raise_code('not_found'); end if;
  if v_flag.status <> 'open' then perform raise_code('already_resolved'); end if;
  update fraud_flags set status = p_status where id = p_flag_id;
  perform admin_log('fraud_flag.' || p_status, 'fraud_flags', p_flag_id::text, jsonb_build_object('status', 'open'),
    jsonb_build_object('status', p_status), v_reason, p_context, v_flag.merchant_id);
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Finance and subscriptions. No payment provider exists, so the only money figure is list-price MRR,
-- labelled as such; collected revenue is not shown anywhere (docs/ADMIN_PORTAL_ARCHITECTURE.md section 6).
-- ---------------------------------------------------------------------------------------------------
create or replace function admin_finance() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform require_admin_permission('finance.view');
  return jsonb_build_object(
    'plans', (
      select coalesce(jsonb_agg(jsonb_build_object('plan', p.plan, 'price_centavos', p.price_centavos,
        'active_merchants', (select count(*) from subscriptions s join merchants m on m.id = s.merchant_id
                             where s.plan = p.plan and s.status = 'active' and m.status = 'active'),
        'founding', (select count(*) from subscriptions s join merchants m on m.id = s.merchant_id
                     where s.plan = p.plan and s.founding and s.status = 'active' and m.status = 'active'),
        'all_merchants', (select count(*) from subscriptions s where s.plan = p.plan)) order by p.price_centavos), '[]'::jsonb)
      from plan_limits p),
    'mrr_list_centavos', (
      select coalesce(sum(p.price_centavos), 0) from subscriptions s join plan_limits p on p.plan = s.plan
      join merchants m on m.id = s.merchant_id where s.status = 'active' and m.status = 'active' and s.plan <> 'free'),
    'paying_merchants', (
      select count(*) from subscriptions s join merchants m on m.id = s.merchant_id
      where s.status = 'active' and m.status = 'active' and s.plan <> 'free'),
    'subscription_statuses', (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select status, count(*) as n from subscriptions group by status) x),
    'liability_points', jsonb_build_object(
      'merchant', (select coalesce(sum(a.balance), 0) from loyalty_accounts a join loyalty_programs g on g.id = a.program_id
                   where g.scope = 'merchant'),
      'network', (select coalesce(sum(a.balance), 0) from loyalty_accounts a join loyalty_programs g on g.id = a.program_id
                  where g.scope = 'network')),
    'settlement_records', (select count(*) from settlement_records)
  );
end $$;

create or replace function admin_list_subscriptions(
  p_plan text default null, p_search text default null, p_limit integer default 25, p_offset integer default 0
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_pattern text := search_pattern(p_search);
begin
  perform require_admin_permission('subscriptions.view');
  return jsonb_build_object(
    'total', (select count(*) from subscriptions s join merchants m on m.id = s.merchant_id
              where (nullif(p_plan, '') is null or s.plan::text = p_plan) and (v_pattern is null or m.trade_name ilike v_pattern)),
    'rows', (select coalesce(jsonb_agg(r.row order by r.trade_name), '[]'::jsonb) from (
      select m.trade_name, jsonb_build_object('merchant_id', m.id, 'trade_name', m.trade_name, 'merchant_status', m.status,
        'plan', s.plan, 'status', s.status, 'founding', s.founding, 'founding_until', s.founding_until,
        'period_start', s.period_start, 'period_end', s.period_end, 'price_centavos', p.price_centavos,
        'updated_at', s.updated_at) as row
      from subscriptions s join merchants m on m.id = s.merchant_id join plan_limits p on p.plan = s.plan
      where (nullif(p_plan, '') is null or s.plan::text = p_plan) and (v_pattern is null or m.trade_name ilike v_pattern)
      order by m.trade_name limit page_limit(p_limit) offset page_offset(p_offset)) r));
end $$;

create or replace function admin_update_subscription(
  p_merchant_id uuid, p_plan plan_code, p_status text, p_founding boolean, p_reason text, p_context jsonb default '{}'
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reason text;
  v_s subscriptions%rowtype;
begin
  perform require_admin_permission('subscriptions.manage');
  v_reason := require_reason(p_reason);
  if p_status not in ('active', 'paused', 'cancelled') then perform raise_code('invalid_status'); end if;
  select * into v_s from subscriptions where merchant_id = p_merchant_id for update;
  if not found then perform raise_code('merchant_not_found'); end if;
  if (v_s.plan, v_s.status, v_s.founding) = (p_plan, p_status, p_founding) then perform raise_code('no_change'); end if;
  update subscriptions
     set plan = p_plan, status = p_status, founding = p_founding,
         founding_until = case when p_founding then coalesce(founding_until, (current_date + interval '12 months')::date) end
   where merchant_id = p_merchant_id;
  perform admin_log('subscription.updated', 'subscriptions', p_merchant_id::text,
    jsonb_build_object('plan', v_s.plan, 'status', v_s.status, 'founding', v_s.founding),
    jsonb_build_object('plan', p_plan, 'status', p_status, 'founding', p_founding), v_reason, p_context, p_merchant_id);
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Analytics (analytics.view). "Active" means at least one completed award or redemption (app opens are
-- not tracked). Retention = active this period and the one before / active the one before.
-- ---------------------------------------------------------------------------------------------------
create or replace function admin_analytics(p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 30), 7), 365);
  v_since timestamptz;
  v_prev timestamptz;
  v_active_now bigint;
  v_active_prev bigint;
  v_retained bigint;
begin
  perform require_admin_permission('analytics.view');
  v_since := date_trunc('day', now()) - (v_days - 1) * interval '1 day';
  v_prev := v_since - v_days * interval '1 day';

  select count(distinct customer_id) into v_active_now from loyalty_transactions
  where created_at >= v_since and status = 'completed' and type in ('award', 'redeem');
  select count(distinct customer_id) into v_active_prev from loyalty_transactions
  where created_at >= v_prev and created_at < v_since and status = 'completed' and type in ('award', 'redeem');
  select count(*) into v_retained from (
    select customer_id from loyalty_transactions
    where created_at >= v_prev and created_at < v_since and status = 'completed' and type in ('award', 'redeem')
    intersect
    select customer_id from loyalty_transactions
    where created_at >= v_since and status = 'completed' and type in ('award', 'redeem')) x;

  return jsonb_build_object(
    'days', v_days, 'since', v_since,
    'active_customers', v_active_now, 'active_customers_previous', v_active_prev,
    'customer_retention', case when v_active_prev > 0 then round(v_retained::numeric / v_active_prev, 4) end,
    'transacting_merchants', (select count(distinct merchant_id) from loyalty_transactions
                              where created_at >= v_since and status = 'completed'),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date,
        'active_customers', coalesce(t.active, 0), 'transactions', coalesce(t.n, 0),
        'new_customers', coalesce(c.n, 0), 'new_merchants', coalesce(m.n, 0),
        'points_earned', coalesce(p.earned, 0), 'points_redeemed', coalesce(p.redeemed, 0)) order by d), '[]'::jsonb)
      from generate_series(v_since, date_trunc('day', now()), interval '1 day') d
      left join (select date_trunc('day', created_at) as day, count(*) as n,
                        count(distinct customer_id) filter (where status = 'completed' and type in ('award', 'redeem')) as active
                 from loyalty_transactions where created_at >= v_since group by 1) t on t.day = d
      left join (select date_trunc('day', created_at) as day, count(*) as n from customer_profiles
                 where created_at >= v_since group by 1) c on c.day = d
      left join (select date_trunc('day', created_at) as day, count(*) as n from merchants
                 where created_at >= v_since group by 1) m on m.day = d
      left join (select date_trunc('day', created_at) as day,
                        sum(points) filter (where entry_type in ('earn', 'bonus')) as earned,
                        -sum(points) filter (where entry_type = 'redeem') as redeemed
                 from points_ledger where created_at >= v_since group by 1) p on p.day = d),
    'by_category', (
      select coalesce(jsonb_agg(jsonb_build_object('category', category, 'merchants', n) order by n desc), '[]'::jsonb)
      from (select category::text as category, count(*) as n from merchants where status = 'active' group by category) x),
    'top_merchants', (
      select coalesce(jsonb_agg(jsonb_build_object('merchant_id', x.merchant_id, 'trade_name', m.trade_name,
        'transactions', x.n, 'customers', x.customers) order by x.n desc), '[]'::jsonb)
      from (select merchant_id, count(*) as n, count(distinct customer_id) as customers from loyalty_transactions
            where created_at >= v_since and status = 'completed' group by merchant_id order by count(*) desc limit 10) x
      join merchants m on m.id = x.merchant_id)
  );
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Alerts for the top bar (notifications.view): what needs an admin's attention now.
-- ---------------------------------------------------------------------------------------------------
create or replace function admin_alerts() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform require_admin_permission('notifications.view');
  return jsonb_build_object(
    'new_applications', (select count(*) from merchants where status = 'pending_verification'),
    'oldest_application_at', (select min(created_at) from merchants where status = 'pending_verification'),
    'awaiting_review', (select count(*) from merchants where status = 'under_review'),
    'answers_received', (
      select count(*) from merchants m where m.status = 'under_review' and (
        select r.action from merchant_reviews r where r.merchant_id = m.id order by r.created_at desc, r.id desc limit 1
      ) = 'info_provided'),
    'waiting_on_merchant', (select count(*) from merchants where status = 'info_required'),
    'open_fraud_flags', (select count(*) from fraud_flags where status = 'open'),
    'ledger_mismatches', (select count(*) from check_ledger())
  );
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Platform settings (settings.manage). Only known keys, each with its own bounds.
-- ---------------------------------------------------------------------------------------------------
create or replace function admin_settings() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform require_admin_permission('settings.manage');
  return (select coalesce(jsonb_agg(jsonb_build_object('key', key, 'value', value, 'updated_at', updated_at) order by key), '[]'::jsonb)
          from platform_settings);
end $$;

create or replace function admin_set_setting(p_key text, p_value jsonb, p_reason text, p_context jsonb default '{}')
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reason text;
  v_before jsonb;
  v_int integer;
begin
  perform require_admin_permission('settings.manage');
  v_reason := require_reason(p_reason);
  if p_key = 'network_enabled' then
    if jsonb_typeof(p_value) <> 'boolean' then perform raise_code('invalid_value'); end if;
  elsif p_key in ('void_window_hours', 'manager_void_window_days', 'redemption_token_minutes', 'network_hold_days', 'web_code_minutes') then
    if jsonb_typeof(p_value) <> 'number' then perform raise_code('invalid_value'); end if;
    v_int := (p_value #>> '{}')::numeric::integer;
    if (p_value #>> '{}')::numeric <> v_int
       or (p_key = 'void_window_hours' and v_int not between 1 and 72)
       or (p_key = 'manager_void_window_days' and v_int not between 1 and 90)
       or (p_key = 'redemption_token_minutes' and v_int not between 1 and 30)
       or (p_key = 'network_hold_days' and v_int not between 0 and 30)
       or (p_key = 'web_code_minutes' and v_int not between 1 and 30) then
      perform raise_code('invalid_value');
    end if;
  else
    perform raise_code('unknown_setting');
  end if;
  select value into v_before from platform_settings where key = p_key for update;
  if v_before = p_value then perform raise_code('no_change'); end if;
  insert into platform_settings (key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  perform admin_log('setting.changed', 'platform_settings', p_key, jsonb_build_object('value', v_before),
    jsonb_build_object('value', p_value), v_reason, p_context);
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Adding an administrator by the email of an existing, non-anonymous account (admins.manage). The account
-- signs in at the admin portal and must enrol a second factor before it can do anything.
-- ---------------------------------------------------------------------------------------------------
create or replace function admin_grant_by_email(p_email text, p_role admin_role, p_reason text, p_context jsonb default '{}')
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
begin
  perform require_admin_permission('admins.manage');
  select id into v_user from auth.users
  where lower(email) = lower(trim(p_email)) and not coalesce(is_anonymous, false);
  if v_user is null then perform raise_code('user_not_found'); end if;
  perform admin_grant(v_user, p_role, p_reason, p_context);
  return v_user;
end $$;

-- An export of data leaves the portal, so it is audited too (reports.export or finance.export).
create or replace function admin_record_export(p_what text, p_rows integer, p_context jsonb default '{}')
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (has_admin_permission('reports.export') or has_admin_permission('finance.export')) then
    perform raise_code('forbidden');
  end if;
  if p_what not in ('merchants', 'transactions', 'subscriptions', 'users') then perform raise_code('invalid_export'); end if;
  perform admin_log('export.' || p_what, null, null, null, jsonb_build_object('rows', p_rows), null, p_context);
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Grants: clients reach these only as signed-in users; each function checks its own permission.
-- ---------------------------------------------------------------------------------------------------
revoke execute on function admin_user_rows(), mask_email(text), search_pattern(text), page_limit(integer), page_offset(integer),
  require_reason(text) from public, anon, authenticated;
revoke execute on function admin_dashboard(date, date), admin_list_merchants(text, text, integer, integer), admin_merchant_detail(uuid),
  admin_review_merchant(uuid, text, text, plan_code, boolean, jsonb), admin_add_note(text, text, text, jsonb),
  admin_list_notes(text, text), admin_list_users(text, text, integer, integer), admin_user_detail(uuid),
  admin_set_user_suspended(uuid, boolean, text, jsonb),
  admin_list_transactions(uuid, text, text, timestamptz, timestamptz, text, integer, integer),
  admin_adjust_points(text, uuid, integer, text, text, jsonb), admin_list_fraud_flags(text, integer, integer),
  admin_resolve_fraud_flag(uuid, text, text, jsonb), admin_finance(), admin_list_subscriptions(text, text, integer, integer),
  admin_update_subscription(uuid, plan_code, text, boolean, text, jsonb), admin_analytics(integer), admin_alerts(),
  admin_settings(), admin_set_setting(text, jsonb, text, jsonb), admin_grant_by_email(text, admin_role, text, jsonb),
  admin_record_export(text, integer, jsonb)
  from public, anon;
grant execute on function admin_dashboard(date, date), admin_list_merchants(text, text, integer, integer), admin_merchant_detail(uuid),
  admin_review_merchant(uuid, text, text, plan_code, boolean, jsonb), admin_add_note(text, text, text, jsonb),
  admin_list_notes(text, text), admin_list_users(text, text, integer, integer), admin_user_detail(uuid),
  admin_set_user_suspended(uuid, boolean, text, jsonb),
  admin_list_transactions(uuid, text, text, timestamptz, timestamptz, text, integer, integer),
  admin_adjust_points(text, uuid, integer, text, text, jsonb), admin_list_fraud_flags(text, integer, integer),
  admin_resolve_fraud_flag(uuid, text, text, jsonb), admin_finance(), admin_list_subscriptions(text, text, integer, integer),
  admin_update_subscription(uuid, plan_code, text, boolean, text, jsonb), admin_analytics(integer), admin_alerts(),
  admin_settings(), admin_set_setting(text, jsonb, text, jsonb), admin_grant_by_email(text, admin_role, text, jsonb),
  admin_record_export(text, integer, jsonb)
  to authenticated;
