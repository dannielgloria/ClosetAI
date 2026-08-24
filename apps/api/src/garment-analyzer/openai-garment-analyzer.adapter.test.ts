import { describe, expect, it } from "vitest";
import { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { GarmentAnalysisFailedError } from "@closet-ai/application";
import { GarmentCategory, GarmentFit, GarmentMaterial, GarmentPattern, GarmentSubcategory } from "@closet-ai/domain";
import { AiConfig } from "../ai/ai-config.js";
import { OpenAIGarmentAnalyzerAdapter } from "./openai-garment-analyzer.adapter.js";

class FakeOpenAIClient {
  request: ResponseCreateParamsNonStreaming | null = null;
  timeout: number | undefined;

  constructor(private readonly result: { output_text?: string; status?: string; usage?: unknown } | Error) {}

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
  requestTimeoutMs: 5000,
  garmentImageMaxSizeBytes: 8 * 1024 * 1024
};

const validOutput = {
  category: GarmentCategory.TOP,
  subcategory: GarmentSubcategory.T_SHIRT,
  primaryColor: "CREAM",
  secondaryColors: ["BLACK"],
  pattern: GarmentPattern.SOLID,
  fit: GarmentFit.REGULAR,
  estimatedMaterial: GarmentMaterial.COTTON,
  formality: 2
};

describe("OpenAIGarmentAnalyzerAdapter", () => {
  it("passes image input and requests strict structured output", async () => {
    const client = new FakeOpenAIClient({ output_text: JSON.stringify(validOutput), status: "completed" });
    const adapter = new OpenAIGarmentAnalyzerAdapter(client, config);

    await adapter.analyze({ imageId: "image-1", image: { data: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" } });

    expect(client.request?.model).toBe("test-vision-model");
    expect(client.timeout).toBe(5000);
    expect(client.request?.store).toBe(false);
    expect(client.request?.instructions).toContain("Analyze only the main garment");
    expect(client.request?.text?.format?.type).toBe("json_schema");
    expect(JSON.stringify(client.request?.input)).toContain("data:image/jpeg;base64");
  });

  it("maps valid structured output", async () => {
    const adapter = new OpenAIGarmentAnalyzerAdapter(new FakeOpenAIClient({ output_text: JSON.stringify(validOutput) }), config);

    await expect(adapter.analyze({ image: { data: new Uint8Array([1]), mimeType: "image/png" } })).resolves.toEqual(validOutput);
  });

  it("fails when configuration is missing", async () => {
    const adapter = new OpenAIGarmentAnalyzerAdapter(undefined, {
      ...config,
      openAiApiKey: undefined,
      visionModel: undefined
    });

    await expect(adapter.analyze({ image: { data: new Uint8Array([1]), mimeType: "image/png" } })).rejects.toThrow(
      GarmentAnalysisFailedError
    );
  });

  it("wraps provider errors", async () => {
    const adapter = new OpenAIGarmentAnalyzerAdapter(new FakeOpenAIClient(new Error("timeout")), config);

    await expect(adapter.analyze({ image: { data: new Uint8Array([1]), mimeType: "image/png" } })).rejects.toThrow(
      GarmentAnalysisFailedError
    );
  });

  it("rejects malformed output", async () => {
    const adapter = new OpenAIGarmentAnalyzerAdapter(new FakeOpenAIClient({ output_text: "not-json" }), config);

    await expect(adapter.analyze({ image: { data: new Uint8Array([1]), mimeType: "image/webp" } })).rejects.toThrow(
      GarmentAnalysisFailedError
    );
  });

  it("rejects unknown enum output", async () => {
    const adapter = new OpenAIGarmentAnalyzerAdapter(
      new FakeOpenAIClient({ output_text: JSON.stringify({ ...validOutput, category: "HAT" }) }),
      config
    );

    await expect(adapter.analyze({ image: { data: new Uint8Array([1]), mimeType: "image/webp" } })).rejects.toThrow(
      GarmentAnalysisFailedError
    );
  });
});
