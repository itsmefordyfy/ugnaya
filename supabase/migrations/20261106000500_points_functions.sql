-- Points movements. Each is one SECURITY DEFINER function, one transaction, called only by an Edge
-- Function with the service role after it has checked the caller (grants in the RLS migration).
-- Every movement is idempotent per merchant and writes new ledger rows; nothing is updated in place
-- except the cached balance, which always equals the ledger sum (check_ledger). Safe to run twice.

-- Points that can be spent now (network points are held for a few days after they're earned).
create or replace function available_balance(p_account_id uuid) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(points), 0)::integer from points_ledger
  where account_id = p_account_id and available_at <= now()
$$;

-- The customer's account in a program, created on first use and locked for this transaction.
create or replace function lock_account(p_customer_id uuid, p_program_id uuid) returns loyalty_accounts
language plpgsql security definer set search_path = public as $$
declare
  v_account loyalty_accounts;
begin
  insert into loyalty_accounts (customer_id, program_id) values (p_customer_id, p_program_id)
  on conflict (customer_id, program_id) do nothing;
  select * into v_account from loyalty_accounts
  where customer_id = p_customer_id and program_id = p_program_id
  for update;
  return v_account;
end $$;

-- Adds a ledger row and moves the cached balance with it.
create or replace function post_entry(
  p_account_id uuid, p_transaction_id uuid, p_entry ledger_entry_type, p_points integer,
  p_available_at timestamptz default now(), p_program_version integer default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_balance integer;
begin
  if p_points = 0 then
    select balance into v_balance from loyalty_accounts where id = p_account_id;
    return v_balance;
  end if;
  insert into points_ledger (account_id, transaction_id, entry_type, points, available_at, program_version)
  values (p_account_id, p_transaction_id, p_entry, p_points, p_available_at, p_program_version);
  update loyalty_accounts
     set balance = balance + p_points,
         lifetime_earned = lifetime_earned + case when p_entry in ('earn', 'bonus') then p_points else 0 end,
         last_activity_at = case when p_entry in ('earn', 'redeem', 'bonus') then now() else last_activity_at end,
         updated_at = now()
   where id = p_account_id
  returning balance into v_balance;
  return v_balance;
end $$;

-- Checks shared by award, redeem and void: an active merchant, an active staff member of it at
-- this branch, and (when given) a registered device of this merchant and branch.
create or replace function assert_counter(p_merchant_id uuid, p_branch_id uuid, p_staff_id uuid, p_device_id uuid)
returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from merchants where id = p_merchant_id and status = 'active') then
    perform raise_code('merchant_inactive');
  end if;
  if not exists (select 1 from merchant_branches where id = p_branch_id and merchant_id = p_merchant_id and active)
     or not exists (select 1 from merchant_staff where id = p_staff_id and merchant_id = p_merchant_id)
     or not staff_at_branch(p_staff_id, p_branch_id) then
    perform raise_code('staff_not_allowed');
  end if;
  if p_device_id is not null and not exists (
    select 1 from devices
    where id = p_device_id and merchant_id = p_merchant_id and branch_id = p_branch_id and revoked_at is null
  ) then
    perform raise_code('device_not_allowed');
  end if;
end $$;

-- Placeholder; the fraud-rules migration replaces it.
create or replace function run_fraud_rules(p_transaction_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  return;
end $$;

-- Awards points for one purchase at the counter. Returns
-- { transaction_id, replayed, merchant: { program_id, points_earned, balance } | null,
--   network: { points_earned, balance, available_at } | null }.
create or replace function award_points(
  p_idempotency_key text, p_merchant_id uuid, p_branch_id uuid, p_staff_id uuid, p_device_id uuid,
  p_customer_id uuid, p_amount_centavos integer, p_receipt_no text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_existing jsonb;
  v_merchant merchants;
  v_limits merchant_limits;
  v_program loyalty_programs;
  v_network loyalty_programs;
  v_account loyalty_accounts;
  v_tx uuid;
  v_points integer;
  v_balance integer;
  v_available timestamptz;
  v_merchant_part jsonb := 'null';
  v_network_part jsonb := 'null';
  v_result jsonb;
  v_constraint text;
begin
  if p_idempotency_key is null or length(p_idempotency_key) not between 1 and 100 then
    perform raise_code('request_invalid');
  end if;
  select result into v_existing from loyalty_transactions
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then return v_existing || '{"replayed": true}'; end if;

  perform assert_counter(p_merchant_id, p_branch_id, p_staff_id, p_device_id);
  select * into v_merchant from merchants where id = p_merchant_id;
  if not exists (select 1 from customer_profiles where user_id = p_customer_id and deleted_at is null) then
    perform raise_code('customer_unknown');
  end if;
  select * into v_limits from merchant_limits where merchant_id = p_merchant_id;
  if p_amount_centavos is null or p_amount_centavos <= 0
     or p_amount_centavos > coalesce(v_limits.max_award_per_tx_centavos, 3000000) then
    perform raise_code('amount_invalid');
  end if;
  if (select count(*) from loyalty_transactions
      where merchant_id = p_merchant_id and customer_id = p_customer_id and type = 'award' and status = 'completed'
        and (created_at at time zone 'Asia/Manila')::date = (now() at time zone 'Asia/Manila')::date)
     >= coalesce(v_limits.max_awards_per_customer_per_day, 3) then
    perform raise_code('daily_limit');
  end if;
  select * into v_program from loyalty_programs where merchant_id = p_merchant_id and scope = 'merchant' and active;
  if not found then perform raise_code('merchant_inactive'); end if;

  begin
    insert into loyalty_transactions (merchant_id, branch_id, staff_id, device_id, customer_id, type,
                                      amount_centavos, receipt_no, idempotency_key)
    values (p_merchant_id, p_branch_id, p_staff_id, p_device_id, p_customer_id, 'award',
            p_amount_centavos, nullif(trim(p_receipt_no), ''), p_idempotency_key)
    returning id into v_tx;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'loyalty_transactions_receipt' then perform raise_code('receipt_duplicate'); end if;
    -- The same key raced in from a retry: answer with the first one's result.
    select result into v_existing from loyalty_transactions
    where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
    return v_existing || '{"replayed": true}';
  end;

  v_account := lock_account(p_customer_id, v_program.id);
  v_points := points_for_amount(v_program.rule_type, v_program.points_per_unit, v_program.unit_centavos,
                                v_program.minimum_spend_centavos, p_amount_centavos);
  v_balance := post_entry(v_account.id, v_tx, 'earn', v_points, now(), v_program.version);
  v_merchant_part := jsonb_build_object('program_id', v_program.id, 'points_earned', v_points, 'balance', v_balance);

  if setting_bool('network_enabled') and v_merchant.network_participation then
    select * into v_network from loyalty_programs where scope = 'network' and active;
    if found then
      v_account := lock_account(p_customer_id, v_network.id);
      v_points := points_for_amount(v_network.rule_type, v_network.points_per_unit, v_network.unit_centavos,
                                    v_network.minimum_spend_centavos, p_amount_centavos);
      v_available := now() + make_interval(days => coalesce(setting_int('network_hold_days'), 7));
      v_balance := post_entry(v_account.id, v_tx, 'earn', v_points, v_available, v_network.version);
      v_network_part := jsonb_build_object('points_earned', v_points, 'balance', v_balance, 'available_at', v_available);
    end if;
  end if;

  v_result := jsonb_build_object('transaction_id', v_tx, 'replayed', false,
                                 'merchant', v_merchant_part, 'network', v_network_part);
  update loyalty_transactions set result = v_result where id = v_tx;
  perform log_audit('points.awarded', p_merchant_id, 'loyalty_transactions', v_tx::text, null, v_result,
                    null, p_staff_id, p_device_id);
  perform run_fraud_rules(v_tx);
  return v_result;
end $$;

-- Accounts whose cached balance differs from their ledger. Run nightly; any row is an incident.
create or replace function check_ledger()
returns table (account_id uuid, balance integer, ledger_sum bigint)
language sql stable security definer set search_path = public as $$
  select a.id, a.balance, coalesce(sum(l.points), 0)
  from loyalty_accounts a left join points_ledger l on l.account_id = a.id
  group by a.id, a.balance
  having a.balance <> coalesce(sum(l.points), 0)
$$;

-- The customer asks to redeem a reward: checks they can, and returns a one-time token for the QR
-- (`R:<token>`). Only its SHA-256 is stored. Points are taken when the cashier scans it.
-- Returns { redemption_id, token, expires_at, points_cost, reward_name }.
create or replace function issue_redemption_token(p_customer_id uuid, p_reward_id uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_reward rewards;
  v_account loyalty_accounts;
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_expires timestamptz := now() + make_interval(mins => coalesce(setting_int('redemption_token_minutes'), 5));
  v_id uuid;
begin
  if not exists (select 1 from customer_profiles where user_id = p_customer_id and deleted_at is null) then
    perform raise_code('customer_unknown');
  end if;
  select * into v_reward from rewards where id = p_reward_id;
  if not found or not v_reward.active or v_reward.approval_status <> 'approved'
     or coalesce(v_reward.stock, 1) <= 0
     or not exists (select 1 from merchants where id = v_reward.merchant_id and status = 'active') then
    perform raise_code('reward_unavailable');
  end if;
  if v_reward.monthly_cap is not null and (
    select count(*) from reward_redemptions
    where reward_id = p_reward_id and status = 'used'
      and date_trunc('month', used_at at time zone 'Asia/Manila') = date_trunc('month', now() at time zone 'Asia/Manila')
  ) >= v_reward.monthly_cap then
    perform raise_code('monthly_cap');
  end if;
  if v_reward.first_visit_only and exists (
    select 1 from loyalty_transactions
    where merchant_id = v_reward.merchant_id and customer_id = p_customer_id and type = 'award' and status = 'completed'
  ) then
    perform raise_code('first_visit_only');
  end if;
  v_account := lock_account(p_customer_id, v_reward.program_id);
  if available_balance(v_account.id) < v_reward.points_cost then perform raise_code('insufficient_points'); end if;

  insert into reward_redemptions (reward_id, customer_id, account_id, token_hash, expires_at, points_cost)
  values (p_reward_id, p_customer_id, v_account.id, encode(digest(v_token, 'sha256'), 'hex'), v_expires, v_reward.points_cost)
  returning id into v_id;
  return jsonb_build_object('redemption_id', v_id, 'token', v_token, 'expires_at', v_expires,
                            'points_cost', v_reward.points_cost, 'reward_name', v_reward.name);
end $$;

-- The cashier scans a redemption QR. Returns
-- { transaction_id, replayed, redemption_id, reward_id, reward_name, points_cost, balance }.
create or replace function redeem_reward(
  p_idempotency_key text, p_merchant_id uuid, p_branch_id uuid, p_staff_id uuid, p_device_id uuid, p_token text
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_existing jsonb;
  v_redemption reward_redemptions;
  v_reward rewards;
  v_tx uuid;
  v_balance integer;
  v_result jsonb;
begin
  if p_idempotency_key is null or length(p_idempotency_key) not between 1 and 100 then
    perform raise_code('request_invalid');
  end if;
  select result into v_existing from loyalty_transactions
  where merchant_id = p_merchant_id and idempotency_key = p_idempotency_key;
  if found then return v_existing || '{"replayed": true}'; end if;

  perform assert_counter(p_merchant_id, p_branch_id, p_staff_id, p_device_id);
  select * into v_redemption from reward_redemptions
  where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
  for update;
  if not found then perform raise_code('token_invalid'); end if;
  select * into v_reward from rewards where id = v_redemption.reward_id;
  if v_reward.merchant_id <> p_merchant_id then perform raise_code('token_invalid'); end if;
  if v_redemption.status = 'used' then perform raise_code('token_used'); end if;
  if v_redemption.status <> 'issued' then perform raise_code('token_invalid'); end if;
  -- An expired token stays 'issued' in the table (raising undoes any update); expires_at decides.
  if v_redemption.expires_at <= now() then perform raise_code('token_expired'); end if;

  perform 1 from loyalty_accounts where id = v_redemption.account_id for update;
  if available_balance(v_redemption.account_id) < v_redemption.points_cost then
    perform raise_code('insufficient_points');
  end if;

  insert into loyalty_transactions (merchant_id, branch_id, staff_id, device_id, customer_id, type, idempotency_key)
  values (p_merchant_id, p_branch_id, p_staff_id, p_device_id, v_redemption.customer_id, 'redeem', p_idempotency_key)
  returning id into v_tx;
  v_balance := post_entry(v_redemption.account_id, v_tx, 'redeem', -v_redemption.points_cost);
  update reward_redemptions
     set status = 'used', used_at = now(), used_device_id = p_device_id, transaction_id = v_tx
   where id = v_redemption.id;
  update rewards set stock = stock - 1 where id = v_reward.id and stock is not null;

  v_result := jsonb_build_object('transaction_id', v_tx, 'replayed', false, 'redemption_id', v_redemption.id,
                                 'reward_id', v_reward.id, 'reward_name', v_reward.name,
                                 'points_cost', v_redemption.points_cost, 'balance', v_balance);
  update loyalty_transactions set result = v_result where id = v_tx;
  perform log_audit('points.redeemed', p_merchant_id, 'loyalty_transactions', v_tx::text, null, v_result,
                    null, p_staff_id, p_device_id);
  return v_result;
end $$;
