import { afterEach, describe, expect, it } from "vitest";
import {
  ApplicationPorts,
  CLEANUP_ORPHAN_GARMENT_IMAGES_JOB,
  GARMENT_IMAGE_MAINTENANCE_QUEUE,
  GENERATE_GARMENT_THUMBNAIL_JOB,
  GarmentThumbnailGeneratorPort,
  ObjectStoragePort
} from "@closet-ai/application";
import { GarmentImage } from "@closet-ai/domain";
import { processGarmentImageMaintenanceJob } from "./garment-image-maintenance-worker.js";
import { getWorkerStatus } from "./main.js";
import { getWorkerConfig, validateWorkerProductionConfig } from "./config.js";

describe("garment image maintenance worker", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("reports the garment image maintenance queue", () => {
    expect(getWorkerStatus()).toEqual({ status: "ready", queues: [GARMENT_IMAGE_MAINTENANCE_QUEUE] });
  });

  it("fails fast in production when worker runtime configuration is missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    delete process.env.OBJECT_STORAGE_ROOT;

    expect(() => validateWorkerProductionConfig()).toThrow("Missing worker production configuration");
  });

  it("accepts minimal worker production configuration", () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://closet_ai:strong-password@postgres:5432/closet_ai";
    process.env.REDIS_URL = "redis://redis:6379";
    process.env.OBJECT_STORAGE_ROOT = "/data/closet-ai/objects";

    expect(() => validateWorkerProductionConfig()).not.toThrow();
    expect(getWorkerConfig()).toMatchObject({
      environment: "production",
      objectStorageRoot: "/data/closet-ai/objects"
    });
  });

  it("generates a thumbnail from a small job payload", async () => {
    const ports = new WorkerTestPorts();
    const storage = new WorkerTestStorage();
    const generator = new WorkerTestThumbnailGenerator();
    ports.images.set("image-1", imageFixture({ id: "image-1" }));
    storage.objects.set("original.jpg", { data: new Uint8Array([1]), mimeType: "image/jpeg" });

    await expect(
      processGarmentImageMaintenanceJob(
        { name: GENERATE_GARMENT_THUMBNAIL_JOB, data: { garmentImageId: "image-1" } },
        { ports: ports.value, storage, thumbnailGenerator: generator, gracePeriodHours: 24, batchSize: 100 }
      )
    ).resolves.toBe("generated");

    expect(generator.calls).toBe(1);
    expect(ports.images.get("image-1")?.thumbnailObjectKey).toBe("users/user-1/garment-images/image-1/thumbnail.webp");
  });

  it("keeps thumbnail generation idempotent when derivative exists", async () => {
    const ports = new WorkerTestPorts();
    const storage = new WorkerTestStorage();
    const generator = new WorkerTestThumbnailGenerator();
    ports.images.set(
      "image-1",
      imageFixture({
        id: "image-1",
        thumbnailObjectKey: "users/user-1/garment-images/image-1/thumbnail.webp"
      })
    );
    storage.objects.set("users/user-1/garment-images/image-1/thumbnail.webp", { data: new Uint8Array([9]), mimeType: "image/webp" });

    await expect(
      processGarmentImageMaintenanceJob(
        { name: GENERATE_GARMENT_THUMBNAIL_JOB, data: { garmentImageId: "image-1" } },
        { ports: ports.value, storage, thumbnailGenerator: generator, gracePeriodHours: 24, batchSize: 100 }
      )
    ).resolves.toBe("already_exists");

    expect(generator.calls).toBe(0);
  });

  it("delegates orphan cleanup to the application use case", async () => {
    const ports = new WorkerTestPorts();
    const storage = new WorkerTestStorage();
    ports.images.set("image-1", imageFixture({ id: "image-1", createdAt: new Date("2026-08-22T00:00:00.000Z") }));
    storage.objects.set("original.jpg", { data: new Uint8Array([1]), mimeType: "image/jpeg" });

    const result = await processGarmentImageMaintenanceJob(
      { name: CLEANUP_ORPHAN_GARMENT_IMAGES_JOB, data: {} },
      {
        ports: ports.value,
        storage,
        thumbnailGenerator: new WorkerTestThumbnailGenerator(),
        gracePeriodHours: 24,
        batchSize: 100
      }
    );

    expect(result).toMatchObject({ candidates: 1, deleted: 1 });
    expect(ports.images.has("image-1")).toBe(false);
  });

  it("rejects invalid thumbnail payloads", async () => {
    const ports = new WorkerTestPorts();
    await expect(
      processGarmentImageMaintenanceJob(
        { name: GENERATE_GARMENT_THUMBNAIL_JOB, data: { imageId: "wrong" } },
        {
          ports: ports.value,
          storage: new WorkerTestStorage(),
          thumbnailGenerator: new WorkerTestThumbnailGenerator(),
          gracePeriodHours: 24,
          batchSize: 100
        }
      )
    ).rejects.toThrow("Invalid garment thumbnail job payload.");
  });
});

class WorkerTestPorts {
  readonly images = new Map<string, GarmentImage>();

  readonly value: ApplicationPorts = {
    households: unsupportedHouseholds(),
    users: unsupportedUsers(),
    userCredentials: unsupportedUserCredentials(),
    authSessions: unsupportedAuthSessions(),
    garments: unsupportedGarments(),
    garmentImages: {
      create: unsupported,
      findById: async (id) => this.images.get(id) ?? null,
      linkToGarment: unsupported,
      updateThumbnailObjectKey: async (input) => {
        const image = this.images.get(input.imageId);
        if (!image) {
          throw new Error("Garment image not found.");
        }

        const updated = { ...image, thumbnailObjectKey: input.thumbnailObjectKey };
        this.images.set(updated.id, updated);
        return updated;
      },
      findOrphanedBefore: async (input) =>
        [...this.images.values()].filter((image) => image.garmentId === null && image.createdAt.getTime() < input.olderThan.getTime()),
      deleteOrphanById: async (imageId) => {
        const image = this.images.get(imageId);
        if (!image || image.garmentId) {
          return false;
        }

        return this.images.delete(imageId);
      }
    },
    outfits: unsupportedOutfits(),
    usageEvents: unsupportedUsageEvents(),
    outfitFeedback: unsupportedOutfitFeedback(),
    garmentStateTransitions: unsupportedGarmentStateTransitions()
  };
}

class WorkerTestStorage implements ObjectStoragePort {
  readonly objects = new Map<string, { data: Uint8Array; mimeType: string }>();

  async storeGarmentImage(): Promise<{ objectKey: string }> {
    throw new Error("not used");
  }

  async writeObject(input: { objectKey: string; content: Uint8Array; mimeType: string }): Promise<void> {
    this.objects.set(input.objectKey, { data: input.content, mimeType: input.mimeType });
  }

  async readObject(objectKey: string): Promise<{ data: Uint8Array; mimeType: string }> {
    const object = this.objects.get(objectKey);
    if (!object) {
      throw new Error("Object not found.");
    }

    return object;
  }

  async objectExists(objectKey: string): Promise<boolean> {
    return this.objects.has(objectKey);
  }

  async deleteObject(objectKey: string): Promise<void> {
    this.objects.delete(objectKey);
  }
}

class WorkerTestThumbnailGenerator implements GarmentThumbnailGeneratorPort {
  calls = 0;

  async generate(): Promise<{ data: Uint8Array; mimeType: string }> {
    this.calls += 1;
    return { data: new Uint8Array([7]), mimeType: "image/webp" };
  }
}

function imageFixture(overrides: Partial<GarmentImage> = {}): GarmentImage {
  return {
    id: "image-1",
    userId: "user-1",
    garmentId: null,
    objectKey: "original.jpg",
    thumbnailObjectKey: null,
    mimeType: "image/jpeg",
    size: 1,
    createdAt: new Date("2026-08-22T00:00:00.000Z"),
    ...overrides
  };
}

async function unsupported(): Promise<never> {
  throw new Error("not implemented");
}

function unsupportedHouseholds(): ApplicationPorts["households"] {
  return { createWithInitialUser: unsupported, findById: unsupported };
}

function unsupportedUsers(): ApplicationPorts["users"] {
  return { create: unsupported, findById: unsupported, updateLocation: unsupported };
}

function unsupportedUserCredentials(): ApplicationPorts["userCredentials"] {
  return { create: unsupported, findByEmail: unsupported, findByUserId: unsupported, count: unsupported };
}

function unsupportedAuthSessions(): ApplicationPorts["authSessions"] {
  return { create: unsupported, findById: unsupported, findExpired: unsupported, findRevoked: unsupported, save: unsupported };
}

function unsupportedGarments(): ApplicationPorts["garments"] {
  return {
    create: unsupported,
    findByUserId: unsupported,
    findAvailableByUserId: unsupported,
    findByIds: unsupported,
    findById: unsupported,
    updateMetadata: unsupported,
    save: unsupported
  };
}

function unsupportedOutfits(): ApplicationPorts["outfits"] {
  return { create: unsupported, findById: unsupported, save: unsupported };
}

function unsupportedUsageEvents(): ApplicationPorts["usageEvents"] {
  return { createManyIfAbsent: unsupported, findByOutfitId: unsupported };
}

function unsupportedOutfitFeedback(): ApplicationPorts["outfitFeedback"] {
  return { create: unsupported, findByOutfitId: unsupported };
}

function unsupportedGarmentStateTransitions(): ApplicationPorts["garmentStateTransitions"] {
  return { create: unsupported, findByGarmentId: unsupported };
}
