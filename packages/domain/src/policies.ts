import { Garment, GarmentCategory, GarmentStatus, Outfit, OutfitStatus } from "./model.js";

const ELIGIBLE_STATUSES = new Set<GarmentStatus>([
  GarmentStatus.CLEAN_AVAILABLE,
  GarmentStatus.WORN_REUSABLE
]);

export function isGarmentEligibleForOutfit(garment: Garment): boolean {
  return ELIGIBLE_STATUSES.has(garment.status);
}

export function assertGarmentCanBeRecommended(garment: Garment, userId: string): void {
  if (garment.userId !== userId) {
    throw new Error("Garment belongs to a different user.");
  }

  if (!isGarmentEligibleForOutfit(garment)) {
    throw new Error("Garment is not eligible for outfit generation.");
  }
}

export function selectOutfit(outfit: Outfit, now: Date): Outfit {
  if (outfit.status === OutfitStatus.WORN) {
    throw new Error("A worn outfit cannot be selected again.");
  }

  return {
    ...outfit,
    status: OutfitStatus.SELECTED,
    selectedAt: outfit.selectedAt ?? now,
    updatedAt: now
  };
}

export function confirmOutfitUsage(outfit: Outfit, now: Date): Outfit {
  if (outfit.status === OutfitStatus.WORN) {
    return outfit;
  }

  if (outfit.status !== OutfitStatus.SELECTED) {
    throw new Error("Only a selected outfit can be confirmed as worn.");
  }

  return {
    ...outfit,
    status: OutfitStatus.WORN,
    wornAt: outfit.wornAt ?? now,
    updatedAt: now
  };
}

export function markGarmentWorn(garment: Garment, now: Date): Garment {
  return {
    ...garment,
    status: GarmentStatus.WORN_REUSABLE,
    wearCount: garment.wearCount + 1,
    lastWornAt: now,
    updatedAt: now
  };
}

export function chooseBasicOutfitGarments(garments: Garment[], userId: string): Garment[] {
  const eligible = garments.filter((garment) => {
    if (garment.userId !== userId) {
      throw new Error("Garment belongs to a different user.");
    }

    return isGarmentEligibleForOutfit(garment);
  });

  const top = eligible.find((garment) => garment.category === GarmentCategory.TOP);
  const bottom = eligible.find((garment) => garment.category === GarmentCategory.BOTTOM);
  const footwear = eligible.find((garment) => garment.category === GarmentCategory.FOOTWEAR);

  if (!top || !bottom || !footwear) {
    throw new Error("Not enough eligible garments to generate a basic outfit.");
  }

  return [top, bottom, footwear];
}
