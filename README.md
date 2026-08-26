# Closet AI

Closet AI is a personal Wardrobe Intelligence Platform built as a modular monolith.

## Current Runtime

Closet AI runs as a modular monolith with a NestJS API, a NestJS worker,
PostgreSQL, Redis/BullMQ, Flutter, and private local object storage.

## Local Setup

```sh
pnpm install
pnpm prisma:generate
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis
pnpm --filter @closet-ai/api start:dev
```

Flutter is intentionally isolated under `apps/mobile` and requires the Flutter SDK.

## Production Runtime

The single-host Docker Compose runtime is documented in:

```text
docs/operations/production-runtime-v1.md
```

At a high level:

```sh
cp .env.production.example .env
docker compose build
docker compose up -d
```

Only Caddy publishes ports `80` and `443`. PostgreSQL, Redis, worker, and object
storage stay private inside the Compose network.
