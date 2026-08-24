import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

interface HouseholdResponse {
  household: { id: string; name: string };
  user: { id: string; householdId: string; displayName: string };
}

interface UserResponse {
  id: string;
  householdId: string;
  displayName: string;
}

interface GarmentResponse {
  id: string;
  userId: string;
  category: string;
  primaryColor: string;
  status: string;
  wearCount: number;
  lastWornAt: string | null;
}

interface OutfitResponse {
  id: string;
  userId: string;
  status: string;
  items: { garmentId: string; position: number }[];
}

interface ConfirmUsageResponse {
  outfit: OutfitResponse;
  usageEvents: { id: string; garmentId: string; outfitId: string; wornAt: string }[];
}

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("MVP vertical slice with PostgreSQL", () => {
  let container: StartedTestContainer;
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    container = await new GenericContainer("postgres:16-alpine")
      .withEnvironment({
        POSTGRES_USER: "closet_ai",
        POSTGRES_PASSWORD: "closet_ai_test_password",
        POSTGRES_DB: "closet_ai_test"
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/))
      .withStartupTimeout(120_000)
      .start();

    const databaseUrl = `postgresql://closet_ai:closet_ai_test_password@${container.getHost()}:${container.getMappedPort(
      5432
    )}/closet_ai_test?schema=public`;

    process.env.DATABASE_URL = databaseUrl;
    execFileSync("pnpm", ["prisma", "migrate", "deploy"], {
      cwd: rootDir,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "pipe"
    });

    prisma = new PrismaClient({ datasourceUrl: databaseUrl });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
      })
    );
    await app.init();
  }, 120_000);

  beforeEach(async () => {
    await prisma.garmentUsageEvent.deleteMany();
    await prisma.outfitItem.deleteMany();
    await prisma.outfit.deleteMany();
    await prisma.garment.deleteMany();
    await prisma.user.deleteMany();
    await prisma.household.deleteMany();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await container?.stop();
  });

  it("creates household, user, garments, outfit selection, usage, and persisted usage events", async () => {
    const { user } = await createHousehold("Home", "User A");
    await createUser(user.householdId, "User B");

    const top = await createGarment(user.id, "TOP", "black", "CLEAN_AVAILABLE", "Black tee");
    const bottom = await createGarment(user.id, "BOTTOM", "indigo", "WORN_REUSABLE", "Jeans");
    const footwear = await createGarment(user.id, "FOOTWEAR", "white", "CLEAN_AVAILABLE", "Sneakers");

    const garments = await request(app.getHttpServer())
      .get("/api/v1/garments")
      .query({ userId: user.id })
      .expect(200)
      .then((response) => response.body as GarmentResponse[]);

    expect(garments.map((garment) => garment.id).sort()).toEqual([bottom.id, footwear.id, top.id].sort());

    const available = await request(app.getHttpServer())
      .get("/api/v1/garments/available")
      .query({ userId: user.id })
      .expect(200)
      .then((response) => response.body as GarmentResponse[]);

    expect(available.map((garment) => garment.id).sort()).toEqual([bottom.id, footwear.id, top.id].sort());

    const outfit = await request(app.getHttpServer())
      .post("/api/v1/outfit-recommendations")
      .send({ userId: user.id })
      .expect(201)
      .then((response) => response.body as OutfitResponse);

    expect(outfit.items.map((item) => item.garmentId).sort()).toEqual([bottom.id, footwear.id, top.id].sort());

    const selected = await request(app.getHttpServer())
      .post(`/api/v1/outfits/${outfit.id}/select`)
      .send({ userId: user.id })
      .expect(200)
      .then((response) => response.body as OutfitResponse);

    expect(selected.status).toBe("SELECTED");
    await expectWearCount(top.id, 0);

    const confirmed = await request(app.getHttpServer())
      .post(`/api/v1/outfits/${outfit.id}/confirm-usage`)
      .send({ userId: user.id, context: { activity: "HOME_OFFICE" } })
      .expect(200)
      .then((response) => response.body as ConfirmUsageResponse);

    expect(confirmed.outfit.status).toBe("WORN");
    expect(confirmed.usageEvents).toHaveLength(3);

    await expectWearCount(top.id, 1);
    await expectWearCount(bottom.id, 1);
    await expectWearCount(footwear.id, 1);
    await expectLastWornAt(top.id);
    await expect(prisma.garmentUsageEvent.count({ where: { outfitId: outfit.id } })).resolves.toBe(3);

    await request(app.getHttpServer()).post(`/api/v1/outfits/${outfit.id}/confirm-usage`).send({ userId: user.id }).expect(200);

    await expect(prisma.garmentUsageEvent.count({ where: { outfitId: outfit.id } })).resolves.toBe(3);
    await expectWearCount(top.id, 1);
  });

  it("does not use USER_A garments when USER_B requests an outfit", async () => {
    const { user: userA } = await createHousehold("Home", "User A");
    const userB = await createUser(userA.householdId, "User B");
    await createGarment(userA.id, "TOP", "black");
    await createGarment(userA.id, "BOTTOM", "indigo");
    await createGarment(userA.id, "FOOTWEAR", "white");

    await request(app.getHttpServer()).post("/api/v1/outfit-recommendations").send({ userId: userB.id }).expect(400);
    await expect(prisma.outfit.count({ where: { userId: userB.id } })).resolves.toBe(0);
  });

  it("does not include unavailable garments in generated outfits", async () => {
    const { user } = await createHousehold("Home", "User A");
    const unavailableTop = await createGarment(user.id, "TOP", "red", "LAUNDRY_BIN");
    await createGarment(user.id, "BOTTOM", "indigo");
    await createGarment(user.id, "FOOTWEAR", "white");

    const available = await request(app.getHttpServer())
      .get("/api/v1/garments/available")
      .query({ userId: user.id })
      .expect(200)
      .then((response) => response.body as GarmentResponse[]);

    expect(available.map((garment) => garment.id)).not.toContain(unavailableTop.id);
    await request(app.getHttpServer()).post("/api/v1/outfit-recommendations").send({ userId: user.id }).expect(400);
  });

  it("partial usage confirmation only affects garments actually worn", async () => {
    const { user } = await createHousehold("Home", "User A");
    const top = await createGarment(user.id, "TOP", "black");
    const bottom = await createGarment(user.id, "BOTTOM", "indigo");
    const footwear = await createGarment(user.id, "FOOTWEAR", "white");
    const outfit = await request(app.getHttpServer())
      .post("/api/v1/outfit-recommendations")
      .send({ userId: user.id })
      .expect(201)
      .then((response) => response.body as OutfitResponse);

    await request(app.getHttpServer()).post(`/api/v1/outfits/${outfit.id}/select`).send({ userId: user.id }).expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/outfits/${outfit.id}/confirm-usage`)
      .send({ userId: user.id, wornGarmentIds: [top.id, footwear.id] })
      .expect(200);

    await expectWearCount(top.id, 1);
    await expectWearCount(footwear.id, 1);
    await expectWearCount(bottom.id, 0);
    await expect(prisma.garmentUsageEvent.count({ where: { outfitId: outfit.id } })).resolves.toBe(2);
  });

  it("rejects invalid usage transition before outfit selection", async () => {
    const { user } = await createHousehold("Home", "User A");
    await createGarment(user.id, "TOP", "black");
    await createGarment(user.id, "BOTTOM", "indigo");
    await createGarment(user.id, "FOOTWEAR", "white");
    const outfit = await request(app.getHttpServer())
      .post("/api/v1/outfit-recommendations")
      .send({ userId: user.id })
      .expect(201)
      .then((response) => response.body as OutfitResponse);

    await request(app.getHttpServer()).post(`/api/v1/outfits/${outfit.id}/confirm-usage`).send({ userId: user.id }).expect(400);
    await expect(prisma.garmentUsageEvent.count({ where: { outfitId: outfit.id } })).resolves.toBe(0);
  });

  async function createHousehold(name: string, initialUserDisplayName: string): Promise<HouseholdResponse> {
    return request(app.getHttpServer())
      .post("/api/v1/households")
      .send({ name, initialUserDisplayName })
      .expect(201)
      .then((response) => response.body as HouseholdResponse);
  }

  async function createUser(householdId: string, displayName: string): Promise<UserResponse> {
    return request(app.getHttpServer())
      .post(`/api/v1/households/${householdId}/users`)
      .send({ displayName })
      .expect(201)
      .then((response) => response.body as UserResponse);
  }

  async function createGarment(
    userId: string,
    category: string,
    primaryColor: string,
    status = "CLEAN_AVAILABLE",
    name?: string
  ): Promise<GarmentResponse> {
    return request(app.getHttpServer())
      .post("/api/v1/garments")
      .send({ userId, category, primaryColor, status, name })
      .expect(201)
      .then((response) => response.body as GarmentResponse);
  }

  async function expectWearCount(garmentId: string, wearCount: number): Promise<void> {
    await expect(prisma.garment.findUniqueOrThrow({ where: { id: garmentId } })).resolves.toMatchObject({ wearCount });
  }

  async function expectLastWornAt(garmentId: string): Promise<void> {
    const garment = await prisma.garment.findUniqueOrThrow({ where: { id: garmentId } });
    expect(garment.lastWornAt).toBeInstanceOf(Date);
  }
});
