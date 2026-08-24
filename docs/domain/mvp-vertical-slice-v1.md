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

## Outfit State Naming

`AGENTS.md` mentions `PROPOSED`; the PRD uses `PRESENTED`. This slice uses `PRESENTED` in the database/API and treats it as the same conceptual stage.
