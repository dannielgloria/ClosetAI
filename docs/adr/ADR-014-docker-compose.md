# ADR-014 Docker Compose

## Status

Accepted

## Context

Closet AI should run on a local development machine, home Linux server, VM, or VPS without managed cloud dependencies.

## Decision

Use Docker Compose for local and single-host orchestration.

The production runtime Compose stack contains:

- `caddy` as the only public ingress;
- `api`;
- `worker`;
- one-shot `migrate` using `prisma migrate deploy`;
- `postgres`;
- `redis`;
- persistent volumes for PostgreSQL, Redis AOF, Caddy state, and local object
  storage.

The default `docker-compose.yml` represents the production-style runtime and
does not publish PostgreSQL or Redis. `docker-compose.dev.yml` may be used for
local development convenience when host access to PostgreSQL or Redis is needed.

## Alternatives Considered

- Kubernetes.
- Docker only with manual commands.
- Managed platform-specific deployments.

## Consequences

- PostgreSQL, Redis, Caddy, API, worker, and observability can run together on one host.
- Operational complexity remains appropriate for a two-user personal system.
- API and worker startup depends on a successful migration service.
- Caddy owns public HTTP/HTTPS exposure; internal services remain private.

## Risks

- Compose is not a high-availability orchestration platform; this is acceptable for MVP and personal deployment.
- Redis persistence is operational AOF persistence for BullMQ jobs, not domain
  authority.
