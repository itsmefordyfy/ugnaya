-- verify_member_code: TOTP codes from the customer app (RFC 6238 vectors) and web wallet codes.
\set c1 '''57000000-0000-4000-8000-000000000001'''

select test.assert(totp('12345678901234567890'::bytea, 1) = '287082', 'RFC 6238 vector at T = 59 s');
select test.assert(totp('12345678901234567890'::bytea, 37037036) = '081804', 'RFC 6238 vector at T = 1111111109 s');

insert into customer_devices (id, customer_id, totp_secret, label)
values ('58000000-0000-4000-8000-000000000001', :c1, '12345678901234567890'::bytea, 'test phone');

select test.assert(verify_member_code('U:AB2CD3EF:287082', to_timestamp(59)) = :c1, 'the current code');
select test.assert(verify_member_code('U:AB2CD3EF:287082', to_timestamp(89)) = :c1, 'one step of drift');
select test.assert_raises($$select verify_member_code('U:AB2CD3EF:287082', to_timestamp(150))$$, 'invalid_member_code');
select test.assert_raises($$select verify_member_code('U:XY7PQ2RS:287082', to_timestamp(59))$$, 'invalid_member_code');
update customer_devices set revoked_at = now();
select test.assert_raises($$select verify_member_code('U:AB2CD3EF:287082', to_timestamp(59))$$, 'invalid_member_code');

-- Web wallet codes: hashed, short-lived, used once.
insert into member_web_codes (code_hash, customer_id, expires_at)
values (encode(extensions.digest('abcDEF123456', 'sha256'), 'hex'), :c1, now() + interval '5 minutes');
select test.assert(verify_member_code('U:AB2CD3EF:WabcDEF123456') = :c1, 'a web code');
select test.assert_raises($$select verify_member_code('U:AB2CD3EF:WabcDEF123456')$$, 'invalid_member_code');
insert into member_web_codes (code_hash, customer_id, expires_at)
values (encode(extensions.digest('oldoldold000', 'sha256'), 'hex'), :c1, now() - interval '1 second');
select test.assert_raises($$select verify_member_code('U:AB2CD3EF:Woldoldold000')$$, 'invalid_member_code');

select test.assert_raises($$select verify_member_code('U:ZZZZZZZZ:287082')$$, 'invalid_member_code');
select test.assert_raises($$select verify_member_code('garbage')$$, 'invalid_member_code');
select test.assert_raises($$select verify_member_code(null)$$, 'invalid_member_code');
