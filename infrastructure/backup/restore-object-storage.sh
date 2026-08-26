#!/usr/bin/env sh
set -eu

: "${OBJECT_STORAGE_ROOT:?OBJECT_STORAGE_ROOT is required}"
: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY is required}"
: "${RESTIC_PASSWORD:?RESTIC_PASSWORD is required}"

snapshot="${1:-latest}"
mkdir -p "${OBJECT_STORAGE_ROOT}"
restic restore "${snapshot}" --target / --include "${OBJECT_STORAGE_ROOT}"
