import { describe, expect, it } from "vitest";
import ledger from "../docs/animation/mixamo-character-placeholder-ledger.json";

describe("Mixamo temporary NPC character ledger", () => {
  it("allows audited Mixamo fallbacks without accepting them as production named NPCs", () => {
    expect(ledger.issue).toBe(448);
    expect(ledger.policy.purpose).toBe("background-npc-placeholders-and-catalog-provenance");
    expect(ledger.policy.runtimePromotionAllowedAfterLocalAudit).toBe(true);
    expect(ledger.policy.productionAcceptanceAllowed).toBe(false);
    expect(ledger.policy.namedNpcCustomSourcesPreserved).toBe(true);
    expect(ledger.policy.namedNpcCustomReplacementStillRequired).toBe(true);
    expect(ledger.policy.namedNpcAssemblyMode).toBe("canonical-race-rig-modular-identity");
    expect(ledger.policy.mixamoNamedNpcUseAllowed).toBe(true);
    expect(ledger.policy.namedNpcFullBodyExportRequired).toBe(true);
    expect(ledger.policy.bodyProfileDistribution).toEqual(
      expect.objectContaining({ heavyPopulationTargetPercent: "10-15", defaultProfile: "athletic" }),
    );
    expect(ledger.policy.noPaidProviderOperationRequired).toBe(true);
  });

  it("tracks rejected named NPC visuals against role-appropriate replacement profiles", () => {
    const knownHeadAssetIds = new Set([
      "head-european-feminine-v001",
      "head-south-asian-indian-masculine-v001",
      "head-european-masculine-v001",
    ]);
    expect(ledger.namedNpcAssemblies.map((entry) => entry.npcId).sort()).toEqual([
      "brannoc",
      "ilyra",
      "orren",
    ]);
    expect(ledger.namedNpcAssemblies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ npcId: "ilyra", ancestry: "human", presentation: "feminine" }),
        expect.objectContaining({ npcId: "orren", ancestry: "elf", presentation: "masculine" }),
        expect.objectContaining({ npcId: "brannoc", ancestry: "dwarf", presentation: "masculine" }),
      ]),
    );
    expect(ledger.namedNpcAssemblies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ npcId: "ilyra", requiredReplacementBodyProfile: "heavy-older-character-specific" }),
        expect.objectContaining({ npcId: "orren", requiredReplacementBodyProfile: "lean-athletic" }),
        expect.objectContaining({ npcId: "brannoc", requiredReplacementBodyProfile: "stocky-athletic-dwarf" }),
      ]),
    );
    for (const entry of ledger.namedNpcAssemblies) {
      expect(entry.visualAcceptance).toBe(false);
      expect(entry.state).toMatch(/(?:textured-rig-merge|visual-rebuild)-required/);
      expect(entry.runtimeAssetId).toMatch(/^npc\.named\./);
      expect(entry.runtimeModelPath).toMatch(
        /^\/assets\/3d\/local-derived\/issue-448\/named-npcs\/sd-npc-.+-canonical-v001\.glb$/,
      );
      expect(entry.bodyRigAssetId).toMatch(new RegExp(`^body-${entry.ancestry}-${entry.presentation}-`));
      expect(knownHeadAssetIds.has(entry.headAssetId)).toBe(true);
      expect(entry).not.toHaveProperty("mixamoCharacterId");
    }
  });

  it("uses unique Mixamo sources and runtime IDs for the background roster", () => {
    expect(new Set(ledger.backgroundNpcRoster.map((entry) => entry.runtimeAssetId)).size).toBe(
      ledger.backgroundNpcRoster.length,
    );
    expect(new Set(ledger.backgroundNpcRoster.map((entry) => entry.mixamoCharacterId)).size).toBe(
      ledger.backgroundNpcRoster.length,
    );
    expect(ledger.backgroundNpcRoster.length).toBeGreaterThanOrEqual(8);
  });

  it("requires texture, deformation, clipping, and provenance gates before runtime use", () => {
    expect(ledger.policy.requiredDownload).toEqual({
      format: "FBX Binary",
      pose: "T-pose-or-neutral-bind-pose",
      skin: "With Skin",
      fps: 30,
      keyframeReduction: "none",
    });
    expect(ledger.policy.requiredLocalAudit).toEqual(
      expect.arrayContaining([
        "exact-source-id-and-file-sha-recorded",
        "embedded-or-sidecar-textures-resolve",
        "idle-walk-run-turn-deformation",
        "conversation-camera-identity-match",
        "weapon-and-clothing-clipping",
        "license-provenance-retained",
      ]),
    );
  });
});
