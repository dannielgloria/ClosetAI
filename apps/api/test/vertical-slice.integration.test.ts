import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Algorithm, hash } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { configureHttpHardening } from "../src/config/http-hardening.js";

interface HouseholdResponse {
  household: { id: string; name: string };
  user: { id: string; householdId: string; displayName: string };
}

interface UserResponse {
  id: string;
  householdId: string;
  displayName: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
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

describe("MVP vertical slice with authentication and PostgreSQL", () => {
  let container: StartedTestContainer;
  let redisContainer: StartedTestContainer;
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
    redisContainer = await new GenericContainer("redis:7-alpine")
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
      .withStartupTimeout(120_000)
      .start();

    const databaseUrl = `postgresql://closet_ai:closet_ai_test_password@${container.getHost()}:${container.getMappedPort(
      5432
    )}/closet_ai_test?schema=public`;
    const redisUrl = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;

    process.env.DATABASE_URL = databaseUrl;
    process.env.REDIS_URL = redisUrl;
    process.env.JWT_ACCESS_SECRET = "test-access-secret";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
    process.env.JWT_ACCESS_TTL = "15m";
    process.env.JWT_REFRESH_TTL = "30d";
    process.env.SETUP_SECRET = "test-setup-secret";
    process.env.AUTH_BOOTSTRAP_RATE_LIMIT_MAX = "100";
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX = "100";
    process.env.AUTH_REFRESH_RATE_LIMIT_MAX = "100";
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
    configureHttpHardening(app);
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
    process.env.AUTH_BOOTSTRAP_RATE_LIMIT_MAX = "100";
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX = "100";
    process.env.AUTH_REFRESH_RATE_LIMIT_MAX = "100";
    process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS = "60";
    process.env.AUTH_REFRESH_RATE_LIMIT_WINDOW_SECONDS = "60";
    await prisma.garmentUsageEvent.deleteMany();
    await prisma.outfitItem.deleteMany();
    await prisma.outfit.deleteMany();
    await prisma.garment.deleteMany();
    await prisma.authSession.deleteMany();
    await prisma.userCredential.deleteMany();
    await prisma.user.deleteMany();
    await prisma.household.deleteMany();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await redisContainer?.stop();
    await container?.stop();
  });

  it("protects bootstrap with setup secret, password policy, and one-time setup", async () => {
    const { user } = await createHousehold("Home", "User A");

    const missingSecret = await request(app.getHttpServer())
      .post("/api/v1/auth/bootstrap-credentials")
      .send({ userId: user.id, email: "user-a@example.com", password: "correct-password" })
      .expect(403);
    expect(missingSecret.headers["x-content-type-options"]).toBe("nosniff");

    await request(app.getHttpServer())
      .post("/api/v1/auth/bootstrap-credentials")
      .set("x-setup-secret", "wrong-secret")
      .send({ userId: user.id, email: "user-a@example.com", password: "correct-password" })
      .expect(403);

    await request(app.getHttpServer())
      .post("/api/v1/auth/bootstrap-credentials")
      .set("x-setup-secret", "test-setup-secret")
      .send({ userId: user.id, email: "user-a@example.com", password: "short" })
      .expect(400);

    await bootstrapCredentials(user.id, "user-a@example.com", "correct-password");

    await request(app.getHttpServer())
      .post("/api/v1/auth/bootstrap-credentials")
      .set("x-setup-secret", "test-setup-secret")
      .send({ userId: user.id, email: "user-b@example.com", password: "correct-password" })
      .expect(403);
  });

  it("returns a generic response for wrong password and nonexistent email", async () => {
    const { user } = await createHousehold("Home", "User A");
    await bootstrapCredentials(user.id, "user-a@example.com", "correct-password");

    const wrongPassword = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "user-a@example.com", password: "wrong-password" })
      .expect(401);

    const nonexistentEmail = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "missing@example.com", password: "wrong-password" })
      .expect(401);

    expect(wrongPassword.body.message).toBe("Invalid credentials.");
    expect(nonexistentEmail.body.message).toBe("Invalid credentials.");
  });

  it("rate limits login and refresh without blocking the whole API", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX = "2";
    process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS = "60";
    process.env.AUTH_REFRESH_RATE_LIMIT_MAX = "1";
    process.env.AUTH_REFRESH_RATE_LIMIT_WINDOW_SECONDS = "60";

    const loginIp = "203.0.113.10";
    await request(app.getHttpServer()).post("/api/v1/auth/login").set("x-forwarded-for", loginIp).send({ email: "missing@example.com", password: "wrong-password" }).expect(401);
    await request(app.getHttpServer()).post("/api/v1/auth/login").set("x-forwarded-for", loginIp).send({ email: "missing@example.com", password: "wrong-password" }).expect(401);
    await request(app.getHttpServer()).post("/api/v1/auth/login").set("x-forwarded-for", loginIp).send({ email: "missing@example.com", password: "wrong-password" }).expect(429);

    const refreshIp = "203.0.113.11";
    await request(app.getHttpServer()).post("/api/v1/auth/refresh").set("x-forwarded-for", refreshIp).send({ refreshToken: "not-a-token" }).expect(401);
    await request(app.getHttpServer()).post("/api/v1/auth/refresh").set("x-forwarded-for", refreshIp).send({ refreshToken: "not-a-token" }).expect(429);

    await request(app.getHttpServer()).get("/api/v1/garments").set(authHeader(auth.accessToken)).expect(200);
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX = "100";
    process.env.AUTH_REFRESH_RATE_LIMIT_MAX = "100";
  });

  it("rate limits bootstrap attempts", async () => {
    const { user } = await createHousehold("Home", "User A");
    process.env.AUTH_BOOTSTRAP_RATE_LIMIT_MAX = "1";
    process.env.AUTH_BOOTSTRAP_RATE_LIMIT_WINDOW_SECONDS = "60";
    const bootstrapIp = "203.0.113.12";

    await request(app.getHttpServer())
      .post("/api/v1/auth/bootstrap-credentials")
      .set("x-forwarded-for", bootstrapIp)
      .set("x-setup-secret", "wrong-secret")
      .send({ userId: user.id, email: "user-a@example.com", password: "correct-password" })
      .expect(403);

    await request(app.getHttpServer())
      .post("/api/v1/auth/bootstrap-credentials")
      .set("x-forwarded-for", bootstrapIp)
      .set("x-setup-secret", "wrong-secret")
      .send({ userId: user.id, email: "user-a@example.com", password: "correct-password" })
      .expect(429);
  });

  it("authenticates, refreshes, rotates refresh tokens, and revokes logout sessions", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");

    await request(app.getHttpServer()).get("/api/v1/auth/me").set(authHeader(auth.accessToken)).expect(200);
    await request(app.getHttpServer()).get("/api/v1/garments").set(authHeader(auth.accessToken)).expect(200);

    const refreshed = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: auth.refreshToken })
      .expect(200)
      .then((response) => {
        expect(response.body).not.toHaveProperty("session");
        return response.body as AuthResponse;
      });

    expect(refreshed.refreshToken).not.toBe(auth.refreshToken);
    await request(app.getHttpServer()).get("/api/v1/auth/me").set(authHeader(refreshed.accessToken)).expect(200);

    await request(app.getHttpServer()).post("/api/v1/auth/refresh").send({ refreshToken: auth.refreshToken }).expect(401);
    await expect(prisma.authSession.findUniqueOrThrow({ where: { id: auth.refreshToken.split(".")[0] } })).resolves.toMatchObject({
      revokedAt: expect.any(Date)
    });

    const freshLogin = await login("user-a@example.com");
    await request(app.getHttpServer()).post("/api/v1/auth/logout").set(authHeader(freshLogin.accessToken)).expect(200);
    await request(app.getHttpServer()).post("/api/v1/auth/refresh").send({ refreshToken: freshLogin.refreshToken }).expect(401);
    await request(app.getHttpServer()).get("/api/v1/auth/me").set(authHeader(freshLogin.accessToken)).expect(401);
  });

  it("provisions credentials for a second existing user in the same household", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    const userB = await createUser(auth.accessToken, auth.user.householdId, "User B");

    const credential = await provisionCredentials(auth.accessToken, userB.id, "USER-B@EXAMPLE.COM", "correct-password");
    expect(credential).toMatchObject({ userId: userB.id, email: "user-b@example.com" });

    const userBAuth = await login("user-b@example.com");
    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set(authHeader(userBAuth.accessToken))
      .expect(200)
      .then((response) => response.body as { user: UserResponse });

    expect(me.user.id).toBe(userB.id);
  });

  it("rejects provisioning credentials for users outside the authenticated household", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    const { user: otherHouseholdUser } = await createHousehold("Other Home", "Other User");

    await request(app.getHttpServer())
      .post(`/api/v1/household/users/${otherHouseholdUser.id}/credentials`)
      .set(authHeader(auth.accessToken))
      .send({ email: "other@example.com", password: "correct-password" })
      .expect(403);
  });

  it("rejects duplicate credential provisioning and duplicate emails", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    const userB = await createUser(auth.accessToken, auth.user.householdId, "User B");

    await provisionCredentials(auth.accessToken, userB.id, "user-b@example.com", "correct-password");
    await request(app.getHttpServer())
      .post(`/api/v1/household/users/${userB.id}/credentials`)
      .set(authHeader(auth.accessToken))
      .send({ email: "user-b-again@example.com", password: "correct-password" })
      .expect(409);

    const userC = await createUser(auth.accessToken, auth.user.householdId, "User C");
    await request(app.getHttpServer())
      .post(`/api/v1/household/users/${userC.id}/credentials`)
      .set(authHeader(auth.accessToken))
      .send({ email: "user-a@example.com", password: "correct-password" })
      .expect(409);
  });

  it("rejects unauthenticated, missing target, and short-password credential provisioning", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    const userB = await createUser(auth.accessToken, auth.user.householdId, "User B");

    await request(app.getHttpServer())
      .post(`/api/v1/household/users/${userB.id}/credentials`)
      .send({ email: "user-b@example.com", password: "correct-password" })
      .expect(401);

    await request(app.getHttpServer())
      .post("/api/v1/household/users/00000000-0000-0000-0000-000000000000/credentials")
      .set(authHeader(auth.accessToken))
      .send({ email: "missing@example.com", password: "correct-password" })
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/v1/household/users/${userB.id}/credentials`)
      .set(authHeader(auth.accessToken))
      .send({ email: "user-b@example.com", password: "short" })
      .expect(400);
  });

  it("creates garments, lists available garments, selects outfit, confirms usage, and persists usage events", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    await createUser(auth.accessToken, auth.user.householdId, "User B");

    const top = await createGarment(auth.accessToken, "TOP", "black", "CLEAN_AVAILABLE", "Black tee");
    const bottom = await createGarment(auth.accessToken, "BOTTOM", "indigo", "WORN_REUSABLE", "Jeans");
    const footwear = await createGarment(auth.accessToken, "FOOTWEAR", "white", "CLEAN_AVAILABLE", "Sneakers");

    const garments = await request(app.getHttpServer())
      .get("/api/v1/garments")
      .set(authHeader(auth.accessToken))
      .expect(200)
      .then((response) => response.body as GarmentResponse[]);

    expect(garments.map((garment) => garment.id).sort()).toEqual([bottom.id, footwear.id, top.id].sort());

    const available = await request(app.getHttpServer())
      .get("/api/v1/garments/available")
      .set(authHeader(auth.accessToken))
      .expect(200)
      .then((response) => response.body as GarmentResponse[]);

    expect(available.map((garment) => garment.id).sort()).toEqual([bottom.id, footwear.id, top.id].sort());

    const outfit = await request(app.getHttpServer())
      .post("/api/v1/outfit-recommendations")
      .set(authHeader(auth.accessToken))
      .send({})
      .expect(201)
      .then((response) => response.body as OutfitResponse);

    expect(outfit.items.map((item) => item.garmentId).sort()).toEqual([bottom.id, footwear.id, top.id].sort());

    const selected = await request(app.getHttpServer())
      .post(`/api/v1/outfits/${outfit.id}/select`)
      .set(authHeader(auth.accessToken))
      .send({})
      .expect(200)
      .then((response) => response.body as OutfitResponse);

    expect(selected.status).toBe("SELECTED");
    await expectWearCount(top.id, 0);

    const confirmed = await request(app.getHttpServer())
      .post(`/api/v1/outfits/${outfit.id}/confirm-usage`)
      .set(authHeader(auth.accessToken))
      .send({ context: { activity: "HOME_OFFICE" } })
      .expect(200)
      .then((response) => response.body as ConfirmUsageResponse);

    expect(confirmed.outfit.status).toBe("WORN");
    expect(confirmed.usageEvents).toHaveLength(3);

    await expectWearCount(top.id, 1);
    await expectWearCount(bottom.id, 1);
    await expectWearCount(footwear.id, 1);
    await expectLastWornAt(top.id);
    await expect(prisma.garmentUsageEvent.count({ where: { outfitId: outfit.id } })).resolves.toBe(3);

    await request(app.getHttpServer())
      .post(`/api/v1/outfits/${outfit.id}/confirm-usage`)
      .set(authHeader(auth.accessToken))
      .send({})
      .expect(200);

    await expect(prisma.garmentUsageEvent.count({ where: { outfitId: outfit.id } })).resolves.toBe(3);
    await expectWearCount(top.id, 1);
  });

  it("does not expose USER_B garments to USER_A", async () => {
    const { auth: userA } = await createAuthenticatedUser("User A", "user-a@example.com");
    const userB = await createUser(userA.accessToken, userA.user.householdId, "User B");
    await seedCredentials(userB.id, "user-b@example.com", "correct-password");
    const userBAuth = await login("user-b@example.com");

    await createGarment(userA.accessToken, "TOP", "black");
    const userBGarment = await createGarment(userBAuth.accessToken, "TOP", "red");

    const garmentsForA = await request(app.getHttpServer())
      .get("/api/v1/garments")
      .set(authHeader(userA.accessToken))
      .expect(200)
      .then((response) => response.body as GarmentResponse[]);

    expect(garmentsForA.map((garment) => garment.id)).not.toContain(userBGarment.id);
  });

  it("rejects outfit selection and usage confirmation across users", async () => {
    const { auth: userA } = await createAuthenticatedUser("User A", "user-a@example.com");
    const userB = await createUser(userA.accessToken, userA.user.householdId, "User B");
    await seedCredentials(userB.id, "user-b@example.com", "correct-password");
    const userBAuth = await login("user-b@example.com");

    await createGarment(userBAuth.accessToken, "TOP", "black");
    await createGarment(userBAuth.accessToken, "BOTTOM", "indigo");
    await createGarment(userBAuth.accessToken, "FOOTWEAR", "white");
    const outfitB = await request(app.getHttpServer())
      .post("/api/v1/outfit-recommendations")
      .set(authHeader(userBAuth.accessToken))
      .send({})
      .expect(201)
      .then((response) => response.body as OutfitResponse);

    await request(app.getHttpServer()).post(`/api/v1/outfits/${outfitB.id}/select`).set(authHeader(userA.accessToken)).send({}).expect(404);
    await request(app.getHttpServer())
      .post(`/api/v1/outfits/${outfitB.id}/confirm-usage`)
      .set(authHeader(userA.accessToken))
      .send({})
      .expect(404);
  });

  it("does not include unavailable garments and rejects invalid usage transitions", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    const unavailableTop = await createGarment(auth.accessToken, "TOP", "red", "LAUNDRY_BIN");
    await createGarment(auth.accessToken, "BOTTOM", "indigo");
    await createGarment(auth.accessToken, "FOOTWEAR", "white");

    const available = await request(app.getHttpServer())
      .get("/api/v1/garments/available")
      .set(authHeader(auth.accessToken))
      .expect(200)
      .then((response) => response.body as GarmentResponse[]);

    expect(available.map((garment) => garment.id)).not.toContain(unavailableTop.id);
    await request(app.getHttpServer()).post("/api/v1/outfit-recommendations").set(authHeader(auth.accessToken)).send({}).expect(400);

    await createGarment(auth.accessToken, "TOP", "black");
    await createGarment(auth.accessToken, "BOTTOM", "blue");
    await createGarment(auth.accessToken, "FOOTWEAR", "white");
    const outfit = await request(app.getHttpServer())
      .post("/api/v1/outfit-recommendations")
      .set(authHeader(auth.accessToken))
      .send({})
      .expect(201)
      .then((response) => response.body as OutfitResponse);

    await request(app.getHttpServer())
      .post(`/api/v1/outfits/${outfit.id}/confirm-usage`)
      .set(authHeader(auth.accessToken))
      .send({})
      .expect(400);

    await request(app.getHttpServer()).post(`/api/v1/outfits/${outfit.id}/select`).set(authHeader(auth.accessToken)).send({}).expect(200);
    const wornGarmentIds = [outfit.items[0].garmentId, outfit.items[2].garmentId];
    const notWornGarmentId = outfit.items[1].garmentId;
    await request(app.getHttpServer())
      .post(`/api/v1/outfits/${outfit.id}/confirm-usage`)
      .set(authHeader(auth.accessToken))
      .send({ wornGarmentIds })
      .expect(200);

    await expectWearCount(wornGarmentIds[0], 1);
    await expectWearCount(wornGarmentIds[1], 1);
    await expectWearCount(notWornGarmentId, 0);
    await expect(prisma.garmentUsageEvent.count({ where: { outfitId: outfit.id } })).resolves.toBe(2);
  });

  async function createHousehold(name: string, initialUserDisplayName: string): Promise<HouseholdResponse> {
    return request(app.getHttpServer())
      .post("/api/v1/households")
      .send({ name, initialUserDisplayName })
      .expect(201)
      .then((response) => response.body as HouseholdResponse);
  }

  async function createUser(accessToken: string, householdId: string, displayName: string): Promise<UserResponse> {
    return request(app.getHttpServer())
      .post(`/api/v1/households/${householdId}/users`)
      .set(authHeader(accessToken))
      .send({ displayName })
      .expect(201)
      .then((response) => response.body as UserResponse);
  }

  async function createAuthenticatedUser(displayName: string, email: string) {
    const { user } = await createHousehold("Home", displayName);
    await bootstrapCredentials(user.id, email, "correct-password");
    return { user, auth: await login(email) };
  }

  async function bootstrapCredentials(userId: string, email: string, password: string) {
    return request(app.getHttpServer())
      .post("/api/v1/auth/bootstrap-credentials")
      .set("x-setup-secret", "test-setup-secret")
      .send({ userId, email, password })
      .expect(201);
  }

  async function login(email: string): Promise<AuthResponse> {
    return request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: "correct-password", devicePlatform: "integration-test" })
      .expect(200)
      .then((response) => {
        expect(response.body).not.toHaveProperty("session");
        return response.body as AuthResponse;
      });
  }

  async function seedCredentials(userId: string, email: string, password: string): Promise<void> {
    await prisma.userCredential.create({
      data: {
        userId,
        email,
        passwordHash: await hash(password, { algorithm: Algorithm.Argon2id })
      }
    });
  }

  async function provisionCredentials(accessToken: string, userId: string, email: string, password: string) {
    return request(app.getHttpServer())
      .post(`/api/v1/household/users/${userId}/credentials`)
      .set(authHeader(accessToken))
      .send({ email, password })
      .expect(201)
      .then((response) => response.body as { id: string; userId: string; email: string });
  }

  async function createGarment(
    accessToken: string,
    category: string,
    primaryColor: string,
    status = "CLEAN_AVAILABLE",
    name?: string
  ): Promise<GarmentResponse> {
    return request(app.getHttpServer())
      .post("/api/v1/garments")
      .set(authHeader(accessToken))
      .send({ category, primaryColor, status, name })
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

function authHeader(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}
