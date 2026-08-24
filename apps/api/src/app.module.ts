import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { AuthModule } from "./auth/auth.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { HouseholdsController } from "./interfaces/households.controller.js";
import { GarmentsController } from "./interfaces/garments.controller.js";
import { GarmentImagesController } from "./interfaces/garment-images.controller.js";
import { MeController } from "./interfaces/me.controller.js";
import { OutfitsController } from "./interfaces/outfits.controller.js";
import { PrivateSetupController } from "./interfaces/private-setup.controller.js";
import { WeatherController } from "./interfaces/weather.controller.js";
import { ContextModule } from "./context/context.module.js";
import { getAiConfig } from "./ai/ai-config.js";
import { AI_CONFIG } from "./ai/openai-responses-client.js";
import { OpenAIOutfitStylistAdapter } from "./outfit-stylist/openai-outfit-stylist.adapter.js";
import { OUTFIT_STYLIST } from "./outfit-stylist/outfit-stylist.provider.js";
import { OpenAIGarmentAnalyzerAdapter } from "./garment-analyzer/openai-garment-analyzer.adapter.js";
import { GARMENT_ANALYZER } from "./garment-analyzer/garment-analyzer.provider.js";
import { LocalObjectStorageAdapter } from "./storage/local-object-storage.adapter.js";
import { OBJECT_STORAGE } from "./storage/object-storage.provider.js";
import { getStorageConfig, STORAGE_CONFIG } from "./storage/storage-config.js";
import { getWeatherRuntimeConfig, WEATHER_CONFIG } from "./weather/weather-config.js";
import { OpenMeteoAdapter } from "./weather/open-meteo.adapter.js";
import { RedisWeatherCacheAdapter } from "./weather/redis-weather-cache.adapter.js";
import { WEATHER_CACHE, WEATHER_PROVIDER } from "./weather/weather.provider.js";

@Module({
  imports: [PrismaModule, AuthModule, ContextModule],
  controllers: [
    HealthController,
    HouseholdsController,
    GarmentsController,
    GarmentImagesController,
    MeController,
    OutfitsController,
    PrivateSetupController,
    WeatherController
  ],
  providers: [
    {
      provide: AI_CONFIG,
      useFactory: getAiConfig
    },
    {
      provide: STORAGE_CONFIG,
      useFactory: getStorageConfig
    },
    {
      provide: WEATHER_CONFIG,
      useFactory: getWeatherRuntimeConfig
    },
    LocalObjectStorageAdapter,
    {
      provide: OBJECT_STORAGE,
      useExisting: LocalObjectStorageAdapter
    },
    OpenAIOutfitStylistAdapter,
    {
      provide: OUTFIT_STYLIST,
      useExisting: OpenAIOutfitStylistAdapter
    },
    OpenAIGarmentAnalyzerAdapter,
    {
      provide: GARMENT_ANALYZER,
      useExisting: OpenAIGarmentAnalyzerAdapter
    },
    OpenMeteoAdapter,
    {
      provide: WEATHER_PROVIDER,
      useExisting: OpenMeteoAdapter
    },
    RedisWeatherCacheAdapter,
    {
      provide: WEATHER_CACHE,
      useExisting: RedisWeatherCacheAdapter
    }
  ]
})
export class AppModule {}
