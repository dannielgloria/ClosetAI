import { BadRequestException, ForbiddenException, HttpException, NotFoundException, UnauthorizedException } from "@nestjs/common";

export function mapAuthError(error: unknown): never {
  if (error instanceof HttpException) {
    throw error;
  }

  const message = error instanceof Error ? error.message : "Unexpected authentication error.";

  if (
    message === "Invalid email or password." ||
    message === "Invalid refresh token." ||
    message === "Session revoked." ||
    message === "Refresh token expired." ||
    message === "Refresh token reuse detected." ||
    message === "Session not found."
  ) {
    throw new UnauthorizedException(message === "Invalid email or password." ? "Invalid credentials." : message);
  }

  if (message === "User not found.") {
    throw new NotFoundException(message);
  }

  if (message === "Credential bootstrap is disabled.") {
    throw new ForbiddenException(message);
  }

  throw new BadRequestException(message);
}
