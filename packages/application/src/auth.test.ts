import { beforeEach, describe, expect, it } from "vitest";
import { AuthSession, ClosetUser, UserCredential } from "@closet-ai/domain";
import { ApplicationPorts, UnitOfWorkPort } from "./ports.js";
import {
  AccessTokenIssuerPort,
  CreateUserCredentialUseCase,
  GetAuthenticatedUserUseCase,
  LoginUseCase,
  LogoutUseCase,
  PasswordHasherPort,
  RefreshSessionUseCase,
  RefreshTokenGeneratorPort
} from "./auth.js";

class FakePasswordHasher implements PasswordHasherPort {
  async hashPassword(password: string): Promise<string> {
    return `hash:${password}`;
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    return hash === `hash:${password}`;
  }
}

class FakeRefreshTokenGenerator implements RefreshTokenGeneratorPort {
  private nextValue = 1;

  generate(sessionId: string): string {
    return `${sessionId}.refresh-${this.nextValue++}`;
  }

  parseSessionId(refreshToken: string): string | null {
    return refreshToken.includes(".") ? refreshToken.split(".")[0] : null;
  }
}

class FakeAccessTokenIssuer implements AccessTokenIssuerPort {
  issueAccessToken(input: { userId: string; householdId: string; sessionId: string }): string {
    return `access:${input.userId}:${input.householdId}:${input.sessionId}`;
  }
}

class AuthPorts implements ApplicationPorts, UnitOfWorkPort {
  households = {
    createWithInitialUser: async () => {
      throw new Error("not implemented");
    },
    findById: async () => null
  };
  users = {
    create: async () => {
      throw new Error("not implemented");
    },
    findById: async (id: string) => this.usersById.get(id) ?? null
  };
  userCredentials = {
    create: async (input: { userId: string; email: string; passwordHash: string }) => {
      const now = new Date("2026-08-24T00:00:00.000Z");
      const credential: UserCredential = { id: `credential-${this.credentialsById.size + 1}`, createdAt: now, updatedAt: now, ...input };
      this.credentialsById.set(credential.id, credential);
      return credential;
    },
    findByEmail: async (email: string) => [...this.credentialsById.values()].find((row) => row.email === email) ?? null,
    findByUserId: async (userId: string) => [...this.credentialsById.values()].find((row) => row.userId === userId) ?? null
  };
  authSessions = {
    create: async (input: {
      userId: string;
      refreshTokenHash: string;
      expiresAt: Date;
      deviceName?: string;
      devicePlatform?: string;
      userAgent?: string;
    }) => {
      const session: AuthSession = {
        id: `session-${this.sessionsById.size + 1}`,
        createdAt: new Date("2026-08-24T00:00:00.000Z"),
        lastUsedAt: null,
        revokedAt: null,
        ...input
      };
      this.sessionsById.set(session.id, session);
      return session;
    },
    findById: async (id: string) => this.sessionsById.get(id) ?? null,
    save: async (session: AuthSession) => {
      this.sessionsById.set(session.id, session);
      return session;
    }
  };
  garments = {
    create: async () => {
      throw new Error("not implemented");
    },
    findByUserId: async () => [],
    findAvailableByUserId: async () => [],
    findByIds: async () => [],
    save: async () => {
      throw new Error("not implemented");
    }
  };
  outfits = {
    create: async () => {
      throw new Error("not implemented");
    },
    findById: async () => null,
    save: async () => {
      throw new Error("not implemented");
    }
  };
  usageEvents = {
    createManyIfAbsent: async () => [],
    findByOutfitId: async () => []
  };

  usersById = new Map<string, ClosetUser>();
  credentialsById = new Map<string, UserCredential>();
  sessionsById = new Map<string, AuthSession>();

  transaction<T>(work: (ports: ApplicationPorts) => Promise<T>): Promise<T> {
    return work(this);
  }
}

describe("Authentication use cases", () => {
  let ports: AuthPorts;
  let hasher: FakePasswordHasher;
  let refreshTokens: FakeRefreshTokenGenerator;
  let accessTokens: FakeAccessTokenIssuer;

  beforeEach(() => {
    ports = new AuthPorts();
    hasher = new FakePasswordHasher();
    refreshTokens = new FakeRefreshTokenGenerator();
    accessTokens = new FakeAccessTokenIssuer();
    ports.usersById.set("user-1", {
      id: "user-1",
      householdId: "household-1",
      displayName: "Dann",
      createdAt: new Date("2026-08-24T00:00:00.000Z")
    });
  });

  it("creates credentials with a password hash", async () => {
    const credential = await new CreateUserCredentialUseCase(ports, hasher).execute({
      userId: "user-1",
      email: "DANN@EXAMPLE.COM ",
      password: "correct-password"
    });

    expect(credential.email).toBe("dann@example.com");
    expect(credential.passwordHash).toBe("hash:correct-password");
  });

  it("logs in with the correct password", async () => {
    await createCredential();

    const result = await login("correct-password");

    expect(result.user.id).toBe("user-1");
    expect(result.accessToken).toBe(`access:user-1:household-1:${result.session.id}`);
    expect(result.refreshToken).toBe(`${result.session.id}.refresh-1`);
  });

  it("rejects an incorrect password", async () => {
    await createCredential();

    await expect(login("wrong-password")).rejects.toThrow("Invalid email or password.");
  });

  it("validates an active authenticated session", async () => {
    await createCredential();
    const result = await login("correct-password");

    await expect(
      new GetAuthenticatedUserUseCase(ports).execute({ userId: "user-1", sessionId: result.session.id })
    ).resolves.toMatchObject({ user: { id: "user-1" } });
  });

  it("rejects a nonexistent session", async () => {
    await expect(new GetAuthenticatedUserUseCase(ports).execute({ userId: "user-1", sessionId: "missing" })).rejects.toThrow(
      "Session not found."
    );
  });

  it("rejects a revoked session", async () => {
    await createCredential();
    const result = await login("correct-password");
    await new LogoutUseCase(ports).execute({ sessionId: result.session.id });

    await expect(
      new GetAuthenticatedUserUseCase(ports).execute({ userId: "user-1", sessionId: result.session.id })
    ).rejects.toThrow("Session not found.");
  });

  it("refreshes and rotates a valid refresh token", async () => {
    await createCredential();
    const result = await login("correct-password");

    const refreshed = await refresh(result.refreshToken);

    expect(refreshed.refreshToken).toBe(`${result.session.id}.refresh-2`);
    expect(refreshed.accessToken).toBe(`access:user-1:household-1:${result.session.id}`);
    expect(ports.sessionsById.get(result.session.id)?.lastUsedAt).toBeInstanceOf(Date);
  });

  it("rejects an expired refresh token and revokes the session", async () => {
    await createCredential();
    const result = await login("correct-password");
    const session = ports.sessionsById.get(result.session.id);
    expect(session).toBeDefined();
    ports.sessionsById.set(result.session.id, { ...session!, expiresAt: new Date(Date.now() - 1_000) });

    await expect(refresh(result.refreshToken)).rejects.toThrow("Refresh token expired.");
    expect(ports.sessionsById.get(result.session.id)?.revokedAt).toBeInstanceOf(Date);
  });

  it("rejects an invalid refresh token", async () => {
    await expect(refresh("not-a-token")).rejects.toThrow("Invalid refresh token.");
  });

  it("detects refresh token reuse and revokes the session", async () => {
    await createCredential();
    const result = await login("correct-password");
    await refresh(result.refreshToken);

    await expect(refresh(result.refreshToken)).rejects.toThrow("Refresh token reuse detected.");
    expect(ports.sessionsById.get(result.session.id)?.revokedAt).toBeInstanceOf(Date);
  });

  it("logs out idempotently and rejects access afterward", async () => {
    await createCredential();
    const result = await login("correct-password");

    await new LogoutUseCase(ports).execute({ sessionId: result.session.id });
    await new LogoutUseCase(ports).execute({ sessionId: result.session.id });

    expect(ports.sessionsById.get(result.session.id)?.revokedAt).toBeInstanceOf(Date);
    await expect(
      new GetAuthenticatedUserUseCase(ports).execute({ userId: "user-1", sessionId: result.session.id })
    ).rejects.toThrow("Session not found.");
  });

  async function createCredential() {
    return new CreateUserCredentialUseCase(ports, hasher).execute({
      userId: "user-1",
      email: "dann@example.com",
      password: "correct-password"
    });
  }

  async function login(password: string) {
    return new LoginUseCase(ports, hasher, refreshTokens, accessTokens, { refreshTokenTtlMs: 60_000 }).execute({
      email: "dann@example.com",
      password
    });
  }

  async function refresh(refreshToken: string) {
    return new RefreshSessionUseCase(ports, hasher, refreshTokens, accessTokens).execute({ refreshToken });
  }
});
