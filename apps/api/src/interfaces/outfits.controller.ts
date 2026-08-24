import { Body, Controller, HttpCode, Param, Post } from "@nestjs/common";
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  ConfirmOutfitUsageUseCase,
  GenerateBasicOutfitUseCase,
  SelectOutfitUseCase
} from "@closet-ai/application";
import { ApplicationPortFactory } from "../prisma/application-port-factory.js";
import {
  ConfirmOutfitUsageDto,
  ConfirmOutfitUsageResponseDto,
  GenerateBasicOutfitDto,
  OutfitResponseDto,
  UserScopedCommandDto
} from "./dtos.js";
import { mapUseCaseError } from "./http-errors.js";

@ApiTags("outfits")
@Controller()
export class OutfitsController {
  constructor(private readonly portFactory: ApplicationPortFactory) {}

  @Post("outfit-recommendations")
  @ApiOperation({ summary: "Generate a basic deterministic outfit without AI." })
  @ApiCreatedResponse({ type: OutfitResponseDto })
  @ApiBadRequestResponse({ description: "Not enough eligible garments or invalid user." })
  async generateBasicOutfit(@Body() body: GenerateBasicOutfitDto) {
    try {
      return await new GenerateBasicOutfitUseCase(this.portFactory.create()).execute({ userId: body.userId });
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
  async selectOutfit(@Param("outfitId") outfitId: string, @Body() body: UserScopedCommandDto) {
    try {
      return await new SelectOutfitUseCase(this.portFactory.create()).execute({
        outfitId,
        userId: body.userId
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
  async confirmUsage(@Param("outfitId") outfitId: string, @Body() body: ConfirmOutfitUsageDto) {
    try {
      return await new ConfirmOutfitUsageUseCase(this.portFactory).execute({
        outfitId,
        userId: body.userId,
        wornGarmentIds: body.wornGarmentIds,
        context: body.context
      });
    } catch (error) {
      mapUseCaseError(error);
    }
  }
}
