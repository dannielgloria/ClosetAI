import { HttpException, HttpStatus, Injectable, OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";

export type AuthRateLimitBucket = "bootstrap" | "login" | "refresh";

interface RateLimitRule {
  max: number;
  windowSeconds: number;
}

@Injectable()
export class AuthRateLimiter implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      lazyConnect: true,
      maxRetriesPerRequest: 1
    });
  }

  async consume(bucket: AuthRateLimitBucket, identifier: string): Promise<void> {
    const rule = getRateLimitRule(bucket);
    const key = `closet-ai:rate-limit:auth:${bucket}:${identifier}`;
    if (this.redis.status === "wait") {
      await this.redis.connect();
    }

    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, rule.windowSeconds);
    }

    if (count > rule.max) {
      throw new HttpException("Too many authentication attempts.", HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status !== "end" && this.redis.status !== "wait") {
      await this.redis.quit();
    }
  }
}

function getRateLimitRule(bucket: AuthRateLimitBucket): RateLimitRule {
  switch (bucket) {
    case "bootstrap":
      return {
        max: readPositiveInteger("AUTH_BOOTSTRAP_RATE_LIMIT_MAX", 5),
        windowSeconds: readPositiveInteger("AUTH_BOOTSTRAP_RATE_LIMIT_WINDOW_SECONDS", 300)
      };
    case "login":
      return {
        max: readPositiveInteger("AUTH_LOGIN_RATE_LIMIT_MAX", 5),
        windowSeconds: readPositiveInteger("AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS", 60)
      };
    case "refresh":
      return {
        max: readPositiveInteger("AUTH_REFRESH_RATE_LIMIT_MAX", 20),
        windowSeconds: readPositiveInteger("AUTH_REFRESH_RATE_LIMIT_WINDOW_SECONDS", 60)
      };
  }
}

function readPositiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
