import { getWorkerConfig } from "./config.js";
import { createGarmentImageMaintenanceRuntime, scheduleGarmentImageMaintenanceJobs } from "./garment-image-maintenance-worker.js";

export function getWorkerStatus() {
  return {
    status: "ready",
    queues: ["garment-image-maintenance"]
  };
}

export async function startWorker() {
  const config = getWorkerConfig();
  const schedulerQueue = await scheduleGarmentImageMaintenanceJobs(config);
  await schedulerQueue.close();
  const runtime = createGarmentImageMaintenanceRuntime(config);

  const shutdown = async () => {
    await runtime.close();
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void shutdown();
  });
  process.once("SIGTERM", () => {
    void shutdown();
  });

  return runtime;
}

if (process.env.NODE_ENV !== "test") {
  await startWorker();
}
