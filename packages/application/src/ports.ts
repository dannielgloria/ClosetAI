import {
  ClosetUser,
  EntityId,
  Garment,
  GarmentUsageEvent,
  Household,
  Outfit
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

export interface GarmentRepositoryPort {
  create(input: {
    userId: EntityId;
    category: Garment["category"];
    primaryColor: string;
    status: Garment["status"];
    name?: string;
  }): Promise<Garment>;
  findByUserId(userId: EntityId): Promise<Garment[]>;
  findAvailableByUserId(userId: EntityId): Promise<Garment[]>;
  findByIds(ids: EntityId[]): Promise<Garment[]>;
  save(garment: Garment): Promise<Garment>;
}

export interface OutfitRepositoryPort {
  create(input: {
    userId: EntityId;
    garmentIds: EntityId[];
    explanation: string;
    score: number;
  }): Promise<Outfit>;
  findById(id: EntityId): Promise<Outfit | null>;
  save(outfit: Outfit): Promise<Outfit>;
}

export interface UsageEventRepositoryPort {
  createManyIfAbsent(events: Omit<GarmentUsageEvent, "id">[]): Promise<GarmentUsageEvent[]>;
  findByOutfitId(outfitId: EntityId): Promise<GarmentUsageEvent[]>;
}

export interface UnitOfWorkPort {
  transaction<T>(work: (ports: ApplicationPorts) => Promise<T>): Promise<T>;
}

export interface ApplicationPorts {
  households: HouseholdRepositoryPort;
  users: UserRepositoryPort;
  garments: GarmentRepositoryPort;
  outfits: OutfitRepositoryPort;
  usageEvents: UsageEventRepositoryPort;
}
