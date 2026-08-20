import { describe, expect, it } from "vitest";
import ledger from "../docs/animation/mixamo-character-placeholder-ledger.json";

describe("Mixamo temporary NPC character ledger", () => {
  it("keeps temporary stand-ins separate from final named-NPC acceptance", () => {
    expect(ledger.issue).toBe(448);
    expect(ledger.policy.purpose).toBe("temporary-playable-npc-stand-ins");
    expect(ledger.policy.runtimePromotionAllowedAfterLocalAudit).toBe(true);
    expect(ledger.policy.productionAcceptanceAllowed).toBe(false);
    expect(ledger.policy.namedNpcCustomSourcesPreserved).toBe(true);
    expect(ledger.policy.namedNpcCustomReplacementStillRequired).toBe(true);
    expect(ledger.policy.noPaidProviderOperationRequired).toBe(true);
  });

  it("assigns one exact Mixamo source to each First Breach named NPC", () => {
    expect(ledger.namedNpcAssignments.map((entry) => entry.npcId).sort()).toEqual([
      "brannoc",
      "ilyra",
      "orren",
    ]);
    for (const entry of ledger.namedNpcAssignments) {
      expect(entry.temporary).toBe(true);
      expect(entry.state).toBe("selected-awaiting-download");
      expect(entry.mixamoCharacterId).toMatch(/^[0-9a-f-]{36}$/);
      expect(entry.runtimeAssetId).toMatch(/^npc\.placeholder\./);
      expect(entry.expectedDownloadFile).toMatch(/^sd-mixamo-npc-.+-v001\.fbx$/);
    }
  });

  it("uses unique source and runtime IDs across the complete placeholder roster", () => {
    const completeRoster = [...ledger.namedNpcAssignments, ...ledger.backgroundNpcRoster];
    expect(new Set(completeRoster.map((entry) => entry.runtimeAssetId)).size).toBe(
      completeRoster.length,
    );
    expect(new Set(completeRoster.map((entry) => entry.mixamoCharacterId)).size).toBe(
      completeRoster.length,
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
