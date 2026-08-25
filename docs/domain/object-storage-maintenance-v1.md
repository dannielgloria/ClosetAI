# Object Storage Maintenance v1

## Scope

This slice maintains private garment image objects without changing wardrobe
domain authority.

Original garment photos remain private local objects. PostgreSQL stores object
keys and ownership metadata, not binary blobs.

## Thumbnails

Each `GarmentImage` may have one derived thumbnail:

```text
users/{userId}/garment-images/{imageId}/thumbnail.webp
```

Policy:

- maximum side: 512 px;
- format: WebP;
- derivative and regenerable;
- not a second authoritative garment image;
- served only through authenticated image endpoints.

If a thumbnail is missing, the API may serve the original image as fallback.

## Orphans

A `GarmentImage` is an orphan when:

- `garmentId IS NULL`;
- `createdAt` is older than `GARMENT_IMAGE_ORPHAN_GRACE_HOURS`;
- it is still unassociated when cleanup revalidates it.

Default grace period:

```text
24 hours
```

Cleanup only applies to images never associated with a garment. Garment lifecycle
states such as `RETIRED`, `DONATED`, or `DISCARDED` do not delete images.

## Cleanup Consistency

There is no distributed transaction across PostgreSQL and the local filesystem.
Cleanup uses this safe order:

1. load candidates from PostgreSQL;
2. re-read the image row before physical deletion;
3. skip if it is now associated or no longer old enough;
4. delete original object;
5. delete thumbnail object when present;
6. delete the database row only if it is still unassociated.

If object deletion fails, the database row is preserved for retry.

## Backup

Original images must be included in object-storage backups. Thumbnails are
regenerable and may be excluded from backup later if the backup tooling can do
so safely.
