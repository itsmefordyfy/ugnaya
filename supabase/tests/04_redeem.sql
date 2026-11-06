-- Redemption tokens and redeem_reward: balances, single use, expiry, the right merchant, caps,
-- stock, first-visit offers and the network hold. Seed ids: supabase/seed.sql.
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
\set p1 '''55000000-0000-4000-8000-000000000001'''
\set p2 '''55000000-0000-4000-8000-000000000002'''
\set upsize '''56000000-0000-4000-8000-000000000001'''
\set pastry '''56000000-0000-4000-8000-000000000002'''

-- 20 points isn't enough for a 40-point upsize.
select award_points('k1', :m1, :b1, :ana, :dev1, :c1, 20000);
select test.assert_raises(format($$select issue_redemption_token(%L, %L)$$, :c1, :upsize), 'insufficient_points');

-- At 60 points a token is issued; nothing is deducted until the cashier scans it.
select award_points('k2', :m1, :b1, :ana, :dev1, :c1, 20000);
select award_points('k3', :m1, :b1, :ana, :dev1, :c1, 20000);
select issue_redemption_token(:c1, :upsize) as t1 \gset
select test.assert(abs(extract(epoch from (:'t1'::jsonb ->> 'expires_at')::timestamptz - (now() + interval '5 minutes'))) < 60, 'valid 5 minutes');
select test.assert((:'t1'::jsonb ->> 'points_cost')::int = 40 and :'t1'::jsonb ->> 'reward_name' = 'Free upsize', 'token details');
select test.assert(length(:'t1'::jsonb ->> 'token') = 64, '32 random bytes as hex');
select test.assert((select balance from loyalty_accounts where customer_id = :c1 and program_id = :p1) = 60, 'not deducted at issue');
select test.assert(not exists (select 1 from reward_redemptions where token_hash = :'t1'::jsonb ->> 'token'), 'only the hash is stored');

select redeem_reward('r1', :m1, :b1, :ana, :dev1, :'t1'::jsonb ->> 'token') as r1 \gset
select test.assert((:'r1'::jsonb ->> 'points_cost')::int = 40 and (:'r1'::jsonb ->> 'balance')::int = 20, 'redeemed: 20 left');
select test.assert(:'r1'::jsonb ->> 'reward_name' = 'Free upsize', 'tells the cashier what to give');
select test.assert((select status from reward_redemptions where id = (:'t1'::jsonb ->> 'redemption_id')::uuid) = 'used', 'marked used');

-- A retry of the same scan returns the same answer; a second scan of the token is refused.
select redeem_reward('r1', :m1, :b1, :ana, :dev1, :'t1'::jsonb ->> 'token') as r1b \gset
select test.assert((:'r1b'::jsonb ->> 'replayed')::boolean and :'r1b'::jsonb ->> 'transaction_id' = :'r1'::jsonb ->> 'transaction_id', 'replayed');
select test.assert_raises(format($$select redeem_reward('r2', %L, %L, %L, %L, %L)$$, :m1, :b1, :ana, :dev1, :'t1'::jsonb ->> 'token'), 'token_used');
select test.assert_raises(format($$select redeem_reward('r3', %L, %L, %L, %L, %L)$$, :m1, :b1, :ana, :dev1, repeat('ab', 32)), 'token_invalid');

-- Another merchant's cashier can't redeem Juan's reward.
select test.grant_points(:c1, :p1, 100);
select issue_redemption_token(:c1, :upsize) as t2 \gset
select test.assert_raises(format($$select redeem_reward('r4', %L, %L, %L, %L, %L)$$, :m2, :b3, :ben, :dev2, :'t2'::jsonb ->> 'token'), 'token_invalid');

-- An expired token is refused.
select issue_redemption_token(:c1, :upsize) as t3 \gset
update reward_redemptions set expires_at = now() - interval '1 second' where id = (:'t3'::jsonb ->> 'redemption_id')::uuid;
select test.assert_raises(format($$select redeem_reward('r5', %L, %L, %L, %L, %L)$$, :m1, :b1, :ana, :dev1, :'t3'::jsonb ->> 'token'), 'token_expired');

-- Two tokens for the same points: the second scan finds the points already spent.
select issue_redemption_token(:c1, :pastry) as t4 \gset
select issue_redemption_token(:c1, :pastry) as t5 \gset
select redeem_reward('r6', :m1, :b1, :ana, :dev1, :'t4'::jsonb ->> 'token');
select test.assert_raises(format($$select redeem_reward('r7', %L, %L, %L, %L, %L)$$, :m1, :b1, :ana, :dev1, :'t5'::jsonb ->> 'token'), 'insufficient_points');

-- Monthly cap: one pastry a month at most.
update rewards set monthly_cap = 1 where id = :pastry;
select test.grant_points(:c1, :p1, 240);
select test.assert_raises(format($$select issue_redemption_token(%L, %L)$$, :c1, :pastry), 'monthly_cap');

-- Stock and switched-off rewards.
update rewards set stock = 1 where id = :upsize;
select issue_redemption_token(:c1, :upsize) as t6 \gset
select redeem_reward('r8', :m1, :b1, :ana, :dev1, :'t6'::jsonb ->> 'token');
select test.assert((select stock from rewards where id = :upsize) = 0, 'stock goes down');
select test.assert_raises(format($$select issue_redemption_token(%L, %L)$$, :c1, :upsize), 'reward_unavailable');
update rewards set stock = null, active = false where id = :upsize;
select test.assert_raises(format($$select issue_redemption_token(%L, %L)$$, :c1, :upsize), 'reward_unavailable');

-- First-visit offers: only for a customer who has never been awarded at that merchant.
insert into rewards (id, merchant_id, program_id, name, points_cost, first_visit_only)
values ('56000000-0000-4000-8000-0000000000f1', :m2, :p2, 'Free iced tea, first visit', 20, true);
select test.grant_points(:c1, :p2, 50);
select issue_redemption_token(:c1, '56000000-0000-4000-8000-0000000000f1') as t7 \gset
select test.assert(:'t7'::jsonb ->> 'token' is not null, 'a first-timer gets the offer');
select award_points('k4', :m2, :b3, :ben, :dev2, :c1, 20000);
select test.assert_raises(format($$select issue_redemption_token(%L, %L)$$, :c1, '56000000-0000-4000-8000-0000000000f1'), 'first_visit_only');

-- Network points can't be spent while they're held.
update platform_settings set value = 'true' where key = 'network_enabled';
update loyalty_programs set active = true where scope = 'network';
select award_points('k5', :m1, :b1, :ana, :dev1, :c2, 25000);
insert into rewards (id, merchant_id, program_id, name, points_cost, is_network_offer)
values ('56000000-0000-4000-8000-0000000000e1', :m2, '00000000-0000-0000-0000-000000000001', 'Free dessert', 10, true);
select test.assert_raises(format($$select issue_redemption_token(%L, %L)$$, :c2, '56000000-0000-4000-8000-0000000000e1'), 'insufficient_points');

select test.assert((select count(*) from check_ledger()) = 0, 'ledger and balances agree');
select test.assert((select count(*) from audit_logs where action = 'points.redeemed') = 3, 'every redemption audited');
