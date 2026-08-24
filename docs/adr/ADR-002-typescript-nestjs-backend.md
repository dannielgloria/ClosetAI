# ADR-002 TypeScript + NestJS Backend

## Status

Accepted

## Context

The backend needs REST APIs, validation, dependency injection, modular organization, tests, background workers, and integrations with AI and future channels.

## Decision

Use TypeScript and NestJS for the backend API and worker processes.

## Alternatives Considered

- Java with Spring Boot.
- Other TypeScript HTTP frameworks.

## Consequences

- NestJS provides a structured module system and OpenAPI support.
- TypeScript aligns with the AI/API ecosystem and developer velocity.
- Domain code must remain framework-independent.

## Risks

- NestJS services can become anemic god services if use cases are not kept explicit. The application layer will use behavior-named use cases.
