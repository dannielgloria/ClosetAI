# MVP Vertical Slice v1

## Scope

This slice implements the foundational non-AI flow:

```text
Create Household/User
↓
Create Garments
↓
List Available Garments
↓
Generate Basic Outfit WITHOUT AI
↓
Select Outfit
↓
Confirm Usage
↓
Create Usage Events
```

## Invariants

- PostgreSQL is the source of truth.
- A garment belongs to exactly one user.
- Only `CLEAN_AVAILABLE` and `WORN_REUSABLE` garments are eligible for outfit generation.
- Garments owned by another user are never recommended.
- Selecting an outfit does not create usage events.
- Confirming usage is idempotent.
- Usage history is persisted as events, not only counters.
- Outfit feedback is persisted as independent history and does not imply selection or usage.

## Outfit State Naming

`AGENTS.md` mentions `PROPOSED`; the PRD uses `PRESENTED`. This slice uses `PRESENTED` in the database/API and treats it as the same conceptual stage.

## Outfit Feedback

`ACCEPTED` and `REJECTED` feedback are explicit user signals stored as
append-only `OutfitFeedback` rows. Feedback does not mutate `Outfit.status`:
`ACCEPTED` is not `SELECTED`, `SELECTED` is not `WORN`, and `REJECTED` does not
delete or invalidate the recommendation.

For MVP v1, duplicate submissions are not silently collapsed because there is
no idempotency-key convention for this endpoint yet.

## Garment Vision

Uploaded garment photos are private `GarmentImage` records owned by a user.
Images store an object key and metadata in PostgreSQL; image bytes live in local
object storage behind `ObjectStoragePort`.

Vision analysis proposes metadata only. It does not create a `Garment`, does not
change availability, and does not become source of truth until the user confirms
or edits the proposed fields through the existing garment creation flow.

An uploaded image may temporarily have no `garmentId` if the user analyzes but
does not confirm registration. Cleanup of old orphan images is deferred to a
future BullMQ maintenance job.
