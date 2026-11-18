-- Fixes from the portal security review (2026-11-07).
\set m1 '''50000000-0000-4000-8000-000000000001'''
\set b1 '''51000000-0000-4000-8000-000000000001'''
\set b2 '''51000000-0000-4000-8000-000000000002'''
\set owner_user '''52000000-0000-4000-8000-000000000001'''
\set rosa_user '''52000000-0000-4000-8000-000000000002'''
\set rosa_staff '''53000000-0000-4000-8000-000000000002'''
\set ana_staff '''53000000-0000-4000-8000-000000000003'''
\set c1 '''57000000-0000-4000-8000-000000000001'''
\set c2 '''57000000-0000-4000-8000-000000000002'''
\set sa '''52000000-0000-4000-8000-0000000000a1'''
\set sup '''60000000-0000-4000-8000-000000000004'''
\set hire '''60000000-0000-4000-8000-000000000009'''
\set squat '''60000000-0000-4000-8000-000000000010'''
\set ctx '{"request_id":"req-s","ip":"203.0.113.1","user_agent":"t"}'

insert into auth.users (id, email, email_confirmed_at) values
  (:sup, 'sup@ugnaya.test', now()), (:hire, 'hire@ugnaya.test', now());
insert into admin_members (user_id, role) values (:sup, 'support_admin');
update auth.users set email_confirmed_at = now();

-- 1. Nobody is attached to a business by email without accepting an invitation; the staff table isn't writable directly.
select test.as_user(:owner_user);
select test.assert_raises(format('select merchant_add_staff(%L, %L, %L, %L, null, %L)', :m1, 'Victim', 'cashier', 'pedro@demo.ugnaya.ph', '9999'), 'use_invite');
select test.assert_raises(format($$insert into merchant_staff (merchant_id, user_id, display_name, role) values (%L, %L, 'X', 'cashier')$$, :m1, :c2), 'permission denied');
select test.assert_raises(format($$update merchant_staff set role = 'owner' where id = %L$$, :ana_staff), 'permission denied');
with changed as (update merchant_staff set display_name = 'Ana B.' where id = :ana_staff returning id)
  select test.assert((select count(*) from changed) = 1, 'names, branches and active are still editable directly');

-- 2. Invitations need a confirmed email.
select test.reset();
insert into auth.users (id, email) values (:squat, 'new.cashier@example.com');
select test.as_user(:owner_user);
create temp table inv (token text);
grant select on inv to authenticated;
insert into inv select merchant_invite_staff(:m1, 'new.cashier@example.com', 'New', 'cashier');
select test.as_user(:squat);
select test.assert_raises(format('select merchant_accept_invite(%L)', (select token from inv)), 'email_unconfirmed');

-- 3. Administrators join only with an invitation token, as the invited, confirmed address.
select test.as_user(:sa, 'authenticated', false, 'aal2');
select test.assert_raises($$select admin_grant_by_email('hire@ugnaya.test', 'analyst', 'x')$$, 'permission denied');
create temp table ainv (token text);
grant select on ainv to authenticated;
insert into ainv select admin_invite('hire@ugnaya.test', 'operations_admin', 'New ops hire', :'ctx');
select test.as_user(:squat);
select test.assert_raises(format('select admin_accept_invite(%L)', (select token from ainv)), 'invite_wrong_account');
select test.as_user(:hire);
select test.assert((admin_invite_preview((select token from ainv)) ->> 'role') = 'operations_admin', 'the invite shows the role');
select admin_accept_invite((select token from ainv));
select test.assert_raises(format('select admin_accept_invite(%L)', (select token from ainv)), 'invite_invalid');
select test.assert(current_admin_role() = 'operations_admin' and not has_admin_permission('merchants.view'), 'joined, but nothing works before the second factor');
select test.reset();
select test.assert((select count(*) from audit_logs where action in ('admin.invited', 'admin.invite_accepted')) = 2, 'both steps audited');
select test.as_user(:sa, 'authenticated', false, 'aal2');
select test.assert_raises($$select admin_invite('nobody-yet@ugnaya.test', 'super_admin', '')$$, 'reason_required');

-- 4. Businesses don't see UGNAYA's internal audit rows.
select admin_review_merchant(:m1, 'suspend', 'Internal: fraud ring suspected', null, null, :'ctx');
select admin_review_merchant(:m1, 'reactivate', 'Cleared', null, null, :'ctx');
select test.as_user(:owner_user);
select test.assert((select count(*) from audit_logs where actor_role like 'admin:%') = 0, 'no admin rows for the business');
select test.assert((select count(*) from merchant_reviews where merchant_id = :m1) = 2, 'decisions reach them through the review history');

-- 5. Verification documents need merchants.review or users.view_pii.
select test.as_user(:sup, 'authenticated', false, 'aal2');
select test.assert_raises(format('select admin_merchant_documents(%L)', :m1), 'forbidden');

-- 6. A branch manager stays inside their branches.
select test.as_user(:rosa_user);
with changed as (update merchant_branches set name = 'Mine now' where id = :b2 returning id)
  select test.assert((select count(*) from changed) = 0, 'can''t edit another branch');
with changed as (update merchant_branches set name = 'Magsaysay HQ' where id = :b1 returning id)
  select test.assert((select count(*) from changed) = 1, 'edits her own');
select test.assert_raises(format($$insert into merchant_branches (merchant_id, name) values (%L, 'New')$$, :m1),
  'new row violates row-level security policy for table "merchant_branches"');
select test.assert_raises(format('select merchant_invite_staff(%L, %L, %L, %L, %L)', :m1, 'z@example.com', 'Z', 'cashier', array[:b2::uuid]), 'branch_out_of_scope');
select test.assert_raises(format('select merchant_invite_staff(%L, %L, %L, %L)', :m1, 'z@example.com', 'Z', 'cashier'), 'branch_out_of_scope');
select test.assert_raises(format('select merchant_update_staff(%L, %L, %L, %L, true)', :ana_staff, 'Ana', 'cashier', array[:b2::uuid]), 'branch_out_of_scope');

-- 7. An approved business's legal identity is fixed; the logo must be its own file.
select test.as_user(:owner_user);
select test.assert_raises(format($$update merchants set trade_name = 'Other Name' where id = %L$$, :m1), 'identity_locked');
select test.assert_raises(format($$update merchants set logo_path = '50000000-0000-4000-8000-000000000002/logo-x.png' where id = %L$$, :m1), 'logo_invalid');
update merchants set logo_path = '50000000-0000-4000-8000-000000000001/logo-abc.png', description = 'Coffee' where id = :m1;

-- 8. Documents can't be removed once the application is with UGNAYA.
select test.reset();
insert into auth.users (id, email, email_confirmed_at) values ('63000000-0000-4000-8000-000000000001', 'd@example.com', now());
select test.as_user('63000000-0000-4000-8000-000000000001');
create temp table dm as select register_merchant('Doc Cafe', 'cafe', 'Cebu', null, 1, null, null, false) as id;
grant select on dm to authenticated;
select test.reset();
insert into storage.objects (bucket_id, name) select 'merchant-documents', id::text || '/a.pdf' from dm;
select test.as_user('63000000-0000-4000-8000-000000000001');
create temp table doc as select merchant_add_document((select id from dm), 'permit', (select id::text from dm) || '/a.pdf', 'a.pdf', 'application/pdf', 5) as id;
grant select on doc to authenticated;
select merchant_submit_application((select id from dm));
select test.assert_raises(format('select merchant_remove_document(%L)', (select id from doc)), 'application_locked');
