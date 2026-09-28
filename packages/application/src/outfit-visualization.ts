import {
  EntityId,
  Garment,
  Outfit,
  OutfitVisualization,
  OutfitVisualizationStatus
} from "@closet-ai/domain";
import { ApplicationPorts } from "./ports.js";
import { GarmentImageBytes, ObjectStoragePort } from "./garment-analyzer.js";

export const OUTFIT_VISUALIZATION_QUEUE = "outfit-visualization";
export const GENERATE_OUTFIT_VISUALIZATION_JOB = "generate-outfit-visualization";
export const OUTFIT_VISUALIZATION_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const OUTFIT_VISUALIZATION_ALLOWED_MIME_TYPES = ["image/webp", "image/png", "image/jpeg"] as const;

export interface OutfitVisualizationGarmentInput {
  id: EntityId;
  name?: string;
  category: string;
  subcategory: string | null;
  primaryColor: string;
  secondaryColors: string[];
  pattern: string | null;
  fit: string | null;
  estimatedMaterial: string | null;
  formality: number | null;
  image: GarmentImageBytes | null;
}

export interface GeneratedOutfitVisualization {
  image: GarmentImageBytes;
  provider: string;
  model: string;
  promptVersion: string;
}

export interface OutfitVisualizationPort {
  generate(input: {
    visualizationId: EntityId;
    outfitId: EntityId;
    garments: OutfitVisualizationGarmentInput[];
    missingImageGarmentIds: EntityId[];
  }): Promise<GeneratedOutfitVisualization>;
}

export interface OutfitVisualizationQueuePort {
  enqueueVisualization(input: { outfitVisualizationId: EntityId }): Promise<void>;
}

export class OutfitVisualizationFailedError extends Error {
  constructor(message = "Outfit visualization failed.") {
    super(message);
    this.name = "OutfitVisualizationFailedError";
  }
}

export class RequestOutfitVisualizationUseCase {
  constructor(
    private readonly ports: ApplicationPorts,
    private readonly queue: OutfitVisualizationQueuePort
  ) {}

  async execute(input: { userId: EntityId; outfitId: EntityId }): Promise<OutfitVisualization> {
    const outfit = await this.loadOwnedOutfit(input.userId, input.outfitId);
    const existing = await this.ports.outfitVisualizations.findLatestReadyByOutfitId(outfit.id);
    if (existing) {
      return existing;
    }

    const visualization = await this.ports.outfitVisualizations.createPending({
      outfitId: outfit.id,
      userId: input.userId
    });

    await this.queue.enqueueVisualization({ outfitVisualizationId: visualization.id });
    return visualization;
  }

  private async loadOwnedOutfit(userId: EntityId, outfitId: EntityId): Promise<Outfit> {
    const outfit = await this.ports.outfits.findById(outfitId);
    if (!outfit) {
      throw new Error("Outfit not found.");
    }

    if (outfit.userId !== userId) {
      throw new Error("Outfit visualization is forbidden.");
    }

    return outfit;
  }
}

export class GetOutfitVisualizationUseCase {
  constructor(private readonly ports: ApplicationPorts) {}

  async execute(input: { userId: EntityId; outfitId: EntityId; visualizationId: EntityId }): Promise<OutfitVisualization> {
    const outfit = await this.ports.outfits.findById(input.outfitId);
    if (!outfit) {
      throw new Error("Outfit not found.");
    }

    const visualization = await this.ports.outfitVisualizations.findById(input.visualizationId);
    if (!visualization || visualization.outfitId !== outfit.id) {
      throw new Error("Outfit visualization not found.");
    }

    if (outfit.userId !== input.userId || visualization.userId !== input.userId) {
      throw new Error("Outfit visualization is forbidden.");
    }

    return visualization;
  }
}

export class GetLatestOutfitVisualizationUseCase {
  constructor(private readonly ports: ApplicationPorts) {}

  async execute(input: { userId: EntityId; outfitId: EntityId }): Promise<OutfitVisualization> {
    const outfit = await this.ports.outfits.findById(input.outfitId);
    if (!outfit) {
      throw new Error("Outfit not found.");
    }

    if (outfit.userId !== input.userId) {
      throw new Error("Outfit visualization is forbidden.");
    }

    const visualization = await this.ports.outfitVisualizations.findLatestReadyByOutfitId(outfit.id);
    if (!visualization) {
      throw new Error("Outfit visualization not found.");
    }

    return visualization;
  }
}

export class GetOutfitVisualizationImageUseCase {
  constructor(
    private readonly ports: ApplicationPorts,
    private readonly objectStorage: ObjectStoragePort
  ) {}

  async execute(input: { userId: EntityId; outfitId: EntityId; visualizationId: EntityId }): Promise<GarmentImageBytes> {
    const visualization = await new GetOutfitVisualizationUseCase(this.ports).execute(input);
    if (visualization.status !== OutfitVisualizationStatus.READY || !visualization.objectKey) {
      throw new Error("Outfit visualization image not found.");
    }

    return this.objectStorage.readObject(visualization.objectKey);
  }
}

export class GenerateOutfitVisualizationUseCase {
  constructor(
    private readonly ports: ApplicationPorts,
    private readonly objectStorage: ObjectStoragePort,
    private readonly visualizer: OutfitVisualizationPort
  ) {}

  async execute(input: { outfitVisualizationId: EntityId }): Promise<{ status: "generated" | "already_ready"; visualization: OutfitVisualization }> {
    const visualization = await this.ports.outfitVisualizations.findById(input.outfitVisualizationId);
    if (!visualization) {
      throw new Error("Outfit visualization not found.");
    }

    if (visualization.status === OutfitVisualizationStatus.READY && visualization.objectKey) {
      if (await this.objectStorage.objectExists(visualization.objectKey)) {
        return { status: "already_ready", visualization };
      }
    }

    const outfit = await this.ports.outfits.findById(visualization.outfitId);
    if (!outfit || outfit.userId !== visualization.userId) {
      await this.markFailed(visualization.id, "OUTFIT_NOT_FOUND");
      throw new OutfitVisualizationFailedError("Outfit visualization input is invalid.");
    }

    try {
      await this.ports.outfitVisualizations.markProcessing(visualization.id);
      const { garments, missingImageGarmentIds } = await this.loadGarmentsForVisualization(outfit);
      const generated = await this.visualizer.generate({
        visualizationId: visualization.id,
        outfitId: outfit.id,
        garments,
        missingImageGarmentIds
      });
      validateGeneratedImage(generated.image);

      const objectKey = outfitVisualizationObjectKey({
        userId: visualization.userId,
        outfitId: outfit.id,
        visualizationId: visualization.id,
        mimeType: generated.image.mimeType
      });

      await this.objectStorage.writeObject({
        objectKey,
        content: generated.image.data,
        mimeType: generated.image.mimeType
      });

      const ready = await this.ports.outfitVisualizations.markReady({
        id: visualization.id,
        objectKey,
        mimeType: generated.image.mimeType,
        provider: generated.provider,
        model: generated.model,
        promptVersion: generated.promptVersion,
        completedAt: new Date()
      });

      return { status: "generated", visualization: ready };
    } catch (error) {
      await this.markFailed(visualization.id, errorCodeFor(error));
      if (error instanceof OutfitVisualizationFailedError) {
        throw error;
      }

      throw new OutfitVisualizationFailedError();
    }
  }

  private async loadGarmentsForVisualization(outfit: Outfit): Promise<{
    garments: OutfitVisualizationGarmentInput[];
    missingImageGarmentIds: EntityId[];
  }> {
    const garmentIds = outfit.items.map((item) => item.garmentId);
    const garments = await this.ports.garments.findByIds(garmentIds);
    if (garments.length !== garmentIds.length) {
      throw new OutfitVisualizationFailedError("Outfit garment is missing.");
    }

    const garmentById = new Map(garments.map((garment) => [garment.id, garment]));
    const orderedGarments = garmentIds.map((garmentId) => {
      const garment = garmentById.get(garmentId);
      if (!garment) {
        throw new OutfitVisualizationFailedError("Outfit garment is missing.");
      }

      if (garment.userId !== outfit.userId) {
        throw new OutfitVisualizationFailedError("Outfit garment ownership is invalid.");
      }

      return garment;
    });

    const missingImageGarmentIds: EntityId[] = [];
    const inputs: OutfitVisualizationGarmentInput[] = [];

    for (const garment of orderedGarments) {
      const image = await this.loadGarmentImage(garment);
      if (!image) {
        missingImageGarmentIds.push(garment.id);
      }

      inputs.push({
        id: garment.id,
        name: garment.name,
        category: garment.category,
        subcategory: garment.subcategory,
        primaryColor: garment.primaryColor,
        secondaryColors: garment.secondaryColors,
        pattern: garment.pattern,
        fit: garment.fit,
        estimatedMaterial: garment.estimatedMaterial,
        formality: garment.formality,
        image
      });
    }

    return { garments: inputs, missingImageGarmentIds };
  }

  private async loadGarmentImage(garment: Garment): Promise<GarmentImageBytes | null> {
    if (!garment.imageId) {
      return null;
    }

    const image = await this.ports.garmentImages.findById(garment.imageId);
    if (!image || image.userId !== garment.userId || image.garmentId !== garment.id) {
      return null;
    }

    try {
      return await this.objectStorage.readObject(image.objectKey);
    } catch {
      return null;
    }
  }

  private async markFailed(visualizationId: EntityId, errorCode: string): Promise<void> {
    await this.ports.outfitVisualizations.markFailed({
      id: visualizationId,
      errorCode,
      completedAt: new Date()
    });
  }
}

function validateGeneratedImage(image: GarmentImageBytes): void {
  if (image.data.byteLength === 0) {
    throw new OutfitVisualizationFailedError("Generated visualization is empty.");
  }

  if (!OUTFIT_VISUALIZATION_ALLOWED_MIME_TYPES.includes(image.mimeType as (typeof OUTFIT_VISUALIZATION_ALLOWED_MIME_TYPES)[number])) {
    throw new OutfitVisualizationFailedError("Generated visualization MIME type is unsupported.");
  }

  if (image.data.byteLength > OUTFIT_VISUALIZATION_MAX_IMAGE_BYTES) {
    throw new OutfitVisualizationFailedError("Generated visualization is too large.");
  }
}

function outfitVisualizationObjectKey(input: { userId: EntityId; outfitId: EntityId; visualizationId: EntityId; mimeType: string }): string {
  const extension = input.mimeType === "image/png" ? "png" : input.mimeType === "image/jpeg" ? "jpg" : "webp";
  return `users/${input.userId}/outfits/${input.outfitId}/visualizations/${input.visualizationId}.${extension}`;
}

function errorCodeFor(error: unknown): string {
  if (error instanceof OutfitVisualizationFailedError) {
    return "PROVIDER_FAILED";
  }

  return "VISUALIZATION_FAILED";
}
