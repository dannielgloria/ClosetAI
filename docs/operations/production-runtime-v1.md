# Production Runtime Packaging v1

## Architecture

```text
Internet
  ↓
Caddy
  ↓
NestJS API
  ↓
PostgreSQL + Redis + local object storage

Redis
  ↓
NestJS Worker
```

The production Compose file runs `postgres`, `redis`, one-shot `migrate`, `api`,
`worker`, and `caddy`. PostgreSQL, Redis, worker, and object storage are not
published to the host. Caddy is the only public ingress.

## Runtime Data

Authoritative:

- PostgreSQL.
- Original garment images in `/data/closet-ai/objects`.

Operational or derived:

- Redis stores BullMQ jobs, rate limits, and weather cache. It uses AOF so queued
  jobs survive normal restarts, but it is not the domain source of truth.
- Thumbnails are derived and may be regenerated.

## Prerequisites

- Linux host with Docker Engine and Docker Compose.
- DNS and port forwarding for 80/443 when exposing from a home server.
- A `.env` file created from `.env.production.example` with strong secrets.

If the host is behind CGNAT, direct Caddy ingress may not work. Do not add a
tunnel as part of this slice; choose ingress later.

## Configure

```sh
cp .env.production.example .env
```

Set real values for:

- `DATABASE_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `SETUP_SECRET`
- `OPENAI_API_KEY`
- `AI_CONTEXT_MODEL`
- `AI_OUTFIT_MODEL`
- `AI_VISION_MODEL`
- `CORS_ALLOWED_ORIGINS`
- `CADDY_SITE_ADDRESS`

For local smoke runs without a domain, keep:

```text
CADDY_SITE_ADDRESS=:80
```

For production with a domain, use:

```text
CADDY_SITE_ADDRESS=closet.example.com
```

Caddy will handle HTTPS automatically when the domain is reachable.

## Build And Start

```sh
docker compose build
docker compose up -d
```

The `migrate` service waits for PostgreSQL and runs:

```sh
prisma migrate deploy
```

The API and worker start only after the migration service exits successfully.

## Health

```sh
curl http://localhost/api/v1/health
docker compose ps
docker compose logs api
docker compose logs worker
```

## Development Override

For local development that needs host access to PostgreSQL and Redis:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis
```

The production Compose file intentionally does not publish `5432` or `6379`.

## Backups

Recommended schedule: daily via host cron or systemd timer.

PostgreSQL:

```sh
DATABASE_URL="postgresql://closet_ai:...@localhost:5432/closet_ai?schema=public" \
RESTIC_REPOSITORY="/mnt/backup/closet-ai-restic" \
RESTIC_PASSWORD="..." \
infrastructure/backup/backup-postgres.sh
```

Object storage:

```sh
OBJECT_STORAGE_ROOT="/data/closet-ai/objects" \
RESTIC_REPOSITORY="/mnt/backup/closet-ai-restic" \
RESTIC_PASSWORD="..." \
infrastructure/backup/backup-object-storage.sh
```

Validate:

```sh
restic snapshots
restic check
```

PostgreSQL restore smoke test against a disposable target:

```sh
SOURCE_DATABASE_URL="postgresql://closet_ai:...@localhost:5432/closet_ai?schema=public" \
RESTORE_DATABASE_URL="postgresql://closet_ai:...@localhost:5433/closet_ai_restore?schema=public" \
infrastructure/backup/postgres-restore-smoke-test.sh
```

## Restore

1. Stop API and worker:

   ```sh
   docker compose stop api worker
   ```

2. Restore object storage from Restic:

   ```sh
   OBJECT_STORAGE_ROOT="/data/closet-ai/objects" \
   RESTIC_REPOSITORY="/mnt/backup/closet-ai-restic" \
   RESTIC_PASSWORD="..." \
   infrastructure/backup/restore-object-storage.sh latest
   ```

3. Restore PostgreSQL from a restored dump:

   ```sh
   DATABASE_URL="postgresql://closet_ai:...@localhost:5432/closet_ai?schema=public" \
   infrastructure/backup/restore-postgres.sh /path/to/closet-ai-postgres.dump
   ```

4. Apply migrations:

   ```sh
   docker compose run --rm migrate
   ```

5. Start services and validate health:

   ```sh
   docker compose up -d
   curl http://localhost/api/v1/health
   ```

## Smoke Test

With a configured `.env`:

```sh
infrastructure/docker/compose-smoke-test.sh
```

The script builds API and worker images, starts the stack, waits for the API
healthcheck, requests health through Caddy, prints service status, and tears the
stack down.

## Network And Firewall

Allow externally:

- 80
- 443
- 22 only according to the server administrator policy

Deny externally:

- 5432
- 6379
- object storage filesystem

## Scaling Note

This deployment assumes one worker. Before running multiple workers, review the
BullMQ repeatable cleanup scheduler so the orphan cleanup schedule is not
registered unexpectedly by multiple replicas.

## Logs

API and worker write structured logs to stdout/stderr. Docker captures logs and
Compose limits local json logs to five 10 MB files per service.
