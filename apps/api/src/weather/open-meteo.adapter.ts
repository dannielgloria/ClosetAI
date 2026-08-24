import { Inject, Injectable, Logger } from "@nestjs/common";
import { parseWeatherContext, WeatherContext } from "@closet-ai/domain";
import { WeatherPort, WeatherProviderFailedError } from "@closet-ai/application";
import { WEATHER_CONFIG, WeatherRuntimeConfig } from "./weather-config.js";

@Injectable()
export class OpenMeteoAdapter implements WeatherPort {
  private readonly logger = new Logger(OpenMeteoAdapter.name);

  constructor(@Inject(WEATHER_CONFIG) private readonly config: WeatherRuntimeConfig) {}

  async getCurrent(input: { latitude: number; longitude: number; timezone: string }): Promise<WeatherContext> {
    const startedAt = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
      const response = await fetch(this.buildUrl(input), { signal: controller.signal }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        throw new Error(`Open-Meteo returned ${response.status}.`);
      }

      const weather = parseWeatherContext(mapOpenMeteoResponse(await response.json()));
      this.logExecution({ latencyMs: Date.now() - startedAt, status: "completed" });
      return weather;
    } catch (error) {
      this.logExecution({ latencyMs: Date.now() - startedAt, status: "failed" });
      this.logger.warn(`Open-Meteo provider failure: ${error instanceof Error ? error.name : "UnknownError"}`);
      throw new WeatherProviderFailedError();
    }
  }

  private buildUrl(input: { latitude: number; longitude: number; timezone: string }): URL {
    const url = new URL(`${this.config.baseUrl.replace(/\/$/, "")}/forecast`);
    url.searchParams.set("latitude", String(input.latitude));
    url.searchParams.set("longitude", String(input.longitude));
    url.searchParams.set("timezone", input.timezone);
    url.searchParams.set("forecast_days", "1");
    url.searchParams.set("current", "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m");
    url.searchParams.set("daily", "temperature_2m_min,temperature_2m_max,precipitation_probability_max");
    return url;
  }

  private logExecution(input: { latencyMs: number; status: "completed" | "failed" }): void {
    this.logger.log(
      JSON.stringify({
        provider: "open-meteo",
        capability: "weather_context",
        latencyMs: input.latencyMs,
        status: input.status
      })
    );
  }
}

function mapOpenMeteoResponse(value: unknown): WeatherContext {
  if (!isRecord(value) || !isRecord(value.current) || !isRecord(value.daily)) {
    throw new Error("Malformed Open-Meteo response.");
  }

  return {
    temperature: readNumber(value.current.temperature_2m),
    apparentTemperature: readNumber(value.current.apparent_temperature),
    minTemperature: readFirstNumber(value.daily.temperature_2m_min),
    maxTemperature: readFirstNumber(value.daily.temperature_2m_max),
    rainProbability: readFirstNumber(value.daily.precipitation_probability_max),
    windSpeed: readNumber(value.current.wind_speed_10m),
    humidity: readNumber(value.current.relative_humidity_2m)
  };
}

function readNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Expected numeric weather value.");
  }

  return value;
}

function readFirstNumber(value: unknown): number {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Expected weather series.");
  }

  return readNumber(value[0]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
