#!/usr/bin/env bash
#
# Apply the migrations to a throwaway PostgreSQL cluster and run the RLS
# tenant-isolation suite against it.
#
# PRD refs: 20.1 ("Database tests for constraints and RLS"), 20.3, 21.1 step 6.
#
# This runs against plain PostgreSQL using supabase/test/auth_stub.sql in place
# of the Supabase-managed `auth` schema, so CI needs no Supabase project.
#
# Usage:
#   ./scripts/db-test.sh                 # start a temp cluster, test, tear down
#   DATABASE_URL=postgres://... ./scripts/db-test.sh   # test an existing database

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"

run_suite() {
  local psql_cmd=("$@")

  echo "==> Loading auth stub"
  "${psql_cmd[@]}" -v ON_ERROR_STOP=1 -q -f "$REPO_ROOT/supabase/test/auth_stub.sql"

  echo "==> Applying migrations"
  for migration in "$REPO_ROOT"/supabase/migrations/*.sql; do
    echo "    $(basename "$migration")"
    "${psql_cmd[@]}" -v ON_ERROR_STOP=1 -q -f "$migration"
  done

  echo "==> Loading seed data"
  "${psql_cmd[@]}" -v ON_ERROR_STOP=1 -q -f "$REPO_ROOT/supabase/seed.sql"

  echo "==> Running tenant isolation suite"
  # `set -o pipefail` is active, so a failing psql fails the script even though
  # its output is piped through grep. ERROR lines are kept in the filter so a
  # failure is visible rather than silently filtered away.
  "${psql_cmd[@]}" -v ON_ERROR_STOP=1 \
    -f "$REPO_ROOT/supabase/test/rls_tenant_isolation.sql" 2>&1 |
    grep -E 'PASS|FAIL|ERROR' | sed 's/^.*NOTICE:  //'
}

if [[ -n "${DATABASE_URL:-}" ]]; then
  run_suite psql "$DATABASE_URL"
  exit 0
fi

if [[ "$(id -u)" -eq 0 ]]; then
  cat >&2 <<'MSG'
ERROR: initdb refuses to run as root, so this script cannot start its temporary
cluster. Either run it as an unprivileged user, or point it at an existing
database:

  su <user> -c './scripts/db-test.sh'
  DATABASE_URL=postgres://... ./scripts/db-test.sh
MSG
  exit 1
fi

WORKDIR="$(mktemp -d /var/tmp/botassure-pgtest.XXXXXX)"
cleanup() {
  "$PGBIN/pg_ctl" -D "$WORKDIR/pgdata" -s stop >/dev/null 2>&1 || true
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

echo "==> Starting temporary PostgreSQL cluster in $WORKDIR"
"$PGBIN/initdb" -D "$WORKDIR/pgdata" --auth=trust >"$WORKDIR/initdb.log" 2>&1
"$PGBIN/pg_ctl" -D "$WORKDIR/pgdata" -l "$WORKDIR/pg.log" \
  -o "-p 5433 -k $WORKDIR" -w start >/dev/null

"$PGBIN/createdb" -h "$WORKDIR" -p 5433 botassure_test

run_suite "$PGBIN/psql" -h "$WORKDIR" -p 5433 -d botassure_test
echo "==> Database tests complete"
