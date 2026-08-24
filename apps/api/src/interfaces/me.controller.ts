import { Body, Controller, Patch, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { AuthenticatedUser, getUserLocation, UpdateUserLocationUseCase } from "@closet-ai/application";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ApplicationPortFactory } from "../prisma/application-port-factory.js";
import { UpdateUserLocationDto, UserLocationResponseDto } from "./dtos.js";
import { mapUseCaseError } from "./http-errors.js";

@ApiTags("me")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("me")
export class MeController {
  constructor(private readonly portFactory: ApplicationPortFactory) {}

  @Patch("location")
  @ApiOperation({ summary: "Configure approximate weather location for the authenticated user." })
  @ApiOkResponse({ type: UserLocationResponseDto })
  @ApiBadRequestResponse({ description: "Invalid location." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  async updateLocation(@CurrentUser() currentUser: AuthenticatedUser, @Body() body: UpdateUserLocationDto): Promise<UserLocationResponseDto> {
    try {
      const user = await new UpdateUserLocationUseCase(this.portFactory.create()).execute({
        userId: currentUser.userId,
        location: body
      });
      const location = getUserLocation(user);
      if (!location) {
        throw new Error("User location not configured.");
      }

      return location;
    } catch (error) {
      mapUseCaseError(error);
    }
  }
}
