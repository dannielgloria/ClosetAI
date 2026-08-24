import { Body, Controller, HttpCode, Inject, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import {
  AuthenticatedUser,
  ConfirmOutfitUsageUseCase,
  GenerateOutfitRecommendationsUseCase,
  SelectOutfitUseCase
} from "@closet-ai/application";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ApplicationPortFactory } from "../prisma/application-port-factory.js";
import { OUTFIT_STYLIST, OutfitStylistProvider } from "../outfit-stylist/outfit-stylist.provider.js";
import { ConfirmOutfitUsageDto, ConfirmOutfitUsageResponseDto, GenerateOutfitRecommendationsDto, GenerateOutfitRecommendationsResponseDto, OutfitResponseDto } from "./dtos.js";
import { mapUseCaseError } from "./http-errors.js";

@ApiTags("outfits")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class OutfitsController {
  constructor(
    private readonly portFactory: ApplicationPortFactory,
    @Inject(OUTFIT_STYLIST) private readonly outfitStylist: OutfitStylistProvider
  ) {}

  @Post("outfit-recommendations")
  @ApiOperation({ summary: "Generate context-aware outfit recommendations from eligible garments." })
  @ApiCreatedResponse({ type: GenerateOutfitRecommendationsResponseDto })
  @ApiBadRequestResponse({ description: "Invalid context, insufficient eligible garments, or invalid AI recommendation." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  async generateOutfitRecommendations(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() body: GenerateOutfitRecommendationsDto
  ): Promise<GenerateOutfitRecommendationsResponseDto> {
    try {
      return await new GenerateOutfitRecommendationsUseCase(this.portFactory.create(), this.outfitStylist).execute({
        userId: currentUser.userId,
        context: body.context
      });
    } catch (error) {
      mapUseCaseError(error);
    }
  }

  @Post("outfits/:outfitId/select")
  @HttpCode(200)
  @ApiOperation({ summary: "Select an outfit without recording usage." })
  @ApiOkResponse({ type: OutfitResponseDto })
  @ApiNotFoundResponse({ description: "Outfit not found for the user." })
  @ApiBadRequestResponse({ description: "Invalid transition." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  async selectOutfit(@CurrentUser() currentUser: AuthenticatedUser, @Param("outfitId") outfitId: string) {
    try {
      return await new SelectOutfitUseCase(this.portFactory.create()).execute({
        outfitId,
        userId: currentUser.userId
      });
    } catch (error) {
      mapUseCaseError(error);
    }
  }

  @Post("outfits/:outfitId/confirm-usage")
  @HttpCode(200)
  @ApiOperation({ summary: "Confirm outfit usage idempotently and persist garment usage events." })
  @ApiOkResponse({ type: ConfirmOutfitUsageResponseDto })
  @ApiNotFoundResponse({ description: "Outfit not found for the user." })
  @ApiBadRequestResponse({ description: "Invalid transition or partial garment selection." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  async confirmUsage(@CurrentUser() currentUser: AuthenticatedUser, @Param("outfitId") outfitId: string, @Body() body: ConfirmOutfitUsageDto) {
    try {
      return await new ConfirmOutfitUsageUseCase(this.portFactory).execute({
        outfitId,
        userId: currentUser.userId,
        wornGarmentIds: body.wornGarmentIds,
        context: body.context
      });
    } catch (error) {
      mapUseCaseError(error);
    }
  }
}
