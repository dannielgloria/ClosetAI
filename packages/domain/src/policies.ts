import { Garment, GarmentCategory, GarmentStateTransitionType, GarmentStatus, Outfit, OutfitStatus } from "./model.js";

const ELIGIBLE_STATUSES = new Set<GarmentStatus>([
  GarmentStatus.CLEAN_AVAILABLE,
  GarmentStatus.WORN_REUSABLE
]);

const VALID_GARMENT_TRANSITIONS: Record<GarmentStatus, Partial<Record<GarmentStateTransitionType, GarmentStatus>>> = {
  [GarmentStatus.CLEAN_AVAILABLE]: {
    [GarmentStateTransitionType.MARK_WORN_REUSABLE]: GarmentStatus.WORN_REUSABLE,
    [GarmentStateTransitionType.SEND_TO_LAUNDRY]: GarmentStatus.LAUNDRY_BIN,
    [GarmentStateTransitionType.MARK_UNAVAILABLE]: GarmentStatus.UNAVAILABLE,
    [GarmentStateTransitionType.SEND_TO_REPAIR]: GarmentStatus.REPAIR,
    [GarmentStateTransitionType.RETIRE]: GarmentStatus.RETIRED,
    [GarmentStateTransitionType.DONATE]: GarmentStatus.DONATED,
    [GarmentStateTransitionType.DISCARD]: GarmentStatus.DISCARDED
  },
  [GarmentStatus.WORN_REUSABLE]: {
    [GarmentStateTransitionType.SEND_TO_LAUNDRY]: GarmentStatus.LAUNDRY_BIN,
    [GarmentStateTransitionType.MARK_CLEAN_AVAILABLE]: GarmentStatus.CLEAN_AVAILABLE,
    [GarmentStateTransitionType.MARK_UNAVAILABLE]: GarmentStatus.UNAVAILABLE,
    [GarmentStateTransitionType.SEND_TO_REPAIR]: GarmentStatus.REPAIR,
    [GarmentStateTransitionType.RETIRE]: GarmentStatus.RETIRED,
    [GarmentStateTransitionType.DONATE]: GarmentStatus.DONATED,
    [GarmentStateTransitionType.DISCARD]: GarmentStatus.DISCARDED
  },
  [GarmentStatus.LAUNDRY_BIN]: {
    [GarmentStateTransitionType.START_WASHING]: GarmentStatus.WASHING,
    [GarmentStateTransitionType.MARK_CLEAN_AVAILABLE]: GarmentStatus.CLEAN_AVAILABLE,
    [GarmentStateTransitionType.MARK_UNAVAILABLE]: GarmentStatus.UNAVAILABLE,
    [GarmentStateTransitionType.RETIRE]: GarmentStatus.RETIRED,
    [GarmentStateTransitionType.DONATE]: GarmentStatus.DONATED,
    [GarmentStateTransitionType.DISCARD]: GarmentStatus.DISCARDED
  },
  [GarmentStatus.WASHING]: {
    [GarmentStateTransitionType.START_DRYING]: GarmentStatus.DRYING,
    [GarmentStateTransitionType.MARK_UNAVAILABLE]: GarmentStatus.UNAVAILABLE
  },
  [GarmentStatus.DRYING]: {
    [GarmentStateTransitionType.MARK_CLEAN_PENDING_STORAGE]: GarmentStatus.CLEAN_PENDING_STORAGE,
    [GarmentStateTransitionType.MARK_CLEAN_AVAILABLE]: GarmentStatus.CLEAN_AVAILABLE
  },
  [GarmentStatus.CLEAN_PENDING_STORAGE]: {
    [GarmentStateTransitionType.MARK_CLEAN_AVAILABLE]: GarmentStatus.CLEAN_AVAILABLE
  },
  [GarmentStatus.UNAVAILABLE]: {
    [GarmentStateTransitionType.MARK_CLEAN_AVAILABLE]: GarmentStatus.CLEAN_AVAILABLE,
    [GarmentStateTransitionType.SEND_TO_REPAIR]: GarmentStatus.REPAIR,
    [GarmentStateTransitionType.RETIRE]: GarmentStatus.RETIRED,
    [GarmentStateTransitionType.DONATE]: GarmentStatus.DONATED,
    [GarmentStateTransitionType.DISCARD]: GarmentStatus.DISCARDED
  },
  [GarmentStatus.REPAIR]: {
    [GarmentStateTransitionType.RETURN_FROM_REPAIR]: GarmentStatus.CLEAN_AVAILABLE,
    [GarmentStateTransitionType.RETIRE]: GarmentStatus.RETIRED,
    [GarmentStateTransitionType.DONATE]: GarmentStatus.DONATED,
    [GarmentStateTransitionType.DISCARD]: GarmentStatus.DISCARDED
  },
  [GarmentStatus.RETIRED]: {
    [GarmentStateTransitionType.RESTORE]: GarmentStatus.CLEAN_AVAILABLE,
    [GarmentStateTransitionType.DONATE]: GarmentStatus.DONATED,
    [GarmentStateTransitionType.DISCARD]: GarmentStatus.DISCARDED
  },
  [GarmentStatus.DONATED]: {},
  [GarmentStatus.DISCARDED]: {}
};

export function getValidGarmentTransitions(status: GarmentStatus): GarmentStateTransitionType[] {
  return Object.keys(VALID_GARMENT_TRANSITIONS[status]) as GarmentStateTransitionType[];
}

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
  const transitioned =
    garment.status === GarmentStatus.WORN_REUSABLE
      ? { ...garment, updatedAt: now }
      : transitionGarmentState(garment, GarmentStateTransitionType.MARK_WORN_REUSABLE, now);

  return {
    ...transitioned,
    wearCount: garment.wearCount + 1,
    lastWornAt: now
  };
}

export function transitionGarmentState(garment: Garment, transition: GarmentStateTransitionType, now: Date): Garment {
  const nextStatus = VALID_GARMENT_TRANSITIONS[garment.status][transition];
  if (!nextStatus) {
    throw new Error(`Invalid garment state transition: ${transition} from ${garment.status}.`);
  }

  return {
    ...garment,
    status: nextStatus,
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
