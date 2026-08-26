# syntax=docker/dockerfile:1.7

FROM node:20.19.3-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@10.28.2 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/application/package.json packages/application/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY prisma/schema.prisma prisma/schema.prisma
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm prisma:generate
RUN pnpm --filter @closet-ai/domain build
RUN pnpm --filter @closet-ai/application build
RUN pnpm --filter @closet-ai/shared build
RUN pnpm --filter @closet-ai/worker build

FROM base AS runtime-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/application/package.json packages/application/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY prisma/schema.prisma prisma/schema.prisma
RUN pnpm install --prod --frozen-lockfile
RUN pnpm prisma:generate

FROM base AS runtime
ENV NODE_ENV="production"
ENV NODE_OPTIONS="--conditions=production"
ENV OBJECT_STORAGE_ROOT="/data/closet-ai/objects"

RUN groupadd --system --gid 10001 closet \
  && useradd --system --uid 10001 --gid closet --home-dir /app --shell /usr/sbin/nologin closet \
  && mkdir -p /data/closet-ai/objects \
  && chown -R closet:closet /app /data/closet-ai

COPY --from=runtime-deps --chown=closet:closet /app ./
COPY --from=build --chown=closet:closet /app/apps/worker/dist ./apps/worker/dist
COPY --from=build --chown=closet:closet /app/packages/domain/dist ./packages/domain/dist
COPY --from=build --chown=closet:closet /app/packages/application/dist ./packages/application/dist
COPY --from=build --chown=closet:closet /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=closet:closet /app/prisma ./prisma

USER closet
CMD ["node", "--conditions=production", "apps/worker/dist/apps/worker/src/main.js"]
