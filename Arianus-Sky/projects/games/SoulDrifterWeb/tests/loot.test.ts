import { describe, expect, it } from "vitest";

import { LOOT_TABLES, rollLoot, tableRespectsEconomy } from "../src/game/loot";

describe("loot economy contract", () => {
  it("every table respects the owner-directed economy rules", () => {
    for (const table of Object.values(LOOT_TABLES)) {
      expect(tableRespectsEconomy(table), table.family).toBe(true);
    }
  });

  it("beasts drop only materials — never equipment, never coin", () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      for (const [tableId, table] of Object.entries(LOOT_TABLES)) {
        if (table.family !== "beast") continue;
        const roll = rollLoot(tableId, seed);
        expect(roll.coin).toBe(0);
        expect(roll.items.every((item) => item.kind === "material")).toBe(true);
      }
    }
  });

  it("humanoids drop coin every time and armor rarely", () => {
    let armorDrops = 0;
    let weaponDrops = 0;
    for (let seed = 1; seed <= 300; seed += 1) {
      const roll = rollLoot("toll-road-reiver", seed);
      expect(roll.coin).toBeGreaterThanOrEqual(4);
      expect(roll.coin).toBeLessThanOrEqual(14);
      if (roll.items.some((item) => item.slot === "body")) armorDrops += 1;
      if (roll.items.some((item) => item.slot === "mainHand")) weaponDrops += 1;
    }
    // ~5% armor chance: over 300 deterministic seeds it must appear, but stay rare.
    expect(armorDrops).toBeGreaterThan(0);
    expect(armorDrops).toBeLessThan(45);
    expect(weaponDrops).toBeGreaterThan(0);
  });

  it("weapons only ever come from wielder (humanoid/elite/boss) tables", () => {
    for (const [tableId, table] of Object.entries(LOOT_TABLES)) {
      const hasWeapons = table.entries.some((entry) => entry.slot === "mainHand");
      if (table.family === "beast") expect(hasWeapons, tableId).toBe(false);
    }
  });

  it("rolls are deterministic per kill seed", () => {
    expect(rollLoot("unquiet-musterman", 42)).toEqual(rollLoot("unquiet-musterman", 42));
    expect(rollLoot("unquiet-musterman", 42)).not.toEqual(rollLoot("unquiet-musterman", 43));
  });

  it("zone bosses always pay coin and carry the zone's signature drops", () => {
    for (const tableId of ["weirwight", "rootbound-cantor"]) {
      const roll = rollLoot(tableId, 7);
      expect(roll.coin).toBeGreaterThan(0);
      const table = LOOT_TABLES[tableId]!;
      expect(table.entries.some((entry) => entry.slot === "mainHand")).toBe(true);
      expect(table.entries.some((entry) => entry.slot === "body")).toBe(true);
    }
  });

  it("rejects unknown tables", () => {
    expect(() => rollLoot("dragon", 1)).toThrow();
  });
});
