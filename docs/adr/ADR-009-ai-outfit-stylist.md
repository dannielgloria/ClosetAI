# ADR-009 AI Outfit Stylist

## Status

Accepted

## Context

Closet AI must recommend outfits using real wardrobe data while preserving PostgreSQL and domain rules as the source of truth. The product and architecture documents require deterministic filtering before AI and forbid the model from inventing garments or mutating domain state.

AI Slice 2 introduces OpenAI assistance for ranking and composing outfit recommendations from already eligible garments.

## Decision

Implement outfit styling behind a semantic `OutfitStylistPort`.

The recommendation flow is:

```text
Authenticated user
↓
Structured context
↓
Load user's garments
↓
Deterministic eligibility filtering
↓
OpenAIOutfitStylistAdapter
↓
Structured recommendations
↓
Backend domain validation
↓
Persist Outfit records
```

OpenAI receives only a minimal garment candidate representation:

```text
id
category
primaryColor
status
name
```

OpenAI may select only supplied garment IDs. The application validates every returned ID, score, duplicate, ownership boundary, eligibility rule, and minimum outfit category requirement before persistence.

If OpenAI fails with a provider error, timeout, malformed output, or unavailable configuration, the application may use the existing deterministic basic outfit engine as fallback when enough eligible garments exist.

## Alternatives Considered

- Replacing the deterministic engine with model reasoning.
- Letting OpenAI query or receive the full wardrobe state.
- Creating a separate recommendation entity parallel to `Outfit`.
- Persisting failed AI attempts in a new `ai_executions` table immediately.

## Consequences

- The existing basic outfit engine remains available and testable.
- AI can improve ranking/context fit without becoming authoritative.
- Recommendations persist through the existing `Outfit` model.
- Normal unit and integration tests remain deterministic and do not call OpenAI.

## Risks

- The persisted `Outfit` model does not yet store the generation strategy explicitly. API responses expose strategy for the current request, but historical analytics will need a persistence addition later.
- Current garment metadata is minimal, so AI quality is limited until subcategory, material, fit, formality, images, and user style profile exist.
- Fallback can produce a valid but less context-aware outfit.
