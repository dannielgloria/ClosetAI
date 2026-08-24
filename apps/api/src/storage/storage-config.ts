export interface StorageConfig {
  objectStorageRoot: string;
}

export const STORAGE_CONFIG = Symbol("STORAGE_CONFIG");

export function getStorageConfig(): StorageConfig {
  return {
    objectStorageRoot: process.env.OBJECT_STORAGE_ROOT ?? ".closet-ai/objects"
  };
}
