import { AuthConfig } from "@closet-ai/application";

const DEFAULT_ACCESS_TTL = "15m";
const DEFAULT_REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface ApiAuthConfig extends AuthConfig {
  jwtAccessSecret: string;
  jwtAccessTtl: string;
}

export function getAuthConfig(): ApiAuthConfig {
  return {
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-only-change-me",
    jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? DEFAULT_ACCESS_TTL,
    refreshTokenTtlMs: parseDurationMs(process.env.JWT_REFRESH_TTL, DEFAULT_REFRESH_TTL_MS)
  };
}

function parseDurationMs(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const match = /^(\d+)(ms|s|m|h|d)$/.exec(value.trim());
  if (!match) {
    return fallback;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case "ms":
      return amount;
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    case "d":
      return amount * 24 * 60 * 60 * 1000;
    default:
      return fallback;
  }
}
