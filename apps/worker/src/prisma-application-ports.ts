import { PrismaClient } from "@prisma/client";
import {
  ApplicationPorts,
  AuthSessionRepositoryPort,
  GarmentImageRepositoryPort,
  GarmentRepositoryPort,
  GarmentStateTransitionRepositoryPort,
  HouseholdRepositoryPort,
  OutfitFeedbackRepositoryPort,
  OutfitVisualizationRepositoryPort,
  OutfitRepositoryPort,
  UsageEventRepositoryPort,
  UserCredentialRepositoryPort,
  UserRepositoryPort
} from "@closet-ai/application";
import {
  Garment,
  GarmentCategory,
  GarmentFit,
  GarmentImage,
  GarmentMaterial,
  GarmentPattern,
  GarmentStatus,
  GarmentSubcategory,
  Outfit,
  OutfitStatus,
  OutfitVisualization,
  OutfitVisualizationStatus
} from "@closet-ai/domain";

export function createWorkerApplicationPorts(prisma: PrismaClient): ApplicationPorts {
  return {
    households: unsupportedHouseholds(),
    users: unsupportedUsers(),
    userCredentials: unsupportedUserCredentials(),
    authSessions: unsupportedAuthSessions(),
    garments: createGarmentRepository(prisma),
    garmentImages: createGarmentImageRepository(prisma),
    outfits: createOutfitRepository(prisma),
    usageEvents: unsupportedUsageEvents(),
    outfitFeedback: unsupportedOutfitFeedback(),
    outfitVisualizations: createOutfitVisualizationRepository(prisma),
    garmentStateTransitions: unsupportedGarmentStateTransitions()
  };
}

function createGarmentRepository(prisma: PrismaClient): GarmentRepositoryPort {
  return {
    create: unsupported,
    findByUserId: unsupported,
    findAvailableByUserId: unsupported,
    findByIds: async (ids) =>
      (
        await prisma.garment.findMany({
          where: { id: { in: ids } },
          include: { images: { orderBy: { createdAt: "asc" }, take: 1 } }
        })
      ).map(mapGarment),
    findById: async (id) => {
      const row = await prisma.garment.findUnique({
        where: { id },
        include: { images: { orderBy: { createdAt: "asc" }, take: 1 } }
      });
      return row ? mapGarment(row) : null;
    },
    updateMetadata: unsupported,
    save: unsupported
  };
}

function createGarmentImageRepository(prisma: PrismaClient): GarmentImageRepositoryPort {
  return {
    create: unsupported,
    findById: async (id) => {
      const row = await prisma.garmentImage.findUnique({ where: { id } });
      return row ? mapGarmentImage(row) : null;
    },
    linkToGarment: unsupported,
    updateThumbnailObjectKey: async (input) =>
      mapGarmentImage(
        await prisma.garmentImage.update({
          where: { id: input.imageId },
          data: { thumbnailObjectKey: input.thumbnailObjectKey }
        })
      ),
    findOrphanedBefore: async (input) =>
      (
        await prisma.garmentImage.findMany({
          where: {
            garmentId: null,
            createdAt: { lt: input.olderThan }
          },
          orderBy: { createdAt: "asc" },
          take: input.limit
        })
      ).map(mapGarmentImage),
    deleteOrphanById: async (imageId) => {
      const result = await prisma.garmentImage.deleteMany({
        where: {
          id: imageId,
          garmentId: null
        }
      });
      return result.count > 0;
    }
  };
}

function createOutfitRepository(prisma: PrismaClient): OutfitRepositoryPort {
  return {
    create: unsupported,
    findById: async (id) => {
      const row = await prisma.outfit.findUnique({
        where: { id },
        include: { items: { orderBy: { position: "asc" } } }
      });
      return row ? mapOutfit(row) : null;
    },
    save: unsupported
  };
}

function createOutfitVisualizationRepository(prisma: PrismaClient): OutfitVisualizationRepositoryPort {
  return {
    createPending: unsupported,
    findById: async (id) => {
      const row = await prisma.outfitVisualization.findUnique({ where: { id } });
      return row ? mapOutfitVisualization(row) : null;
    },
    findLatestReadyByOutfitId: async (outfitId) => {
      const row = await prisma.outfitVisualization.findFirst({
        where: { outfitId, status: "READY" },
        orderBy: { createdAt: "desc" }
      });
      return row ? mapOutfitVisualization(row) : null;
    },
    markProcessing: async (id) =>
      mapOutfitVisualization(
        await prisma.outfitVisualization.update({
          where: { id },
          data: { status: "PROCESSING", errorCode: null }
        })
      ),
    markReady: async (input) =>
      mapOutfitVisualization(
        await prisma.outfitVisualization.update({
          where: { id: input.id },
          data: {
            status: "READY",
            objectKey: input.objectKey,
            mimeType: input.mimeType,
            provider: input.provider,
            model: input.model,
            promptVersion: input.promptVersion,
            errorCode: null,
            completedAt: input.completedAt
          }
        })
      ),
    markFailed: async (input) =>
      mapOutfitVisualization(
        await prisma.outfitVisualization.update({
          where: { id: input.id },
          data: {
            status: "FAILED",
            provider: input.provider,
            model: input.model,
            promptVersion: input.promptVersion,
            errorCode: input.errorCode,
            completedAt: input.completedAt
          }
        })
      ),
    updateStatus: async (id, status) =>
      mapOutfitVisualization(
        await prisma.outfitVisualization.update({
          where: { id },
          data: { status }
        })
      )
  };
}

function mapGarment(row: {
  id: string;
  userId: string;
  category: string;
  subcategory: string | null;
  primaryColor: string;
  secondaryColors: string[];
  pattern: string | null;
  fit: string | null;
  estimatedMaterial: string | null;
  formality: number | null;
  status: string;
  name: string | null;
  wearCount: number;
  lastWornAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  images?: { id: string; createdAt: Date }[];
}): Garment {
  return {
    id: row.id,
    userId: row.userId,
    category: row.category as GarmentCategory,
    subcategory: row.subcategory as GarmentSubcategory | null,
    primaryColor: row.primaryColor,
    secondaryColors: row.secondaryColors,
    pattern: row.pattern as GarmentPattern | null,
    fit: row.fit as GarmentFit | null,
    estimatedMaterial: row.estimatedMaterial as GarmentMaterial | null,
    formality: row.formality,
    status: row.status as GarmentStatus,
    name: row.name ?? undefined,
    imageId: row.images?.[0]?.id,
    wearCount: row.wearCount,
    lastWornAt: row.lastWornAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function mapOutfit(row: {
  id: string;
  userId: string;
  status: string;
  explanation: string;
  score: number;
  selectedAt: Date | null;
  wornAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: { garmentId: string; position: number }[];
}): Outfit {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status as OutfitStatus,
    items: row.items.map((item) => ({ garmentId: item.garmentId, position: item.position })),
    explanation: row.explanation,
    score: row.score,
    selectedAt: row.selectedAt,
    wornAt: row.wornAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function mapOutfitVisualization(row: {
  id: string;
  outfitId: string;
  userId: string;
  status: string;
  objectKey: string | null;
  mimeType: string | null;
  provider: string | null;
  model: string | null;
  promptVersion: string | null;
  errorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}): OutfitVisualization {
  return {
    id: row.id,
    outfitId: row.outfitId,
    userId: row.userId,
    status: row.status as OutfitVisualizationStatus,
    objectKey: row.objectKey,
    mimeType: row.mimeType,
    provider: row.provider,
    model: row.model,
    promptVersion: row.promptVersion,
    errorCode: row.errorCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt
  };
}

function mapGarmentImage(row: {
  id: string;
  userId: string;
  garmentId: string | null;
  objectKey: string;
  thumbnailObjectKey: string | null;
  mimeType: string;
  size: number;
  createdAt: Date;
}): GarmentImage {
  return {
    id: row.id,
    userId: row.userId,
    garmentId: row.garmentId,
    objectKey: row.objectKey,
    thumbnailObjectKey: row.thumbnailObjectKey,
    mimeType: row.mimeType,
    size: row.size,
    createdAt: row.createdAt
  };
}

async function unsupported(): Promise<never> {
  throw new Error("Repository method is not available in the storage maintenance worker.");
}

function unsupportedHouseholds(): HouseholdRepositoryPort {
  return { createWithInitialUser: unsupported, findById: unsupported };
}

function unsupportedUsers(): UserRepositoryPort {
  return { create: unsupported, findById: unsupported, updateLocation: unsupported };
}

function unsupportedUserCredentials(): UserCredentialRepositoryPort {
  return { create: unsupported, findByEmail: unsupported, findByUserId: unsupported, count: unsupported };
}

function unsupportedAuthSessions(): AuthSessionRepositoryPort {
  return { create: unsupported, findById: unsupported, findExpired: unsupported, findRevoked: unsupported, save: unsupported };
}

function unsupportedGarments(): GarmentRepositoryPort {
  return {
    create: unsupported,
    findByUserId: unsupported,
    findAvailableByUserId: unsupported,
    findByIds: unsupported,
    findById: unsupported,
    updateMetadata: unsupported,
    save: unsupported
  };
}

function unsupportedOutfits(): OutfitRepositoryPort {
  return { create: unsupported, findById: unsupported, save: unsupported };
}

function unsupportedUsageEvents(): UsageEventRepositoryPort {
  return { createManyIfAbsent: unsupported, findByOutfitId: unsupported };
}

function unsupportedOutfitFeedback(): OutfitFeedbackRepositoryPort {
  return { create: unsupported, findByOutfitId: unsupported };
}

function unsupportedOutfitVisualizations(): OutfitVisualizationRepositoryPort {
  return {
    createPending: unsupported,
    findById: unsupported,
    findLatestReadyByOutfitId: unsupported,
    markProcessing: unsupported,
    markReady: unsupported,
    markFailed: unsupported,
    updateStatus: unsupported
  };
}

function unsupportedGarmentStateTransitions(): GarmentStateTransitionRepositoryPort {
  return { create: unsupported, findByGarmentId: unsupported };
}
