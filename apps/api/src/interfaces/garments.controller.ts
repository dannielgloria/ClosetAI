import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";
import { CreateGarmentUseCase, ListAvailableGarmentsUseCase, ListGarmentsUseCase } from "@closet-ai/application";
import { ApplicationPortFactory } from "../prisma/application-port-factory.js";
import { CreateGarmentDto, GarmentResponseDto } from "./dtos.js";
import { mapUseCaseError } from "./http-errors.js";

@ApiTags("garments")
@Controller("garments")
export class GarmentsController {
  constructor(private readonly portFactory: ApplicationPortFactory) {}

  @Post()
  @ApiOperation({ summary: "Create a garment owned by a user." })
  @ApiCreatedResponse({ type: GarmentResponseDto })
  @ApiBadRequestResponse({ description: "Invalid request body or user not found." })
  async createGarment(@Body() body: CreateGarmentDto) {
    try {
      return await new CreateGarmentUseCase(this.portFactory.create()).execute(body);
    } catch (error) {
      mapUseCaseError(error);
    }
  }

  @Get()
  @ApiOperation({ summary: "List all garments for a user." })
  @ApiQuery({ name: "userId", required: true })
  @ApiOkResponse({ type: [GarmentResponseDto] })
  @ApiBadRequestResponse({ description: "Missing or invalid user id." })
  async listGarments(@Query("userId") userId: string) {
    try {
      return await new ListGarmentsUseCase(this.portFactory.create()).execute({ userId });
    } catch (error) {
      mapUseCaseError(error);
    }
  }

  @Get("available")
  @ApiOperation({ summary: "List garments eligible for outfit generation." })
  @ApiQuery({ name: "userId", required: true })
  @ApiOkResponse({ type: [GarmentResponseDto] })
  @ApiBadRequestResponse({ description: "Missing or invalid user id." })
  async listAvailableGarments(@Query("userId") userId: string) {
    try {
      return await new ListAvailableGarmentsUseCase(this.portFactory.create()).execute({ userId });
    } catch (error) {
      mapUseCaseError(error);
    }
  }
}
