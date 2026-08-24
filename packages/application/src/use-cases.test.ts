import { beforeEach, describe, expect, it } from "vitest";
import {
  ActivityType,
  AuthSession,
  ClosetUser,
  Garment,
  GarmentCategory,
  GarmentFit,
  GarmentImage,
  GarmentMaterial,
  GarmentPattern,
  GarmentStateTransition,
  GarmentStateTransitionType,
  GarmentStatus,
  GarmentSubcategory,
  GarmentUsageEvent,
  Household,
  Outfit,
  OutfitFeedback,
  OutfitFeedbackDecision,
  OutfitStatus,
  UserCredential,
  WeatherContext
} from "@closet-ai/domain";
import { ApplicationPorts, UnitOfWorkPort } from "./ports.js";
import {
  GenerateOutfitRecommendationsUseCase,
  OutfitRecommendationStrategy,
  OutfitStylistFailedError,
  OutfitStylistGarmentCandidate,
  OutfitStylistPort,
  OutfitStylistRecommendationCandidate
} from "./outfit-stylist.js";
import { GetWeatherContextUseCase, UpdateUserLocationUseCase, weatherCacheKey, WeatherProviderFailedError, WeatherStatus } from "./weather.js";
import {
  AnalyzeGarmentImageUseCase,
  GarmentAnalysis,
  GarmentAnalysisFailedError,
  GarmentAnalyzerPort,
  ObjectStoragePort,
  UploadGarmentImageUseCase
} from "./garment-analyzer.js";
import {
  ConfirmOutfitUsageUseCase,
  CreateGarmentUseCase,
  GenerateBasicOutfitUseCase,
  GetGarmentUseCase,
  SelectOutfitUseCase,
  SubmitOutfitFeedbackUseCase,
  TransitionGarmentStateUseCase,
  UpdateGarmentUseCase
} from "./use-cases.js";

class InMemoryPorts implements ApplicationPorts, UnitOfWorkPort {
  households = {
    createWithInitialUser: async () => {
      throw new Error("not implemented");
    },
    findById: async (id: string) => this.householdRows.get(id) ?? null
  };
  users = {
    create: async () => {
      throw new Error("not implemented");
    },
    findById: async (id: string) => this.userRows.get(id) ?? null,
    updateLocation: async (userId: string, location: { city: string; latitude: number; longitude: number; timezone: string }) => {
      const user = this.userRows.get(userId);
      if (!user) {
        throw new Error("User not found.");
      }

      const updated = { ...user, ...location };
      this.userRows.set(userId, updated);
      return updated;
    }
  };
  userCredentials = {
    create: async (input: { userId: string; email: string; passwordHash: string }) => {
      const now = new Date("2026-08-23T00:00:00.000Z");
      const row: UserCredential = {
        id: `credential-${this.userCredentialRows.size + 1}`,
        createdAt: now,
        updatedAt: now,
        ...input
      };
      this.userCredentialRows.set(row.id, row);
      return row;
    },
    findByEmail: async (email: string) => [...this.userCredentialRows.values()].find((row) => row.email === email) ?? null,
    findByUserId: async (userId: string) => [...this.userCredentialRows.values()].find((row) => row.userId === userId) ?? null,
    count: async () => this.userCredentialRows.size
  };
  authSessions = {
    create: async (input: {
      userId: string;
      refreshTokenHash: string;
      expiresAt: Date;
      deviceName?: string;
      devicePlatform?: string;
      userAgent?: string;
    }) => {
      const row: AuthSession = {
        id: `session-${this.authSessionRows.size + 1}`,
        createdAt: new Date("2026-08-23T00:00:00.000Z"),
        lastUsedAt: null,
        revokedAt: null,
        ...input
      };
      this.authSessionRows.set(row.id, row);
      return row;
    },
    findById: async (id: string) => this.authSessionRows.get(id) ?? null,
    findExpired: async (now: Date) => [...this.authSessionRows.values()].filter((session) => session.expiresAt.getTime() <= now.getTime()),
    findRevoked: async () => [...this.authSessionRows.values()].filter((session) => Boolean(session.revokedAt)),
    save: async (session: AuthSession) => {
      this.authSessionRows.set(session.id, session);
      return session;
    }
  };
  garments = {
    create: async (
      input: Pick<Garment, "userId" | "category" | "primaryColor" | "status" | "name"> &
        Partial<Pick<Garment, "secondaryColors" | "subcategory" | "pattern" | "fit" | "estimatedMaterial" | "formality">>
    ) => {
      const now = new Date("2026-08-23T00:00:00.000Z");
      const row: Garment = {
        id: `garment-${this.garmentRows.size + 1}`,
        secondaryColors: input.secondaryColors ?? [],
        subcategory: input.subcategory ?? null,
        pattern: input.pattern ?? null,
        fit: input.fit ?? null,
        estimatedMaterial: input.estimatedMaterial ?? null,
        formality: input.formality ?? null,
        wearCount: 0,
        lastWornAt: null,
        createdAt: now,
        updatedAt: now,
        ...input
      };
      this.garmentRows.set(row.id, row);
      return row;
    },
    findAvailableByUserId: async (userId: string) =>
      [...this.garmentRows.values()].filter(
        (garment) =>
          garment.userId === userId &&
          [GarmentStatus.CLEAN_AVAILABLE, GarmentStatus.WORN_REUSABLE].includes(garment.status)
      ),
    findByUserId: async (userId: string) => [...this.garmentRows.values()].filter((garment) => garment.userId === userId),
    findByIds: async (ids: string[]) => ids.map((id) => this.garmentRows.get(id)).filter((row): row is Garment => Boolean(row)),
    findById: async (id: string) => this.garmentRows.get(id) ?? null,
    updateMetadata: async (
      garmentId: string,
      metadata: Pick<
        Garment,
        "category" | "primaryColor" | "secondaryColors" | "subcategory" | "pattern" | "fit" | "estimatedMaterial" | "formality" | "name"
      >
    ) => {
      const garment = this.garmentRows.get(garmentId);
      if (!garment) {
        throw new Error("Garment not found.");
      }

      const updated = { ...garment, ...metadata, updatedAt: new Date("2026-08-24T00:00:00.000Z") };
      this.garmentRows.set(garmentId, updated);
      return updated;
    },
    save: async (garment: Garment) => {
      this.garmentRows.set(garment.id, garment);
      return garment;
    }
  };
  outfits = {
    create: async (input: { userId: string; garmentIds: string[]; explanation: string; score: number; status?: OutfitStatus }) => {
      const now = new Date("2026-08-23T00:00:00.000Z");
      const row: Outfit = {
        id: `outfit-${this.outfitRows.size + 1}`,
        userId: input.userId,
        status: input.status ?? OutfitStatus.GENERATED,
        items: input.garmentIds.map((garmentId, position) => ({ garmentId, position })),
        explanation: input.explanation,
        score: input.score,
        selectedAt: null,
        wornAt: null,
        createdAt: now,
        updatedAt: now
      };
      this.outfitRows.set(row.id, row);
      return row;
    },
    findById: async (id: string) => this.outfitRows.get(id) ?? null,
    save: async (outfit: Outfit) => {
      this.outfitRows.set(outfit.id, outfit);
      return outfit;
    }
  };
  usageEvents = {
    createManyIfAbsent: async (events: Omit<GarmentUsageEvent, "id">[]) => {
      const created: GarmentUsageEvent[] = [];
      for (const event of events) {
        const key = `${event.outfitId}:${event.garmentId}`;
        const existing = [...this.usageEventRows.values()].find((row) => `${row.outfitId}:${row.garmentId}` === key);
        if (existing) {
          created.push(existing);
          continue;
        }

        const row = { id: `usage-${this.usageEventRows.size + 1}`, ...event };
        this.usageEventRows.set(row.id, row);
        created.push(row);
      }
      return created;
    },
    findByOutfitId: async (outfitId: string) => [...this.usageEventRows.values()].filter((event) => event.outfitId === outfitId)
  };
  garmentImages = {
    create: async (input: { userId: string; objectKey: string; mimeType: string; size: number }) => {
      const row: GarmentImage = {
        id: `image-${this.garmentImageRows.size + 1}`,
        garmentId: null,
        createdAt: new Date("2026-08-23T00:00:00.000Z"),
        ...input
      };
      this.garmentImageRows.set(row.id, row);
      return row;
    },
    findById: async (id: string) => this.garmentImageRows.get(id) ?? null,
    linkToGarment: async (input: { imageId: string; garmentId: string }) => {
      const image = this.garmentImageRows.get(input.imageId);
      if (!image) {
        throw new Error("Garment image not found.");
      }

      const linked = { ...image, garmentId: input.garmentId };
      this.garmentImageRows.set(linked.id, linked);
      const garment = this.garmentRows.get(input.garmentId);
      if (garment) {
        this.garmentRows.set(garment.id, { ...garment, imageId: linked.id });
      }
      return linked;
    }
  };
  outfitFeedback = {
    create: async (input: { outfitId: string; userId: string; decision: OutfitFeedbackDecision; reason: string | null }) => {
      const row: OutfitFeedback = {
        id: `feedback-${this.outfitFeedbackRows.size + 1}`,
        createdAt: new Date("2026-08-23T00:00:00.000Z"),
        ...input
      };
      this.outfitFeedbackRows.set(row.id, row);
      return row;
    },
    findByOutfitId: async (outfitId: string) => [...this.outfitFeedbackRows.values()].filter((feedback) => feedback.outfitId === outfitId)
  };
  garmentStateTransitions = {
    create: async (input: {
      garmentId: string;
      userId: string;
      fromStatus: GarmentStatus;
      toStatus: GarmentStatus;
      transition: GarmentStateTransitionType;
    }) => {
      const row: GarmentStateTransition = {
        id: `garment-state-transition-${this.garmentStateTransitionRows.size + 1}`,
        createdAt: new Date("2026-08-24T00:00:00.000Z"),
        ...input
      };
      this.garmentStateTransitionRows.set(row.id, row);
      return row;
    },
    findByGarmentId: async (garmentId: string) =>
      [...this.garmentStateTransitionRows.values()].filter((transition) => transition.garmentId === garmentId)
  };

  householdRows = new Map<string, Household>();
  userRows = new Map<string, ClosetUser>();
  userCredentialRows = new Map<string, UserCredential>();
  authSessionRows = new Map<string, AuthSession>();
  garmentRows = new Map<string, Garment>();
  garmentImageRows = new Map<string, GarmentImage>();
  outfitRows = new Map<string, Outfit>();
  usageEventRows = new Map<string, GarmentUsageEvent>();
  outfitFeedbackRows = new Map<string, OutfitFeedback>();
  garmentStateTransitionRows = new Map<string, GarmentStateTransition>();

  transaction<T>(work: (ports: ApplicationPorts) => Promise<T>): Promise<T> {
    return work(this);
  }
}

describe("MVP use cases", () => {
  let ports: InMemoryPorts;

  beforeEach(() => {
    ports = new InMemoryPorts();
    ports.householdRows.set("household-1", { id: "household-1", name: "Home", createdAt: new Date() });
    ports.userRows.set("user-1", userFixture({ id: "user-1", householdId: "household-1", displayName: "Dann" }));
  });

  it("creates garments owned by an existing user", async () => {
    const useCase = new CreateGarmentUseCase(ports);
    const garment = await useCase.execute({
      userId: "user-1",
      category: GarmentCategory.TOP,
      primaryColor: "black"
    });

    expect(garment.userId).toBe("user-1");
    expect(garment.status).toBe(GarmentStatus.CLEAN_AVAILABLE);
  });

  it("uploads a valid garment image without creating a garment", async () => {
    const storage = new FakeObjectStorage();
    const image = await new UploadGarmentImageUseCase(ports, storage, { maxSizeBytes: 10 }).execute({
      userId: "user-1",
      content: new Uint8Array([1, 2, 3]),
      mimeType: "image/jpeg"
    });

    expect(image.userId).toBe("user-1");
    expect(image.garmentId).toBeNull();
    expect(ports.garmentRows.size).toBe(0);
  });

  it("rejects invalid garment image uploads", async () => {
    const storage = new FakeObjectStorage();

    await expect(
      new UploadGarmentImageUseCase(ports, storage, { maxSizeBytes: 10 }).execute({
        userId: "user-1",
        content: new Uint8Array(),
        mimeType: "image/jpeg"
      })
    ).rejects.toThrow("Garment image is required.");

    await expect(
      new UploadGarmentImageUseCase(ports, storage, { maxSizeBytes: 10 }).execute({
        userId: "user-1",
        content: new Uint8Array([1]),
        mimeType: "text/plain"
      })
    ).rejects.toThrow("Unsupported garment image MIME type.");

    await expect(
      new UploadGarmentImageUseCase(ports, storage, { maxSizeBytes: 2 }).execute({
        userId: "user-1",
        content: new Uint8Array([1, 2, 3]),
        mimeType: "image/png"
      })
    ).rejects.toThrow("Garment image is too large.");
  });

  it("analyzes a garment image into validated proposed metadata", async () => {
    const storage = new FakeObjectStorage();
    const image = await new UploadGarmentImageUseCase(ports, storage, { maxSizeBytes: 10 }).execute({
      userId: "user-1",
      content: new Uint8Array([1, 2, 3]),
      mimeType: "image/png"
    });

    const analysis = await new AnalyzeGarmentImageUseCase(
      ports,
      storage,
      new FakeGarmentAnalyzer({
        category: GarmentCategory.TOP,
        subcategory: GarmentSubcategory.T_SHIRT,
        primaryColor: "cream",
        secondaryColors: ["black"],
        pattern: GarmentPattern.SOLID,
        fit: GarmentFit.REGULAR,
        estimatedMaterial: GarmentMaterial.COTTON,
        formality: 2
      })
    ).execute({ userId: "user-1", imageId: image.id });

    expect(analysis).toMatchObject({
      category: GarmentCategory.TOP,
      primaryColor: "CREAM",
      secondaryColors: ["BLACK"]
    });
    expect(ports.garmentRows.size).toBe(0);
  });

  it("rejects malformed or invalid garment analysis output", async () => {
    const storage = new FakeObjectStorage();
    const image = await new UploadGarmentImageUseCase(ports, storage, { maxSizeBytes: 10 }).execute({
      userId: "user-1",
      content: new Uint8Array([1, 2, 3]),
      mimeType: "image/webp"
    });

    await expect(
      new AnalyzeGarmentImageUseCase(ports, storage, new FakeGarmentAnalyzer({ category: "HAT" } as unknown as GarmentAnalysis)).execute({
        userId: "user-1",
        imageId: image.id
      })
    ).rejects.toThrow(GarmentAnalysisFailedError);
  });

  it("rejects analysis for a missing image or another user's image", async () => {
    const storage = new FakeObjectStorage();
    await expect(
      new AnalyzeGarmentImageUseCase(ports, storage, new FakeGarmentAnalyzer(defaultAnalysis())).execute({
        userId: "user-1",
        imageId: "missing"
      })
    ).rejects.toThrow("Garment image not found.");

    ports.userRows.set("user-2", userFixture({ id: "user-2", householdId: "household-1", displayName: "Other" }));
    const image = await new UploadGarmentImageUseCase(ports, storage, { maxSizeBytes: 10 }).execute({
      userId: "user-2",
      content: new Uint8Array([1, 2, 3]),
      mimeType: "image/jpeg"
    });

    await expect(
      new AnalyzeGarmentImageUseCase(ports, storage, new FakeGarmentAnalyzer(defaultAnalysis())).execute({
        userId: "user-1",
        imageId: image.id
      })
    ).rejects.toThrow("Garment image access is forbidden.");
  });

  it("confirms assisted garment registration and links the image atomically", async () => {
    const image = await ports.garmentImages.create({
      userId: "user-1",
      objectKey: "users/user-1/garment-images/image.jpg",
      mimeType: "image/jpeg",
      size: 3
    });

    const garment = await new CreateGarmentUseCase(ports).execute({
      userId: "user-1",
      imageId: image.id,
      category: GarmentCategory.TOP,
      primaryColor: "cream",
      secondaryColors: ["black"],
      subcategory: GarmentSubcategory.T_SHIRT,
      pattern: GarmentPattern.SOLID,
      fit: GarmentFit.REGULAR,
      estimatedMaterial: GarmentMaterial.COTTON,
      formality: 2
    });

    expect(garment.primaryColor).toBe("CREAM");
    expect(garment.imageId).toBe(image.id);
    expect(ports.garmentImageRows.get(image.id)?.garmentId).toBe(garment.id);
    expect(ports.garmentRows.get(garment.id)?.imageId).toBe(image.id);
  });

  it("rejects linking another user's image during garment creation", async () => {
    ports.userRows.set("user-2", userFixture({ id: "user-2", householdId: "household-1", displayName: "Other" }));
    const image = await ports.garmentImages.create({
      userId: "user-2",
      objectKey: "users/user-2/garment-images/image.jpg",
      mimeType: "image/jpeg",
      size: 3
    });

    await expect(
      new CreateGarmentUseCase(ports).execute({
        userId: "user-1",
        imageId: image.id,
        category: GarmentCategory.TOP,
        primaryColor: "black"
      })
    ).rejects.toThrow("Garment image access is forbidden.");
  });

  it("generates a basic outfit only from eligible garments", async () => {
    await ports.garments.create({ userId: "user-1", category: GarmentCategory.TOP, primaryColor: "black", status: GarmentStatus.CLEAN_AVAILABLE });
    await ports.garments.create({ userId: "user-1", category: GarmentCategory.BOTTOM, primaryColor: "blue", status: GarmentStatus.WORN_REUSABLE });
    await ports.garments.create({ userId: "user-1", category: GarmentCategory.FOOTWEAR, primaryColor: "white", status: GarmentStatus.CLEAN_AVAILABLE });
    await ports.garments.create({ userId: "user-1", category: GarmentCategory.TOP, primaryColor: "red", status: GarmentStatus.LAUNDRY_BIN });

    const outfit = await new GenerateBasicOutfitUseCase(ports).execute({ userId: "user-1" });

    expect(outfit.items).toHaveLength(3);
  });

  it("selecting an outfit does not create usage events", async () => {
    const outfit = await ports.outfits.create({ userId: "user-1", garmentIds: [], explanation: "Basic", score: 100 });

    await new SelectOutfitUseCase(ports).execute({ outfitId: outfit.id, userId: "user-1" });

    expect(ports.usageEventRows.size).toBe(0);
  });

  it("confirms outfit usage idempotently and persists usage history", async () => {
    const top = await ports.garments.create({ userId: "user-1", category: GarmentCategory.TOP, primaryColor: "black", status: GarmentStatus.CLEAN_AVAILABLE });
    const outfit = await ports.outfits.create({ userId: "user-1", garmentIds: [top.id], explanation: "Basic", score: 100 });
    const selected = await new SelectOutfitUseCase(ports).execute({ outfitId: outfit.id, userId: "user-1" });

    const useCase = new ConfirmOutfitUsageUseCase(ports);
    await useCase.execute({ outfitId: selected.id, userId: "user-1" });
    await useCase.execute({ outfitId: selected.id, userId: "user-1" });

    expect(ports.usageEventRows.size).toBe(1);
    expect(ports.garmentRows.get(top.id)?.wearCount).toBe(1);
  });

  it("confirms partial outfit usage for only the garments actually worn", async () => {
    const top = await ports.garments.create({ userId: "user-1", category: GarmentCategory.TOP, primaryColor: "black", status: GarmentStatus.CLEAN_AVAILABLE });
    const bottom = await ports.garments.create({ userId: "user-1", category: GarmentCategory.BOTTOM, primaryColor: "blue", status: GarmentStatus.CLEAN_AVAILABLE });
    const outfit = await ports.outfits.create({ userId: "user-1", garmentIds: [top.id, bottom.id], explanation: "Basic", score: 100 });
    const selected = await new SelectOutfitUseCase(ports).execute({ outfitId: outfit.id, userId: "user-1" });

    await new ConfirmOutfitUsageUseCase(ports).execute({
      outfitId: selected.id,
      userId: "user-1",
      wornGarmentIds: [top.id]
    });

    expect(ports.usageEventRows.size).toBe(1);
    expect(ports.garmentRows.get(top.id)?.wearCount).toBe(1);
    expect(ports.garmentRows.get(bottom.id)?.wearCount).toBe(0);
  });

  it("persists accepted outfit feedback without changing outfit state", async () => {
    const outfit = await ports.outfits.create({ userId: "user-1", garmentIds: [], explanation: "Basic", score: 100, status: OutfitStatus.PRESENTED });

    const feedback = await new SubmitOutfitFeedbackUseCase(ports).execute({
      outfitId: outfit.id,
      userId: "user-1",
      decision: OutfitFeedbackDecision.ACCEPTED
    });

    expect(feedback).toMatchObject({
      outfitId: outfit.id,
      userId: "user-1",
      decision: OutfitFeedbackDecision.ACCEPTED,
      reason: null
    });
    expect(ports.outfitRows.get(outfit.id)?.status).toBe(OutfitStatus.PRESENTED);
  });

  it("persists rejected outfit feedback with trimmed reason", async () => {
    const outfit = await ports.outfits.create({ userId: "user-1", garmentIds: [], explanation: "Basic", score: 100 });

    const feedback = await new SubmitOutfitFeedbackUseCase(ports).execute({
      outfitId: outfit.id,
      userId: "user-1",
      decision: OutfitFeedbackDecision.REJECTED,
      reason: "  Too formal  "
    });

    expect(feedback.reason).toBe("Too formal");
  });

  it("rejects oversized feedback reason", async () => {
    const outfit = await ports.outfits.create({ userId: "user-1", garmentIds: [], explanation: "Basic", score: 100 });

    await expect(
      new SubmitOutfitFeedbackUseCase(ports).execute({
        outfitId: outfit.id,
        userId: "user-1",
        decision: OutfitFeedbackDecision.REJECTED,
        reason: "x".repeat(501)
      })
    ).rejects.toThrow("Feedback reason is too long.");
  });

  it("rejects invalid feedback decision", async () => {
    const outfit = await ports.outfits.create({ userId: "user-1", garmentIds: [], explanation: "Basic", score: 100 });

    await expect(
      new SubmitOutfitFeedbackUseCase(ports).execute({
        outfitId: outfit.id,
        userId: "user-1",
        decision: "MAYBE" as OutfitFeedbackDecision
      })
    ).rejects.toThrow("Invalid outfit feedback decision.");
  });

  it("rejects feedback for a missing outfit", async () => {
    await expect(
      new SubmitOutfitFeedbackUseCase(ports).execute({
        outfitId: "missing",
        userId: "user-1",
        decision: OutfitFeedbackDecision.ACCEPTED
      })
    ).rejects.toThrow("Outfit not found.");
  });

  it("rejects feedback for another user's outfit", async () => {
    const outfit = await ports.outfits.create({ userId: "user-2", garmentIds: [], explanation: "Basic", score: 100 });

    await expect(
      new SubmitOutfitFeedbackUseCase(ports).execute({
        outfitId: outfit.id,
        userId: "user-1",
        decision: OutfitFeedbackDecision.ACCEPTED
      })
    ).rejects.toThrow("Outfit feedback is forbidden.");
  });

  it("allows multiple feedback history events for the same outfit", async () => {
    const outfit = await ports.outfits.create({ userId: "user-1", garmentIds: [], explanation: "Basic", score: 100 });
    const useCase = new SubmitOutfitFeedbackUseCase(ports);

    await useCase.execute({ outfitId: outfit.id, userId: "user-1", decision: OutfitFeedbackDecision.ACCEPTED });
    await useCase.execute({ outfitId: outfit.id, userId: "user-1", decision: OutfitFeedbackDecision.REJECTED, reason: "Changed my mind" });

    expect(await ports.outfitFeedback.findByOutfitId(outfit.id)).toHaveLength(2);
  });

  it("sends only eligible current-user garments to the AI stylist", async () => {
    const top = await ports.garments.create({ userId: "user-1", category: GarmentCategory.TOP, primaryColor: "black", status: GarmentStatus.CLEAN_AVAILABLE });
    const bottom = await ports.garments.create({ userId: "user-1", category: GarmentCategory.BOTTOM, primaryColor: "blue", status: GarmentStatus.WORN_REUSABLE });
    const footwear = await ports.garments.create({ userId: "user-1", category: GarmentCategory.FOOTWEAR, primaryColor: "white", status: GarmentStatus.CLEAN_AVAILABLE });
    await ports.garments.create({ userId: "user-1", category: GarmentCategory.TOP, primaryColor: "red", status: GarmentStatus.LAUNDRY_BIN });
    await ports.garments.create({ userId: "user-2", category: GarmentCategory.TOP, primaryColor: "green", status: GarmentStatus.CLEAN_AVAILABLE });
    const stylist = new FakeOutfitStylist([{ garmentIds: [top.id, bottom.id, footwear.id], score: 91, reason: "Fits the context." }]);

    await new GenerateOutfitRecommendationsUseCase(ports, stylist).execute({
      userId: "user-1",
      context: { activities: [{ type: ActivityType.CASUAL_DINNER, time: "20:00" }] }
    });

    expect(stylist.lastInput?.garments.map((garment) => garment.id).sort()).toEqual([bottom.id, footwear.id, top.id].sort());
  });

  it("persists valid AI recommendations as presented outfits", async () => {
    const top = await ports.garments.create({ userId: "user-1", category: GarmentCategory.TOP, primaryColor: "black", status: GarmentStatus.CLEAN_AVAILABLE });
    const bottom = await ports.garments.create({ userId: "user-1", category: GarmentCategory.BOTTOM, primaryColor: "blue", status: GarmentStatus.CLEAN_AVAILABLE });
    const footwear = await ports.garments.create({ userId: "user-1", category: GarmentCategory.FOOTWEAR, primaryColor: "white", status: GarmentStatus.CLEAN_AVAILABLE });

    const result = await new GenerateOutfitRecommendationsUseCase(
      ports,
      new FakeOutfitStylist([{ garmentIds: [top.id, bottom.id, footwear.id], score: 87, reason: "Good for dinner." }])
    ).execute({ userId: "user-1", context: { activities: [{ type: ActivityType.CASUAL_DINNER, time: "20:00" }] } });

    expect(result.strategy).toBe(OutfitRecommendationStrategy.AI);
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]).toMatchObject({
      status: OutfitStatus.PRESENTED,
      score: 87,
      explanation: "Good for dinner."
    });
  });

  it("updates and returns the authenticated user's approximate location", async () => {
    const user = await new UpdateUserLocationUseCase(ports).execute({
      userId: "user-1",
      location: {
        city: " Ciudad de Mexico ",
        latitude: 19.43261,
        longitude: -99.13321,
        timezone: "America/Mexico_City"
      }
    });

    expect(user).toMatchObject({
      city: "Ciudad de Mexico",
      latitude: 19.4326,
      longitude: -99.1332,
      timezone: "America/Mexico_City"
    });
  });

  it("returns weather from cache without calling the provider", async () => {
    ports.userRows.set("user-1", userFixture({ id: "user-1", householdId: "household-1", displayName: "Dann" }));
    await new UpdateUserLocationUseCase(ports).execute({
      userId: "user-1",
      location: mexicoCityLocation()
    });
    const cache = new FakeWeatherCache();
    await cache.set(weatherCacheKey(mexicoCityLocation(), new Date("2026-08-24T12:00:00.000Z")), weatherContext({ temperature: 18 }), 1200);
    const provider = new FakeWeatherProvider(weatherContext({ temperature: 28 }));

    const weather = await new GetWeatherContextUseCase(ports, provider, cache, { cacheTtlSeconds: 1200 }).execute({
      userId: "user-1",
      now: new Date("2026-08-24T12:00:00.000Z")
    });

    expect(weather.temperature).toBe(18);
    expect(provider.calls).toBe(0);
  });

  it("fetches weather on cache miss and stores normalized weather", async () => {
    await new UpdateUserLocationUseCase(ports).execute({ userId: "user-1", location: mexicoCityLocation() });
    const cache = new FakeWeatherCache();
    const provider = new FakeWeatherProvider(weatherContext({ temperature: 21 }));

    const weather = await new GetWeatherContextUseCase(ports, provider, cache, { cacheTtlSeconds: 1200 }).execute({
      userId: "user-1",
      now: new Date("2026-08-24T12:00:00.000Z")
    });

    expect(weather.temperature).toBe(21);
    expect(provider.calls).toBe(1);
    expect(cache.lastTtlSeconds).toBe(1200);
  });

  it("rejects malformed provider weather responses", async () => {
    await new UpdateUserLocationUseCase(ports).execute({ userId: "user-1", location: mexicoCityLocation() });

    await expect(
      new GetWeatherContextUseCase(
        ports,
        new FakeWeatherProvider({ ...weatherContext({ temperature: 21 }), rainProbability: 101 }),
        new FakeWeatherCache(),
        { cacheTtlSeconds: 1200 }
      ).execute({ userId: "user-1" })
    ).rejects.toThrow("Invalid weather rain probability.");
  });

  it("reports user without location", async () => {
    await expect(
      new GetWeatherContextUseCase(ports, new FakeWeatherProvider(weatherContext({})), new FakeWeatherCache(), { cacheTtlSeconds: 1200 }).execute({
        userId: "user-1"
      })
    ).rejects.toThrow("User location not configured.");
  });

  it("passes normalized weather to the AI stylist when available", async () => {
    const { top, bottom, footwear } = await createBasicEligibleGarments(ports);
    await new UpdateUserLocationUseCase(ports).execute({ userId: "user-1", location: mexicoCityLocation() });
    const stylist = new FakeOutfitStylist([{ garmentIds: [top.id, bottom.id, footwear.id], score: 91, reason: "Works with mild weather." }]);

    const result = await new GenerateOutfitRecommendationsUseCase(ports, stylist, {
      provider: new FakeWeatherProvider(weatherContext({ temperature: 18 })),
      cache: new FakeWeatherCache(),
      config: { cacheTtlSeconds: 1200 }
    }).execute({ userId: "user-1", context: { activities: [{ type: ActivityType.CASUAL_DINNER, time: "20:00" }] } });

    expect(result.weatherStatus).toBe(WeatherStatus.AVAILABLE);
    expect(result.weather?.temperature).toBe(18);
    expect(stylist.lastInput?.weather?.temperature).toBe(18);
  });

  it("continues outfit recommendation without weather when provider fails", async () => {
    const { top, bottom, footwear } = await createBasicEligibleGarments(ports);
    await new UpdateUserLocationUseCase(ports).execute({ userId: "user-1", location: mexicoCityLocation() });
    const stylist = new FakeOutfitStylist([{ garmentIds: [top.id, bottom.id, footwear.id], score: 84, reason: "Still valid." }]);

    const result = await new GenerateOutfitRecommendationsUseCase(ports, stylist, {
      provider: new FakeWeatherProvider(new WeatherProviderFailedError()),
      cache: new FakeWeatherCache(),
      config: { cacheTtlSeconds: 1200 }
    }).execute({ userId: "user-1", context: { activities: [{ type: ActivityType.CASUAL_DINNER, time: "20:00" }] } });

    expect(result.strategy).toBe(OutfitRecommendationStrategy.AI);
    expect(result.weatherStatus).toBe(WeatherStatus.UNAVAILABLE);
    expect(stylist.lastInput?.weather).toBeUndefined();
  });

  it("rejects invalid AI garment IDs", async () => {
    await createBasicEligibleGarments(ports);

    await expect(
      new GenerateOutfitRecommendationsUseCase(
        ports,
        new FakeOutfitStylist([{ garmentIds: ["missing", "garment-1", "garment-2"], score: 80, reason: "Bad ID." }])
      ).execute({ userId: "user-1", context: { activities: [{ type: ActivityType.CASUAL_DINNER, time: "20:00" }] } })
    ).rejects.toThrow("Recommendation references an ineligible garment.");
  });

  it("rejects duplicate garment IDs", async () => {
    const { top, bottom } = await createBasicEligibleGarments(ports);

    await expect(
      new GenerateOutfitRecommendationsUseCase(
        ports,
        new FakeOutfitStylist([{ garmentIds: [top.id, top.id, bottom.id], score: 80, reason: "Duplicate." }])
      ).execute({ userId: "user-1", context: { activities: [{ type: ActivityType.CASUAL_DINNER, time: "20:00" }] } })
    ).rejects.toThrow("Recommendation contains duplicate garment IDs.");
  });

  it("rejects scores outside the allowed range", async () => {
    const { top, bottom, footwear } = await createBasicEligibleGarments(ports);

    await expect(
      new GenerateOutfitRecommendationsUseCase(
        ports,
        new FakeOutfitStylist([{ garmentIds: [top.id, bottom.id, footwear.id], score: 101, reason: "Too high." }])
      ).execute({ userId: "user-1", context: { activities: [{ type: ActivityType.CASUAL_DINNER, time: "20:00" }] } })
    ).rejects.toThrow("Invalid recommendation score.");
  });

  it("rejects more than three AI recommendations", async () => {
    const { top, bottom, footwear } = await createBasicEligibleGarments(ports);
    const recommendation = { garmentIds: [top.id, bottom.id, footwear.id], score: 80, reason: "Valid." };

    await expect(
      new GenerateOutfitRecommendationsUseCase(
        ports,
        new FakeOutfitStylist([recommendation, recommendation, recommendation, recommendation])
      ).execute({ userId: "user-1", context: { activities: [{ type: ActivityType.CASUAL_DINNER, time: "20:00" }] } })
    ).rejects.toThrow("Invalid recommendation count.");
  });

  it("avoids AI when there are not enough eligible garments", async () => {
    await ports.garments.create({ userId: "user-1", category: GarmentCategory.TOP, primaryColor: "black", status: GarmentStatus.CLEAN_AVAILABLE });
    const stylist = new FakeOutfitStylist([]);

    await expect(
      new GenerateOutfitRecommendationsUseCase(ports, stylist).execute({
        userId: "user-1",
        context: { activities: [{ type: ActivityType.CASUAL_DINNER, time: "20:00" }] }
      })
    ).rejects.toThrow("Not enough eligible garments to generate a basic outfit.");
    expect(stylist.lastInput).toBeNull();
  });

  it("falls back to the deterministic engine when AI fails", async () => {
    const { top, bottom, footwear } = await createBasicEligibleGarments(ports);

    const result = await new GenerateOutfitRecommendationsUseCase(ports, new FakeOutfitStylist(new OutfitStylistFailedError())).execute({
      userId: "user-1",
      context: { activities: [{ type: ActivityType.CASUAL_DINNER, time: "20:00" }] }
    });

    expect(result.strategy).toBe(OutfitRecommendationStrategy.DETERMINISTIC_FALLBACK);
    expect(result.recommendations[0]?.items.map((item) => item.garmentId).sort()).toEqual([bottom.id, footwear.id, top.id].sort());
  });

  it("keeps deterministic fallback available without context", async () => {
    await createBasicEligibleGarments(ports);

    const result = await new GenerateOutfitRecommendationsUseCase(ports, new FakeOutfitStylist([])).execute({ userId: "user-1" });

    expect(result.strategy).toBe(OutfitRecommendationStrategy.DETERMINISTIC_FALLBACK);
    expect(result.recommendations[0]?.status).toBe(OutfitStatus.PRESENTED);
  });

  it("gets garment detail for the owner only", async () => {
    const garment = await ports.garments.create({ userId: "user-1", category: GarmentCategory.TOP, primaryColor: "black", status: GarmentStatus.CLEAN_AVAILABLE });

    await expect(new GetGarmentUseCase(ports).execute({ userId: "user-1", garmentId: garment.id })).resolves.toMatchObject({ id: garment.id });
    await expect(new GetGarmentUseCase(ports).execute({ userId: "user-2", garmentId: garment.id })).rejects.toThrow("Garment access is forbidden.");
    await expect(new GetGarmentUseCase(ports).execute({ userId: "user-1", garmentId: "missing" })).rejects.toThrow("Garment not found.");
  });

  it("updates editable garment metadata partially", async () => {
    const garment = await ports.garments.create({
      userId: "user-1",
      category: GarmentCategory.TOP,
      primaryColor: "cream",
      status: GarmentStatus.CLEAN_AVAILABLE
    });

    const updated = await new UpdateGarmentUseCase(ports).execute({
      userId: "user-1",
      garmentId: garment.id,
      name: "Playera crema oversized",
      fit: GarmentFit.OVERSIZED,
      formality: 2
    });

    expect(updated).toMatchObject({
      name: "Playera crema oversized",
      primaryColor: "CREAM",
      fit: GarmentFit.OVERSIZED,
      formality: 2,
      status: GarmentStatus.CLEAN_AVAILABLE,
      wearCount: 0
    });
  });

  it("rejects invalid metadata and wrong-owner updates", async () => {
    const garment = await ports.garments.create({ userId: "user-1", category: GarmentCategory.TOP, primaryColor: "cream", status: GarmentStatus.CLEAN_AVAILABLE });

    await expect(
      new UpdateGarmentUseCase(ports).execute({
        userId: "user-1",
        garmentId: garment.id,
        formality: 6
      })
    ).rejects.toThrow("Garment formality must be between 1 and 5.");
    await expect(
      new UpdateGarmentUseCase(ports).execute({
        userId: "user-2",
        garmentId: garment.id,
        name: "Nope"
      })
    ).rejects.toThrow("Garment update is forbidden.");
  });

  it("transitions garment state and persists history atomically", async () => {
    const garment = await ports.garments.create({ userId: "user-1", category: GarmentCategory.TOP, primaryColor: "cream", status: GarmentStatus.CLEAN_AVAILABLE });

    const result = await new TransitionGarmentStateUseCase(ports).execute({
      userId: "user-1",
      garmentId: garment.id,
      transition: GarmentStateTransitionType.SEND_TO_LAUNDRY
    });

    expect(result.garment.status).toBe(GarmentStatus.LAUNDRY_BIN);
    expect(result.stateTransition).toMatchObject({
      garmentId: garment.id,
      userId: "user-1",
      fromStatus: GarmentStatus.CLEAN_AVAILABLE,
      toStatus: GarmentStatus.LAUNDRY_BIN,
      transition: GarmentStateTransitionType.SEND_TO_LAUNDRY
    });
    expect(await ports.garmentStateTransitions.findByGarmentId(garment.id)).toHaveLength(1);
  });

  it("rejects invalid or wrong-owner transitions without history", async () => {
    const garment = await ports.garments.create({ userId: "user-1", category: GarmentCategory.TOP, primaryColor: "cream", status: GarmentStatus.CLEAN_AVAILABLE });

    await expect(
      new TransitionGarmentStateUseCase(ports).execute({
        userId: "user-1",
        garmentId: garment.id,
        transition: GarmentStateTransitionType.START_WASHING
      })
    ).rejects.toThrow("Invalid garment state transition");
    await expect(
      new TransitionGarmentStateUseCase(ports).execute({
        userId: "user-2",
        garmentId: garment.id,
        transition: GarmentStateTransitionType.SEND_TO_LAUNDRY
      })
    ).rejects.toThrow("Garment transition is forbidden.");
    expect(await ports.garmentStateTransitions.findByGarmentId(garment.id)).toHaveLength(0);
    expect((await ports.garments.findById(garment.id))?.status).toBe(GarmentStatus.CLEAN_AVAILABLE);
  });
});

class FakeOutfitStylist implements OutfitStylistPort {
  lastInput: { garments: OutfitStylistGarmentCandidate[]; maxRecommendations: number; weather?: WeatherContext } | null = null;

  constructor(private readonly result: OutfitStylistRecommendationCandidate[] | OutfitStylistFailedError) {}

  async recommend(input: {
    garments: OutfitStylistGarmentCandidate[];
    maxRecommendations: number;
    weather?: WeatherContext;
  }): Promise<OutfitStylistRecommendationCandidate[]> {
    this.lastInput = input;
    if (this.result instanceof OutfitStylistFailedError) {
      throw this.result;
    }

    return this.result;
  }
}

class FakeObjectStorage implements ObjectStoragePort {
  private readonly objects = new Map<string, { data: Uint8Array; mimeType: string }>();

  async storeGarmentImage(input: { userId: string; content: Uint8Array; mimeType: string }) {
    const objectKey = `users/${input.userId}/garment-images/${this.objects.size + 1}`;
    this.objects.set(objectKey, { data: input.content, mimeType: input.mimeType });
    return { objectKey };
  }

  async readObject(objectKey: string) {
    const object = this.objects.get(objectKey);
    if (!object) {
      throw new Error("Object not found.");
    }

    return object;
  }
}

class FakeGarmentAnalyzer implements GarmentAnalyzerPort {
  constructor(private readonly result: GarmentAnalysis | Error) {}

  async analyze(): Promise<GarmentAnalysis> {
    if (this.result instanceof Error) {
      throw this.result;
    }

    return this.result;
  }
}

class FakeWeatherProvider {
  calls = 0;

  constructor(private readonly result: WeatherContext | Error) {}

  async getCurrent(): Promise<WeatherContext> {
    this.calls += 1;
    if (this.result instanceof Error) {
      throw this.result;
    }

    return this.result;
  }
}

class FakeWeatherCache {
  private readonly rows = new Map<string, WeatherContext>();
  lastTtlSeconds: number | null = null;

  async get(key: string): Promise<WeatherContext | null> {
    return this.rows.get(key) ?? null;
  }

  async set(key: string, value: WeatherContext, ttlSeconds: number): Promise<void> {
    this.lastTtlSeconds = ttlSeconds;
    this.rows.set(key, value);
  }
}

function defaultAnalysis(): GarmentAnalysis {
  return {
    category: GarmentCategory.TOP,
    subcategory: GarmentSubcategory.T_SHIRT,
    primaryColor: "BLACK",
    secondaryColors: [],
    pattern: GarmentPattern.SOLID,
    fit: GarmentFit.REGULAR,
    estimatedMaterial: GarmentMaterial.COTTON,
    formality: 2
  };
}

function userFixture(input: { id: string; householdId: string; displayName: string }): ClosetUser {
  return {
    ...input,
    city: null,
    latitude: null,
    longitude: null,
    timezone: null,
    createdAt: new Date("2026-08-23T00:00:00.000Z")
  };
}

function mexicoCityLocation() {
  return {
    city: "Ciudad de Mexico",
    latitude: 19.4326,
    longitude: -99.1332,
    timezone: "America/Mexico_City"
  };
}

function weatherContext(overrides: Partial<WeatherContext>): WeatherContext {
  return {
    temperature: 20,
    apparentTemperature: 19,
    minTemperature: 15,
    maxTemperature: 24,
    rainProbability: 20,
    windSpeed: 10,
    humidity: 60,
    ...overrides
  };
}

async function createBasicEligibleGarments(ports: InMemoryPorts) {
  const top = await ports.garments.create({ userId: "user-1", category: GarmentCategory.TOP, primaryColor: "black", status: GarmentStatus.CLEAN_AVAILABLE });
  const bottom = await ports.garments.create({ userId: "user-1", category: GarmentCategory.BOTTOM, primaryColor: "blue", status: GarmentStatus.CLEAN_AVAILABLE });
  const footwear = await ports.garments.create({ userId: "user-1", category: GarmentCategory.FOOTWEAR, primaryColor: "white", status: GarmentStatus.CLEAN_AVAILABLE });
  return { top, bottom, footwear };
}
