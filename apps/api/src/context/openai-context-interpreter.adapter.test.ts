import { describe, expect, it } from "vitest";
import { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { ContextInterpretationFailedError } from "@closet-ai/application";
import { ActivityType } from "@closet-ai/domain";
import { OpenAIContextInterpreterAdapter } from "./openai-context-interpreter.adapter.js";

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

describe("OpenAIContextInterpreterAdapter", () => {
  it("requests structured output through the configured model and prompt", async () => {
    const client = new FakeOpenAIClient({
      output_text: JSON.stringify({ activities: [{ type: ActivityType.GYM, time: "17:00" }] }),
      status: "completed"
    });
    const adapter = new OpenAIContextInterpreterAdapter(client, {
      openAiApiKey: "test-key",
      contextModel: "test-context-model",
      requestTimeoutMs: 5000
    });

    await adapter.interpret({ text: "Hoy voy al gimnasio a las cinco." });

    expect(client.request?.model).toBe("test-context-model");
    expect(client.request?.store).toBe(false);
    expect(client.request?.instructions).toContain("Do not recommend outfits");
    expect(client.request?.text?.format?.type).toBe("json_schema");
  });

  it("maps valid provider JSON into interpreted context", async () => {
    const adapter = new OpenAIContextInterpreterAdapter(
      new FakeOpenAIClient({
        output_text: JSON.stringify({
          activities: [
            { type: ActivityType.GYM, time: "17:00" },
            { type: ActivityType.CASUAL_DINNER, time: null }
          ]
        })
      }),
      { openAiApiKey: "test-key", contextModel: "test-context-model", requestTimeoutMs: 5000 }
    );

    await expect(adapter.interpret({ text: "Gimnasio y cena." })).resolves.toEqual({
      activities: [
        { type: ActivityType.GYM, time: "17:00" },
        { type: ActivityType.CASUAL_DINNER, time: null }
      ]
    });
  });

  it("fails when configuration is missing", async () => {
    const adapter = new OpenAIContextInterpreterAdapter(undefined, {
      openAiApiKey: undefined,
      contextModel: undefined,
      requestTimeoutMs: 5000
    });

    await expect(adapter.interpret({ text: "Voy al gimnasio." })).rejects.toThrow(ContextInterpretationFailedError);
  });

  it("wraps provider errors", async () => {
    const adapter = new OpenAIContextInterpreterAdapter(
      new FakeOpenAIClient(new Error("timeout")),
      { openAiApiKey: "test-key", contextModel: "test-context-model", requestTimeoutMs: 5000 }
    );

    await expect(adapter.interpret({ text: "Voy al gimnasio." })).rejects.toThrow(ContextInterpretationFailedError);
  });

  it("rejects unknown activity enums", async () => {
    const adapter = new OpenAIContextInterpreterAdapter(
      new FakeOpenAIClient({ output_text: JSON.stringify({ activities: [{ type: "SHOPPING_MALL", time: null }] }) }),
      { openAiApiKey: "test-key", contextModel: "test-context-model", requestTimeoutMs: 5000 }
    );

    await expect(adapter.interpret({ text: "Voy al centro comercial." })).rejects.toThrow(ContextInterpretationFailedError);
  });

  it("rejects malformed output", async () => {
    const adapter = new OpenAIContextInterpreterAdapter(
      new FakeOpenAIClient({ output_text: "not-json" }),
      { openAiApiKey: "test-key", contextModel: "test-context-model", requestTimeoutMs: 5000 }
    );

    await expect(adapter.interpret({ text: "Voy al gimnasio." })).rejects.toThrow(ContextInterpretationFailedError);
  });
});
