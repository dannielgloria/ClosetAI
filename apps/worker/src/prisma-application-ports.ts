import { PrismaClient } from "@prisma/client";
import {
  ApplicationPorts,
  AuthSessionRepositoryPort,
  GarmentImageRepositoryPort,
  GarmentRepositoryPort,
  GarmentStateTransitionRepositoryPort,
  HouseholdRepositoryPort,
  OutfitFeedbackRepositoryPort,
  OutfitRepositoryPort,
  UsageEventRepositoryPort,
  UserCredentialRepositoryPort,
  UserRepositoryPort
} from "@closet-ai/application";
import { GarmentImage } from "@closet-ai/domain";

export function createWorkerApplicationPorts(prisma: PrismaClient): ApplicationPorts {
  return {
    households: unsupportedHouseholds(),
    users: unsupportedUsers(),
    userCredentials: unsupportedUserCredentials(),
    authSessions: unsupportedAuthSessions(),
    garments: unsupportedGarments(),
    garmentImages: createGarmentImageRepository(prisma),
    outfits: unsupportedOutfits(),
    usageEvents: unsupportedUsageEvents(),
    outfitFeedback: unsupportedOutfitFeedback(),
    garmentStateTransitions: unsupportedGarmentStateTransitions()
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

function unsupportedGarmentStateTransitions(): GarmentStateTransitionRepositoryPort {
  return { create: unsupported, findByGarmentId: unsupported };
}
