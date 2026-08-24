import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CreateHouseholdUseCase, CreateUserUseCase } from "@closet-ai/application";
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
  @ApiOperation({ summary: "Create a user in an existing household." })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: "Household not found." })
  @ApiBadRequestResponse({ description: "Invalid request body." })
  async createUser(@Param("householdId") householdId: string, @Body() body: CreateUserDto) {
    try {
      return await new CreateUserUseCase(this.portFactory.create()).execute({
        householdId,
        displayName: body.displayName
      });
    } catch (error) {
      mapUseCaseError(error);
    }
  }
}
