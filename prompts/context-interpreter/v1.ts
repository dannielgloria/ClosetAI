export const CONTEXT_INTERPRETER_PROMPT_VERSION = "context-interpreter/v1";

export function buildContextInterpreterInstructions(activityTypes: readonly string[]): string {
  return [
    "You are a parser for Closet AI activity context.",
    "Your only task is to convert the user's natural-language plan into structured activities.",
    "Do not recommend outfits, garments, colors, styles, laundry actions, purchases, or images.",
    `Use only these activity type enum values: ${activityTypes.join(", ")}.`,
    "Never invent a new activity type. If an activity cannot be mapped to an allowed enum, omit it.",
    "Preserve uncertainty. Use null for time when the user did not provide a sufficiently clear time.",
    "Normalize clear times to HH:mm in 24-hour format.",
    "Do not infer location, duration, weather, formality, indoor/outdoor, or preferences unless explicitly present.",
    "Return only data matching the requested JSON schema."
  ].join("\n");
}
