-- expire_points and the fraud rules.
\set m1 '''50000000-0000-4000-8000-000000000001'''
\set b1 '''51000000-0000-4000-8000-000000000001'''
\set ana '''53000000-0000-4000-8000-000000000003'''
\set dev1 '''54000000-0000-4000-8000-000000000001'''
\set c1 '''57000000-0000-4000-8000-000000000001'''
\set c2 '''57000000-0000-4000-8000-000000000002'''

-- Points expire after the program's months of inactivity (12 by default).
select award_points('k1', :m1, :b1, :ana, :dev1, :c1, 20000);
select award_points('k2', :m1, :b1, :ana, :dev1, :c2, 20000);
update loyalty_accounts set last_activity_at = now() - interval '13 months' where customer_id = :c1;
select test.assert(expire_points() = 1, 'one account expired');
select test.assert((select balance from loyalty_accounts where customer_id = :c1) = 0, 'its points are gone');
select test.assert((select count(*) from points_ledger where entry_type = 'expire' and points = -20) = 1, 'an expire row');
select test.assert((select balance from loyalty_accounts where customer_id = :c2) = 20, 'an active account is untouched');
select test.assert(expire_points() = 0, 'nothing left to expire');
select test.assert((select count(*) from check_ledger()) = 0, 'ledger and balances agree');

-- Twenty-one ordinary ₱100 sales to seven customers, then one ₱2,000: flagged as unusually large.
insert into auth.users (id, raw_user_meta_data)
  select ('59000000-0000-4000-8000-00000000000' || i)::uuid, '{"user_type":"customer"}' from generate_series(1, 7) i;
select award_points('f' || i || '-' || j, :m1, :b1, :ana, :dev1, ('59000000-0000-4000-8000-00000000000' || i)::uuid, 10000)
  from generate_series(1, 7) i, generate_series(1, 3) j;
select test.assert((select count(*) from fraud_flags) = 0, 'ordinary sales raise nothing');
select award_points('big', :m1, :b1, :ana, :dev1, :c2, 200000);
select test.assert((select count(*) from fraud_flags where rule = 'large_award') = 1, 'the ₱2,000 sale is flagged');

-- A cashier who voids more than one in five of their awards is flagged.
select void_transaction('void' || n, :m1, :ana, :dev1, t.id, 'test')
  from (select id, row_number() over (order by created_at) n from loyalty_transactions
        where type = 'award' and status = 'completed' and staff_id = :ana order by created_at limit 6) t;
select test.assert((select count(*) from fraud_flags where rule = 'void_rate' and staff_id = :ana) >= 1, 'void rate flagged');
