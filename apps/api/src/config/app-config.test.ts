import { afterEach, describe, expect, it } from "vitest";
import { getRuntimeConfig, validateProductionConfig } from "./app-config.js";

describe("runtime configuration", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("fails fast in production when required secrets are missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.SETUP_SECRET;
    delete process.env.DATABASE_PASSWORD;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_CONTEXT_MODEL;
    delete process.env.AI_OUTFIT_MODEL;

    expect(() => validateProductionConfig()).toThrow("Missing or insecure production configuration");
  });

  it("rejects wildcard CORS in production", () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://closet_ai:strong-password@postgres:5432/closet_ai";
    process.env.DATABASE_PASSWORD = "strong-password";
    process.env.JWT_ACCESS_SECRET = "strong-access-secret";
    process.env.JWT_REFRESH_SECRET = "strong-refresh-secret";
    process.env.SETUP_SECRET = "strong-setup-secret";
    process.env.OPENAI_API_KEY = "strong-openai-key";
    process.env.AI_CONTEXT_MODEL = "gpt-example";
    process.env.AI_OUTFIT_MODEL = "gpt-example";
    process.env.CORS_ALLOWED_ORIGINS = "*";

    expect(() => validateProductionConfig()).toThrow("Production requires explicit CORS_ALLOWED_ORIGINS");
  });

  it("accepts explicit production secrets and CORS origins", () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://closet_ai:strong-password@postgres:5432/closet_ai";
    process.env.DATABASE_PASSWORD = "strong-password";
    process.env.JWT_ACCESS_SECRET = "strong-access-secret";
    process.env.JWT_REFRESH_SECRET = "strong-refresh-secret";
    process.env.SETUP_SECRET = "strong-setup-secret";
    process.env.OPENAI_API_KEY = "strong-openai-key";
    process.env.AI_CONTEXT_MODEL = "gpt-example";
    process.env.AI_OUTFIT_MODEL = "gpt-example";
    process.env.CORS_ALLOWED_ORIGINS = "https://closet.example";

    expect(() => validateProductionConfig()).not.toThrow();
    expect(getRuntimeConfig().corsAllowedOrigins).toEqual(["https://closet.example"]);
  });
});
