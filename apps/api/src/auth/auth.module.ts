import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { Argon2PasswordHasher } from "./argon2-password-hasher.js";
import { AuthController } from "./auth.controller.js";
import { JwtAccessTokenService } from "./access-token-service.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { SecureRefreshTokenGenerator } from "./refresh-token-generator.js";

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [Argon2PasswordHasher, JwtAccessTokenService, JwtAuthGuard, SecureRefreshTokenGenerator],
  exports: [Argon2PasswordHasher, JwtAccessTokenService, JwtAuthGuard, SecureRefreshTokenGenerator]
})
export class AuthModule {}
