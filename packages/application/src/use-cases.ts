import {
  chooseBasicOutfitGarments,
  confirmOutfitUsage,
  EntityId,
  Garment,
  GarmentCategory,
  GarmentFit,
  GarmentMaterial,
  GarmentPattern,
  GarmentStateTransitionType,
  GarmentStatus,
  GarmentSubcategory,
  markGarmentWorn,
  OutfitFeedbackDecision,
  OutfitStatus,
  selectOutfit
} from "@closet-ai/domain";
import { transitionGarmentState } from "@closet-ai/domain";
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
  constructor(private readonly unitOfWork: UnitOfWorkPort) {}

  async execute(input: {
    userId: EntityId;
    category: GarmentCategory;
    primaryColor: string;
    secondaryColors?: string[];
    subcategory?: GarmentSubcategory | null;
    pattern?: GarmentPattern | null;
    fit?: GarmentFit | null;
    estimatedMaterial?: GarmentMaterial | null;
    formality?: number | null;
    status?: GarmentStatus;
    name?: string;
    imageId?: EntityId;
  }): Promise<Garment> {
    return this.unitOfWork.transaction(async (ports) => {
      const user = await ports.users.findById(input.userId);
      if (!user) {
        throw new Error("User not found.");
      }

      if (input.imageId) {
        const image = await ports.garmentImages.findById(input.imageId);
        if (!image) {
          throw new Error("Garment image not found.");
        }

        if (image.userId !== input.userId) {
          throw new Error("Garment image access is forbidden.");
        }

        if (image.garmentId) {
          throw new Error("Garment image is already linked.");
        }
      }

      validateGarmentMetadata(input);

      const garment = await ports.garments.create({
        userId: input.userId,
        category: input.category,
        primaryColor: normalizeColor(input.primaryColor),
        secondaryColors: (input.secondaryColors ?? []).map(normalizeColor),
        subcategory: input.subcategory ?? null,
        pattern: input.pattern ?? null,
        fit: input.fit ?? null,
        estimatedMaterial: input.estimatedMaterial ?? null,
        formality: input.formality ?? null,
        status: input.status ?? GarmentStatus.CLEAN_AVAILABLE,
        name: input.name
      });

      if (input.imageId) {
        await ports.garmentImages.linkToGarment({ imageId: input.imageId, garmentId: garment.id });
        return { ...garment, imageId: input.imageId };
      }

      return garment;
    });
  }
}

export class ListAvailableGarmentsUseCase {
  constructor(private readonly ports: ApplicationPorts) {}

  execute(input: { userId: EntityId }): Promise<Garment[]> {
    return this.ports.garments.findAvailableByUserId(input.userId);
  }
}

export class ListGarmentsUseCase {
  constructor(private readonly ports: ApplicationPorts) {}

  execute(input: { userId: EntityId }): Promise<Garment[]> {
    return this.ports.garments.findByUserId(input.userId);
  }
}

export class GetGarmentUseCase {
  constructor(private readonly ports: ApplicationPorts) {}

  async execute(input: { userId: EntityId; garmentId: EntityId }): Promise<Garment> {
    const garment = await this.ports.garments.findById(input.garmentId);
    if (!garment) {
      throw new Error("Garment not found.");
    }

    if (garment.userId !== input.userId) {
      throw new Error("Garment access is forbidden.");
    }

    return garment;
  }
}

export class UpdateGarmentUseCase {
  constructor(private readonly ports: ApplicationPorts) {}

  async execute(input: {
    userId: EntityId;
    garmentId: EntityId;
    category?: GarmentCategory;
    primaryColor?: string;
    secondaryColors?: string[];
    subcategory?: GarmentSubcategory | null;
    pattern?: GarmentPattern | null;
    fit?: GarmentFit | null;
    estimatedMaterial?: GarmentMaterial | null;
    formality?: number | null;
    name?: string | null;
  }): Promise<Garment> {
    const garment = await this.ports.garments.findById(input.garmentId);
    if (!garment) {
      throw new Error("Garment not found.");
    }

    if (garment.userId !== input.userId) {
      throw new Error("Garment update is forbidden.");
    }

    const metadata = {
      category: input.category ?? garment.category,
      primaryColor: normalizeColor(input.primaryColor ?? garment.primaryColor),
      secondaryColors: input.secondaryColors ? input.secondaryColors.map(normalizeColor) : garment.secondaryColors,
      subcategory: input.subcategory === undefined ? garment.subcategory : input.subcategory,
      pattern: input.pattern === undefined ? garment.pattern : input.pattern,
      fit: input.fit === undefined ? garment.fit : input.fit,
      estimatedMaterial: input.estimatedMaterial === undefined ? garment.estimatedMaterial : input.estimatedMaterial,
      formality: input.formality === undefined ? garment.formality : input.formality,
      name: input.name === undefined ? garment.name : normalizeOptionalText(input.name)
    };
    validateGarmentMetadata(metadata);

    return this.ports.garments.updateMetadata(garment.id, metadata);
  }
}

export class TransitionGarmentStateUseCase {
  constructor(private readonly unitOfWork: UnitOfWorkPort) {}

  async execute(input: { userId: EntityId; garmentId: EntityId; transition: GarmentStateTransitionType }) {
    return this.unitOfWork.transaction(async (ports) => {
      const garment = await ports.garments.findById(input.garmentId);
      if (!garment) {
        throw new Error("Garment not found.");
      }

      if (garment.userId !== input.userId) {
        throw new Error("Garment transition is forbidden.");
      }

      const next = transitionGarmentState(garment, input.transition, new Date());
      const saved = await ports.garments.save(next);
      const stateTransition = await ports.garmentStateTransitions.create({
        garmentId: garment.id,
        userId: input.userId,
        fromStatus: garment.status,
        toStatus: saved.status,
        transition: input.transition
      });

      return { garment: saved, stateTransition };
    });
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
  constructor(private readonly unitOfWork: UnitOfWorkPort) {}

  async execute(input: { outfitId: EntityId; userId: EntityId; wornGarmentIds?: EntityId[]; context?: Record<string, unknown> }) {
    return this.unitOfWork.transaction(async (ports) => {
      const outfit = await ports.outfits.findById(input.outfitId);
      if (!outfit || outfit.userId !== input.userId) {
        throw new Error("Outfit not found.");
      }

      if (outfit.status === OutfitStatus.WORN) {
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
      await Promise.all(
        garments
          .filter((garment) => garment.status !== GarmentStatus.WORN_REUSABLE)
          .map((garment) =>
            ports.garmentStateTransitions.create({
              garmentId: garment.id,
              userId: input.userId,
              fromStatus: garment.status,
              toStatus: GarmentStatus.WORN_REUSABLE,
              transition: GarmentStateTransitionType.MARK_WORN_REUSABLE
            })
          )
      );

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

export class SubmitOutfitFeedbackUseCase {
  constructor(private readonly ports: ApplicationPorts) {}

  async execute(input: { outfitId: EntityId; userId: EntityId; decision: OutfitFeedbackDecision; reason?: string | null }) {
    const outfit = await this.ports.outfits.findById(input.outfitId);
    if (!outfit) {
      throw new Error("Outfit not found.");
    }

    if (outfit.userId !== input.userId) {
      throw new Error("Outfit feedback is forbidden.");
    }

    if (!Object.values(OutfitFeedbackDecision).includes(input.decision)) {
      throw new Error("Invalid outfit feedback decision.");
    }

    const reason = normalizeFeedbackReason(input.reason);

    return this.ports.outfitFeedback.create({
      outfitId: outfit.id,
      userId: input.userId,
      decision: input.decision,
      reason
    });
  }
}

function normalizeFeedbackReason(reason: string | null | undefined): string | null {
  if (reason === null || reason === undefined) {
    return null;
  }

  const trimmed = reason.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > 500) {
    throw new Error("Feedback reason is too long.");
  }

  return trimmed;
}

function validateGarmentMetadata(input: { primaryColor: string; secondaryColors?: string[]; formality?: number | null }): void {
  normalizeColor(input.primaryColor);

  const secondaryColors = input.secondaryColors ?? [];
  if (secondaryColors.length > 5) {
    throw new Error("Too many secondary colors.");
  }

  secondaryColors.forEach(normalizeColor);

  if (input.formality !== null && input.formality !== undefined) {
    if (!Number.isInteger(input.formality) || input.formality < 1 || input.formality > 5) {
      throw new Error("Garment formality must be between 1 and 5.");
    }
  }
}

function normalizeColor(color: string): string {
  const normalized = color.trim().toUpperCase().replaceAll(/[^A-Z0-9_]/g, "_");
  if (normalized.length === 0 || normalized.length > 40) {
    throw new Error("Garment color is invalid.");
  }

  return normalized;
}

function normalizeOptionalText(value: string | null): string | undefined {
  if (value === null) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}
