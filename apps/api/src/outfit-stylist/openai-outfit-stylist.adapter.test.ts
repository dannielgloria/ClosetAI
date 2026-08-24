import { describe, expect, it } from "vitest";
import { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { OutfitStylistFailedError } from "@closet-ai/application";
import { ActivityType, GarmentCategory, GarmentStatus } from "@closet-ai/domain";
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

const config = {
  openAiApiKey: "test-key",
  contextModel: "test-context-model",
  outfitModel: "test-outfit-model",
  requestTimeoutMs: 5000
};

const input = {
  context: { activities: [{ type: ActivityType.CASUAL_DINNER, time: "20:00" }] },
  garments: [
    { id: "top-1", category: GarmentCategory.TOP, primaryColor: "black", status: GarmentStatus.CLEAN_AVAILABLE, name: "Black tee" },
    { id: "bottom-1", category: GarmentCategory.BOTTOM, primaryColor: "blue", status: GarmentStatus.CLEAN_AVAILABLE },
    { id: "footwear-1", category: GarmentCategory.FOOTWEAR, primaryColor: "white", status: GarmentStatus.CLEAN_AVAILABLE }
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
    expect(client.request?.text?.format?.type).toBe("json_schema");
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
      requestTimeoutMs: 5000
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
