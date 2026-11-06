-- Test helpers, loaded into each test database after the migrations and the seed.
set client_min_messages = warning;
create schema test;
grant usage on schema test to anon, authenticated, service_role;

-- Act as a signed-in user (or an anonymous device) the way PostgREST does: the role plus JWT claims.
create function test.as_user(p_user uuid, p_role text default 'authenticated', p_anonymous boolean default false)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', p_role, 'is_anonymous', p_anonymous)::text, false);
  perform set_config('role', p_role, false);
end $$;

create function test.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, false);
  perform set_config('role', 'anon', false);
end $$;

-- What an Edge Function using the secret key does: the service role, no user.
create function test.as_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, false);
  perform set_config('role', 'service_role', false);
end $$;

-- Back to the superuser that owns the test database.
create function test.reset() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', false);
  perform set_config('role', 'none', false);
end $$;

create function test.assert(p_ok boolean, p_message text) returns void language plpgsql as $$
begin
  if p_ok is not true then raise exception 'FAIL: %', p_message; end if;
end $$;

-- Runs p_sql and passes only if it raises with exactly p_code as its message
-- (or, for p_code = 'permission denied', any permission error).
create function test.assert_raises(p_sql text, p_code text) returns void language plpgsql as $$
declare
  v_message text;
begin
  begin
    execute p_sql;
  exception when others then
    v_message := sqlerrm;
    if v_message = p_code or (p_code = 'permission denied' and v_message like 'permission denied%') then
      return;
    end if;
    raise exception 'FAIL: expected % from [%], got [%]', p_code, p_sql, v_message;
  end;
  raise exception 'FAIL: expected % from [%], but it succeeded', p_code, p_sql;
end $$;

grant execute on all functions in schema test to anon, authenticated, service_role;
