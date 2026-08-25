import {
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
  UserCredential
} from "@closet-ai/domain";

type PrismaHousehold = { id: string; name: string; createdAt: Date };
type PrismaUser = {
  id: string;
  householdId: string;
  displayName: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  createdAt: Date;
};
type PrismaUserCredential = {
  id: string;
  userId: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};
type PrismaAuthSession = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  deviceName: string | null;
  devicePlatform: string | null;
  userAgent: string | null;
};
type PrismaGarment = {
  id: string;
  userId: string;
  category: string;
  subcategory: string | null;
  primaryColor: string;
  secondaryColors: string[];
  pattern: string | null;
  fit: string | null;
  estimatedMaterial: string | null;
  formality: number | null;
  status: string;
  name: string | null;
  wearCount: number;
  lastWornAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  images?: { id: string; createdAt: Date }[];
};
type PrismaGarmentImage = {
  id: string;
  userId: string;
  garmentId: string | null;
  objectKey: string;
  thumbnailObjectKey: string | null;
  mimeType: string;
  size: number;
  createdAt: Date;
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
type PrismaOutfitFeedback = {
  id: string;
  outfitId: string;
  userId: string;
  decision: string;
  reason: string | null;
  createdAt: Date;
};
type PrismaGarmentStateTransition = {
  id: string;
  garmentId: string;
  userId: string;
  fromStatus: string;
  toStatus: string;
  transition: string;
  createdAt: Date;
};

export function mapHousehold(row: PrismaHousehold): Household {
  return { id: row.id, name: row.name, createdAt: row.createdAt };
}

export function mapUser(row: PrismaUser): ClosetUser {
  return {
    id: row.id,
    householdId: row.householdId,
    displayName: row.displayName,
    city: row.city,
    latitude: row.latitude,
    longitude: row.longitude,
    timezone: row.timezone,
    createdAt: row.createdAt
  };
}

export function mapUserCredential(row: PrismaUserCredential): UserCredential {
  return {
    id: row.id,
    userId: row.userId,
    email: row.email,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export function mapAuthSession(row: PrismaAuthSession): AuthSession {
  return {
    id: row.id,
    userId: row.userId,
    refreshTokenHash: row.refreshTokenHash,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    lastUsedAt: row.lastUsedAt,
    revokedAt: row.revokedAt,
    deviceName: row.deviceName ?? undefined,
    devicePlatform: row.devicePlatform ?? undefined,
    userAgent: row.userAgent ?? undefined
  };
}

export function mapGarment(row: PrismaGarment): Garment {
  return {
    id: row.id,
    userId: row.userId,
    category: row.category as GarmentCategory,
    subcategory: row.subcategory as GarmentSubcategory | null,
    primaryColor: row.primaryColor,
    secondaryColors: row.secondaryColors,
    pattern: row.pattern as GarmentPattern | null,
    fit: row.fit as GarmentFit | null,
    estimatedMaterial: row.estimatedMaterial as GarmentMaterial | null,
    formality: row.formality,
    status: row.status as GarmentStatus,
    name: row.name ?? undefined,
    imageId: row.images?.[0]?.id,
    wearCount: row.wearCount,
    lastWornAt: row.lastWornAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export function mapGarmentImage(row: PrismaGarmentImage): GarmentImage {
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

export function mapOutfitFeedback(row: PrismaOutfitFeedback): OutfitFeedback {
  return {
    id: row.id,
    outfitId: row.outfitId,
    userId: row.userId,
    decision: row.decision as OutfitFeedbackDecision,
    reason: row.reason,
    createdAt: row.createdAt
  };
}

export function mapGarmentStateTransition(row: PrismaGarmentStateTransition): GarmentStateTransition {
  return {
    id: row.id,
    garmentId: row.garmentId,
    userId: row.userId,
    fromStatus: row.fromStatus as GarmentStatus,
    toStatus: row.toStatus as GarmentStatus,
    transition: row.transition as GarmentStateTransitionType,
    createdAt: row.createdAt
  };
}
