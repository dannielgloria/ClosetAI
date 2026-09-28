import {
  DEFAULT_GARMENT_IMAGE_CLEANUP_BATCH_SIZE,
  DEFAULT_GARMENT_IMAGE_ORPHAN_GRACE_HOURS
} from "@closet-ai/application";

export interface WorkerConfig {
  environment: "local" | "production" | "test";
  databaseUrl: string;
  redisUrl: string;
  objectStorageRoot: string;
  openAiApiKey: string | undefined;
  outfitModel: string | undefined;
  outfitVisualizationModel: string | undefined;
  aiRequestTimeoutMs: number;
  orphanGraceHours: number;
  cleanupBatchSize: number;
  cleanupCron: string;
}

export function getWorkerConfig(): WorkerConfig {
  return {
    environment: getWorkerEnvironment(),
    databaseUrl: process.env.DATABASE_URL ?? "",
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    objectStorageRoot: process.env.OBJECT_STORAGE_ROOT ?? ".closet-ai/objects",
    openAiApiKey: process.env.OPENAI_API_KEY,
    outfitModel: process.env.AI_OUTFIT_MODEL,
    outfitVisualizationModel: process.env.AI_OUTFIT_VISUALIZATION_MODEL,
    aiRequestTimeoutMs: readPositiveInteger("AI_REQUEST_TIMEOUT_MS", 10_000),
    orphanGraceHours: readPositiveInteger("GARMENT_IMAGE_ORPHAN_GRACE_HOURS", DEFAULT_GARMENT_IMAGE_ORPHAN_GRACE_HOURS),
    cleanupBatchSize: readPositiveInteger("GARMENT_IMAGE_CLEANUP_BATCH_SIZE", DEFAULT_GARMENT_IMAGE_CLEANUP_BATCH_SIZE),
    cleanupCron: process.env.GARMENT_IMAGE_CLEANUP_CRON ?? "0 3 * * *"
  };
}

export function validateWorkerProductionConfig(): void {
  if (getWorkerEnvironment() !== "production") {
    return;
  }

  const required = ["DATABASE_URL", "REDIS_URL", "OBJECT_STORAGE_ROOT", "OPENAI_API_KEY", "AI_OUTFIT_MODEL", "AI_OUTFIT_VISUALIZATION_MODEL"];
  const missing = required.filter((name) => (process.env[name]?.trim() ?? "") === "");

  if (missing.length > 0) {
    throw new Error(`Missing worker production configuration: ${missing.join(", ")}`);
  }
}

function getWorkerEnvironment(): WorkerConfig["environment"] {
  if (process.env.NODE_ENV === "production") {
    return "production";
  }

  if (process.env.NODE_ENV === "test") {
    return "test";
  }

  return "local";
}

function readPositiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
