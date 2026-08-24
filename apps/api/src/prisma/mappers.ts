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

type PrismaHousehold = { id: string; name: string; createdAt: Date };
type PrismaUser = { id: string; householdId: string; displayName: string; createdAt: Date };
type PrismaGarment = {
  id: string;
  userId: string;
  category: string;
  primaryColor: string;
  status: string;
  name: string | null;
  wearCount: number;
  lastWornAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
type PrismaOutfit = {
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
};
type PrismaUsageEvent = {
  id: string;
  userId: string;
  garmentId: string;
  outfitId: string;
  wornAt: Date;
  context: unknown;
};

export function mapHousehold(row: PrismaHousehold): Household {
  return { id: row.id, name: row.name, createdAt: row.createdAt };
}

export function mapUser(row: PrismaUser): ClosetUser {
  return { id: row.id, householdId: row.householdId, displayName: row.displayName, createdAt: row.createdAt };
}

export function mapGarment(row: PrismaGarment): Garment {
  return {
    id: row.id,
    userId: row.userId,
    category: row.category as GarmentCategory,
    primaryColor: row.primaryColor,
    status: row.status as GarmentStatus,
    name: row.name ?? undefined,
    wearCount: row.wearCount,
    lastWornAt: row.lastWornAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export function mapOutfit(row: PrismaOutfit): Outfit {
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

export function mapUsageEvent(row: PrismaUsageEvent): GarmentUsageEvent {
  return {
    id: row.id,
    userId: row.userId,
    garmentId: row.garmentId,
    outfitId: row.outfitId,
    wornAt: row.wornAt,
    context: typeof row.context === "object" && row.context !== null ? (row.context as Record<string, unknown>) : {}
  };
}
