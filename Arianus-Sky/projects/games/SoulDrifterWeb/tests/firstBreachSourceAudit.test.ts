import { describe, expect, it } from "vitest";
import bodyAnchorIntake from "../docs/3d-ai-studio/body-anchor-intake.json";
import modelRegister from "../docs/3d-ai-studio/first-breach-model-register.json";
import sourceAudit from "../docs/3d-ai-studio/first-breach-source-audit.json";

type AuditAsset = (typeof sourceAudit.assets)[number];

function expectPreservedSource(
  assetsByFile: Map<string, AuditAsset>,
  file: string,
  sha256: string,
) {
  const audited = assetsByFile.get(file);
  expect(audited, `${file} must be present in the external intake audit`).toBeDefined();
  expect(audited?.sha256).toBe(sha256);
  expect(audited?.shippingTree).toBe(false);
  expect(audited?.runtimePromotionAllowed).toBe(false);
}

describe("First Breach external GLB source audit", () => {
  const assetsByFile = new Map(sourceAudit.assets.map((asset) => [asset.file, asset]));

  it("inventories the complete preserved issue #448 source library", () => {
    expect(sourceAudit.assetCount).toBe(49);
    expect(sourceAudit.categoryCounts).toEqual({
      body: 12,
      creature: 8,
      gear: 10,
      hair: 12,
      npc: 3,
      wearable: 4,
    });
    expect(sourceAudit.assets).toHaveLength(sourceAudit.assetCount);
    expect(new Set(sourceAudit.assets.map((asset) => asset.file)).size).toBe(sourceAudit.assetCount);
  });

  it("matches every preserved body-anchor hash", () => {
    for (const artifact of bodyAnchorIntake.artifacts) {
      expectPreservedSource(
        assetsByFile,
        artifact.untouchedGlb.file,
        artifact.untouchedGlb.sha256,
      );
    }
  });

  it("matches every modular hair, gear, and wearable conversion hash", () => {
    for (const entry of modelRegister.modularSourceConversions.entries) {
      expectPreservedSource(assetsByFile, entry.exportFile, entry.exportSha256);
    }
  });

  it("matches the three named NPC sources and the accepted corrected Warden", () => {
    const npcTasks = modelRegister.sourceGenerationTasks.filter((task) =>
      [
        "npc-ilyra-image-first-v001",
        "npc-orren-image-first-v001",
        "npc-brannoc-image-first-v001",
      ].includes(task.assetId),
    );

    expect(npcTasks).toHaveLength(3);
    for (const task of npcTasks) {
      if (!("conversion" in task) || !task.conversion) {
        throw new Error(`${task.assetId} is missing its conversion record`);
      }
      expectPreservedSource(
        assetsByFile,
        task.conversion.untouchedExport.file,
        task.conversion.untouchedExport.sha256,
      );
    }

    const warden = modelRegister.sourceGenerationTasks.find(
      (task) => task.assetId === "creature-cinderbound-warden-image-first-v001",
    );
    if (
      !warden
      || !("replacementSourceSet" in warden)
      || !warden.replacementSourceSet?.supersedingConversion
    ) {
      throw new Error("The corrected Warden source record is missing");
    }
    const accepted = warden.replacementSourceSet.supersedingConversion.untouchedExport;
    expectPreservedSource(assetsByFile, accepted.file, accepted.sha256);
  });

  it("proves these are unrigged technicalization sources, not runtime-ready models", () => {
    expect(sourceAudit.gate.provesRuntimeReadiness).toBe(false);
    expect(sourceAudit.gate.requiredNextSteps).toContain(
      "deformation-friendly-retopology-and-pbr-bake",
    );
    expect(sourceAudit.assets.every((asset) => asset.glbVersion === 2)).toBe(true);
    expect(sourceAudit.assets.every((asset) => asset.skins === 0)).toBe(true);
    expect(sourceAudit.assets.every((asset) => asset.joints === 0)).toBe(true);
    expect(sourceAudit.assets.every((asset) => asset.animations.length === 0)).toBe(true);
    expect(sourceAudit.assets.every((asset) => asset.morphTargetSets === 0)).toBe(true);
  });
});
