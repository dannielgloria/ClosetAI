import { BadRequestException, NotFoundException } from "@nestjs/common";

export function mapUseCaseError(error: unknown): never {
  const message = error instanceof Error ? error.message : "Unexpected application error.";

  if (message.endsWith("not found.") || message === "Outfit not found.") {
    throw new NotFoundException(message);
  }

  throw new BadRequestException(message);
}
