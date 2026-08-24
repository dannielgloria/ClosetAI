import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { GetAuthenticatedUserUseCase } from "@closet-ai/application";
import { ApplicationPortFactory } from "../prisma/application-port-factory.js";
import { JwtAccessTokenService } from "./access-token-service.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly accessTokenService: JwtAccessTokenService,
    private readonly portFactory: ApplicationPortFactory
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: unknown }>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;

    if (!token) {
      throw new UnauthorizedException("Missing bearer token.");
    }

    const authenticatedUser = this.accessTokenService.verifyAccessToken(token);
    try {
      await new GetAuthenticatedUserUseCase(this.portFactory.create()).execute({
        userId: authenticatedUser.userId,
        sessionId: authenticatedUser.sessionId
      });
    } catch {
      throw new UnauthorizedException("Invalid authenticated session.");
    }

    request.user = authenticatedUser;
    return true;
  }
}
