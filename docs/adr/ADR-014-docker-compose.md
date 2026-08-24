# ADR-014 Docker Compose

## Status

Accepted

## Context

Closet AI should run on a local development machine, home Linux server, VM, or VPS without managed cloud dependencies.

## Decision

Use Docker Compose for local and single-host orchestration.

## Alternatives Considered

- Kubernetes.
- Docker only with manual commands.
- Managed platform-specific deployments.

## Consequences

- PostgreSQL, Redis, Caddy, API, worker, and observability can run together on one host.
- Operational complexity remains appropriate for a two-user personal system.

## Risks

- Compose is not a high-availability orchestration platform; this is acceptable for MVP and personal deployment.
