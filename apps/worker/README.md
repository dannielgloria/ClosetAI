# Closet AI Worker

Background worker for operational jobs approved in the modular monolith.

Current queue:

```text
garment-image-maintenance
```

Jobs:

```text
generate-garment-thumbnail
cleanup-orphan-garment-images
```

Processors call application use cases. They do not query Prisma directly for
business behavior and do not depend on public object-storage paths.
