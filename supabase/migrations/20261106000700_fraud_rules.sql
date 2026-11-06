-- Fraud rules run after every award and void (business plan section 10). They flag; they never block.
-- Safe to run twice.

create or replace function run_fraud_rules(p_transaction_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tx loyalty_transactions;
  v_avg numeric;
  v_count integer;
  v_awards integer;
  v_voids integer;
begin
  select * into v_tx from loyalty_transactions where id = p_transaction_id;
  if not found then return; end if;

  -- An award five times the merchant's usual (its last 50 awards, at least 20 of them).
  if v_tx.type = 'award' then
    select avg(amount_centavos), count(*) into v_avg, v_count
    from (select amount_centavos from loyalty_transactions
          where merchant_id = v_tx.merchant_id and type = 'award' and id <> v_tx.id
          order by created_at desc limit 50) recent;
    if v_count >= 20 and v_tx.amount_centavos >= 5 * v_avg then
      insert into fraud_flags (merchant_id, customer_id, staff_id, device_id, transaction_id, rule, details)
      values (v_tx.merchant_id, v_tx.customer_id, v_tx.staff_id, v_tx.device_id, v_tx.id, 'large_award',
              jsonb_build_object('amount_centavos', v_tx.amount_centavos, 'recent_average_centavos', round(v_avg), 'sample', v_count));
    end if;
  end if;

  -- A staff member voiding more than one in five of their last 50 transactions (at least 10 awards).
  if v_tx.type = 'void' then
    select count(*) filter (where type = 'award'), count(*) filter (where type = 'void') into v_awards, v_voids
    from (select type from loyalty_transactions
          where staff_id = v_tx.staff_id and type in ('award', 'void')
          order by created_at desc limit 50) recent;
    if v_awards >= 10 and v_voids::numeric / v_awards > 0.2 then
      insert into fraud_flags (merchant_id, staff_id, device_id, transaction_id, rule, details)
      values (v_tx.merchant_id, v_tx.staff_id, v_tx.device_id, v_tx.id, 'void_rate',
              jsonb_build_object('voids', v_voids, 'awards', v_awards));
    end if;
  end if;
end $$;
