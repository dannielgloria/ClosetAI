# AGENTS.md — Closet AI

## 0. Purpose

This file defines the permanent operating rules for any AI coding agent, including Codex, working on **Closet AI**.

Treat this file as an executable engineering policy for the repository.

Its goal is to prevent architectural drift, technology improvisation, inconsistent conventions, unnecessary dependencies, and changes that conflict with the product definition.

Before making structural, architectural, persistence, security, API, or AI-related changes, read this file and the canonical project documents listed below.

---

# 1. Canonical Sources of Truth

The project is governed by the following documents, in this order of authority:

1. `AGENTS.md`
2. `docs/project/project-definition-v1.0.md`
3. `docs/project/prd-v1.0.md`
4. `docs/architecture/technology-decision-architecture-assessment-v1.0.md`
5. ADRs under `docs/adr/`
6. API contracts under `docs/api/`
7. Domain documentation under `docs/domain/`
8. Source code and tests

If the exact filenames differ slightly in the repository, locate the documents by title before making assumptions.

## Conflict Resolution

If two sources conflict:

1. Do not silently choose one.
2. Prefer the higher-authority source from the list above.
3. If the conflict changes behavior, architecture, security, persistence, or public API:
   - stop that specific change;
   - document the conflict;
   - propose the smallest resolution;
   - do not invent a new architectural rule.

Tests do not override explicit product or architectural requirements if the tests are clearly stale.

---

# 2. Project Definition

Closet AI is a personal **Wardrobe Intelligence Platform** initially intended for two users in the same household.

The system manages the full wardrobe lifecycle:

```text
PROFILE
   ↓
WARDROBE
   ↓
CONTEXT
   ↓
RECOMMENDATION
   ↓
SELECTION
   ↓
USAGE
   ↓
FEEDBACK
   ↓
LAUNDRY
   ↓
CONDITION
   ↓
SHOPPING
   ↓
WARDROBE
   ↺
```

Closet AI is not just a chatbot and not just an image generator.

The database is the source of truth.

AI interprets, recommends, classifies, and generates derived artifacts.

AI must never become the authoritative store of wardrobe state.

---

# 3. Primary Engineering Objectives

Optimize for:

1. maintainability;
2. clarity;
3. robustness;
4. fast iteration;
5. explicit domain modeling;
6. low operating cost;
7. ease of onboarding another developer;
8. self-hosted operation;
9. cloud portability;
10. replaceable external providers.

Do not optimize prematurely for:

- massive scale;
- distributed systems;
- enterprise infrastructure;
- theoretical extensibility that has no current requirement.

---

# 4. Approved Technology Stack

The following decisions are approved and must not be changed without an ADR.

## Backend

```text
TypeScript
NestJS
```

## Frontend

```text
Flutter
Dart
```

Primary platforms:

```text
iPadOS
iOS
```

Potential later platforms:

```text
macOS
Web
```

## Database

```text
PostgreSQL
```

## ORM / Data Access

```text
Prisma
```

## Authentication

```text
NestJS custom authentication
Argon2id
JWT access tokens (~15 min)
Rotating refresh tokens
Persistent auth sessions
Refresh-token reuse detection
```

## Client Secure Storage

```text
iOS Keychain
```

via an appropriate Flutter secure-storage implementation.

## AI

```text
OpenAI
```

Primary responsibilities:

- LLM;
- Vision;
- structured reasoning;
- garment analysis;
- outfit styling;
- natural-language interpretation;
- generated outfit visualization.

## Background Processing

```text
BullMQ
Redis
```

## Object Storage

Primary:

```text
local persistent filesystem
```

behind an object-storage port.

Optional off-site backup:

```text
Cloudflare R2
```

R2 is not an operational dependency of the core application.

## Weather

```text
Open-Meteo
```

behind a provider port.

## Containerization

```text
Docker
Docker Compose
```

## Reverse Proxy

```text
Caddy
```

## CI/CD

```text
GitHub Actions
GitHub Container Registry (GHCR)
```

## Observability

```text
Pino
OpenTelemetry
Prometheus
Grafana
```

## Testing

Backend:

```text
Vitest
Supertest
Testcontainers
```

Flutter:

```text
flutter_test
integration_test
```

## API Style

```text
REST
JSON
OpenAPI 3.1
/api/v1
```

## Repository

One monorepo.

Do not introduce Nx or Turborepo unless a new ADR explicitly approves it.

---

# 5. Explicitly Disallowed by Default

Do not introduce any of the following without a documented requirement and ADR approval:

```text
Microservices
Kubernetes
Kafka
RabbitMQ
Event Sourcing
Distributed CQRS
GraphQL
Vector Database
Fine Tuning
Self-hosted LLM
GPU infrastructure
RDS
ElastiCache
EKS
ECS
Nx
Turborepo
```

Do not add a technology because it is fashionable, common in other systems, or theoretically scalable.

Every new major dependency must solve a concrete problem.

---

# 6. Architecture

Closet AI uses a **Modular Monolith**.

The preferred dependency direction is:

```text
Interfaces
    ↓
Application
    ↓
Domain
    ↓
Ports
    ↓
Infrastructure
```

A practical NestJS flow should normally look like:

```text
Controller
   ↓
Application Use Case
   ↓
Domain
   ↓
Repository / Provider Port
   ↓
Infrastructure Adapter
```

Examples:

```text
Controller
   ↓
RecommendOutfitUseCase
   ↓
Outfit Domain
   ↓
OutfitRepositoryPort
   ↓
PrismaOutfitRepository
```

or:

```text
AnalyzeGarmentUseCase
   ↓
GarmentAnalyzerPort
   ↓
OpenAIGarmentAnalyzerAdapter
```

---

# 7. Dependency Rules

## Controllers

Controllers may:

- validate transport-level input;
- call application use cases;
- map application output to HTTP responses.

Controllers must not:

- contain business rules;
- query Prisma directly;
- call OpenAI directly;
- call Redis directly;
- perform complex orchestration;
- make authorization decisions that belong to the application/domain layer.

## Application Layer

Application use cases may:

- orchestrate domain behavior;
- load aggregates;
- call ports;
- coordinate transactions;
- enqueue background jobs;
- enforce authorization relevant to the use case.

Application use cases should be explicit and named after behavior.

Prefer:

```text
ConfirmOutfitUsageUseCase
```

over:

```text
OutfitService.doStuff()
```

## Domain

The domain contains:

- entities;
- value objects;
- invariants;
- state transitions;
- domain rules;
- domain services when required;
- domain events where useful.

The domain must not import:

```text
NestJS
Prisma
OpenAI SDK
BullMQ
Redis
Flutter
HTTP libraries
Cloudflare SDKs
```

## Infrastructure

Infrastructure implements ports for:

- persistence;
- AI;
- weather;
- storage;
- queues;
- external integrations.

Infrastructure must not redefine business rules.

---

# 8. Prisma Rules

Prisma is a persistence technology, not the domain model.

Do not expose Prisma models throughout the application as de facto domain entities.

Preferred flow:

```text
Domain Entity
   ↕ mapper
Persistence Model
```

Where a dedicated mapper is unnecessary, keep conversion explicit and local.

## Queries

Do not scatter arbitrary Prisma queries throughout controllers or unrelated services.

Use repositories or persistence adapters.

## Migrations

All schema changes must:

1. modify `schema.prisma`;
2. create a versioned migration;
3. be committed;
4. include tests when behavior changes.

Never make an undocumented manual production schema change.

## Database Integrity

Use database constraints where appropriate:

- foreign keys;
- unique constraints;
- indexes;
- not-null constraints.

Do not rely entirely on TypeScript validation for relational integrity.

---

# 9. Core Domain Invariants

These rules are non-negotiable unless the canonical product documents change.

## Ownership

A garment belongs to exactly one user.

A garment belonging to User A must never be recommended to User B unless a future explicitly approved shared-garment feature exists.

## Outfit Generation

An outfit may only contain garment IDs that:

- exist;
- belong to the requesting user;
- are eligible;
- satisfy current deterministic business rules.

## Garment Availability

At minimum, garments in these states may be considered candidates:

```text
CLEAN_AVAILABLE
WORN_REUSABLE
```

Garments in the following states must not be selected:

```text
LAUNDRY_BIN
WASHING
DRYING
UNAVAILABLE
REPAIR
RETIRED
DONATED
DISCARDED
```

Any additional state rules must be documented.

## Recommendation Is Not Usage

Generating or selecting an outfit must not increment garment usage.

Usage is recorded only after confirmation.

## Usage Confirmation

Confirming usage must be idempotent.

Accidental duplicate requests must not create duplicate usage events.

## Laundry

The system must not mark clothing as washed without explicit confirmation or an approved automation rule.

## Retirement

The AI may recommend retirement, repair, donation, or discard.

It must never automatically discard or permanently retire a garment without explicit confirmation.

## AI Authority

An AI result never writes directly to the database.

It returns a proposed result.

The application validates it.

The application/domain decides whether a state transition is allowed.

---

# 10. AI Engineering Rules

## OpenAI Is a Provider

Do not create a universal god-service such as:

```text
AIService.generate(prompt)
```

Prefer semantic ports:

```text
StyleProfilerPort
GarmentAnalyzerPort
OutfitStylistPort
LaundryAdvisorPort
ShoppingAdvisorPort
OutfitVisualizationPort
```

## Structured Outputs

Programmatic AI responses must use structured schemas whenever possible.

Validate:

- shape;
- required fields;
- IDs;
- enum values;
- score ranges;
- ownership;
- current garment availability.

Never trust a model response solely because it matches JSON syntax.

## Model Names

Do not hardcode model identifiers throughout the application.

Use configuration such as:

```text
AI_OUTFIT_MODEL
AI_VISION_MODEL
AI_STYLE_MODEL
AI_IMAGE_MODEL
```

## Prompt Versioning

Prompts are source-controlled assets.

Recommended structure:

```text
prompts/
├── outfit-stylist/
│   └── v1.*
├── garment-analyzer/
│   └── v1.*
├── style-profiler/
│   └── v1.*
└── outfit-visualization/
    └── v1.*
```

Every significant AI execution should be traceable to:

```text
capability
provider
model
promptVersion
latency
token usage
status
estimated cost
```

## Privacy

Send only the minimum context required for the AI task.

Do not send unrelated personal data.

## Tests

Normal unit/integration test suites must not call OpenAI.

Use fakes.

Real AI evaluation suites must be explicit and opt-in.

---

# 11. Outfit Visualization Rules

The generated image is a derived artifact.

```text
Source of truth:
Outfit + garmentIds

Derived representation:
AI-generated image
```

Generation occurs only after a valid outfit exists.

Expected flow:

```text
Create recommendation
       ↓
Validate garment IDs
       ↓
Persist Outfit
       ↓
Create visual PENDING
       ↓
Enqueue generation
       ↓
Worker generates visual
       ↓
Store file
       ↓
Visual READY
```

A failed visualization must never invalidate the outfit itself.

---

# 12. BullMQ / Redis Rules

Redis is operational infrastructure, not a source of domain truth.

Use BullMQ for:

- image generation;
- garment vision processing;
- notifications;
- cleanup;
- expensive/background operations.

## Payloads

Prefer small job payloads:

```json
{
  "outfitId": "..."
}
```

Do not serialize large domain graphs into jobs unless there is a clear reason.

## Persist Before Enqueue

Prefer:

```text
persist business state
↓
enqueue
```

## Idempotency

Jobs that may retry must be safe to execute more than once.

## Worker Responsibilities

Workers should call application use cases.

Avoid:

```text
BullMQ Processor
  ↓
Prisma
  ↓
OpenAI
  ↓
business logic
```

Prefer:

```text
BullMQ Processor
  ↓
Application Use Case
  ↓
Ports
  ↓
Adapters
```

---

# 13. Authentication Rules

## Passwords

Use Argon2id.

Never store plaintext passwords.

## Access Tokens

JWT access tokens are short lived, approximately 15 minutes by default.

TTL must be configurable.

## Refresh Tokens

Use rotating refresh tokens.

Store only token hashes.

Refresh-token reuse must be detectable.

A reused invalidated token should be treated as a possible compromised session.

## Sessions

Persist sessions in PostgreSQL.

Support:

- per-device session;
- expiration;
- revocation;
- logout;
- future logout-all.

## Authorization

Authentication is not authorization.

Every resource access must validate ownership or household-level permissions as appropriate.

JWT claims are not the authoritative source for dynamic permissions.

## Flutter

Sensitive tokens must use secure system storage, preferably iOS Keychain.

---

# 14. Object Storage Rules

Primary object storage is local.

Use:

```text
ObjectStoragePort
```

with an implementation such as:

```text
LocalObjectStorageAdapter
```

Do not make business logic depend on absolute disk paths.

PostgreSQL stores:

```text
object_key
metadata
ownership
resource association
```

not public filesystem URLs.

Cloudflare R2 may later implement the same port or be used for encrypted off-site backup.

---

# 15. Weather Rules

Weather access must go through:

```text
WeatherPort
```

Implementation:

```text
OpenMeteoAdapter
```

Weather data may be temporarily cached in Redis.

Do not make domain code depend on Open-Meteo response objects.

---

# 16. API Rules

API style:

```text
REST
JSON
OpenAPI 3.1
/api/v1
```

## Conventions

Use nouns/resources where natural and explicit commands where the domain behavior is clearer.

Examples:

```text
GET  /api/v1/garments
POST /api/v1/garments
GET  /api/v1/garments/{id}

POST /api/v1/outfit-recommendations
POST /api/v1/outfits/{id}/select
POST /api/v1/outfits/{id}/confirm-usage
POST /api/v1/outfits/{id}/feedback
```

## DTOs

Transport DTOs are not domain entities.

Validate request DTOs.

Do not pass unchecked transport input into domain logic.

## Errors

Use a consistent error model.

Do not expose:

- stack traces;
- database details;
- secrets;
- provider credentials.

---

# 17. Repository Structure

Target layout:

```text
closet-ai/
├── AGENTS.md
├── README.md
├── apps/
│   ├── api/
│   ├── worker/
│   └── mobile/
├── packages/
│   ├── domain/
│   ├── application/
│   └── shared/
├── docs/
│   ├── project/
│   ├── architecture/
│   ├── domain/
│   ├── api/
│   └── adr/
├── prompts/
├── infrastructure/
│   ├── docker/
│   ├── caddy/
│   ├── prometheus/
│   └── backup/
├── prisma/
├── docker-compose.yml
├── pnpm-workspace.yaml
└── .env.example
```

The exact physical structure may evolve if an ADR approves it.

Do not reorganize the entire repository during an unrelated feature.

---

# 18. Package Management

For TypeScript:

```text
pnpm
pnpm workspaces
```

Do not switch to npm, yarn, Bun, Nx, or Turborepo without an approved decision.

Flutter uses native Flutter/Dart package tooling.

---

# 19. Coding Conventions

## General

Prefer:

- explicit names;
- small modules;
- small use cases;
- predictable patterns;
- straightforward code.

Avoid:

- clever one-liners;
- excessive meta-programming;
- generic helper dumping grounds;
- `utils.ts` files containing unrelated logic;
- unnecessary inheritance;
- giant services;
- circular dependencies.

## Naming

Name code after the domain.

Prefer:

```text
ConfirmOutfitUsageUseCase
GarmentAvailabilityPolicy
PrismaGarmentRepository
OpenAIOutfitStylistAdapter
```

over:

```text
Manager
Processor
Helper
Handler2
CommonService
```

unless the name is genuinely appropriate.

## TypeScript

Avoid `any`.

If `any` is absolutely required, document why.

Prefer exhaustive handling for domain enums/states.

Avoid unvalidated type assertions on external input.

---

# 20. State Machines

Garment and outfit state transitions must be explicit.

Do not mutate state through arbitrary field updates.

Prefer intent-based operations.

Example:

```text
garment.markAsWornReusable()
garment.moveToLaundry()
garment.markAsWashing()
garment.markAsClean()
```

over:

```text
garment.status = arbitraryInput
```

Document allowed transitions.

Add tests for invalid transitions.

---

# 21. Transactions

Use transactions where a use case must remain consistent.

Example:

```text
Confirm Outfit Usage

BEGIN
  validate outfit
  mark outfit WORN
  create garment usage events
  update garment aggregates
COMMIT
```

Do not use transactions indiscriminately around slow external network calls.

Do not keep a PostgreSQL transaction open while waiting for OpenAI.

---

# 22. Events

Domain/application events may be used when useful.

Examples:

```text
GarmentAdded
GarmentWorn
GarmentMovedToLaundry
GarmentWashed
OutfitGenerated
OutfitSelected
OutfitWorn
OutfitRejected
```

Do not implement full Event Sourcing.

Persist event history only where it provides domain value.

---

# 23. Testing Policy

New domain behavior requires tests.

Critical areas require tests before considering work complete.

Priority cases:

```text
wrong owner garment
dirty/unavailable garment
invalid AI garment ID
duplicate usage confirmation
partial outfit usage
invalid state transition
refresh-token reuse
authorization boundary
failed background job
AI fallback
```

## Unit Tests

Fast and deterministic.

No real PostgreSQL/OpenAI/network.

## Integration Tests

Use Testcontainers where appropriate.

## API Tests

Use Supertest.

## AI Tests

Default test suite uses fakes.

Real-provider tests must be separately tagged/opt-in.

---

# 24. Security Policy

Never commit:

```text
API keys
JWT secrets
database passwords
Telegram tokens
private keys
refresh tokens
```

`.env.example` contains placeholders only.

Do not log:

- passwords;
- full JWTs;
- full refresh tokens;
- OpenAI API keys;
- database credentials.

Keep services private by default.

Never expose directly to the Internet:

```text
PostgreSQL
Redis
Prometheus
Grafana admin
filesystem
```

Caddy is the normal public ingress.

---

# 25. Configuration

All environment-specific values belong in configuration.

Examples:

```text
DATABASE_URL
REDIS_URL
OPENAI_API_KEY
AI_OUTFIT_MODEL
AI_VISION_MODEL
AI_IMAGE_MODEL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
JWT_ACCESS_TTL
JWT_REFRESH_TTL
OBJECT_STORAGE_ROOT
WEATHER_BASE_URL
```

Do not hardcode environment-specific paths, ports, hostnames, or secrets.

---

# 26. Observability Policy

Use structured logs.

Every significant workflow should support correlation.

Preferred identifiers:

```text
requestId
correlationId
userId
householdId
outfitId
garmentId
jobId
aiExecutionId
```

Never log sensitive values merely for convenience.

Add metrics when a workflow becomes operationally meaningful.

Do not build observability dashboards before useful metrics exist.

---

# 27. Deployment Rules

Target production runtime:

```text
Linux
Docker
Docker Compose
Caddy
```

A local/home server is the preferred production target.

The system must remain portable to a single Linux VPS/VM.

Do not add AWS-specific runtime assumptions.

The application should not require AWS-managed services.

---

# 28. Backup Rules

Backups are part of production readiness.

Minimum:

```text
PostgreSQL daily backup
Object storage daily backup
Configuration backup after relevant changes
```

Backups must live on a physically separate medium from the primary server.

Off-site encrypted backup is recommended but may be introduced later.

Use Restic for file/object backups unless an ADR replaces it.

---

# 29. CI/CD Rules

GitHub Actions must run at minimum:

```text
install
lint
typecheck
unit tests
integration tests
build
container build
dependency/security checks
```

Production deployment should be controlled.

Do not deploy every commit directly to production.

Container images should be versioned and published to GHCR.

---

# 30. Work Discipline for Codex

Before coding a task:

1. Read the relevant canonical documents.
2. Identify the affected bounded context/module.
3. Identify applicable invariants.
4. Check whether an ADR already governs the decision.
5. Inspect existing conventions.
6. Implement the smallest coherent change.
7. Add or update tests.
8. Update documentation only when behavior/contracts/architecture changed.

Do not start by generating large amounts of code.

Do not rewrite unrelated code.

Do not "clean up" architectural areas that are outside the requested task unless the change is required for correctness.

---

# 31. Change Scope Rules

Prefer small, reviewable changes.

A normal feature should not silently include:

- framework upgrades;
- repository restructuring;
- dependency replacement;
- new architecture patterns;
- new infrastructure;
- mass renaming.

If such work is necessary, separate it and explain why.

---

# 32. Dependency Policy

Before adding a production dependency:

1. determine whether the standard library/current stack can solve the problem;
2. verify the dependency is maintained;
3. explain what concrete problem it solves;
4. avoid overlapping libraries with the same responsibility.

Do not add dependencies solely to save a few lines of code.

For security-critical functionality, prefer mature libraries over custom cryptographic implementations.

---

# 33. Documentation Rules

Update documentation when changing:

- architecture;
- public API;
- domain states;
- major business rules;
- environment setup;
- external integrations.

Do not create redundant documents for information already covered by canonical docs.

ADRs document major decisions.

README documents how to work with the repository.

AGENTS.md documents permanent agent behavior.

---

# 34. ADR Policy

Create or update an ADR before changing:

- approved technology;
- architecture style;
- persistence strategy;
- authentication model;
- API style;
- major provider;
- deployment model;
- repository strategy.

ADR format should include:

```text
Context
Decision
Alternatives considered
Consequences
Risks
Status
```

Do not use ADRs for trivial code implementation choices.

---

# 35. MVP Boundaries

The first vertical slice must work without AI.

Initial flow:

```text
Create Household/User
        ↓
Create Garments
        ↓
List Available Garments
        ↓
Generate Basic Outfit
        ↓
Select Outfit
        ↓
Confirm Usage
        ↓
Create Usage Events
```

The AI integration comes after the core domain flow is correct and tested.

Do not block foundational domain development on OpenAI.

---

# 36. Features Intentionally Deferred

Unless specifically requested, do not implement yet:

```text
Alexa integration
Telegram integration
Laundry intelligence
Shopping intelligence
Travel wardrobe
Hyperrealistic personalized try-on
Advanced adaptive learning
Vector search
Embeddings
Commercial multi-tenant features
```

Architecture may allow them, but code should not speculate excessively about future requirements.

---

# 37. Cost Discipline

Closet AI initially serves two users.

Every infrastructure or AI choice must consider cost.

Prefer:

```text
local execution
open-source infrastructure
single-host deployment
reusable generated assets
cached weather
configurable AI models
```

Avoid paying for managed services unless they clearly reduce total cost or operational burden enough to justify them.

Do not introduce cloud dependencies by default.

---

# 38. Performance Discipline

Do not optimize prematurely.

Reasonable targets from the PRD:

```text
CRUD p95 < ~500 ms
AI recommendation: controlled latency
```

Slow operations should move to background jobs when appropriate.

Do not cache everything.

Use PostgreSQL directly until metrics show a need for caching.

---

# 39. Error Handling

Failures must be explicit.

Examples:

## AI failure

Return or preserve valid non-AI functionality.

## Image generation failure

Outfit remains valid.

## Weather failure

Proceed without weather when business rules permit and indicate degraded context.

## Queue failure

Persist business state before enqueue so work can be retried.

## Invalid AI garment ID

Reject the result.

Never silently substitute a different garment without a defined rule.

---

# 40. Human-in-the-Loop

The user retains final authority for:

- adding/correcting AI-classified garment metadata;
- confirming outfit usage;
- confirming laundry;
- retiring/donating/discarding garments;
- accepting purchase recommendations.

Do not automate these irreversible or reality-defining actions without explicit product approval.

---

# 41. AI Agent Behavior When Requirements Are Ambiguous

If ambiguity is local and low-risk:

- choose the simplest implementation consistent with existing conventions.

If ambiguity affects:

- domain invariants;
- security;
- persistence;
- public API;
- architecture;
- approved technology;
- user data semantics;

do not invent a rule.

Instead:

1. identify the ambiguity;
2. explain the impact;
3. propose a preferred option;
4. leave the disputed architectural behavior unimplemented until resolved.

When a safe, reversible implementation is possible, prefer it over blocking unrelated work.

---

# 42. Definition of Done

A task is complete only when applicable requirements are met:

- implementation exists;
- code compiles;
- types pass;
- lint passes;
- relevant tests pass;
- critical error paths are handled;
- authorization is correct;
- domain invariants are preserved;
- migrations exist for schema changes;
- OpenAPI is updated for API changes;
- documentation is updated for architectural/behavioral changes;
- no secrets are introduced;
- no unrelated architecture drift is introduced.

---

# 43. Before Finishing Any Codex Task

Perform a final check:

```text
[ ] Did I follow AGENTS.md?
[ ] Did I read the relevant PRD/project/architecture section?
[ ] Did I preserve domain invariants?
[ ] Did I avoid direct Prisma from controllers?
[ ] Did I avoid direct OpenAI calls from domain/application code where a port is required?
[ ] Did I add tests?
[ ] Did I handle authorization?
[ ] Did I handle idempotency where needed?
[ ] Did I avoid new unnecessary dependencies?
[ ] Did I avoid architecture drift?
[ ] Did I update contracts/docs if required?
[ ] Did I avoid committing secrets?
```

---

# 44. Core Rule

When in doubt, prefer:

```text
simple
explicit
tested
domain-oriented
maintainable
reversible
```

over:

```text
clever
generic
distributed
implicit
prematurely scalable
provider-coupled
```

The goal is not to produce the most sophisticated system.

The goal is to build **Closet AI correctly, incrementally, and in a form another developer can maintain.**
