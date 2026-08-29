import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_MANIFEST_URL,
  validateManifest,
} from "../scripts/validate-human-animation-gap-manifest.mjs";

const manifest = JSON.parse(readFileSync(fileURLToPath(DEFAULT_MANIFEST_URL), "utf8"));
const byId = new Map(manifest.requiredNow.map((requirement) => [requirement.id, requirement]));
const gameRootUrl = new URL("../", import.meta.url);

function sha256ForAsset(assetPath) {
  return createHash("sha256").update(readFileSync(new URL(assetPath, gameRootUrl))).digest("hex").toUpperCase();
}

describe("issue 487 Human animation coverage manifest", () => {
  it("proves every named candidate exists in the immutable 400-clip library", () => {
    const result = validateManifest();
    expect(result.errors).toEqual([]);
    expect(result.summary).toMatchObject({
      requiredNow: 111,
      COVERED_NOW: 64,
      PARTIAL: 15,
      MISSING: 32,
      deferredHigherLevel: 5,
      candidateLibraryClips: 400,
      libraryBytes: 32_441_884,
      librarySha256: "6B06FCF070E5A282055F4CEE8F406F0DC4D5B0FF3D275DA4BD9D74DAA7C3D793",
    });
  });

  it("preserves source gaps while reconciling accepted spell and NPC runtime assets", () => {
    const spellBlowback = byId.get("reaction.spell.blowback");
    const spellKnockdown = byId.get("reaction.spell.knockdown");
    const spellGetUp = byId.get("reaction.spell.get-up");
    const locomotionKnockdownGetUp = byId.get("locomotion.knockdown.get-up");
    const npcListen = byId.get("npc.listen");
    const npcFarewell = byId.get("npc.farewell");

    expect(spellBlowback).toMatchObject({
      coverage: "MISSING",
      candidates: [],
      acceptedCoverage: "COVERED",
      runtimeAcceptance: {
        reviewStatus: "IN_GAME_QA_ACCEPTED",
        clipName: "AuthoredReaction__SpellImpactKnockbackAndFall",
        sha256: "6AA99EB932D8DF5FD9A7DF9326482F412863AF86815DC25584292C5DB28C661E",
        technicalContract: { boneCount: 65, rootBone: "mixamorig:Hips" },
      },
    });
    expect(sha256ForAsset(spellBlowback.runtimeAcceptance.assetPath)).toBe(spellBlowback.runtimeAcceptance.sha256);

    expect(spellKnockdown).toMatchObject({
      coverage: "MISSING",
      candidates: [],
      acceptedCoverage: "COVERED_SHARED",
      runtimeAcceptance: {
        sharedWith: "reaction.spell.blowback",
        clipName: "AuthoredReaction__SpellImpactKnockbackAndFall",
        sha256: spellBlowback.runtimeAcceptance.sha256,
      },
    });
    expect(spellKnockdown.runtimeAcceptance.assetPath).toBe(spellBlowback.runtimeAcceptance.assetPath);

    expect(spellGetUp).toMatchObject({ coverage: "MISSING", candidates: [], acceptedCoverage: "MISSING" });
    expect(locomotionKnockdownGetUp).toMatchObject({
      coverage: "MISSING",
      candidates: [],
      acceptedCoverage: "PARTIAL",
      runtimeAcceptance: {
        coveredPart: { sharedWith: "reaction.spell.knockdown" },
        missingPart: { status: "MISSING" },
      },
    });

    expect(npcListen).toMatchObject({
      coverage: "MISSING",
      candidates: [],
      acceptedCoverage: "COVERED",
      runtimeAcceptance: {
        reviewStatus: "IN_GAME_QA_ACCEPTED",
        clipName: "AuthoredUtility__NpcListen",
        sha256: "23615F625DC7C095D5BABF1358075060A6B69CC93FC7453AEDE88A8595F61DD6",
      },
    });
    expect(sha256ForAsset(npcListen.runtimeAcceptance.assetPath)).toBe(npcListen.runtimeAcceptance.sha256);

    expect(npcFarewell).toMatchObject({
      coverage: "MISSING",
      candidates: [],
      acceptedCoverage: "COVERED",
      runtimeAcceptance: {
        reviewStatus: "IN_GAME_QA_ACCEPTED",
        clipName: "AuthoredUtility__Farewell",
        sha256: "760C60A83805918CB4034279998EC85F6A1D41E773F69DF850223DBF013E7F28",
      },
    });
    expect(sha256ForAsset(npcFarewell.runtimeAcceptance.assetPath)).toBe(npcFarewell.runtimeAcceptance.sha256);

    expect(manifest.excludedCoverageSources).toContainEqual(expect.objectContaining({
      id: "death-derived-reversal-gap-combat-candidates",
      sha256: "36545DA597E49F24AC24349F3B9CDB28216A15F4146D7AABD276C67BEABAFD0C",
      acceptanceState: "REJECTED_METHOD",
      coverageContribution: "ZERO",
    }));

    expect(byId.get("combat.staff.melee-family")).toMatchObject({
      coverage: "PARTIAL",
      candidates: ["Interactions__HumanMasculineAthleticMuscularStaffButtSmash"],
    });
    expect(byId.get("combat.staff.grip-idle")).toMatchObject({ coverage: "MISSING", candidates: [] });
    expect(byId.get("combat.staff.guard-block")).toMatchObject({ coverage: "MISSING", candidates: [] });
    expect(byId.get("combat.staff.draw-stow")).toMatchObject({ coverage: "MISSING", candidates: [] });
  });

  it("does not disguise missing lower-level weapon families as generic substitutes", () => {
    expect(byId.get("combat.sword-one-hand.thrust")).toMatchObject({
      coverage: "COVERED_NOW",
      candidates: ["ProSwordAndShield__SwordAndShieldAttack3"],
      equipmentPolicy: expect.stringContaining("shield-hand posture"),
    });
    expect(byId.get("combat.mace.lower-level")).toMatchObject({ coverage: "MISSING", candidates: [] });
    expect(byId.get("combat.knife.lower-level")).toMatchObject({ coverage: "MISSING", candidates: [] });
    expect(byId.get("combat.daggers.paired")).toMatchObject({ coverage: "MISSING", candidates: [] });
    expect(byId.get("combat.rod.lower-level")).toMatchObject({ coverage: "PARTIAL" });
  });

  it("retires generic harvest and keeps tree and plant harvest as separate required gaps", () => {
    expect(byId.has("interaction.harvest")).toBe(false);
    expect(byId.get("interaction.harvest.tree")).toMatchObject({ coverage: "MISSING", candidates: [] });
    expect(byId.get("interaction.harvest.plant")).toMatchObject({ coverage: "MISSING", candidates: [] });
  });

  it("keeps future class signatures out of the issue 487 blocking list", () => {
    expect(byId.has("casting.class-signatures")).toBe(false);
    expect(manifest.deferredHigherLevel).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "casting.class-signatures", scope: "DEFERRED_HIGHER_LEVEL" }),
      expect.objectContaining({ id: "combat.advanced-specializations", scope: "DEFERRED_HIGHER_LEVEL" }),
      expect.objectContaining({ id: "combat.firearms.future-setting", scope: "DEFERRED_HIGHER_LEVEL" }),
    ]));
  });

  it("freezes visual review until every required partial or missing row is resolved", () => {
    expect(manifest.reviewGate).toBe(
      "FROZEN_UNTIL_REQUIRED_NOW_PARTIAL_AND_MISSING_ROWS_HAVE_ACCEPTED_MOTION_CANDIDATES",
    );
    expect(manifest.acceptanceState).toBe("UNREVIEWED_CANDIDATE_LIBRARY");
    expect(manifest.requiredNow.some((requirement) => requirement.coverage !== "COVERED_NOW")).toBe(true);
  });
});
