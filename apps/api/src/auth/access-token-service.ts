import { Injectable, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { SignOptions } from "jsonwebtoken";
import { AccessTokenIssuerPort, AuthenticatedUser } from "@closet-ai/application";
import { EntityId } from "@closet-ai/domain";
import { getAuthConfig } from "./auth-config.js";

interface AccessTokenPayload extends jwt.JwtPayload {
  sub: string;
  sessionId: string;
  householdId: string;
}

@Injectable()
export class JwtAccessTokenService implements AccessTokenIssuerPort {
  issueAccessToken(input: { userId: EntityId; householdId: EntityId; sessionId: EntityId }): string {
    const config = getAuthConfig();
    return jwt.sign(
      {
        sessionId: input.sessionId,
        householdId: input.householdId
      },
      config.jwtAccessSecret,
      {
        subject: input.userId,
        expiresIn: config.jwtAccessTtl as SignOptions["expiresIn"]
      }
    );
  }

  verifyAccessToken(accessToken: string): AuthenticatedUser {
    try {
      const config = getAuthConfig();
      const payload = jwt.verify(accessToken, config.jwtAccessSecret) as AccessTokenPayload;

      if (!payload.sub || !payload.sessionId || !payload.householdId) {
        throw new UnauthorizedException("Invalid access token.");
      }

      return {
        userId: payload.sub,
        sessionId: payload.sessionId,
        householdId: payload.householdId
      };
    } catch {
      throw new UnauthorizedException("Invalid access token.");
    }
  }
}
