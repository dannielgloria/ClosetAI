# ADR-004 PostgreSQL

## Status

Accepted

## Context

Closet AI has a relational domain: households, users, garments, outfits, outfit items, usage history, sessions, and future profiles.

## Decision

Use PostgreSQL as the source of truth.

## Alternatives Considered

- SQLite.
- Document databases.
- Managed cloud databases as a required dependency.

## Consequences

- Strong relational integrity and transactions are available.
- The app remains portable to a local server or single VPS.
- Redis and AI outputs are not authoritative domain storage.

## Risks

- Schema changes require disciplined migrations.
