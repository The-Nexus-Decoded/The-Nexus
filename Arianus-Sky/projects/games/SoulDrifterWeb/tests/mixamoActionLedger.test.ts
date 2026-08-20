import { describe, expect, it } from "vitest";
import actionLedger from "../docs/animation/mixamo-action-ledger.json";
import deathLedger from "../docs/animation/mixamo-death-ledger.json";

describe("Mixamo game-foundation action ledger", () => {
  it("preserves a broad non-death roster with stable unique action and source IDs", () => {
    expect(actionLedger.issue).toBe(448);
    expect(actionLedger.uniqueMotionCount).toBe(actionLedger.motions.length);
    expect(actionLedger.uniqueMotionCount).toBeGreaterThanOrEqual(350);
    expect(actionLedger.coreMotionCount).toBeGreaterThanOrEqual(150);
    expect(new Set(actionLedger.motions.map((motion) => motion.actionId)).size).toBe(
      actionLedger.motions.length,
    );
    expect(new Set(actionLedger.motions.map((motion) => motion.mixamoId)).size).toBe(
      actionLedger.motions.length,
    );
  });

  it("covers locomotion, interaction, combat, magic, reaction, recovery, and social families", () => {
    const covered = new Set(actionLedger.familyCoverage.map((entry) => entry.familyId));
    expect(covered.size).toBeGreaterThanOrEqual(25);
    for (const familyId of [
      "locomotion.idle",
      "locomotion.ground",
      "locomotion.crouch-stealth",
      "traversal.air",
      "dodge.evasion",
      "interaction.door-container",
      "interaction.pickup-carry",
      "interaction.world-controls",
      "interaction.posture-rest",
      "interaction.work-craft",
      "combat.unarmed",
      "combat.sword-one-hand",
      "combat.sword-shield",
      "combat.greatsword",
      "combat.dagger-dual",
      "combat.axe",
      "combat.bow",
      "combat.equipment-transitions",
      "magic.casting",
      "magic.heal-buff-ward",
      "reaction.hit-block",
      "reaction.recovery",
      "social.dialogue-emote",
    ]) {
      expect(covered.has(familyId), familyId).toBe(true);
      expect(actionLedger.familyCoverage.find((entry) => entry.familyId === familyId)?.selected)
        .toBeGreaterThan(0);
    }
  });

  it("keeps every catalog entry pending visual and canonical-rig QA", () => {
    for (const motion of actionLedger.motions) {
      expect(motion.acquisition).toEqual({
        state: "cataloged-not-downloaded",
        format: "FBX Binary",
        skin: "Without Skin",
        fps: 30,
        keyframeReduction: "none",
      });
      expect(motion.runtime).toMatchObject({
        state: "candidate-needs-visual-review",
        stableActionId: true,
        canonicalHumanoidRetargetRequired: true,
      });
    }
  });

  it("retains all deaths separately and declares Mixamo coverage gaps for local authoring", () => {
    expect(deathLedger.uniqueDeathMotionCount).toBe(42);
    expect(actionLedger.selectionPolicy.deathAnimationsOwnedBy).toBe(
      "docs/animation/mixamo-death-ledger.json",
    );
    const sparse = new Map(
      actionLedger.sparseOrMissingFamilies.map((entry) => [entry.familyId, entry]),
    );
    for (const familyId of [
      "combat.mace-hammer",
      "combat.spear-polearm",
      "combat.crossbow",
      "combat.staff",
    ]) {
      expect(sparse.get(familyId)?.resolution).toMatch(/locally author|local/i);
    }
  });
});
