# ADR-005 Prisma

## Status

Accepted

## Context

The backend needs maintainable TypeScript data access, migrations, and schema management.

## Decision

Use Prisma for ORM and migrations, behind repository adapters.

## Alternatives Considered

- Raw SQL only.
- TypeORM.
- Drizzle.

## Consequences

- Prisma schema and migrations define persistence structure.
- Prisma models must not become domain entities.
- Controllers must not access Prisma directly.

## Risks

- Leaking generated Prisma types across the application can couple domain logic to persistence. Mappers and repository ports mitigate this.
