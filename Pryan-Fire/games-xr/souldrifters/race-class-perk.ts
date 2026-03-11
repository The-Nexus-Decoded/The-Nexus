/**
 * Soul Drifters - Race/Class/Perk System
 * Based on: /data/openclaw/shared/souldrifters/game-specs.json
 */

export interface Race {
  name: string;
  realms: string[];
  professions: string[];
  perk: string;
  unlock?: string; // 'later' for advanced races
}

export interface GameClass {
  name: string;
  chance: number;
  skill: string;
  unlock: string; // 'all' or specific race
  theme?: string;
}

export interface Realm {
  name: string;
  element: string | null;
  races: string[];
}

// Class Rarity Weights (total = 100%)
export const CLASSES: GameClass[] = [
  { name: "Warrior", chance: 30, skill: "Berserker", unlock: "all" },
  { name: "Mage", chance: 30, skill: "Meteor Swarm", unlock: "all" },
  { name: "Priest", chance: 12.5, skill: "Holy Arrow", unlock: "all" },
  { name: "Sharpshooter", chance: 12.5, skill: "Multishot", unlock: "all" },
  { name: "Summoner", chance: 5, skill: "Summon Minion", unlock: "all" },
  { name: "Paladin", chance: 5, skill: "Thor's Hammer", unlock: "all" },
  { name: "Asura", chance: 2.5, skill: "Mindburn", unlock: "all" },
  { name: "Slayer", chance: 2.5, skill: "Backstab", unlock: "all" },
];

// Unlockable classes (Sartan/Patryn only)
export const UNLOCKABLE_CLASSES: GameClass[] = [
  { name: "Lightbearer", chance: 0, skill: "Holy Arrow", theme: "Sartan light", unlock: "Sartan" },
  { name: "Beastlord", chance: 0, skill: "Summon Minion", theme: "Patryn beasts", unlock: "Patryn" },
];

// Initial races (selectable at game start)
export const INITIAL_RACES: Race[] = [
  { name: "Elf", realms: ["Arianus-Sky"], professions: ["Conjuring"], perk: "Potion of Swiftness" },
  { name: "Dwarf", realms: ["Arianus-Sky", "Pryan-Fire"], professions: ["Mechanic"], perk: "Spear of Fire" },
  { name: "Human", realms: ["Arianus-Sky"], professions: ["Conjuring"], perk: "Potion of Swiftness" },
  { name: "Durnai", realms: ["Chelestra-Sea"], professions: ["Thievery"], perk: "Shadow Walk" },
  { name: "Titan", realms: ["Pryan-Fire"], professions: ["Mechanic"], perk: "Spear of Fire" },
];

// Advanced races (unlock later)
export const ADVANCED_RACES: Race[] = [
  { name: "Patryn", realms: ["Labyrinth"], professions: ["Beast Tamer", "Gardening"], perk: "Summon Brown Bear", unlock: "later" },
  { name: "Sartan", realms: ["all"], professions: ["Light Magic"], perk: "Radiant Blessing", unlock: "later" },
];

// Realms with drops
export const REALMS: Realm[] = [
  { name: "Arianus-Sky", element: "Air", races: ["Elf", "Dwarf", "Human"] },
  { name: "Chelestra-Sea", element: "Water", races: ["Durnai"] },
  { name: "Pryan-Fire", element: "Fire", races: ["Dwarf", "Titan"] },
  { name: "Abarrach-Earth", element: "Stone", races: [] },
  { name: "Labyrinth", element: null, races: ["Patryn"] },
];

// Realm drops (profession -> drop tiers)
export interface RealmDrop {
  profession: string;
  drops: {
    common: string;   // 80%
    uncommon: string; // 15%
    rare: string;     // 5%
  };
}

export const REALM_DROPS: Record<string, RealmDrop> = {
  "Arianus-Sky": {
    profession: "Conjuring",
    drops: { common: "Potion of Swiftness", uncommon: "Potion of Recovery", rare: "Potion of Gluttony" }
  },
  "Chelestra-Sea": {
    profession: "Thievery",
    drops: { common: "Shadow Walk", uncommon: "Shadow Assault", rare: "Shadow Overlord" }
  },
  "Pryan-Fire": {
    profession: "Mechanic",
    drops: { common: "Spear of Fire", uncommon: "Spear of Flame", rare: "Spear of Inferno" }
  },
  "Abarrach-Earth": {
    profession: "Dark Magic",
    drops: { common: "Demonic Blast", uncommon: "Demonic Wave", rare: "Demonic Nova" }
  },
  "Labyrinth": {
    profession: "Beast Tamer",
    drops: { common: "Summon Brown Bear", uncommon: "Summon Lesser Daemon", rare: "Summon Ancient Wyrm" }
  },
};

// Roll for a random class based on rarity weights
export function rollClass(): GameClass {
  const roll = Math.random() * 100;
  let cumulative = 0;
  
  for (const cls of CLASSES) {
    cumulative += cls.chance;
    if (roll <= cumulative) {
      return cls;
    }
  }
  return CLASSES[0]; // Fallback
}

// Get available races for a realm
export function getRacesForRealm(realmName: string): Race[] {
  return [...INITIAL_RACES, ...ADVANCED_RACES].filter(r => 
    r.realms.includes(realmName) || r.realms.includes("all")
  );
}

// Get drop for a realm based on roll
export function getRealmDrop(realmName: string, roll: number = Math.random()): string {
  const realmDrop = REALM_DROPS[realmName];
  if (!realmDrop) return "";
  
  if (roll < 0.80) return realmDrop.drops.common;
  if (roll < 0.95) return realmDrop.drops.uncommon;
  return realmDrop.drops.rare;
}

// Check if race can use class
export function canUseClass(race: string, gameClass: GameClass): boolean {
  if (gameClass.unlock === "all") return true;
  
  const advancedRaces = ADVANCED_RACES.map(r => r.name);
  return advancedRaces.includes(race) && gameClass.unlock === race;
}

export const RULES = {
  race_class_restrictions: false,
  advanced_unlock: "Sartan, Patryn",
};
