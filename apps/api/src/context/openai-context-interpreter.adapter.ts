import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import OpenAI from "openai";
import { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { ContextInterpretationFailedError, ContextInterpreterPort } from "@closet-ai/application";
import { ACTIVITY_TYPES, InterpretedContext, parseInterpretedContext } from "@closet-ai/domain";
import {
  buildContextInterpreterInstructions,
  CONTEXT_INTERPRETER_PROMPT_VERSION
} from "../../../../prompts/context-interpreter/v1.js";
import { AiConfig } from "../ai/ai-config.js";
import { AI_CONFIG, OpenAIResponsesClient, OPENAI_RESPONSES_CLIENT } from "../ai/openai-responses-client.js";

@Injectable()
export class OpenAIContextInterpreterAdapter implements ContextInterpreterPort {
  private readonly logger = new Logger(OpenAIContextInterpreterAdapter.name);
  private client: OpenAIResponsesClient | null;

  constructor(
    @Optional() @Inject(OPENAI_RESPONSES_CLIENT) client: OpenAIResponsesClient | undefined,
    @Inject(AI_CONFIG) private readonly config: AiConfig
  ) {
    this.client = client ?? null;
  }

  async interpret(input: { text: string }): Promise<InterpretedContext> {
    const startedAt = Date.now();

    try {
      const response = await this.getClient().responses.create(this.buildRequest(input.text), {
        timeout: this.config.requestTimeoutMs
      });
      const parsed = parseInterpretedContext(JSON.parse(response.output_text ?? ""));

      this.logExecution({
        latencyMs: Date.now() - startedAt,
        status: response.status ?? "completed",
        usage: response.usage
      });

      return parsed;
    } catch (error) {
      this.logExecution({
        latencyMs: Date.now() - startedAt,
        status: "failed",
        usage: null
      });
      this.logger.warn(`Context interpretation provider failure: ${error instanceof Error ? error.name : "UnknownError"}`);
      throw new ContextInterpretationFailedError();
    }
  }

  private getClient(): OpenAIResponsesClient {
    if (this.client) {
      return this.client;
    }

    if (!this.config.openAiApiKey || !this.config.contextModel) {
      throw new ContextInterpretationFailedError();
    }

    this.client = new OpenAI({ apiKey: this.config.openAiApiKey });
    return this.client;
  }

  private buildRequest(text: string): ResponseCreateParamsNonStreaming {
    return {
      model: this.config.contextModel,
      instructions: buildContextInterpreterInstructions(ACTIVITY_TYPES),
      input: text,
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "closet_activity_context",
          description: "Structured activity context interpreted from a user plan.",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["activities"],
            properties: {
              activities: {
                type: "array",
                minItems: 1,
                maxItems: 10,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["type", "time"],
                  properties: {
                    type: { type: "string", enum: ACTIVITY_TYPES },
                    time: {
                      anyOf: [{ type: "string" }, { type: "null" }]
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
  }

  private logExecution(input: { latencyMs: number; status: string; usage: unknown }): void {
    this.logger.log(
      JSON.stringify({
        capability: "context_interpretation",
        provider: "openai",
        model: this.config.contextModel ?? "unconfigured",
        promptVersion: CONTEXT_INTERPRETER_PROMPT_VERSION,
        latencyMs: input.latencyMs,
        status: input.status,
        usage: input.usage
      })
    );
  }
}
