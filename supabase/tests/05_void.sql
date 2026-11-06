-- void_transaction: who may void what and when, write-offs when points were already spent,
-- voided redemptions. Seed ids: supabase/seed.sql.
\set m1 '''50000000-0000-4000-8000-000000000001'''
\set m2 '''50000000-0000-4000-8000-000000000002'''
\set b1 '''51000000-0000-4000-8000-000000000001'''
\set owner '''53000000-0000-4000-8000-000000000001'''
\set rosa '''53000000-0000-4000-8000-000000000002'''
\set ana '''53000000-0000-4000-8000-000000000003'''
\set ben '''53000000-0000-4000-8000-000000000005'''
\set dev1 '''54000000-0000-4000-8000-000000000001'''
\set dev2 '''54000000-0000-4000-8000-000000000002'''
\set c1 '''57000000-0000-4000-8000-000000000001'''
\set c2 '''57000000-0000-4000-8000-000000000002'''
\set p1 '''55000000-0000-4000-8000-000000000001'''
\set upsize '''56000000-0000-4000-8000-000000000001'''

-- Ana voids her own award straight away.
select award_points('k1', :m1, :b1, :ana, :dev1, :c1, 20000) as a1 \gset
select void_transaction('v1', :m1, :ana, :dev1, (:'a1'::jsonb ->> 'transaction_id')::uuid, 'wrong amount') as v1 \gset
select test.assert((select balance from loyalty_accounts where customer_id = :c1 and program_id = :p1) = 0, 'points taken back');
select test.assert((select status from loyalty_transactions where id = (:'a1'::jsonb ->> 'transaction_id')::uuid) = 'voided', 'original voided');
select test.assert((select reverses_id::text from loyalty_transactions where id = (:'v1'::jsonb ->> 'transaction_id')::uuid)
  = :'a1'::jsonb ->> 'transaction_id', 'the void points at the original');
select test.assert((select count(*) from points_ledger where entry_type = 'void' and points = -20) = 1, 'a void row, nothing edited');
select test.assert((:'v1'::jsonb ->> 'written_off')::int = 0, 'nothing written off');

-- Retries return the first answer; a void can't be voided; a reason is required.
select void_transaction('v1', :m1, :ana, :dev1, (:'a1'::jsonb ->> 'transaction_id')::uuid, 'wrong amount') as v1b \gset
select test.assert((:'v1b'::jsonb ->> 'replayed')::boolean, 'replayed');
select test.assert_raises(format($$select void_transaction('v2', %L, %L, %L, %L, 'again')$$, :m1, :ana, :dev1, :'a1'::jsonb ->> 'transaction_id'), 'not_voidable');
select test.assert_raises(format($$select void_transaction('v3', %L, %L, %L, %L, 'again')$$, :m1, :ana, :dev1, :'v1'::jsonb ->> 'transaction_id'), 'not_voidable');
select award_points('k2', :m1, :b1, :ana, :dev1, :c1, 20000) as a2 \gset
select test.assert_raises(format($$select void_transaction('v4', %L, %L, %L, %L, '  ')$$, :m1, :ana, :dev1, :'a2'::jsonb ->> 'transaction_id'), 'request_invalid');

-- After 12 hours only a manager or the owner can void; after 30 days nobody.
update loyalty_transactions set created_at = now() - interval '13 hours' where id = (:'a2'::jsonb ->> 'transaction_id')::uuid;
select test.assert_raises(format($$select void_transaction('v5', %L, %L, %L, %L, 'late')$$, :m1, :ana, :dev1, :'a2'::jsonb ->> 'transaction_id'), 'void_window');
select void_transaction('v6', :m1, :rosa, null, (:'a2'::jsonb ->> 'transaction_id')::uuid, 'customer complained');
select award_points('k3', :m1, :b1, :ana, :dev1, :c1, 20000) as a3 \gset
update loyalty_transactions set created_at = now() - interval '31 days' where id = (:'a3'::jsonb ->> 'transaction_id')::uuid;
select test.assert_raises(format($$select void_transaction('v7', %L, %L, %L, %L, 'old')$$, :m1, :rosa, null, :'a3'::jsonb ->> 'transaction_id'), 'void_window');
select test.assert_raises(format($$select void_transaction('v8', %L, %L, %L, %L, 'old')$$, :m1, :owner, null, :'a3'::jsonb ->> 'transaction_id'), 'void_window');

-- Another merchant's cashier can't touch Juan's transactions.
select test.assert_raises(format($$select void_transaction('v9', %L, %L, %L, %L, 'x')$$, :m2, :ben, :dev2, :'a3'::jsonb ->> 'transaction_id'), 'not_voidable');

-- Points already spent: the void takes back what's left and writes off the rest; nothing goes negative.
select award_points('k4', :m1, :b1, :ana, :dev1, :c2, 60000) as a4 \gset
select issue_redemption_token(:c2, :upsize) as t1 \gset
select redeem_reward('r1', :m1, :b1, :ana, :dev1, :'t1'::jsonb ->> 'token');
select void_transaction('v10', :m1, :ana, :dev1, (:'a4'::jsonb ->> 'transaction_id')::uuid, 'card declined') as v10 \gset
select test.assert((select balance from loyalty_accounts where customer_id = :c2 and program_id = :p1) = 0, 'balance floors at 0');
select test.assert((:'v10'::jsonb ->> 'written_off')::int = 40, '40 written off');
select test.assert((select count(*) from points_ledger where transaction_id = (:'v10'::jsonb ->> 'transaction_id')::uuid
  and ((entry_type = 'void' and points = -60) or (entry_type = 'write_off' and points = 40))) = 2, 'a void row and a write-off row');

-- Voiding a redemption gives the points back and cancels it.
select award_points('k5', :m1, :b1, :ana, :dev1, :c2, 40000);
select issue_redemption_token(:c2, :upsize) as t2 \gset
select redeem_reward('r2', :m1, :b1, :ana, :dev1, :'t2'::jsonb ->> 'token') as rd \gset
select void_transaction('v11', :m1, :ana, :dev1, (:'rd'::jsonb ->> 'transaction_id')::uuid, 'gave the wrong drink');
select test.assert((select balance from loyalty_accounts where customer_id = :c2 and program_id = :p1) = 40, 'points back');
select test.assert((select status from reward_redemptions where id = (:'t2'::jsonb ->> 'redemption_id')::uuid) = 'cancelled', 'redemption cancelled');

select test.assert((select count(*) from check_ledger()) = 0, 'ledger and balances agree');
select test.assert((select count(*) from audit_logs where action = 'points.voided') = 4, 'every void audited');
