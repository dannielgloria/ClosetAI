import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { AuthModule } from "./auth/auth.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { HouseholdsController } from "./interfaces/households.controller.js";
import { GarmentsController } from "./interfaces/garments.controller.js";
import { OutfitsController } from "./interfaces/outfits.controller.js";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [HealthController, HouseholdsController, GarmentsController, OutfitsController]
})
export class AppModule {}
