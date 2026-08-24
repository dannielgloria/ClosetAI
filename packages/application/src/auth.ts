import { AuthSession, ClosetUser, EntityId, UserCredential } from "@closet-ai/domain";
import { ApplicationPorts, UnitOfWorkPort } from "./ports.js";

export interface AuthenticatedUser {
  userId: EntityId;
  householdId: EntityId;
  sessionId: EntityId;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: ClosetUser;
  session: AuthSession;
}

export interface PasswordHasherPort {
  hashPassword(password: string): Promise<string>;
  verifyPassword(hash: string, password: string): Promise<boolean>;
}

export interface RefreshTokenGeneratorPort {
  generate(sessionId: EntityId): string;
  parseSessionId(refreshToken: string): EntityId | null;
}

export interface AccessTokenIssuerPort {
  issueAccessToken(input: { userId: EntityId; householdId: EntityId; sessionId: EntityId }): string;
}

export interface AuthConfig {
  refreshTokenTtlMs: number;
}

export interface CreateCredentialInput {
  userId: EntityId;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
  deviceName?: string;
  devicePlatform?: string;
  userAgent?: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface LogoutInput {
  sessionId: EntityId;
}

const MIN_PASSWORD_LENGTH = 10;

export class CreateUserCredentialUseCase {
  constructor(
    private readonly ports: ApplicationPorts,
    private readonly passwordHasher: PasswordHasherPort
  ) {}

  async execute(input: CreateCredentialInput): Promise<UserCredential> {
    const user = await this.ports.users.findById(input.userId);
    if (!user) {
      throw new Error("User not found.");
    }

    const email = normalizeEmail(input.email);
    assertPasswordPolicy(input.password);
    const existing = await this.ports.userCredentials.findByUserId(input.userId);
    if (existing) {
      throw new Error("User already has credentials.");
    }

    const passwordHash = await this.passwordHasher.hashPassword(input.password);
    return this.ports.userCredentials.create({ userId: input.userId, email, passwordHash });
  }
}

export class BootstrapUserCredentialUseCase {
  constructor(
    private readonly ports: ApplicationPorts,
    private readonly passwordHasher: PasswordHasherPort
  ) {}

  async execute(input: CreateCredentialInput): Promise<UserCredential> {
    const credentialCount = await this.ports.userCredentials.count();
    if (credentialCount > 0) {
      throw new Error("Credential bootstrap is disabled.");
    }

    return new CreateUserCredentialUseCase(this.ports, this.passwordHasher).execute(input);
  }
}

export class LoginUseCase {
  constructor(
    private readonly ports: ApplicationPorts,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly refreshTokenGenerator: RefreshTokenGeneratorPort,
    private readonly accessTokenIssuer: AccessTokenIssuerPort,
    private readonly config: AuthConfig
  ) {}

  async execute(input: LoginInput): Promise<AuthResult> {
    const credential = await this.ports.userCredentials.findByEmail(normalizeEmail(input.email));
    if (!credential) {
      throw new Error("Invalid email or password.");
    }

    const passwordMatches = await this.passwordHasher.verifyPassword(credential.passwordHash, input.password);
    if (!passwordMatches) {
      throw new Error("Invalid email or password.");
    }

    const user = await this.ports.users.findById(credential.userId);
    if (!user) {
      throw new Error("User not found.");
    }

    const expiresAt = new Date(Date.now() + this.config.refreshTokenTtlMs);
    const session = await this.ports.authSessions.create({
      userId: user.id,
      refreshTokenHash: "pending",
      expiresAt,
      deviceName: input.deviceName,
      devicePlatform: input.devicePlatform,
      userAgent: input.userAgent
    });
    const refreshToken = this.refreshTokenGenerator.generate(session.id);
    const refreshTokenHash = await this.passwordHasher.hashPassword(refreshToken);
    const savedSession = await this.ports.authSessions.save({ ...session, refreshTokenHash });

    return {
      user,
      session: savedSession,
      accessToken: this.accessTokenIssuer.issueAccessToken({
        userId: user.id,
        householdId: user.householdId,
        sessionId: savedSession.id
      }),
      refreshToken
    };
  }
}

export class RefreshSessionUseCase {
  constructor(
    private readonly unitOfWork: UnitOfWorkPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly refreshTokenGenerator: RefreshTokenGeneratorPort,
    private readonly accessTokenIssuer: AccessTokenIssuerPort
  ) {}

  async execute(input: RefreshInput): Promise<AuthResult> {
    const sessionId = this.refreshTokenGenerator.parseSessionId(input.refreshToken);
    if (!sessionId) {
      throw new Error("Invalid refresh token.");
    }

    const result = await this.unitOfWork.transaction<AuthResult | { error: string }>(async (ports) => {
      const session = await ports.authSessions.findById(sessionId);
      if (!session) {
        return { error: "Session not found." };
      }

      if (session.revokedAt) {
        return { error: "Session revoked." };
      }

      if (session.expiresAt.getTime() <= Date.now()) {
        await ports.authSessions.save({ ...session, revokedAt: new Date() });
        return { error: "Refresh token expired." };
      }

      const tokenMatches = await this.passwordHasher.verifyPassword(session.refreshTokenHash, input.refreshToken);
      if (!tokenMatches) {
        await ports.authSessions.save({ ...session, revokedAt: new Date() });
        return { error: "Refresh token reuse detected." };
      }

      const user = await ports.users.findById(session.userId);
      if (!user) {
        throw new Error("User not found.");
      }

      const refreshToken = this.refreshTokenGenerator.generate(session.id);
      const refreshTokenHash = await this.passwordHasher.hashPassword(refreshToken);
      const savedSession = await ports.authSessions.save({
        ...session,
        refreshTokenHash,
        lastUsedAt: new Date()
      });

      return {
        user,
        session: savedSession,
        accessToken: this.accessTokenIssuer.issueAccessToken({
          userId: user.id,
          householdId: user.householdId,
          sessionId: savedSession.id
        }),
        refreshToken
      };
    });

    if ("error" in result) {
      throw new Error(result.error);
    }

    return result;
  }
}

export class LogoutUseCase {
  constructor(private readonly ports: ApplicationPorts) {}

  async execute(input: LogoutInput): Promise<AuthSession> {
    const session = await this.ports.authSessions.findById(input.sessionId);
    if (!session) {
      throw new Error("Session not found.");
    }

    if (session.revokedAt) {
      return session;
    }

    return this.ports.authSessions.save({ ...session, revokedAt: new Date() });
  }
}

export class GetAuthenticatedUserUseCase {
  constructor(private readonly ports: ApplicationPorts) {}

  async execute(input: { userId: EntityId; sessionId: EntityId }): Promise<{ user: ClosetUser; session: AuthSession }> {
    const session = await this.ports.authSessions.findById(input.sessionId);
    if (!session || session.userId !== input.userId || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new Error("Session not found.");
    }

    const user = await this.ports.users.findById(input.userId);
    if (!user) {
      throw new Error("User not found.");
    }

    return { user, session };
  }
}

export class ListAuthSessionMaintenanceCandidatesUseCase {
  constructor(private readonly ports: ApplicationPorts) {}

  async execute(input: { now: Date } = { now: new Date() }): Promise<{ expired: AuthSession[]; revoked: AuthSession[] }> {
    const [expired, revoked] = await Promise.all([this.ports.authSessions.findExpired(input.now), this.ports.authSessions.findRevoked()]);
    return { expired, revoked };
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function assertPasswordPolicy(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error("Password must be at least 10 characters.");
  }
}
