import { describe, expect, it } from "vitest";
import { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { OutfitStylistFailedError } from "@closet-ai/application";
import { ActivityType, GarmentCategory, GarmentStatus } from "@closet-ai/domain";
import { AiConfig } from "../ai/ai-config.js";
import { OpenAIOutfitStylistAdapter } from "./openai-outfit-stylist.adapter.js";

class FakeOpenAIClient {
  request: ResponseCreateParamsNonStreaming | null = null;

  constructor(private readonly result: { output_text?: string; status?: string; usage?: unknown } | Error) {}

  responses = {
    create: async (request: ResponseCreateParamsNonStreaming) => {
      this.request = request;
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

const metadata = {
  subcategory: null,
  secondaryColors: [],
  pattern: null,
  fit: null,
  estimatedMaterial: null,
  formality: null
};

const input = {
  context: { activities: [{ type: ActivityType.CASUAL_DINNER, time: "20:00" }] },
  weather: {
    temperature: 18,
    apparentTemperature: 17,
    minTemperature: 14,
    maxTemperature: 22,
    rainProbability: 45,
    windSpeed: 12,
    humidity: 68
  },
  garments: [
    { id: "top-1", category: GarmentCategory.TOP, primaryColor: "black", status: GarmentStatus.CLEAN_AVAILABLE, name: "Black tee", ...metadata },
    { id: "bottom-1", category: GarmentCategory.BOTTOM, primaryColor: "blue", status: GarmentStatus.CLEAN_AVAILABLE, ...metadata },
    { id: "footwear-1", category: GarmentCategory.FOOTWEAR, primaryColor: "white", status: GarmentStatus.CLEAN_AVAILABLE, ...metadata }
  ],
  maxRecommendations: 3
};

describe("OpenAIOutfitStylistAdapter", () => {
  it("requests strict structured output through the configured outfit model", async () => {
    const client = new FakeOpenAIClient({
      output_text: JSON.stringify({
        recommendations: [{ garmentIds: ["top-1", "bottom-1", "footwear-1"], score: 91, reason: "Balanced casual outfit." }]
      }),
      status: "completed"
    });
    const adapter = new OpenAIOutfitStylistAdapter(client, config);

    await adapter.recommend(input);

    expect(client.request?.model).toBe("test-outfit-model");
    expect(client.request?.store).toBe(false);
    expect(client.request?.instructions).toContain("Use only garment IDs present");
    expect(client.request?.instructions).toContain("normalized weather context");
    expect(client.request?.text?.format?.type).toBe("json_schema");
    expect(JSON.parse(String(client.request?.input))).toMatchObject({
      weather: {
        temperature: 18,
        rainProbability: 45
      }
    });
  });

  it("maps valid provider JSON into recommendation candidates", async () => {
    const adapter = new OpenAIOutfitStylistAdapter(
      new FakeOpenAIClient({
        output_text: JSON.stringify({
          recommendations: [{ garmentIds: ["top-1", "bottom-1", "footwear-1"], score: 88, reason: "Works for dinner." }]
        })
      }),
      config
    );

    await expect(adapter.recommend(input)).resolves.toEqual([
      { garmentIds: ["top-1", "bottom-1", "footwear-1"], score: 88, reason: "Works for dinner." }
    ]);
  });

  it("fails when configuration is missing", async () => {
    const adapter = new OpenAIOutfitStylistAdapter(undefined, {
      openAiApiKey: undefined,
      contextModel: "test-context-model",
      outfitModel: undefined,
      visionModel: "test-vision-model",
      requestTimeoutMs: 5000,
      garmentImageMaxSizeBytes: 8 * 1024 * 1024
    });

    await expect(adapter.recommend(input)).rejects.toThrow(OutfitStylistFailedError);
  });

  it("wraps provider errors", async () => {
    const adapter = new OpenAIOutfitStylistAdapter(new FakeOpenAIClient(new Error("timeout")), config);

    await expect(adapter.recommend(input)).rejects.toThrow(OutfitStylistFailedError);
  });

  it("rejects malformed output", async () => {
    const adapter = new OpenAIOutfitStylistAdapter(new FakeOpenAIClient({ output_text: "not-json" }), config);

    await expect(adapter.recommend(input)).rejects.toThrow(OutfitStylistFailedError);
  });

  it("rejects structurally invalid output", async () => {
    const adapter = new OpenAIOutfitStylistAdapter(
      new FakeOpenAIClient({ output_text: JSON.stringify({ recommendations: [{ garmentIds: ["top-1"], score: "high", reason: "Bad." }] }) }),
      config
    );

    await expect(adapter.recommend(input)).rejects.toThrow(OutfitStylistFailedError);
  });
});
