import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { AuthenticatedUser, CreateGarmentUseCase, ListAvailableGarmentsUseCase, ListGarmentsUseCase } from "@closet-ai/application";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ApplicationPortFactory } from "../prisma/application-port-factory.js";
import { CreateGarmentDto, GarmentResponseDto } from "./dtos.js";
import { mapUseCaseError } from "./http-errors.js";

@ApiTags("garments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("garments")
export class GarmentsController {
  constructor(private readonly portFactory: ApplicationPortFactory) {}

  @Post()
  @ApiOperation({ summary: "Create a garment owned by a user." })
  @ApiCreatedResponse({ type: GarmentResponseDto })
  @ApiBadRequestResponse({ description: "Invalid request body or user not found." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  async createGarment(@CurrentUser() currentUser: AuthenticatedUser, @Body() body: CreateGarmentDto) {
    try {
      return await new CreateGarmentUseCase(this.portFactory).execute({ ...body, userId: currentUser.userId });
    } catch (error) {
      mapUseCaseError(error);
    }
  }

  @Get()
  @ApiOperation({ summary: "List all garments for a user." })
  @ApiOkResponse({ type: [GarmentResponseDto] })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  async listGarments(@CurrentUser() currentUser: AuthenticatedUser) {
    try {
      return await new ListGarmentsUseCase(this.portFactory.create()).execute({ userId: currentUser.userId });
    } catch (error) {
      mapUseCaseError(error);
    }
  }

  @Get("available")
  @ApiOperation({ summary: "List garments eligible for outfit generation." })
  @ApiOkResponse({ type: [GarmentResponseDto] })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  async listAvailableGarments(@CurrentUser() currentUser: AuthenticatedUser) {
    try {
      return await new ListAvailableGarmentsUseCase(this.portFactory.create()).execute({ userId: currentUser.userId });
    } catch (error) {
      mapUseCaseError(error);
    }
  }
}
