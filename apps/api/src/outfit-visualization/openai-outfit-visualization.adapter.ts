import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import OpenAI from "openai";
import { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import {
  OutfitVisualizationFailedError,
  OutfitVisualizationPort,
  OutfitVisualizationGarmentInput,
  GeneratedOutfitVisualization
} from "@closet-ai/application";
import {
  buildOutfitVisualizerInstructions,
  OUTFIT_VISUALIZER_PROMPT_VERSION
} from "../../../../prompts/outfit-visualizer/v1.js";
import { AiConfig } from "../ai/ai-config.js";
import { AI_CONFIG, OpenAIResponsesClient, OPENAI_RESPONSES_CLIENT } from "../ai/openai-responses-client.js";

@Injectable()
export class OpenAIOutfitVisualizationAdapter implements OutfitVisualizationPort {
  private readonly logger = new Logger(OpenAIOutfitVisualizationAdapter.name);
  private client: OpenAIResponsesClient | null;

  constructor(
    @Optional() @Inject(OPENAI_RESPONSES_CLIENT) client: OpenAIResponsesClient | undefined,
    @Inject(AI_CONFIG) private readonly config: AiConfig
  ) {
    this.client = client ?? null;
  }

  async generate(input: {
    visualizationId: string;
    outfitId: string;
    garments: OutfitVisualizationGarmentInput[];
    missingImageGarmentIds: string[];
  }): Promise<GeneratedOutfitVisualization> {
    const startedAt = Date.now();

    try {
      const response = await this.getClient().responses.create(this.buildRequest(input), {
        timeout: this.config.requestTimeoutMs
      });
      const image = parseGeneratedImage(response);

      this.logExecution({
        visualizationId: input.visualizationId,
        outfitId: input.outfitId,
        latencyMs: Date.now() - startedAt,
        status: response.status ?? "completed",
        retryCount: 0,
        usage: response.usage
      });

      return {
        image,
        provider: "openai",
        model: this.config.outfitVisualizationModel ?? "unconfigured",
        promptVersion: OUTFIT_VISUALIZER_PROMPT_VERSION
      };
    } catch (error) {
      this.logExecution({
        visualizationId: input.visualizationId,
        outfitId: input.outfitId,
        latencyMs: Date.now() - startedAt,
        status: "failed",
        retryCount: 0,
        usage: null
      });
      this.logger.warn(`Outfit visualization provider failure: ${error instanceof Error ? error.name : "UnknownError"}`);
      throw new OutfitVisualizationFailedError();
    }
  }

  private getClient(): OpenAIResponsesClient {
    if (this.client) {
      return this.client;
    }

    if (!this.config.openAiApiKey || !this.config.outfitModel || !this.config.outfitVisualizationModel) {
      throw new OutfitVisualizationFailedError();
    }

    this.client = new OpenAI({ apiKey: this.config.openAiApiKey });
    return this.client;
  }

  private buildRequest(input: {
    outfitId: string;
    garments: OutfitVisualizationGarmentInput[];
    missingImageGarmentIds: string[];
  }): ResponseCreateParamsNonStreaming {
    const content: Array<Record<string, unknown>> = [
      {
        type: "input_text",
        text: JSON.stringify({
          outfitId: input.outfitId,
          garments: input.garments.map((garment) => ({
            id: garment.id,
            name: garment.name ?? null,
            category: garment.category,
            subcategory: garment.subcategory,
            primaryColor: garment.primaryColor,
            secondaryColors: garment.secondaryColors,
            pattern: garment.pattern,
            fit: garment.fit,
            estimatedMaterial: garment.estimatedMaterial,
            formality: garment.formality,
            hasImageReference: garment.image !== null
          })),
          missingImageGarmentIds: input.missingImageGarmentIds
        })
      }
    ];

    input.garments.forEach((garment) => {
      if (garment.image) {
        content.push({
          type: "input_image",
          image_url: `data:${garment.image.mimeType};base64,${Buffer.from(garment.image.data).toString("base64")}`,
          detail: "auto"
        });
      }
    });

    return {
      model: this.config.outfitModel ?? "",
      instructions: buildOutfitVisualizerInstructions(),
      input: [
        {
          role: "user",
          content
        }
      ],
      tools: [
        {
          type: "image_generation",
          model: this.config.outfitVisualizationModel,
          output_format: "webp",
          size: "1024x1536",
          quality: "medium",
          action: "generate"
        }
      ],
      tool_choice: { type: "image_generation" },
      store: false
    } as unknown as ResponseCreateParamsNonStreaming;
  }

  private logExecution(input: {
    visualizationId: string;
    outfitId: string;
    latencyMs: number;
    status: string;
    retryCount: number;
    usage: unknown;
  }): void {
    this.logger.log(
      JSON.stringify({
        capability: "outfit_visualization",
        provider: "openai",
        visualizationId: input.visualizationId,
        outfitId: input.outfitId,
        model: this.config.outfitVisualizationModel ?? "unconfigured",
        promptVersion: OUTFIT_VISUALIZER_PROMPT_VERSION,
        latencyMs: input.latencyMs,
        status: input.status,
        retryCount: input.retryCount,
        usage: input.usage
      })
    );
  }
}

function parseGeneratedImage(response: { output?: unknown[] }): { data: Uint8Array; mimeType: string } {
  const image = response.output?.find((item): item is { type: string; result: string | null; status?: string } => {
    return isRecord(item) && item.type === "image_generation_call";
  });

  if (!image || image.status === "failed" || typeof image.result !== "string" || image.result.length === 0) {
    throw new Error("Missing generated image.");
  }

  return {
    data: Buffer.from(image.result, "base64"),
    mimeType: "image/webp"
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
