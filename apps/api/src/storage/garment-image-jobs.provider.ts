import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import {
  GARMENT_IMAGE_MAINTENANCE_QUEUE,
  GENERATE_GARMENT_THUMBNAIL_JOB,
  GarmentThumbnailQueuePort
} from "@closet-ai/application";
import { Queue } from "bullmq";
import { STORAGE_MAINTENANCE_CONFIG, StorageMaintenanceConfig } from "./storage-maintenance-config.js";

export const GARMENT_IMAGE_JOBS = Symbol("GARMENT_IMAGE_JOBS");

@Injectable()
export class BullMqGarmentImageJobsAdapter implements GarmentThumbnailQueuePort, OnModuleDestroy {
  private readonly logger = new Logger(BullMqGarmentImageJobsAdapter.name);
  private readonly queue: Queue;

  constructor(@Inject(STORAGE_MAINTENANCE_CONFIG) config: StorageMaintenanceConfig) {
    this.queue = new Queue(GARMENT_IMAGE_MAINTENANCE_QUEUE, {
      connection: { url: config.redisUrl }
    });
  }

  async enqueueThumbnailGeneration(input: { garmentImageId: string }): Promise<void> {
    try {
      await this.queue.add(
        GENERATE_GARMENT_THUMBNAIL_JOB,
        { garmentImageId: input.garmentImageId },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 5_000 },
          removeOnComplete: true,
          removeOnFail: 100
        }
      );
    } catch (error) {
      this.logger.warn(`Could not enqueue garment thumbnail job: ${error instanceof Error ? error.name : "UnknownError"}`);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
