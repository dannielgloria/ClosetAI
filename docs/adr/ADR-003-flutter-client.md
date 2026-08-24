# ADR-003 Flutter Client

## Status

Accepted

## Context

Closet AI is primarily intended for iPadOS and iOS in the initial product direction, with possible future macOS and web support.

## Decision

Use Flutter and Dart for the client application.

## Alternatives Considered

- React/Next.js PWA.
- Native iOS only.

## Consequences

- One codebase can target iPadOS and iOS.
- The client can provide a rich tablet-first visual wardrobe experience.
- Flutter tooling remains separate from pnpm workspaces.

## Risks

- The Flutter SDK must be installed separately in development environments.
