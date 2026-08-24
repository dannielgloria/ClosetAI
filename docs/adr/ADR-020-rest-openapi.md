# ADR-020 REST + OpenAPI

## Status

Accepted

## Context

Flutter, future Alexa, Telegram, and other clients need a stable API surface for domain workflows.

## Decision

Expose REST JSON APIs under `/api/v1` and generate OpenAPI 3.1 documentation.

## Alternatives Considered

- GraphQL.
- RPC-only APIs.

## Consequences

- Resource and command-style endpoints can model the wardrobe workflows clearly.
- OpenAPI becomes the contract reference for clients.
- GraphQL is not introduced without demonstrated need.

## Risks

- Command endpoints must be named carefully so business behavior stays explicit.
