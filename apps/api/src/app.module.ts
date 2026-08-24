import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { AuthModule } from "./auth/auth.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { HouseholdsController } from "./interfaces/households.controller.js";
import { GarmentsController } from "./interfaces/garments.controller.js";
import { OutfitsController } from "./interfaces/outfits.controller.js";
import { PrivateSetupController } from "./interfaces/private-setup.controller.js";
import { ContextModule } from "./context/context.module.js";
import { getAiConfig } from "./ai/ai-config.js";
import { AI_CONFIG } from "./ai/openai-responses-client.js";
import { OpenAIOutfitStylistAdapter } from "./outfit-stylist/openai-outfit-stylist.adapter.js";
import { OUTFIT_STYLIST } from "./outfit-stylist/outfit-stylist.provider.js";

@Module({
  imports: [PrismaModule, AuthModule, ContextModule],
  controllers: [HealthController, HouseholdsController, GarmentsController, OutfitsController, PrivateSetupController],
  providers: [
    {
      provide: AI_CONFIG,
      useFactory: getAiConfig
    },
    OpenAIOutfitStylistAdapter,
    {
      provide: OUTFIT_STYLIST,
      useExisting: OpenAIOutfitStylistAdapter
    }
  ]
})
export class AppModule {}
