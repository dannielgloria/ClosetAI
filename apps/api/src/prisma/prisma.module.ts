import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service.js";
import { ApplicationPortFactory } from "./application-port-factory.js";

@Module({
  providers: [PrismaService, ApplicationPortFactory],
  exports: [PrismaService, ApplicationPortFactory]
})
export class PrismaModule {}
