import { describe, expect, it } from "vitest";
import { Garment, GarmentCategory, GarmentStatus, OutfitStatus } from "./model.js";
import {
  chooseBasicOutfitGarments,
  confirmOutfitUsage,
  isGarmentEligibleForOutfit,
  selectOutfit
} from "./policies.js";

function garment(overrides: Partial<Garment>): Garment {
  const now = new Date("2026-08-23T00:00:00.000Z");

  return {
    id: "garment-1",
    userId: "user-1",
    category: GarmentCategory.TOP,
    primaryColor: "black",
    status: GarmentStatus.CLEAN_AVAILABLE,
    wearCount: 0,
    lastWornAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe("garment availability", () => {
  it("allows only clean available and worn reusable garments", () => {
    expect(isGarmentEligibleForOutfit(garment({ status: GarmentStatus.CLEAN_AVAILABLE }))).toBe(true);
    expect(isGarmentEligibleForOutfit(garment({ status: GarmentStatus.WORN_REUSABLE }))).toBe(true);
    expect(isGarmentEligibleForOutfit(garment({ status: GarmentStatus.LAUNDRY_BIN }))).toBe(false);
    expect(isGarmentEligibleForOutfit(garment({ status: GarmentStatus.REPAIR }))).toBe(false);
  });

  it("rejects garments owned by another user during outfit generation", () => {
    expect(() => chooseBasicOutfitGarments([garment({ userId: "user-2" })], "user-1")).toThrow(
      "Garment belongs to a different user."
    );
  });
});

describe("outfit usage", () => {
  it("selection does not mark an outfit as worn", () => {
    const now = new Date("2026-08-23T00:00:00.000Z");
    const selected = selectOutfit(
      {
        id: "outfit-1",
        userId: "user-1",
        status: OutfitStatus.GENERATED,
        items: [],
        explanation: "Basic outfit",
        score: 100,
        selectedAt: null,
        wornAt: null,
        createdAt: now,
        updatedAt: now
      },
      now
    );

    expect(selected.status).toBe(OutfitStatus.SELECTED);
    expect(selected.wornAt).toBeNull();
  });

  it("usage confirmation is idempotent once worn", () => {
    const now = new Date("2026-08-23T00:00:00.000Z");
    const worn = {
      id: "outfit-1",
      userId: "user-1",
      status: OutfitStatus.WORN,
      items: [],
      explanation: "Basic outfit",
      score: 100,
      selectedAt: now,
      wornAt: now,
      createdAt: now,
      updatedAt: now
    };

    expect(confirmOutfitUsage(worn, new Date("2026-08-24T00:00:00.000Z"))).toBe(worn);
  });

  it("rejects confirming usage before an outfit is selected", () => {
    const now = new Date("2026-08-23T00:00:00.000Z");

    expect(() =>
      confirmOutfitUsage(
        {
          id: "outfit-1",
          userId: "user-1",
          status: OutfitStatus.GENERATED,
          items: [],
          explanation: "Basic outfit",
          score: 100,
          selectedAt: null,
          wornAt: null,
          createdAt: now,
          updatedAt: now
        },
        now
      )
    ).toThrow("Only a selected outfit can be confirmed as worn.");
  });
});
