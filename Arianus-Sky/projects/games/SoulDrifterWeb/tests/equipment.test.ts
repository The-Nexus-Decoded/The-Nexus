import { describe, expect, it } from "vitest";
import { CALLINGS } from "../src/game/character";
import {
  COMMON_STARTER_OUTFIT,
  STARTER_BACKPACK_SLOTS,
  STARTER_LOADOUTS,
  WEAPON_EXAMPLES,
  addInventoryItem,
  backpackSlotsUsed,
  canMoveToBackpack,
  createStarterBackpackCapacity,
  createStarterInventory,
  equippedUsableWeapon,
  resolveWeaponUse,
  setItemEquipped,
  totalBackpackSlots,
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

  it("spawns every calling with a usable equipped starter weapon and lets equipment state disable it", () => {
    for (const calling of CALLINGS) {
      const inventory = createStarterInventory(calling.id);
      const weapon = equippedUsableWeapon(inventory);
      expect(weapon?.name).toBe(STARTER_LOADOUTS[calling.id].weapon);
      expect(weapon?.slot).toBe("mainHand");
      expect(weapon?.durability).toBeGreaterThan(0);
      setItemEquipped(inventory, weapon!.id, false);
      expect(equippedUsableWeapon(inventory)).toBeUndefined();
    }
  });

  it("starts with a separate expandable 30-slot backpack", () => {
    const capacity = createStarterBackpackCapacity();
    const inventory = createStarterInventory("shadowknight");

    expect(totalBackpackSlots(capacity)).toBe(STARTER_BACKPACK_SLOTS);
    expect(backpackSlotsUsed(inventory)).toBe(0);

    capacity.earnedSlots = 4;
    capacity.entitlementSlots = 6;
    expect(totalBackpackSlots(capacity)).toBe(40);
  });

  it("uses one backpack slot per item stack and prevents overflow", () => {
    const capacity = { baseSlots: 2, earnedSlots: 0, entitlementSlots: 0 };
    const inventory = createStarterInventory("shadowknight");
    const band = {
      id: "recovery-band",
      name: "Recovery Band",
      kind: "consumable" as const,
      quantity: 2,
      stackLimit: 10,
      description: "A small recovery item.",
    };

    expect(addInventoryItem(inventory, band, capacity)).toEqual({ added: true, stacked: false });
    expect(addInventoryItem(inventory, { ...band, quantity: 3 }, capacity)).toEqual({ added: true, stacked: true });
    expect(inventory.find((item) => item.id === band.id)?.quantity).toBe(5);
    expect(backpackSlotsUsed(inventory)).toBe(1);

    expect(addInventoryItem(inventory, {
      id: "quest-token",
      name: "Quest Token",
      kind: "quest",
      description: "A quest item.",
    }, capacity).added).toBe(true);
    expect(canMoveToBackpack(inventory, capacity)).toBe(false);
    expect(addInventoryItem(inventory, {
      id: "vendor-purchase",
      name: "Vendor Purchase",
      kind: "material",
      description: "A purchased item.",
    }, capacity)).toEqual({ added: false, stacked: false, reason: "full" });
  });
});
