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
  GarmentStatus,
  GarmentSubcategory,
  GarmentUsageEvent,
  Household,
  Outfit,
  OutfitFeedback,
  OutfitFeedbackDecision,
  OutfitStatus,
  UserCredential
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
  SelectOutfitUseCase,
  SubmitOutfitFeedbackUseCase
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
    findById: async (id: string) => this.userRows.get(id) ?? null
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

  householdRows = new Map<string, Household>();
  userRows = new Map<string, ClosetUser>();
  userCredentialRows = new Map<string, UserCredential>();
  authSessionRows = new Map<string, AuthSession>();
  garmentRows = new Map<string, Garment>();
  garmentImageRows = new Map<string, GarmentImage>();
  outfitRows = new Map<string, Outfit>();
  usageEventRows = new Map<string, GarmentUsageEvent>();
  outfitFeedbackRows = new Map<string, OutfitFeedback>();

  transaction<T>(work: (ports: ApplicationPorts) => Promise<T>): Promise<T> {
    return work(this);
  }
}

describe("MVP use cases", () => {
  let ports: InMemoryPorts;

  beforeEach(() => {
    ports = new InMemoryPorts();
    ports.householdRows.set("household-1", { id: "household-1", name: "Home", createdAt: new Date() });
    ports.userRows.set("user-1", { id: "user-1", householdId: "household-1", displayName: "Dann", createdAt: new Date() });
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

    ports.userRows.set("user-2", { id: "user-2", householdId: "household-1", displayName: "Other", createdAt: new Date() });
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
    ports.userRows.set("user-2", { id: "user-2", householdId: "household-1", displayName: "Other", createdAt: new Date() });
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
});

class FakeOutfitStylist implements OutfitStylistPort {
  lastInput: { garments: OutfitStylistGarmentCandidate[]; maxRecommendations: number } | null = null;

  constructor(private readonly result: OutfitStylistRecommendationCandidate[] | OutfitStylistFailedError) {}

  async recommend(input: { garments: OutfitStylistGarmentCandidate[]; maxRecommendations: number }): Promise<OutfitStylistRecommendationCandidate[]> {
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

async function createBasicEligibleGarments(ports: InMemoryPorts) {
  const top = await ports.garments.create({ userId: "user-1", category: GarmentCategory.TOP, primaryColor: "black", status: GarmentStatus.CLEAN_AVAILABLE });
  const bottom = await ports.garments.create({ userId: "user-1", category: GarmentCategory.BOTTOM, primaryColor: "blue", status: GarmentStatus.CLEAN_AVAILABLE });
  const footwear = await ports.garments.create({ userId: "user-1", category: GarmentCategory.FOOTWEAR, primaryColor: "white", status: GarmentStatus.CLEAN_AVAILABLE });
  return { top, bottom, footwear };
}
