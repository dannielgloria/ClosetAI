# ADR-010 Local Object Storage

## Status

Accepted

## Context

Closet AI stores private wardrobe images for two initial users in a self-hosted
deployment. The architecture assessment approves local persistent filesystem
storage behind an object-storage port, with PostgreSQL storing object metadata
and keys rather than binary blobs or public filesystem paths.

## Decision

Use `ObjectStoragePort` for object access and `LocalObjectStorageAdapter` as the
MVP implementation.

Garment images are stored under private object keys shaped like:

```text
users/{userId}/garment-images/{objectId}.{ext}
```

Thumbnail derivatives are stored under private object keys shaped like:

```text
users/{userId}/garment-images/{imageId}/thumbnail.webp
```

Thumbnails are derived, regenerable artifacts. The first MVP derivative is a
single WebP thumbnail with a maximum side of 512 px. The original remains the
authoritative uploaded image.

PostgreSQL stores `GarmentImage.objectKey`, `GarmentImage.thumbnailObjectKey`,
ownership, MIME type, size, and the optional garment association. Images are
served only through authenticated NestJS endpoints after application-layer
ownership validation.

Orphan cleanup is handled by the BullMQ worker. A `GarmentImage` is eligible for
cleanup when `garmentId IS NULL` and it is older than the configured grace
period. Cleanup deletes object-storage files first; only after object deletion
succeeds or the objects are already absent does the worker delete the PostgreSQL
row. If storage deletion fails, the row is preserved for retry.

## Alternatives Considered

- Public static directory.
- PostgreSQL bytea/blob storage.
- Presigned URLs.
- Cloudflare R2 as an operational dependency.

## Consequences

- The MVP remains self-hosted and low-cost.
- Storage can later be replaced with R2 or another provider behind the same
  port.
- Orphaned uploaded images can exist briefly when users analyze but never
  confirm a garment; cleanup is handled by a BullMQ maintenance job after a
  grace period.
- Thumbnails are excluded from domain authority and may be regenerated.

## Risks

- Local object storage must be included in backups.
- Large images are currently validated at the application boundary after upload
  reaches NestJS memory; stricter streaming limits can be added if needed.
