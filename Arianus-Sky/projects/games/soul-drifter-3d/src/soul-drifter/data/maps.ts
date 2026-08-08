import type { GameMap, MapEntity, Unit, AbilityId, EnemyId, RaceId, ClassId } from '../game/types';
import { ENEMIES, RACES } from './classes';

function makeTiles(width: number, height: number, terrain: string): any[][] {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x, y, terrain, elevation: 0,
    }))
  );
}

function rect(tiles: any[][], x: number, y: number, w: number, h: number, terrain: string, elevation = 0) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const ny = y + dy, nx = x + dx;
      if (ny >= 0 && ny < tiles.length && nx >= 0 && nx < tiles[0].length) {
        tiles[ny][nx] = { x: nx, y: ny, terrain, elevation };
      }
    }
  }
}

function border(tiles: any[][], terrain: string) {
  const h = tiles.length, w = tiles[0].length;
  for (let y = 0; y < h; y++) { tiles[y][0].terrain = terrain; tiles[y][w - 1].terrain = terrain; }
  for (let x = 0; x < w; x++) { tiles[0][x].terrain = terrain; tiles[h - 1][x].terrain = terrain; }
}

// ==================== SPAWN CHAMBER =====================
const spawnChamberTiles = makeTiles(10, 10, 'floor_soulwell');
border(spawnChamberTiles, 'wall_rune');
rect(spawnChamberTiles, 2, 2, 6, 6, 'floor_stone');
spawnChamberTiles[5][5].terrain = 'conduit_active';
spawnChamberTiles[4][5].terrain = 'floor_stone_cracked';
spawnChamberTiles[6][5].terrain = 'floor_stone_cracked';

const spawnChamberEntities: MapEntity[] = [
  { id: 'npc_guide', type: 'npc', x: 5, y: 3, name: 'Soul Keeper', data: 'welcome', interactable: true, sprite: 'keeper' },
  { id: 'essence_awakening', type: 'soul_essence', x: 5, y: 5, name: 'Awakening Essence', data: 'first_essence', interactable: true, sprite: 'essence' },
  { id: 'door_corridor', type: 'door', x: 5, y: 8, name: 'Soul Gate', data: 'corridor', interactable: true, sprite: 'gate' },
];

// ==================== ENTRY CORRIDOR =====================
const corridorTiles = makeTiles(12, 8, 'floor_stone');
border(corridorTiles, 'wall_stone');
rect(corridorTiles, 2, 2, 8, 4, 'floor_stone_cracked');
corridorTiles[4][3].terrain = 'cover_half';
corridorTiles[4][8].terrain = 'cover_half';
corridorTiles[3][5].terrain = 'hazard_wind_lane';
corridorTiles[3][6].terrain = 'hazard_wind_lane';
corridorTiles[5][5].terrain = 'conduit_broken';

const corridorEntities: MapEntity[] = [
  { id: 'npc_scholar', type: 'npc', x: 2, y: 4, name: 'Realm Scholar', data: 'corridor_lore', interactable: true, sprite: 'scholar' },
  { id: 'memory_shard', type: 'memory', x: 9, y: 4, name: 'Fragmented Memory', data: 'first_memory', interactable: true, sprite: 'memory' },
  { id: 'door_arena', type: 'door', x: 10, y: 4, name: 'Training Gate', data: 'arena', interactable: true, sprite: 'gate' },
  { id: 'door_spawn_back', type: 'door', x: 1, y: 4, name: 'Soul Gate (back)', data: 'spawn_chamber', interactable: true, sprite: 'gate' },
  { id: 'door_tide', type: 'door', x: 5, y: 1, name: 'Tide Gate', data: 'tide_approach', interactable: true, sprite: 'gate_sea' },
];

// ==================== TRAINING ARENA =====================
const arenaTiles = makeTiles(12, 12, 'floor_stone');
border(arenaTiles, 'wall_stone');
rect(arenaTiles, 2, 2, 8, 8, 'floor_stone_cracked');
arenaTiles[4][3].terrain = 'cover_half';
arenaTiles[4][8].terrain = 'cover_half';
arenaTiles[7][3].terrain = 'cover_half';
arenaTiles[7][8].terrain = 'cover_half';
arenaTiles[6][5].terrain = 'conduit_broken';
arenaTiles[6][6].terrain = 'conduit_broken';
arenaTiles[3][5].terrain = 'hazard_wind_lane';
arenaTiles[3][6].terrain = 'hazard_wind_lane';

const arenaEntities: MapEntity[] = [
  { id: 'essence_trial', type: 'soul_essence', x: 6, y: 9, name: 'Trial Essence', data: 'trial_essence', interactable: true, sprite: 'essence' },
  { id: 'door_corridor_back', type: 'door', x: 2, y: 2, name: 'Training Gate (back)', data: 'corridor', interactable: true, sprite: 'gate' },
  { id: 'door_caldera', type: 'door', x: 10, y: 10, name: 'Pryan Realm Gate', data: 'caldera', interactable: true, sprite: 'gate_fire', requiresObjective: 'defeat_sentinel' },
];

// ==================== CALDERA DESCENT (PRYAN) =====================
const calderaTiles = makeTiles(14, 12, 'floor_basalt');
border(calderaTiles, 'wall_basalt');
// Entry shelf
rect(calderaTiles, 1, 1, 5, 4, 'floor_ash');
// Central lava river
rect(calderaTiles, 6, 1, 2, 7, 'lava');
calderaTiles[4][6].terrain = 'floor_obsidian'; // bridge
calderaTiles[4][7].terrain = 'floor_obsidian';
// Obsidian gallery
rect(calderaTiles, 8, 2, 5, 4, 'floor_obsidian');
// Heat shimmer pockets
calderaTiles[2][8].terrain = 'hazard_heat';
calderaTiles[3][8].terrain = 'hazard_heat';
calderaTiles[9][7].terrain = 'hazard_heat';
calderaTiles[10][8].terrain = 'hazard_heat';
// Boss chamber
rect(calderaTiles, 8, 8, 5, 3, 'floor_basalt');
calderaTiles[10][9].terrain = 'conduit_broken';
calderaTiles[11][9].terrain = 'conduit_broken';
// Lower lava pool
rect(calderaTiles, 2, 9, 4, 2, 'lava');
calderaTiles[8][1].terrain = 'cover_half';
calderaTiles[11][3].terrain = 'cover_half';

const calderaEntities: MapEntity[] = [
  { id: 'door_arena_back', type: 'door', x: 2, y: 2, name: 'Realm Gate (back)', data: 'arena', interactable: true, sprite: 'gate' },
  { id: 'essence_ember', type: 'soul_essence', x: 12, y: 9, name: 'Ember Essence', data: 'ember_essence', interactable: true, sprite: 'essence_fire' },
  { id: 'memory_pryan', type: 'memory', x: 9, y: 3, name: 'Scorched Memory', data: 'pryan_memory', interactable: true, sprite: 'memory' },
];

// ==================== SUNKEN APPROACH (CHELESTRA) =====================
const approachTiles = makeTiles(12, 9, 'floor_sand');
border(approachTiles, 'wall_coral');
rect(approachTiles, 5, 4, 3, 2, 'water_shallow');
rect(approachTiles, 5, 6, 3, 1, 'water_deep');
rect(approachTiles, 2, 3, 2, 2, 'floor_kelp');
rect(approachTiles, 8, 5, 2, 2, 'floor_kelp');
approachTiles[1][3].terrain = 'glow_coral';
approachTiles[7][9].terrain = 'glow_coral';
approachTiles[2][6].terrain = 'water_shallow';

const approachEntities: MapEntity[] = [
  { id: 'door_corridor_sea', type: 'door', x: 1, y: 1, name: 'Tide Gate (back)', data: 'corridor', interactable: true, sprite: 'gate' },
  { id: 'door_lumenhollow', type: 'door', x: 10, y: 4, name: 'Lumenhollow Causeway', data: 'lumenhollow', interactable: true, sprite: 'gate_sea' },
  { id: 'memory_sunken', type: 'memory', x: 8, y: 7, name: 'Sunken Memory', data: 'sunken_memory', interactable: true, sprite: 'memory' },
];

// ==================== LUMENHOLLOW (UNDERWATER TOWN) =====================
const townTiles = makeTiles(13, 10, 'floor_coral');
border(townTiles, 'wall_coral');
rect(townTiles, 2, 2, 9, 6, 'floor_sand');            // plaza
rect(townTiles, 2, 2, 2, 2, 'wall_coral');            // inn building
rect(townTiles, 9, 2, 2, 2, 'wall_coral');            // market building
rect(townTiles, 5, 7, 3, 1, 'wall_coral');            // homes
rect(townTiles, 11, 1, 1, 8, 'water_deep');           // moat
townTiles[5][11].terrain = 'floor_sand';              // bridge crossing
townTiles[4][4].terrain = 'glow_coral';               // lumen lamps
townTiles[4][8].terrain = 'glow_coral';
townTiles[6][6].terrain = 'glow_coral';
townTiles[8][5].terrain = 'water_shallow';            // fountain pool

const townEntities: MapEntity[] = [
  { id: 'door_approach_back', type: 'door', x: 1, y: 5, name: 'Causeway (back)', data: 'tide_approach', interactable: true, sprite: 'gate' },
  { id: 'door_chapel', type: 'door', x: 11, y: 5, name: 'Chapel Crossing', data: 'drowned_chapel', interactable: true, sprite: 'gate_sea' },
  { id: 'door_trench', type: 'door', x: 6, y: 8, name: 'Trench Stairs', data: 'current_trench', interactable: true, sprite: 'gate_sea' },
  { id: 'npc_elder', type: 'npc', x: 6, y: 3, name: 'Elder Murmansk', data: 'elder_quest', interactable: true, sprite: 'elder' },
  { id: 'npc_merchant', type: 'npc', x: 10, y: 4, name: 'Tide Market', data: 'shop_tide', interactable: true, sprite: 'merchant' },
  { id: 'npc_innkeeper', type: 'npc', x: 3, y: 4, name: 'The Salty Drift (Inn)', data: 'inn_rest', interactable: true, sprite: 'innkeeper' },
  { id: 'npc_priestess', type: 'npc', x: 5, y: 5, name: 'Tide Priestess', data: 'priestess_lore', interactable: true, sprite: 'priestess' },
];

// ==================== DROWNED CHAPEL (CHELESTRA DUNGEON) =====================
const chapelTiles = makeTiles(12, 11, 'floor_coral');
border(chapelTiles, 'wall_coral');
rect(chapelTiles, 2, 2, 8, 7, 'floor_sand');          // nave
rect(chapelTiles, 5, 5, 2, 2, 'water_shallow');       // flooded font
chapelTiles[4][3].terrain = 'cover_half';             // pews
chapelTiles[5][3].terrain = 'cover_half';
chapelTiles[4][8].terrain = 'cover_half';
chapelTiles[5][8].terrain = 'cover_half';
chapelTiles[7][3].terrain = 'cover_half';
chapelTiles[7][8].terrain = 'cover_half';
chapelTiles[1][5].terrain = 'conduit_broken';         // altar
chapelTiles[1][6].terrain = 'conduit_broken';
chapelTiles[2][5].terrain = 'glow_coral';
chapelTiles[2][6].terrain = 'glow_coral';
chapelTiles[8][2].terrain = 'water_shallow';
chapelTiles[8][9].terrain = 'water_shallow';

const chapelEntities: MapEntity[] = [
  { id: 'door_town_back', type: 'door', x: 1, y: 2, name: 'Chapel Crossing (back)', data: 'lumenhollow', interactable: true, sprite: 'gate' },
  { id: 'essence_tide', type: 'soul_essence', x: 6, y: 1, name: 'Tide Essence', data: 'tide_essence', interactable: true, sprite: 'essence_sea' },
  { id: 'memory_chapel', type: 'memory', x: 2, y: 9, name: 'Drowned Memory', data: 'chapel_memory', interactable: true, sprite: 'memory' },
];

// ==================== CURRENT TRENCH (CHELESTRA GAUNTLET) =====================
const trenchTiles = makeTiles(14, 8, 'floor_sand');
border(trenchTiles, 'wall_coral');
rect(trenchTiles, 3, 2, 9, 2, 'current_lane');        // upper riptide
rect(trenchTiles, 3, 5, 9, 2, 'current_lane');        // lower riptide
rect(trenchTiles, 3, 4, 9, 1, 'water_deep');          // dividing depth
trenchTiles[1][4].terrain = 'floor_kelp';
trenchTiles[1][10].terrain = 'floor_kelp';
trenchTiles[6][1].terrain = 'floor_kelp';
trenchTiles[6][12].terrain = 'floor_kelp';
trenchTiles[1][6].terrain = 'glow_coral';
trenchTiles[6][7].terrain = 'glow_coral';

const trenchEntities: MapEntity[] = [
  { id: 'door_town_back2', type: 'door', x: 12, y: 1, name: 'Trench Stairs (back)', data: 'lumenhollow', interactable: true, sprite: 'gate' },
  { id: 'cache_trench', type: 'item', x: 1, y: 4, name: 'Sunken Strongbox', data: 'gold_cache_trench', interactable: true, sprite: 'cache' },
];

export const MAPS: Record<string, GameMap> = {
  spawn_chamber: {
    id: 'spawn_chamber',
    name: 'Spawn Chamber',
    width: 10,
    height: 10,
    tiles: spawnChamberTiles,
    spawnPoints: [{ x: 5, y: 2 }],
    realm: 'arianus',
    objectives: ['awaken', 'speak_to_keeper', 'collect_essence', 'enter_corridor'],
  },
  corridor: {
    id: 'corridor',
    name: 'Entry Corridor',
    width: 12,
    height: 8,
    tiles: corridorTiles,
    spawnPoints: [{ x: 1, y: 4 }],
    realm: 'arianus',
    objectives: ['learn_cover', 'find_memory', 'reach_arena'],
  },
  arena: {
    id: 'arena',
    name: 'Training Arena',
    width: 12,
    height: 12,
    tiles: arenaTiles,
    spawnPoints: [{ x: 2, y: 2 }],
    realm: 'arianus',
    objectives: ['defeat_dummies', 'defeat_sentinel', 'collect_trial_essence'],
  },
  caldera: {
    id: 'caldera',
    name: 'Caldera Descent',
    width: 14,
    height: 12,
    tiles: calderaTiles,
    spawnPoints: [{ x: 2, y: 2 }],
    realm: 'pryan',
    objectives: ['cross_the_lava', 'defeat_golem', 'collect_ember_essence'],
  },
  tide_approach: {
    id: 'tide_approach',
    name: 'Sunken Approach',
    width: 12,
    height: 9,
    tiles: approachTiles,
    spawnPoints: [{ x: 2, y: 2 }],
    realm: 'chelestra',
    objectives: ['reach_lumenhollow', 'find_sunken_memory'],
  },
  lumenhollow: {
    id: 'lumenhollow',
    name: 'Lumenhollow',
    width: 13,
    height: 10,
    tiles: townTiles,
    spawnPoints: [{ x: 2, y: 5 }],
    realm: 'chelestra',
    objectives: ['speak_to_elder', 'visit_the_chapel'],
  },
  drowned_chapel: {
    id: 'drowned_chapel',
    name: 'Drowned Chapel',
    width: 12,
    height: 11,
    tiles: chapelTiles,
    spawnPoints: [{ x: 2, y: 2 }],
    realm: 'chelestra',
    objectives: ['cleanse_chapel', 'collect_tide_essence'],
  },
  current_trench: {
    id: 'current_trench',
    name: 'Current Trench',
    width: 14,
    height: 8,
    tiles: trenchTiles,
    spawnPoints: [{ x: 12, y: 4 }],
    realm: 'chelestra',
    objectives: ['ride_the_current', 'claim_the_cache'],
  },
};

export function getMapEntities(mapId: string): MapEntity[] {
  if (mapId === 'spawn_chamber') return spawnChamberEntities;
  if (mapId === 'corridor') return corridorEntities;
  if (mapId === 'arena') return arenaEntities;
  if (mapId === 'caldera') return calderaEntities;
  if (mapId === 'tide_approach') return approachEntities;
  if (mapId === 'lumenhollow') return townEntities;
  if (mapId === 'drowned_chapel') return chapelEntities;
  if (mapId === 'current_trench') return trenchEntities;
  return [];
}

// ==================== ENEMY SPAWN TABLES =====================
interface EnemySpawn {
  uid: string;
  enemyId: EnemyId;
  x: number;
  y: number;
}

const MAP_ENEMY_SPAWNS: Record<string, EnemySpawn[]> = {
  arena: [
    { uid: 'e_dummy1', enemyId: 'dummy_mk1', x: 4, y: 4 },
    { uid: 'e_dummy2', enemyId: 'dummy_mk1', x: 7, y: 4 },
    { uid: 'e_dummy3', enemyId: 'dummy_reactive', x: 5, y: 7 },
    { uid: 'e_sentinel', enemyId: 'sentinel_construct', x: 9, y: 6 },
  ],
  caldera: [
    { uid: 'e_imp1', enemyId: 'cinder_imp', x: 5, y: 3 },
    { uid: 'e_imp2', enemyId: 'cinder_imp', x: 9, y: 4 },
    { uid: 'e_beetle', enemyId: 'magma_beetle', x: 10, y: 6 },
    { uid: 'e_golem', enemyId: 'ember_golem', x: 10, y: 9 },
  ],
  tide_approach: [
    { uid: 'e_lurker1', enemyId: 'tide_lurker', x: 5, y: 3 },
    { uid: 'e_lurker2', enemyId: 'tide_lurker', x: 8, y: 6 },
  ],
  drowned_chapel: [
    { uid: 'e_acolyte1', enemyId: 'drowned_acolyte', x: 3, y: 3 },
    { uid: 'e_acolyte2', enemyId: 'drowned_acolyte', x: 8, y: 3 },
    { uid: 'e_warden', enemyId: 'chapel_warden', x: 5, y: 6 },
  ],
  current_trench: [
    { uid: 'e_stalker1', enemyId: 'reef_stalker', x: 6, y: 2 },
    { uid: 'e_stalker2', enemyId: 'reef_stalker', x: 8, y: 5 },
    { uid: 'e_stalker3', enemyId: 'reef_stalker', x: 5, y: 5 },
  ],
};

export function spawnMapEnemies(mapId: string, defeatedIds: string[]): Unit[] {
  const spawns = MAP_ENEMY_SPAWNS[mapId] || [];
  return spawns
    .filter(s => !defeatedIds.includes(s.uid))
    .map(s => {
      const def = ENEMIES[s.enemyId];
      return {
        id: s.uid,
        name: def.name,
        isPlayer: false,
        enemyId: def.id,
        level: def.isBoss ? 3 : 1,
        xp: 0,
        hp: def.hp,
        maxHp: def.hp,
        mp: 0,
        maxMp: 0,
        attack: def.attack,
        defense: def.defense,
        initiative: def.initiative,
        movement: def.movement,
        position: { x: s.x, y: s.y },
        facing: 'west' as const,
        abilities: def.abilities,
        resources: {},
        conditions: [],
        soulMemories: [],
        equipment: [],
        sprite: def.sprite,
        portrait: def.sprite,
      };
    });
}

// ==================== CHARACTER FACTORY =====================
const CLASS_BASES: Record<string, {
  hp: number; maxHp: number; mp: number; maxMp: number;
  attack: number; defense: number;
  initiative: number; movement: number;
  abilities: AbilityId[];
  resources: Record<string, number>;
  equipment: string[];
  sprite: string;
  portrait: string;
}> = {
  warrior: {
    hp: 100, maxHp: 100, mp: 30, maxMp: 30, attack: 10, defense: 6, initiative: 10, movement: 4,
    abilities: ['move', 'attack', 'defend', 'interact', 'inspect', 'rune_slash', 'guard_split', 'anchor_step', 'realm_rush'],
    resources: { fury: 50, rune_stability: 100 },
    equipment: ['blade_spear', 'segmented_armor'],
    sprite: 'warrior', portrait: 'warrior_portrait',
  },
  mage: {
    hp: 60, maxHp: 60, mp: 80, maxMp: 80, attack: 6, defense: 3, initiative: 12, movement: 3,
    abilities: ['move', 'attack', 'defend', 'interact', 'inspect', 'meteor_swarm', 'color_field'],
    resources: { color_channel: 100, formula_prep: 0 },
    equipment: ['prism_wand', 'channel_bands'],
    sprite: 'mage', portrait: 'mage_portrait',
  },
  priest: {
    hp: 75, maxHp: 75, mp: 60, maxMp: 60, attack: 7, defense: 4, initiative: 8, movement: 3,
    abilities: ['move', 'attack', 'defend', 'interact', 'inspect', 'holy_arrow', 'ward_mend', 'clean_ground'],
    resources: { devotion: 100, ward_charge: 2 },
    equipment: ['holy_bow', 'ward_cloth'],
    sprite: 'priest', portrait: 'priest_portrait',
  },
  sharpshooter: {
    hp: 70, maxHp: 70, mp: 50, maxMp: 50, attack: 9, defense: 4, initiative: 14, movement: 5,
    abilities: ['move', 'attack', 'defend', 'interact', 'inspect', 'multishot', 'prey_mark', 'snare_trap', 'command_pet'],
    resources: { focus: 100, pet_bond: 100 },
    equipment: ['hunter_bow', 'travel_armor', 'companion_token'],
    sprite: 'sharpshooter', portrait: 'sharpshooter_portrait',
  },
  paladin: {
    hp: 110, maxHp: 110, mp: 40, maxMp: 40, attack: 9, defense: 8, initiative: 7, movement: 3,
    abilities: ['move', 'attack', 'defend', 'interact', 'inspect', 'thors_hammer', 'oath_guard', 'vow_field', 'cleanse_strike'],
    resources: { oath_charge: 100, aura: 0 },
    equipment: ['war_hammer', 'warded_plate', 'oath_sigil'],
    sprite: 'paladin', portrait: 'paladin_portrait',
  },
};

export function getClassBase(classId: string) {
  return CLASS_BASES[classId] || CLASS_BASES.warrior;
}

export function createCharacter(
  classId: string,
  name: string,
  raceId: string,
  modifiers: { hp: number; mp: number; initiative: number; movement: number }
): Unit {
  const base = getClassBase(classId);
  const race = RACES[raceId] || RACES.human;
  const rm = race.modifiers;
  return {
    id: 'pc_' + classId,
    name,
    isPlayer: true,
    classId: classId as ClassId,
    raceId: race.id as RaceId,
    level: 1,
    xp: 0,
    hp: base.hp + modifiers.hp + rm.hp,
    maxHp: base.maxHp + modifiers.hp + rm.hp,
    mp: base.mp + modifiers.mp + rm.mp,
    maxMp: base.maxMp + modifiers.mp + rm.mp,
    attack: base.attack,
    defense: base.defense,
    initiative: Math.max(1, base.initiative + modifiers.initiative + rm.initiative),
    movement: Math.max(1, base.movement + modifiers.movement + rm.movement),
    position: { x: 0, y: 0 },
    facing: 'south',
    abilities: base.abilities,
    resources: { ...base.resources },
    conditions: [],
    soulMemories: [],
    equipment: base.equipment,
    sprite: base.sprite,
    portrait: base.portrait,
  };
}

/** Primary resource key per class (used for ability costs / display). */
export function primaryResource(classId?: string): string {
  switch (classId) {
    case 'warrior': return 'fury';
    case 'mage': return 'color_channel';
    case 'priest': return 'devotion';
    case 'sharpshooter': return 'focus';
    case 'paladin': return 'oath_charge';
    default: return 'fury';
  }
}

/** XP needed to reach the next level from the current one. */
export function xpToNext(level: number): number {
  return level * 80;
}
