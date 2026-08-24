# Garment Lifecycle v1

## Canonical States

Closet AI uses one garment status enum:

```text
CLEAN_AVAILABLE
WORN_REUSABLE
LAUNDRY_BIN
WASHING
DRYING
CLEAN_PENDING_STORAGE
UNAVAILABLE
REPAIR
RETIRED
DONATED
DISCARDED
```

Only `CLEAN_AVAILABLE` and `WORN_REUSABLE` are eligible for outfit
recommendation.

## Transitions

Garment lifecycle changes must use explicit transitions:

```text
CLEAN_AVAILABLE
  -> MARK_WORN_REUSABLE -> WORN_REUSABLE
  -> SEND_TO_LAUNDRY -> LAUNDRY_BIN
  -> MARK_UNAVAILABLE -> UNAVAILABLE
  -> SEND_TO_REPAIR -> REPAIR
  -> RETIRE -> RETIRED
  -> DONATE -> DONATED
  -> DISCARD -> DISCARDED

WORN_REUSABLE
  -> SEND_TO_LAUNDRY -> LAUNDRY_BIN
  -> MARK_CLEAN_AVAILABLE -> CLEAN_AVAILABLE
  -> MARK_UNAVAILABLE -> UNAVAILABLE
  -> SEND_TO_REPAIR -> REPAIR
  -> RETIRE -> RETIRED
  -> DONATE -> DONATED
  -> DISCARD -> DISCARDED

LAUNDRY_BIN
  -> START_WASHING -> WASHING
  -> MARK_CLEAN_AVAILABLE -> CLEAN_AVAILABLE
  -> MARK_UNAVAILABLE -> UNAVAILABLE
  -> RETIRE -> RETIRED
  -> DONATE -> DONATED
  -> DISCARD -> DISCARDED

WASHING
  -> START_DRYING -> DRYING
  -> MARK_UNAVAILABLE -> UNAVAILABLE

DRYING
  -> MARK_CLEAN_PENDING_STORAGE -> CLEAN_PENDING_STORAGE
  -> MARK_CLEAN_AVAILABLE -> CLEAN_AVAILABLE

CLEAN_PENDING_STORAGE
  -> MARK_CLEAN_AVAILABLE -> CLEAN_AVAILABLE

UNAVAILABLE
  -> MARK_CLEAN_AVAILABLE -> CLEAN_AVAILABLE
  -> SEND_TO_REPAIR -> REPAIR
  -> RETIRE -> RETIRED
  -> DONATE -> DONATED
  -> DISCARD -> DISCARDED

REPAIR
  -> RETURN_FROM_REPAIR -> CLEAN_AVAILABLE
  -> RETIRE -> RETIRED
  -> DONATE -> DONATED
  -> DISCARD -> DISCARDED

RETIRED
  -> RESTORE -> CLEAN_AVAILABLE
  -> DONATE -> DONATED
  -> DISCARD -> DISCARDED

DONATED
  terminal

DISCARDED
  terminal
```

`DONATED` and `DISCARDED` are terminal. `RETIRED` can be restored only through
the explicit `RESTORE` transition.

## History

Every successful lifecycle transition persists one `GarmentStateTransition`
record with:

```text
garmentId
userId
fromStatus
toStatus
transition
createdAt
```

This is separate from `GarmentUsageEvent`. Usage answers whether a garment was
worn; lifecycle records physical availability/status changes.

## Editing

Manual metadata editing may update:

```text
name
category
subcategory
primaryColor
secondaryColors
pattern
fit
estimatedMaterial
formality
```

It must not update:

```text
id
userId
status
wearCount
lastWornAt
createdAt
image ownership
```
