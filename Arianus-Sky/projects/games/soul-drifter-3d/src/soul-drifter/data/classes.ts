import type { ClassDef, AbilityDef, EnemyDef, RealmDef, TerrainDef, RaceDef, ItemDef } from '../game/types';

export const CLASSES: Record<string, ClassDef> = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    description: 'Physical fighter whose body, weapon, armor, charms, breath, and stance form one rune circuit.',
    role: 'frontline, stagger, guard break',
    startingSkill: 'rune_slash',
    resources: ['fury', 'rune_stability'],
    allowedArmor: ['segmented', 'medium', 'heavy'],
    color: '#c0392b',
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    description: 'Formula caster who creates behavior by combining disciplined color channels.',
    role: 'color fields, burst, control',
    startingSkill: 'meteor_swarm',
    resources: ['color_channel', 'formula_prep'],
    allowedArmor: ['cloth', 'light'],
    color: '#8e44ad',
  },
  priest: {
    id: 'priest',
    name: 'Priest',
    description: 'Devotional White magic based on vows, care, spiritual authority, and protection.',
    role: 'heal, ward, cleanse, anti-dark',
    startingSkill: 'holy_arrow',
    resources: ['devotion', 'ward_charge'],
    allowedArmor: ['cloth', 'light', 'ceremonial'],
    color: '#f1c40f',
  },
  sharpshooter: {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Ranged hunter who controls distance, marks prey, sets traps, and fights with a bonded companion.',
    role: 'ranged focus, traps, pet commands',
    startingSkill: 'multishot',
    resources: ['focus', 'pet_bond'],
    allowedArmor: ['light', 'travel'],
    color: '#27ae60',
  },
  paladin: {
    id: 'paladin',
    name: 'Paladin',
    description: 'Oath-armored protector who confronts corruption through martial action — not merely a Priest in heavier armor.',
    role: 'tank, stun, oath protection',
    startingSkill: 'thors_hammer',
    resources: ['oath_charge', 'aura'],
    allowedArmor: ['medium', 'heavy', 'warded_plate'],
    color: '#e67e22',
  },
};

export const RACES: Record<string, RaceDef> = {
  human: {
    id: 'human',
    name: 'Human',
    description: 'Adaptable realm cultures with broad variation. Balanced movement and gear fit.',
    trait: 'Flexible Training — balanced growth in all stats',
    modifiers: { hp: 8, mp: 8, initiative: 1, movement: 0 },
    color: '#c49a6c',
  },
  elf: {
    id: 'elf',
    name: 'Elf',
    description: 'Memory, precision, and graceful motion carried across long cultural continuity.',
    trait: 'Long Memory — sharper initiative and deeper formula reserves',
    modifiers: { hp: 0, mp: 15, initiative: 3, movement: 0 },
    color: '#7fb069',
  },
  dwarf: {
    id: 'dwarf',
    name: 'Dwarf',
    description: 'Forge culture, compact strength, and stone/material expertise.',
    trait: 'Low Center of Gravity — enduring health, hard to move',
    modifiers: { hp: 20, mp: 0, initiative: -1, movement: 0 },
    color: '#b08456',
  },
  halfling: {
    id: 'halfling',
    name: 'Halfling',
    description: 'Improvisation, courage, and compact fieldcraft honed between the realm seams.',
    trait: 'Gap Movement — quick feet and quicker wits',
    modifiers: { hp: 0, mp: 5, initiative: 2, movement: 1 },
    color: '#d4a24e',
  },
};

export const ABILITIES: Record<string, AbilityDef> = {
  move: {
    id: 'move', name: 'Move',
    description: 'Move to a target tile within movement range.',
    shape: 'tile', range: 0, actionCost: 0,
  },
  attack: {
    id: 'attack', name: 'Attack',
    description: 'Basic strike against an adjacent or reachable target.',
    shape: 'single', range: 1, actionCost: 1,
    damageType: 'physical', damage: 8,
  },
  defend: {
    id: 'defend', name: 'Defend',
    description: 'Brace for incoming attacks. Halves the next hit and steadies reactions.',
    shape: 'self', range: 0, actionCost: 1,
    statusEffects: ['defending'],
  },
  interact: {
    id: 'interact', name: 'Interact',
    description: 'Interact with an object, NPC, or entity on an adjacent tile.',
    shape: 'single', range: 1, actionCost: 0,
  },
  inspect: {
    id: 'inspect', name: 'Inspect',
    description: 'Examine a tile, enemy, or object for detailed information.',
    shape: 'tile', range: 4, actionCost: 0,
  },
  // ---- Warrior ----
  rune_slash: {
    id: 'rune_slash', name: 'Rune Slash',
    description: 'Cleaves an arc of three tiles; damages guard and leaves weapon-rune residue.',
    shape: 'arc', range: 1, actionCost: 1, classRequired: 'warrior',
    damageType: 'rune', damage: 15,
    tileEffects: ['weapon_rune_residue'], statusEffects: ['guard_damage'],
    resourceCost: { fury: 15 },
  },
  guard_split: {
    id: 'guard_split', name: 'Guard Split',
    description: 'Heavy hit that breaks armor and staggers the target.',
    shape: 'single', range: 1, actionCost: 1, classRequired: 'warrior',
    damageType: 'physical', damage: 20, statusEffects: ['staggered'],
    resourceCost: { fury: 25 },
  },
  anchor_step: {
    id: 'anchor_step', name: 'Anchor Step',
    description: 'Creates a protection zone and resists forced movement.',
    shape: 'self', range: 0, actionCost: 1, classRequired: 'warrior',
    tileEffects: ['protection_zone'], statusEffects: ['anchored', 'defending'],
    resourceCost: { fury: 10 },
  },
  realm_rush: {
    id: 'realm_rush', name: 'Realm Rush',
    description: 'Charges through a line of tiles, striking everything in the path.',
    shape: 'line', range: 3, actionCost: 1, classRequired: 'warrior',
    damageType: 'physical', damage: 12,
    resourceCost: { fury: 20 },
  },
  // ---- Mage ----
  meteor_swarm: {
    id: 'meteor_swarm', name: 'Meteor Swarm',
    description: 'Rain fire from above in a burst radius. Leaves burning ground.',
    shape: 'radius', range: 4, actionCost: 1, classRequired: 'mage',
    damageType: 'magic', damage: 18,
    tileEffects: ['burning_ground'], statusEffects: ['burning'],
    resourceCost: { color_channel: 20 },
  },
  color_field: {
    id: 'color_field', name: 'Color Field',
    description: 'Paint a colored tile effect that slows and exposes enemies.',
    shape: 'radius', range: 3, actionCost: 1, classRequired: 'mage',
    damageType: 'magic', damage: 6,
    tileEffects: ['color_field'], statusEffects: ['marked'],
    resourceCost: { color_channel: 15 },
  },
  // ---- Priest ----
  holy_arrow: {
    id: 'holy_arrow', name: 'Holy Arrow',
    description: 'Radiant line attack with bonus pressure against corruption.',
    shape: 'line', range: 5, actionCost: 1, classRequired: 'priest',
    damageType: 'holy', damage: 12, statusEffects: ['corruption_cleanse'],
    resourceCost: { devotion: 15 },
  },
  ward_mend: {
    id: 'ward_mend', name: 'Ward Mend',
    description: 'Restores health to yourself or an ally in range.',
    shape: 'single', range: 3, actionCost: 1, classRequired: 'priest',
    damageType: 'holy', heal: 22,
    tileEffects: ['ward_restored'],
    resourceCost: { devotion: 20 },
  },
  clean_ground: {
    id: 'clean_ground', name: 'Clean Ground',
    description: 'Removes corruption, burning, and hostile conditions around a tile.',
    shape: 'radius', range: 2, actionCost: 1, classRequired: 'priest',
    tileEffects: ['purified'], statusEffects: ['cleanse'],
    resourceCost: { devotion: 10 },
  },
  // ---- Sharpshooter ----
  multishot: {
    id: 'multishot', name: 'Multishot',
    description: 'Fan of arrows that gains value against marked targets.',
    shape: 'cone', range: 4, actionCost: 1, classRequired: 'sharpshooter',
    damageType: 'ranged', damage: 10,
    resourceCost: { focus: 15 },
  },
  prey_mark: {
    id: 'prey_mark', name: 'Prey Mark',
    description: 'Exposes a weak point. Marked targets take bonus damage.',
    shape: 'single', range: 6, actionCost: 1, classRequired: 'sharpshooter',
    statusEffects: ['marked'],
    resourceCost: { focus: 10 },
  },
  snare_trap: {
    id: 'snare_trap', name: 'Snare Trap',
    description: 'Roots a target in place, preventing movement.',
    shape: 'single', range: 3, actionCost: 1, classRequired: 'sharpshooter',
    damageType: 'physical', damage: 6, statusEffects: ['rooted'],
    resourceCost: { focus: 8 },
  },
  command_pet: {
    id: 'command_pet', name: 'Command Pet',
    description: 'Your bonded companion harasses and pins a target.',
    shape: 'single', range: 5, actionCost: 1, classRequired: 'sharpshooter',
    damageType: 'physical', damage: 8, statusEffects: ['staggered'],
    resourceCost: { pet_bond: 10 },
  },
  // ---- Paladin ----
  thors_hammer: {
    id: 'thors_hammer', name: "Thor's Hammer",
    description: 'Thunder strike on a target tile with shock spread to adjacent enemies. Stuns.',
    shape: 'radius', range: 2, actionCost: 1, classRequired: 'paladin',
    damageType: 'holy', damage: 16, statusEffects: ['stunned'],
    resourceCost: { oath_charge: 25 },
  },
  oath_guard: {
    id: 'oath_guard', name: 'Oath Guard',
    description: 'Intercept attacks aimed at nearby allies. Greatly reduces incoming damage.',
    shape: 'self', range: 0, actionCost: 1, classRequired: 'paladin',
    statusEffects: ['defending', 'oath_guard'],
    resourceCost: { oath_charge: 15 },
  },
  vow_field: {
    id: 'vow_field', name: 'Vow Field',
    description: 'An aura of oath-light that heals and steadies you.',
    shape: 'self', range: 0, actionCost: 1, classRequired: 'paladin',
    damageType: 'holy', heal: 14, statusEffects: ['defending'],
    resourceCost: { oath_charge: 20 },
  },
  cleanse_strike: {
    id: 'cleanse_strike', name: 'Cleanse Strike',
    description: 'A weapon hit that burns corruption away and cures your conditions.',
    shape: 'single', range: 1, actionCost: 1, classRequired: 'paladin',
    damageType: 'holy', damage: 14, statusEffects: ['cleanse'],
    resourceCost: { oath_charge: 10 },
  },
  // ---- Enemy abilities ----
  fire_bolt: {
    id: 'fire_bolt', name: 'Fire Bolt',
    description: 'A spit of Pryan flame that ignites the target.',
    shape: 'single', range: 3, actionCost: 1,
    damageType: 'fire', damage: 10, statusEffects: ['burning'],
  },
  cinder_spit: {
    id: 'cinder_spit', name: 'Cinder Spit',
    description: 'A short gout of embers.',
    shape: 'single', range: 2, actionCost: 1,
    damageType: 'fire', damage: 8,
  },
  magma_slam: {
    id: 'magma_slam', name: 'Magma Slam',
    description: 'The golem slams the ground, searing everything adjacent.',
    shape: 'radius', range: 1, actionCost: 1,
    damageType: 'fire', damage: 16, statusEffects: ['burning'],
  },
  tide_hex: {
    id: 'tide_hex', name: 'Tide Hex',
    description: 'A crushing sphere of deep water that roots the target in silt.',
    shape: 'single', range: 3, actionCost: 1,
    damageType: 'water', damage: 9, statusEffects: ['rooted'],
  },
  tidal_slam: {
    id: 'tidal_slam', name: 'Tidal Slam',
    description: 'A shockwave of pressurized water that staggers everything adjacent.',
    shape: 'radius', range: 1, actionCost: 1,
    damageType: 'water', damage: 14, statusEffects: ['staggered'],
  },
  ink_cloud: {
    id: 'ink_cloud', name: 'Ink Cloud',
    description: 'A blot of abyssal ink that marks the target for the deep.',
    shape: 'single', range: 4, actionCost: 1,
    damageType: 'water', damage: 7, statusEffects: ['marked'],
  },
  // ---- Reactions ----
  active_block: {
    id: 'active_block', name: 'Active Block',
    description: 'Timed block that reduces damage and may open a counter window.',
    shape: 'self', range: 0, actionCost: 0, classRequired: 'warrior',
    reaction: true,
  },
  dodge: {
    id: 'dodge', name: 'Dodge',
    description: 'Evade an incoming attack with proper timing.',
    shape: 'self', range: 0, actionCost: 0,
    reaction: true,
  },
  aim_timing: {
    id: 'aim_timing', name: 'Aim Timing',
    description: 'Time a ranged shot for maximum precision.',
    shape: 'self', range: 0, actionCost: 0, classRequired: 'sharpshooter',
    reaction: true,
  },
};

export const ENEMIES: Record<string, EnemyDef> = {
  dummy_mk1: {
    id: 'dummy_mk1', name: 'Training Dummy', title: 'Mk I',
    hp: 30, attack: 0, defense: 2, initiative: 1, movement: 0,
    abilities: [], sprite: 'dummy',
    description: 'A stationary target for damage tutorials.',
    xpReward: 20, goldReward: 5,
  },
  dummy_reactive: {
    id: 'dummy_reactive', name: 'Reactive Dummy', title: 'Mk II',
    hp: 45, attack: 5, defense: 4, initiative: 5, movement: 2,
    abilities: ['attack'], sprite: 'dummy_red',
    description: 'Blocks, faces, and punishes poor positioning.',
    xpReward: 35, goldReward: 12, loot: ['lesser_soul_vial'],
  },
  sentinel_construct: {
    id: 'sentinel_construct', name: 'Sentinel Construct', title: 'Zone Guardian',
    hp: 110, attack: 12, defense: 8, initiative: 8, movement: 3,
    abilities: ['attack', 'guard_split'], sprite: 'sentinel',
    description: 'A mobile guardian with readable command geometry. The final tutorial test.',
    isBoss: true,
    xpReward: 90, goldReward: 40, loot: ['channel_tonic', 'lesser_soul_vial'],
  },
  cinder_imp: {
    id: 'cinder_imp', name: 'Cinder Imp', title: 'Pryan Skulker',
    hp: 35, attack: 8, defense: 3, initiative: 12, movement: 4,
    abilities: ['fire_bolt', 'cinder_spit'], sprite: 'imp',
    description: 'A quick, guttering flame-spirit that spits Pryan fire from a distance.',
    xpReward: 45, goldReward: 18, loot: ['ember_draught'],
  },
  magma_beetle: {
    id: 'magma_beetle', name: 'Magma Beetle', title: 'Caldera Bulwark',
    hp: 80, attack: 11, defense: 9, initiative: 4, movement: 2,
    abilities: ['attack'], sprite: 'beetle',
    description: 'Heat-swollen armor shrugs off weak blows. Crack it with stagger and rune force.',
    xpReward: 60, goldReward: 25, loot: ['lesser_soul_vial'],
  },
  ember_golem: {
    id: 'ember_golem', name: 'Ember Golem', title: 'Heart of the Caldera',
    hp: 160, attack: 15, defense: 10, initiative: 6, movement: 2,
    abilities: ['attack', 'magma_slam'], sprite: 'golem',
    description: 'A walking furnace bound by broken conduit runes. Its slam sears everything close.',
    isBoss: true,
    xpReward: 160, goldReward: 80, loot: ['ember_draught', 'greater_soul_vial'],
  },
  tide_lurker: {
    id: 'tide_lurker', name: 'Tide Lurker', title: 'Silt Prowler',
    hp: 50, attack: 10, defense: 5, initiative: 9, movement: 4,
    abilities: ['attack'], sprite: 'lurker',
    description: 'A pale, many-limbed thing that drags itself through the silt toward warm blood.',
    xpReward: 40, goldReward: 15, loot: ['lesser_soul_vial'],
  },
  drowned_acolyte: {
    id: 'drowned_acolyte', name: 'Drowned Acolyte', title: 'Choir of the Deep',
    hp: 40, attack: 8, defense: 4, initiative: 11, movement: 3,
    abilities: ['tide_hex', 'ink_cloud'], sprite: 'acolyte',
    description: 'A priest who kept praying as the sea came in. The prayer never changed; the god did.',
    xpReward: 50, goldReward: 22, loot: ['channel_tonic'],
  },
  reef_stalker: {
    id: 'reef_stalker', name: 'Reef Stalker', title: 'Current Rider',
    hp: 45, attack: 12, defense: 3, initiative: 15, movement: 6,
    abilities: ['attack'], sprite: 'stalker',
    description: 'Fast as the riptide it rides. It will be behind you before the bubbles clear.',
    xpReward: 55, goldReward: 20, loot: ['lesser_soul_vial'],
  },
  chapel_warden: {
    id: 'chapel_warden', name: 'Chapel Warden', title: 'Drowned Sentinel',
    hp: 140, attack: 14, defense: 9, initiative: 7, movement: 2,
    abilities: ['attack', 'tidal_slam', 'tide_hex'], sprite: 'warden',
    description: 'The Drowned Chapel\'s last warden, barnacled into its armor. It guards a light that should have died.',
    isBoss: true,
    xpReward: 150, goldReward: 75, loot: ['greater_soul_vial', 'pearl_of_clarity'],
  },
};

export const ITEMS: Record<string, ItemDef> = {
  lesser_soul_vial: {
    id: 'lesser_soul_vial', name: 'Lesser Soul Vial',
    description: 'Condensed soul-light. Restores 30 HP.',
    kind: 'consumable', heal: 30, icon: 'vial',
  },
  greater_soul_vial: {
    id: 'greater_soul_vial', name: 'Greater Soul Vial',
    description: 'A bright draught of recovered memory. Restores 60 HP.',
    kind: 'consumable', heal: 60, icon: 'vial_gold',
  },
  channel_tonic: {
    id: 'channel_tonic', name: 'Channel Tonic',
    description: 'Reopens strained channels. Restores 40 of your class resource.',
    kind: 'consumable', resourceRestore: 40, icon: 'tonic',
  },
  ember_draught: {
    id: 'ember_draught', name: 'Ember Draught',
    description: 'Pryan hearth-water. Cures burning and restores 15 HP.',
    kind: 'consumable', heal: 15, cure: ['burning'], icon: 'ember',
  },
  pearl_of_clarity: {
    id: 'pearl_of_clarity', name: 'Pearl of Clarity',
    description: 'A Lumenhollow pearl holding one clear thought. Cleanses all conditions and restores 10 HP.',
    kind: 'consumable', heal: 10, cure: ['burning', 'rooted', 'stunned', 'staggered', 'marked'], icon: 'pearl',
  },
};

export interface ShopStockEntry {
  itemId: string;
  price: number;
}

export const SHOP_STOCK: Record<string, { name: string; entries: ShopStockEntry[] }> = {
  tide_market: {
    name: 'Tide Market — Lumenhollow',
    entries: [
      { itemId: 'lesser_soul_vial', price: 30 },
      { itemId: 'channel_tonic', price: 25 },
      { itemId: 'ember_draught', price: 20 },
      { itemId: 'pearl_of_clarity', price: 45 },
      { itemId: 'greater_soul_vial', price: 60 },
    ],
  },
};

export const REALMS: Record<string, RealmDef> = {
  arianus: {
    id: 'arianus', name: 'Arianus', subtitle: 'Realm of Sky',
    law: 'gravity and flight', pressureType: 'wind_exposure',
    bgColor: '#0f1a2e', ambientColor: '#87CEEB',
    tileColors: { floor: '#2a3a4e', wall: '#1a2a3e', hazard: '#4a5a6e', conduit: '#5a7a9e' },
  },
  pryan: {
    id: 'pryan', name: 'Pryan', subtitle: 'Realm of Fire',
    law: 'density and heat', pressureType: 'heat_pressure',
    bgColor: '#1a0a05', ambientColor: '#FF6B35',
    tileColors: { floor: '#3a1a0a', wall: '#2a0a05', hazard: '#5a1a0a', conduit: '#7a2a0a' },
  },
  chelestra: {
    id: 'chelestra', name: 'Chelestra', subtitle: 'Realm of Sea',
    law: 'light and vision', pressureType: 'current_drag',
    bgColor: '#050f1a', ambientColor: '#4682B4',
    tileColors: { floor: '#0a1a2e', wall: '#051020', hazard: '#0a2a4a', conduit: '#1a3a5e' },
  },
  abarrach: {
    id: 'abarrach', name: 'Abarrach', subtitle: 'Realm of Stone',
    law: 'sound and death', pressureType: 'death_pressure',
    bgColor: '#0a0a0a', ambientColor: '#8B7355',
    tileColors: { floor: '#1a1510', wall: '#0a0505', hazard: '#2a2015', conduit: '#3a3020' },
  },
};

export const TERRAIN_DEFS: Record<string, TerrainDef> = {
  floor_soulwell: {
    type: 'floor_soulwell', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#2a2a4e', detailColor: '#3a3a5e', label: 'Soul Well Floor',
  },
  floor_stone: {
    type: 'floor_stone', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#3a3a3a', detailColor: '#4a4a4a', label: 'Stone Floor',
  },
  floor_stone_cracked: {
    type: 'floor_stone_cracked', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#3a3530', detailColor: '#4a4540', label: 'Cracked Stone',
  },
  floor_grass: {
    type: 'floor_grass', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#2d5016', detailColor: '#3a6b1e', label: 'Grass',
  },
  floor_dirt: {
    type: 'floor_dirt', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#5c3d1e', detailColor: '#6b4a28', label: 'Dirt',
  },
  floor_wood: {
    type: 'floor_wood', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#4a3520', detailColor: '#5a4530', label: 'Wood Floor',
  },
  floor_basalt: {
    type: 'floor_basalt', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#2a1410', detailColor: '#3a2018', label: 'Basalt Floor',
  },
  floor_obsidian: {
    type: 'floor_obsidian', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#1a0e14', detailColor: '#2a1a24', label: 'Obsidian Glass',
  },
  floor_ash: {
    type: 'floor_ash', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#3a3230', detailColor: '#4a4240', label: 'Ash Drift',
  },
  wall_stone: {
    type: 'wall_stone', walkable: false, blocksLoS: true, cover: 'full', elevation: 1,
    color: '#1a1a1a', detailColor: '#2a2a2a', label: 'Stone Wall',
  },
  wall_rune: {
    type: 'wall_rune', walkable: false, blocksLoS: true, cover: 'full', elevation: 1,
    color: '#1a0a2e', detailColor: '#2a1a3e', label: 'Rune Wall',
  },
  wall_breach: {
    type: 'wall_breach', walkable: false, blocksLoS: true, cover: 'full', elevation: 1,
    color: '#0a0a0a', detailColor: '#1a1a1a', label: 'Breach Wall',
  },
  wall_basalt: {
    type: 'wall_basalt', walkable: false, blocksLoS: true, cover: 'full', elevation: 1,
    color: '#160a06', detailColor: '#261410', label: 'Basalt Wall',
  },
  hazard_void: {
    type: 'hazard_void', walkable: false, blocksLoS: false, cover: 'none', elevation: -1,
    color: '#000000', detailColor: '#1a0a2e', label: 'Void', hazard: 'fall',
  },
  hazard_wind_lane: {
    type: 'hazard_wind_lane', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#2a3a4e', detailColor: '#87CEEB', label: 'Wind Lane', hazard: 'wind',
  },
  hazard_lift: {
    type: 'hazard_lift', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#3a4a5e', detailColor: '#5a7a9e', label: 'Updraft Lift', hazard: 'lift',
  },
  hazard_heat: {
    type: 'hazard_heat', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#4a1a0a', detailColor: '#FF6B35', label: 'Heat Shimmer', hazard: 'heat',
  },
  water: {
    type: 'water', walkable: false, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#0a2a4a', detailColor: '#1a4a6a', label: 'Water',
  },
  lava: {
    type: 'lava', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#8a2a0a', detailColor: '#FF6B35', label: 'Lava', hazard: 'burn',
  },
  nullwater: {
    type: 'nullwater', walkable: false, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#050510', detailColor: '#101020', label: 'Nullwater', hazard: 'null',
  },
  conduit_broken: {
    type: 'conduit_broken', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#2a2a2a', detailColor: '#444444', label: 'Broken Conduit',
  },
  conduit_active: {
    type: 'conduit_active', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#2a1a3e', detailColor: '#9333ea', label: 'Active Conduit',
  },
  cover_half: {
    type: 'cover_half', walkable: true, blocksLoS: false, cover: 'half', elevation: 0,
    color: '#3a3a3a', detailColor: '#2a4a2a', label: 'Low Cover',
  },
  cover_full: {
    type: 'cover_full', walkable: false, blocksLoS: true, cover: 'full', elevation: 1,
    color: '#2a2a2a', detailColor: '#3a4a3a', label: 'Full Cover',
  },
  // ---- Chelestra (Realm of Sea) ----
  floor_sand: {
    type: 'floor_sand', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#3a3a2e', detailColor: '#4a4a3e', label: 'Silted Sand',
  },
  floor_coral: {
    type: 'floor_coral', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#2e3a44', detailColor: '#3e4a54', label: 'Coral Flagstone',
  },
  floor_kelp: {
    type: 'floor_kelp', walkable: true, blocksLoS: false, cover: 'half', elevation: 0,
    color: '#14301e', detailColor: '#1e4a2e', label: 'Kelp Bed',
  },
  wall_coral: {
    type: 'wall_coral', walkable: false, blocksLoS: true, cover: 'full', elevation: 1,
    color: '#0e1a24', detailColor: '#1e2a34', label: 'Coral Ridge',
  },
  water_shallow: {
    type: 'water_shallow', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#0e2e4a', detailColor: '#1e4e6e', label: 'Shallow Water',
  },
  water_deep: {
    type: 'water_deep', walkable: false, blocksLoS: false, cover: 'none', elevation: -1,
    color: '#04101e', detailColor: '#0e2e4a', label: 'Deep Water', hazard: 'deep',
  },
  current_lane: {
    type: 'current_lane', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#0e3e5e', detailColor: '#4682B4', label: 'Riptide Current', hazard: 'current',
  },
  glow_coral: {
    type: 'glow_coral', walkable: true, blocksLoS: false, cover: 'none', elevation: 0,
    color: '#1e3a4e', detailColor: '#5eead4', label: 'Lumen Coral',
  },
};

export const CONDITION_INFO: Record<string, { label: string; description: string; color: string }> = {
  burning: { label: 'Burning', description: 'Takes 5 fire damage at the start of each turn.', color: '#FF6B35' },
  staggered: { label: 'Staggered', description: 'Guard broken — takes +50% damage from the next hit.', color: '#f1c40f' },
  marked: { label: 'Marked', description: 'Weak point exposed — takes +25% damage.', color: '#e74c3c' },
  rooted: { label: 'Rooted', description: 'Cannot move this round.', color: '#27ae60' },
  stunned: { label: 'Stunned', description: 'Skips the next turn.', color: '#a855f7' },
  defending: { label: 'Defending', description: 'The next incoming hit is halved.', color: '#60a5fa' },
  anchored: { label: 'Anchored', description: 'Immune to forced movement.', color: '#94a3b8' },
  oath_guard: { label: 'Oath Guard', description: 'Intercepting attacks aimed at nearby allies.', color: '#e67e22' },
};
