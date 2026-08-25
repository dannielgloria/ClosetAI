import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Algorithm, hash } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";
import {
  ContextInterpreterPort,
  CleanupOrphanGarmentImagesUseCase,
  GarmentAnalysisFailedError,
  GarmentAnalyzerPort,
  GarmentImageBytes,
  GarmentThumbnailGeneratorPort,
  GarmentThumbnailQueuePort,
  GenerateGarmentThumbnailUseCase,
  ObjectStoragePort,
  OutfitStylistFailedError,
  OutfitStylistGarmentCandidate,
  OutfitStylistPort,
  OutfitStylistRecommendationCandidate,
  WeatherCachePort,
  WeatherPort,
  WeatherProviderFailedError
} from "@closet-ai/application";
import {
  ActivityType,
  GarmentCategory,
  GarmentFit,
  GarmentMaterial,
  GarmentPattern,
  GarmentStateTransitionType,
  GarmentSubcategory,
  InterpretedContext,
  WeatherContext
} from "@closet-ai/domain";
import request from "supertest";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { configureHttpHardening } from "../src/config/http-hardening.js";
import { CONTEXT_INTERPRETER } from "../src/context/context-interpreter.provider.js";
import { GARMENT_ANALYZER } from "../src/garment-analyzer/garment-analyzer.provider.js";
import { OUTFIT_STYLIST } from "../src/outfit-stylist/outfit-stylist.provider.js";
import { ApplicationPortFactory } from "../src/prisma/application-port-factory.js";
import { GARMENT_IMAGE_JOBS } from "../src/storage/garment-image-jobs.provider.js";
import { OBJECT_STORAGE } from "../src/storage/object-storage.provider.js";
import { WEATHER_CACHE, WEATHER_PROVIDER } from "../src/weather/weather.provider.js";

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
  secondaryColors: string[];
  subcategory: string | null;
  pattern: string | null;
  fit: string | null;
  estimatedMaterial: string | null;
  formality: number | null;
  status: string;
  imageId?: string;
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

interface OutfitRecommendationsResponse {
  strategy: "AI" | "DETERMINISTIC_FALLBACK";
  weatherStatus: "AVAILABLE" | "UNAVAILABLE" | "NOT_CONFIGURED";
  weather: WeatherContext | null;
  recommendations: OutfitResponse[];
}

interface OutfitFeedbackResponse {
  id: string;
  outfitId: string;
  decision: "ACCEPTED" | "REJECTED";
  reason: string | null;
  createdAt: string;
}

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("MVP vertical slice with authentication and PostgreSQL", () => {
  let container: StartedTestContainer;
  let redisContainer: StartedTestContainer;
  let app: INestApplication;
  let portFactory: ApplicationPortFactory;
  let prisma: PrismaClient;
  let contextInterpreterResult: InterpretedContext | Error;
  let outfitStylistResult: OutfitStylistRecommendationCandidate[] | OutfitStylistFailedError;
  let outfitStylistInput: { context: InterpretedContext; weather?: WeatherContext; garments: OutfitStylistGarmentCandidate[]; maxRecommendations: number } | null;
  let weatherProviderResult: WeatherContext | WeatherProviderFailedError;
  let garmentAnalyzerResult:
    | {
        category: GarmentCategory;
        subcategory: GarmentSubcategory | null;
        primaryColor: string;
        secondaryColors: string[];
        pattern: GarmentPattern | null;
        fit: GarmentFit | null;
        estimatedMaterial: GarmentMaterial | null;
        formality: number | null;
      }
    | GarmentAnalysisFailedError;
  const objectStorage = new IntegrationObjectStorage();
  const weatherCache = new IntegrationWeatherCache();
  const garmentImageJobs = new IntegrationGarmentImageJobs();

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
    process.env.AI_VISION_MODEL = "test-vision-model";
    process.env.GARMENT_IMAGE_MAX_SIZE_MB = "8";
    execFileSync("pnpm", ["prisma", "migrate", "deploy"], {
      cwd: rootDir,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "pipe"
    });

    prisma = new PrismaClient({ datasourceUrl: databaseUrl });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(CONTEXT_INTERPRETER)
      .useValue({
        interpret: async () => {
          if (contextInterpreterResult instanceof Error) {
            throw contextInterpreterResult;
          }

          return contextInterpreterResult;
        }
      } satisfies ContextInterpreterPort)
      .overrideProvider(OUTFIT_STYLIST)
      .useValue({
        recommend: async (input: {
          context: InterpretedContext;
          weather?: WeatherContext;
          garments: OutfitStylistGarmentCandidate[];
          maxRecommendations: number;
        }) => {
          outfitStylistInput = input;
          if (outfitStylistResult instanceof OutfitStylistFailedError) {
            throw outfitStylistResult;
          }

          return outfitStylistResult;
        }
      } satisfies OutfitStylistPort)
      .overrideProvider(WEATHER_PROVIDER)
      .useValue({
        getCurrent: async () => {
          if (weatherProviderResult instanceof WeatherProviderFailedError) {
            throw weatherProviderResult;
          }

          return weatherProviderResult;
        }
      } satisfies WeatherPort)
      .overrideProvider(WEATHER_CACHE)
      .useValue(weatherCache satisfies WeatherCachePort)
      .overrideProvider(GARMENT_ANALYZER)
      .useValue({
        analyze: async () => {
          if (garmentAnalyzerResult instanceof GarmentAnalysisFailedError) {
            throw garmentAnalyzerResult;
          }

          return garmentAnalyzerResult;
        }
      } satisfies GarmentAnalyzerPort)
      .overrideProvider(OBJECT_STORAGE)
      .useValue(objectStorage satisfies ObjectStoragePort)
      .overrideProvider(GARMENT_IMAGE_JOBS)
      .useValue(garmentImageJobs satisfies GarmentThumbnailQueuePort)
      .compile();

    app = moduleRef.createNestApplication();
    portFactory = moduleRef.get(ApplicationPortFactory);
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
    contextInterpreterResult = { activities: [{ type: ActivityType.GYM, time: "17:00" }] };
    outfitStylistResult = [];
    outfitStylistInput = null;
    weatherProviderResult = {
      temperature: 18,
      apparentTemperature: 17,
      minTemperature: 14,
      maxTemperature: 22,
      rainProbability: 45,
      windSpeed: 12,
      humidity: 68
    };
    garmentAnalyzerResult = {
      category: GarmentCategory.TOP,
      subcategory: GarmentSubcategory.T_SHIRT,
      primaryColor: "CREAM",
      secondaryColors: ["BLACK"],
      pattern: GarmentPattern.SOLID,
      fit: GarmentFit.REGULAR,
      estimatedMaterial: GarmentMaterial.COTTON,
      formality: 2
    };
    objectStorage.clear();
    weatherCache.clear();
    garmentImageJobs.clear();
    await prisma.outfitFeedback.deleteMany();
    await prisma.garmentUsageEvent.deleteMany();
    await prisma.outfitItem.deleteMany();
    await prisma.outfit.deleteMany();
    await prisma.garmentStateTransition.deleteMany();
    await prisma.garmentImage.deleteMany();
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
      .then((response) => {
        const body = response.body as OutfitRecommendationsResponse;
        expect(body.strategy).toBe("DETERMINISTIC_FALLBACK");
        return body.recommendations[0]!;
      });

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

  it("uploads, analyzes, confirms, associates, and serves a garment image", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");

    const upload = await uploadImage(auth.accessToken, "image/jpeg");
    expect(garmentImageJobs.jobs).toEqual([{ garmentImageId: upload.id }]);

    const analysis = await request(app.getHttpServer())
      .post(`/api/v1/garment-images/${upload.id}/analyze`)
      .set(authHeader(auth.accessToken))
      .send({})
      .expect(200)
      .then((response) => response.body as Record<string, unknown>);

    expect(analysis).toMatchObject({
      category: "TOP",
      subcategory: "T_SHIRT",
      primaryColor: "CREAM",
      secondaryColors: ["BLACK"],
      pattern: "SOLID",
      fit: "REGULAR",
      estimatedMaterial: "COTTON",
      formality: 2
    });
    await expect(prisma.garment.count()).resolves.toBe(0);

    const garment = await request(app.getHttpServer())
      .post("/api/v1/garments")
      .set(authHeader(auth.accessToken))
      .send({ ...analysis, status: "CLEAN_AVAILABLE", imageId: upload.id, name: "Cream tee" })
      .expect(201)
      .then((response) => response.body as GarmentResponse);

    expect(garment).toMatchObject({
      category: "TOP",
      primaryColor: "CREAM",
      imageId: upload.id,
      subcategory: "T_SHIRT"
    });
    await expect(prisma.garmentImage.findUniqueOrThrow({ where: { id: upload.id } })).resolves.toMatchObject({ garmentId: garment.id });

    const garments = await request(app.getHttpServer())
      .get("/api/v1/garments")
      .set(authHeader(auth.accessToken))
      .expect(200)
      .then((response) => response.body as GarmentResponse[]);
    expect(garments[0]?.imageId).toBe(upload.id);

    await request(app.getHttpServer())
      .get(`/api/v1/garment-images/${upload.id}`)
      .set(authHeader(auth.accessToken))
      .expect(200)
      .expect("content-type", /image\/jpeg/);
  });

  it("generates a thumbnail derivative and serves it through the authorized image endpoint", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    const upload = await uploadImage(auth.accessToken, "image/png");

    const result = await new GenerateGarmentThumbnailUseCase(
      portFactory.create(),
      objectStorage,
      new IntegrationThumbnailGenerator()
    ).execute({ garmentImageId: upload.id });

    expect(result.status).toBe("generated");
    await expect(prisma.garmentImage.findUniqueOrThrow({ where: { id: upload.id } })).resolves.toMatchObject({
      thumbnailObjectKey: `users/${auth.user.id}/garment-images/${upload.id}/thumbnail.webp`
    });

    await request(app.getHttpServer())
      .get(`/api/v1/garment-images/${upload.id}?variant=thumbnail`)
      .set(authHeader(auth.accessToken))
      .expect(200)
      .expect("content-type", /image\/webp/);
  });

  it("falls back to original image bytes when thumbnail is not generated yet", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    const upload = await uploadImage(auth.accessToken, "image/jpeg");

    await request(app.getHttpServer())
      .get(`/api/v1/garment-images/${upload.id}?variant=thumbnail`)
      .set(authHeader(auth.accessToken))
      .expect(200)
      .expect("content-type", /image\/jpeg/);
  });

  it("does not allow another user to fetch a thumbnail", async () => {
    const { auth: userA } = await createAuthenticatedUser("User A", "user-a@example.com");
    const userB = await createUser(userA.accessToken, userA.user.householdId, "User B");
    await seedCredentials(userB.id, "user-b@example.com", "correct-password");
    const userBAuth = await login("user-b@example.com");
    const upload = await uploadImage(userA.accessToken, "image/jpeg");
    await new GenerateGarmentThumbnailUseCase(portFactory.create(), objectStorage, new IntegrationThumbnailGenerator()).execute({
      garmentImageId: upload.id
    });

    await request(app.getHttpServer())
      .get(`/api/v1/garment-images/${upload.id}?variant=thumbnail`)
      .set(authHeader(userBAuth.accessToken))
      .expect(403);
  });

  it("cleans up old orphan garment images and preserves associated images", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    const oldObjectKey = `users/${auth.user.id}/garment-images/orphan.jpg`;
    const oldThumbnailObjectKey = `users/${auth.user.id}/garment-images/orphan/thumbnail.webp`;
    await objectStorage.writeObject({ objectKey: oldObjectKey, content: new Uint8Array([1]), mimeType: "image/jpeg" });
    await objectStorage.writeObject({ objectKey: oldThumbnailObjectKey, content: new Uint8Array([2]), mimeType: "image/webp" });
    const oldOrphan = await prisma.garmentImage.create({
      data: {
        userId: auth.user.id,
        objectKey: oldObjectKey,
        thumbnailObjectKey: oldThumbnailObjectKey,
        mimeType: "image/jpeg",
        size: 1,
        createdAt: new Date("2026-08-20T00:00:00.000Z")
      }
    });
    const associatedUpload = await uploadImage(auth.accessToken, "image/jpeg");
    await request(app.getHttpServer())
      .post("/api/v1/garments")
      .set(authHeader(auth.accessToken))
      .send({ category: "TOP", primaryColor: "black", status: "CLEAN_AVAILABLE", imageId: associatedUpload.id })
      .expect(201);

    const result = await new CleanupOrphanGarmentImagesUseCase(portFactory.create(), objectStorage, {
      gracePeriodHours: 24,
      batchSize: 10
    }).execute({ now: new Date("2026-08-24T00:00:00.000Z") });

    expect(result).toMatchObject({ candidates: 1, deleted: 1, skipped: 0, failed: 0 });
    await expect(prisma.garmentImage.findUnique({ where: { id: oldOrphan.id } })).resolves.toBeNull();
    await expect(objectStorage.objectExists(oldObjectKey)).resolves.toBe(false);
    await expect(objectStorage.objectExists(oldThumbnailObjectKey)).resolves.toBe(false);
    await expect(prisma.garmentImage.findUnique({ where: { id: associatedUpload.id } })).resolves.not.toBeNull();
  });

  it("rejects invalid or unauthenticated garment image uploads", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");

    await request(app.getHttpServer())
      .post("/api/v1/garment-images")
      .attach("image", Buffer.from([1, 2, 3]), { filename: "garment.txt", contentType: "text/plain" })
      .expect(401);

    await request(app.getHttpServer())
      .post("/api/v1/garment-images")
      .set(authHeader(auth.accessToken))
      .attach("image", Buffer.from([1, 2, 3]), { filename: "garment.txt", contentType: "text/plain" })
      .expect(400);
  });

  it("protects garment image ownership and provider failures", async () => {
    const userA = await createAuthenticatedUser("User A", "user-a@example.com");
    const { user: userB } = await createHousehold("Other Home", "User B");
    await seedCredentials(userB.id, "user-b@example.com", "correct-password");
    const userBAuth = await login("user-b@example.com");
    const uploadB = await uploadImage(userBAuth.accessToken, "image/png");

    await request(app.getHttpServer())
      .post(`/api/v1/garment-images/${uploadB.id}/analyze`)
      .set(authHeader(userA.auth.accessToken))
      .send({})
      .expect(403);

    await request(app.getHttpServer()).get(`/api/v1/garment-images/${uploadB.id}`).set(authHeader(userA.auth.accessToken)).expect(403);

    await request(app.getHttpServer())
      .post("/api/v1/garments")
      .set(authHeader(userA.auth.accessToken))
      .send({ category: "TOP", primaryColor: "BLACK", imageId: uploadB.id })
      .expect(403);

    garmentAnalyzerResult = new GarmentAnalysisFailedError();
    const uploadA = await uploadImage(userA.auth.accessToken, "image/webp");
    await request(app.getHttpServer())
      .post(`/api/v1/garment-images/${uploadA.id}/analyze`)
      .set(authHeader(userA.auth.accessToken))
      .send({})
      .expect(503);

    await request(app.getHttpServer())
      .post("/api/v1/garment-images/00000000-0000-0000-0000-000000000000/analyze")
      .set(authHeader(userA.auth.accessToken))
      .send({})
      .expect(404);
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

  it("gets and edits garment metadata without allowing lifecycle fields in PATCH", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    const garment = await createGarment(auth.accessToken, "TOP", "cream", "CLEAN_AVAILABLE", "Cream tee");

    await request(app.getHttpServer())
      .get(`/api/v1/garments/${garment.id}`)
      .set(authHeader(auth.accessToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({ id: garment.id });
      });

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/garments/${garment.id}`)
      .set(authHeader(auth.accessToken))
      .send({ name: "Playera crema oversized", fit: "OVERSIZED", formality: 2, secondaryColors: ["black"] })
      .expect(200)
      .then((response) => response.body as GarmentResponse);

    expect(updated).toMatchObject({
      id: garment.id,
      name: "Playera crema oversized",
      primaryColor: "CREAM",
      secondaryColors: ["BLACK"],
      fit: "OVERSIZED",
      formality: 2,
      status: "CLEAN_AVAILABLE",
      wearCount: 0
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/garments/${garment.id}`)
      .set(authHeader(auth.accessToken))
      .send({ status: "LAUNDRY_BIN" })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/v1/garments/${garment.id}`)
      .set(authHeader(auth.accessToken))
      .send({ wearCount: 99 })
      .expect(400);
  });

  it("protects garment detail, edit, and transition ownership", async () => {
    const { auth: userA } = await createAuthenticatedUser("User A", "user-a@example.com");
    const userB = await createUser(userA.accessToken, userA.user.householdId, "User B");
    await seedCredentials(userB.id, "user-b@example.com", "correct-password");
    const userBAuth = await login("user-b@example.com");
    const garmentB = await createGarment(userBAuth.accessToken, "TOP", "red");

    await request(app.getHttpServer()).get(`/api/v1/garments/${garmentB.id}`).set(authHeader(userA.accessToken)).expect(403);
    await request(app.getHttpServer()).patch(`/api/v1/garments/${garmentB.id}`).set(authHeader(userA.accessToken)).send({ name: "Nope" }).expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/garments/${garmentB.id}/transitions`)
      .set(authHeader(userA.accessToken))
      .send({ transition: "SEND_TO_LAUNDRY" })
      .expect(403);
  });

  it("applies garment lifecycle transitions, persists history, and updates outfit eligibility immediately", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    const top = await createGarment(auth.accessToken, "TOP", "cream");
    const alternateTop = await createGarment(auth.accessToken, "TOP", "black");
    const bottom = await createGarment(auth.accessToken, "BOTTOM", "indigo");
    const footwear = await createGarment(auth.accessToken, "FOOTWEAR", "white");

    await request(app.getHttpServer()).get("/api/v1/garments/available").set(authHeader(auth.accessToken)).expect(200).expect((response) => {
      expect((response.body as GarmentResponse[]).map((garment) => garment.id)).toContain(top.id);
    });

    const dirty = await request(app.getHttpServer())
      .post(`/api/v1/garments/${top.id}/transitions`)
      .set(authHeader(auth.accessToken))
      .send({ transition: "SEND_TO_LAUNDRY" })
      .expect(200)
      .then((response) => response.body as GarmentResponse);
    expect(dirty.status).toBe("LAUNDRY_BIN");
    await expect(prisma.garmentStateTransition.count({ where: { garmentId: top.id } })).resolves.toBe(1);
    await request(app.getHttpServer()).get("/api/v1/garments/available").set(authHeader(auth.accessToken)).expect(200).expect((response) => {
      expect((response.body as GarmentResponse[]).map((garment) => garment.id)).not.toContain(top.id);
    });

    outfitStylistResult = [{ garmentIds: [top.id, bottom.id, footwear.id], score: 80, reason: "Should not be accepted because top is not eligible." }];
    await request(app.getHttpServer())
      .post("/api/v1/outfit-recommendations")
      .set(authHeader(auth.accessToken))
      .send({ context: { activities: [{ type: "CASUAL_DINNER", time: "20:00" }] } })
      .expect(400);
    expect(outfitStylistInput?.garments.map((garment) => garment.id)).not.toContain(top.id);
    expect(outfitStylistInput?.garments.map((garment) => garment.id)).toContain(alternateTop.id);

    const clean = await request(app.getHttpServer())
      .post(`/api/v1/garments/${top.id}/transitions`)
      .set(authHeader(auth.accessToken))
      .send({ transition: "MARK_CLEAN_AVAILABLE" })
      .expect(200)
      .then((response) => response.body as GarmentResponse);
    expect(clean.status).toBe("CLEAN_AVAILABLE");
    await request(app.getHttpServer()).get("/api/v1/garments/available").set(authHeader(auth.accessToken)).expect(200).expect((response) => {
      expect((response.body as GarmentResponse[]).map((garment) => garment.id)).toContain(top.id);
    });
    await expect(prisma.garmentStateTransition.findMany({ where: { garmentId: top.id }, orderBy: { createdAt: "asc" } })).resolves.toMatchObject([
      { fromStatus: "CLEAN_AVAILABLE", toStatus: "LAUNDRY_BIN", transition: "SEND_TO_LAUNDRY" },
      { fromStatus: "LAUNDRY_BIN", toStatus: "CLEAN_AVAILABLE", transition: "MARK_CLEAN_AVAILABLE" }
    ]);
  });

  it("rejects invalid transitions and terminal donated/discarded restores", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    const garment = await createGarment(auth.accessToken, "TOP", "cream");

    await request(app.getHttpServer())
      .post(`/api/v1/garments/${garment.id}/transitions`)
      .set(authHeader(auth.accessToken))
      .send({ transition: "START_WASHING" })
      .expect(400);

    const donated = await request(app.getHttpServer())
      .post(`/api/v1/garments/${garment.id}/transitions`)
      .set(authHeader(auth.accessToken))
      .send({ transition: GarmentStateTransitionType.DONATE })
      .expect(200)
      .then((response) => response.body as GarmentResponse);
    expect(donated.status).toBe("DONATED");
    await request(app.getHttpServer())
      .post(`/api/v1/garments/${garment.id}/transitions`)
      .set(authHeader(auth.accessToken))
      .send({ transition: "RESTORE" })
      .expect(400);
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
      .then((response) => (response.body as OutfitRecommendationsResponse).recommendations[0]!);

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
      .then((response) => (response.body as OutfitRecommendationsResponse).recommendations[0]!);

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

  it("interprets natural language context through an authenticated HTTP endpoint", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    contextInterpreterResult = {
      activities: [
        { type: ActivityType.GYM, time: "17:00" },
        { type: ActivityType.CASUAL_DINNER, time: null }
      ]
    };

    const interpreted = await request(app.getHttpServer())
      .post("/api/v1/context/interpret")
      .set(authHeader(auth.accessToken))
      .send({ text: "Hoy voy al gimnasio a las cinco y despues tengo una cena informal." })
      .expect(200)
      .then((response) => response.body as InterpretedContext);

    expect(interpreted).toEqual(contextInterpreterResult);
  });

  it("rejects unauthenticated and malformed context interpretation requests", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");

    await request(app.getHttpServer())
      .post("/api/v1/context/interpret")
      .send({ text: "Hoy voy al gimnasio." })
      .expect(401);

    await request(app.getHttpServer()).post("/api/v1/context/interpret").set(authHeader(auth.accessToken)).send({ text: "" }).expect(400);
  });

  it("returns a controlled error when context interpretation fails", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    contextInterpreterResult = new Error("provider failed");

    await request(app.getHttpServer())
      .post("/api/v1/context/interpret")
      .set(authHeader(auth.accessToken))
      .send({ text: "Hoy voy al gimnasio." })
      .expect(503);
  });

  it("generates AI-ranked outfit recommendations from structured context and persists outfits", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    const top = await createGarment(auth.accessToken, "TOP", "black", "CLEAN_AVAILABLE", "Black tee");
    const bottom = await createGarment(auth.accessToken, "BOTTOM", "indigo", "CLEAN_AVAILABLE", "Jeans");
    const footwear = await createGarment(auth.accessToken, "FOOTWEAR", "white", "CLEAN_AVAILABLE", "Sneakers");
    outfitStylistResult = [{ garmentIds: [top.id, bottom.id, footwear.id], score: 91, reason: "Good for a casual dinner." }];

    const result = await request(app.getHttpServer())
      .post("/api/v1/outfit-recommendations")
      .set(authHeader(auth.accessToken))
      .send({ context: { activities: [{ type: "CASUAL_DINNER", time: "20:00" }] } })
      .expect(201)
      .then((response) => response.body as OutfitRecommendationsResponse);

    expect(result.strategy).toBe("AI");
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]).toMatchObject({ status: "PRESENTED", score: 91 });
    await expect(prisma.outfit.count({ where: { id: result.recommendations[0]!.id } })).resolves.toBe(1);

    await request(app.getHttpServer()).post(`/api/v1/outfits/${result.recommendations[0]!.id}/select`).set(authHeader(auth.accessToken)).send({}).expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/outfits/${result.recommendations[0]!.id}/confirm-usage`)
      .set(authHeader(auth.accessToken))
      .send({ context: { activity: "CASUAL_DINNER" } })
      .expect(200);
  });

  it("configures location, enriches outfit recommendations with weather, and exposes current weather", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    const top = await createGarment(auth.accessToken, "TOP", "black", "CLEAN_AVAILABLE", "Black tee");
    const bottom = await createGarment(auth.accessToken, "BOTTOM", "indigo", "CLEAN_AVAILABLE", "Jeans");
    const footwear = await createGarment(auth.accessToken, "FOOTWEAR", "white", "CLEAN_AVAILABLE", "Sneakers");
    outfitStylistResult = [{ garmentIds: [top.id, bottom.id, footwear.id], score: 91, reason: "Good for cool dinner weather." }];

    await request(app.getHttpServer())
      .patch("/api/v1/me/location")
      .set(authHeader(auth.accessToken))
      .send({ city: "Ciudad de Mexico", latitude: 19.4326, longitude: -99.1332, timezone: "America/Mexico_City" })
      .expect(200);

    await request(app.getHttpServer()).get("/api/v1/weather/current").set(authHeader(auth.accessToken)).expect(200).expect((response) => {
      expect(response.body).toMatchObject({ temperature: 18, rainProbability: 45 });
    });

    const result = await request(app.getHttpServer())
      .post("/api/v1/outfit-recommendations")
      .set(authHeader(auth.accessToken))
      .send({ context: { activities: [{ type: "CASUAL_DINNER", time: "20:00" }] } })
      .expect(201)
      .then((response) => response.body as OutfitRecommendationsResponse);

    expect(result.weatherStatus).toBe("AVAILABLE");
    expect(result.weather).toMatchObject({ temperature: 18, rainProbability: 45 });
    expect(outfitStylistInput?.weather).toMatchObject({ temperature: 18, rainProbability: 45 });
  });

  it("continues outfit recommendation when weather provider fails", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    const top = await createGarment(auth.accessToken, "TOP", "black");
    const bottom = await createGarment(auth.accessToken, "BOTTOM", "indigo");
    const footwear = await createGarment(auth.accessToken, "FOOTWEAR", "white");
    outfitStylistResult = [{ garmentIds: [top.id, bottom.id, footwear.id], score: 84, reason: "Valid without weather." }];
    weatherProviderResult = new WeatherProviderFailedError();
    await request(app.getHttpServer())
      .patch("/api/v1/me/location")
      .set(authHeader(auth.accessToken))
      .send({ city: "Ciudad de Mexico", latitude: 19.4326, longitude: -99.1332, timezone: "America/Mexico_City" })
      .expect(200);

    const result = await request(app.getHttpServer())
      .post("/api/v1/outfit-recommendations")
      .set(authHeader(auth.accessToken))
      .send({ context: { activities: [{ type: "CASUAL_DINNER", time: "20:00" }] } })
      .expect(201)
      .then((response) => response.body as OutfitRecommendationsResponse);

    expect(result.strategy).toBe("AI");
    expect(result.weatherStatus).toBe("UNAVAILABLE");
    expect(result.weather).toBeNull();
    expect(outfitStylistInput?.weather).toBeUndefined();
  });

  it("keeps outfit recommendation available when user has no location", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    const top = await createGarment(auth.accessToken, "TOP", "black");
    const bottom = await createGarment(auth.accessToken, "BOTTOM", "indigo");
    const footwear = await createGarment(auth.accessToken, "FOOTWEAR", "white");
    outfitStylistResult = [{ garmentIds: [top.id, bottom.id, footwear.id], score: 82, reason: "Valid without configured weather." }];

    await request(app.getHttpServer()).get("/api/v1/weather/current").set(authHeader(auth.accessToken)).expect(404);

    const result = await request(app.getHttpServer())
      .post("/api/v1/outfit-recommendations")
      .set(authHeader(auth.accessToken))
      .send({ context: { activities: [{ type: "CASUAL_DINNER", time: "20:00" }] } })
      .expect(201)
      .then((response) => response.body as OutfitRecommendationsResponse);

    expect(result.weatherStatus).toBe("NOT_CONFIGURED");
    expect(result.weather).toBeNull();
  });

  it("does not allow clients to modify another user's location", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    await request(app.getHttpServer())
      .patch("/api/v1/me/location")
      .set(authHeader(auth.accessToken))
      .send({ city: "Ciudad de Mexico", latitude: 19.4326, longitude: -99.1332, timezone: "America/Mexico_City", userId: "other" })
      .expect(400);
  });

  it("rejects AI recommendations with invalid garment IDs", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    await createGarment(auth.accessToken, "TOP", "black");
    await createGarment(auth.accessToken, "BOTTOM", "indigo");
    await createGarment(auth.accessToken, "FOOTWEAR", "white");
    outfitStylistResult = [{ garmentIds: ["00000000-0000-0000-0000-000000000000"], score: 80, reason: "Invalid." }];

    await request(app.getHttpServer())
      .post("/api/v1/outfit-recommendations")
      .set(authHeader(auth.accessToken))
      .send({ context: { activities: [{ type: "CASUAL_DINNER", time: "20:00" }] } })
      .expect(400);
  });

  it("falls back deterministically when the AI stylist fails", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    await createGarment(auth.accessToken, "TOP", "black");
    await createGarment(auth.accessToken, "BOTTOM", "indigo");
    await createGarment(auth.accessToken, "FOOTWEAR", "white");
    outfitStylistResult = new OutfitStylistFailedError();

    const result = await request(app.getHttpServer())
      .post("/api/v1/outfit-recommendations")
      .set(authHeader(auth.accessToken))
      .send({ context: { activities: [{ type: "CASUAL_DINNER", time: "20:00" }] } })
      .expect(201)
      .then((response) => response.body as OutfitRecommendationsResponse);

    expect(result.strategy).toBe("DETERMINISTIC_FALLBACK");
    expect(result.recommendations[0]?.items).toHaveLength(3);
  });

  it("rejects unauthenticated outfit recommendations before invoking AI", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/outfit-recommendations")
      .send({ context: { activities: [{ type: "CASUAL_DINNER", time: "20:00" }] } })
      .expect(401);
  });

  it("persists accepted outfit feedback without changing outfit state", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    const outfit = await createDeterministicOutfit(auth.accessToken);

    const feedback = await request(app.getHttpServer())
      .post(`/api/v1/outfits/${outfit.id}/feedback`)
      .set(authHeader(auth.accessToken))
      .send({ decision: "ACCEPTED" })
      .expect(201)
      .then((response) => response.body as OutfitFeedbackResponse);

    expect(feedback).toMatchObject({ outfitId: outfit.id, decision: "ACCEPTED", reason: null });
    await expect(prisma.outfitFeedback.count({ where: { outfitId: outfit.id } })).resolves.toBe(1);
    await expect(prisma.outfit.findUniqueOrThrow({ where: { id: outfit.id } })).resolves.toMatchObject({ status: outfit.status });
  });

  it("persists rejected outfit feedback with optional reason", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    const outfit = await createDeterministicOutfit(auth.accessToken);

    const feedback = await request(app.getHttpServer())
      .post(`/api/v1/outfits/${outfit.id}/feedback`)
      .set(authHeader(auth.accessToken))
      .send({ decision: "REJECTED", reason: "Too formal" })
      .expect(201)
      .then((response) => response.body as OutfitFeedbackResponse);

    expect(feedback).toMatchObject({ outfitId: outfit.id, decision: "REJECTED", reason: "Too formal" });
    await expect(prisma.outfitFeedback.findUniqueOrThrow({ where: { id: feedback.id } })).resolves.toMatchObject({ reason: "Too formal" });
  });

  it("rejects invalid outfit feedback requests", async () => {
    const { auth } = await createAuthenticatedUser("User A", "user-a@example.com");
    const outfit = await createDeterministicOutfit(auth.accessToken);

    await request(app.getHttpServer())
      .post(`/api/v1/outfits/${outfit.id}/feedback`)
      .send({ decision: "ACCEPTED" })
      .expect(401);

    await request(app.getHttpServer())
      .post(`/api/v1/outfits/${outfit.id}/feedback`)
      .set(authHeader(auth.accessToken))
      .send({ decision: "MAYBE" })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/v1/outfits/${outfit.id}/feedback`)
      .set(authHeader(auth.accessToken))
      .send({ decision: "REJECTED", reason: "x".repeat(501) })
      .expect(400);

    await request(app.getHttpServer())
      .post("/api/v1/outfits/00000000-0000-0000-0000-000000000000/feedback")
      .set(authHeader(auth.accessToken))
      .send({ decision: "ACCEPTED" })
      .expect(404);
  });

  it("rejects feedback for another user's outfit", async () => {
    const { auth: userA } = await createAuthenticatedUser("User A", "user-a@example.com");
    const userB = await createUser(userA.accessToken, userA.user.householdId, "User B");
    await seedCredentials(userB.id, "user-b@example.com", "correct-password");
    const userBAuth = await login("user-b@example.com");
    const outfitB = await createDeterministicOutfit(userBAuth.accessToken);

    await request(app.getHttpServer())
      .post(`/api/v1/outfits/${outfitB.id}/feedback`)
      .set(authHeader(userA.accessToken))
      .send({ decision: "ACCEPTED" })
      .expect(403);
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

  async function uploadImage(accessToken: string, mimeType: "image/jpeg" | "image/png" | "image/webp") {
    const extension = mimeType.split("/")[1];
    return request(app.getHttpServer())
      .post("/api/v1/garment-images")
      .set(authHeader(accessToken))
      .attach("image", Buffer.from([1, 2, 3]), { filename: `garment.${extension}`, contentType: mimeType })
      .expect(201)
      .then((response) => response.body as { id: string; status: "UPLOADED" });
  }

  async function createDeterministicOutfit(accessToken: string): Promise<OutfitResponse> {
    await createGarment(accessToken, "TOP", "black");
    await createGarment(accessToken, "BOTTOM", "indigo");
    await createGarment(accessToken, "FOOTWEAR", "white");

    return request(app.getHttpServer())
      .post("/api/v1/outfit-recommendations")
      .set(authHeader(accessToken))
      .send({})
      .expect(201)
      .then((response) => (response.body as OutfitRecommendationsResponse).recommendations[0]!);
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

class IntegrationObjectStorage implements ObjectStoragePort {
  private readonly objects = new Map<string, { data: Uint8Array; mimeType: string }>();

  clear(): void {
    this.objects.clear();
  }

  async storeGarmentImage(input: { userId: string; content: Uint8Array; mimeType: string }) {
    const objectKey = `users/${input.userId}/garment-images/${this.objects.size + 1}`;
    await this.writeObject({ objectKey, content: input.content, mimeType: input.mimeType });
    return { objectKey };
  }

  async writeObject(input: { objectKey: string; content: Uint8Array; mimeType: string }): Promise<void> {
    this.objects.set(input.objectKey, { data: input.content, mimeType: input.mimeType });
  }

  async readObject(objectKey: string) {
    const object = this.objects.get(objectKey);
    if (!object) {
      throw new Error("Object not found.");
    }

    return object;
  }

  async objectExists(objectKey: string): Promise<boolean> {
    return this.objects.has(objectKey);
  }

  async deleteObject(objectKey: string): Promise<void> {
    this.objects.delete(objectKey);
  }
}

class IntegrationGarmentImageJobs implements GarmentThumbnailQueuePort {
  readonly jobs: { garmentImageId: string }[] = [];

  clear(): void {
    this.jobs.length = 0;
  }

  async enqueueThumbnailGeneration(input: { garmentImageId: string }): Promise<void> {
    this.jobs.push(input);
  }
}

class IntegrationThumbnailGenerator implements GarmentThumbnailGeneratorPort {
  async generate(): Promise<GarmentImageBytes> {
    return {
      data: new Uint8Array([9, 9, 9]),
      mimeType: "image/webp"
    };
  }
}

class IntegrationWeatherCache implements WeatherCachePort {
  private readonly rows = new Map<string, WeatherContext>();

  clear(): void {
    this.rows.clear();
  }

  async get(key: string): Promise<WeatherContext | null> {
    return this.rows.get(key) ?? null;
  }

  async set(key: string, value: WeatherContext): Promise<void> {
    this.rows.set(key, value);
  }
}
