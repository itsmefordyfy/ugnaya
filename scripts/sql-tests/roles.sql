-- Cluster-wide roles Supabase has. Created once per test run (scripts/sql-tests/run.sh).
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role supabase_admin nologin superuser;
