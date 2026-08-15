import { describe, expect, it } from "vitest";
import {
  applyDestructibleHit,
  interactionCapability,
  planInteractionRequest,
  portcullisFrame,
  trialGatePresentation,
} from "../src/game/interactionFlow";

describe("shared interaction and passage boundaries", () => {
  it("auto-approaches distant targets but requires an explicit prompt confirmation in range", () => {
    expect(planInteractionRequest({ distance: 4, canApproach: true })).toEqual({
      action: "approach",
      showPromptAfterApproach: true,
    });
    expect(planInteractionRequest({ distance: 1, canApproach: true })).toEqual({
      action: "prompt",
      showPromptAfterApproach: false,
    });
    expect(planInteractionRequest({ distance: 4, canApproach: false })).toEqual({
      action: "disabled",
      reason: "No clear approach remains around that obstruction.",
      showPromptAfterApproach: false,
    });
  });

  it("classifies ordinary props as destructible and quest-critical objects as protected", () => {
    expect(interactionCapability("crate")).toMatchObject({ destructible: true, questCritical: false, maxHp: 6 });
    expect(interactionCapability("bench")).toMatchObject({ destructible: true, questCritical: false });
    expect(interactionCapability("chest")).toMatchObject({ destructible: true, questCritical: false });
    expect(interactionCapability("memory-loom")).toMatchObject({
      destructible: false,
      questCritical: true,
      protectionReason: expect.stringContaining("quest"),
    });
    expect(interactionCapability("gate")).toMatchObject({ destructible: false, questCritical: true });
  });

  it("produces deterministic breakage and possible loot without damaging protected props", () => {
    expect(applyDestructibleHit({ kind: "crate", hp: 4, damage: 5, seed: 4 })).toEqual({
      hp: 0,
      destroyed: true,
      loot: "splintered-supply-cache",
    });
    expect(applyDestructibleHit({ kind: "memory-loom", hp: 1, damage: 99, seed: 4 })).toEqual({
      hp: 1,
      destroyed: false,
      loot: null,
      protectionReason: expect.stringContaining("quest"),
    });
  });

  it("keeps collision sealed until a vertical portcullis is visibly clear", () => {
    expect(portcullisFrame({ progress: 0.5, closedY: 1.35, liftHeight: 3.5 })).toEqual({
      y: 3.1,
      blocksMovement: true,
      state: "lifting",
    });
    expect(portcullisFrame({ progress: 0.94, closedY: 1.35, liftHeight: 3.5 })).toMatchObject({
      blocksMovement: false,
      state: "open",
    });
  });

  it("labels both trial gates with difficulty and reward before choice", () => {
    expect(trialGatePresentation("wayfarer")).toMatchObject({
      difficultyLabel: "Standard",
      rewardLabel: expect.stringContaining("Wayfarer"),
    });
    expect(trialGatePresentation("oathbreaker")).toMatchObject({
      difficultyLabel: "Severe",
      rewardLabel: expect.stringContaining("Oathbreaker"),
    });
  });
});
