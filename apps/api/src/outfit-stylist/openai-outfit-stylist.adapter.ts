import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import OpenAI from "openai";
import { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import {
  OutfitStylistFailedError,
  OutfitStylistGarmentCandidate,
  OutfitStylistPort,
  OutfitStylistRecommendationCandidate
} from "@closet-ai/application";
import { InterpretedContext, WeatherContext } from "@closet-ai/domain";
import { buildOutfitStylistInstructions, OUTFIT_STYLIST_PROMPT_VERSION } from "../../../../prompts/outfit-stylist/v2.js";
import { AiConfig } from "../ai/ai-config.js";
import { AI_CONFIG, OpenAIResponsesClient, OPENAI_RESPONSES_CLIENT } from "../ai/openai-responses-client.js";

@Injectable()
export class OpenAIOutfitStylistAdapter implements OutfitStylistPort {
  private readonly logger = new Logger(OpenAIOutfitStylistAdapter.name);
  private client: OpenAIResponsesClient | null;

  constructor(
    @Optional() @Inject(OPENAI_RESPONSES_CLIENT) client: OpenAIResponsesClient | undefined,
    @Inject(AI_CONFIG) private readonly config: AiConfig
  ) {
    this.client = client ?? null;
  }

  async recommend(input: {
    context: InterpretedContext;
    weather?: WeatherContext;
    garments: OutfitStylistGarmentCandidate[];
    maxRecommendations: number;
  }): Promise<OutfitStylistRecommendationCandidate[]> {
    const startedAt = Date.now();

    try {
      const response = await this.getClient().responses.create(this.buildRequest(input), {
        timeout: this.config.requestTimeoutMs
      });
      const recommendations = parseOutfitStylistResponse(JSON.parse(response.output_text ?? ""));

      this.logExecution({
        latencyMs: Date.now() - startedAt,
        status: response.status ?? "completed",
        candidateCount: input.garments.length,
        recommendationCount: recommendations.length,
        usage: response.usage
      });

      return recommendations;
    } catch (error) {
      this.logExecution({
        latencyMs: Date.now() - startedAt,
        status: "failed",
        candidateCount: input.garments.length,
        recommendationCount: 0,
        usage: null
      });
      this.logger.warn(`Outfit stylist provider failure: ${error instanceof Error ? error.name : "UnknownError"}`);
      throw new OutfitStylistFailedError();
    }
  }

  private getClient(): OpenAIResponsesClient {
    if (this.client) {
      return this.client;
    }

    if (!this.config.openAiApiKey || !this.config.outfitModel) {
      throw new OutfitStylistFailedError();
    }

    this.client = new OpenAI({ apiKey: this.config.openAiApiKey });
    return this.client;
  }

  private buildRequest(input: {
    context: InterpretedContext;
    weather?: WeatherContext;
    garments: OutfitStylistGarmentCandidate[];
    maxRecommendations: number;
  }): ResponseCreateParamsNonStreaming {
    return {
      model: this.config.outfitModel,
      instructions: buildOutfitStylistInstructions({ maxRecommendations: input.maxRecommendations }),
      input: JSON.stringify({
        context: input.context,
        weather: input.weather ?? null,
        garments: input.garments,
        maxRecommendations: input.maxRecommendations
      }),
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "closet_outfit_recommendations",
          description: "Ranked outfit recommendations using only supplied garment IDs.",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["recommendations"],
            properties: {
              recommendations: {
                type: "array",
                minItems: 1,
                maxItems: input.maxRecommendations,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["garmentIds", "score", "reason"],
                  properties: {
                    garmentIds: {
                      type: "array",
                      minItems: 3,
                      items: { type: "string" }
                    },
                    score: { type: "integer", minimum: 0, maximum: 100 },
                    reason: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    };
  }

  private logExecution(input: {
    latencyMs: number;
    status: string;
    candidateCount: number;
    recommendationCount: number;
    usage: unknown;
  }): void {
    this.logger.log(
      JSON.stringify({
        capability: "outfit_stylist",
        provider: "openai",
        model: this.config.outfitModel ?? "unconfigured",
        promptVersion: OUTFIT_STYLIST_PROMPT_VERSION,
        latencyMs: input.latencyMs,
        status: input.status,
        candidateCount: input.candidateCount,
        recommendationCount: input.recommendationCount,
        usage: input.usage
      })
    );
  }
}

function parseOutfitStylistResponse(value: unknown): OutfitStylistRecommendationCandidate[] {
  if (!isRecord(value) || !Array.isArray(value.recommendations)) {
    throw new Error("Invalid outfit stylist response.");
  }

  return value.recommendations.map(parseRecommendation);
}

function parseRecommendation(value: unknown): OutfitStylistRecommendationCandidate {
  if (!isRecord(value) || !Array.isArray(value.garmentIds)) {
    throw new Error("Invalid outfit recommendation.");
  }

  if (typeof value.score !== "number" || !Number.isInteger(value.score)) {
    throw new Error("Invalid outfit recommendation score.");
  }

  if (typeof value.reason !== "string") {
    throw new Error("Invalid outfit recommendation reason.");
  }

  return {
    garmentIds: value.garmentIds.map((garmentId) => {
      if (typeof garmentId !== "string") {
        throw new Error("Invalid garment ID.");
      }

      return garmentId;
    }),
    score: value.score,
    reason: value.reason
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
