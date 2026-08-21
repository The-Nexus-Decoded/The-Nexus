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

  it("makes the Priest a credible starter mace combatant instead of a heal-only caster", () => {
    expect(basicAttackDamage(6, 6, "priest")).toBe(9);
    expect(basicAttackDamage(6, 6, "mage")).toBe(6);
  });

  it("gives dedicated melee callings stronger level-one weapon basics", () => {
    expect(basicAttackDamage(9, 6, "warrior")).toBe(9);
    expect(basicAttackDamage(6, 9, "slayer")).toBe(9);
    expect(basicAttackDamage(6, 6, "shadowknight")).toBe(9);
  });
});
