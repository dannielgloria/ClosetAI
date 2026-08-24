# Closet AI

Closet AI is a personal Wardrobe Intelligence Platform built as a modular monolith.

## Current Slice

This bootstrap implements the first MVP vertical slice without AI:

1. Create household/user.
2. Create garments.
3. List available garments.
4. Generate a basic deterministic outfit.
5. Select an outfit.
6. Confirm usage idempotently.
7. Persist garment usage events.

## Local Setup

```sh
pnpm install
pnpm prisma:generate
cp .env.example .env
docker compose up -d postgres redis
pnpm --filter @closet-ai/api start:dev
```

Flutter is intentionally isolated under `apps/mobile` and requires the Flutter SDK.
