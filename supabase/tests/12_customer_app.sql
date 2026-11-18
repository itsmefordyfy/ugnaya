-- Customer app: each function answers for the signed-in customer only, discovery shows active businesses,
-- points movements create notifications, and deleting an account removes personal data but keeps the ledger.
\set m1 '''50000000-0000-4000-8000-000000000001'''
\set m2 '''50000000-0000-4000-8000-000000000002'''
\set b1 '''51000000-0000-4000-8000-000000000001'''
\set rosa_staff '''53000000-0000-4000-8000-000000000002'''
\set c1 '''57000000-0000-4000-8000-000000000001'''
\set c2 '''57000000-0000-4000-8000-000000000002'''
\set owner_user '''52000000-0000-4000-8000-000000000001'''

-- Maria earns at Kape ni Juan (the notification is written when the transaction commits).
select award_points('c-1', :m1, :b1, :rosa_staff, null, :c1, 50000);
select test.assert((select count(*) from notifications where recipient_id = :c1 and kind = 'points_earned' and channel = 'in_app') = 1,
  'an in-app notification for the points');

select test.as_user(:c1);
select test.assert(customer_wallet() ->> 'member_id' = 'AB2CD3EF', 'her member id');
select test.assert((select (a ->> 'balance')::int from jsonb_array_elements(customer_wallet() -> 'accounts') a where a ->> 'scope' = 'merchant') = 50,
  '50 points at Kape ni Juan');
select test.assert((select a ->> 'expires_at' from jsonb_array_elements(customer_wallet() -> 'accounts') a where a ->> 'scope' = 'merchant') is not null,
  'with an expiry date');
select test.assert(jsonb_array_length(customer_activity()) = 1 and jsonb_array_length(customer_activity('redeemed')) = 0, 'activity filtered');
select test.assert((customer_home() -> 'points' ->> 'merchant')::int = 50, 'home totals');
select test.assert((customer_home() ->> 'unread_notifications')::int = 1, 'one unread');
select test.assert(jsonb_array_length(customer_merchants()) = 2, 'two active businesses');
select test.assert(jsonb_array_length(customer_merchants('lola')) = 1, 'search');
select test.assert(jsonb_array_length(customer_merchants(null, 'restaurant')) = 1, 'category filter');
select test.assert((customer_merchants(null, null, 13.6280, 123.1950, 'nearby') -> 0 ->> 'trade_name') = 'Kape ni Juan', 'nearest first');
select test.assert((select (r ->> 'eligible')::boolean from jsonb_array_elements(customer_merchant(:m1) -> 'rewards') r where r ->> 'name' = 'Free upsize'),
  'eligible for the 40-point reward');
select test.assert(jsonb_array_length(customer_rewards(null, true)) = 1, 'one reward she can afford');
insert into customer_favorites (customer_id, merchant_id) values (:c1, :m2);
select test.assert(jsonb_array_length(customer_merchants(null, null, null, null, 'favorites')) = 1, 'favourites');
select test.assert_raises(format('insert into customer_favorites (customer_id, merchant_id) values (%L, %L)', :c2, :m1),
  'new row violates row-level security policy for table "customer_favorites"');
update notifications set read_at = now() where recipient_id = :c1;
select test.assert((customer_home() ->> 'unread_notifications')::int = 0, 'marked read');
select register_push_token('ExponentPushToken[abcdefghijklmnop]', 'ios');
select test.assert_raises($$select register_push_token('not-a-token', 'ios')$$, 'token_invalid');

-- A merchant owner isn't a customer; a suspended business disappears from discovery.
select test.as_user(:owner_user);
select test.assert_raises($$select customer_wallet()$$, 'customer_unknown');
select test.reset();
update merchants set status = 'suspended' where id = :m2;
select test.as_user(:c1);
select test.assert(jsonb_array_length(customer_merchants()) = 1, 'suspended business hidden');
select test.assert_raises(format('select customer_merchant(%L)', :m2), 'merchant_not_found');

-- Pedro sees none of Maria's data.
select test.as_user(:c2);
select test.assert(jsonb_array_length(customer_activity()) = 0 and jsonb_array_length(customer_wallet() -> 'accounts') = 0, 'nothing of Maria''s');

-- The push function reads the preference and the tokens (service role only).
select test.as_user(:c1);
select test.assert_raises(format('select push_payload(%L)', (select id from notifications limit 1)), 'permission denied');
select test.as_service();
select test.assert((push_payload((select id from notifications where recipient_id = '57000000-0000-4000-8000-000000000001' limit 1)) -> 'tokens' ->> 0)
  = 'ExponentPushToken[abcdefghijklmnop]', 'the token is there for the push');

-- Deleting the account.
select test.as_user(:c1);
select delete_my_account();
select test.reset();
select test.assert((select deleted_at is not null and display_name is null from customer_profiles where user_id = :c1), 'profile pseudonymised');
select test.assert((select email like 'deleted-%' and banned_until > now() from auth.users where id = :c1), 'sign-in closed, email freed');
select test.assert(not exists (select 1 from push_tokens where user_id = :c1) and not exists (select 1 from customer_favorites where customer_id = :c1),
  'tokens and favourites gone');
select test.assert((select count(*) from points_ledger l join loyalty_accounts a on a.id = l.account_id where a.customer_id = :c1) > 0,
  'the ledger stays (append-only)');
select test.assert(not exists (select * from check_ledger()), 'and still adds up');
select test.as_user(:c1);
select test.assert_raises($$select customer_wallet()$$, 'customer_unknown');
