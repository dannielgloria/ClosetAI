import { getWorkerConfig, validateWorkerProductionConfig } from "./config.js";
import { createGarmentImageMaintenanceRuntime, scheduleGarmentImageMaintenanceJobs } from "./garment-image-maintenance-worker.js";
import { createOutfitVisualizationRuntime } from "./outfit-visualization-worker.js";

export function getWorkerStatus() {
  return {
    status: "ready",
    queues: ["garment-image-maintenance", "outfit-visualization"]
  };
}

export async function startWorker() {
  validateWorkerProductionConfig();
  const config = getWorkerConfig();
  const schedulerQueue = await scheduleGarmentImageMaintenanceJobs(config);
  await schedulerQueue.close();
  const garmentImageRuntime = createGarmentImageMaintenanceRuntime(config);
  const outfitVisualizationRuntime = createOutfitVisualizationRuntime(config);

  const shutdown = async () => {
    await outfitVisualizationRuntime.close();
    await garmentImageRuntime.close();
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void shutdown();
  });
  process.once("SIGTERM", () => {
    void shutdown();
  });

  return {
    garmentImageRuntime,
    outfitVisualizationRuntime,
    async close() {
      await outfitVisualizationRuntime.close();
      await garmentImageRuntime.close();
    }
  };
}

if (process.env.NODE_ENV !== "test") {
  await startWorker();
}
