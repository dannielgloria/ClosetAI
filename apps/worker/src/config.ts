import {
  DEFAULT_GARMENT_IMAGE_CLEANUP_BATCH_SIZE,
  DEFAULT_GARMENT_IMAGE_ORPHAN_GRACE_HOURS
} from "@closet-ai/application";

export interface WorkerConfig {
  databaseUrl: string;
  redisUrl: string;
  objectStorageRoot: string;
  orphanGraceHours: number;
  cleanupBatchSize: number;
  cleanupCron: string;
}

export function getWorkerConfig(): WorkerConfig {
  return {
    databaseUrl: process.env.DATABASE_URL ?? "",
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    objectStorageRoot: process.env.OBJECT_STORAGE_ROOT ?? ".closet-ai/objects",
    orphanGraceHours: readPositiveInteger("GARMENT_IMAGE_ORPHAN_GRACE_HOURS", DEFAULT_GARMENT_IMAGE_ORPHAN_GRACE_HOURS),
    cleanupBatchSize: readPositiveInteger("GARMENT_IMAGE_CLEANUP_BATCH_SIZE", DEFAULT_GARMENT_IMAGE_CLEANUP_BATCH_SIZE),
    cleanupCron: process.env.GARMENT_IMAGE_CLEANUP_CRON ?? "0 3 * * *"
  };
}

function readPositiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
