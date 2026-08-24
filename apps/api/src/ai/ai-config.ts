export interface AiConfig {
  openAiApiKey: string | undefined;
  contextModel: string | undefined;
  outfitModel: string | undefined;
  requestTimeoutMs: number;
}

export function getAiConfig(): AiConfig {
  return {
    openAiApiKey: process.env.OPENAI_API_KEY,
    contextModel: process.env.AI_CONTEXT_MODEL,
    outfitModel: process.env.AI_OUTFIT_MODEL,
    requestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 10_000)
  };
}
