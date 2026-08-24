import { Body, Controller, Get, Headers, HttpCode, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import {
  AuthenticatedUser,
  CreateUserCredentialUseCase,
  GetAuthenticatedUserUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshSessionUseCase
} from "@closet-ai/application";
import { ApplicationPortFactory } from "../prisma/application-port-factory.js";
import { Argon2PasswordHasher } from "./argon2-password-hasher.js";
import { AuthResponseDto, BootstrapCredentialsDto, LoginDto, LogoutResponseDto, MeResponseDto, RefreshDto } from "./auth.dtos.js";
import { getAuthConfig } from "./auth-config.js";
import { JwtAccessTokenService } from "./access-token-service.js";
import { CurrentUser } from "./current-user.decorator.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { SecureRefreshTokenGenerator } from "./refresh-token-generator.js";
import { mapAuthError } from "./auth-errors.js";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly portFactory: ApplicationPortFactory,
    private readonly passwordHasher: Argon2PasswordHasher,
    private readonly refreshTokenGenerator: SecureRefreshTokenGenerator,
    private readonly accessTokenService: JwtAccessTokenService
  ) {}

  @Post("bootstrap-credentials")
  @ApiOperation({ summary: "Attach credentials to an existing private MVP user." })
  @ApiCreatedResponse({ description: "Credentials created." })
  @ApiBadRequestResponse({ description: "Invalid input or user already has credentials." })
  async bootstrapCredentials(@Body() body: BootstrapCredentialsDto) {
    try {
      const credential = await new CreateUserCredentialUseCase(this.portFactory.create(), this.passwordHasher).execute(body);
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
  async login(@Body() body: LoginDto, @Headers("user-agent") userAgent?: string): Promise<AuthResponseDto> {
    try {
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
      mapAuthError(error);
    }
  }

  @Post("refresh")
  @HttpCode(200)
  @ApiOperation({ summary: "Rotate refresh token and issue a new access token." })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: "Invalid, expired, revoked, or reused refresh token." })
  async refresh(@Body() body: RefreshDto): Promise<AuthResponseDto> {
    try {
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
