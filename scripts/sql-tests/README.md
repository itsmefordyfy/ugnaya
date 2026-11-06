# SQL tests

`npm run test:sql` tests the migrations in `supabase/migrations` without Docker (this Mac has none,
so `supabase start` is unavailable), the way Bubblie and CarMind test theirs:

1. A throwaway Postgres (Homebrew's `postgresql@14`) starts on a Unix socket in a temp folder.
2. `roles.sql` creates Supabase's roles; `stand-ins.sql` adds what Supabase provides (`auth.users`,
   `auth.uid()`, `auth.jwt()`, pgcrypto in `extensions`, the default grants to `anon`,
   `authenticated` and `service_role`).
3. Every migration is applied **twice** on one database: each must be safe to re-run.
4. The seed is applied twice too.
5. Each `supabase/tests/NN_*.sql` runs on its own fresh database (stand-ins, migrations, seed,
   `helpers.sql`). Any error fails the run and prints the file's last lines.
6. Each `scripts/sql-tests/*.test.mjs` (tests that need two connections at once) gets its own fresh
   database, with `PGHOST`, `PGPORT`, `PGUSER` and `PGDATABASE` set.

Run one file: `bash scripts/sql-tests/run.sh 03_award` (any part of the name).

**Postgres 14 locally, 17 hosted.** The migrations must use nothing newer than Postgres 14
(no `MERGE`, no `security_invoker` views, no `NULLS NOT DISTINCT`).

## Writing a test

Plain SQL, run with `ON_ERROR_STOP`. Helpers in `helpers.sql`:

| Helper | Does |
| --- | --- |
| `test.as_user(id, role default 'authenticated', anonymous default false)` | act as a signed-in user, like a request with that JWT |
| `test.as_anon()` | act as a visitor with no session |
| `test.as_service()` | act as an Edge Function using the secret key |
| `test.reset()` | back to the superuser |
| `test.assert(condition, message)` | fail with the message unless the condition is true |
| `test.assert_raises(sql, code)` | run the SQL; pass only if it raises exactly `code` (or any "permission denied…" for `'permission denied'`) |
| `test.grant_points(customer, program, points)` | give a customer points directly (an `adjust` entry), for setting up a test |

Seed ids (merchants, branches, staff, devices, customers) are listed at the top of `supabase/seed.sql`.
