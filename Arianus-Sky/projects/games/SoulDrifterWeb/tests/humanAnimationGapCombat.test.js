import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const gameRoot = new URL("../", import.meta.url);
const sourceUrl = new URL(
  "public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb",
  gameRoot,
);
const outputUrl = new URL(
  "public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-gap-combat-candidates.glb",
  gameRoot,
);
const reportUrl = new URL(
  "public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-gap-combat-candidates.provenance.json",
  gameRoot,
);
const scriptUrl = new URL("scripts/build-human-animation-gap-combat.py", gameRoot);

const expectedRequirementIds = [
  "combat.axe.death",
  "combat.bow.cancel",
  "combat.daggers.paired",
  "combat.greatsword.draw-stow",
  "combat.knife.lower-level",
  "combat.mace.lower-level",
  "combat.magic.channel",
  "combat.magic.interrupt-cancel",
  "combat.rod.lower-level",
  "combat.staff.channel-cast",
  "combat.staff.draw-stow",
  "combat.staff.grip-idle",
  "combat.staff.guard-block",
  "combat.staff.melee-family",
  "combat.sword-one-hand.draw-sheath",
  "combat.sword-one-hand.guard-idle",
  "combat.sword-one-hand.horizontal-cut",
  "combat.sword-one-hand.thrust",
  "combat.sword-shield.shield-bash",
  "combat.unarmed.block",
  "combat.unarmed.impact-recovery",
  "combat.unarmed.jab-cross",
  "death.status-elemental",
  "locomotion.knockdown.get-up",
  "reaction.spell.blowback",
  "reaction.spell.get-up",
  "reaction.spell.knockdown",
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function parseGlb(bytes) {
  expect(bytes.toString("ascii", 0, 4)).toBe("glTF");
  expect(bytes.readUInt32LE(4)).toBe(2);
  expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  const jsonLength = bytes.readUInt32LE(12);
  expect(bytes.toString("ascii", 16, 20)).toBe("JSON");
  return JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8").replace(/[\0 ]+$/g, ""));
}

const sourceBytes = readFileSync(fileURLToPath(sourceUrl));
const outputBytes = readFileSync(fileURLToPath(outputUrl));
const report = JSON.parse(readFileSync(fileURLToPath(reportUrl), "utf8"));
const glb = parseGlb(outputBytes);

describe("issue 487 source-derived combat gap supplement", () => {
  it("pins the immutable source, generator, and exact Blender receipt", () => {
    expect(sha256(sourceBytes)).toBe("6B06FCF070E5A282055F4CEE8F406F0DC4D5B0FF3D275DA4BD9D74DAA7C3D793");
    expect(report.sourceLibrary).toMatchObject({
      bytes: sourceBytes.length,
      sha256: sha256(sourceBytes),
      actionCount: 400,
    });
    expect(report.generator).toMatchObject({
      sha256: sha256(readFileSync(fileURLToPath(scriptUrl))),
      blenderVersion: "5.2.1 LTS",
      blenderBuildHash: "9e2066aef7ef",
      blenderBuildDate: "2026-08-25",
      blenderBuildTime: "02:38:20",
    });
  });

  it("proves the output receipt and 65-bone Mixamo re-import contract", () => {
    expect(report.output).toMatchObject({
      bytes: outputBytes.length,
      sha256: sha256(outputBytes),
      actionCount: 50,
    });
    expect(report.skeleton).toMatchObject({
      family: "mixamo-standard-65",
      boneCount: 65,
      rootBones: ["mixamorig:Hips"],
      reimportStatus: "PASS",
      reimportBoneCount: 65,
      reimportRootBones: ["mixamorig:Hips"],
    });
    expect(report.skeleton.maximumRestDifference).toBeLessThanOrEqual(
      report.skeleton.maximumAllowedRestDifference,
    );

    expect(glb.skins).toHaveLength(1);
    expect(glb.skins[0].joints).toHaveLength(65);
    const jointSet = new Set(glb.skins[0].joints);
    const hipsIndex = glb.nodes.findIndex((node) => node.name === "mixamorig:Hips");
    expect(jointSet.has(hipsIndex)).toBe(true);
    const jointParent = glb.nodes.findIndex(
      (node, index) => jointSet.has(index) && (node.children ?? []).includes(hipsIndex),
    );
    expect(jointParent).toBe(-1);
  });

  it("contains 50 uniquely named candidate actions for every assigned semantic row", () => {
    const animationNames = (glb.animations ?? []).map((animation) => animation.name).sort();
    const reportNames = report.candidates.map((candidate) => candidate.derivedActionName).sort();
    expect(animationNames).toHaveLength(50);
    expect(new Set(animationNames).size).toBe(50);
    expect(animationNames).toEqual(reportNames);
    expect(report.candidateCount).toBe(50);
    expect(report.requirementIds).toEqual(expectedRequirementIds);
    expect([...new Set(report.candidates.flatMap((candidate) => candidate.semanticRowIds))].sort()).toEqual(
      expectedRequirementIds,
    );
  });

  it("keeps every derivative honest and preview-gated before BREACH-V2", () => {
    expect(report).toMatchObject({
      status: "UNREVIEWED_SOURCE_DERIVED_CANDIDATES",
      acceptanceClaim: "NONE",
      promotionOrder: [
        "GENERATE_SOURCE_DERIVED_CANDIDATE",
        "RENDER_NEUTRAL_ACCEPTED_BODY_CHAT_PREVIEW",
        "OWNER_APPROVE_REJECT_OR_CHANGE",
        "QUEUE_ONLY_OWNER_APPROVED_CANDIDATES_FOR_BREACH_V2_EXHAUSTIVE_REVIEW",
      ],
    });
    for (const candidate of report.candidates) {
      expect(candidate.status).toBe("UNREVIEWED_SOURCE_DERIVED_CANDIDATE");
      expect(candidate.displayLabel.length).toBeGreaterThan(0);
      expect(candidate.name).toBe(candidate.derivedActionName);
      expect(candidate.semanticRowIds).toEqual(candidate.requirementIds);
      expect(candidate.sourceActions.length).toBeGreaterThan(0);
      for (const sourceAction of candidate.sourceActions) {
        expect(sourceAction.action.length).toBeGreaterThan(0);
        expect(sourceAction.sampledPoseSha256).toMatch(/^[A-F0-9]{64}$/);
      }
      expect(candidate.transformPlanSha256).toMatch(/^[A-F0-9]{64}$/);
      expect(candidate.preExportSampledPoseSha256).toMatch(/^[A-F0-9]{64}$/);
      expect(candidate.reimportSampledPoseSha256).toMatch(/^[A-F0-9]{64}$/);
      expect(["LOOP", "ONE_SHOT"]).toContain(candidate.playIntent);
      expect(candidate.recommendedPreview).toMatchObject({
        playIntent: candidate.playIntent,
        chatPreviewRequired: true,
        ownerVerdictRequiredBeforeBreachV2: true,
      });
      expect(candidate.recommendedPreview.recommendedDurationSeconds).toBeGreaterThan(0);
      expect(candidate.recommendedPreview.recommendedCameraFraming).toContain("neutral accepted-body");
      expect(candidate.remainingGates).toEqual(expect.arrayContaining([
        "NEUTRAL_ACCEPTED_BODY_CHAT_PREVIEW",
        "OWNER_APPROVE_REJECT_OR_CHANGE",
        "BREACH_V2_RUNTIME_GROUNDING",
        "OWNER_ACCEPTANCE",
      ]));
    }
  });
});
