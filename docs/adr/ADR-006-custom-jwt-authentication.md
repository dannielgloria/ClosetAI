# ADR-006 Custom JWT Authentication

## Status

Accepted

## Context

Closet AI is a private personal system for an initial household, but all private wardrobe data must require authentication. The approved technology assessment selects NestJS custom authentication, Argon2id, short-lived JWT access tokens, rotating refresh tokens, persisted sessions, and reuse detection.

## Decision

Implement custom NestJS authentication with:

- Argon2id password hashing.
- JWT access tokens with configurable TTL, defaulting to 15 minutes.
- Cryptographically random refresh tokens.
- One active refresh token hash per `AuthSession`.
- Refresh rotation on every successful refresh.
- Refresh-token reuse detection by revoking the session when a refresh token for an otherwise active session does not match the currently stored hash.
- PostgreSQL-backed `UserCredential` and `AuthSession` persistence.
- Bootstrap credentials protected by `SETUP_SECRET` and disabled after the first credential exists.
- Auth-specific rate limits backed by Redis for bootstrap, login, and refresh.
- Private second-user credential provisioning by an authenticated user in the same household.

For MVP bootstrap, credentials are attached to an existing user through a private bootstrap endpoint. This is not public registration. It is available only while no credentials exist and requires `SETUP_SECRET`.

After bootstrap, a signed-in user may provision credentials for another existing user only when both users belong to the same household and the target user does not already have credentials. This is a private setup exception for the two-user MVP, not RBAC and not public registration.

The initial NestJS adapter uses `@node-rs/argon2` configured with `Algorithm.Argon2id`. This keeps the application layer coupled only to `PasswordHasherPort`.

## Alternatives Considered

- External OAuth provider.
- Public registration.
- Token family tables.
- Storing refresh tokens in plaintext.

## Consequences

- The domain remains provider-independent.
- The backend can revoke sessions server-side.
- Flutter can store tokens in iOS Keychain through secure storage.
- Ownership can be derived from the authenticated user instead of trusting `userId` request parameters.
- The second private user can be set up without reopening bootstrap or adding public registration.

## Risks

- The bootstrap credentials endpoint is acceptable only for the private MVP setup phase and becomes unusable after the first credential exists.
- Same-household credential provisioning trusts any authenticated household user during MVP setup. If household membership grows beyond the private two-user model, roles or explicit setup permissions should be revisited.
- The simple per-session reuse model revokes a single session, not all sessions for a user. This matches the MVP scope and can evolve to token families or logout-all later.
