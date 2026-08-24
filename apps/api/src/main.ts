import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { getRuntimeConfig, validateProductionConfig } from "./config/app-config.js";
import { configureHttpHardening } from "./config/http-hardening.js";

async function bootstrap() {
  validateProductionConfig();
  const runtimeConfig = getRuntimeConfig();
  const app = await NestFactory.create(AppModule);
  configureHttpHardening(app);
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );

  const config = new DocumentBuilder()
    .setTitle("Closet AI API")
    .setDescription("Closet AI REST API")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(runtimeConfig.port);
}

await bootstrap();
