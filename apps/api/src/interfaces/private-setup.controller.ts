import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { AuthenticatedUser, ProvisionUserCredentialsUseCase } from "@closet-ai/application";
import { CredentialResponseDto, ProvisionUserCredentialsDto } from "../auth/auth.dtos.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { mapAuthError } from "../auth/auth-errors.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { Argon2PasswordHasher } from "../auth/argon2-password-hasher.js";
import { ApplicationPortFactory } from "../prisma/application-port-factory.js";

@ApiTags("household")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("household/users")
export class PrivateSetupController {
  constructor(
    private readonly portFactory: ApplicationPortFactory,
    private readonly passwordHasher: Argon2PasswordHasher
  ) {}

  @Post(":userId/credentials")
  @ApiOperation({ summary: "Provision credentials for an existing user in the authenticated household." })
  @ApiCreatedResponse({ type: CredentialResponseDto })
  @ApiBadRequestResponse({ description: "Invalid request body." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  @ApiForbiddenResponse({ description: "Target user belongs to another household." })
  @ApiNotFoundResponse({ description: "Target user not found." })
  @ApiConflictResponse({ description: "Target user already has credentials or email is already used." })
  async provisionCredentials(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("userId") targetUserId: string,
    @Body() body: ProvisionUserCredentialsDto
  ): Promise<CredentialResponseDto> {
    try {
      const credential = await new ProvisionUserCredentialsUseCase(this.portFactory.create(), this.passwordHasher).execute({
        actorUserId: currentUser.userId,
        targetUserId,
        email: body.email,
        password: body.password
      });
      return { id: credential.id, userId: credential.userId, email: credential.email };
    } catch (error) {
      mapAuthError(error);
    }
  }
}
