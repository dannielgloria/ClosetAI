import {
  ApplicationPorts,
  CLEANUP_ORPHAN_GARMENT_IMAGES_JOB,
  CleanupOrphanGarmentImagesUseCase,
  GarmentThumbnailGeneratorPort,
  GARMENT_IMAGE_MAINTENANCE_QUEUE,
  GenerateGarmentThumbnailUseCase,
  GENERATE_GARMENT_THUMBNAIL_JOB,
  ObjectStoragePort
} from "@closet-ai/application";
import { PrismaClient } from "@prisma/client";
import { Job, Queue, Worker } from "bullmq";
import { WorkerConfig } from "./config.js";
import { LocalObjectStorageAdapter } from "./local-object-storage.adapter.js";
import { createWorkerApplicationPorts } from "./prisma-application-ports.js";
import { SharpGarmentThumbnailGenerator } from "./sharp-garment-thumbnail-generator.js";

export interface GarmentImageMaintenanceRuntime {
  worker: Worker;
  queue: Queue;
  close(): Promise<void>;
}

export function createGarmentImageMaintenanceRuntime(config: WorkerConfig): GarmentImageMaintenanceRuntime {
  const prisma = new PrismaClient({ datasourceUrl: config.databaseUrl || undefined });
  const ports = createWorkerApplicationPorts(prisma);
  const storage = new LocalObjectStorageAdapter(config.objectStorageRoot);
  const thumbnailGenerator = new SharpGarmentThumbnailGenerator();
  const queue = new Queue(GARMENT_IMAGE_MAINTENANCE_QUEUE, {
    connection: { url: config.redisUrl }
  });
  const worker = new Worker(
    GARMENT_IMAGE_MAINTENANCE_QUEUE,
    async (job: Job) => {
      return processGarmentImageMaintenanceJob(
        { name: job.name, data: job.data },
        {
          ports,
          storage,
          thumbnailGenerator,
          gracePeriodHours: config.orphanGraceHours,
          batchSize: config.cleanupBatchSize
        }
      );
    },
    {
      connection: { url: config.redisUrl },
      concurrency: 1
    }
  );

  return {
    worker,
    queue,
    async close() {
      await worker.close();
      await queue.close();
      await prisma.$disconnect();
    }
  };
}

export async function processGarmentImageMaintenanceJob(
  job: { name: string; data: unknown },
  dependencies: {
    ports: ApplicationPorts;
    storage: ObjectStoragePort;
    thumbnailGenerator: GarmentThumbnailGeneratorPort;
    gracePeriodHours: number;
    batchSize: number;
  }
) {
  if (job.name === GENERATE_GARMENT_THUMBNAIL_JOB) {
    const payload = parseThumbnailPayload(job.data);
    const result = await new GenerateGarmentThumbnailUseCase(
      dependencies.ports,
      dependencies.storage,
      dependencies.thumbnailGenerator
    ).execute(payload);
    console.log(
      JSON.stringify({
        capability: "garment_thumbnail",
        garmentImageId: payload.garmentImageId,
        status: result.status
      })
    );
    return result.status;
  }

  if (job.name === CLEANUP_ORPHAN_GARMENT_IMAGES_JOB) {
    const result = await new CleanupOrphanGarmentImagesUseCase(dependencies.ports, dependencies.storage, {
      gracePeriodHours: dependencies.gracePeriodHours,
      batchSize: dependencies.batchSize
    }).execute();
    console.log(
      JSON.stringify({
        capability: "garment_image_orphan_cleanup",
        status: "completed",
        ...result
      })
    );
    return result;
  }

  throw new Error(`Unknown garment image maintenance job: ${job.name}`);
}

export async function scheduleGarmentImageMaintenanceJobs(config: WorkerConfig): Promise<Queue> {
  const queue = new Queue(GARMENT_IMAGE_MAINTENANCE_QUEUE, {
    connection: { url: config.redisUrl }
  });
  await queue.upsertJobScheduler(
    CLEANUP_ORPHAN_GARMENT_IMAGES_JOB,
    { pattern: config.cleanupCron },
    {
      name: CLEANUP_ORPHAN_GARMENT_IMAGES_JOB,
      data: {},
      opts: {
        removeOnComplete: true,
        removeOnFail: 30
      }
    }
  );

  return queue;
}

function parseThumbnailPayload(value: unknown): { garmentImageId: string } {
  if (!value || typeof value !== "object" || !("garmentImageId" in value) || typeof value.garmentImageId !== "string") {
    throw new Error("Invalid garment thumbnail job payload.");
  }

  return { garmentImageId: value.garmentImageId };
}
