import { describe, expect, it, vi } from "vitest";
import {
  GENERATE_OUTFIT_VISUALIZATION_JOB,
  GenerateOutfitVisualizationUseCase
} from "@closet-ai/application";
import { OutfitVisualizationStatus } from "@closet-ai/domain";
import { processOutfitVisualizationJob } from "./outfit-visualization-worker.js";

describe("outfit visualization worker", () => {
  it("rejects unknown jobs and malformed payloads", async () => {
    const dependencies = {} as Parameters<typeof processOutfitVisualizationJob>[1];

    await expect(processOutfitVisualizationJob({ name: "other", data: {} }, dependencies)).rejects.toThrow(
      "Unknown outfit visualization job"
    );
    await expect(
      processOutfitVisualizationJob({ name: GENERATE_OUTFIT_VISUALIZATION_JOB, data: {} }, dependencies)
    ).rejects.toThrow("Invalid outfit visualization job payload");
  });

  it("passes only the visualization identity to the application use case", async () => {
    const execute = vi.spyOn(GenerateOutfitVisualizationUseCase.prototype, "execute").mockResolvedValue({
      status: "generated",
      visualization: {
        id: "visualization-1",
        outfitId: "outfit-1",
        userId: "user-1",
        status: OutfitVisualizationStatus.READY,
        objectKey: "visualization.webp",
        mimeType: "image/webp",
        provider: "fake",
        model: "fake",
        promptVersion: "v1",
        errorCode: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date()
      }
    });

    const status = await processOutfitVisualizationJob(
      {
        name: GENERATE_OUTFIT_VISUALIZATION_JOB,
        data: { outfitVisualizationId: "visualization-1" }
      },
      {} as Parameters<typeof processOutfitVisualizationJob>[1]
    );

    expect(status).toBe("generated");
    expect(execute).toHaveBeenCalledWith({ outfitVisualizationId: "visualization-1" });
    execute.mockRestore();
  });
});
