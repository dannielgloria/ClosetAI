import { EntityId, parseWeatherContext, UserLocation, WeatherContext } from "@closet-ai/domain";
import { ApplicationPorts, WeatherCachePort, WeatherPort } from "./ports.js";

export const DEFAULT_WEATHER_CACHE_TTL_SECONDS = 20 * 60;

export enum WeatherStatus {
  AVAILABLE = "AVAILABLE",
  UNAVAILABLE = "UNAVAILABLE",
  NOT_CONFIGURED = "NOT_CONFIGURED"
}

export interface WeatherConfig {
  cacheTtlSeconds: number;
}

export class WeatherProviderFailedError extends Error {
  constructor(message = "Weather provider failed.") {
    super(message);
    this.name = "WeatherProviderFailedError";
  }
}

export class GetWeatherContextUseCase {
  constructor(
    private readonly ports: ApplicationPorts,
    private readonly weather: WeatherPort,
    private readonly cache: WeatherCachePort,
    private readonly config: WeatherConfig
  ) {}

  async execute(input: { userId: EntityId; now?: Date }): Promise<WeatherContext> {
    const user = await this.ports.users.findById(input.userId);
    if (!user) {
      throw new Error("User not found.");
    }

    const location = getUserLocation(user);
    if (!location) {
      throw new Error("User location not configured.");
    }

    const key = weatherCacheKey(location, input.now ?? new Date());
    const cached = await this.cache.get(key);
    if (cached) {
      return cached;
    }

    const context = parseWeatherContext(await this.weather.getCurrent(location));
    await this.cache.set(key, context, this.config.cacheTtlSeconds);
    return context;
  }
}

export class UpdateUserLocationUseCase {
  constructor(private readonly ports: ApplicationPorts) {}

  async execute(input: { userId: EntityId; location: UserLocation }) {
    const existing = await this.ports.users.findById(input.userId);
    if (!existing) {
      throw new Error("User not found.");
    }

    return this.ports.users.updateLocation(input.userId, normalizeLocation(input.location));
  }
}

export function getUserLocation(user: {
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
}): UserLocation | null {
  if (!user.city || user.latitude === null || user.longitude === null || !user.timezone) {
    return null;
  }

  return normalizeLocation({
    city: user.city,
    latitude: user.latitude,
    longitude: user.longitude,
    timezone: user.timezone
  });
}

export function normalizeLocation(location: UserLocation): UserLocation {
  const city = location.city.trim();
  const timezone = location.timezone.trim();

  if (city.length === 0 || city.length > 120) {
    throw new Error("User location city is invalid.");
  }

  if (!Number.isFinite(location.latitude) || location.latitude < -90 || location.latitude > 90) {
    throw new Error("User location latitude is invalid.");
  }

  if (!Number.isFinite(location.longitude) || location.longitude < -180 || location.longitude > 180) {
    throw new Error("User location longitude is invalid.");
  }

  if (!/^[A-Za-z_]+\/[A-Za-z0-9_+\-]+(?:\/[A-Za-z0-9_+\-]+)?$/.test(timezone)) {
    throw new Error("User location timezone is invalid.");
  }

  return {
    city,
    latitude: roundCoordinate(location.latitude),
    longitude: roundCoordinate(location.longitude),
    timezone
  };
}

export function weatherCacheKey(location: UserLocation, now: Date): string {
  const bucket = Math.floor(now.getTime() / (15 * 60 * 1000));
  return `weather:${location.latitude.toFixed(4)}:${location.longitude.toFixed(4)}:${bucket}`;
}

function roundCoordinate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
