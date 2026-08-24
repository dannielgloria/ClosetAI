import { describe, expect, it } from "vitest";
import { Garment, GarmentCategory, GarmentStateTransitionType, GarmentStatus, OutfitStatus } from "./model.js";
import {
  chooseBasicOutfitGarments,
  confirmOutfitUsage,
  getValidGarmentTransitions,
  isGarmentEligibleForOutfit,
  selectOutfit,
  transitionGarmentState
} from "./policies.js";

function garment(overrides: Partial<Garment>): Garment {
  const now = new Date("2026-08-23T00:00:00.000Z");

  return {
    id: "garment-1",
    userId: "user-1",
    category: GarmentCategory.TOP,
    primaryColor: "black",
    secondaryColors: [],
    subcategory: null,
    pattern: null,
    fit: null,
    estimatedMaterial: null,
    formality: null,
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

describe("garment lifecycle", () => {
  it("applies valid lifecycle transitions explicitly", () => {
    const now = new Date("2026-08-24T00:00:00.000Z");

    expect(transitionGarmentState(garment({ status: GarmentStatus.CLEAN_AVAILABLE }), GarmentStateTransitionType.SEND_TO_LAUNDRY, now).status).toBe(
      GarmentStatus.LAUNDRY_BIN
    );
    expect(transitionGarmentState(garment({ status: GarmentStatus.LAUNDRY_BIN }), GarmentStateTransitionType.START_WASHING, now).status).toBe(
      GarmentStatus.WASHING
    );
    expect(transitionGarmentState(garment({ status: GarmentStatus.WASHING }), GarmentStateTransitionType.START_DRYING, now).status).toBe(
      GarmentStatus.DRYING
    );
    expect(
      transitionGarmentState(garment({ status: GarmentStatus.DRYING }), GarmentStateTransitionType.MARK_CLEAN_PENDING_STORAGE, now).status
    ).toBe(GarmentStatus.CLEAN_PENDING_STORAGE);
    expect(
      transitionGarmentState(garment({ status: GarmentStatus.CLEAN_PENDING_STORAGE }), GarmentStateTransitionType.MARK_CLEAN_AVAILABLE, now).status
    ).toBe(GarmentStatus.CLEAN_AVAILABLE);
  });

  it("rejects invalid transitions without mutating the garment", () => {
    const current = garment({ status: GarmentStatus.CLEAN_AVAILABLE });

    expect(() => transitionGarmentState(current, GarmentStateTransitionType.START_WASHING, new Date())).toThrow(
      "Invalid garment state transition"
    );
    expect(current.status).toBe(GarmentStatus.CLEAN_AVAILABLE);
  });

  it("keeps donated and discarded as terminal states", () => {
    expect(getValidGarmentTransitions(GarmentStatus.DONATED)).toEqual([]);
    expect(getValidGarmentTransitions(GarmentStatus.DISCARDED)).toEqual([]);
    expect(() => transitionGarmentState(garment({ status: GarmentStatus.DONATED }), GarmentStateTransitionType.RESTORE, new Date())).toThrow(
      "Invalid garment state transition"
    );
    expect(() => transitionGarmentState(garment({ status: GarmentStatus.DISCARDED }), GarmentStateTransitionType.RESTORE, new Date())).toThrow(
      "Invalid garment state transition"
    );
  });

  it("allows retired garments to be restored only through explicit restore", () => {
    expect(getValidGarmentTransitions(GarmentStatus.RETIRED)).toContain(GarmentStateTransitionType.RESTORE);
    expect(transitionGarmentState(garment({ status: GarmentStatus.RETIRED }), GarmentStateTransitionType.RESTORE, new Date()).status).toBe(
      GarmentStatus.CLEAN_AVAILABLE
    );
  });

  it("makes lifecycle availability deterministic", () => {
    const now = new Date("2026-08-24T00:00:00.000Z");
    const dirty = transitionGarmentState(garment({ status: GarmentStatus.CLEAN_AVAILABLE }), GarmentStateTransitionType.SEND_TO_LAUNDRY, now);
    const clean = transitionGarmentState(dirty, GarmentStateTransitionType.MARK_CLEAN_AVAILABLE, now);

    expect(isGarmentEligibleForOutfit(dirty)).toBe(false);
    expect(isGarmentEligibleForOutfit(clean)).toBe(true);
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
