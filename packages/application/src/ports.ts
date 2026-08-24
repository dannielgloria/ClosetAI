import {
  AuthSession,
  ClosetUser,
  EntityId,
  Garment,
  GarmentImage,
  GarmentUsageEvent,
  Household,
  Outfit,
  OutfitFeedback,
  OutfitFeedbackDecision,
  OutfitStatus,
  UserCredential
} from "@closet-ai/domain";

export interface CreateHouseholdRecord {
  name: string;
  initialUserDisplayName: string;
}

export interface HouseholdRepositoryPort {
  createWithInitialUser(input: CreateHouseholdRecord): Promise<{ household: Household; user: ClosetUser }>;
  findById(id: EntityId): Promise<Household | null>;
}

export interface UserRepositoryPort {
  create(input: { householdId: EntityId; displayName: string }): Promise<ClosetUser>;
  findById(id: EntityId): Promise<ClosetUser | null>;
}

export interface UserCredentialRepositoryPort {
  create(input: { userId: EntityId; email: string; passwordHash: string }): Promise<UserCredential>;
  findByEmail(email: string): Promise<UserCredential | null>;
  findByUserId(userId: EntityId): Promise<UserCredential | null>;
  count(): Promise<number>;
}

export interface AuthSessionRepositoryPort {
  create(input: {
    userId: EntityId;
    refreshTokenHash: string;
    expiresAt: Date;
    deviceName?: string;
    devicePlatform?: string;
    userAgent?: string;
  }): Promise<AuthSession>;
  findById(id: EntityId): Promise<AuthSession | null>;
  findExpired(now: Date): Promise<AuthSession[]>;
  findRevoked(): Promise<AuthSession[]>;
  save(session: AuthSession): Promise<AuthSession>;
}

export interface GarmentRepositoryPort {
  create(input: {
    userId: EntityId;
    category: Garment["category"];
    primaryColor: string;
    secondaryColors?: string[];
    subcategory?: Garment["subcategory"];
    pattern?: Garment["pattern"];
    fit?: Garment["fit"];
    estimatedMaterial?: Garment["estimatedMaterial"];
    formality?: number | null;
    status: Garment["status"];
    name?: string;
  }): Promise<Garment>;
  findByUserId(userId: EntityId): Promise<Garment[]>;
  findAvailableByUserId(userId: EntityId): Promise<Garment[]>;
  findByIds(ids: EntityId[]): Promise<Garment[]>;
  save(garment: Garment): Promise<Garment>;
}

export interface GarmentImageRepositoryPort {
  create(input: { userId: EntityId; objectKey: string; mimeType: string; size: number }): Promise<GarmentImage>;
  findById(id: EntityId): Promise<GarmentImage | null>;
  linkToGarment(input: { imageId: EntityId; garmentId: EntityId }): Promise<GarmentImage>;
}

export interface OutfitRepositoryPort {
  create(input: {
    userId: EntityId;
    garmentIds: EntityId[];
    explanation: string;
    score: number;
    status?: OutfitStatus;
  }): Promise<Outfit>;
  findById(id: EntityId): Promise<Outfit | null>;
  save(outfit: Outfit): Promise<Outfit>;
}

export interface UsageEventRepositoryPort {
  createManyIfAbsent(events: Omit<GarmentUsageEvent, "id">[]): Promise<GarmentUsageEvent[]>;
  findByOutfitId(outfitId: EntityId): Promise<GarmentUsageEvent[]>;
}

export interface OutfitFeedbackRepositoryPort {
  create(input: {
    outfitId: EntityId;
    userId: EntityId;
    decision: OutfitFeedbackDecision;
    reason: string | null;
  }): Promise<OutfitFeedback>;
  findByOutfitId(outfitId: EntityId): Promise<OutfitFeedback[]>;
}

export interface UnitOfWorkPort {
  transaction<T>(work: (ports: ApplicationPorts) => Promise<T>): Promise<T>;
}

export interface ApplicationPorts {
  households: HouseholdRepositoryPort;
  users: UserRepositoryPort;
  userCredentials: UserCredentialRepositoryPort;
  authSessions: AuthSessionRepositoryPort;
  garments: GarmentRepositoryPort;
  garmentImages: GarmentImageRepositoryPort;
  outfits: OutfitRepositoryPort;
  usageEvents: UsageEventRepositoryPort;
  outfitFeedback: OutfitFeedbackRepositoryPort;
}
