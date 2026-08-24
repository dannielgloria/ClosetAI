export const GARMENT_ANALYZER_PROMPT_VERSION = "garment-analyzer/v1";

export function buildGarmentAnalyzerInstructions(input: {
  categories: readonly string[];
  subcategories: readonly string[];
  patterns: readonly string[];
  fits: readonly string[];
  materials: readonly string[];
}): string {
  return [
    "You are a garment metadata parser for Closet AI.",
    "Analyze only the main garment in the image. Ignore people, room, hanger, bed, floor, mirror, and background when possible.",
    "Return only structured output. Do not recommend outfits. Do not create garments. Do not modify wardrobe state.",
    `Use only these categories: ${input.categories.join(", ")}.`,
    `Use only these subcategories: ${input.subcategories.join(", ")}. Use UNKNOWN or null when uncertain.`,
    `Use only these patterns: ${input.patterns.join(", ")}. Use UNKNOWN or null when uncertain.`,
    `Use only these fits: ${input.fits.join(", ")}. Use UNKNOWN or null when uncertain.`,
    `Use only these materials: ${input.materials.join(", ")}. Use UNKNOWN or null when uncertain.`,
    "Use concise canonical English color names in uppercase snake case, such as BLACK, WHITE, CREAM, NAVY, INDIGO, GRAY, RED, GREEN, BROWN.",
    "Do not infer brand, price, purchase date, store, size, or wash instructions.",
    "Use null when a field cannot be determined from the visible garment.",
    "Formality is an integer from 1 casual to 5 formal, or null when uncertain."
  ].join("\n");
}
