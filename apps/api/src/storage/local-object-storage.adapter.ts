import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize, sep } from "node:path";
import { Inject, Injectable } from "@nestjs/common";
import { ObjectStoragePort } from "@closet-ai/application";
import { STORAGE_CONFIG, StorageConfig } from "./storage-config.js";

const EXTENSIONS_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

@Injectable()
export class LocalObjectStorageAdapter implements ObjectStoragePort {
  constructor(@Inject(STORAGE_CONFIG) private readonly config: StorageConfig) {}

  async storeGarmentImage(input: { userId: string; content: Uint8Array; mimeType: string }): Promise<{ objectKey: string }> {
    const extension = EXTENSIONS_BY_MIME_TYPE[input.mimeType] ?? "bin";
    const objectKey = `users/${input.userId}/garment-images/${randomUUID()}.${extension}`;
    const path = this.resolveObjectPath(objectKey);

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, input.content);

    return { objectKey };
  }

  async readObject(objectKey: string): Promise<{ data: Uint8Array; mimeType: string }> {
    const data = await readFile(this.resolveObjectPath(objectKey));
    return {
      data,
      mimeType: mimeTypeFromObjectKey(objectKey)
    };
  }

  private resolveObjectPath(objectKey: string): string {
    const path = normalize(join(this.config.objectStorageRoot, objectKey));
    const root = normalize(this.config.objectStorageRoot);
    if (path !== root && !path.startsWith(`${root}${sep}`)) {
      throw new Error("Invalid object key.");
    }

    return path;
  }
}

function mimeTypeFromObjectKey(objectKey: string): string {
  if (objectKey.endsWith(".png")) {
    return "image/png";
  }

  if (objectKey.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
}
