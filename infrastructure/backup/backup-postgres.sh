#!/usr/bin/env sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY is required}"
: "${RESTIC_PASSWORD:?RESTIC_PASSWORD is required}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
workdir="$(mktemp -d)"
dump_file="${workdir}/closet-ai-postgres-${timestamp}.dump"

cleanup() {
  rm -rf "${workdir}"
}
trap cleanup EXIT INT TERM

pg_dump "${DATABASE_URL}" --format=custom --file="${dump_file}"
restic backup "${dump_file}" --tag closet-ai --tag postgres
restic check
