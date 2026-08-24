import { beforeEach, describe, expect, it } from "vitest";
import {
  ClosetUser,
  Garment,
  GarmentCategory,
  GarmentStatus,
  GarmentUsageEvent,
  Household,
  Outfit,
  OutfitStatus
} from "@closet-ai/domain";
import { ApplicationPorts, UnitOfWorkPort } from "./ports.js";
import {
  ConfirmOutfitUsageUseCase,
  CreateGarmentUseCase,
  GenerateBasicOutfitUseCase,
  SelectOutfitUseCase
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
  garments = {
    create: async (input: Pick<Garment, "userId" | "category" | "primaryColor" | "status" | "name">) => {
      const now = new Date("2026-08-23T00:00:00.000Z");
      const row: Garment = {
        id: `garment-${this.garmentRows.size + 1}`,
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
    findByIds: async (ids: string[]) => ids.map((id) => this.garmentRows.get(id)).filter((row): row is Garment => Boolean(row)),
    save: async (garment: Garment) => {
      this.garmentRows.set(garment.id, garment);
      return garment;
    }
  };
  outfits = {
    create: async (input: { userId: string; garmentIds: string[]; explanation: string; score: number }) => {
      const now = new Date("2026-08-23T00:00:00.000Z");
      const row: Outfit = {
        id: `outfit-${this.outfitRows.size + 1}`,
        userId: input.userId,
        status: OutfitStatus.GENERATED,
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

  householdRows = new Map<string, Household>();
  userRows = new Map<string, ClosetUser>();
  garmentRows = new Map<string, Garment>();
  outfitRows = new Map<string, Outfit>();
  usageEventRows = new Map<string, GarmentUsageEvent>();

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

    const useCase = new ConfirmOutfitUsageUseCase(ports, ports);
    await useCase.execute({ outfitId: selected.id, userId: "user-1" });
    await useCase.execute({ outfitId: selected.id, userId: "user-1" });

    expect(ports.usageEventRows.size).toBe(1);
    expect(ports.garmentRows.get(top.id)?.wearCount).toBe(1);
  });
});
