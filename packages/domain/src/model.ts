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

export enum GarmentSubcategory {
  T_SHIRT = "T_SHIRT",
  SHIRT = "SHIRT",
  SWEATER = "SWEATER",
  HOODIE = "HOODIE",
  JACKET = "JACKET",
  JEANS = "JEANS",
  TROUSERS = "TROUSERS",
  SHORTS = "SHORTS",
  SKIRT = "SKIRT",
  DRESS = "DRESS",
  SNEAKERS = "SNEAKERS",
  BOOTS = "BOOTS",
  DRESS_SHOES = "DRESS_SHOES",
  SANDALS = "SANDALS",
  ACCESSORY = "ACCESSORY",
  UNKNOWN = "UNKNOWN"
}

export enum GarmentPattern {
  SOLID = "SOLID",
  STRIPED = "STRIPED",
  CHECKED = "CHECKED",
  PRINTED = "PRINTED",
  TEXTURED = "TEXTURED",
  UNKNOWN = "UNKNOWN"
}

export enum GarmentFit {
  SLIM = "SLIM",
  REGULAR = "REGULAR",
  RELAXED = "RELAXED",
  OVERSIZED = "OVERSIZED",
  UNKNOWN = "UNKNOWN"
}

export enum GarmentMaterial {
  COTTON = "COTTON",
  DENIM = "DENIM",
  WOOL = "WOOL",
  LINEN = "LINEN",
  LEATHER = "LEATHER",
  SYNTHETIC = "SYNTHETIC",
  KNIT = "KNIT",
  UNKNOWN = "UNKNOWN"
}

export enum OutfitStatus {
  GENERATED = "GENERATED",
  PRESENTED = "PRESENTED",
  SELECTED = "SELECTED",
  WORN = "WORN",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED"
}

export enum OutfitFeedbackDecision {
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED"
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
  secondaryColors: string[];
  subcategory: GarmentSubcategory | null;
  pattern: GarmentPattern | null;
  fit: GarmentFit | null;
  estimatedMaterial: GarmentMaterial | null;
  formality: number | null;
  status: GarmentStatus;
  name?: string;
  imageId?: EntityId;
  wearCount: number;
  lastWornAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GarmentImage {
  id: EntityId;
  userId: EntityId;
  garmentId: EntityId | null;
  objectKey: string;
  mimeType: string;
  size: number;
  createdAt: Date;
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

export interface OutfitFeedback {
  id: EntityId;
  outfitId: EntityId;
  userId: EntityId;
  decision: OutfitFeedbackDecision;
  reason: string | null;
  createdAt: Date;
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
