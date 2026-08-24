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

PostgreSQL stores `GarmentImage.objectKey`, ownership, MIME type, size, and the
optional garment association. Images are served only through authenticated
NestJS endpoints after application-layer ownership validation.

## Alternatives Considered

- Public static directory.
- PostgreSQL bytea/blob storage.
- Presigned URLs.
- Cloudflare R2 as an operational dependency.

## Consequences

- The MVP remains self-hosted and low-cost.
- Storage can later be replaced with R2 or another provider behind the same
  port.
- Orphaned uploaded images can exist when users analyze but never confirm a
  garment; cleanup is deferred to a future BullMQ maintenance job.

## Risks

- Local object storage must be included in backups.
- Large images are currently validated at the application boundary after upload
  reaches NestJS memory; stricter streaming limits can be added if needed.
