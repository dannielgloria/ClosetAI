# ADR-001 Modular Monolith

## Status

Accepted

## Context

Closet AI initially serves two users in one household. The product complexity is domain modeling, persistence, integrations, and AI orchestration, not request volume or independent service scaling.

## Decision

Implement the backend as a modular monolith.

## Alternatives Considered

- Microservices.
- Distributed CQRS.
- Event Sourcing.

## Consequences

- Modules remain explicit and independently understandable.
- Deployment stays simple on a single host.
- Future extraction remains possible if a concrete need appears.

## Risks

- Module boundaries can erode if controllers, repositories, and domain rules are mixed. This is mitigated through explicit dependency rules and tests.
