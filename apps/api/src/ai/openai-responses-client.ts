import { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";

export const OPENAI_RESPONSES_CLIENT = Symbol("OPENAI_RESPONSES_CLIENT");
export const AI_CONFIG = Symbol("AI_CONFIG");

export interface OpenAIResponseResult {
  output_text?: string;
  status?: string;
  usage?: unknown;
}

export interface OpenAIResponsesClient {
  responses: {
    create(params: ResponseCreateParamsNonStreaming, options?: { timeout?: number }): Promise<OpenAIResponseResult>;
  };
}
