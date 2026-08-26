import { INestApplication } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { json, urlencoded } from "express";
import { applySecurityHeaders, getRuntimeConfig } from "./app-config.js";

export function configureHttpHardening(app: INestApplication): void {
  const runtimeConfig = getRuntimeConfig();
  if (runtimeConfig.trustProxyHops > 0) {
    app.getHttpAdapter().getInstance().set("trust proxy", runtimeConfig.trustProxyHops);
  }
  app.use(json({ limit: runtimeConfig.jsonPayloadLimit }));
  app.use(urlencoded({ extended: true, limit: runtimeConfig.jsonPayloadLimit }));
  app.use((_request: Request, response: Response, next: NextFunction) => {
    applySecurityHeaders(response);
    next();
  });
  app.enableCors({
    origin: runtimeConfig.corsAllowedOrigins,
    credentials: true
  });
}
