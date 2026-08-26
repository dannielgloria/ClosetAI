const INSECURE_PRODUCTION_VALUES = new Set([
  "",
  "secret123",
  "changeme",
  "development-secret",
  "dev-only-change-me",
  "replace-with-openai-api-key-when-enabled",
  "replace-with-openai-context-model",
  "replace-with-openai-outfit-model",
  "replace-when-ai-is-enabled"
]);

export interface RuntimeConfig {
  environment: "local" | "production" | "test";
  port: number;
  corsAllowedOrigins: string[];
  jsonPayloadLimit: string;
  trustProxyHops: number;
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    environment: getEnvironment(),
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    corsAllowedOrigins: parseCsv(process.env.CORS_ALLOWED_ORIGINS),
    jsonPayloadLimit: process.env.JSON_PAYLOAD_LIMIT ?? "1mb",
    trustProxyHops: readNonNegativeInteger("TRUST_PROXY_HOPS", 0)
  };
}

export function validateProductionConfig(): void {
  if (getEnvironment() !== "production") {
    return;
  }

  const required = [
    "DATABASE_URL",
    "DATABASE_PASSWORD",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "SETUP_SECRET",
    "OPENAI_API_KEY",
    "AI_CONTEXT_MODEL",
    "AI_OUTFIT_MODEL",
    "AI_VISION_MODEL"
  ];
  const missingOrInsecure = required.filter((name) => {
    const value = process.env[name]?.trim() ?? "";
    return INSECURE_PRODUCTION_VALUES.has(value);
  });

  if (missingOrInsecure.length > 0) {
    throw new Error(`Missing or insecure production configuration: ${missingOrInsecure.join(", ")}`);
  }

  const corsOrigins = parseCsv(process.env.CORS_ALLOWED_ORIGINS);
  if (corsOrigins.length === 0 || corsOrigins.includes("*")) {
    throw new Error("Production requires explicit CORS_ALLOWED_ORIGINS and cannot use '*'.");
  }
}

export function applySecurityHeaders(response: { setHeader(name: string, value: string): void }): void {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
}

function getEnvironment(): RuntimeConfig["environment"] {
  if (process.env.NODE_ENV === "production") {
    return "production";
  }

  if (process.env.NODE_ENV === "test") {
    return "test";
  }

  return "local";
}

function parseCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readNonNegativeInteger(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}
