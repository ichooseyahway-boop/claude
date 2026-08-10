#!/usr/bin/env bash
#
# Applies every migration to a throwaway PostgreSQL database and runs the
# database test suite against it (PRD 20.1, 20.3).
#
# This is the check that proves RLS is actually enabled and actually isolates
# tenants, rather than proving that a policy was typed into a file. It is a
# required CI step (PRD 21.1 step 6).
#
# Usage:
#   scripts/db-test.sh                     # uses $DATABASE_URL, or a local cluster
#   PGPORT=55432 scripts/db-test.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGHOST="${PGHOST:-/tmp}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
TEST_DB="${TEST_DB:-botassure_dbtest}"

export PGHOST PGPORT PGUSER

psql_run() {
  psql -v ON_ERROR_STOP=1 -q "$@"
}

echo "==> Recreating ${TEST_DB} on ${PGHOST}:${PGPORT}"
psql_run -d postgres -c "drop database if exists ${TEST_DB};" >/dev/null
psql_run -d postgres -c "create database ${TEST_DB};" >/dev/null

# The Supabase-managed `auth` schema and PostgREST roles do not exist on a
# plain cluster. This shim creates just enough of them to apply the migrations.
echo "==> Applying local Supabase shim"
psql_run -d "${TEST_DB}" -f "${ROOT}/supabase/test/00_supabase_shim.sql" >/dev/null

echo "==> Applying migrations"
for migration in "${ROOT}"/supabase/migrations/*.sql; do
  printf '    %s\n' "$(basename "${migration}")"
  psql_run -d "${TEST_DB}" -f "${migration}" >/dev/null
done

echo "==> Running database tests"
failed=0
for suite in "${ROOT}"/supabase/test/[0-9][1-9]_*.sql; do
  [ -e "${suite}" ] || continue
  printf '    %s\n' "$(basename "${suite}")"

  if output=$(psql -v ON_ERROR_STOP=1 -d "${TEST_DB}" -f "${suite}" 2>&1); then
    printf '%s\n' "${output}" | grep -E '^(psql:.*)?NOTICE:  ok ' | sed 's/^.*NOTICE:  /      /' || true
  else
    printf '%s\n' "${output}" | grep -E 'ERROR|FAILED' | sed 's/^/      /'
    failed=1
  fi
done

if [ "${failed}" -ne 0 ]; then
  echo "==> Database tests FAILED"
  exit 1
fi

echo "==> Database tests passed"
