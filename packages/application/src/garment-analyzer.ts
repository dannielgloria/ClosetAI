import {
  EntityId,
  GarmentCategory,
  GarmentFit,
  GarmentMaterial,
  GarmentPattern,
  GarmentSubcategory
} from "@closet-ai/domain";
import { ApplicationPorts } from "./ports.js";

export const ALLOWED_GARMENT_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const DEFAULT_GARMENT_IMAGE_MAX_SIZE_MB = 8;

export interface GarmentImageBytes {
  data: Uint8Array;
  mimeType: string;
}

export interface ObjectStoragePort {
  storeGarmentImage(input: { userId: EntityId; content: Uint8Array; mimeType: string }): Promise<{ objectKey: string }>;
  readObject(objectKey: string): Promise<GarmentImageBytes>;
}

export interface GarmentAnalysis {
  category: GarmentCategory;
  subcategory: GarmentSubcategory | null;
  primaryColor: string;
  secondaryColors: string[];
  pattern: GarmentPattern | null;
  fit: GarmentFit | null;
  estimatedMaterial: GarmentMaterial | null;
  formality: number | null;
}

export interface GarmentAnalyzerPort {
  analyze(input: { imageId?: EntityId; image: GarmentImageBytes }): Promise<GarmentAnalysis>;
}

export class GarmentAnalysisFailedError extends Error {
  constructor(message = "Garment analysis failed.") {
    super(message);
    this.name = "GarmentAnalysisFailedError";
  }
}

export class UploadGarmentImageUseCase {
  constructor(
    private readonly ports: ApplicationPorts,
    private readonly objectStorage: ObjectStoragePort,
    private readonly config: { maxSizeBytes: number }
  ) {}

  async execute(input: { userId: EntityId; content: Uint8Array; mimeType: string }) {
    const user = await this.ports.users.findById(input.userId);
    if (!user) {
      throw new Error("User not found.");
    }

    validateImageUpload(input, this.config.maxSizeBytes);

    const stored = await this.objectStorage.storeGarmentImage({
      userId: input.userId,
      content: input.content,
      mimeType: input.mimeType
    });

    return this.ports.garmentImages.create({
      userId: input.userId,
      objectKey: stored.objectKey,
      mimeType: input.mimeType,
      size: input.content.byteLength
    });
  }
}

export class AnalyzeGarmentImageUseCase {
  constructor(
    private readonly ports: ApplicationPorts,
    private readonly objectStorage: ObjectStoragePort,
    private readonly garmentAnalyzer: GarmentAnalyzerPort
  ) {}

  async execute(input: { userId: EntityId; imageId: EntityId }): Promise<GarmentAnalysis> {
    const image = await this.ports.garmentImages.findById(input.imageId);
    if (!image) {
      throw new Error("Garment image not found.");
    }

    if (image.userId !== input.userId) {
      throw new Error("Garment image access is forbidden.");
    }

    try {
      const bytes = await this.objectStorage.readObject(image.objectKey);
      return parseGarmentAnalysis(await this.garmentAnalyzer.analyze({ imageId: image.id, image: bytes }));
    } catch (error) {
      if (error instanceof GarmentAnalysisFailedError) {
        throw error;
      }

      throw new GarmentAnalysisFailedError();
    }
  }
}

export class GetGarmentImageUseCase {
  constructor(
    private readonly ports: ApplicationPorts,
    private readonly objectStorage: ObjectStoragePort
  ) {}

  async execute(input: { userId: EntityId; imageId: EntityId }): Promise<GarmentImageBytes> {
    const image = await this.ports.garmentImages.findById(input.imageId);
    if (!image) {
      throw new Error("Garment image not found.");
    }

    if (image.userId !== input.userId) {
      throw new Error("Garment image access is forbidden.");
    }

    return this.objectStorage.readObject(image.objectKey);
  }
}

export function parseGarmentAnalysis(value: unknown): GarmentAnalysis {
  if (!isRecord(value)) {
    throw new GarmentAnalysisFailedError();
  }

  const category = parseEnum(value.category, GarmentCategory);
  const primaryColor = parseColor(value.primaryColor);
  const secondaryColors = parseSecondaryColors(value.secondaryColors);
  const formality = parseFormality(value.formality);

  return {
    category,
    primaryColor,
    secondaryColors,
    subcategory: parseNullableEnum(value.subcategory, GarmentSubcategory),
    pattern: parseNullableEnum(value.pattern, GarmentPattern),
    fit: parseNullableEnum(value.fit, GarmentFit),
    estimatedMaterial: parseNullableEnum(value.estimatedMaterial, GarmentMaterial),
    formality
  };
}

function validateImageUpload(input: { content: Uint8Array; mimeType: string }, maxSizeBytes: number): void {
  if (input.content.byteLength === 0) {
    throw new Error("Garment image is required.");
  }

  if (!ALLOWED_GARMENT_IMAGE_MIME_TYPES.includes(input.mimeType as (typeof ALLOWED_GARMENT_IMAGE_MIME_TYPES)[number])) {
    throw new Error("Unsupported garment image MIME type.");
  }

  if (input.content.byteLength > maxSizeBytes) {
    throw new Error("Garment image is too large.");
  }
}

function parseEnum<T extends Record<string, string>>(value: unknown, candidates: T): T[keyof T] {
  if (typeof value !== "string" || !Object.values(candidates).includes(value)) {
    throw new GarmentAnalysisFailedError();
  }

  return value as T[keyof T];
}

function parseNullableEnum<T extends Record<string, string>>(value: unknown, candidates: T): T[keyof T] | null {
  if (value === null) {
    return null;
  }

  return parseEnum(value, candidates);
}

function parseColor(value: unknown): string {
  if (typeof value !== "string") {
    throw new GarmentAnalysisFailedError();
  }

  const color = value.trim().toUpperCase().replaceAll(/[^A-Z0-9_]/g, "_");
  if (color.length === 0 || color.length > 40) {
    throw new GarmentAnalysisFailedError();
  }

  return color;
}

function parseSecondaryColors(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 5) {
    throw new GarmentAnalysisFailedError();
  }

  return value.map(parseColor);
}

function parseFormality(value: unknown): number | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
    throw new GarmentAnalysisFailedError();
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
