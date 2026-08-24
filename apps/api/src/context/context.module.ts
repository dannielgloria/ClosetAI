import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { CONTEXT_INTERPRETER } from "./context-interpreter.provider.js";
import { ContextController } from "./context.controller.js";
import { getAiConfig } from "../ai/ai-config.js";
import { AI_CONFIG } from "../ai/openai-responses-client.js";
import { OpenAIContextInterpreterAdapter } from "./openai-context-interpreter.adapter.js";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ContextController],
  providers: [
    {
      provide: AI_CONFIG,
      useFactory: getAiConfig
    },
    OpenAIContextInterpreterAdapter,
    {
      provide: CONTEXT_INTERPRETER,
      useExisting: OpenAIContextInterpreterAdapter
    }
  ],
  exports: [CONTEXT_INTERPRETER]
})
export class ContextModule {}
