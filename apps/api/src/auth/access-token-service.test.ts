import { afterEach, describe, expect, it } from "vitest";
import { JwtAccessTokenService } from "./access-token-service.js";

describe("JwtAccessTokenService", () => {
  const originalSecret = process.env.JWT_ACCESS_SECRET;
  const originalTtl = process.env.JWT_ACCESS_TTL;

  afterEach(() => {
    process.env.JWT_ACCESS_SECRET = originalSecret;
    process.env.JWT_ACCESS_TTL = originalTtl;
  });

  it("issues and verifies a valid access token", () => {
    process.env.JWT_ACCESS_SECRET = "unit-test-secret";
    process.env.JWT_ACCESS_TTL = "15m";

    const service = new JwtAccessTokenService();
    const accessToken = service.issueAccessToken({
      userId: "user-1",
      householdId: "household-1",
      sessionId: "session-1"
    });

    expect(service.verifyAccessToken(accessToken)).toEqual({
      userId: "user-1",
      householdId: "household-1",
      sessionId: "session-1"
    });
  });
});
