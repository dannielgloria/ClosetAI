import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  ConfirmOutfitUsageUseCase,
  GenerateBasicOutfitUseCase,
  SelectOutfitUseCase
} from "@closet-ai/application";
import { ApplicationPortFactory } from "../prisma/application-port-factory.js";
import { ConfirmOutfitUsageDto, GenerateBasicOutfitDto, UserScopedCommandDto } from "./dtos.js";
import { mapUseCaseError } from "./http-errors.js";

@ApiTags("outfits")
@Controller()
export class OutfitsController {
  constructor(private readonly portFactory: ApplicationPortFactory) {}

  @Post("outfit-recommendations")
  async generateBasicOutfit(@Body() body: GenerateBasicOutfitDto) {
    try {
      return await new GenerateBasicOutfitUseCase(this.portFactory.create()).execute({ userId: body.userId });
    } catch (error) {
      mapUseCaseError(error);
    }
  }

  @Post("outfits/:outfitId/select")
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
  async confirmUsage(@Param("outfitId") outfitId: string, @Body() body: ConfirmOutfitUsageDto) {
    try {
      return await new ConfirmOutfitUsageUseCase(this.portFactory, this.portFactory.create()).execute({
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
