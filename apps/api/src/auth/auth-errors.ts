import { BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common";

export function mapAuthError(error: unknown): never {
  const message = error instanceof Error ? error.message : "Unexpected authentication error.";

  if (
    message === "Invalid email or password." ||
    message === "Invalid refresh token." ||
    message === "Session revoked." ||
    message === "Refresh token expired." ||
    message === "Refresh token reuse detected." ||
    message === "Session not found."
  ) {
    throw new UnauthorizedException(message);
  }

  if (message === "User not found.") {
    throw new NotFoundException(message);
  }

  throw new BadRequestException(message);
}
