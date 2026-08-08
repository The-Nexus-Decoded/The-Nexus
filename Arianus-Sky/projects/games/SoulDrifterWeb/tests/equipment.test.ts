import { describe, expect, it } from "vitest";
import { CALLINGS } from "../src/game/character";
import {
  COMMON_STARTER_OUTFIT,
  STARTER_LOADOUTS,
  WEAPON_EXAMPLES,
  resolveWeaponUse,
} from "../src/game/equipment";

describe("universal weapons and starter loadouts", () => {
  it("gives every calling the same humble outfit and one mundane class-readable weapon", () => {
    expect(Object.keys(STARTER_LOADOUTS)).toHaveLength(CALLINGS.length);
    for (const calling of CALLINGS) {
      expect(STARTER_LOADOUTS[calling.id].outfit).toBe(COMMON_STARTER_OUTFIT);
      expect(STARTER_LOADOUTS[calling.id].weapon.length).toBeGreaterThan(0);
    }
    expect(STARTER_LOADOUTS.paladin.offhand).toBe("Battered wooden shield");
    expect(STARTER_LOADOUTS.shadowknight.weapon).toBe("Battered iron longsword");
  });

  it("lets any calling equip a Fire Staff while keeping Mage-only channels dormant", () => {
    const fireStaff = WEAPON_EXAMPLES.find((weapon) => weapon.id === "basic-fire-staff")!;
    const mage = resolveWeaponUse(fireStaff, "mage", ["Staff Sweep"]);
    const warrior = resolveWeaponUse(fireStaff, "warrior", ["Staff Sweep"]);

    expect(mage.canEquip).toBe(true);
    expect(mage.activeModifiers.map((modifier) => modifier.stat)).toEqual(["power", "fire"]);
    expect(mage.grantedSpells.map((spell) => spell.name)).toEqual(["Kindle Lance"]);
    expect(warrior.canEquip).toBe(true);
    expect(warrior.activeModifiers).toHaveLength(0);
    expect(warrior.dormantSpells.map((spell) => spell.name)).toEqual(["Kindle Lance"]);
    expect(warrior.availableSkills).toEqual(["Staff Sweep"]);
  });

  it("activates item stats independently for one or several listed callings", () => {
    const sword = WEAPON_EXAMPLES.find((weapon) => weapon.id === "sword-of-the-heavens")!;
    const paladin = resolveWeaponUse(sword, "paladin");
    const shadowknight = resolveWeaponUse(sword, "shadowknight");
    const mage = resolveWeaponUse(sword, "mage");

    expect(paladin.activeModifiers.map((modifier) => modifier.stat)).toEqual(["holyPower", "speed"]);
    expect(shadowknight.activeModifiers.map((modifier) => modifier.stat)).toEqual(["speed"]);
    expect(mage.activeModifiers).toHaveLength(0);
    expect(mage.canEquip).toBe(true);
  });
});
