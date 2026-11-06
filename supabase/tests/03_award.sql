-- award_points: idempotency, receipts, limits, who may award, the network hold, the immutable ledger.
-- Seed ids: supabase/seed.sql. Runs as the Edge Functions do (service role).
\set m1 '''50000000-0000-4000-8000-000000000001'''
\set m2 '''50000000-0000-4000-8000-000000000002'''
\set b1 '''51000000-0000-4000-8000-000000000001'''
\set b3 '''51000000-0000-4000-8000-000000000003'''
\set ana '''53000000-0000-4000-8000-000000000003'''
\set ben '''53000000-0000-4000-8000-000000000005'''
\set dev1 '''54000000-0000-4000-8000-000000000001'''
\set dev2 '''54000000-0000-4000-8000-000000000002'''
\set c1 '''57000000-0000-4000-8000-000000000001'''
\set c2 '''57000000-0000-4000-8000-000000000002'''

select test.as_service();

-- ₱200 at 1 per ₱10.
select award_points('k1', :m1, :b1, :ana, :dev1, :c1, 20000) as r1 \gset
select test.assert((:'r1'::jsonb #>> '{merchant,points_earned}')::int = 20, 'earns 20');
select test.assert((:'r1'::jsonb #>> '{merchant,balance}')::int = 20, 'balance 20');
select test.assert(:'r1'::jsonb -> 'network' = 'null'::jsonb, 'no network points while the network is off');
select test.assert((:'r1'::jsonb ->> 'replayed')::boolean = false, 'first time');

-- The same request again (a retry after a dropped connection) awards nothing new.
select award_points('k1', :m1, :b1, :ana, :dev1, :c1, 20000) as r1b \gset
select test.assert(:'r1b'::jsonb ->> 'transaction_id' = :'r1'::jsonb ->> 'transaction_id', 'same transaction');
select test.assert((:'r1b'::jsonb ->> 'replayed')::boolean, 'replayed');
select test.assert((select count(*) from points_ledger) = 1, 'one ledger row');

-- A receipt number is used once per branch; two real purchases with new keys both count.
select award_points('k2', :m1, :b1, :ana, :dev1, :c1, 20000, 'OR-1');
select test.assert_raises(format($$select award_points('k3', %L, %L, %L, %L, %L, 20000, 'OR-1')$$, :m1, :b1, :ana, :dev1, :c1), 'receipt_duplicate');
select award_points('k4', :m1, :b1, :ana, :dev1, :c1, 20000);
select test.assert((select balance from loyalty_accounts where customer_id = :c1) = 60, 'three awards, 60 points');

-- Amounts.
select test.assert_raises(format($$select award_points('k5', %L, %L, %L, %L, %L, 0)$$, :m1, :b1, :ana, :dev1, :c2), 'amount_invalid');
select test.assert_raises(format($$select award_points('k6', %L, %L, %L, %L, %L, 3000001)$$, :m1, :b1, :ana, :dev1, :c2), 'amount_invalid');
select award_points('k7', :m1, :b1, :ana, :dev1, :c2, 19950) as r7 \gset
select test.assert((:'r7'::jsonb #>> '{merchant,points_earned}')::int = 19, '₱199.50 earns 19');

-- At most three awards per customer per merchant per day (Manila time).
select test.assert_raises(format($$select award_points('k8', %L, %L, %L, %L, %L, 20000)$$, :m1, :b1, :ana, :dev1, :c1), 'daily_limit');

-- Who may award, and from where.
select test.assert_raises(format($$select award_points('k9', %L, %L, %L, %L, %L, 20000)$$, :m1, :b1, :ben, :dev1, :c2), 'staff_not_allowed');
select test.assert_raises(format($$select award_points('k10', %L, %L, %L, %L, %L, 20000)$$, :m1, :b3, :ana, :dev1, :c2), 'staff_not_allowed');
select test.assert_raises(format($$select award_points('k11', %L, %L, %L, %L, %L, 20000)$$, :m1, :b1, :ana, :dev2, :c2), 'device_not_allowed');
select test.reset();
update devices set revoked_at = now() where id = :dev1;
select test.as_service();
select test.assert_raises(format($$select award_points('k12', %L, %L, %L, %L, %L, 20000)$$, :m1, :b1, :ana, :dev1, :c2), 'device_not_allowed');
select test.reset();
update devices set revoked_at = null where id = :dev1;
update merchant_staff set active = false where id = :ana;
select test.as_service();
select test.assert_raises(format($$select award_points('k13', %L, %L, %L, %L, %L, 20000)$$, :m1, :b1, :ana, :dev1, :c2), 'staff_not_allowed');
select test.reset();
update merchant_staff set active = true where id = :ana;
select test.as_service();
select test.assert_raises(format($$select award_points('k14', %L, %L, %L, %L, %L, 20000)$$, :m1, :b1, :ana, :dev1,
  '00000000-0000-4000-8000-00000000dead'), 'customer_unknown');

-- A suspended merchant can't award; its customers keep their points.
select test.reset();
update merchants set status = 'suspended' where id = :m1;
select test.as_service();
select test.assert_raises(format($$select award_points('k15', %L, %L, %L, %L, %L, 20000)$$, :m1, :b1, :ana, :dev1, :c2), 'merchant_inactive');
select test.reset();
update merchants set status = 'active' where id = :m1;
select test.assert((select balance from loyalty_accounts where customer_id = :c1) = 60, 'balance kept while suspended');

-- With the network on: 1 point per ₱20, held for 7 days before it can be spent.
update platform_settings set value = 'true' where key = 'network_enabled';
update loyalty_programs set active = true where scope = 'network';
select test.as_service();
select award_points('k16', :m1, :b1, :ana, :dev1, :c2, 25000) as r16 \gset
select test.assert((:'r16'::jsonb #>> '{network,points_earned}')::int = 12, '₱250 earns 12 network points');
select test.assert((:'r16'::jsonb #>> '{merchant,points_earned}')::int = 25, 'and 25 merchant points');
select test.assert(abs(extract(epoch from (:'r16'::jsonb #>> '{network,available_at}')::timestamptz - (now() + interval '7 days'))) < 60,
  'network points held 7 days');
select test.reset();
select test.assert((select balance from loyalty_accounts a join loyalty_programs p on p.id = a.program_id
  where a.customer_id = :c2 and p.scope = 'network') = 12, 'network balance 12');
select test.assert((select available_balance(a.id) from loyalty_accounts a join loyalty_programs p on p.id = a.program_id
  where a.customer_id = :c2 and p.scope = 'network') = 0, 'none of it spendable yet');

-- A merchant outside the network never issues network points.
select test.as_service();
select award_points('k17', :m2, :b3, :ben, :dev2, :c2, 25000) as r17 \gset
select test.assert(:'r17'::jsonb -> 'network' = 'null'::jsonb, 'Lola''s is not in the network');
select test.reset();

-- Every balance is the sum of its ledger; drift is found; the ledger can't be edited.
select test.assert((select count(*) from check_ledger()) = 0, 'ledger and balances agree');
update loyalty_accounts set balance = balance + 1 where customer_id = :c1;
select test.assert((select count(*) from check_ledger()) = 1, 'drift is found');
update loyalty_accounts set balance = balance - 1 where customer_id = :c1;
select test.assert_raises($$update points_ledger set points = 1$$, 'ledger_immutable');
select test.assert_raises($$delete from points_ledger$$, 'ledger_immutable');
select test.assert((select count(*) from audit_logs where action = 'points.awarded') = 6, 'every award audited, replays not');
