#!/usr/bin/env sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"

if [ "$#" -ne 1 ]; then
  echo "Usage: infrastructure/backup/restore-postgres.sh /path/to/closet-ai-postgres.dump" >&2
  exit 64
fi

pg_restore --clean --if-exists --no-owner --dbname="${DATABASE_URL}" "$1"
