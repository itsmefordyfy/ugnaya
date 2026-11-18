-- Merchant portal: owners and managers only, branch managers see their branches, the approval gate holds,
-- staff invitations are single-use and email-bound, and the web counter awards and redeems idempotently.
\set m1 '''50000000-0000-4000-8000-000000000001'''
\set m2 '''50000000-0000-4000-8000-000000000002'''
\set b1 '''51000000-0000-4000-8000-000000000001'''
\set b2 '''51000000-0000-4000-8000-000000000002'''
\set owner_user '''52000000-0000-4000-8000-000000000001'''
\set rosa_user '''52000000-0000-4000-8000-000000000002'''
\set lola_user '''52000000-0000-4000-8000-000000000003'''
\set device_user '''52000000-0000-4000-8000-0000000000d1'''
\set rosa_staff '''53000000-0000-4000-8000-000000000002'''
\set owner_staff '''53000000-0000-4000-8000-000000000001'''
\set c1 '''57000000-0000-4000-8000-000000000001'''

-- Everyone here proved their email (joining a business needs that).
update auth.users set email_confirmed_at = now();

-- Activity at both of Juan's branches.
select award_points('a1', :m1, :b1, :rosa_staff, null, :c1, 20000);
select award_points('a2', :m1, :b2, :owner_staff, null, :c1, 30000);

-- The owner sees everything; Rosa (manager of Magsaysay only) sees her branch; Lola sees nothing of Juan's.
select test.as_user(:owner_user);
select test.assert((merchant_dashboard(:m1) -> 'transactions' ->> 'award')::int = 2, 'owner: both awards');
select test.assert(jsonb_array_length(merchant_dashboard(:m1) -> 'branches') = 2, 'owner: both branches');
select test.assert((merchant_dashboard(:m1) ->> 'members')::int = 1, 'one member');
select test.assert((merchant_customers(:m1, 'AB2') ->> 'total')::int = 1, 'members searchable by member id');
select test.as_user(:rosa_user);
select test.assert((merchant_dashboard(:m1) -> 'transactions' ->> 'award')::int = 1, 'branch manager: her branch only');
select test.assert((merchant_transactions(:m1) ->> 'total')::int = 1, 'and only her branch''s transactions');
select test.as_user(:lola_user);
select test.assert_raises(format('select merchant_dashboard(%L)', :m1), 'forbidden');
select test.assert_raises(format('select merchant_transactions(%L)', :m1), 'forbidden');
select test.as_user(:device_user, 'authenticated', true);
select test.assert_raises(format('select merchant_dashboard(%L)', :m1), 'forbidden');

-- Staff: a manager adds cashiers only; PINs are unique; nobody changes their own role.
select test.as_user(:rosa_user);
select test.assert_raises(format('select merchant_add_staff(%L, %L, %L, %L)', :m1, 'Pepe', 'manager', 'owner2@demo.ugnaya.ph'), 'use_invite');
select test.assert_raises(format('select merchant_add_staff(%L, %L, %L, null, %L, %L)', :m1, 'Pepe', 'cashier', array[:b1::uuid], '1234'), 'pin_taken');
select merchant_add_staff(:m1, 'Pepe', 'cashier', null, array[:b1::uuid], '4321');
select test.as_user(:owner_user);
select test.assert_raises(format('select merchant_update_staff(%L, %L, %L, null, true)', :owner_staff, 'Juan', 'manager'), 'forbidden');
select test.assert_raises(format('select merchant_add_staff(%L, %L, %L)', :m1, 'Boss', 'owner'), 'use_invite');

-- Invitations: bound to the invited email, single use.
create temp table inv (token text);
grant select, insert on inv to authenticated;
insert into inv select merchant_invite_staff(:m1, 'Pedro@Demo.ugnaya.ph', 'Pedro', 'cashier', array[:b2::uuid]);
select test.assert((merchant_invite_preview((select token from inv)) ->> 'trade_name') = 'Kape ni Juan', 'the link names the shop');
select test.as_user(:lola_user);
select test.assert_raises(format('select merchant_accept_invite(%L)', (select token from inv)), 'invite_wrong_account');
select test.as_user('57000000-0000-4000-8000-000000000002');
select test.assert(merchant_accept_invite((select token from inv)) = :m1, 'Pedro joins');
select test.assert_raises(format('select merchant_accept_invite(%L)', (select token from inv)), 'invite_invalid');
select test.reset();
select test.assert((select role::text from merchant_staff where merchant_id = :m1 and user_id = '57000000-0000-4000-8000-000000000002') = 'cashier',
  'Pedro is a cashier at Kape ni Juan');

-- The approval gate: a draft business can't publish rewards or campaigns or invite staff, but can keep drafts.
insert into auth.users (id, email) values ('62000000-0000-4000-8000-000000000001', 'new@example.com');
select test.as_user('62000000-0000-4000-8000-000000000001');
create temp table nm as select register_merchant('Draft Cafe', 'cafe', 'Iloilo', null, 1, null, null, false) as id;
grant select on nm to authenticated;
select test.assert_raises(format($$insert into rewards (merchant_id, program_id, name, points_cost)
  select %L, id, 'Free', 10 from loyalty_programs where merchant_id = %L$$, (select id from nm), (select id from nm)), 'new row violates row-level security policy for table "rewards"');
select test.assert_raises(format($$insert into campaigns (merchant_id, name, kind, status) values (%L, 'Launch', 'promotion', 'running')$$,
  (select id from nm)), 'new row violates row-level security policy for table "campaigns"');
insert into campaigns (merchant_id, name, kind, status) select id, 'Launch', 'promotion', 'draft' from nm;
select test.assert_raises(format('select merchant_invite_staff(%L, %L, %L, %L)', (select id from nm), 'x@example.com', 'X', 'cashier'), 'merchant_not_approved');
select test.assert_raises(format('select merchant_submit_application(%L)', (select id from nm)), 'documents_required');
-- Documents only under its own folder, and the stored object must exist.
select test.assert_raises(format('select merchant_add_document(%L, %L, %L, %L, %L, 10)', (select id from nm), 'permit',
  :m1 || '/x.pdf', 'x.pdf', 'application/pdf'), 'forbidden');
select test.assert_raises(format('select merchant_add_document(%L, %L, %L, %L, %L, 10)', (select id from nm), 'permit',
  (select id::text from nm) || '/x.pdf', 'x.pdf', 'application/pdf'), 'file_missing');
-- Storage: a merchant uploads into its own folder only; another business can't read it.
insert into storage.objects (bucket_id, name) select 'merchant-documents', id::text || '/permit.pdf' from nm;
select test.assert_raises(format($$insert into storage.objects (bucket_id, name) values ('merchant-documents', %L)$$, :m1 || '/evil.pdf'),
  'new row violates row-level security policy for table "objects"');
select test.as_user(:owner_user);
select test.assert((select count(*) from storage.objects where bucket_id = 'merchant-documents' and name like (select id::text from nm) || '/%') = 0,
  'another business can''t see the documents');

-- The web counter: a member's single-use web code, idempotent awards, vouchers redeemed once.
select test.reset();
insert into member_web_codes (customer_id, code_hash, expires_at)
values (:c1, encode(extensions.digest('webcode123456', 'sha256'), 'hex'), now() + interval '5 minutes');
select test.as_user(:rosa_user);
create temp table aw as select counter_award(:m1, :b1, 'U:AB2CD3EF:Wwebcode123456', 15000, 'OR-77', 'web-1') as r;
select test.assert(((select r from aw) -> 'merchant' ->> 'points_earned')::int = 15, '₱150 earns 15 points');
select test.assert((counter_award(:m1, :b1, 'U:AB2CD3EF:Wwebcode123456', 15000, 'OR-77', 'web-1') ->> 'replayed')::boolean,
  'a double submit replays instead of awarding twice');
select test.assert_raises(format('select counter_award(%L, %L, %L, 100, null, %L)', :m1, :b2, 'U:AB2CD3EF:Wwebcode123456', 'web-2'), 'invalid_member_code');
select test.as_user(:lola_user);
select test.assert_raises(format('select counter_award(%L, %L, %L, 100, null, %L)', :m1, :b1, 'U:AB2CD3EF:Wx', 'web-3'), 'forbidden');
select test.reset();
create temp table tok as select issue_redemption_token(:c1, '56000000-0000-4000-8000-000000000001') as t;
grant select on tok to authenticated;
select test.as_user(:rosa_user);
select test.assert((counter_redeem(:m1, :b1, 'R:' || ((select t from tok) ->> 'token'), 'red-1') ->> 'points_cost')::int = 40, 'voucher redeemed');
select test.assert_raises(format('select counter_redeem(%L, %L, %L, %L)', :m1, :b1, 'R:' || ((select t from tok) ->> 'token'), 'red-2'), 'token_used');
select test.reset();
select test.assert(not exists (select * from check_ledger()), 'ledger consistent after counter activity');

-- A branch manager can't widen their own access (branches, role, active); only their name is theirs to change.
select test.as_user(:rosa_user);
select test.assert_raises(format('select merchant_update_staff(%L, %L, %L, null, true)', :rosa_staff, 'Rosa', 'manager'), 'cannot_change_self');
select test.assert_raises(format('select merchant_update_staff(%L, %L, %L, %L, true)', :rosa_staff, 'Rosa', 'manager',
  array[:b1::uuid, :b2::uuid]), 'cannot_change_self');
select merchant_update_staff(:rosa_staff, 'Rosa S.', 'manager', array[:b1::uuid], true);
select test.reset();
select test.assert((select display_name from merchant_staff where id = :rosa_staff) = 'Rosa S.', 'but she can rename herself');
