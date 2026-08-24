import { timingSafeEqual } from "node:crypto";
import { ForbiddenException } from "@nestjs/common";

export function assertValidSetupSecret(providedSecret: string | undefined, configuredSecret: string | undefined): void {
  if (!providedSecret || !configuredSecret) {
    throw new ForbiddenException("Invalid setup secret.");
  }

  const provided = Buffer.from(providedSecret);
  const configured = Buffer.from(configuredSecret);
  if (provided.length !== configured.length || !timingSafeEqual(provided, configured)) {
    throw new ForbiddenException("Invalid setup secret.");
  }
}
