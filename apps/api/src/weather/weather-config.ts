export interface WeatherRuntimeConfig {
  baseUrl: string;
  requestTimeoutMs: number;
  cacheTtlSeconds: number;
}

export const WEATHER_CONFIG = Symbol("WEATHER_CONFIG");

export function getWeatherRuntimeConfig(): WeatherRuntimeConfig {
  return {
    baseUrl: process.env.WEATHER_BASE_URL ?? "https://api.open-meteo.com/v1",
    requestTimeoutMs: readPositiveInteger("WEATHER_REQUEST_TIMEOUT_MS", 5_000),
    cacheTtlSeconds: readPositiveInteger("WEATHER_CACHE_TTL_SECONDS", 20 * 60)
  };
}

function readPositiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
