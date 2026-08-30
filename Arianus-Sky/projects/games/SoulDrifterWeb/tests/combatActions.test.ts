import { describe, expect, it } from "vitest";
import {
  BASIC_ATTACK,
  basicAttackDamage,
  basicAttackDecision,
  basicAttackProfileForWeapon,
} from "../src/game/combatActions";

describe("basic weapon attack", () => {
  it("never consumes Stability or class resource", () => {
    expect(BASIC_ATTACK.stabilityCost).toBe(0);
    expect(BASIC_ATTACK.classResourceDelta).toBe(0);
  });

  it("stays weaker than a starter signature while rewarding martial stats", () => {
    expect(basicAttackDamage(8, 10)).toBe(6);
    expect(basicAttackDamage(16, 16)).toBe(9);
    expect(basicAttackDamage(16, 16)).toBeLessThan(11);
  });

  it("gives bows a real ranged profile and a close-range bow strike", () => {
    expect(basicAttackProfileForWeapon("bow")).toEqual({
      minimumRangeMeters: 2,
      maximumRangeMeters: 8,
      closeRangeDecision: "bow-strike",
    });
    expect(basicAttackDecision("bow", 0.5)).toBe("bow-strike");
    expect(basicAttackDecision("bow", 1.75)).toBe("bow-strike");
    expect(basicAttackDecision("bow", 2)).toBe("shoot");
    expect(basicAttackDecision("bow", 4)).toBe("shoot");
  });

  it("does not reroute melee weapon families through bow logic", () => {
    expect(basicAttackProfileForWeapon("sword").maximumRangeMeters).toBe(BASIC_ATTACK.range);
    expect(basicAttackDecision("sword", 0.5)).toBe("melee-strike");
  });
});
