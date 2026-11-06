-- Merchant sign-up, verification, customer profiles and cashier PINs.
insert into auth.users (id, email, raw_user_meta_data) values
  ('10000000-0000-4000-8000-000000000001', 'juan@example.com', '{"user_type":"merchant","full_name":"Juan Dela Cruz"}'),
  ('10000000-0000-4000-8000-000000000002', null, '{}'),
  ('10000000-0000-4000-8000-000000000003', 'admin@ugnaya.ph', '{}'),
  ('10000000-0000-4000-8000-000000000004', 'maria@example.com', '{"user_type":"customer","full_name":"Maria"}');
update auth.users set is_anonymous = true where id = '10000000-0000-4000-8000-000000000002';

-- Juan registers his café.
select test.as_user('10000000-0000-4000-8000-000000000001');
create temp table r as
  select register_merchant('Kape ni Juan', 'cafe', 'Naga City', 'Magsaysay Ave', 1, '+639171234567', 'facebook', true) as id;
select test.reset();

select test.assert((select count(*) from merchants where id = (select id from r)) = 1, 'one merchant');
select test.assert((select status from merchants where id = (select id from r)) = 'pending_verification', 'pending until verified');
select test.assert((select terms_accepted_at is not null and privacy_accepted_at is not null and marketing_consent_at is not null
  from merchants where id = (select id from r)), 'consents recorded with timestamps');
select test.assert((select count(*) from merchant_branches where merchant_id = (select id from r) and name = 'Kape ni Juan') = 1, 'first branch named after the business');
select test.assert((select display_name from merchant_staff where merchant_id = (select id from r) and role = 'owner'
  and user_id = '10000000-0000-4000-8000-000000000001') = 'Juan Dela Cruz', 'Juan is the owner');
select test.assert((select plan from subscriptions where merchant_id = (select id from r)) = 'free', 'starts on Free');
select test.assert((select founding from subscriptions where merchant_id = (select id from r)) = false, 'not founding until the founder says so');
select test.assert((select count(*) from merchant_limits where merchant_id = (select id from r)) = 1, 'default limits');
select test.assert((select count(*) from audit_logs where action = 'merchant.registered' and entity_id = (select id::text from r)) = 1, 'audited');
select test.assert((select count(*) from loyalty_programs where merchant_id = (select id from r) and scope = 'merchant' and not active) = 1,
  'its own points program, off until verified');

-- A second sign-up by the same owner, or by an anonymous device, is refused.
select test.as_user('10000000-0000-4000-8000-000000000001');
select test.assert_raises($$select register_merchant('Again', 'cafe', 'Naga City', null, 1, null, null, false)$$, 'already_registered');
select test.as_user('10000000-0000-4000-8000-000000000002', 'authenticated', true);
select test.assert_raises($$select register_merchant('Device', 'cafe', 'Naga City', null, 1, null, null, false)$$, 'sign_in_required');
select test.as_anon();
select test.assert_raises($$select register_merchant('Nobody', 'cafe', 'Naga City', null, 1, null, null, false)$$, 'sign_in_required');

-- Only a platform admin verifies.
select test.as_user('10000000-0000-4000-8000-000000000003');
select test.assert_raises(format($$select verify_merchant(%L, 'growth', true)$$, (select id from r)), 'forbidden');
select test.reset();
insert into platform_admins (user_id) values ('10000000-0000-4000-8000-000000000003');
select test.as_user('10000000-0000-4000-8000-000000000003');
select verify_merchant((select id from r), 'growth', true);
select test.reset();
select test.assert((select status from merchants where id = (select id from r)) = 'active', 'verified');
select test.assert((select verified_by from merchants where id = (select id from r)) = '10000000-0000-4000-8000-000000000003', 'who verified');
select test.assert((select plan = 'growth' and founding and founding_until = (current_date + interval '12 months')::date
  from subscriptions where merchant_id = (select id from r)), 'founding Growth for 12 months');
select test.assert((select active from loyalty_programs where merchant_id = (select id from r)), 'program on once verified');

-- Customers get a profile and a member id; merchants don't.
select test.assert((select public_member_id ~ '^[A-HJ-NP-Z2-9]{8}$' from customer_profiles
  where user_id = '10000000-0000-4000-8000-000000000004'), 'customer member id');
select test.assert((select display_name from customer_profiles where user_id = '10000000-0000-4000-8000-000000000004') = 'Maria', 'customer name');
select test.assert(not exists (select 1 from customer_profiles where user_id = '10000000-0000-4000-8000-000000000001'), 'no profile for a merchant');

-- A cashier with a PIN unlocks a registered device at their branch.
insert into auth.users (id, is_anonymous) values ('10000000-0000-4000-8000-0000000000d1', true);
insert into devices (id, merchant_id, branch_id, user_id, name)
  select '20000000-0000-4000-8000-0000000000d1', (select id from r), b.id, '10000000-0000-4000-8000-0000000000d1', 'Counter tablet'
  from merchant_branches b where b.merchant_id = (select id from r);
insert into merchant_staff (id, merchant_id, display_name, role)
  values ('30000000-0000-4000-8000-000000000001', (select id from r), 'Ana', 'cashier');
select test.as_user('10000000-0000-4000-8000-000000000001');
select set_staff_pin('30000000-0000-4000-8000-000000000001', '1234');
select test.assert_raises($$select set_staff_pin('30000000-0000-4000-8000-000000000001', '12')$$, 'pin_invalid');
select test.assert_raises($$select set_staff_pin('30000000-0000-4000-8000-000000000001', '12ab')$$, 'pin_invalid');
-- Two cashiers can't share a PIN: the PIN alone says who is at the counter.
select test.reset();
insert into merchant_staff (id, merchant_id, display_name, role)
  values ('30000000-0000-4000-8000-000000000002', (select id from r), 'Ben', 'cashier');
select test.as_user('10000000-0000-4000-8000-000000000001');
select test.assert_raises($$select set_staff_pin('30000000-0000-4000-8000-000000000002', '1234')$$, 'pin_taken');
select set_staff_pin('30000000-0000-4000-8000-000000000002', '5678');
select test.as_user('10000000-0000-4000-8000-000000000004');
select test.assert_raises($$select set_staff_pin('30000000-0000-4000-8000-000000000001', '0000')$$, 'forbidden');
select test.reset();
select test.assert((select pin_hash <> '1234' from merchant_staff where id = '30000000-0000-4000-8000-000000000001'), 'PIN stored hashed');
select test.assert(check_staff_pin('10000000-0000-4000-8000-0000000000d1', '1234') = '30000000-0000-4000-8000-000000000001', 'right PIN unlocks');
select test.assert_raises($$select check_staff_pin('10000000-0000-4000-8000-0000000000d1', '9999')$$, 'staff_not_allowed');
select test.assert_raises($$select check_staff_pin('10000000-0000-4000-8000-0000000000d1', '12')$$, 'staff_not_allowed');
update devices set revoked_at = now() where id = '20000000-0000-4000-8000-0000000000d1';
select test.assert_raises($$select check_staff_pin('10000000-0000-4000-8000-0000000000d1', '1234')$$, 'device_not_allowed');
