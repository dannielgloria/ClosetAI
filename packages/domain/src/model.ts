export type EntityId = string;

export enum GarmentCategory {
  TOP = "TOP",
  BOTTOM = "BOTTOM",
  OUTERWEAR = "OUTERWEAR",
  FOOTWEAR = "FOOTWEAR",
  UNDERWEAR = "UNDERWEAR",
  ACCESSORY = "ACCESSORY",
  SPORTSWEAR = "SPORTSWEAR",
  FORMALWEAR = "FORMALWEAR",
  SLEEPWEAR = "SLEEPWEAR"
}

export enum GarmentStatus {
  CLEAN_AVAILABLE = "CLEAN_AVAILABLE",
  WORN_REUSABLE = "WORN_REUSABLE",
  LAUNDRY_BIN = "LAUNDRY_BIN",
  WASHING = "WASHING",
  DRYING = "DRYING",
  CLEAN_PENDING_STORAGE = "CLEAN_PENDING_STORAGE",
  UNAVAILABLE = "UNAVAILABLE",
  REPAIR = "REPAIR",
  RETIRED = "RETIRED",
  DONATED = "DONATED",
  DISCARDED = "DISCARDED"
}

export enum OutfitStatus {
  GENERATED = "GENERATED",
  PRESENTED = "PRESENTED",
  SELECTED = "SELECTED",
  WORN = "WORN",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED"
}

export interface Household {
  id: EntityId;
  name: string;
  createdAt: Date;
}

export interface ClosetUser {
  id: EntityId;
  householdId: EntityId;
  displayName: string;
  createdAt: Date;
}

export interface Garment {
  id: EntityId;
  userId: EntityId;
  category: GarmentCategory;
  primaryColor: string;
  status: GarmentStatus;
  name?: string;
  wearCount: number;
  lastWornAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OutfitItem {
  garmentId: EntityId;
  position: number;
}

export interface Outfit {
  id: EntityId;
  userId: EntityId;
  status: OutfitStatus;
  items: OutfitItem[];
  explanation: string;
  score: number;
  selectedAt: Date | null;
  wornAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GarmentUsageEvent {
  id: EntityId;
  userId: EntityId;
  garmentId: EntityId;
  outfitId: EntityId;
  wornAt: Date;
  context: Record<string, unknown>;
}

export interface UserCredential {
  id: EntityId;
  userId: EntityId;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  id: EntityId;
  userId: EntityId;
  refreshTokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  deviceName?: string;
  devicePlatform?: string;
  userAgent?: string;
}
