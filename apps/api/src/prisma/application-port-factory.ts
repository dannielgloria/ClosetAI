import { Injectable } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  ApplicationPorts,
  AuthSessionRepositoryPort,
  GarmentRepositoryPort,
  HouseholdRepositoryPort,
  OutfitFeedbackRepositoryPort,
  OutfitRepositoryPort,
  UnitOfWorkPort,
  UsageEventRepositoryPort,
  UserCredentialRepositoryPort,
  UserRepositoryPort
} from "@closet-ai/application";
import { GarmentStatus, OutfitStatus } from "@closet-ai/domain";
import { PrismaService } from "./prisma.service.js";
import {
  mapAuthSession,
  mapGarment,
  mapHousehold,
  mapOutfit,
  mapOutfitFeedback,
  mapUsageEvent,
  mapUser,
  mapUserCredential
} from "./mappers.js";

type PrismaTransactionClient = Prisma.TransactionClient;
type DbClient = PrismaClient | PrismaTransactionClient;

@Injectable()
export class ApplicationPortFactory implements UnitOfWorkPort {
  constructor(private readonly prisma: PrismaService) {}

  create(db: DbClient = this.prisma): ApplicationPorts {
    return {
      households: this.createHouseholdRepository(db),
      users: this.createUserRepository(db),
      userCredentials: this.createUserCredentialRepository(db),
      authSessions: this.createAuthSessionRepository(db),
      garments: this.createGarmentRepository(db),
      outfits: this.createOutfitRepository(db),
      usageEvents: this.createUsageEventRepository(db),
      outfitFeedback: this.createOutfitFeedbackRepository(db)
    };
  }

  transaction<T>(work: (ports: ApplicationPorts) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => work(this.create(tx)));
  }

  private createHouseholdRepository(db: DbClient): HouseholdRepositoryPort {
    return {
      createWithInitialUser: async (input) => {
        const household = await db.household.create({
          data: {
            name: input.name,
            users: {
              create: {
                displayName: input.initialUserDisplayName
              }
            }
          },
          include: { users: true }
        });

        return { household: mapHousehold(household), user: mapUser(household.users[0]) };
      },
      findById: async (id) => {
        const row = await db.household.findUnique({ where: { id } });
        return row ? mapHousehold(row) : null;
      }
    };
  }

  private createUserRepository(db: DbClient): UserRepositoryPort {
    return {
      create: async (input) => mapUser(await db.user.create({ data: { householdId: input.householdId, displayName: input.displayName } })),
      findById: async (id) => {
        const row = await db.user.findUnique({ where: { id } });
        return row ? mapUser(row) : null;
      }
    };
  }

  private createUserCredentialRepository(db: DbClient): UserCredentialRepositoryPort {
    return {
      create: async (input) =>
        mapUserCredential(
          await db.userCredential.create({
            data: {
              userId: input.userId,
              email: input.email,
              passwordHash: input.passwordHash
            }
          })
        ),
      findByEmail: async (email) => {
        const row = await db.userCredential.findUnique({ where: { email } });
        return row ? mapUserCredential(row) : null;
      },
      findByUserId: async (userId) => {
        const row = await db.userCredential.findUnique({ where: { userId } });
        return row ? mapUserCredential(row) : null;
      },
      count: async () => db.userCredential.count()
    };
  }

  private createAuthSessionRepository(db: DbClient): AuthSessionRepositoryPort {
    return {
      create: async (input) =>
        mapAuthSession(
          await db.authSession.create({
            data: {
              userId: input.userId,
              refreshTokenHash: input.refreshTokenHash,
              expiresAt: input.expiresAt,
              deviceName: input.deviceName,
              devicePlatform: input.devicePlatform,
              userAgent: input.userAgent
            }
          })
        ),
      findById: async (id) => {
        const row = await db.authSession.findUnique({ where: { id } });
        return row ? mapAuthSession(row) : null;
      },
      findExpired: async (now) =>
        (
          await db.authSession.findMany({
            where: { expiresAt: { lte: now } },
            orderBy: { expiresAt: "asc" }
          })
        ).map(mapAuthSession),
      findRevoked: async () =>
        (
          await db.authSession.findMany({
            where: { revokedAt: { not: null } },
            orderBy: { revokedAt: "asc" }
          })
        ).map(mapAuthSession),
      save: async (session) =>
        mapAuthSession(
          await db.authSession.update({
            where: { id: session.id },
            data: {
              refreshTokenHash: session.refreshTokenHash,
              expiresAt: session.expiresAt,
              lastUsedAt: session.lastUsedAt,
              revokedAt: session.revokedAt,
              deviceName: session.deviceName,
              devicePlatform: session.devicePlatform,
              userAgent: session.userAgent
            }
          })
        )
    };
  }

  private createGarmentRepository(db: DbClient): GarmentRepositoryPort {
    return {
      create: async (input) =>
        mapGarment(
          await db.garment.create({
            data: {
              userId: input.userId,
              category: input.category,
              primaryColor: input.primaryColor,
              status: input.status,
              name: input.name
            }
          })
        ),
      findByUserId: async (userId) =>
        (
          await db.garment.findMany({
            where: { userId },
            orderBy: [{ category: "asc" }, { createdAt: "asc" }]
          })
        ).map(mapGarment),
      findAvailableByUserId: async (userId) =>
        (
          await db.garment.findMany({
            where: { userId, status: { in: [GarmentStatus.CLEAN_AVAILABLE, GarmentStatus.WORN_REUSABLE] } },
            orderBy: [{ category: "asc" }, { createdAt: "asc" }]
          })
        ).map(mapGarment),
      findByIds: async (ids) => (await db.garment.findMany({ where: { id: { in: ids } } })).map(mapGarment),
      save: async (garment) =>
        mapGarment(
          await db.garment.update({
            where: { id: garment.id },
            data: {
              status: garment.status,
              wearCount: garment.wearCount,
              lastWornAt: garment.lastWornAt
            }
          })
        )
    };
  }

  private createOutfitRepository(db: DbClient): OutfitRepositoryPort {
    return {
      create: async (input) =>
        mapOutfit(
          await db.outfit.create({
            data: {
              userId: input.userId,
              status: input.status ?? OutfitStatus.GENERATED,
              explanation: input.explanation,
              score: input.score,
              items: {
                create: input.garmentIds.map((garmentId, position) => ({ garmentId, position }))
              }
            },
            include: { items: { orderBy: { position: "asc" } } }
          })
        ),
      findById: async (id) => {
        const row = await db.outfit.findUnique({ where: { id }, include: { items: { orderBy: { position: "asc" } } } });
        return row ? mapOutfit(row) : null;
      },
      save: async (outfit) =>
        mapOutfit(
          await db.outfit.update({
            where: { id: outfit.id },
            data: {
              status: outfit.status,
              selectedAt: outfit.selectedAt,
              wornAt: outfit.wornAt
            },
            include: { items: { orderBy: { position: "asc" } } }
          })
        )
    };
  }

  private createUsageEventRepository(db: DbClient): UsageEventRepositoryPort {
    return {
      createManyIfAbsent: async (events) => {
        await db.garmentUsageEvent.createMany({
          data: events.map((event) => ({
            userId: event.userId,
            garmentId: event.garmentId,
            outfitId: event.outfitId,
            wornAt: event.wornAt,
            context: event.context as Prisma.InputJsonValue
          })),
          skipDuplicates: true
        });

        return (
          await db.garmentUsageEvent.findMany({
            where: { outfitId: events[0]?.outfitId },
            orderBy: { wornAt: "asc" }
          })
        ).map(mapUsageEvent);
      },
      findByOutfitId: async (outfitId) =>
        (await db.garmentUsageEvent.findMany({ where: { outfitId }, orderBy: { wornAt: "asc" } })).map(mapUsageEvent)
    };
  }

  private createOutfitFeedbackRepository(db: DbClient): OutfitFeedbackRepositoryPort {
    return {
      create: async (input) =>
        mapOutfitFeedback(
          await db.outfitFeedback.create({
            data: {
              outfitId: input.outfitId,
              userId: input.userId,
              decision: input.decision,
              reason: input.reason
            }
          })
        ),
      findByOutfitId: async (outfitId) =>
        (await db.outfitFeedback.findMany({ where: { outfitId }, orderBy: { createdAt: "asc" } })).map(mapOutfitFeedback)
    };
  }
}
