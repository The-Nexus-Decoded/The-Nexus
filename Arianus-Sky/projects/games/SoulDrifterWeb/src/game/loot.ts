/**
 * Loot rules for the Heartvale outdoor zone.
 *
 * Owner-directed economy contract:
 * - Beasts and monsters drop only loot items: crafting materials and
 *   sellable salvage. They never drop equipment.
 * - Wielders (creatures that fight with weapons, e.g. armed humanoids) may
 *   also drop the basic weapons of the area they are fought in.
 * - Humanoids drop coin, rare armor, and — because they are wielders —
 *   basic area weapons.
 * - Quest mobs and wander mobs use the same tables; only spawn membership
 *   differs (see zoneState.ts phasing).
 */

import type { InventoryItem, WeaponFamily } from "./equipment";

export type LootFamily = "beast" | "humanoid" | "elite-humanoid" | "boss";

export interface CoinDrop {
  min: number;
  max: number;
}

export interface LootTableEntry {
  itemId: string;
  name: string;
  kind: InventoryItem["kind"];
  description: string;
  /** Drop chance in [0, 1]. */
  chance: number;
  quantity: number;
  stackLimit?: number;
  weaponFamily?: WeaponFamily;
  slot?: InventoryItem["slot"];
  /** Minimum quantity when the roll succeeds (quantity is the max). */
  minQuantity?: number;
}

export interface LootTable {
  family: LootFamily;
  coin?: CoinDrop;
  entries: readonly LootTableEntry[];
}

export interface LootRoll {
  coin: number;
  items: Array<Omit<InventoryItem, "equipped">>;
}

interface RandomSource {
  next(): number;
  int(min: number, max: number): number;
}

function mulberry32(seed: number): RandomSource {
  let state = seed >>> 0;
  const next = (): number => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
  };
}

// --- Shared item pool -------------------------------------------------------

const salvage = (itemId: string, name: string, description: string, chance: number, quantity: number): LootTableEntry => ({
  itemId, name, description, chance, quantity,
  kind: "material",
  stackLimit: 20,
});

const MUDCLAW_SHELL = salvage("mat-mudclaw-shell", "Mudclaw Shell", "Dense river-crab plating; armorers buy it by the bundle.", 0.75, 2);
const VIPER_SKIN = salvage("mat-reed-viper-skin", "Reed Viper Skin", "Supple scaled hide for grip-wrap and light leather.", 0.7, 1);
const MOTH_WING = salvage("mat-gossamer-wing", "Gossamer Wing", "A fletcher's prize — sheds dust that dulls arrow wobble.", 0.65, 2);
const THORNBACK_BRISTLE = salvage("mat-thornback-bristle", "Thornback Bristle", "Stiff boar bristle used for brushes, fletching, and snares.", 0.7, 2);
const THORNBACK_TUSK = salvage("mat-thornback-tusk", "Thornback Tusk", "A curved tusk; carvers and alchemists both ask for them.", 0.35, 1);
const GNAWER_PELT = salvage("mat-gnawer-pelt", "Root-Gnawer Pelt", "Thick burrower fur, warm against the vale's river wind.", 0.7, 1);
const ECHO_MOTE = salvage("mat-echo-mote", "Settled Echo Mote", "Residue of a memory that lost its shape. The Well-keepers collect them.", 0.8, 1);
const WIGHT_ASH = salvage("mat-weir-ash", "Weir Ash", "Cold grey silt from the meeting waters; ward-chalk makers grind it fine.", 0.9, 2);

/** Basic area weapons — only ever dropped by wielders. */
const areaWeapon = (itemId: string, name: string, family: WeaponFamily, description: string, chance: number): LootTableEntry => ({
  itemId, name, description, chance, quantity: 1,
  kind: "equipment",
  slot: "mainHand",
  weaponFamily: family,
});

const armor = (itemId: string, name: string, slot: InventoryItem["slot"], description: string, chance: number): LootTableEntry => ({
  itemId, name, slot, description, chance, quantity: 1,
  kind: "equipment",
});

// --- Tables -----------------------------------------------------------------

export const LOOT_TABLES: Readonly<Record<string, LootTable>> = {
  "mudclaw-crab": { family: "beast", entries: [MUDCLAW_SHELL] },
  "reed-viper": { family: "beast", entries: [VIPER_SKIN] },
  "gossamer-moth": { family: "beast", entries: [MOTH_WING] },
  "thornback-boar": { family: "beast", entries: [THORNBACK_BRISTLE, THORNBACK_TUSK] },
  "root-gnawer": { family: "beast", entries: [GNAWER_PELT] },
  "echo-mote-swarm": { family: "beast", entries: [ECHO_MOTE] },
  "toll-road-reiver": {
    family: "humanoid",
    coin: { min: 4, max: 14 },
    entries: [
      areaWeapon("wpn-reiver-cudgel", "Reiver Cudgel", "hammer", "A toll-cudgel taken from the east road. Crude, balanced, usable.", 0.18),
      areaWeapon("wpn-reiver-shiv", "Reiver Shiv", "dagger", "A toll-reek shiv, ground thin from whetstone work.", 0.14),
      armor("arm-reiver-padded-vest", "Reiver Padded Vest", "body", "Layered road-leathers. Rare among common reivers.", 0.05),
    ],
  },
  "unquiet-musterman": {
    family: "humanoid",
    coin: { min: 6, max: 18 },
    entries: [
      areaWeapon("wpn-muster-spear", "Muster-Era Spear", "spear", "A First Demesne muster spear, still sound where the ash kept it dry.", 0.16),
      armor("arm-muster-hauberk", "Tarnished Muster Hauberk", "body", "Ring-mail of the old muster-days. Rarely survives its wearer.", 0.05),
      armor("arm-muster-helm", "Muster-Era Helm", "head", "A dented muster helm with the old crest burned away.", 0.04),
    ],
  },
  "reiver-lieutenant": {
    family: "elite-humanoid",
    coin: { min: 18, max: 40 },
    entries: [
      areaWeapon("wpn-lieutenant-glaive", "Lieutenant's Glaive", "spear", "The east-road camp's better steel, kept for the lieutenants.", 0.3),
      armor("arm-lieutenant-brigandine", "Reiver Brigandine", "body", "Riveted brigandine stripped from a toll wagon.", 0.12),
    ],
  },
  "weirwight": {
    family: "boss",
    coin: { min: 60, max: 120 },
    entries: [
      WIGHT_ASH,
      areaWeapon("wpn-weirwight-harpoon", "Weirwight's Harpoon", "spear", "The drowning spear of the meeting waters, cold to the touch.", 0.5),
      armor("arm-weirwight-shroud", "Shroud of the Meeting Waters", "body", "Ward-woven river cloth. It dries the moment it is lifted.", 0.25),
    ],
  },
  "rootbound-cantor": {
    family: "boss",
    coin: { min: 50, max: 100 },
    entries: [
      ECHO_MOTE,
      areaWeapon("wpn-cantor-staff", "Cantor's Rootwood Staff", "staff", "A humming rootwood staff that remembers being a branch.", 0.5),
      armor("arm-cantor-mantle", "Rootbound Mantle", "body", "Bark-lined mantle that hums faintly near old inscriptions.", 0.25),
    ],
  },
} as const;

/** Deterministic roll so loot is reproducible per kill id and testable. */
export function rollLoot(tableId: string, rollSeed: number): LootRoll {
  const table = LOOT_TABLES[tableId];
  if (!table) throw new Error(`Unknown loot table: ${tableId}`);
  const rng = mulberry32(rollSeed);
  const items: LootRoll["items"] = [];
  for (const entry of table.entries) {
    if (rng.next() > entry.chance) continue;
    const maxQuantity = entry.quantity;
    const minQuantity = Math.min(entry.minQuantity ?? 1, maxQuantity);
    const quantity = maxQuantity === minQuantity ? maxQuantity : rng.int(minQuantity, maxQuantity);
    items.push({
      id: entry.itemId,
      name: entry.name,
      kind: entry.kind,
      slot: entry.slot,
      weaponFamily: entry.weaponFamily,
      quantity,
      stackLimit: entry.stackLimit,
      durability: entry.kind === "equipment" ? 40 : undefined,
      maxDurability: entry.kind === "equipment" ? 40 : undefined,
      description: entry.description,
    });
  }
  const coin = table.coin ? rng.int(table.coin.min, table.coin.max) : 0;
  return { coin, items };
}

/** Rule guards consumed by tests: the economy contract must never drift. */
export function tableRespectsEconomy(table: LootTable): boolean {
  const dropsEquipment = table.entries.some((entry) => entry.kind === "equipment");
  const dropsWeapons = table.entries.some((entry) => entry.slot === "mainHand");
  switch (table.family) {
    case "beast":
      // Beasts: materials only, never equipment, never coin.
      return !dropsEquipment && table.coin === undefined;
    case "humanoid":
    case "elite-humanoid":
      // Humanoids are wielders: coin plus rare armor and basic area weapons.
      return table.coin !== undefined;
    case "boss":
      // Zone bosses are wielder-class encounters with the zone's best drops.
      return table.coin !== undefined && dropsWeapons;
    default:
      return false;
  }
}
