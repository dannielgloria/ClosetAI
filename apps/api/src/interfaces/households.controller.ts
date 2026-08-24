import { Body, Controller, ForbiddenException, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { AuthenticatedUser, CreateHouseholdUseCase, CreateUserUseCase } from "@closet-ai/application";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ApplicationPortFactory } from "../prisma/application-port-factory.js";
import { CreateHouseholdDto, CreateHouseholdResponseDto, CreateUserDto, UserResponseDto } from "./dtos.js";
import { mapUseCaseError } from "./http-errors.js";

@ApiTags("households")
@Controller("households")
export class HouseholdsController {
  constructor(private readonly portFactory: ApplicationPortFactory) {}

  @Post()
  @ApiOperation({ summary: "Create a household with its initial user." })
  @ApiCreatedResponse({ type: CreateHouseholdResponseDto })
  @ApiBadRequestResponse({ description: "Invalid request body." })
  async createHousehold(@Body() body: CreateHouseholdDto) {
    try {
      return await new CreateHouseholdUseCase(this.portFactory.create()).execute(body);
    } catch (error) {
      mapUseCaseError(error);
    }
  }

  @Post(":householdId/users")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a user in an existing household." })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: "Household not found." })
  @ApiBadRequestResponse({ description: "Invalid request body." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  @ApiForbiddenResponse({ description: "Authenticated user cannot create users in another household." })
  async createUser(@CurrentUser() currentUser: AuthenticatedUser, @Param("householdId") householdId: string, @Body() body: CreateUserDto) {
    try {
      if (currentUser.householdId !== householdId) {
        throw new ForbiddenException("Cannot create users outside authenticated household.");
      }

      return await new CreateUserUseCase(this.portFactory.create()).execute({
        householdId,
        displayName: body.displayName
      });
    } catch (error) {
      mapUseCaseError(error);
    }
  }
}
