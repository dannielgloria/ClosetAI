import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { parseWeatherContext, WeatherContext } from "@closet-ai/domain";
import { WeatherCachePort } from "@closet-ai/application";
import { Redis } from "ioredis";
import { WEATHER_CONFIG, WeatherRuntimeConfig } from "./weather-config.js";

@Injectable()
export class RedisWeatherCacheAdapter implements WeatherCachePort, OnModuleDestroy {
  private readonly logger = new Logger(RedisWeatherCacheAdapter.name);
  private readonly redis: Redis;

  constructor(@Inject(WEATHER_CONFIG) private readonly config: WeatherRuntimeConfig) {
    this.redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      lazyConnect: true,
      maxRetriesPerRequest: 1
    });
  }

  async get(key: string): Promise<WeatherContext | null> {
    try {
      await this.connectIfNeeded();
      const cached = await this.redis.get(this.key(key));
      if (!cached) {
        this.logCache("miss");
        return null;
      }

      this.logCache("hit");
      return parseWeatherContext(JSON.parse(cached));
    } catch (error) {
      this.logCache("error");
      this.logger.warn(`Weather cache read failed: ${error instanceof Error ? error.name : "UnknownError"}`);
      return null;
    }
  }

  async set(key: string, value: WeatherContext, ttlSeconds = this.config.cacheTtlSeconds): Promise<void> {
    try {
      await this.connectIfNeeded();
      await this.redis.set(this.key(key), JSON.stringify(value), "EX", ttlSeconds);
    } catch (error) {
      this.logger.warn(`Weather cache write failed: ${error instanceof Error ? error.name : "UnknownError"}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status !== "end" && this.redis.status !== "wait") {
      await this.redis.quit();
    }
  }

  private async connectIfNeeded(): Promise<void> {
    if (this.redis.status === "wait") {
      await this.redis.connect();
    }
  }

  private key(key: string): string {
    return `closet-ai:${key}`;
  }

  private logCache(status: "hit" | "miss" | "error"): void {
    this.logger.log(
      JSON.stringify({
        provider: "redis",
        capability: "weather_cache",
        status
      })
    );
  }
}
