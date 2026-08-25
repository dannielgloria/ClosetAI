import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize, sep } from "node:path";
import { ObjectStoragePort } from "@closet-ai/application";

const EXTENSIONS_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export class LocalObjectStorageAdapter implements ObjectStoragePort {
  constructor(private readonly objectStorageRoot: string) {}

  async storeGarmentImage(input: { userId: string; content: Uint8Array; mimeType: string }): Promise<{ objectKey: string }> {
    const extension = EXTENSIONS_BY_MIME_TYPE[input.mimeType] ?? "bin";
    const objectKey = `users/${input.userId}/garment-images/${randomUUID()}.${extension}`;
    await this.writeObject({ objectKey, content: input.content, mimeType: input.mimeType });

    return { objectKey };
  }

  async writeObject(input: { objectKey: string; content: Uint8Array; mimeType: string }): Promise<void> {
    const path = this.resolveObjectPath(input.objectKey);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, input.content);
  }

  async readObject(objectKey: string): Promise<{ data: Uint8Array; mimeType: string }> {
    const data = await readFile(this.resolveObjectPath(objectKey));
    return {
      data,
      mimeType: mimeTypeFromObjectKey(objectKey)
    };
  }

  async objectExists(objectKey: string): Promise<boolean> {
    try {
      await access(this.resolveObjectPath(objectKey));
      return true;
    } catch {
      return false;
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    await rm(this.resolveObjectPath(objectKey), { force: true });
  }

  private resolveObjectPath(objectKey: string): string {
    const path = normalize(join(this.objectStorageRoot, objectKey));
    const root = normalize(this.objectStorageRoot);
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
