import { Body, Controller, Get, Headers, HttpCode, Logger, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import {
  AuthenticatedUser,
  BootstrapUserCredentialUseCase,
  GetAuthenticatedUserUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshSessionUseCase
} from "@closet-ai/application";
import { Request } from "express";
import { ApplicationPortFactory } from "../prisma/application-port-factory.js";
import { Argon2PasswordHasher } from "./argon2-password-hasher.js";
import { AuthResponseDto, BootstrapCredentialsDto, LoginDto, LogoutResponseDto, MeResponseDto, RefreshDto } from "./auth.dtos.js";
import { getAuthConfig } from "./auth-config.js";
import { AuthRateLimiter } from "./auth-rate-limiter.js";
import { JwtAccessTokenService } from "./access-token-service.js";
import { CurrentUser } from "./current-user.decorator.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { SecureRefreshTokenGenerator } from "./refresh-token-generator.js";
import { mapAuthError } from "./auth-errors.js";
import { assertValidSetupSecret } from "./setup-secret.js";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly portFactory: ApplicationPortFactory,
    private readonly passwordHasher: Argon2PasswordHasher,
    private readonly rateLimiter: AuthRateLimiter,
    private readonly refreshTokenGenerator: SecureRefreshTokenGenerator,
    private readonly accessTokenService: JwtAccessTokenService
  ) {}

  @Post("bootstrap-credentials")
  @ApiOperation({ summary: "Attach credentials to an existing private MVP user." })
  @ApiHeader({ name: "x-setup-secret", required: true, description: "Private setup secret." })
  @ApiCreatedResponse({ description: "Credentials created." })
  @ApiBadRequestResponse({ description: "Invalid input or user already has credentials." })
  @ApiForbiddenResponse({ description: "Missing or invalid setup secret." })
  @ApiTooManyRequestsResponse({ description: "Too many bootstrap attempts." })
  async bootstrapCredentials(@Req() request: Request, @Headers("x-setup-secret") setupSecret: string | undefined, @Body() body: BootstrapCredentialsDto) {
    try {
      await this.rateLimiter.consume("bootstrap", rateLimitIdentifier(request));
      assertValidSetupSecret(setupSecret, getAuthConfig().setupSecret);
      const credential = await new BootstrapUserCredentialUseCase(this.portFactory.create(), this.passwordHasher).execute(body);
      return { id: credential.id, userId: credential.userId, email: credential.email };
    } catch (error) {
      mapAuthError(error);
    }
  }

  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Login with email and password." })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: "Invalid email or password." })
  @ApiTooManyRequestsResponse({ description: "Too many login attempts." })
  async login(@Req() request: Request, @Body() body: LoginDto, @Headers("user-agent") userAgent?: string): Promise<AuthResponseDto> {
    try {
      await this.rateLimiter.consume("login", rateLimitIdentifier(request));
      const result = await new LoginUseCase(
        this.portFactory.create(),
        this.passwordHasher,
        this.refreshTokenGenerator,
        this.accessTokenService,
        getAuthConfig()
      ).execute({ ...body, userAgent });
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user
      };
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid email or password.") {
        this.logger.warn("Login rejected: invalid credentials.");
      }
      mapAuthError(error);
    }
  }

  @Post("refresh")
  @HttpCode(200)
  @ApiOperation({ summary: "Rotate refresh token and issue a new access token." })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: "Invalid, expired, revoked, or reused refresh token." })
  @ApiTooManyRequestsResponse({ description: "Too many refresh attempts." })
  async refresh(@Req() request: Request, @Body() body: RefreshDto): Promise<AuthResponseDto> {
    try {
      await this.rateLimiter.consume("refresh", rateLimitIdentifier(request));
      const result = await new RefreshSessionUseCase(
        this.portFactory,
        this.passwordHasher,
        this.refreshTokenGenerator,
        this.accessTokenService
      ).execute(body);
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user
      };
    } catch (error) {
      mapAuthError(error);
    }
  }

  @Post("logout")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke the current authenticated session." })
  @ApiOkResponse({ type: LogoutResponseDto })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  async logout(@CurrentUser() currentUser: AuthenticatedUser): Promise<LogoutResponseDto> {
    try {
      await new LogoutUseCase(this.portFactory.create()).execute({ sessionId: currentUser.sessionId });
      return { revoked: true };
    } catch (error) {
      mapAuthError(error);
    }
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Return the authenticated user." })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  async me(@CurrentUser() currentUser: AuthenticatedUser): Promise<MeResponseDto> {
    try {
      const { user } = await new GetAuthenticatedUserUseCase(this.portFactory.create()).execute({
        userId: currentUser.userId,
        sessionId: currentUser.sessionId
      });
      return { user };
    } catch (error) {
      mapAuthError(error);
    }
  }
}

function rateLimitIdentifier(request: Request): string {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim().length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.ip || request.socket.remoteAddress || "unknown";
}
