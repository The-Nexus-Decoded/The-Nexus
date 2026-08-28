import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_MANIFEST_URL,
  validateManifest,
} from "../scripts/validate-human-animation-gap-manifest.mjs";

const manifest = JSON.parse(readFileSync(fileURLToPath(DEFAULT_MANIFEST_URL), "utf8"));
const byId = new Map(manifest.requiredNow.map((requirement) => [requirement.id, requirement]));

describe("issue 487 Human animation coverage manifest", () => {
  it("proves every named candidate exists in the immutable 400-clip library", () => {
    const result = validateManifest();
    expect(result.errors).toEqual([]);
    expect(result.summary).toMatchObject({
      requiredNow: 110,
      COVERED_NOW: 64,
      PARTIAL: 15,
      MISSING: 31,
      deferredHigherLevel: 5,
      candidateLibraryClips: 400,
      libraryBytes: 32_441_884,
      librarySha256: "6B06FCF070E5A282055F4CEE8F406F0DC4D5B0FF3D275DA4BD9D74DAA7C3D793",
    });
  });

  it("keeps the owner-called-out spell blowback, fall, and staff gaps explicit", () => {
    expect(byId.get("reaction.spell.blowback")).toMatchObject({ coverage: "MISSING", candidates: [] });
    expect(byId.get("reaction.spell.knockdown")).toMatchObject({ coverage: "MISSING", candidates: [] });
    expect(byId.get("reaction.spell.get-up")).toMatchObject({ coverage: "MISSING", candidates: [] });
    expect(byId.get("combat.staff.melee-family")).toMatchObject({
      coverage: "PARTIAL",
      candidates: ["Interactions__HumanMasculineAthleticMuscularStaffButtSmash"],
    });
    expect(byId.get("combat.staff.grip-idle")).toMatchObject({ coverage: "MISSING", candidates: [] });
    expect(byId.get("combat.staff.guard-block")).toMatchObject({ coverage: "MISSING", candidates: [] });
    expect(byId.get("combat.staff.draw-stow")).toMatchObject({ coverage: "MISSING", candidates: [] });
  });

  it("does not disguise missing lower-level weapon families as generic substitutes", () => {
    expect(byId.get("combat.sword-one-hand.thrust")).toMatchObject({ coverage: "MISSING", candidates: [] });
    expect(byId.get("combat.mace.lower-level")).toMatchObject({ coverage: "MISSING", candidates: [] });
    expect(byId.get("combat.knife.lower-level")).toMatchObject({ coverage: "MISSING", candidates: [] });
    expect(byId.get("combat.daggers.paired")).toMatchObject({ coverage: "MISSING", candidates: [] });
    expect(byId.get("combat.rod.lower-level")).toMatchObject({ coverage: "PARTIAL" });
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
