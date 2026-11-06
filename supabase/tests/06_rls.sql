-- Row Level Security and grants: each role sees only its own rows, clients can't move points,
-- private columns stay private, and the directory shows only public fields of active merchants.
\set m1 '''50000000-0000-4000-8000-000000000001'''
\set m2 '''50000000-0000-4000-8000-000000000002'''
\set b1 '''51000000-0000-4000-8000-000000000001'''
\set b3 '''51000000-0000-4000-8000-000000000003'''
\set ana '''53000000-0000-4000-8000-000000000003'''
\set ben '''53000000-0000-4000-8000-000000000005'''
\set dev1 '''54000000-0000-4000-8000-000000000001'''
\set dev2 '''54000000-0000-4000-8000-000000000002'''
\set owner_user '''52000000-0000-4000-8000-000000000001'''
\set rosa_user '''52000000-0000-4000-8000-000000000002'''
\set lola_user '''52000000-0000-4000-8000-000000000003'''
\set device_user '''52000000-0000-4000-8000-0000000000d1'''
\set admin_user '''52000000-0000-4000-8000-0000000000a1'''
\set c1 '''57000000-0000-4000-8000-000000000001'''
\set c2 '''57000000-0000-4000-8000-000000000002'''

select award_points('k1', :m1, :b1, :ana, :dev1, :c1, 20000);
select award_points('k2', :m2, :b3, :ben, :dev2, :c1, 40000);
select award_points('k3', :m1, :b1, :ana, :dev1, :c2, 30000);

-- A manager sees their own merchant only.
select test.as_user(:rosa_user);
select test.assert((select count(*) from merchants) = 1, 'Rosa sees one merchant');
select test.assert((select count(*) from loyalty_transactions where merchant_id = :m1) = 2, 'and its transactions');
select test.assert((select count(*) from loyalty_transactions where merchant_id = :m2) = 0, 'not Lola''s');
select test.assert((select count(*) from audit_logs where merchant_id = :m1) > 0, 'its audit log');
select test.assert((select count(*) from audit_logs where merchant_id = :m2) = 0, 'not Lola''s audit log');
select test.assert((select count(*) from customer_profiles) = 2, 'the customers who visited');

-- Private columns and status are off limits; ordinary details can be edited.
select test.assert((select count(*) from (select display_name from merchant_staff) s) = 3, 'staff names visible');
select test.assert_raises($$select pin_hash from merchant_staff$$, 'permission denied');
select test.assert_raises($$update merchants set status = 'active'$$, 'permission denied');
with changed as (update merchants set address = 'Magsaysay Avenue' returning id) select test.assert((select count(*) from changed) = 1, 'address edited');
with changed as (update merchant_staff set display_name = 'Ana B.' where id = :ana returning id) select test.assert((select count(*) from changed) = 1, 'a manager renames a cashier');
with changed as (update merchant_staff set display_name = 'Boss' where role = 'owner' returning id) select test.assert((select count(*) from changed) = 0, 'but not the owner');

-- The other owner sees the other merchant only.
select test.as_user(:lola_user);
select test.assert((select count(*) from merchants) = 1 and (select id from merchants) = :m2, 'Lola sees Lola''s');
select test.assert((select count(*) from loyalty_transactions where merchant_id = :m1) = 0, 'not Juan''s transactions');
select test.assert((select count(*) from customer_profiles) = 1, 'only her own customers');

-- A customer sees their own accounts and history, nothing of anyone else's.
select test.as_user(:c1);
select test.assert((select count(*) from loyalty_accounts) = 2, 'two cards');
select test.assert((select count(*) from points_ledger) = 2, 'their two ledger rows');
select test.assert((select count(*) from loyalty_transactions) = 2, 'their two visits');
select test.assert((select count(*) from customer_profiles) = 1, 'their own profile');
select test.assert((select count(*) from merchants) = 0, 'no merchant rows');
select test.assert((select count(*) from merchant_directory) = 2, 'the directory lists both');
select test.assert((select count(*) from branch_directory) = 3, 'and their branches');
select test.assert((select count(*) from rewards) = 2, 'active rewards are visible');

-- Nobody but the server moves points.
select test.assert_raises($$update loyalty_accounts set balance = 999$$, 'permission denied');
select test.assert_raises($$insert into points_ledger (account_id, entry_type, points) select id, 'adjust', 100 from loyalty_accounts limit 1$$, 'permission denied');
select test.assert_raises($$delete from loyalty_transactions$$, 'permission denied');
select test.assert_raises(format($$select award_points('x', %L, %L, %L, %L, %L, 100000)$$, :m1, :b1, :ana, :dev1, :c1), 'permission denied');
select test.assert_raises(format($$select post_entry(id, null, 'adjust', 100) from loyalty_accounts limit 1$$), 'permission denied');
select test.assert_raises($$select verify_member_code('U:AB2CD3EF:123456')$$, 'permission denied');
select test.assert_raises(format($$select issue_redemption_token(%L, '56000000-0000-4000-8000-000000000001')$$, :c1), 'permission denied');
select test.assert_raises($$select check_staff_pin('52000000-0000-4000-8000-0000000000d1', '1234')$$, 'permission denied');
select test.assert(points_for_amount('per_peso', 1, 1000, 0, 20000) = 20, 'the points maths is public');
with changed as (update customer_profiles set display_name = 'Maria C.' returning user_id) select test.assert((select count(*) from changed) = 1, 'a customer edits their name');

-- A suspended merchant drops out of the directory.
select test.reset();
update merchants set status = 'suspended' where id = :m2;
select test.as_user(:c1);
select test.assert((select count(*) from merchant_directory) = 1, 'suspended merchant hidden');
select test.assert((select count(*) from loyalty_programs where merchant_id = :m2) = 1, 'a suspended shop’s card still has its name');
select test.as_user(:c2);
select test.assert((select count(*) from loyalty_programs where merchant_id = :m2) = 0, 'but not for someone who never visited it');

-- A cashier device sees its own row and its own transactions.
select test.as_user(:device_user, 'authenticated', true);
select test.assert((select count(*) from devices) = 1, 'its own device row');
select test.assert((select count(*) from loyalty_transactions) = 2, 'the transactions it made');
select test.assert_raises($$select pin_hash from merchant_staff$$, 'permission denied');

-- Visitors: the waitlist takes entries but shows none; plans and settings are public; nothing else.
select test.as_anon();
insert into waitlist (contact, kind) values ('a@b.ph', 'email');
select test.assert_raises($$select count(*) from waitlist$$, 'permission denied');
select test.assert((select count(*) from plan_limits) = 5, 'plans are public');
select test.assert_raises($$select count(*) from merchants$$, 'permission denied');
select test.assert_raises($$select count(*) from loyalty_accounts$$, 'permission denied');
select test.assert((select count(*) from merchant_directory) = 1, 'the directory is public');
select test.assert_raises($$select register_merchant('X', 'cafe', 'Naga City', null, 1, null, null, false)$$, 'permission denied');

-- Platform admins.
select test.as_user(:rosa_user);
select test.assert((select count(*) from platform_admins) = 0, 'not an admin');
select test.assert((select count(*) from fraud_flags where merchant_id = :m2) = 0, 'no other merchant''s flags');
select test.as_user(:admin_user);
select test.assert((select count(*) from platform_admins) = 1, 'the admin sees admins');
select test.assert((select count(*) from merchants) = 2, 'and every merchant');
select test.assert((select count(*) from audit_logs) > 0, 'and the whole audit log');

-- Functions created by later migrations are not open to clients by default.
select test.reset();
create function public.later_function() returns int language sql as 'select 1';
select test.as_user(:c1);
select test.assert_raises($$select later_function()$$, 'permission denied');
