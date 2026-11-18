-- The merchant dashboard on the web (app.ugnaya.com/merchant): figures, members, transactions, staff and the
-- reply to an "information requested" review. Owners and managers only; each function checks the caller's
-- role at that merchant inside the database. Branches, rewards, the program and the business profile are edited
-- through the existing row-level policies. Safe to run twice. Postgres 14 syntax only.

create or replace function require_merchant_manager(p_merchant_id uuid) returns staff_role
language plpgsql stable security definer set search_path = public as $$
declare
  v_role staff_role := staff_role(p_merchant_id);
begin
  if v_role is null or v_role not in ('owner', 'manager') then perform raise_code('forbidden'); end if;
  return v_role;
end $$;

-- The branches a manager is limited to (a branch manager), or null for the owner and business-wide managers.
create or replace function my_branch_scope(p_merchant_id uuid) returns uuid[]
language sql stable security definer set search_path = public as $$
  select case when role = 'owner' then null else branch_ids end
  from merchant_staff where merchant_id = p_merchant_id and user_id = auth.uid() and active limit 1
$$;

-- Figures for the last p_days days (7 to 365) plus what the plan allows.
create or replace function merchant_dashboard(p_merchant_id uuid, p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 30), 7), 365);
  v_since timestamptz;
  v_program uuid;
  v_plan plan_code;
  v_scope uuid[] := my_branch_scope(p_merchant_id);
begin
  perform require_merchant_manager(p_merchant_id);
  v_since := date_trunc('day', now()) - (v_days - 1) * interval '1 day';
  select id into v_program from loyalty_programs where merchant_id = p_merchant_id and scope = 'merchant';
  select plan into v_plan from subscriptions where merchant_id = p_merchant_id;

  return jsonb_build_object(
    'days', v_days, 'since', v_since,
    'rewards_claimed', (select count(*) from reward_redemptions rr join rewards r on r.id = rr.reward_id
                        where r.merchant_id = p_merchant_id and rr.status = 'used' and rr.used_at >= v_since),
    'members', (select count(*) from loyalty_accounts where program_id = v_program),
    'new_members', (select count(*) from loyalty_accounts where program_id = v_program and created_at >= v_since),
    'active_members', (select count(distinct customer_id) from loyalty_transactions
                       where merchant_id = p_merchant_id and created_at >= v_since and status = 'completed'
                         and (v_scope is null or branch_id = any (v_scope))
                         and type in ('award', 'redeem')),
    'transactions', (
      select jsonb_build_object('award', count(*) filter (where type = 'award'), 'redeem', count(*) filter (where type = 'redeem'),
        'void', count(*) filter (where type = 'void'),
        'sales_centavos', coalesce(sum(amount_centavos) filter (where type = 'award' and status = 'completed'), 0))
      from loyalty_transactions where merchant_id = p_merchant_id and created_at >= v_since
        and (v_scope is null or branch_id = any (v_scope))),
    'points', (
      select jsonb_build_object(
        'issued', coalesce(sum(l.points) filter (where l.entry_type in ('earn', 'bonus')), 0),
        'redeemed', coalesce(-sum(l.points) filter (where l.entry_type = 'redeem'), 0))
      from points_ledger l join loyalty_accounts a on a.id = l.account_id
      where a.program_id = v_program and l.created_at >= v_since
        and (v_scope is null or l.transaction_id in (select t.id from loyalty_transactions t
             where t.merchant_id = p_merchant_id and t.branch_id = any (v_scope)))),
    'outstanding_points', (select coalesce(sum(balance), 0) from loyalty_accounts where program_id = v_program),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'awards', coalesce(t.awards, 0),
        'redemptions', coalesce(t.redemptions, 0)) order by d), '[]'::jsonb)
      from generate_series(v_since, date_trunc('day', now()), interval '1 day') d
      left join (select date_trunc('day', created_at) as day,
                        count(*) filter (where type = 'award' and status = 'completed') as awards,
                        count(*) filter (where type = 'redeem' and status = 'completed') as redemptions
                 from loyalty_transactions where merchant_id = p_merchant_id and created_at >= v_since
                   and (v_scope is null or branch_id = any (v_scope)) group by 1) t on t.day = d),
    'branches', (
      select coalesce(jsonb_agg(jsonb_build_object('branch_id', b.id, 'name', b.name, 'active', b.active,
        'awards', (select count(*) from loyalty_transactions t where t.branch_id = b.id and t.created_at >= v_since
                   and t.type = 'award' and t.status = 'completed'),
        'redemptions', (select count(*) from loyalty_transactions t where t.branch_id = b.id and t.created_at >= v_since
                        and t.type = 'redeem' and t.status = 'completed'),
        'sales_centavos', (select coalesce(sum(t.amount_centavos), 0) from loyalty_transactions t where t.branch_id = b.id
                           and t.created_at >= v_since and t.type = 'award' and t.status = 'completed'),
        'customers', (select count(distinct t.customer_id) from loyalty_transactions t where t.branch_id = b.id
                      and t.created_at >= v_since and t.status = 'completed')) order by b.created_at), '[]'::jsonb)
      from merchant_branches b where b.merchant_id = p_merchant_id and (v_scope is null or b.id = any (v_scope))),
    'campaigns', (
      select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'status', c.status,
        'starts_at', c.starts_at, 'ends_at', c.ends_at,
        'transactions_during', (select count(*) from loyalty_transactions t where t.merchant_id = p_merchant_id
          and t.type = 'award' and t.status = 'completed' and c.starts_at is not null
          and t.created_at >= c.starts_at and t.created_at < coalesce(least(c.ends_at, now()), now())),
        'transactions_before', (select count(*) from loyalty_transactions t where t.merchant_id = p_merchant_id
          and t.type = 'award' and t.status = 'completed' and c.starts_at is not null
          and t.created_at >= c.starts_at - (coalesce(least(c.ends_at, now()), now()) - c.starts_at)
          and t.created_at < c.starts_at)) order by c.starts_at desc nulls last), '[]'::jsonb)
      from campaigns c where c.merchant_id = p_merchant_id and c.status in ('running', 'ended', 'scheduled')),
    'top_rewards', (
      select coalesce(jsonb_agg(jsonb_build_object('reward_id', r.id, 'name', r.name, 'redemptions', x.n) order by x.n desc), '[]'::jsonb)
      from (select reward_id, count(*) as n from reward_redemptions
            where status = 'used' and used_at >= v_since group by reward_id) x
      join rewards r on r.id = x.reward_id where r.merchant_id = p_merchant_id),
    'usage', jsonb_build_object(
      'plan', v_plan,
      'branches', (select count(*) from merchant_branches where merchant_id = p_merchant_id and active),
      'staff', (select count(*) from merchant_staff where merchant_id = p_merchant_id and active),
      'rewards', (select count(*) from rewards where merchant_id = p_merchant_id and active),
      'transactions_this_month', (select count(*) from loyalty_transactions
                                  where merchant_id = p_merchant_id and created_at >= date_trunc('month', now())),
      'limits', (select jsonb_build_object('branches', branches, 'staff', staff, 'rewards', rewards,
                   'transactions_per_month', transactions_per_month) from plan_limits where plan = v_plan))
  );
end $$;

-- The merchant's members: name and member id only (no contact details), with their points here.
create or replace function merchant_customers(
  p_merchant_id uuid, p_search text default null, p_limit integer default 25, p_offset integer default 0
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_program uuid;
  v_pattern text := search_pattern(p_search);
begin
  perform require_merchant_manager(p_merchant_id);
  select id into v_program from loyalty_programs where merchant_id = p_merchant_id and scope = 'merchant';
  return jsonb_build_object(
    'total', (select count(*) from loyalty_accounts a join customer_profiles cp on cp.user_id = a.customer_id
              where a.program_id = v_program
                and (v_pattern is null or cp.display_name ilike v_pattern or cp.public_member_id ilike v_pattern)),
    'rows', (select coalesce(jsonb_agg(r.row order by r.last_activity_at desc), '[]'::jsonb) from (
      select a.last_activity_at, jsonb_build_object('member_id', cp.public_member_id,
        'name', case when cp.deleted_at is null then cp.display_name end,
        'balance', a.balance, 'lifetime_earned', a.lifetime_earned, 'joined_at', a.created_at,
        'last_activity_at', a.last_activity_at,
        'visits', (select count(*) from loyalty_transactions t where t.merchant_id = p_merchant_id
                   and t.customer_id = a.customer_id and t.type = 'award' and t.status = 'completed')) as row
      from loyalty_accounts a join customer_profiles cp on cp.user_id = a.customer_id
      where a.program_id = v_program
        and (v_pattern is null or cp.display_name ilike v_pattern or cp.public_member_id ilike v_pattern)
      order by a.last_activity_at desc limit page_limit(p_limit) offset page_offset(p_offset)) r));
end $$;

create or replace function merchant_transactions(
  p_merchant_id uuid, p_type text default null, p_branch_id uuid default null, p_limit integer default 25, p_offset integer default 0
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_scope uuid[] := my_branch_scope(p_merchant_id);
begin
  perform require_merchant_manager(p_merchant_id);
  return jsonb_build_object(
    'total', (select count(*) from loyalty_transactions x where x.merchant_id = p_merchant_id
              and (nullif(p_type, '') is null or x.type::text = p_type) and (p_branch_id is null or x.branch_id = p_branch_id)
              and (v_scope is null or x.branch_id = any (v_scope))),
    'rows', (select coalesce(jsonb_agg(r.row order by r.created_at desc), '[]'::jsonb) from (
      select x.created_at, jsonb_build_object('id', x.id, 'created_at', x.created_at, 'type', x.type, 'status', x.status,
        'amount_centavos', x.amount_centavos, 'receipt_no', x.receipt_no, 'reason', x.reason,
        'branch', b.name, 'staff', s.display_name, 'member_id', cp.public_member_id,
        'points', (select coalesce(sum(l.points), 0) from points_ledger l join loyalty_accounts a on a.id = l.account_id
                   join loyalty_programs g on g.id = a.program_id
                   where l.transaction_id = x.id and g.merchant_id = p_merchant_id)) as row
      from loyalty_transactions x
      left join merchant_branches b on b.id = x.branch_id
      left join merchant_staff s on s.id = x.staff_id
      left join customer_profiles cp on cp.user_id = x.customer_id
      where x.merchant_id = p_merchant_id
        and (nullif(p_type, '') is null or x.type::text = p_type) and (p_branch_id is null or x.branch_id = p_branch_id)
              and (v_scope is null or x.branch_id = any (v_scope))
      order by x.created_at desc limit page_limit(p_limit) offset page_offset(p_offset)) r));
end $$;

-- Adds a staff member. A manager needs a UGNAYA login (the email of an existing account); a cashier needs a PIN
-- (4 to 6 digits, unique at this merchant) and may also have a login. Owners add managers and cashiers; managers
-- add cashiers. Nobody adds a second owner.
create or replace function merchant_add_staff(
  p_merchant_id uuid, p_display_name text, p_role staff_role, p_email text default null,
  p_branch_ids uuid[] default null, p_pin text default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_caller staff_role;
  v_user uuid;
  v_id uuid;
begin
  v_caller := require_merchant_manager(p_merchant_id);
  if p_role = 'owner' or (v_caller = 'manager' and p_role <> 'cashier') then perform raise_code('forbidden'); end if;
  if nullif(trim(coalesce(p_display_name, '')), '') is null or length(trim(p_display_name)) > 80 then
    perform raise_code('name_invalid');
  end if;
  if nullif(trim(coalesce(p_email, '')), '') is not null then
    select id into v_user from auth.users where lower(email) = lower(trim(p_email)) and not coalesce(is_anonymous, false);
    if v_user is null then perform raise_code('user_not_found'); end if;
    if exists (select 1 from merchant_staff where merchant_id = p_merchant_id and user_id = v_user) then
      perform raise_code('already_staff');
    end if;
  end if;
  if p_role = 'manager' and v_user is null then perform raise_code('login_required'); end if;
  if p_role = 'cashier' and nullif(p_pin, '') is null then perform raise_code('pin_required'); end if;
  if nullif(p_pin, '') is not null and p_pin !~ '^[0-9]{4,6}$' then perform raise_code('pin_invalid'); end if;
  if p_branch_ids is not null and exists (
    select 1 from unnest(p_branch_ids) b where not exists (
      select 1 from merchant_branches mb where mb.id = b and mb.merchant_id = p_merchant_id)) then
    perform raise_code('branch_invalid');
  end if;
  if nullif(p_pin, '') is not null and exists (
    select 1 from merchant_staff where merchant_id = p_merchant_id and active and pin_hash is not null
      and pin_hash = crypt(p_pin, pin_hash)) then
    perform raise_code('pin_taken');
  end if;

  insert into merchant_staff (merchant_id, user_id, display_name, role, branch_ids, pin_hash)
  values (p_merchant_id, v_user, trim(p_display_name), p_role, nullif(p_branch_ids, '{}'),
          case when nullif(p_pin, '') is not null then crypt(p_pin, gen_salt('bf')) end)
  returning id into v_id;
  perform log_audit('staff.added', p_merchant_id, 'merchant_staff', v_id::text, null,
    jsonb_build_object('name', trim(p_display_name), 'role', p_role, 'has_login', v_user is not null));
  return v_id;
end $$;

-- Changes a staff member's name, role, branches or whether they're active. Same rules as adding; nobody changes
-- their own role or deactivates themselves, and the owner row's role never changes here.
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
  if v_s.user_id = auth.uid() and (p_role <> v_s.role or not p_active) then perform raise_code('cannot_change_self'); end if;
  if p_role = 'manager' and v_s.user_id is null then perform raise_code('login_required'); end if;
  if nullif(trim(coalesce(p_display_name, '')), '') is null or length(trim(p_display_name)) > 80 then
    perform raise_code('name_invalid');
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

-- The owner or a manager answers UGNAYA's question: the application goes back to "under review".
create or replace function merchant_respond_review(p_merchant_id uuid, p_message text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_status merchant_status;
begin
  perform require_merchant_manager(p_merchant_id);
  if nullif(trim(coalesce(p_message, '')), '') is null then perform raise_code('message_required'); end if;
  if length(p_message) > 2000 then perform raise_code('message_too_long'); end if;
  select status into v_status from merchants where id = p_merchant_id for update;
  if v_status::text <> 'info_required' then perform raise_code('invalid_transition'); end if;
  update merchants set status = 'under_review' where id = p_merchant_id;
  insert into merchant_reviews (merchant_id, action, from_status, to_status, reason, actor_user_id, actor_kind)
  values (p_merchant_id, 'info_provided', v_status, 'under_review', trim(p_message), auth.uid(), 'merchant');
  perform log_audit('merchant.info_provided', p_merchant_id, 'merchants', p_merchant_id::text,
    jsonb_build_object('status', v_status), jsonb_build_object('status', 'under_review'), trim(p_message));
end $$;

revoke execute on function require_merchant_manager(uuid), my_branch_scope(uuid) from public, anon, authenticated;
revoke execute on function merchant_dashboard(uuid, integer), merchant_customers(uuid, text, integer, integer),
  merchant_transactions(uuid, text, uuid, integer, integer),
  merchant_add_staff(uuid, text, staff_role, text, uuid[], text),
  merchant_update_staff(uuid, text, staff_role, uuid[], boolean), merchant_respond_review(uuid, text) from public, anon;
grant execute on function merchant_dashboard(uuid, integer), merchant_customers(uuid, text, integer, integer),
  merchant_transactions(uuid, text, uuid, integer, integer),
  merchant_add_staff(uuid, text, staff_role, text, uuid[], text),
  merchant_update_staff(uuid, text, staff_role, uuid[], boolean), merchant_respond_review(uuid, text) to authenticated;
