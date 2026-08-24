import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { EntityId } from "@closet-ai/domain";
import { RefreshTokenGeneratorPort } from "@closet-ai/application";

@Injectable()
export class SecureRefreshTokenGenerator implements RefreshTokenGeneratorPort {
  generate(sessionId: EntityId): string {
    return `${sessionId}.${randomBytes(32).toString("base64url")}`;
  }

  parseSessionId(refreshToken: string): EntityId | null {
    const [sessionId, secret, extra] = refreshToken.split(".");
    if (!sessionId || !secret || extra !== undefined) {
      return null;
    }

    return sessionId;
  }
}
