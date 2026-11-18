-- Admin modules: every function is permission-checked in the database, decisions follow the review
-- workflow and are audited, lists are filtered in SQL, and personal data is masked without users.view_pii.
\set sa '''60000000-0000-4000-8000-000000000001'''
\set ops '''60000000-0000-4000-8000-000000000002'''
\set fin '''60000000-0000-4000-8000-000000000003'''
\set sup '''60000000-0000-4000-8000-000000000004'''
\set ana '''60000000-0000-4000-8000-000000000005'''
\set newbie '''60000000-0000-4000-8000-000000000006'''
\set m1 '''50000000-0000-4000-8000-000000000001'''
\set b1 '''51000000-0000-4000-8000-000000000001'''
\set rosa_staff '''53000000-0000-4000-8000-000000000002'''
\set owner_user '''52000000-0000-4000-8000-000000000001'''
\set c1 '''57000000-0000-4000-8000-000000000001'''
\set ctx '{"request_id":"req-9","ip":"203.0.113.9","user_agent":"test"}'

insert into auth.users (id, email) values
  (:sa, 'sa@ugnaya.test'), (:ops, 'ops@ugnaya.test'), (:fin, 'fin@ugnaya.test'), (:sup, 'sup@ugnaya.test'),
  (:ana, 'ana@ugnaya.test'), (:newbie, 'newbie@ugnaya.test'), ('61000000-0000-4000-8000-000000000001', 'cafe@example.com');
insert into admin_members (user_id, role) values
  (:sa, 'super_admin'), (:ops, 'operations_admin'), (:fin, 'finance_admin'), (:sup, 'support_admin'), (:ana, 'analyst');

-- A new business registers and submits its application.
select test.as_user('61000000-0000-4000-8000-000000000001');
create temp table app as select register_merchant('Bagong Kape', 'cafe', 'Legazpi', 'Rizal St', 1, '+639170000000', 'friend', false) as id;
grant select on app to authenticated;
select test.reset();
insert into storage.objects (bucket_id, name) select 'merchant-documents', id::text || '/permit.pdf' from app;
select test.as_user('61000000-0000-4000-8000-000000000001');
select test.assert_raises(format('select merchant_submit_application(%L)', (select id from app)), 'documents_required');
select merchant_add_document((select id from app), 'permit', (select id::text from app) || '/permit.pdf', 'permit.pdf', 'application/pdf', 1000);
select merchant_submit_application((select id from app));
select test.reset();
select test.assert((select status::text from merchants where id = (select id from app)) = 'pending_verification', 'submitted → pending review');

-- Nobody without the permission (or without the second factor) reaches the functions.
select test.as_user(:owner_user, 'authenticated', false, 'aal2');
select test.assert_raises($$select admin_dashboard()$$, 'forbidden');
select test.assert_raises($$select admin_list_merchants()$$, 'forbidden');
select test.as_user(:ops, 'authenticated', false, 'aal1');
select test.assert_raises($$select admin_list_merchants()$$, 'forbidden');
select test.as_anon();
select test.assert_raises($$select admin_dashboard()$$, 'permission denied');

-- Dashboard and analytics read real aggregates; money only for finance.
select test.as_user(:ana, 'authenticated', false, 'aal2');
select test.assert((admin_dashboard() -> 'merchants' ->> 'total')::int = 3, 'three merchants');
select test.assert((admin_dashboard() ->> 'pending_reviews')::int = 1, 'one application waiting');
select test.assert(admin_dashboard() -> 'mrr_list_centavos' = 'null'::jsonb, 'an analyst sees no money');
select test.assert(jsonb_array_length(admin_dashboard(current_date - 6, current_date) -> 'daily') = 7, 'a 7-day range has 7 days');
select test.assert_raises($$select admin_dashboard(current_date, current_date - 1)$$, 'invalid_range');
select test.assert((admin_analytics(30) ->> 'days')::int = 30, 'analytics for 30 days');
select test.assert_raises($$select admin_list_merchants()$$, 'forbidden');
select test.as_user(:fin, 'authenticated', false, 'aal2');
select test.assert((admin_dashboard() ->> 'mrr_list_centavos')::int = 39900 + 89900, 'finance sees list-price MRR (growth + starter)');
select test.assert((admin_finance() ->> 'paying_merchants')::int = 2, 'two paying merchants');

-- The review queue and the workflow.
select test.as_user(:ops, 'authenticated', false, 'aal2');
select test.assert((admin_list_merchants('queue') ->> 'total')::int = 1, 'the queue holds the new application');
select test.assert((admin_list_merchants(null, 'kape') ->> 'total')::int = 2, 'search by name');
select test.assert((admin_list_merchants(null, '100%') ->> 'total')::int = 0, 'wildcards are literal');
select test.assert(admin_merchant_detail((select id from app)) -> 'owner' ->> 'email' = 'cafe@example.com', 'a reviewer sees the owner contact');
select test.assert(jsonb_array_length(admin_merchant_documents((select id from app))) = 1, 'and the documents');
select test.assert_raises(format('select admin_review_merchant(%L, %L, null)', (select id from app), 'reject'), 'reason_required');
select test.assert_raises(format('select admin_review_merchant(%L, %L, %L)', (select id from app), 'reactivate', 'x'), 'invalid_transition');
select admin_review_merchant((select id from app), 'start_review', null, null, null, :'ctx');
select admin_review_merchant((select id from app), 'request_info', 'Please upload your mayor''s permit.', null, null, :'ctx');
select test.reset();
select test.assert((select status::text from merchants where id = (select id from app)) = 'info_required', 'information requested');

-- The owner answers; the application is back with UGNAYA, and can't be answered twice.
select test.as_user('61000000-0000-4000-8000-000000000001');
select test.assert((select reason from merchant_reviews where merchant_id = (select id from app) order by id desc limit 1)
  = 'Please upload your mayor''s permit.', 'the owner reads the question');
select merchant_respond_review((select id from app), 'Uploaded it now.');
select test.assert_raises(format('select merchant_respond_review(%L, %L)', (select id from app), 'again'), 'invalid_transition');
select test.as_user(:sup, 'authenticated', false, 'aal2');
select test.assert((admin_alerts() ->> 'answers_received')::int = 1, 'support sees an answer arrived');
select test.assert_raises(format('select admin_review_merchant(%L, %L)', (select id from app), 'approve'), 'forbidden');

select test.as_user(:ops, 'authenticated', false, 'aal2');
select admin_review_merchant((select id from app), 'approve', null, 'starter', true, :'ctx');
select test.reset();
select test.assert((select status::text from merchants where id = (select id from app)) = 'active', 'approved');
select test.assert((select plan::text from subscriptions where merchant_id = (select id from app)) = 'starter'
  and (select founding_until is not null from subscriptions where merchant_id = (select id from app)), 'plan and founding set');
select test.assert((select active from loyalty_programs where merchant_id = (select id from app)), 'program switched on');
select test.assert((select count(*) from audit_logs where merchant_id = (select id from app) and action like 'merchant.%'
  and actor_role = 'admin:operations_admin' and request_id = 'req-9') = 3, 'each decision audited with its context');
select test.assert((select count(*) from merchant_reviews where merchant_id = (select id from app)) = 5, 'the full history is kept');
select test.assert_raises(format('update merchant_reviews set reason = %L where merchant_id = %L', 'x', (select id from app)), 'audit_immutable');

-- Suspension needs merchants.suspend and a reason; a suspended shop can't award.
select test.as_user(:ops, 'authenticated', false, 'aal2');
select admin_review_merchant(:m1, 'suspend', 'Chargeback investigation', null, null, :'ctx');
select test.reset();
select test.assert_raises(format($$select award_points('s1', %L, %L, %L, null, %L, 10000)$$, :m1, :b1, :rosa_staff, :c1), 'merchant_inactive');
select test.as_user(:ops, 'authenticated', false, 'aal2');
select admin_review_merchant(:m1, 'reactivate', 'Cleared', null, null, :'ctx');

-- Notes: support writes, reads come with the entity's view permission; an analyst can't write.
select test.as_user(:sup, 'authenticated', false, 'aal2');
select admin_add_note('user', :c1, 'Called about a missing award.', :'ctx');
select test.assert(jsonb_array_length(admin_list_notes('user', :c1)) = 1, 'the note is listed');
select test.as_user(:ana, 'authenticated', false, 'aal2');
select test.assert_raises(format('select admin_add_note(%L, %L, %L)', 'user', :c1, 'x'), 'forbidden');

-- Users: masked without users.view_pii, searchable by member id, email search only with view_pii.
select test.as_user(:sup, 'authenticated', false, 'aal2');
select test.assert((select r ->> 'email' from jsonb_array_elements(admin_list_users('customer', 'AB2CD3EF') -> 'rows') r) = 'm***@demo.ugnaya.ph',
  'support sees masked email');
select test.assert((admin_list_users(null, 'maria@demo') ->> 'total')::int = 0, 'and cannot search by email');
select test.assert((admin_list_users('admin') ->> 'total')::int = 6, 'admins listed (five + demo admin)');
select test.assert(admin_user_detail(:c1) -> 'customer' -> 'city' = 'null'::jsonb, 'no city without view_pii');
select test.as_user(:sa, 'authenticated', false, 'aal2');
select test.assert((admin_list_users(null, 'maria@demo') ->> 'total')::int = 1, 'a super admin searches by email');

-- Suspending a user bans the sign-in and ends sessions; admins and self are refused.
select test.reset();
insert into auth.sessions (user_id) values (:c1);
select test.as_user(:ops, 'authenticated', false, 'aal2');
select test.assert_raises(format('select admin_set_user_suspended(%L, true, %L)', :sa, 'x'), 'cannot_suspend_admin');
select admin_set_user_suspended(:c1, true, 'Fraud ring', :'ctx');
select test.assert_raises(format('select admin_set_user_suspended(%L, true, %L)', :c1, 'again'), 'no_change');
select test.reset();
select test.assert((select banned_until > now() from auth.users where id = :c1) and not exists (select 1 from auth.sessions where user_id = :c1),
  'banned and signed out');
select test.as_user(:ops, 'authenticated', false, 'aal2');
select admin_set_user_suspended(:c1, false, 'Cleared', :'ctx');

-- Transactions and manual adjustments (super admin only holds transactions.adjust).
select test.reset();
select award_points('t1', :m1, :b1, :rosa_staff, null, :c1, 20000);
select test.as_user(:ops, 'authenticated', false, 'aal2');
select test.assert((admin_list_transactions(:m1) ->> 'total')::int = 1, 'one transaction at Kape ni Juan');
select test.assert((admin_list_transactions(null, 'redeem') ->> 'total')::int = 0, 'filtered by type');
select test.assert_raises(format('select admin_adjust_points(%L, %L, 5, %L, %L)', 'AB2CD3EF', :m1, 'x', 'k'), 'forbidden');
select test.as_user(:sa, 'authenticated', false, 'aal2');
select test.assert((admin_adjust_points('AB2CD3EF', :m1, 5, 'Missed stamp', 'adj-1', :'ctx') ->> 'balance')::int = 25, 'adjusted up');
select test.assert((admin_adjust_points('AB2CD3EF', :m1, 5, 'Missed stamp', 'adj-1', :'ctx') ->> 'replayed')::boolean, 'a repeat is a replay');
select test.assert_raises(format('select admin_adjust_points(%L, %L, -999, %L, %L)', 'AB2CD3EF', :m1, 'x', 'adj-2'), 'insufficient_points');
select test.reset();
select test.assert(not exists (select * from check_ledger()), 'the ledger still adds up');

-- Settings, plans, subscriptions, announcements, exports, granting by email.
select test.as_user(:ops, 'authenticated', false, 'aal2');
select test.assert_raises($$select admin_settings()$$, 'forbidden');
select test.as_user(:sa, 'authenticated', false, 'aal2');
select admin_set_setting('void_window_hours', '24', 'Longer shifts', :'ctx');
select test.assert_raises($$select admin_set_setting('void_window_hours', '500', 'x')$$, 'invalid_value');
select test.assert_raises($$select admin_set_setting('anything', 'true', 'x')$$, 'unknown_setting');
select admin_update_plan('starter', 44900, 1, 5, null, null, 'Price test', :'ctx');
select admin_update_subscription(:m1, 'business', 'active', true, 'Upgrade', :'ctx');
select admin_save_announcement(null, 'Welcome', 'Hello merchants', 'merchants', true, null, null, :'ctx');
select admin_record_export('merchants', 3, :'ctx');
create temp table ainv (token text);
grant select on ainv to authenticated;
insert into ainv select admin_invite('newbie@ugnaya.test', 'analyst', 'New analyst', :'ctx');
select test.reset();
update auth.users set email_confirmed_at = now() where id = :newbie;
select test.as_user(:newbie);
select admin_accept_invite((select token from ainv), :'ctx');
select test.reset();
select test.assert((select value from platform_settings where key = 'void_window_hours') = '24'::jsonb, 'setting saved');
select test.assert((select price_centavos from plan_limits where plan = 'starter') = 44900, 'plan price saved');
select test.assert((select plan::text from subscriptions where merchant_id = :m1) = 'business', 'subscription changed');
select test.assert((select count(*) from admin_members where user_id = :newbie and role = 'analyst') = 1, 'analyst joined through an invitation');
select test.assert((select count(*) from audit_logs where action in ('setting.changed', 'plan.updated', 'subscription.updated',
  'announcement.created', 'export.merchants', 'admin.invited')) = 6, 'every platform change audited');
select test.as_anon();
select test.assert((select count(*) from platform_announcements) = 1, 'published announcements are public');
