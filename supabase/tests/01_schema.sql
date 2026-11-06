-- Platform settings, plan limits and the points maths (same vectors as packages/rules/README.md).
select test.assert(points_for_amount('per_peso', 1, 1000, 0, 20000) = 20, '₱200 at 1 per ₱10 is 20');
select test.assert(points_for_amount('per_peso', 1, 2000, 0, 25000) = 12, '₱250 at the network rate is 12');
select test.assert(points_for_amount('per_peso', 1, 1000, 0, 19950) = 19, '₱199.50 floors to 19');
select test.assert(points_for_amount('per_peso', 1, 1000, 10000, 9999) = 0, 'under the minimum spend is 0');
select test.assert(points_for_amount('per_peso', 1, 1000, 10000, 10000) = 10, 'exactly the minimum spend earns');
select test.assert(points_for_amount('per_visit', 5, 0, 0, 1) = 5, 'per visit');
select test.assert(points_for_amount('stamps', 0, 0, 5000, 5000) = 1, 'stamps');
select test.assert_raises($$select points_for_amount('per_peso', 1, 0, 0, 100)$$, 'amount_invalid');
select test.assert_raises($$select points_for_amount('per_peso', 1, 1000, 0, -1)$$, 'amount_invalid');
select test.assert_raises($$select points_for_amount('per_visit', 0, 0, 0, 100)$$, 'amount_invalid');

select test.assert(setting_bool('network_enabled') = false, 'the network starts switched off');
select test.assert(setting_int('void_window_hours') = 12, 'cashier void window');
select test.assert(setting_int('manager_void_window_days') = 30, 'manager void window');
select test.assert(setting_int('redemption_token_minutes') = 5, 'redemption token lifetime');
select test.assert(setting_int('network_hold_days') = 7, 'network hold');

select test.assert((select price_centavos from plan_limits where plan = 'growth') = 89900, 'Growth is ₱899');
select test.assert((select transactions_per_month from plan_limits where plan = 'free') = 300, 'Free has 300 transactions a month');
select test.assert((select branches from plan_limits where plan = 'enterprise') is null, 'Enterprise branches unlimited');
select test.assert(not is_platform_admin(), 'nobody is an admin without a row');
