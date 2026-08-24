import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import {
  AuthenticatedUser,
  CreateGarmentUseCase,
  GetGarmentUseCase,
  ListAvailableGarmentsUseCase,
  ListGarmentsUseCase,
  TransitionGarmentStateUseCase,
  UpdateGarmentUseCase
} from "@closet-ai/application";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ApplicationPortFactory } from "../prisma/application-port-factory.js";
import { CreateGarmentDto, GarmentResponseDto, TransitionGarmentStateDto, UpdateGarmentDto } from "./dtos.js";
import { mapUseCaseError } from "./http-errors.js";

@ApiTags("garments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("garments")
export class GarmentsController {
  private readonly logger = new Logger(GarmentsController.name);

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

  @Get(":garmentId")
  @ApiOperation({ summary: "Get garment detail for the authenticated user." })
  @ApiOkResponse({ type: GarmentResponseDto })
  @ApiNotFoundResponse({ description: "Garment not found." })
  @ApiForbiddenResponse({ description: "Garment belongs to a different user." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  async getGarment(@CurrentUser() currentUser: AuthenticatedUser, @Param("garmentId") garmentId: string) {
    try {
      return await new GetGarmentUseCase(this.portFactory.create()).execute({ userId: currentUser.userId, garmentId });
    } catch (error) {
      mapUseCaseError(error);
    }
  }

  @Patch(":garmentId")
  @ApiOperation({ summary: "Update editable garment metadata without changing lifecycle state." })
  @ApiOkResponse({ type: GarmentResponseDto })
  @ApiBadRequestResponse({ description: "Invalid metadata or forbidden field." })
  @ApiNotFoundResponse({ description: "Garment not found." })
  @ApiForbiddenResponse({ description: "Garment belongs to a different user." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  async updateGarment(@CurrentUser() currentUser: AuthenticatedUser, @Param("garmentId") garmentId: string, @Body() body: UpdateGarmentDto) {
    try {
      return await new UpdateGarmentUseCase(this.portFactory.create()).execute({ ...body, userId: currentUser.userId, garmentId });
    } catch (error) {
      mapUseCaseError(error);
    }
  }

  @Post(":garmentId/transitions")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Apply an explicit garment lifecycle transition." })
  @ApiOkResponse({ type: GarmentResponseDto })
  @ApiBadRequestResponse({ description: "Invalid transition." })
  @ApiNotFoundResponse({ description: "Garment not found." })
  @ApiForbiddenResponse({ description: "Garment belongs to a different user." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  async transitionGarment(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("garmentId") garmentId: string,
    @Body() body: TransitionGarmentStateDto
  ) {
    try {
      const result = await new TransitionGarmentStateUseCase(this.portFactory).execute({
        userId: currentUser.userId,
        garmentId,
        transition: body.transition
      });
      this.logger.log(
        JSON.stringify({
          garmentId,
          userId: currentUser.userId,
          transition: body.transition,
          fromState: result.stateTransition.fromStatus,
          toState: result.stateTransition.toStatus
        })
      );
      return result.garment;
    } catch (error) {
      mapUseCaseError(error);
    }
  }
}
