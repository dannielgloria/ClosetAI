# ADR-019 Monorepo

## Status

Accepted

## Context

Closet AI combines a TypeScript backend, shared domain/application packages, a worker, infrastructure, prompts, docs, and a Flutter client.

## Decision

Use a simple monorepo with pnpm workspaces for TypeScript packages and native Flutter tooling for the mobile app.

## Alternatives Considered

- Multiple repositories.
- Nx.
- Turborepo.

## Consequences

- Shared code and docs evolve together.
- Tooling remains lightweight.
- Flutter is not forced into JavaScript workspace tooling.

## Risks

- Workspace scripts must stay simple to avoid recreating a build system by hand.
