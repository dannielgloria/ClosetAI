#!/usr/bin/env sh
set -eu

: "${OBJECT_STORAGE_ROOT:?OBJECT_STORAGE_ROOT is required}"
: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY is required}"
: "${RESTIC_PASSWORD:?RESTIC_PASSWORD is required}"

restic backup "${OBJECT_STORAGE_ROOT}" \
  --tag closet-ai \
  --tag object-storage \
  --exclude "*/thumbnail.webp"
restic check
