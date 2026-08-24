export interface AiConfig {
  openAiApiKey: string | undefined;
  contextModel: string | undefined;
  outfitModel: string | undefined;
  visionModel: string | undefined;
  requestTimeoutMs: number;
  garmentImageMaxSizeBytes: number;
}

export function getAiConfig(): AiConfig {
  const maxSizeMb = Number(process.env.GARMENT_IMAGE_MAX_SIZE_MB ?? 8);

  return {
    openAiApiKey: process.env.OPENAI_API_KEY,
    contextModel: process.env.AI_CONTEXT_MODEL,
    outfitModel: process.env.AI_OUTFIT_MODEL,
    visionModel: process.env.AI_VISION_MODEL,
    requestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 10_000),
    garmentImageMaxSizeBytes: Math.max(1, maxSizeMb) * 1024 * 1024
  };
}
