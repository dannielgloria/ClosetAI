import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import OpenAI from "openai";
import { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { GarmentAnalysis, GarmentAnalysisFailedError, GarmentAnalyzerPort, parseGarmentAnalysis } from "@closet-ai/application";
import { GarmentCategory, GarmentFit, GarmentMaterial, GarmentPattern, GarmentSubcategory } from "@closet-ai/domain";
import {
  buildGarmentAnalyzerInstructions,
  GARMENT_ANALYZER_PROMPT_VERSION
} from "../../../../prompts/garment-analyzer/v1.js";
import { AiConfig } from "../ai/ai-config.js";
import { AI_CONFIG, OpenAIResponsesClient, OPENAI_RESPONSES_CLIENT } from "../ai/openai-responses-client.js";

@Injectable()
export class OpenAIGarmentAnalyzerAdapter implements GarmentAnalyzerPort {
  private readonly logger = new Logger(OpenAIGarmentAnalyzerAdapter.name);
  private client: OpenAIResponsesClient | null;

  constructor(
    @Optional() @Inject(OPENAI_RESPONSES_CLIENT) client: OpenAIResponsesClient | undefined,
    @Inject(AI_CONFIG) private readonly config: AiConfig
  ) {
    this.client = client ?? null;
  }

  async analyze(input: { imageId?: string; image: { data: Uint8Array; mimeType: string } }): Promise<GarmentAnalysis> {
    const startedAt = Date.now();

    try {
      const response = await this.getClient().responses.create(this.buildRequest(input.image), {
        timeout: this.config.requestTimeoutMs
      });
      const analysis = parseGarmentAnalysis(JSON.parse(response.output_text ?? ""));

      this.logExecution({
        latencyMs: Date.now() - startedAt,
        status: response.status ?? "completed",
        imageId: input.imageId,
        usage: response.usage
      });

      return analysis;
    } catch (error) {
      this.logExecution({
        latencyMs: Date.now() - startedAt,
        status: "failed",
        imageId: input.imageId,
        usage: null
      });
      this.logger.warn(`Garment analyzer provider failure: ${error instanceof Error ? error.name : "UnknownError"}`);
      throw new GarmentAnalysisFailedError();
    }
  }

  private getClient(): OpenAIResponsesClient {
    if (this.client) {
      return this.client;
    }

    if (!this.config.openAiApiKey || !this.config.visionModel) {
      throw new GarmentAnalysisFailedError();
    }

    this.client = new OpenAI({ apiKey: this.config.openAiApiKey });
    return this.client;
  }

  private buildRequest(image: { data: Uint8Array; mimeType: string }): ResponseCreateParamsNonStreaming {
    return {
      model: this.config.visionModel,
      instructions: buildGarmentAnalyzerInstructions({
        categories: Object.values(GarmentCategory),
        subcategories: Object.values(GarmentSubcategory),
        patterns: Object.values(GarmentPattern),
        fits: Object.values(GarmentFit),
        materials: Object.values(GarmentMaterial)
      }),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Analyze the main garment in this image and return proposed metadata."
            },
            {
              type: "input_image",
              image_url: `data:${image.mimeType};base64,${Buffer.from(image.data).toString("base64")}`,
              detail: "auto"
            }
          ]
        }
      ],
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "closet_garment_analysis",
          description: "Proposed metadata for a single garment image.",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["category", "subcategory", "primaryColor", "secondaryColors", "pattern", "fit", "estimatedMaterial", "formality"],
            properties: {
              category: { type: "string", enum: Object.values(GarmentCategory) },
              subcategory: { anyOf: [{ type: "string", enum: Object.values(GarmentSubcategory) }, { type: "null" }] },
              primaryColor: { type: "string" },
              secondaryColors: {
                type: "array",
                maxItems: 5,
                items: { type: "string" }
              },
              pattern: { anyOf: [{ type: "string", enum: Object.values(GarmentPattern) }, { type: "null" }] },
              fit: { anyOf: [{ type: "string", enum: Object.values(GarmentFit) }, { type: "null" }] },
              estimatedMaterial: { anyOf: [{ type: "string", enum: Object.values(GarmentMaterial) }, { type: "null" }] },
              formality: { anyOf: [{ type: "integer", minimum: 1, maximum: 5 }, { type: "null" }] }
            }
          }
        }
      }
    };
  }

  private logExecution(input: { latencyMs: number; status: string; imageId?: string; usage: unknown }): void {
    this.logger.log(
      JSON.stringify({
        capability: "garment_analyzer",
        provider: "openai",
        imageId: input.imageId,
        model: this.config.visionModel ?? "unconfigured",
        promptVersion: GARMENT_ANALYZER_PROMPT_VERSION,
        latencyMs: input.latencyMs,
        status: input.status,
        usage: input.usage
      })
    );
  }
}
