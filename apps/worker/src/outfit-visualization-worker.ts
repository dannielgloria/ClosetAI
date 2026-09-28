import {
  ApplicationPorts,
  GENERATE_OUTFIT_VISUALIZATION_JOB,
  GenerateOutfitVisualizationUseCase,
  ObjectStoragePort,
  OUTFIT_VISUALIZATION_QUEUE,
  OutfitVisualizationPort
} from "@closet-ai/application";
import { PrismaClient } from "@prisma/client";
import { Job, Queue, Worker } from "bullmq";
import { WorkerConfig } from "./config.js";
import { LocalObjectStorageAdapter } from "./local-object-storage.adapter.js";
import { OpenAIOutfitVisualizationAdapter } from "./openai-outfit-visualization.adapter.js";
import { createWorkerApplicationPorts } from "./prisma-application-ports.js";

export interface OutfitVisualizationRuntime {
  worker: Worker;
  queue: Queue;
  close(): Promise<void>;
}

export function createOutfitVisualizationRuntime(config: WorkerConfig): OutfitVisualizationRuntime {
  const prisma = new PrismaClient({ datasourceUrl: config.databaseUrl || undefined });
  const ports = createWorkerApplicationPorts(prisma);
  const storage = new LocalObjectStorageAdapter(config.objectStorageRoot);
  const visualizer = new OpenAIOutfitVisualizationAdapter(config);
  const queue = new Queue(OUTFIT_VISUALIZATION_QUEUE, {
    connection: { url: config.redisUrl }
  });
  const worker = new Worker(
    OUTFIT_VISUALIZATION_QUEUE,
    async (job: Job) => {
      return processOutfitVisualizationJob(
        { name: job.name, data: job.data },
        {
          ports,
          storage,
          visualizer
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

export async function processOutfitVisualizationJob(
  job: { name: string; data: unknown },
  dependencies: {
    ports: ApplicationPorts;
    storage: ObjectStoragePort;
    visualizer: OutfitVisualizationPort;
  }
) {
  if (job.name !== GENERATE_OUTFIT_VISUALIZATION_JOB) {
    throw new Error(`Unknown outfit visualization job: ${job.name}`);
  }

  const payload = parseVisualizationPayload(job.data);
  const result = await new GenerateOutfitVisualizationUseCase(
    dependencies.ports,
    dependencies.storage,
    dependencies.visualizer
  ).execute(payload);
  console.log(
    JSON.stringify({
      capability: "outfit_visualization",
      outfitVisualizationId: payload.outfitVisualizationId,
      status: result.status
    })
  );
  return result.status;
}

function parseVisualizationPayload(value: unknown): { outfitVisualizationId: string } {
  if (!value || typeof value !== "object" || !("outfitVisualizationId" in value) || typeof value.outfitVisualizationId !== "string") {
    throw new Error("Invalid outfit visualization job payload.");
  }

  return { outfitVisualizationId: value.outfitVisualizationId };
}
