# Closet AI Backups

Backups are infrastructure operations. They are not scheduled by the NestJS API
or BullMQ worker.

## Requirements

- `pg_dump` and `pg_restore`.
- `restic`.
- A Restic repository on physically separate storage.
- `RESTIC_REPOSITORY` and `RESTIC_PASSWORD` exported in the shell or provided by
  the host scheduler.

## PostgreSQL

```sh
DATABASE_URL="postgresql://closet_ai:...@localhost:5432/closet_ai?schema=public" \
RESTIC_REPOSITORY="/mnt/backup/closet-ai-restic" \
RESTIC_PASSWORD="..." \
infrastructure/backup/backup-postgres.sh
```

The script creates a temporary custom-format `pg_dump`, sends it to Restic, runs
`restic check`, and removes the temporary plaintext dump on exit.

## Object Storage

```sh
OBJECT_STORAGE_ROOT="/data/closet-ai/objects" \
RESTIC_REPOSITORY="/mnt/backup/closet-ai-restic" \
RESTIC_PASSWORD="..." \
infrastructure/backup/backup-object-storage.sh
```

Original garment images are authoritative and must be backed up. Thumbnails are
derived WebP files and are excluded with `*/thumbnail.webp`.

## Validation

Use:

```sh
restic snapshots
restic check
```

A backup repository on the same physical disk as the app is not a valid disaster
recovery backup.

## PostgreSQL Restore Smoke Test

To validate that a dump can be restored into an empty database:

```sh
SOURCE_DATABASE_URL="postgresql://closet_ai:...@localhost:5432/closet_ai?schema=public" \
RESTORE_DATABASE_URL="postgresql://closet_ai:...@localhost:5433/closet_ai_restore?schema=public" \
infrastructure/backup/postgres-restore-smoke-test.sh
```

The restore target must be disposable.
