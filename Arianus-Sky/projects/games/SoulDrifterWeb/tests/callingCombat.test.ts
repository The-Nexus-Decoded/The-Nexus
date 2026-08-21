import { describe, expect, it } from "vitest";
import { CALLINGS } from "../src/game/character";
import { CALLING_COMBAT_CONTRACTS } from "../src/game/callingCombat";
import { STARTER_LOADOUTS } from "../src/game/equipment";

describe("calling combat contracts", () => {
  it("defines a complete starter combat contract for every calling", () => {
    const callingIds = CALLINGS.map((calling) => calling.id);

    expect(Object.keys(CALLING_COMBAT_CONTRACTS).sort()).toEqual([...callingIds].sort());
    for (const callingId of callingIds) {
      const contract = CALLING_COMBAT_CONTRACTS[callingId];
      expect(contract.callingId).toBe(callingId);
      expect(contract.weaponFamily).toBe(STARTER_LOADOUTS[callingId].weaponFamily);
      expect(contract.basicName.length).toBeGreaterThan(0);
      expect(contract.basicMotion.clipNames.length).toBeGreaterThan(0);
      expect(contract.signatureClipNames.length).toBeGreaterThan(0);
      expect(contract.defenseClipNames.length).toBeGreaterThan(0);
      expect(contract.basicMotion.hit.reachTiles).toBe(contract.basicRange);
    }
  });

  it("keeps ranged and melee hit timing semantically distinct", () => {
    for (const contract of Object.values(CALLING_COMBAT_CONTRACTS)) {
      const ranged = contract.basicRange > 1;
      expect(contract.basicMotion.hit.shape).toBe(ranged ? "projectile" : "frontal-arc");
      expect(contract.basicMotion.timing.event.kind).toBe(ranged ? "release" : "contact");
    }
    expect(CALLING_COMBAT_CONTRACTS.sharpshooter.basicRange).toBe(5);
    expect(CALLING_COMBAT_CONTRACTS.summoner.basicRange).toBe(4);
  });

  it("authors the two starter off-hand arrangements explicitly", () => {
    expect(CALLING_COMBAT_CONTRACTS.paladin.offhand).toBe("shield");
    expect(CALLING_COMBAT_CONTRACTS.slayer.offhand).toBe("second-weapon");
    for (const callingId of ["warrior", "mage", "priest", "sharpshooter", "summoner", "asura", "shadowknight"] as const) {
      expect(CALLING_COMBAT_CONTRACTS[callingId].offhand).toBe("none");
    }
  });
});
