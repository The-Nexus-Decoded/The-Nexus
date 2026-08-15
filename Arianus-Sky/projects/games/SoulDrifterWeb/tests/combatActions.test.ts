import { describe, expect, it } from "vitest";
import { BASIC_ATTACK, basicAttackDamage } from "../src/game/combatActions";

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
});
