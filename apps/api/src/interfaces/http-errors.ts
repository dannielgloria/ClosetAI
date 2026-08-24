import { BadRequestException, HttpException, NotFoundException } from "@nestjs/common";

export function mapUseCaseError(error: unknown): never {
  if (error instanceof HttpException) {
    throw error;
  }

  const message = error instanceof Error ? error.message : "Unexpected application error.";

  if (message.endsWith("not found.") || message === "Outfit not found.") {
    throw new NotFoundException(message);
  }

  throw new BadRequestException(message);
}
