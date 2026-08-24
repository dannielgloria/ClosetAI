import {
  chooseBasicOutfitGarments,
  confirmOutfitUsage,
  EntityId,
  Garment,
  GarmentCategory,
  GarmentStatus,
  markGarmentWorn,
  selectOutfit
} from "@closet-ai/domain";
import { ApplicationPorts, UnitOfWorkPort } from "./ports.js";

export class CreateHouseholdUseCase {
  constructor(private readonly ports: ApplicationPorts) {}

  execute(input: { name: string; initialUserDisplayName: string }) {
    return this.ports.households.createWithInitialUser(input);
  }
}

export class CreateUserUseCase {
  constructor(private readonly ports: ApplicationPorts) {}

  async execute(input: { householdId: EntityId; displayName: string }) {
    const household = await this.ports.households.findById(input.householdId);
    if (!household) {
      throw new Error("Household not found.");
    }

    return this.ports.users.create(input);
  }
}

export class CreateGarmentUseCase {
  constructor(private readonly ports: ApplicationPorts) {}

  async execute(input: {
    userId: EntityId;
    category: GarmentCategory;
    primaryColor: string;
    status?: GarmentStatus;
    name?: string;
  }): Promise<Garment> {
    const user = await this.ports.users.findById(input.userId);
    if (!user) {
      throw new Error("User not found.");
    }

    return this.ports.garments.create({
      userId: input.userId,
      category: input.category,
      primaryColor: input.primaryColor,
      status: input.status ?? GarmentStatus.CLEAN_AVAILABLE,
      name: input.name
    });
  }
}

export class ListAvailableGarmentsUseCase {
  constructor(private readonly ports: ApplicationPorts) {}

  execute(input: { userId: EntityId }): Promise<Garment[]> {
    return this.ports.garments.findAvailableByUserId(input.userId);
  }
}

export class GenerateBasicOutfitUseCase {
  constructor(private readonly ports: ApplicationPorts) {}

  async execute(input: { userId: EntityId }) {
    const availableGarments = await this.ports.garments.findAvailableByUserId(input.userId);
    const selectedGarments = chooseBasicOutfitGarments(availableGarments, input.userId);

    return this.ports.outfits.create({
      userId: input.userId,
      garmentIds: selectedGarments.map((garment) => garment.id),
      explanation: "Basic outfit generated from available top, bottom, and footwear without AI.",
      score: 100
    });
  }
}

export class SelectOutfitUseCase {
  constructor(private readonly ports: ApplicationPorts) {}

  async execute(input: { outfitId: EntityId; userId: EntityId }) {
    const outfit = await this.ports.outfits.findById(input.outfitId);
    if (!outfit || outfit.userId !== input.userId) {
      throw new Error("Outfit not found.");
    }

    return this.ports.outfits.save(selectOutfit(outfit, new Date()));
  }
}

export class ConfirmOutfitUsageUseCase {
  constructor(
    private readonly unitOfWork: UnitOfWorkPort,
    private readonly ports: ApplicationPorts
  ) {}

  async execute(input: { outfitId: EntityId; userId: EntityId; wornGarmentIds?: EntityId[]; context?: Record<string, unknown> }) {
    return this.unitOfWork.transaction(async (ports) => {
      const outfit = await ports.outfits.findById(input.outfitId);
      if (!outfit || outfit.userId !== input.userId) {
        throw new Error("Outfit not found.");
      }

      if (outfit.status === "WORN") {
        const existingEvents = await ports.usageEvents.findByOutfitId(outfit.id);
        return { outfit, usageEvents: existingEvents };
      }

      const wornGarmentIds = input.wornGarmentIds ?? outfit.items.map((item) => item.garmentId);
      const outfitGarmentIds = new Set(outfit.items.map((item) => item.garmentId));

      for (const garmentId of wornGarmentIds) {
        if (!outfitGarmentIds.has(garmentId)) {
          throw new Error("Worn garment must belong to the outfit.");
        }
      }

      const garments = await ports.garments.findByIds(wornGarmentIds);
      if (garments.length !== wornGarmentIds.length) {
        throw new Error("One or more worn garments were not found.");
      }

      for (const garment of garments) {
        if (garment.userId !== input.userId) {
          throw new Error("Worn garment belongs to a different user.");
        }
      }

      const now = new Date();
      const wornOutfit = await ports.outfits.save(confirmOutfitUsage(outfit, now));
      const updatedGarments = garments.map((garment) => markGarmentWorn(garment, now));
      await Promise.all(updatedGarments.map((garment) => ports.garments.save(garment)));

      const usageEvents = await ports.usageEvents.createManyIfAbsent(
        wornGarmentIds.map((garmentId) => ({
          userId: input.userId,
          garmentId,
          outfitId: outfit.id,
          wornAt: now,
          context: input.context ?? {}
        }))
      );

      return { outfit: wornOutfit, usageEvents };
    });
  }
}
