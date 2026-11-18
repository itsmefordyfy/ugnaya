-- Demo data for local tests and the first mobile-round development. Never pushed to production
-- (`supabase db push` doesn't run it). Safe to run twice.
--
-- Fixed ids:
--   Kape ni Juan (café, active, in the network)       m1 = 50000000-0000-4000-8000-000000000001
--     branch Magsaysay  b1 = 51000000-0000-4000-8000-000000000001
--     branch Centro     b2 = 51000000-0000-4000-8000-000000000002
--     owner   owner@demo.ugnaya.ph    user 52000000-…-000000000001, staff 53000000-…-000000000001
--     manager manager@demo.ugnaya.ph  user 52000000-…-000000000002, staff 53000000-…-000000000002 (Magsaysay)
--     cashier Ana, PIN 1234, no login  staff 53000000-…-000000000003 (both branches)
--     device  Magsaysay counter        user 52000000-…-0000000000d1, device 54000000-…-000000000001
--     program 55000000-…-000000000001 (1 point per ₱10)
--     rewards Free upsize 40 points    56000000-…-000000000001
--             Free pastry 120 points   56000000-…-000000000002 (monthly cap 30)
--   Lola's Kitchen (restaurant, active)               m2 = 50000000-0000-4000-8000-000000000002
--     branch Main       b3 = 51000000-0000-4000-8000-000000000003
--     owner   owner2@demo.ugnaya.ph   user 52000000-…-000000000003, staff 53000000-…-000000000004
--     cashier Ben, PIN 5678            staff 53000000-…-000000000005
--     device  Lola's counter           user 52000000-…-0000000000d2, device 54000000-…-000000000002
--     program 55000000-…-000000000002 (1 point per ₱20)
--   Customers c1 (member AB2CD3EF) 57000000-…-000000000001, c2 (XY7PQ2RS) 57000000-…-000000000002
--   Platform admin admin@demo.ugnaya.ph 52000000-…-0000000000a1

insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values
  ('52000000-0000-4000-8000-000000000001', 'owner@demo.ugnaya.ph', '{"user_type":"merchant","full_name":"Juan Dela Cruz"}', false),
  ('52000000-0000-4000-8000-000000000002', 'manager@demo.ugnaya.ph', '{"user_type":"merchant","full_name":"Rosa Santos"}', false),
  ('52000000-0000-4000-8000-000000000003', 'owner2@demo.ugnaya.ph', '{"user_type":"merchant","full_name":"Lola Reyes"}', false),
  ('52000000-0000-4000-8000-0000000000d1', null, '{}', true),
  ('52000000-0000-4000-8000-0000000000d2', null, '{}', true),
  ('52000000-0000-4000-8000-0000000000a1', 'admin@demo.ugnaya.ph', '{}', false),
  ('57000000-0000-4000-8000-000000000001', 'maria@demo.ugnaya.ph', '{"user_type":"customer","full_name":"Maria Cruz"}', false),
  ('57000000-0000-4000-8000-000000000002', 'pedro@demo.ugnaya.ph', '{"user_type":"customer","full_name":"Pedro Lim"}', false)
on conflict (id) do nothing;

-- Fixed member ids instead of the trigger's random ones, so tests can scan them.
update customer_profiles set public_member_id = 'AB2CD3EF' where user_id = '57000000-0000-4000-8000-000000000001';
update customer_profiles set public_member_id = 'XY7PQ2RS' where user_id = '57000000-0000-4000-8000-000000000002';

insert into platform_admins (user_id) values ('52000000-0000-4000-8000-0000000000a1') on conflict do nothing;
insert into admin_members (user_id, role) values ('52000000-0000-4000-8000-0000000000a1', 'super_admin') on conflict do nothing;

insert into merchants (id, trade_name, category, city, address, branch_count_declared, status, network_participation,
                       terms_accepted_at, privacy_accepted_at, verified_at) values
  ('50000000-0000-4000-8000-000000000001', 'Kape ni Juan', 'cafe', 'Naga City', 'Magsaysay Ave', 2, 'active', true, now(), now(), now()),
  ('50000000-0000-4000-8000-000000000002', 'Lola''s Kitchen', 'restaurant', 'Naga City', 'Elias Angeles St', 1, 'active', false, now(), now(), now())
on conflict (id) do nothing;

insert into merchant_branches (id, merchant_id, name, address, city, lat, lng) values
  ('51000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Magsaysay', 'Magsaysay Ave', 'Naga City', 13.6280, 123.1950),
  ('51000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', 'Centro', 'General Luna St', 'Naga City', 13.6218, 123.1866),
  ('51000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000002', 'Main', 'Elias Angeles St', 'Naga City', 13.6233, 123.1880)
on conflict (id) do nothing;

insert into merchant_staff (id, merchant_id, user_id, display_name, role, branch_ids, pin_hash) values
  ('53000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001', 'Juan Dela Cruz', 'owner', null, null),
  ('53000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000002', 'Rosa Santos', 'manager',
   array['51000000-0000-4000-8000-000000000001'::uuid], null),
  ('53000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000001', null, 'Ana', 'cashier', null, extensions.crypt('1234', extensions.gen_salt('bf'))),
  ('53000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000002', '52000000-0000-4000-8000-000000000003', 'Lola Reyes', 'owner', null, null),
  ('53000000-0000-4000-8000-000000000005', '50000000-0000-4000-8000-000000000002', null, 'Ben', 'cashier', null, extensions.crypt('5678', extensions.gen_salt('bf')))
on conflict (id) do nothing;

insert into devices (id, merchant_id, branch_id, user_id, name) values
  ('54000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-0000000000d1', 'Magsaysay counter'),
  ('54000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', '51000000-0000-4000-8000-000000000003', '52000000-0000-4000-8000-0000000000d2', 'Lola''s counter')
on conflict (id) do nothing;

insert into subscriptions (merchant_id, plan, founding, founding_until) values
  ('50000000-0000-4000-8000-000000000001', 'growth', true, (current_date + interval '12 months')::date),
  ('50000000-0000-4000-8000-000000000002', 'starter', false, null)
on conflict (merchant_id) do nothing;
insert into merchant_limits (merchant_id) values
  ('50000000-0000-4000-8000-000000000001'), ('50000000-0000-4000-8000-000000000002')
on conflict (merchant_id) do nothing;

insert into loyalty_programs (id, merchant_id, scope, name, rule_type, points_per_unit, unit_centavos, active) values
  ('55000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'merchant', 'Kape ni Juan points', 'per_peso', 1, 1000, true),
  ('55000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 'merchant', 'Lola''s points', 'per_peso', 1, 2000, true)
on conflict (id) do nothing;

insert into rewards (id, merchant_id, program_id, name, points_cost, retail_value_centavos, monthly_cap) values
  ('56000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '55000000-0000-4000-8000-000000000001', 'Free upsize', 40, 5000, null),
  ('56000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', '55000000-0000-4000-8000-000000000001', 'Free pastry', 120, 6000, 30)
on conflict (id) do nothing;
