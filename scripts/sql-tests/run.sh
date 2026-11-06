#!/usr/bin/env bash
# Tests UGNAYA's Supabase migrations on a throwaway local Postgres (Homebrew's), as Bubblie and
# CarMind do: Supabase stand-ins, every migration applied twice in order (each must be safe to
# re-run), then each supabase/tests/NN_*.sql on its own fresh database with the migrations, the
# seed and the test helpers. Usage: npm run test:sql [-- <name filter>]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HERE="$ROOT/scripts/sql-tests"
FILTER="${1:-}"
WORK="$(mktemp -d)"
PORT="${SQL_TEST_PORT:-54339}"
export PGHOST="$WORK" PGPORT="$PORT" PGUSER=postgres

psql_on() { env PGOPTIONS=-cclient_min_messages=warning psql -X -q -d "$1" -v ON_ERROR_STOP=1 "${@:2}"; }

cleanup() {
  pg_ctl -D "${WORK:?}/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "${WORK:?}"
}
trap cleanup EXIT

for tool in initdb pg_ctl psql createdb; do
  command -v "$tool" >/dev/null || { echo "SKIP: $tool not found (brew install postgresql@14)"; exit 2; }
done

initdb -D "$WORK/data" -U postgres --auth=trust >/dev/null
pg_ctl -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null
psql_on postgres -f "$HERE/roles.sql"

shopt -s nullglob
MIGRATIONS=("$ROOT"/supabase/migrations/*.sql)

# A fresh database with the stand-ins and every migration (applied twice when $2 is "twice").
fresh_database() {
  local db="$1" times="${2:-once}"
  createdb "$db"
  psql_on "$db" -f "$HERE/stand-ins.sql"
  for migration in ${MIGRATIONS[@]+"${MIGRATIONS[@]}"}; do
    psql_on "$db" -f "$migration" || { echo "FAIL: $(basename "$migration") did not apply"; exit 1; }
    if [ "$times" = twice ]; then
      psql_on "$db" -f "$migration" || { echo "FAIL: $(basename "$migration") is not safe to run twice"; exit 1; }
    fi
  done
}

fresh_database migrations_twice twice
echo "ok migrations (${#MIGRATIONS[@]} files, each applied twice)"

if [ -f "$ROOT/supabase/seed.sql" ]; then
  psql_on migrations_twice -f "$ROOT/supabase/seed.sql" && psql_on migrations_twice -f "$ROOT/supabase/seed.sql" \
    || { echo "FAIL: seed.sql did not apply twice"; exit 1; }
  echo "ok seed (applied twice)"
fi

prepare_test_database() {
  local db="$1"
  fresh_database "$db"
  [ -f "$ROOT/supabase/seed.sql" ] && psql_on "$db" -f "$ROOT/supabase/seed.sql"
  psql_on "$db" -f "$HERE/helpers.sql"
}

for test in "$ROOT"/supabase/tests/[0-9]*.sql; do
  name="$(basename "$test" .sql)"
  [ -n "$FILTER" ] && [[ "$name" != *"$FILTER"* ]] && continue
  db="t_$(echo "$name" | tr -c 'a-z0-9\n' '_')"
  prepare_test_database "$db"
  if psql_on "$db" -f "$test" > "$WORK/$name.out" 2>&1; then
    echo "ok $name"
  else
    echo "FAIL $name"; sed 's/^/  /' "$WORK/$name.out" | grep -v '^  *$' | tail -15; exit 1
  fi
done

# Tests that need two connections at once (Node, pg).
for script in "$HERE"/*.test.mjs; do
  name="$(basename "$script" .test.mjs)"
  [ -n "$FILTER" ] && [[ "$name" != *"$FILTER"* ]] && continue
  db="t_$(echo "$name" | tr -c 'a-z0-9\n' '_')"
  prepare_test_database "$db"
  PGDATABASE="$db" node "$script" || { echo "FAIL $name"; exit 1; }
  echo "ok $name"
done

echo "all sql tests pass"
