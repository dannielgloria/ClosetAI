import { Controller, Get, Inject, NotFoundException, ServiceUnavailableException, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";
import { AuthenticatedUser, GetWeatherContextUseCase, WeatherProviderFailedError } from "@closet-ai/application";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ApplicationPortFactory } from "../prisma/application-port-factory.js";
import { WEATHER_CACHE, WeatherCacheProvider, WEATHER_PROVIDER, WeatherProvider } from "../weather/weather.provider.js";
import { WEATHER_CONFIG, WeatherRuntimeConfig } from "../weather/weather-config.js";
import { WeatherContextResponseDto } from "./dtos.js";
import { mapUseCaseError } from "./http-errors.js";

@ApiTags("weather")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("weather")
export class WeatherController {
  constructor(
    private readonly portFactory: ApplicationPortFactory,
    @Inject(WEATHER_PROVIDER) private readonly weatherProvider: WeatherProvider,
    @Inject(WEATHER_CACHE) private readonly weatherCache: WeatherCacheProvider,
    @Inject(WEATHER_CONFIG) private readonly weatherConfig: WeatherRuntimeConfig
  ) {}

  @Get("current")
  @ApiOperation({ summary: "Return normalized current weather for the authenticated user's configured location." })
  @ApiOkResponse({ type: WeatherContextResponseDto })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or revoked access token." })
  @ApiNotFoundResponse({ description: "User location is not configured." })
  @ApiServiceUnavailableResponse({ description: "Weather provider unavailable." })
  async current(@CurrentUser() currentUser: AuthenticatedUser): Promise<WeatherContextResponseDto> {
    try {
      return await new GetWeatherContextUseCase(this.portFactory.create(), this.weatherProvider, this.weatherCache, this.weatherConfig).execute({
        userId: currentUser.userId
      });
    } catch (error) {
      if (error instanceof Error && error.message === "User location not configured.") {
        throw new NotFoundException(error.message);
      }

      if (error instanceof WeatherProviderFailedError) {
        throw new ServiceUnavailableException("Weather provider unavailable.");
      }

      mapUseCaseError(error);
    }
  }
}
