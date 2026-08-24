import {
  chooseBasicOutfitGarments,
  EntityId,
  Garment,
  GarmentCategory,
  InterpretedContext,
  Outfit,
  OutfitStatus,
  parseInterpretedContext
} from "@closet-ai/domain";
import { ApplicationPorts } from "./ports.js";

export const MAX_OUTFIT_RECOMMENDATIONS = 3;

export interface OutfitStylistGarmentCandidate {
  id: EntityId;
  category: GarmentCategory;
  subcategory: string | null;
  primaryColor: string;
  secondaryColors: string[];
  pattern: string | null;
  fit: string | null;
  estimatedMaterial: string | null;
  formality: number | null;
  status: string;
  name?: string;
}

export interface OutfitStylistRecommendationCandidate {
  garmentIds: EntityId[];
  score: number;
  reason: string;
}

export interface OutfitStylistPort {
  recommend(input: {
    context: InterpretedContext;
    garments: OutfitStylistGarmentCandidate[];
    maxRecommendations: number;
  }): Promise<OutfitStylistRecommendationCandidate[]>;
}

export enum OutfitRecommendationStrategy {
  AI = "AI",
  DETERMINISTIC_FALLBACK = "DETERMINISTIC_FALLBACK"
}

export interface GenerateOutfitRecommendationsResult {
  strategy: OutfitRecommendationStrategy;
  recommendations: Outfit[];
}

export class OutfitStylistFailedError extends Error {
  constructor(message = "Outfit stylist failed.") {
    super(message);
    this.name = "OutfitStylistFailedError";
  }
}

export class GenerateOutfitRecommendationsUseCase {
  constructor(
    private readonly ports: ApplicationPorts,
    private readonly outfitStylist: OutfitStylistPort
  ) {}

  async execute(input: { userId: EntityId; context?: InterpretedContext }): Promise<GenerateOutfitRecommendationsResult> {
    const context = input.context ? parseInterpretedContext(input.context) : undefined;
    const eligibleGarments = await this.ports.garments.findAvailableByUserId(input.userId);
    const basicFallbackGarments = chooseBasicOutfitGarments(eligibleGarments, input.userId);

    if (!context) {
      return {
        strategy: OutfitRecommendationStrategy.DETERMINISTIC_FALLBACK,
        recommendations: [await this.persistOutfit(input.userId, basicFallbackGarments, 100, "Basic deterministic outfit generated without context-aware AI.")]
      };
    }

    try {
      const candidates = eligibleGarments.map(toStylistCandidate);
      const recommendations = await this.outfitStylist.recommend({
        context,
        garments: candidates,
        maxRecommendations: MAX_OUTFIT_RECOMMENDATIONS
      });

      return {
        strategy: OutfitRecommendationStrategy.AI,
        recommendations: await this.persistAiRecommendations(input.userId, eligibleGarments, recommendations)
      };
    } catch (error) {
      if (!(error instanceof OutfitStylistFailedError)) {
        throw error;
      }

      return {
        strategy: OutfitRecommendationStrategy.DETERMINISTIC_FALLBACK,
        recommendations: [await this.persistOutfit(input.userId, basicFallbackGarments, 100, "Deterministic fallback outfit generated because AI styling was unavailable.")]
      };
    }
  }

  private async persistAiRecommendations(
    userId: EntityId,
    eligibleGarments: Garment[],
    recommendations: OutfitStylistRecommendationCandidate[]
  ): Promise<Outfit[]> {
    if (recommendations.length === 0 || recommendations.length > MAX_OUTFIT_RECOMMENDATIONS) {
      throw new Error("Invalid recommendation count.");
    }

    const eligibleById = new Map(eligibleGarments.map((garment) => [garment.id, garment]));
    const outfits: Outfit[] = [];

    for (const recommendation of recommendations) {
      const garments = validateRecommendation(userId, eligibleById, recommendation);
      outfits.push(await this.persistOutfit(userId, garments, recommendation.score, recommendation.reason));
    }

    return outfits;
  }

  private persistOutfit(userId: EntityId, garments: Garment[], score: number, explanation: string): Promise<Outfit> {
    return this.ports.outfits.create({
      userId,
      garmentIds: garments.map((garment) => garment.id),
      explanation,
      score,
      status: OutfitStatus.PRESENTED
    });
  }
}

function toStylistCandidate(garment: Garment): OutfitStylistGarmentCandidate {
  return {
    id: garment.id,
    category: garment.category,
    subcategory: garment.subcategory,
    primaryColor: garment.primaryColor,
    secondaryColors: garment.secondaryColors,
    pattern: garment.pattern,
    fit: garment.fit,
    estimatedMaterial: garment.estimatedMaterial,
    formality: garment.formality,
    status: garment.status,
    name: garment.name
  };
}

function validateRecommendation(
  userId: EntityId,
  eligibleById: Map<EntityId, Garment>,
  recommendation: OutfitStylistRecommendationCandidate
): Garment[] {
  if (!Number.isInteger(recommendation.score) || recommendation.score < 0 || recommendation.score > 100) {
    throw new Error("Invalid recommendation score.");
  }

  if (recommendation.reason.trim().length === 0) {
    throw new Error("Recommendation reason is required.");
  }

  const uniqueIds = new Set(recommendation.garmentIds);
  if (uniqueIds.size !== recommendation.garmentIds.length) {
    throw new Error("Recommendation contains duplicate garment IDs.");
  }

  const garments = recommendation.garmentIds.map((garmentId) => {
    const garment = eligibleById.get(garmentId);
    if (!garment) {
      throw new Error("Recommendation references an ineligible garment.");
    }

    if (garment.userId !== userId) {
      throw new Error("Recommendation references another user's garment.");
    }

    return garment;
  });

  chooseBasicOutfitGarments(garments, userId);
  return garments;
}
