#!/usr/bin/env sh
set -eu

: "${SOURCE_DATABASE_URL:?SOURCE_DATABASE_URL is required}"
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"

workdir="$(mktemp -d)"
dump_file="${workdir}/closet-ai-restore-smoke.dump"

cleanup() {
  rm -rf "${workdir}"
}
trap cleanup EXIT INT TERM

pg_dump "${SOURCE_DATABASE_URL}" --format=custom --file="${dump_file}"
pg_restore --clean --if-exists --no-owner --dbname="${RESTORE_DATABASE_URL}" "${dump_file}"
psql "${RESTORE_DATABASE_URL}" --quiet --tuples-only --command "select count(*) from _prisma_migrations;" >/dev/null
