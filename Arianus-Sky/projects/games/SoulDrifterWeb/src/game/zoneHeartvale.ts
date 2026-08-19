/**
 * Zone 2 — the Heartvale basin of Thalenyr: content authority.
 *
 * Everything the outdoor zone contains is authored here as data: anchors,
 * monsters, spawn areas, NPCs with dialogue, quests, puzzles, escorts, and
 * the per-player world phasing that fires when a quest is turned in.
 *
 * Scale is identical to the Houdini pipeline
 * (scripts/houdini/export-heartvale-soulwell-layout.mjs):
 *   1 tile = 1.75 m · 1 atlas unit = 5 tiles · zone grid 160 × 160
 *   zone origin = atlas (38.0, 24.0) · world origin = Soul Well terrace (grid 40, 72.5)
 *
 * Canon sources: public/lore-atlas/data.js (read-only) and
 * RUNBOOK-heartvale-outdoor-zone.md. Realm law: Thalenyr, "The Verdant
 * Echo" — the land remembers; recovered memories have weight here.
 * Low-level magic boundary: mortal techniques only (runbook §1.6).
 */

import type { NpcDatabase } from "./npc";
import type { QuestDefinition } from "./quests";
import type { GridPoint } from "./types";

// --- Scale -------------------------------------------------------------------

export const HEARTVALE_SCALE = {
  tileSize: 1.75,
  atlasUnitTiles: 5,
  zoneGrid: 160,
  zoneOriginAtlas: { x: 38.0, y: 24.0 },
} as const;

export function atlasToGrid(atlasX: number, atlasY: number): GridPoint {
  return {
    x: (atlasX - HEARTVALE_SCALE.zoneOriginAtlas.x) * HEARTVALE_SCALE.atlasUnitTiles,
    y: (atlasY - HEARTVALE_SCALE.zoneOriginAtlas.y) * HEARTVALE_SCALE.atlasUnitTiles,
  };
}

export const SOULWELL_GRID: GridPoint = atlasToGrid(46.0, 38.5); // (40, 72.5)

// --- Anchors (canon bearings from the Soul Well) ------------------------------

export interface ZoneAnchor {
  id: string;
  name: string;
  type: string;
  atlas: { x: number; y: number };
  grid: GridPoint;
  canon: string;
}

export const HEARTVALE_ANCHORS: readonly ZoneAnchor[] = [
  { id: "soulwell", name: "The Soul Well & First Breach", type: "well", atlas: { x: 46.0, y: 38.5 }, grid: atlasToGrid(46.0, 38.5), canon: "The lock that bloomed. Soul Drifters awaken beside it." },
  { id: "anwel", name: "Anwel", type: "city", atlas: { x: 46.0, y: 35.5 }, grid: atlasToGrid(46.0, 35.5), canon: "River-town above the Well, first roof most newly woken souls ever see." },
  { id: "lockroot", name: "Lockroot Vaults", type: "dungeon", atlas: { x: 48.5, y: 31.0 }, grid: atlasToGrid(48.5, 31.0), canon: "Root-choked vaults grown around a fragment of the original lock-inscription. The deeper halls still hum." },
  { id: "vaeldor", name: "Vaeldor", type: "capital", atlas: { x: 49.5, y: 47.5 }, grid: atlasToGrid(49.5, 47.5), canon: "Capital of the Verdant Echo, raised at the meeting of the rivers. All roads are measured from its well-stone." },
  { id: "erboug", name: "The Erboug Stones", type: "poi", atlas: { x: 55.5, y: 41.0 }, grid: atlasToGrid(55.5, 41.0), canon: "Standing stones that predate every settlement record. Drakkin will not camp inside the ring." },
  { id: "thalensheir", name: "Thalen's Heir", type: "city", atlas: { x: 46.5, y: 51.5 }, grid: atlasToGrid(46.5, 51.5), canon: "Said to stand where the first shepherd's weir once ran. The folk etymology survives here in song." },
] as const;

// --- Monsters ------------------------------------------------------------------

export type MonsterTier = "normal" | "elite" | "boss";

export interface MonsterDefinition {
  id: string;
  name: string;
  level: number;
  tier: MonsterTier;
  /** Loot table id in loot.ts — the family encodes beast/humanoid rules. */
  lootTable: string;
  /** Runtime model reference (existing repo assets only). */
  modelRef: string;
  maxHp: number;
  description: string;
}

export const HEARTVALE_MONSTERS: Readonly<Record<string, MonsterDefinition>> = {
  "mudclaw-crab": { id: "mudclaw-crab", name: "Mudclaw Crab", level: 1, tier: "normal", lootTable: "mudclaw-crab", modelRef: "assets/3d/characters/enemy-breachling.gltf", maxHp: 14, description: "River-crab the size of a shield boss. Clacks at ankles, worse at toes." },
  "gossamer-moth": { id: "gossamer-moth", name: "Gossamer Moth", level: 2, tier: "normal", lootTable: "gossamer-moth", modelRef: "assets/3d/characters/enemy-breachling.gltf", maxHp: 16, description: "Hand-span moth shedding pale dust. Harmless alone; never alone." },
  "reed-viper": { id: "reed-viper", name: "Reed Viper", level: 3, tier: "normal", lootTable: "reed-viper", modelRef: "assets/3d/characters/enemy-breachling.gltf", maxHp: 22, description: "Riverbank snake, quick to strike at anything that shadows the water." },
  "thornback-boar": { id: "thornback-boar", name: "Thornback Boar", level: 3, tier: "normal", lootTable: "thornback-boar", modelRef: "assets/3d/characters/enemy-breachling.gltf", maxHp: 26, description: "Bristled field boar with a temper bred into the herd." },
  "root-gnawer": { id: "root-gnawer", name: "Root-Gnawer", level: 5, tier: "normal", lootTable: "root-gnawer", modelRef: "assets/3d/characters/enemy-breachling.gltf", maxHp: 34, description: "Burrower of the Lockroot treeline, fat on old roots and old bones." },
  "echo-mote-swarm": { id: "echo-mote-swarm", name: "Settled Echo Swarm", level: 6, tier: "normal", lootTable: "echo-mote-swarm", modelRef: "assets/3d/characters/enemy-breachling.gltf", maxHp: 38, description: "A knot of memories that never found a soul. It presses, coldly." },
  "toll-road-reiver": { id: "toll-road-reiver", name: "Toll-Road Reiver", level: 5, tier: "normal", lootTable: "toll-road-reiver", modelRef: "assets/3d/characters/paladin.gltf", maxHp: 36, description: "Road-bandit taxing the east road. Carries coin and stolen steel." },
  "unquiet-musterman": { id: "unquiet-musterman", name: "Unquiet Musterman", level: 7, tier: "normal", lootTable: "unquiet-musterman", modelRef: "assets/3d/characters/paladin.gltf", maxHp: 48, description: "A soldier of the old muster-days, still standing a watch nobody set." },
  "reiver-lieutenant": { id: "reiver-lieutenant", name: "Reiver Lieutenant", level: 8, tier: "elite", lootTable: "reiver-lieutenant", modelRef: "assets/3d/characters/paladin.gltf", maxHp: 90, description: "Camp enforcer of the east road. Fights in pairs, brags in threes." },
  "reiver-captain": { id: "reiver-captain", name: "Reiver Captain Borro", level: 9, tier: "elite", lootTable: "reiver-lieutenant", modelRef: "assets/3d/characters/paladin.gltf", maxHp: 120, description: "Borro Half-Toll, who takes half of everything twice." },
  "weirwight": { id: "weirwight", name: "The Weirwight of the Meeting Waters", level: 10, tier: "boss", lootTable: "weirwight", modelRef: "assets/3d/characters/paladin.gltf", maxHp: 320, description: "A drowned keeper of the first weir, tangled in the meeting of the rivers. It drowns what it remembers." },
  "rootbound-cantor": { id: "rootbound-cantor", name: "The Rootbound Cantor", level: 10, tier: "boss", lootTable: "rootbound-cantor", modelRef: "assets/3d/characters/paladin.gltf", maxHp: 300, description: "The thing that hums in the Lockroot treeline, wound through the old inscription's roots." },
} as const;

// --- Spawn areas ----------------------------------------------------------------
// kind "wander" areas are shared world content — phasing NEVER touches them.
// kind "quest"/"elite"/"boss" areas belong to a quest and phase out on turn-in.
// phasedInBy marks replacements that appear only after that quest is turned in.

export interface SpawnArea {
  id: string;
  kind: "wander" | "quest" | "elite" | "boss";
  monsterId: string;
  count: number;
  center: GridPoint;
  radius: number;
  questId?: string;
  phasedInBy?: string;
  note: string;
}

export const HEARTVALE_SPAWN_AREAS: readonly SpawnArea[] = [
  // Wander mobs — always present for every player, quest state irrelevant.
  { id: "wander-moth-meadow", kind: "wander", monsterId: "gossamer-moth", count: 10, center: { x: 30, y: 66 }, radius: 9, note: "Meadow west of the terrace road." },
  { id: "wander-viper-banks", kind: "wander", monsterId: "reed-viper", count: 8, center: { x: 38, y: 82 }, radius: 8, note: "Riverbanks south of the Well." },
  { id: "wander-gnawer-treeline", kind: "wander", monsterId: "root-gnawer", count: 8, center: { x: 50, y: 41 }, radius: 7, note: "Lockroot treeline fringe." },
  { id: "wander-muster-field", kind: "wander", monsterId: "unquiet-musterman", count: 6, center: { x: 62, y: 76 }, radius: 8, note: "The old muster field east of the south road." },
  { id: "wander-mote-shallows", kind: "wander", monsterId: "echo-mote-swarm", count: 5, center: { x: 44, y: 90 }, radius: 6, note: "Low ground where the rivers begin to remember." },

  // Quest camps — phase out (or change) for players who turn the quest in.
  { id: "camp-mudclaw-shallows", kind: "quest", questId: "q-mudclaw-toll", monsterId: "mudclaw-crab", count: 6, center: { x: 37, y: 64 }, radius: 5, note: "Anwel dock shallows." },
  { id: "camp-thornback-field", kind: "quest", questId: "q-thornback-trouble", monsterId: "thornback-boar", count: 5, center: { x: 28, y: 86 }, radius: 6, note: "Bonn's west field." },
  { id: "camp-reiver-road", kind: "quest", questId: "q-toll-road-reivers", monsterId: "toll-road-reiver", count: 8, center: { x: 47, y: 95 }, radius: 6, note: "Road camp where the east road forks." },
  { id: "camp-east-road-elite", kind: "elite", questId: "q-break-east-road-camp", monsterId: "reiver-lieutenant", count: 2, center: { x: 70, y: 88 }, radius: 5, note: "Elite camp on the east road." },
  { id: "camp-east-road-captain", kind: "elite", questId: "q-break-east-road-camp", monsterId: "reiver-captain", count: 1, center: { x: 72, y: 89 }, radius: 3, note: "Borro's tent." },
  { id: "boss-weirwight-waters", kind: "boss", questId: "q-weirwight", monsterId: "weirwight", count: 1, center: { x: 54, y: 112 }, radius: 4, note: "The meeting of the rivers, Vaeldor's shadow." },
  { id: "boss-rootbound-treeline", kind: "boss", questId: "q-rootbound-cantor", monsterId: "rootbound-cantor", count: 1, center: { x: 52, y: 36 }, radius: 4, note: "Where the treeline hums." },

  // Phased-in replacements — the world AFTER the quest, for completers only.
  { id: "phase-fisher-shallows", kind: "wander", monsterId: "mudclaw-crab", count: 0, center: { x: 37, y: 64 }, radius: 5, phasedInBy: "q-mudclaw-toll", note: "Cleared shallows; Anwel fishers work here again (ambient dressing)." },
  { id: "phase-grazer-field", kind: "wander", monsterId: "thornback-boar", count: 2, center: { x: 28, y: 86 }, radius: 6, phasedInBy: "q-thornback-trouble", note: "A thinned, wary remnant herd — the field is farmland again." },
  { id: "phase-watch-post", kind: "wander", monsterId: "toll-road-reiver", count: 0, center: { x: 70, y: 88 }, radius: 5, phasedInBy: "q-break-east-road-camp", note: "A Vaeldor watch post stands where the elite camp burned." },
] as const;

// --- NPCs ----------------------------------------------------------------------
// 11 quest NPCs (+2 escort followers). Sprites share one original placeholder
// portrait until the portrait ticket lands (docs/HEARTVALE_ZONE_DESIGN.md).

const VILLAGER_SPRITE = "/assets/generated/npcs/heartvale-villager.png";

export const HEARTVALE_NPC_DATABASE: NpcDatabase = {
  version: 1,
  npcs: {
    "mira-eddlestone": {
      name: "Mira Eddlestone",
      role: "Anwel Greeter",
      room: "anwel",
      sprite: VILLAGER_SPRITE,
      scene: {
        id: "mira-first-roof",
        opening: [
          "A new soul, walking up from the Well with the river-mist still on them. Welcome to Anwel, {name} — first roof most of us ever saw, and glad to be yours.",
          "Folk here will ask things of you. Saying yes is how a soul grows roots. Start with me, and I'll show you how the asking works.",
        ],
        choices: [
          { id: "accept", label: "Gladly. Where do I start?", response: "With the docks, the fields, and the road. Take my mark, and the town will know you.", checkpoint: "heartvale:anwel:first-roof" },
          { id: "later", label: "I need a moment first.", response: "The Well waited an age for you. Anwel can wait an hour. Come find me.", checkpoint: "heartvale:anwel:first-roof-later" },
        ],
      },
    },
    "dockmaster-pell": {
      name: "Dockmaster Pell",
      role: "Master of the Anwel Docks",
      room: "anwel",
      sprite: VILLAGER_SPRITE,
      scene: {
        id: "pell-mudclaw-toll",
        opening: [
          "You walk like someone who hasn't learned to watch their ankles. Good — the mudclaws teach that lesson for free, and I pay for the teaching.",
          "Six of them, off my shallows. Take what they drop; shells sell by the bundle and I don't haggle with heroes.",
        ],
        choices: [
          { id: "accept", label: "Six mudclaws. Done.", response: "Mind the big one by the pots. Everything a monster drops is yours — that's the law of the road.", checkpoint: "heartvale:anwel:mudclaw-toll" },
          { id: "ask-loot", label: "What do I do with shells?", response: "Sell them, or save them for craft. Beasts give materials, {name}. Coin comes from folk with pockets.", checkpoint: "heartvale:anwel:mudclaw-loot-lesson" },
        ],
      },
    },
    "fletcher-anes": {
      name: "Fletcher Anes",
      role: "Arrow-maker of Anwel",
      room: "anwel",
      sprite: VILLAGER_SPRITE,
      scene: {
        id: "anes-feathers",
        opening: [
          "The meadow west of the Well road is thick with gossamer moths, and every wing they shed makes a truer arrow.",
          "Bring me eight wings. Look sharp as you go — finding what the vale scatters is a skill of its own.",
        ],
        choices: [
          { id: "accept", label: "Eight wings. I'll walk the meadow.", response: "Watch for the pale dust. Where it drifts, they feed.", checkpoint: "heartvale:anwel:feathers" },
        ],
      },
    },
    "herder-bonn": {
      name: "Herder Bonn",
      role: "West Field Herder",
      room: "anwel",
      sprite: VILLAGER_SPRITE,
      scene: {
        id: "bonn-thornbacks",
        opening: [
          "Thornbacks took my west field and gored two dogs doing it. I need five of that herd driven under, and I need it before planting.",
          "Hit them hard and don't stand where they charge. That's the whole science of boars.",
        ],
        choices: [
          { id: "accept", label: "The field will be yours again.", response: "Cull five. The herd thins, the field comes back — you'll see it with your own eyes.", checkpoint: "heartvale:anwel:thornbacks" },
        ],
      },
    },
    "cael-roadwarden": {
      name: "Cael, Warden of Roads",
      role: "Road Warden, Anwel Mile",
      room: "anwel",
      sprite: VILLAGER_SPRITE,
      scene: {
        id: "cael-road-well-stone",
        opening: [
          "Brother Owyn walks to Vaeldor to touch the well-stone, as the first waking generations did. The banks between here and the capital are thick with reed vipers.",
          "Walk with him. Keep him breathing. That's the whole of the task — and it's how roads stay roads.",
        ],
        choices: [
          { id: "accept", label: "I'll see him to the capital road.", response: "Stay close. Vipers test stragglers, not shields.", checkpoint: "heartvale:road:escort-owyn" },
          { id: "ask-vaeldor", label: "Tell me about Vaeldor.", response: "Raised at the meeting of the rivers by the first to wake. All roads in Thalenyr are measured from its well-stone. You'll see it.", checkpoint: "heartvale:road:vaeldor-lore" },
        ],
      },
    },
    "wellkeeper-sef": {
      name: "Wellkeeper Sef",
      role: "Keeper of the Aboveground Well",
      room: "soulwell-terrace",
      sprite: VILLAGER_SPRITE,
      scene: {
        id: "sef-echoes-water",
        opening: [
          "The land remembers, {name}. That is the Law of the Echo, and this terrace is its oldest page.",
          "Three shards hang above the water. Touch them in the order the Well woke — stone, then river, then sky — and the terrace will answer what you recovered below.",
        ],
        choices: [
          { id: "accept", label: "Stone, river, sky. I'll listen for it.", response: "The First Memory has weight here. Let it lean on the water.", checkpoint: "heartvale:terrace:echo-puzzle" },
          { id: "ask-law", label: "The Law of the Echo?", response: "Recovered memories have weight in Thalenyr. What you carry changes what the land shows you. Remember that at the Erboug Stones.", checkpoint: "heartvale:terrace:echo-law" },
        ],
      },
    },
    "reeve-droma": {
      name: "Reeve Droma",
      role: "Reeve of the Anwel Mile",
      room: "anwel",
      sprite: VILLAGER_SPRITE,
      scene: {
        id: "droma-reivers",
        opening: [
          "Reivers tax the east road where it forks, and my mandate ends at the village line. You, soul-drifter, have no such line.",
          "Break their camp — eight of them. They're wielders, so watch their steel. What's in their purses is road-stolen anyway; keep it with my blessing.",
        ],
        choices: [
          { id: "accept", label: "Eight reivers. The road goes free.", response: "Humanoids carry coin, and their better sort carry armor. Take it all. It's owed.", checkpoint: "heartvale:road:reivers" },
        ],
      },
    },
    "scavenger-ils": {
      name: "Scavenger Ils",
      role: "Finder of River-Things",
      room: "anwel",
      sprite: VILLAGER_SPRITE,
      scene: {
        id: "ils-river-keeps",
        opening: [
          "The river keeps what the vale forgets. Old river-keepers cached supplies along the banks before the last flood-year — five caches, and I know their marks.",
          "Find them for me and I'll teach you the marks, so the river pays you too, one day.",
        ],
        choices: [
          { id: "accept", label: "Show me the marks.", response: "Bent reed, grey stone, low branch. Where all three meet, dig.", checkpoint: "heartvale:river:caches" },
        ],
      },
    },
    "old-fen": {
      name: "Old Fen",
      role: "Eel-catcher of the Banks",
      room: "anwel",
      sprite: VILLAGER_SPRITE,
      scene: {
        id: "fen-eel-traps",
        opening: [
          "Eels run where the current folds. Three traps, three folds — but set one wrong and the river laughs and gives you nothing.",
          "The bank tells you the order: deep before slack, slack before ripple. Read it, set my traps, and supper's on me.",
        ],
        choices: [
          { id: "accept", label: "Deep, slack, ripple. I'll read the bank.", response: "The river's honest if you watch it long enough. Off you go.", checkpoint: "heartvale:river:eel-traps" },
        ],
      },
    },
    "shepherdess-rill": {
      name: "Shepherdess Rill",
      role: "Herder of the South Road",
      room: "south-road",
      sprite: VILLAGER_SPRITE,
      scene: {
        id: "rill-lost-yearling",
        opening: [
          "My yearling bolted toward the muster field when the mustermen stood up, and she'll not come back for me — I'm too near her own size to feel like safety.",
          "Find her, walk her home, and keep the gnawers and worse off her back. She'll follow a quiet soul.",
        ],
        choices: [
          { id: "accept", label: "I'll bring her home.", response: "Slow steps. She spooks at running. Thalen's Heir sings of my grandmother's weir, you know — bring her back and I'll sing you the verse.", checkpoint: "heartvale:south:yearling" },
        ],
      },
    },
    "sergeant-hull": {
      name: "Sergeant-at-Gate Hull",
      role: "Vaeldor Gate Watch",
      room: "vaeldor-gate",
      sprite: VILLAGER_SPRITE,
      scene: {
        id: "hull-east-road-camp",
        opening: [
          "The reivers you broke at the fork were the camp's shadow. The camp itself squats further east — two lieutenants, and Captain Borro Half-Toll.",
          "This is watch-work, not errand-work. Take companions, or come back when the road's made you harder. The gate remembers either way.",
        ],
        choices: [
          { id: "accept", label: "The camp burns.", response: "Bring friends or bring levels. Borro yields to either.", checkpoint: "heartvale:road:elite-camp" },
        ],
      },
    },
    "brother-owyn": {
      name: "Brother Owyn",
      role: "Pilgrim of the Well-Stone",
      room: "south-road",
      sprite: VILLAGER_SPRITE,
      scene: {
        id: "owyn-pilgrim",
        opening: [
          "Every soul should touch the well-stone once, {name}. The first waking generations raised Vaeldor around it, and all roads are measured from its face.",
          "Walk beside me a while. The vipers mind the water; I mind the vipers not at all, which is rather the problem.",
        ],
        choices: [
          { id: "walk", label: "Stay behind me, brother.", response: "Bless you. The road remembers kindness.", checkpoint: "heartvale:road:owyn-follow" },
        ],
      },
    },
  },
};

// --- Puzzles --------------------------------------------------------------------

export interface PuzzleDefinition {
  id: string;
  name: string;
  /** Ordered interaction steps the player must complete in sequence. */
  sequence: readonly string[];
  clue: string;
  wrongOrderHint: string;
}

export const HEARTVALE_PUZZLES: readonly PuzzleDefinition[] = [
  {
    id: "terrace-shard-echoes",
    name: "Echoes in the Water",
    sequence: ["shard-stone", "shard-river", "shard-sky"],
    clue: "The Well woke stone first, then the river answered, then the sky noticed.",
    wrongOrderHint: "The water ripples and settles. That is not the order the Well woke.",
  },
  {
    id: "eel-trap-folds",
    name: "Eel-Trap Geometry",
    sequence: ["trap-deep-fold", "trap-slack-fold", "trap-ripple-fold"],
    clue: "Deep before slack, slack before ripple.",
    wrongOrderHint: "The current tugs the trap sideways and lets go. Wrong fold.",
  },
] as const;

// --- Escorts --------------------------------------------------------------------

export interface EscortDefinition {
  id: string;
  followerName: string;
  /** Waypoints (grid) the follower must survive through. */
  route: readonly GridPoint[];
  /** Wander spawn areas that aggro the route. */
  threatAreaIds: readonly string[];
  failNote: string;
}

export const HEARTVALE_ESCORTS: readonly EscortDefinition[] = [
  {
    id: "escort-owyn-vaeldor-road",
    followerName: "Brother Owyn",
    route: [
      { x: 41, y: 54 }, { x: 42, y: 62 }, { x: 42, y: 70 }, { x: 43, y: 80 }, { x: 45, y: 90 },
    ],
    threatAreaIds: ["wander-viper-banks"],
    failNote: "Owyn scurries back to Anwel, robes singed with viper-spit. He will try again when you return.",
  },
  {
    id: "escort-yearling-home",
    followerName: "The Yearling",
    route: [
      { x: 50, y: 104 }, { x: 48, y: 102 }, { x: 46, y: 100 }, { x: 45, y: 98 },
    ],
    threatAreaIds: ["wander-muster-field"],
    failNote: "The yearling bolts back into the muster field. Rill sighs the sigh of grandmothers.",
  },
] as const;

// --- Quests ----------------------------------------------------------------------
// Ordered so each quest teaches a mechanic before the next one leans on it.
// XP budget: the full chain plus its required kills carries a fresh character
// to ~level 10 (see tests/zoneHeartvale.test.ts for the enforced budget).

export const HEARTVALE_QUESTS: readonly QuestDefinition[] = [
  {
    id: "q-first-roof",
    name: "The First Roof",
    giverNpcId: "mira-eddlestone",
    turnInNpcId: "mira-eddlestone",
    level: 1,
    summary: "Accept Mira's welcome and learn how the asking works in Anwel.",
    objectives: [{ id: "greet", kind: "talk", targetId: "mira-eddlestone", count: 1, label: "Take Mira's welcome mark" }],
    rewards: { xp: 60, coin: 5, itemIds: [] },
    scaling: { recommendedParty: 1, intendedLevel: 1, soloLevel: 1, difficulty: "solo" },
    requires: [],
    teaches: "The quest system: offers, the log, turn-in, and rewards.",
    onComplete: {
      removeSpawns: [],
      addSpawns: [],
      worldNote: "Anwel's doors mark you as one of their own. Villagers greet you by name.",
      atlasPromotion: { realmId: "thalenyr", poiId: "anwel", status: "completed" },
    },
  },
  {
    id: "q-mudclaw-toll",
    name: "The Mudclaw Toll",
    giverNpcId: "dockmaster-pell",
    turnInNpcId: "dockmaster-pell",
    level: 1,
    summary: "Cull 6 mudclaw crabs from the dock shallows and keep what they drop.",
    objectives: [{ id: "cull", kind: "kill", targetId: "mudclaw-crab", count: 6, label: "Mudclaw crabs culled" }],
    rewards: { xp: 160, coin: 10, itemIds: [] },
    scaling: { recommendedParty: 1, intendedLevel: 1, soloLevel: 1, difficulty: "solo" },
    requires: ["q-first-roof"],
    teaches: "Combat, kill credit, and looting materials from beasts.",
    onComplete: {
      removeSpawns: ["camp-mudclaw-shallows"],
      addSpawns: [{ spawnId: "phase-fisher-shallows", monsterId: "mudclaw-crab" }],
      worldNote: "The shallows are quiet. Anwel fishers work the dock water again, and their lanterns burn at dusk.",
    },
  },
  {
    id: "q-gossamer-wings",
    name: "Feathers for the Fletcher",
    giverNpcId: "fletcher-anes",
    turnInNpcId: "fletcher-anes",
    level: 2,
    summary: "Gather 8 gossamer wings from the meadow west of the Well road.",
    objectives: [{ id: "wings", kind: "collect", targetId: "mat-gossamer-wing", count: 8, label: "Gossamer wings gathered" }],
    rewards: { xp: 200, coin: 12, itemIds: [] },
    scaling: { recommendedParty: 1, intendedLevel: 2, soloLevel: 2, difficulty: "solo" },
    requires: ["q-first-roof"],
    teaches: "Exploration and material collection from wander mobs.",
  },
  {
    id: "q-thornback-trouble",
    name: "Thornback Trouble",
    giverNpcId: "herder-bonn",
    turnInNpcId: "herder-bonn",
    level: 3,
    summary: "Cull 5 thornback boars so the west field can be planted.",
    objectives: [{ id: "cull", kind: "kill", targetId: "thornback-boar", count: 5, label: "Thornback boars culled" }],
    rewards: { xp: 260, coin: 15, itemIds: [] },
    scaling: { recommendedParty: 1, intendedLevel: 3, soloLevel: 3, difficulty: "solo" },
    requires: ["q-first-roof"],
    teaches: "Reading charges and positioning against tougher beasts.",
    onComplete: {
      removeSpawns: ["camp-thornback-field"],
      addSpawns: [{ spawnId: "phase-grazer-field", monsterId: "thornback-boar" }],
      worldNote: "The west field is turned earth again. A wary remnant pair of boars keeps to the far hedgerow.",
    },
  },
  {
    id: "q-road-to-well-stone",
    name: "The Road to the Well-Stone",
    giverNpcId: "cael-roadwarden",
    turnInNpcId: "cael-roadwarden",
    level: 4,
    summary: "Escort Brother Owyn safely along the south road toward Vaeldor.",
    objectives: [{ id: "escort", kind: "escort", targetId: "escort-owyn-vaeldor-road", count: 1, label: "Owyn walked the viper banks" }],
    rewards: { xp: 340, coin: 18, itemIds: [] },
    scaling: { recommendedParty: 1, intendedLevel: 4, soloLevel: 4, difficulty: "solo" },
    requires: ["q-first-roof"],
    teaches: "Escort quests: protecting a follower through hostile ground.",
  },
  {
    id: "q-echoes-in-the-water",
    name: "Echoes in the Water",
    giverNpcId: "wellkeeper-sef",
    turnInNpcId: "wellkeeper-sef",
    level: 4,
    summary: "Touch the terrace shard echoes in the order the Well woke: stone, river, sky.",
    objectives: [{ id: "echo", kind: "puzzle", targetId: "terrace-shard-echoes", count: 1, label: "The terrace answered" }],
    rewards: { xp: 340, coin: 0, itemIds: [] },
    scaling: { recommendedParty: 1, intendedLevel: 4, soloLevel: 4, difficulty: "solo" },
    requires: ["q-first-roof"],
    teaches: "Puzzle interactions and the Law of the Echo.",
    onComplete: {
      removeSpawns: [],
      addSpawns: [],
      worldNote: "The terrace hums a half-tone lower for you now. The shards lean toward you when you pass.",
    },
  },
  {
    id: "q-toll-road-reivers",
    name: "Toll-Road Reivers",
    giverNpcId: "reeve-droma",
    turnInNpcId: "reeve-droma",
    level: 5,
    summary: "Break the reiver camp at the east-road fork: 8 reivers.",
    objectives: [{ id: "break", kind: "kill", targetId: "toll-road-reiver", count: 8, label: "Reivers driven off" }],
    rewards: { xp: 460, coin: 30, itemIds: [] },
    scaling: { recommendedParty: 1, intendedLevel: 5, soloLevel: 5, difficulty: "solo" },
    requires: ["q-first-roof"],
    teaches: "Humanoid loot: coin, rare armor, and wielder weapons.",
    onComplete: {
      removeSpawns: ["camp-reiver-road"],
      addSpawns: [],
      worldNote: "The fork camp is ash and torn canvas. Merchants walk the east road without paying the toll.",
      atlasPromotion: { realmId: "thalenyr", poiId: "erboug", status: "rumored" },
    },
  },
  {
    id: "q-what-the-river-keeps",
    name: "What the River Keeps",
    giverNpcId: "scavenger-ils",
    turnInNpcId: "scavenger-ils",
    level: 5,
    summary: "Find 5 river-keeper caches along the banks: bent reed, grey stone, low branch.",
    objectives: [{ id: "caches", kind: "find", targetId: "river-keeper-cache", count: 5, label: "Caches recovered" }],
    rewards: { xp: 440, coin: 20, itemIds: [] },
    scaling: { recommendedParty: 1, intendedLevel: 5, soloLevel: 5, difficulty: "solo" },
    requires: ["q-first-roof"],
    teaches: "Find quests: reading the world for hidden interactables.",
  },
  {
    id: "q-eel-trap-geometry",
    name: "Eel-Trap Geometry",
    giverNpcId: "old-fen",
    turnInNpcId: "old-fen",
    level: 6,
    summary: "Set Fen's three eel traps in the right current folds: deep, slack, ripple.",
    objectives: [{ id: "traps", kind: "puzzle", targetId: "eel-trap-folds", count: 1, label: "Traps set in the right folds" }],
    rewards: { xp: 500, coin: 14, itemIds: [] },
    scaling: { recommendedParty: 1, intendedLevel: 6, soloLevel: 6, difficulty: "solo" },
    requires: ["q-what-the-river-keeps"],
    teaches: "Environmental puzzles with order-of-operations logic.",
  },
  {
    id: "q-lost-yearling",
    name: "The Lost Yearling",
    giverNpcId: "shepherdess-rill",
    turnInNpcId: "shepherdess-rill",
    level: 6,
    summary: "Find Rill's yearling in the muster field and walk her home, slowly.",
    objectives: [{ id: "sheep", kind: "escort", targetId: "escort-yearling-home", count: 1, label: "Yearling walked home" }],
    rewards: { xp: 540, coin: 16, itemIds: [] },
    scaling: { recommendedParty: 1, intendedLevel: 6, soloLevel: 6, difficulty: "solo" },
    requires: ["q-road-to-well-stone"],
    teaches: "Follow mechanics with a skittish follower; the Thalen's Heir song hook.",
  },
  {
    id: "q-break-east-road-camp",
    name: "Break the East-Road Camp",
    giverNpcId: "sergeant-hull",
    turnInNpcId: "sergeant-hull",
    level: 8,
    summary: "Destroy the elite reiver camp: both lieutenants and Captain Borro.",
    objectives: [
      { id: "lieutenants", kind: "kill", targetId: "reiver-lieutenant", count: 2, label: "Reiver lieutenants defeated" },
      { id: "captain", kind: "kill", targetId: "reiver-captain", count: 1, label: "Captain Borro Half-Toll defeated" },
    ],
    rewards: { xp: 1000, coin: 80, itemIds: ["wpn-lieutenant-glaive"] },
    scaling: { recommendedParty: 3, intendedLevel: 8, soloLevel: 11, difficulty: "party" },
    requires: ["q-toll-road-reivers"],
    teaches: "Elite camps: designed for a party of three at level 8, or a solo player who out-leveled it.",
    onComplete: {
      removeSpawns: ["camp-east-road-elite", "camp-east-road-captain"],
      addSpawns: [{ spawnId: "phase-watch-post", monsterId: "toll-road-reiver" }],
      worldNote: "The east-road camp is gone. A Vaeldor watch post stands in the ash, and its banner catches the morning wind.",
    },
  },
  {
    id: "q-weirwight",
    name: "The Weirwight of the Meeting Waters",
    giverNpcId: "wellkeeper-sef",
    turnInNpcId: "reeve-droma",
    level: 9,
    summary: "Where the rivers meet under Vaeldor's walls, something drowned still keeps the weir. End it.",
    objectives: [{ id: "wight", kind: "kill", targetId: "weirwight", count: 1, label: "The Weirwight laid to rest" }],
    rewards: { xp: 1400, coin: 120, itemIds: ["arm-weirwight-shroud"] },
    scaling: { recommendedParty: 4, intendedLevel: 9, soloLevel: 13, difficulty: "raid" },
    requires: ["q-road-to-well-stone", "q-toll-road-reivers"],
    teaches: "Zone boss: built for a full party, or a much stronger solo soul.",
    onComplete: {
      removeSpawns: ["boss-weirwight-waters"],
      addSpawns: [],
      worldNote: "The meeting waters run clear. A small shrine of river-stones stands where the wight kept its weir, and the water no longer pulls at wading birds.",
      atlasPromotion: { realmId: "thalenyr", poiId: "vaeldor", status: "explored" },
    },
  },
  {
    id: "q-humming-roots",
    name: "The Humming Roots",
    giverNpcId: "reeve-droma",
    turnInNpcId: "reeve-droma",
    level: 9,
    summary: "Scout the Lockroot treeline where the old inscription's roots swallow the ground.",
    objectives: [{ id: "scout", kind: "find", targetId: "lockroot-entrance", count: 1, label: "Lockroot entrance scouted" }],
    rewards: { xp: 600, coin: 25, itemIds: [] },
    scaling: { recommendedParty: 1, intendedLevel: 9, soloLevel: 9, difficulty: "solo" },
    requires: ["q-toll-road-reivers"],
    teaches: "Dungeon thresholds: the next descent is a rumor with an address.",
    onComplete: {
      removeSpawns: [],
      addSpawns: [],
      worldNote: "The deeper halls still hum — but now the atlas knows the way.",
      atlasPromotion: { realmId: "thalenyr", poiId: "lockroot", status: "explored" },
    },
  },
  {
    id: "q-rootbound-cantor",
    name: "The Rootbound Cantor",
    giverNpcId: "wellkeeper-sef",
    turnInNpcId: "wellkeeper-sef",
    level: 10,
    summary: "The thing humming in the treeline is wound through the inscription's roots. Silence it.",
    objectives: [{ id: "cantor", kind: "kill", targetId: "rootbound-cantor", count: 1, label: "The Cantor silenced" }],
    rewards: { xp: 1600, coin: 140, itemIds: ["wpn-cantor-staff"] },
    scaling: { recommendedParty: 4, intendedLevel: 10, soloLevel: 14, difficulty: "raid" },
    requires: ["q-humming-roots"],
    teaches: "Second zone boss: the capstone of the Heartvale band.",
    onComplete: {
      removeSpawns: ["boss-rootbound-treeline"],
      addSpawns: [],
      worldNote: "The treeline is quiet for the first time in living memory. The Lockroot entrance no longer hums — it waits.",
    },
  },
] as const;

export function heartvaleQuestById(id: string): QuestDefinition {
  const quest = HEARTVALE_QUESTS.find((candidate) => candidate.id === id);
  if (!quest) throw new Error(`Unknown Heartvale quest: ${id}`);
  return quest;
}

// --- Budget helpers (consumed by tests) ------------------------------------------

export function totalQuestXp(): number {
  return HEARTVALE_QUESTS.reduce((sum, quest) => sum + quest.rewards.xp, 0);
}

export function totalQuestCoin(): number {
  return HEARTVALE_QUESTS.reduce((sum, quest) => sum + quest.rewards.coin, 0);
}

/** XP from the kills the quest chain itself requires (at listed monster levels). */
export function requiredKillXp(monsterXpFor: (level: number, tier: MonsterTier) => number): number {
  let total = 0;
  for (const quest of HEARTVALE_QUESTS) {
    for (const objective of quest.objectives) {
      if (objective.kind !== "kill") continue;
      const monster = HEARTVALE_MONSTERS[objective.targetId];
      if (!monster) throw new Error(`Quest ${quest.id} targets unknown monster ${objective.targetId}.`);
      total += monsterXpFor(monster.level, monster.tier) * objective.count;
    }
  }
  return total;
}

/** Spawn areas a player sees, given the quests they have turned in. */
export function phasedSpawnAreas(completedQuestIds: ReadonlySet<string>): readonly SpawnArea[] {
  return HEARTVALE_SPAWN_AREAS.filter((area) => {
    if (area.phasedInBy) return completedQuestIds.has(area.phasedInBy);
    if (area.questId && (area.kind === "quest" || area.kind === "elite" || area.kind === "boss")) {
      return !completedQuestIds.has(area.questId);
    }
    return true; // wander areas are never phased
  });
}

// --- Rotating contract templates -------------------------------------------------
// Daily, seeded instances so the vale's needs are not a fixed generic list.
// Same date -> same instance for every player (shared world); a GM or AI
// agent can inject one-off instances with any seed for live events.

import type { QuestTemplate } from "./questdb/schema";

export const HEARTVALE_CONTRACT_GIVER = "reeve-droma";

export const HEARTVALE_QUEST_TEMPLATES: readonly QuestTemplate[] = [
  {
    id: "t-cull-contract",
    namePattern: "Cull Contract: {monster} at {place}",
    summaryPattern: "The Reeve needs {count} {monster} driven from {place}. {flavor}.",
    kind: "kill",
    slots: {
      monsterPool: ["gossamer-moth", "reed-viper", "thornback-boar", "root-gnawer"],
      placePool: [
        { id: "west-meadow", name: "the west meadow" },
        { id: "river-banks", name: "the river banks" },
        { id: "hedgerow-fields", name: "the hedgerow fields" },
        { id: "treeline-fringe", name: "the Lockroot fringe" },
      ],
      flavorPool: [
        "The land remembers, and lately it remembers teeth",
        "The first waking generations kept these banks clear — so shall we",
        "The well-stone measures all roads, and the roads measure us",
        "A kind forest stops being kind the week before harvest",
      ],
    },
    countRange: [4, 8],
    levelRange: [2, 7],
    xpPerUnit: 22,
    coinPerUnit: 3,
    rotation: "daily",
  },
  {
    id: "t-bounty-contract",
    namePattern: "Bounty: {monster} near {place}",
    summaryPattern: "Coin for steel: put down {count} {monster} troubling {place}. {flavor}.",
    kind: "kill",
    slots: {
      monsterPool: ["toll-road-reiver", "unquiet-musterman"],
      placePool: [
        { id: "east-road", name: "the east road" },
        { id: "muster-field", name: "the old muster field" },
        { id: "fork-camp", name: "the fork camp" },
      ],
      flavorPool: [
        "Road-stolen coin spends the same as honest coin",
        "The dead of the muster-days did not choose their watch — end it kindly",
        "Borro's shadow is gone, but shadows cast shadows",
      ],
    },
    countRange: [3, 6],
    levelRange: [5, 8],
    xpPerUnit: 30,
    coinPerUnit: 8,
    rotation: "daily",
  },
  {
    id: "t-gather-contract",
    namePattern: "Gather Contract: {monster} for the stores",
    summaryPattern: "Anwel's stores want {count} {monster}. {flavor}.",
    kind: "collect",
    slots: {
      monsterPool: ["mat-gossamer-wing", "mat-reed-viper-skin", "mat-thornback-bristle"],
      placePool: [
        { id: "anwel-stores", name: "the Anwel stores" },
        { id: "fletcher-bench", name: "the fletcher's bench" },
      ],
      flavorPool: [
        "Winter counts what summer gathered",
        "Every bundle is a roof that holds",
      ],
    },
    countRange: [4, 10],
    levelRange: [2, 6],
    xpPerUnit: 14,
    coinPerUnit: 2,
    rotation: "daily",
  },
] as const;
