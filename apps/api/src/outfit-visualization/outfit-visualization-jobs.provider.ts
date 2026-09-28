import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import {
  GENERATE_OUTFIT_VISUALIZATION_JOB,
  OUTFIT_VISUALIZATION_QUEUE,
  OutfitVisualizationQueuePort
} from "@closet-ai/application";
import { Queue } from "bullmq";
import { STORAGE_MAINTENANCE_CONFIG, StorageMaintenanceConfig } from "../storage/storage-maintenance-config.js";

export const OUTFIT_VISUALIZATION_JOBS = Symbol("OUTFIT_VISUALIZATION_JOBS");

@Injectable()
export class BullMqOutfitVisualizationJobsAdapter implements OutfitVisualizationQueuePort, OnModuleDestroy {
  private readonly logger = new Logger(BullMqOutfitVisualizationJobsAdapter.name);
  private readonly queue: Queue;

  constructor(@Inject(STORAGE_MAINTENANCE_CONFIG) config: StorageMaintenanceConfig) {
    this.queue = new Queue(OUTFIT_VISUALIZATION_QUEUE, {
      connection: { url: config.redisUrl }
    });
  }

  async enqueueVisualization(input: { outfitVisualizationId: string }): Promise<void> {
    try {
      await this.queue.add(
        GENERATE_OUTFIT_VISUALIZATION_JOB,
        { outfitVisualizationId: input.outfitVisualizationId },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 10_000 },
          removeOnComplete: true,
          removeOnFail: 100
        }
      );
    } catch (error) {
      this.logger.warn(`Could not enqueue outfit visualization job: ${error instanceof Error ? error.name : "UnknownError"}`);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
