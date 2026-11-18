-- Super Admin RBAC: roles and permissions are enforced inside the database, a second factor is required,
-- every change is audited, the audit log can't be edited, and revocation is immediate.
\set sa '''60000000-0000-4000-8000-000000000001'''
\set ops '''60000000-0000-4000-8000-000000000002'''
\set fin '''60000000-0000-4000-8000-000000000003'''
\set sup '''60000000-0000-4000-8000-000000000004'''
\set ana '''60000000-0000-4000-8000-000000000005'''
\set newbie '''60000000-0000-4000-8000-000000000006'''
\set owner_user '''52000000-0000-4000-8000-000000000001'''
\set device_user '''52000000-0000-4000-8000-0000000000d1'''
\set customer '''57000000-0000-4000-8000-000000000001'''
\set ctx '{"request_id":"req-1","ip":"203.0.113.5","user_agent":"test-agent"}'

insert into auth.users (id, email) values
  (:sa, 'sa@ugnaya.test'), (:ops, 'ops@ugnaya.test'), (:fin, 'fin@ugnaya.test'),
  (:sup, 'sup@ugnaya.test'), (:ana, 'ana@ugnaya.test'), (:newbie, 'newbie@ugnaya.test');
-- Admin access goes only to confirmed addresses (security review, 2026-11-07).
update auth.users set email_confirmed_at = now() where email like '%@ugnaya.test';
insert into admin_members (user_id, role) values
  (:sa, 'super_admin'), (:ops, 'operations_admin'), (:fin, 'finance_admin'), (:sup, 'support_admin'), (:ana, 'analyst');

-- Customers, merchant owners and cashier devices hold no permission, even with a second factor.
select test.as_user(:customer, 'authenticated', false, 'aal2');
select test.assert(current_admin_role() is null and not has_admin_permission('analytics.view'), 'a customer is not an admin');
select test.assert_raises($$select admin_list_members()$$, 'forbidden');
select test.assert_raises($$select admin_record_event('admin.login', '{}')$$, 'forbidden');
select test.as_user(:owner_user, 'authenticated', false, 'aal2');
select test.assert(not has_admin_permission('merchants.review') and not is_platform_admin(), 'a merchant owner is not an admin');
select test.as_user(:device_user, 'authenticated', true, 'aal2');
select test.assert(not has_admin_permission('merchants.review'), 'a cashier device is not an admin');
select test.as_anon();
select test.assert_raises($$select admin_list_members()$$, 'permission denied');

-- A password is not enough: without the second factor (aal2) even a super admin can do nothing.
select test.as_user(:sa, 'authenticated', false, 'aal1');
select test.assert(not has_admin_permission('admins.manage') and not is_platform_admin(), 'no permission at aal1');
select test.assert_raises($$select admin_list_members()$$, 'forbidden');
select test.assert((admin_me() ->> 'mfa')::boolean = false and admin_me() ->> 'role' = 'super_admin', 'but they can see they must enrol or verify');
select test.as_user(:sa, 'authenticated', false, 'aal2');
select test.assert(has_admin_permission('admins.manage') and is_platform_admin(), 'with the second factor, full access');
select test.assert((select count(*) from admin_list_members()) = 6, 'a super admin lists the team (these five plus the seeded demo admin)');

-- Least privilege: each role holds exactly its own permissions.
select test.as_user(:ops, 'authenticated', false, 'aal2');
select test.assert(has_admin_permission('merchants.review') and has_admin_permission('users.suspend'), 'operations reviews and suspends');
select test.assert(not has_admin_permission('admins.manage') and not has_admin_permission('finance.view') and not has_admin_permission('users.view_pii'), 'operations has no finance, no admin management, no sensitive fields');
select test.assert_raises($$select admin_grant('60000000-0000-4000-8000-000000000006', 'analyst', 'trying', '{}')$$, 'forbidden');
select test.as_user(:fin, 'authenticated', false, 'aal2');
select test.assert(has_admin_permission('finance.view') and has_admin_permission('finance.export'), 'finance sees and exports revenue');
select test.assert(not has_admin_permission('users.view') and not has_admin_permission('merchants.review') and not has_admin_permission('users.view_pii'), 'finance does not get personal data or approvals');
select test.as_user(:sup, 'authenticated', false, 'aal2');
select test.assert(has_admin_permission('users.view') and has_admin_permission('notes.write'), 'support searches users and adds notes');
select test.assert(not has_admin_permission('merchants.review') and not has_admin_permission('finance.view') and not has_admin_permission('users.view_pii') and not has_admin_permission('settings.manage'), 'support cannot approve, see money, see sensitive fields or change settings');
select test.as_user(:ana, 'authenticated', false, 'aal2');
select test.assert(has_admin_permission('analytics.view'), 'an analyst reads aggregates');
select test.assert(not has_admin_permission('notes.write') and not has_admin_permission('users.view') and not has_admin_permission('merchants.review') and not has_admin_permission('finance.view'), 'and is read-only');

-- Table access through row-level security is for super admins at aal2 only; other roles use the checked functions.
select test.as_user(:ops, 'authenticated', false, 'aal2');
select test.assert((select count(*) from merchants) = 0, 'operations cannot read the merchants table directly');
select test.as_user(:sa, 'authenticated', false, 'aal1');
select test.assert((select count(*) from merchants) = 0, 'a super admin without a second factor reads nothing');
select test.as_user(:sa, 'authenticated', false, 'aal2');
select test.assert((select count(*) from merchants) = 2, 'with it they read everything');

-- Granting, changing and revoking: audited, reasoned, immediate.
select test.assert_raises(format($$select admin_grant(%L, 'analyst', '', %L::jsonb)$$, :newbie, :'ctx'), 'reason_required');
select test.assert_raises(format($$select admin_grant(%L, 'analyst', 'x', %L::jsonb)$$, '60000000-0000-4000-8000-0000000000ff', :'ctx'), 'user_not_found');
select admin_grant(:newbie, 'analyst', 'Joining the analytics team', :'ctx'::jsonb);
select test.assert((select role = 'analyst' and active from admin_members where user_id = :newbie), 'granted');
select test.assert((select count(*) from audit_logs where action = 'admin.granted' and actor_user_id = :sa and entity_id = :newbie::text
  and reason = 'Joining the analytics team' and request_id = 'req-1' and ip = '203.0.113.5' and user_agent = 'test-agent'
  and after ->> 'role' = 'analyst') = 1, 'the grant is audited with the actor, reason, request id, IP and agent');
select test.assert_raises(format($$select admin_grant(%L, 'analyst', 'again', '{}')$$, :newbie), 'already_admin');
select test.as_user(:newbie, 'authenticated', false, 'aal2');
select test.assert(has_admin_permission('analytics.view'), 'the new analyst works at once');
select test.as_user(:sa, 'authenticated', false, 'aal2');
select admin_set_role(:newbie, 'finance_admin', 'Moving to finance', :'ctx'::jsonb);
select test.assert((select count(*) from audit_logs where action = 'admin.role_changed' and before ->> 'role' = 'analyst' and after ->> 'role' = 'finance_admin') = 1, 'role changes record the old and new role');
select admin_revoke(:newbie, 'Left the company', :'ctx'::jsonb);
select test.assert((select not active and revoked_at is not null and revoked_by = :sa from admin_members where user_id = :newbie), 'revoked');
select test.as_user(:newbie, 'authenticated', false, 'aal2');
select test.assert(current_admin_role() is null and not has_admin_permission('finance.view'), 'revoked admins lose access on their very next request');
select test.as_user(:sa, 'authenticated', false, 'aal2');
select test.assert_raises(format($$select admin_revoke(%L, '', '{}')$$, :ops), 'reason_required');
select test.assert((select count(*) from audit_logs where action = 'admin.revoked' and reason = 'Left the company') = 1, 'the revocation is audited');
select admin_grant(:newbie, 'support_admin', 'Back as support', :'ctx'::jsonb);
select test.assert((select role = 'support_admin' and active and revoked_at is null from admin_members where user_id = :newbie), 'a revoked admin can be re-granted');

-- Guard rails: nobody changes their own access, and the last super admin can't be removed.
select test.assert_raises(format($$select admin_revoke(%L, 'oops', '{}')$$, :sa), 'cannot_change_self');
select test.assert_raises(format($$select admin_set_role(%L, 'analyst', 'oops', '{}')$$, :sa), 'cannot_change_self');
select test.assert_raises(format($$select admin_set_role(%L, 'nonsense', 'x', '{}')$$, :ops), 'invalid input value for enum admin_role: "nonsense"');

-- The audit log is append-only, for everyone.
select test.assert_raises($$update audit_logs set reason = 'edited'$$, 'permission denied');
select test.assert_raises($$delete from audit_logs$$, 'permission denied');
select test.reset();
select test.assert_raises($$update audit_logs set reason = 'edited'$$, 'audit_immutable');
select test.assert_raises($$delete from audit_logs$$, 'audit_immutable');
select test.assert_raises($$truncate audit_logs$$, 'audit_immutable');

-- An admin records their own sign-in events (a fixed list); anything else is refused.
select test.as_user(:sa, 'authenticated', false, 'aal1');
select admin_record_event('admin.login', '{"request_id":"req-9","ip":"198.51.100.7","user_agent":"browser"}'::jsonb);
select test.assert_raises($$select admin_record_event('admin.granted', '{}')$$, 'invalid_event');
select test.reset();
select test.assert((select count(*) from audit_logs where action = 'admin.login' and actor_user_id = :sa and ip = '198.51.100.7') = 1, 'sign-in recorded');

-- Bootstrap: the first super admin is made once, from the SQL editor, never from the app.
select test.reset();
select test.assert_raises($$select bootstrap_super_admin('boot@ugnaya.test')$$, 'super_admin_exists');
delete from admin_members;
insert into auth.users (id, email) values ('60000000-0000-4000-8000-0000000000b0', 'boot@ugnaya.test');
select test.as_user(:sa, 'authenticated', false, 'aal2');
select test.assert_raises($$select bootstrap_super_admin('boot@ugnaya.test')$$, 'permission denied');
select test.as_service();
select test.assert_raises($$select bootstrap_super_admin('boot@ugnaya.test')$$, 'permission denied');
select test.reset();
select test.assert_raises($$select bootstrap_super_admin('nobody@ugnaya.test')$$, 'user_not_found');
select bootstrap_super_admin('boot@ugnaya.test');
select test.assert((select role = 'super_admin' and active from admin_members where user_id = '60000000-0000-4000-8000-0000000000b0'), 'bootstrapped');
select test.assert((select count(*) from audit_logs where action = 'admin.bootstrapped') = 1, 'and audited');
