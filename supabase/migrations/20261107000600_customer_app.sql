-- The customer app (iOS first) and the merchant portal's web counter: wallet, activity, discovery, favourites,
-- in-app and push notifications, notification preferences, account deletion, and awarding / redeeming from the
-- portal with the signed-in staff member's own session. Safe to run twice. Postgres 14 syntax only.

-- ---------------------------------------------------------------------------------------------------
-- Preferences, favourites, push tokens
-- ---------------------------------------------------------------------------------------------------
alter table customer_profiles add column if not exists notify_points boolean not null default true;
alter table customer_profiles add column if not exists notify_offers boolean not null default true;
alter table customer_profiles add column if not exists notify_expiry boolean not null default true;
alter table customer_profiles add column if not exists onboarded_at timestamptz;
grant update (display_name, birthday_month, birthday_day, city, terms_accepted_at, marketing_consent_at,
              notify_points, notify_offers, notify_expiry, onboarded_at) on customer_profiles to authenticated;

create table if not exists customer_favorites (
  customer_id uuid not null references customer_profiles (user_id) on delete cascade,
  merchant_id uuid not null references merchants (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, merchant_id)
);
alter table customer_favorites enable row level security;
revoke all on customer_favorites from anon, authenticated;
grant select, insert, delete on customer_favorites to authenticated;
drop policy if exists "ugnaya: favorites own" on customer_favorites;
create policy "ugnaya: favorites own" on customer_favorites for all to authenticated
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- Expo push tokens, one row per phone.
create table if not exists push_tokens (
  token text primary key check (length(token) between 10 and 300),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists push_tokens_user on push_tokens (user_id);
alter table push_tokens enable row level security;
revoke all on push_tokens from anon, authenticated;
grant select, delete on push_tokens to authenticated;
drop policy if exists "ugnaya: push_tokens own" on push_tokens;
create policy "ugnaya: push_tokens own" on push_tokens for all to authenticated using (user_id = auth.uid());

-- Registers this phone's token for the signed-in person (a token moves with whoever signed in last).
create or replace function register_push_token(p_token text, p_platform text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then perform raise_code('sign_in_required'); end if;
  if p_platform not in ('ios', 'android') or p_token !~ '^(Exponent|Expo)PushToken\[[A-Za-z0-9_-]{10,200}\]$' then
    perform raise_code('token_invalid');
  end if;
  insert into push_tokens (token, user_id, platform) values (p_token, auth.uid(), p_platform)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, last_seen_at = now();
end $$;

-- ---------------------------------------------------------------------------------------------------
-- In-app notifications. The table already exists (channel push/sms/email); it gains in-app content and a
-- read flag. A row is written for the customer when points move; the push-dispatch Edge Function sends the
-- push copy (a database webhook on insert) when the customer allows that kind.
-- ---------------------------------------------------------------------------------------------------
alter table notifications drop constraint if exists notifications_channel_check;
alter table notifications add constraint notifications_channel_check check (channel in ('push', 'sms', 'email', 'in_app'));
alter table notifications add column if not exists kind text;
alter table notifications add column if not exists title text check (length(title) <= 120);
alter table notifications add column if not exists body text check (length(body) <= 500);
alter table notifications add column if not exists data jsonb;
alter table notifications add column if not exists read_at timestamptz;
alter table notifications add column if not exists pushed_at timestamptz;
grant update (read_at) on notifications to authenticated;
drop policy if exists "ugnaya: notifications own update" on notifications;
create policy "ugnaya: notifications own update" on notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create or replace function notify_customer(p_customer uuid, p_kind text, p_title text, p_body text, p_data jsonb)
returns void
language sql security definer set search_path = public as $$
  insert into notifications (recipient_id, channel, template, kind, title, body, data, status)
  values (p_customer, 'in_app', p_kind, p_kind, left(p_title, 120), left(p_body, 500), p_data, 'delivered')
$$;

-- Runs when the transaction commits (deferred), so its ledger rows are all there.
create or replace function loyalty_transactions_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_points integer;
  v_reward text;
begin
  select trade_name into v_name from merchants where id = new.merchant_id;
  select coalesce(sum(points), 0) into v_points from points_ledger where transaction_id = new.id;
  if new.type = 'award' and v_points > 0 then
    perform notify_customer(new.customer_id, 'points_earned', 'You earned ' || v_points || ' points',
      'At ' || v_name || '. Thanks for visiting!', jsonb_build_object('transaction_id', new.id, 'merchant_id', new.merchant_id));
  elsif new.type = 'redeem' then
    select r.name into v_reward from reward_redemptions rr join rewards r on r.id = rr.reward_id where rr.transaction_id = new.id;
    perform notify_customer(new.customer_id, 'reward_redeemed', 'Reward redeemed',
      coalesce(v_reward, 'Your reward') || ' at ' || v_name || ' (' || abs(v_points) || ' points).',
      jsonb_build_object('transaction_id', new.id, 'merchant_id', new.merchant_id));
  elsif new.type = 'void' then
    perform notify_customer(new.customer_id, 'transaction_voided', 'A transaction was reversed',
      v_name || ' reversed a transaction. Your balance has been updated.',
      jsonb_build_object('transaction_id', new.id, 'merchant_id', new.merchant_id));
  elsif new.type = 'adjustment' then
    perform notify_customer(new.customer_id, 'points_adjusted', 'Your points were adjusted',
      case when v_points >= 0 then '+' else '' end || v_points || ' points at ' || v_name || '.',
      jsonb_build_object('transaction_id', new.id, 'merchant_id', new.merchant_id));
  end if;
  return null;
end $$;
drop trigger if exists loyalty_transactions_notify on loyalty_transactions;
create constraint trigger loyalty_transactions_notify after insert on loyalty_transactions
  deferrable initially deferred for each row execute function loyalty_transactions_notify();

create or replace function points_ledger_expiry_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid;
  v_name text;
begin
  select a.customer_id, coalesce(m.trade_name, g.name) into v_customer, v_name
  from loyalty_accounts a join loyalty_programs g on g.id = a.program_id left join merchants m on m.id = g.merchant_id
  where a.id = new.account_id;
  perform notify_customer(v_customer, 'points_expired', 'Points expired',
    abs(new.points) || ' points at ' || v_name || ' expired after a long time without a visit.',
    jsonb_build_object('account_id', new.account_id));
  return null;
end $$;
drop trigger if exists points_ledger_expiry_notify on points_ledger;
create trigger points_ledger_expiry_notify after insert on points_ledger
  for each row when (new.entry_type = 'expire') execute function points_ledger_expiry_notify();

-- What the push-dispatch Edge Function sends (service role only): the notification, the customer's
-- preference for its kind, and their tokens.
create or replace function push_payload(p_notification_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', n.id, 'title', n.title, 'body', n.body, 'data', n.data, 'kind', n.kind,
    'allowed', case
      when n.kind in ('points_earned', 'reward_redeemed', 'transaction_voided', 'points_adjusted') then coalesce(cp.notify_points, true)
      when n.kind in ('points_expired', 'points_expiring') then coalesce(cp.notify_expiry, true)
      when n.kind in ('offer') then coalesce(cp.notify_offers, true)
      else true end,
    'tokens', coalesce((select jsonb_agg(t.token) from push_tokens t where t.user_id = n.recipient_id), '[]'::jsonb))
  from notifications n left join customer_profiles cp on cp.user_id = n.recipient_id
  where n.id = p_notification_id and n.pushed_at is null
$$;
create or replace function mark_pushed(p_notification_id uuid) returns void
language sql security definer set search_path = public as $$
  update notifications set pushed_at = now() where id = p_notification_id
$$;
revoke execute on function push_payload(uuid), mark_pushed(uuid), notify_customer(uuid, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function push_payload(uuid), mark_pushed(uuid) to service_role;

-- ---------------------------------------------------------------------------------------------------
-- Wallet and activity (the signed-in customer only)
-- ---------------------------------------------------------------------------------------------------
create or replace function require_customer() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or not exists (select 1 from customer_profiles where user_id = v_user and deleted_at is null) then
    perform raise_code('customer_unknown');
  end if;
  return v_user;
end $$;

-- Every program the customer has points in: balance, what can be spent now (network points are held a few
-- days), lifetime earned, and when the points expire if there is no visit before then.
create or replace function customer_wallet() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := require_customer();
begin
  return jsonb_build_object(
    'member_id', (select public_member_id from customer_profiles where user_id = v_me),
    'network_enabled', coalesce(setting_bool('network_enabled'), false),
    'accounts', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'account_id', a.id, 'program_id', g.id, 'scope', g.scope, 'program', g.name,
        'merchant_id', m.id, 'merchant', m.trade_name, 'logo_path', m.logo_path, 'category', m.category,
        'merchant_active', coalesce(m.status = 'active', true),
        'balance', a.balance, 'available', available_balance(a.id), 'lifetime_earned', a.lifetime_earned,
        'last_activity_at', a.last_activity_at,
        'expires_at', case when g.expiry_months is not null and a.balance > 0
                           then a.last_activity_at + make_interval(months => g.expiry_months) end,
        'rule', jsonb_build_object('type', g.rule_type, 'points_per_unit', g.points_per_unit, 'unit_centavos', g.unit_centavos,
                                   'minimum_spend_centavos', g.minimum_spend_centavos))
        order by a.last_activity_at desc), '[]'::jsonb)
      from loyalty_accounts a join loyalty_programs g on g.id = a.program_id left join merchants m on m.id = g.merchant_id
      where a.customer_id = v_me));
end $$;

-- p_kind: null (all), 'earned' (awards and positive adjustments), 'redeemed'.
create or replace function customer_activity(p_kind text default null, p_limit integer default 30, p_offset integer default 0)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := require_customer();
begin
  return (
    select coalesce(jsonb_agg(r.row order by r.created_at desc), '[]'::jsonb) from (
      select x.created_at, jsonb_build_object('id', x.id, 'created_at', x.created_at, 'type', x.type, 'status', x.status,
        'merchant_id', x.merchant_id, 'merchant', m.trade_name, 'branch', b.name, 'amount_centavos', x.amount_centavos,
        'receipt_no', x.receipt_no, 'reason', case when x.type in ('void', 'adjustment') then x.reason end,
        'points', (select coalesce(sum(l.points), 0) from points_ledger l where l.transaction_id = x.id),
        'merchant_points', (select coalesce(sum(l.points), 0) from points_ledger l join loyalty_accounts a on a.id = l.account_id
                            join loyalty_programs g on g.id = a.program_id where l.transaction_id = x.id and g.scope = 'merchant'),
        'network_points', (select coalesce(sum(l.points), 0) from points_ledger l join loyalty_accounts a on a.id = l.account_id
                           join loyalty_programs g on g.id = a.program_id where l.transaction_id = x.id and g.scope = 'network'),
        'reward', (select r.name from reward_redemptions rr join rewards r on r.id = rr.reward_id where rr.transaction_id = x.id)) as row
      from loyalty_transactions x
      join merchants m on m.id = x.merchant_id
      left join merchant_branches b on b.id = x.branch_id
      where x.customer_id = v_me
        and (p_kind is null or (p_kind = 'earned' and (x.type = 'award' or (x.type = 'adjustment' and exists (
               select 1 from points_ledger l where l.transaction_id = x.id and l.points > 0))))
             or (p_kind = 'redeemed' and x.type = 'redeem'))
      order by x.created_at desc limit page_limit(p_limit) offset page_offset(p_offset)) r);
end $$;

-- The customer's vouchers: redemption codes they asked for, used or not.
create or replace function customer_redemptions(p_limit integer default 30, p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := require_customer();
begin
  return (
    select coalesce(jsonb_agg(r.row order by r.created_at desc), '[]'::jsonb) from (
      select rr.created_at, jsonb_build_object('id', rr.id, 'created_at', rr.created_at, 'reward_id', rw.id, 'reward', rw.name,
        'merchant_id', m.id, 'merchant', m.trade_name, 'points_cost', rr.points_cost, 'used_at', rr.used_at,
        'expires_at', rr.expires_at,
        'status', case when rr.status = 'issued' and rr.expires_at <= now() then 'expired' else rr.status::text end) as row
      from reward_redemptions rr join rewards rw on rw.id = rr.reward_id join merchants m on m.id = rw.merchant_id
      where rr.customer_id = v_me
      order by rr.created_at desc limit page_limit(p_limit) offset page_offset(p_offset)) r);
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Discovery: active businesses only, with distance when the app sends a location.
-- ---------------------------------------------------------------------------------------------------
create or replace function distance_km(p_lat1 numeric, p_lng1 numeric, p_lat2 numeric, p_lng2 numeric) returns numeric
language sql immutable as $$
  select case when p_lat1 is null or p_lng1 is null or p_lat2 is null or p_lng2 is null then null else
    round((6371 * 2 * asin(sqrt(power(sin(radians((p_lat2 - p_lat1) / 2)), 2)
      + cos(radians(p_lat1)) * cos(radians(p_lat2)) * power(sin(radians((p_lng2 - p_lng1) / 2)), 2))))::numeric, 2) end
$$;

-- p_sort: 'nearby' (needs p_lat/p_lng), 'name', or 'favorites' (only favourites).
create or replace function customer_merchants(
  p_search text default null, p_category text default null, p_lat numeric default null, p_lng numeric default null,
  p_sort text default 'name', p_limit integer default 30, p_offset integer default 0
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := require_customer();
  v_pattern text := search_pattern(p_search);
begin
  return (
    select coalesce(jsonb_agg(r.row order by r.ord), '[]'::jsonb) from (
      select row_number() over (order by
          case when p_sort = 'nearby' then x.distance_km end asc nulls last, x.trade_name) as ord,
        jsonb_build_object('id', x.id, 'trade_name', x.trade_name, 'category', x.category, 'city', x.city,
          'description', x.description, 'logo_path', x.logo_path, 'distance_km', x.distance_km,
          'branches', x.branches, 'rewards', x.rewards, 'favorite', x.favorite, 'balance', x.balance) as row
      from (
        select m.id, m.trade_name, m.category, m.city, m.description, m.logo_path,
          (select min(distance_km(p_lat, p_lng, b.lat, b.lng)) from merchant_branches b where b.merchant_id = m.id and b.active) as distance_km,
          (select count(*) from merchant_branches b where b.merchant_id = m.id and b.active) as branches,
          (select count(*) from rewards w where w.merchant_id = m.id and w.active and w.approval_status = 'approved') as rewards,
          exists (select 1 from customer_favorites f where f.customer_id = v_me and f.merchant_id = m.id) as favorite,
          (select a.balance from loyalty_accounts a join loyalty_programs g on g.id = a.program_id
           where g.merchant_id = m.id and g.scope = 'merchant' and a.customer_id = v_me) as balance
        from merchants m
        where m.status = 'active'
          and (nullif(p_category, '') is null or m.category::text = p_category)
          and (v_pattern is null or m.trade_name ilike v_pattern or m.city ilike v_pattern or m.description ilike v_pattern)
      ) x
      where p_sort is distinct from 'favorites' or x.favorite
      order by ord limit page_limit(p_limit) offset page_offset(p_offset)) r);
end $$;

create or replace function customer_merchant(p_merchant_id uuid, p_lat numeric default null, p_lng numeric default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := require_customer();
  v_m merchants%rowtype;
  v_program loyalty_programs%rowtype;
  v_available integer;
begin
  select * into v_m from merchants where id = p_merchant_id and status = 'active';
  if not found then perform raise_code('merchant_not_found'); end if;
  select * into v_program from loyalty_programs where merchant_id = p_merchant_id and scope = 'merchant';
  select available_balance(a.id) into v_available from loyalty_accounts a where a.program_id = v_program.id and a.customer_id = v_me;
  return jsonb_build_object(
    'merchant', jsonb_build_object('id', v_m.id, 'trade_name', v_m.trade_name, 'category', v_m.category, 'city', v_m.city,
      'address', v_m.address, 'description', v_m.description, 'logo_path', v_m.logo_path, 'contact_phone', v_m.contact_phone,
      'contact_email', v_m.contact_email, 'website', v_m.website),
    'program', jsonb_build_object('name', v_program.name, 'rule_type', v_program.rule_type, 'points_per_unit', v_program.points_per_unit,
      'unit_centavos', v_program.unit_centavos, 'minimum_spend_centavos', v_program.minimum_spend_centavos,
      'expiry_months', v_program.expiry_months, 'active', v_program.active),
    'balance', coalesce(v_available, 0),
    'favorite', exists (select 1 from customer_favorites f where f.customer_id = v_me and f.merchant_id = p_merchant_id),
    'branches', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'address', b.address, 'city', b.city,
        'lat', b.lat, 'lng', b.lng, 'hours', b.hours, 'distance_km', distance_km(p_lat, p_lng, b.lat, b.lng)) order by b.created_at), '[]'::jsonb)
      from merchant_branches b where b.merchant_id = p_merchant_id and b.active),
    'rewards', (select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'name', w.name, 'description', w.description,
        'points_cost', w.points_cost, 'first_visit_only', w.first_visit_only, 'in_stock', coalesce(w.stock, 1) > 0,
        'eligible', coalesce(v_available, 0) >= w.points_cost and coalesce(w.stock, 1) > 0) order by w.points_cost), '[]'::jsonb)
      from rewards w where w.merchant_id = p_merchant_id and w.active and w.approval_status = 'approved'),
    'campaigns', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'kind', c.kind,
        'description', c.description, 'starts_at', c.starts_at, 'ends_at', c.ends_at) order by c.starts_at), '[]'::jsonb)
      from campaigns c where c.merchant_id = p_merchant_id and c.status in ('scheduled', 'running')
        and (c.ends_at is null or c.ends_at > now())));
end $$;

-- All rewards the customer can see, with whether they have enough points now.
create or replace function customer_rewards(p_merchant_id uuid default null, p_eligible_only boolean default false,
  p_limit integer default 50, p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := require_customer();
begin
  return (
    select coalesce(jsonb_agg(r.row order by r.points_cost), '[]'::jsonb) from (
      select x.points_cost, jsonb_build_object('id', x.id, 'name', x.name, 'description', x.description, 'points_cost', x.points_cost,
        'merchant_id', x.merchant_id, 'merchant', x.trade_name, 'logo_path', x.logo_path, 'balance', x.balance,
        'in_stock', x.in_stock, 'eligible', x.balance >= x.points_cost and x.in_stock) as row
      from (
        select w.id, w.name, w.description, w.points_cost, w.merchant_id, m.trade_name, m.logo_path,
          coalesce(w.stock, 1) > 0 as in_stock,
          coalesce((select available_balance(a.id) from loyalty_accounts a
                    where a.program_id = w.program_id and a.customer_id = v_me), 0) as balance
        from rewards w join merchants m on m.id = w.merchant_id
        where w.active and w.approval_status = 'approved' and m.status = 'active'
          and (p_merchant_id is null or w.merchant_id = p_merchant_id)
      ) x
      where not coalesce(p_eligible_only, false) or (x.balance >= x.points_cost and x.in_stock)
      order by x.points_cost limit page_limit(p_limit) offset page_offset(p_offset)) r);
end $$;

-- What the customer app's home screen needs, in one call.
create or replace function customer_home(p_lat numeric default null, p_lng numeric default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := require_customer();
begin
  return jsonb_build_object(
    'profile', (select jsonb_build_object('display_name', display_name, 'member_id', public_member_id, 'onboarded_at', onboarded_at)
                from customer_profiles where user_id = v_me),
    'points', (select jsonb_build_object(
        'merchant', coalesce(sum(a.balance) filter (where g.scope = 'merchant'), 0),
        'network', coalesce(sum(a.balance) filter (where g.scope = 'network'), 0))
      from loyalty_accounts a join loyalty_programs g on g.id = a.program_id where a.customer_id = v_me),
    'unread_notifications', (select count(*) from notifications where recipient_id = v_me and channel = 'in_app' and read_at is null),
    'featured_rewards', customer_rewards(null, false, 6, 0),
    'nearby', customer_merchants(null, null, p_lat, p_lng, case when p_lat is null then 'name' else 'nearby' end, 6, 0),
    'promotions', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'kind', c.kind, 'description', c.description,
        'merchant_id', m.id, 'merchant', m.trade_name, 'ends_at', c.ends_at) order by c.starts_at desc), '[]'::jsonb)
      from campaigns c join merchants m on m.id = c.merchant_id
      where m.status = 'active' and c.status = 'running' and (c.ends_at is null or c.ends_at > now())),
    'announcements', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'body', a.body) order by a.created_at desc), '[]'::jsonb)
      from platform_announcements a where a.published and a.audience in ('customers', 'all')
        and (a.starts_at is null or a.starts_at <= now()) and (a.ends_at is null or a.ends_at > now())),
    'recent_activity', customer_activity(null, 5, 0));
end $$;

-- Deletes the customer's personal data (App Store requirement). Points history stays, pseudonymised, because
-- the ledger is append-only and merchants' records must still add up; the sign-in is closed for good and the
-- email freed. Merchant staff accounts are refused (the business must be handed over first).
create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := require_customer();
begin
  if exists (select 1 from merchant_staff where user_id = v_me and active) then perform raise_code('staff_account'); end if;
  update customer_profiles
     set display_name = null, birthday_month = null, birthday_day = null, city = null, marketing_consent_at = null,
         notify_points = false, notify_offers = false, notify_expiry = false, deleted_at = now()
   where user_id = v_me;
  update customer_devices set revoked_at = now() where customer_id = v_me and revoked_at is null;
  delete from member_web_codes where customer_id = v_me;
  delete from customer_favorites where customer_id = v_me;
  delete from push_tokens where user_id = v_me;
  update reward_redemptions set status = 'cancelled' where customer_id = v_me and status = 'issued';
  update auth.users
     set email = 'deleted-' || v_me::text || '@deleted.ugnaya.invalid', raw_user_meta_data = '{}'::jsonb,
         banned_until = now() + interval '100 years'
   where id = v_me;
  delete from auth.sessions where user_id = v_me;
  insert into audit_logs (actor_user_id, actor_role, action, entity_table, entity_id)
  values (v_me, 'customer', 'customer.deleted', 'customer_profiles', v_me::text);
end $$;

-- ---------------------------------------------------------------------------------------------------
-- The web counter in the merchant portal: an owner, manager or cashier with a login awards or redeems with
-- their own session at a branch they work at. Same functions, idempotency and fraud rules as the counter app.
-- ---------------------------------------------------------------------------------------------------
create or replace function my_staff_id(p_merchant_id uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from merchant_staff where merchant_id = p_merchant_id and user_id = auth.uid() and active limit 1
$$;

create or replace function counter_award(
  p_merchant_id uuid, p_branch_id uuid, p_member_code text, p_amount_centavos integer, p_receipt_no text,
  p_idempotency_key text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_staff uuid := my_staff_id(p_merchant_id);
  v_customer uuid;
  v_result jsonb;
begin
  if v_staff is null then perform raise_code('forbidden'); end if;
  if p_amount_centavos is null or p_amount_centavos <= 0 then perform raise_code('amount_invalid'); end if;
  -- A repeat of the same request answers with the first result before the (single-use) code is checked again.
  select result into v_result from loyalty_transactions where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then return v_result || '{"replayed": true}'; end if;
  v_customer := verify_member_code(trim(p_member_code));
  return award_points(p_idempotency_key, p_merchant_id, p_branch_id, v_staff, null, v_customer, p_amount_centavos,
                      nullif(trim(coalesce(p_receipt_no, '')), ''));
end $$;

create or replace function counter_redeem(p_merchant_id uuid, p_branch_id uuid, p_code text, p_idempotency_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_staff uuid := my_staff_id(p_merchant_id);
  v_match text[];
begin
  if v_staff is null then perform raise_code('forbidden'); end if;
  v_match := regexp_match(trim(coalesce(p_code, '')), '^R:([0-9a-f]{8,128})$');
  if v_match is null then perform raise_code('token_invalid'); end if;
  return redeem_reward(p_idempotency_key, p_merchant_id, p_branch_id, v_staff, null, v_match[1]);
end $$;

revoke execute on function require_customer(), distance_km(numeric, numeric, numeric, numeric), my_staff_id(uuid)
  from public, anon, authenticated;
revoke execute on function register_push_token(text, text), customer_wallet(), customer_activity(text, integer, integer),
  customer_redemptions(integer, integer), customer_merchants(text, text, numeric, numeric, text, integer, integer),
  customer_merchant(uuid, numeric, numeric), customer_rewards(uuid, boolean, integer, integer), customer_home(numeric, numeric),
  delete_my_account(), counter_award(uuid, uuid, text, integer, text, text), counter_redeem(uuid, uuid, text, text) from public, anon;
grant execute on function register_push_token(text, text), customer_wallet(), customer_activity(text, integer, integer),
  customer_redemptions(integer, integer), customer_merchants(text, text, numeric, numeric, text, integer, integer),
  customer_merchant(uuid, numeric, numeric), customer_rewards(uuid, boolean, integer, integer), customer_home(numeric, numeric),
  delete_my_account(), counter_award(uuid, uuid, text, integer, text, text), counter_redeem(uuid, uuid, text, text) to authenticated;
