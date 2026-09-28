import { describe, expect, it } from "vitest";
import { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { OutfitVisualizationFailedError } from "@closet-ai/application";
import { GarmentCategory } from "@closet-ai/domain";
import { AiConfig } from "../ai/ai-config.js";
import { OpenAIOutfitVisualizationAdapter } from "./openai-outfit-visualization.adapter.js";

class FakeOpenAIClient {
  request: ResponseCreateParamsNonStreaming | null = null;
  timeout: number | undefined;

  constructor(private readonly result: { output?: unknown[]; status?: string; usage?: unknown } | Error) {}

  responses = {
    create: async (request: ResponseCreateParamsNonStreaming, options?: { timeout?: number }) => {
      this.request = request;
      this.timeout = options?.timeout;
      if (this.result instanceof Error) {
        throw this.result;
      }
      return this.result;
    }
  };
}

const config: AiConfig = {
  openAiApiKey: "test-key",
  contextModel: "test-context-model",
  outfitModel: "test-outfit-model",
  visionModel: "test-vision-model",
  outfitVisualizationModel: "test-image-model",
  requestTimeoutMs: 5000,
  garmentImageMaxSizeBytes: 8 * 1024 * 1024
};

const input = {
  visualizationId: "visualization-1",
  outfitId: "outfit-1",
  garments: [
    {
      id: "garment-1",
      name: "Cream tee",
      category: GarmentCategory.TOP,
      subcategory: "T_SHIRT",
      primaryColor: "CREAM",
      secondaryColors: [],
      pattern: "SOLID",
      fit: "REGULAR",
      estimatedMaterial: "COTTON",
      formality: 2,
      image: { data: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" }
    }
  ],
  missingImageGarmentIds: []
};

describe("OpenAIOutfitVisualizationAdapter", () => {
  it("forces a versioned WebP image generation request with garment references", async () => {
    const client = new FakeOpenAIClient({
      output: [{ type: "image_generation_call", status: "completed", result: Buffer.from("image").toString("base64") }],
      status: "completed"
    });
    const adapter = new OpenAIOutfitVisualizationAdapter(client, config);

    const result = await adapter.generate(input);

    expect(result.image.mimeType).toBe("image/webp");
    expect(Buffer.from(result.image.data).toString()).toBe("image");
    expect(result.promptVersion).toBe("outfit-visualizer-v1");
    expect(client.timeout).toBe(5000);
    expect(client.request?.model).toBe("test-outfit-model");
    expect(client.request?.store).toBe(false);
    expect(client.request?.tool_choice).toEqual({ type: "image_generation" });
    expect(client.request?.tools?.[0]).toMatchObject({
      type: "image_generation",
      model: "test-image-model",
      action: "generate",
      output_format: "webp",
      size: "1024x1536"
    });
    expect(JSON.stringify(client.request?.input)).toContain("data:image/jpeg;base64");
    expect(client.request?.instructions).toContain("Do not add unsolicited accessories");
  });

  it("rejects provider failures", async () => {
    const adapter = new OpenAIOutfitVisualizationAdapter(new FakeOpenAIClient(new Error("timeout")), config);

    await expect(adapter.generate(input)).rejects.toThrow(OutfitVisualizationFailedError);
  });

  it("rejects responses without a generated image", async () => {
    const adapter = new OpenAIOutfitVisualizationAdapter(new FakeOpenAIClient({ output: [] }), config);

    await expect(adapter.generate(input)).rejects.toThrow(OutfitVisualizationFailedError);
  });

  it("fails closed when provider configuration is missing", async () => {
    const adapter = new OpenAIOutfitVisualizationAdapter(undefined, {
      ...config,
      openAiApiKey: undefined,
      outfitModel: undefined,
      outfitVisualizationModel: undefined
    });

    await expect(adapter.generate(input)).rejects.toThrow(OutfitVisualizationFailedError);
  });
});
