// Quick test for race-class-perk system
const CLASSES = [
  { name: "Warrior", chance: 30, skill: "Berserker" },
  { name: "Mage", chance: 30, skill: "Meteor Swarm" },
  { name: "Priest", chance: 12.5, skill: "Holy Arrow" },
  { name: "Sharpshooter", chance: 12.5, skill: "Multishot" },
  { name: "Summoner", chance: 5, skill: "Summon Minion" },
  { name: "Paladin", chance: 5, skill: "Thor's Hammer" },
  { name: "Asura", chance: 2.5, skill: "Mindburn" },
  { name: "Slayer", chance: 2.5, skill: "Backstab" },
];

const REALM_DROPS = {
  "Arianus-Sky": { common: "Potion of Swiftness", uncommon: "Potion of Recovery", rare: "Potion of Gluttony" },
  "Chelestra-Sea": { common: "Shadow Walk", uncommon: "Shadow Assault", rare: "Shadow Overlord" },
  "Pryan-Fire": { common: "Spear of Fire", uncommon: "Spear of Flame", rare: "Spear of Inferno" },
  "Abarrach-Earth": { common: "Demonic Blast", uncommon: "Demonic Wave", rare: "Demonic Nova" },
  "Labyrinth": { common: "Summon Brown Bear", uncommon: "Summon Lesser Daemon", rare: "Summon Ancient Wyrm" },
};

function rollClass() {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const cls of CLASSES) {
    cumulative += cls.chance;
    if (roll <= cumulative) return cls;
  }
  return CLASSES[0];
}

function getRealmDrop(realm, roll = Math.random()) {
  const drops = REALM_DROPS[realm];
  if (!drops) return "";
  if (roll < 0.80) return drops.common;
  if (roll < 0.95) return drops.uncommon;
  return drops.rare;
}

// Test
console.log("=== 10 Class Rolls ===");
for (let i = 0; i < 10; i++) {
  const cls = rollClass();
  console.log(`Roll ${i+1}: ${cls.name} -> ${cls.skill}`);
}

console.log("\n=== Realm Drops (Arianus-Sky) ===");
console.log("Common (80%):", getRealmDrop("Arianus-Sky", 0.5));
console.log("Uncommon (15%):", getRealmDrop("Arianus-Sky", 0.85));
console.log("Rare (5%):", getRealmDrop("Arianus-Sky", 0.97));

console.log("\n=== All Realm Drops ===");
for (const realm of Object.keys(REALM_DROPS)) {
  console.log(`${realm}: ${getRealmDrop(realm, 0.1)} / ${getRealmDrop(realm, 0.85)} / ${getRealmDrop(realm, 0.97)}`);
}
