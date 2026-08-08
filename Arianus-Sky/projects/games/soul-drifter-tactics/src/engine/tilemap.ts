export type TileType =
  | 'grass' | 'grass_dark' | 'grass_tall' | 'dirt' | 'dirt_path' | 'sand'
  | 'stone' | 'stone_floor' | 'stone_wall' | 'stone_cracked'
  | 'water' | 'water_deep' | 'water_shallow' | 'lava' | 'lava_cracked'
  | 'cloud' | 'cloud_dark' | 'void' | 'void_floor' | 'void_wall'
  | 'wood_floor' | 'bridge' | 'cave_floor' | 'cave_wall' | 'ice'
  | 'swamp' | 'mushroom' | 'crystal' | 'bone' | 'ash' | 'obsidian'
  | 'tree' | 'rock' | 'wall' | 'flower' | 'bush';

export interface TileDef {
  type: TileType;
  walkable: boolean;
  color: string;
  detailColor: string;
  label: string;
  z: number;
}

export interface MapEntity {
  id: string;
  type: 'enemy' | 'portal' | 'item' | 'npc' | 'structure';
  x: number;
  y: number;
  name: string;
  data?: string;
  defeated?: boolean;
}

export interface WorldMap {
  id: string;
  name: string;
  subtitle: string;
  width: number;
  height: number;
  tiles: TileType[][];
  entities: MapEntity[];
  spawnX: number;
  spawnY: number;
  element: string;
  bgColor: string;
  ambient: string;
}

export const TILE_DEFS: Record<TileType, TileDef> = {
  grass:      { type: 'grass',      walkable: true,  color: '#3d6b28', detailColor: '#4a7f32', label: 'Grass', z: 0 },
  grass_dark: { type: 'grass_dark', walkable: true,  color: '#2d5a1e', detailColor: '#356b24', label: 'Dark Grass', z: 0 },
  grass_tall: { type: 'grass_tall', walkable: true,  color: '#4a7f32', detailColor: '#5a9438', label: 'Tall Grass', z: 0 },
  dirt:       { type: 'dirt',       walkable: true,  color: '#6b4e2e', detailColor: '#7a5a36', label: 'Dirt', z: 0 },
  dirt_path:  { type: 'dirt_path',  walkable: true,  color: '#8b6e4e', detailColor: '#9a7a58', label: 'Path', z: 0 },
  sand:       { type: 'sand',       walkable: true,  color: '#c4a35a', detailColor: '#d4b368', label: 'Sand', z: 0 },
  stone:       { type: 'stone',       walkable: true,  color: '#5a5a5a', detailColor: '#6a6a6a', label: 'Stone', z: 0 },
  stone_floor: { type: 'stone_floor', walkable: true,  color: '#4a4a4a', detailColor: '#5a5a5a', label: 'Stone Floor', z: 0 },
  stone_wall:  { type: 'stone_wall',  walkable: false, color: '#2a2a2a', detailColor: '#3a3a3a', label: 'Stone Wall', z: 0 },
  stone_cracked: { type: 'stone_cracked', walkable: true, color: '#4a4540', detailColor: '#5a5550', label: 'Cracked Stone', z: 0 },
  water:         { type: 'water',         walkable: false, color: '#1a4a7a', detailColor: '#245a8a', label: 'Water', z: 0 },
  water_deep:    { type: 'water_deep',    walkable: false, color: '#0a2a4a', detailColor: '#143a5a', label: 'Deep Water', z: 0 },
  water_shallow: { type: 'water_shallow', walkable: true,  color: '#2a6a9a', detailColor: '#3a7aaa', label: 'Shallows', z: 0 },
  lava:         { type: 'lava',         walkable: false, color: '#5a1a0a', detailColor: '#7a2a0e', label: 'Lava', z: 0 },
  lava_cracked: { type: 'lava_cracked', walkable: false, color: '#4a1510', detailColor: '#6a2010', label: 'Cracked Lava', z: 0 },
  cloud:      { type: 'cloud',      walkable: true,  color: '#6a7a8a', detailColor: '#7a8a9a', label: 'Cloud', z: 0 },
  cloud_dark: { type: 'cloud_dark', walkable: true,  color: '#4a5a6a', detailColor: '#5a6a7a', label: 'Storm Cloud', z: 0 },
  void:       { type: 'void',       walkable: false, color: '#0a0a0a', detailColor: '#141414', label: 'Void', z: 0 },
  void_floor: { type: 'void_floor', walkable: true,  color: '#1a0a1a', detailColor: '#2a152a', label: 'Void Floor', z: 0 },
  void_wall:  { type: 'void_wall',  walkable: false, color: '#0a050a', detailColor: '#141014', label: 'Void Wall', z: 0 },
  wood_floor: { type: 'wood_floor', walkable: true,  color: '#5a3a1e', detailColor: '#6a4a2e', label: 'Wood Floor', z: 0 },
  bridge:     { type: 'bridge',     walkable: true,  color: '#4a3520', detailColor: '#5a4530', label: 'Bridge', z: 0 },
  cave_floor: { type: 'cave_floor', walkable: true,  color: '#3a3020', detailColor: '#4a4030', label: 'Cave Floor', z: 0 },
  cave_wall:  { type: 'cave_wall',  walkable: false, color: '#1a1510', detailColor: '#2a2520', label: 'Cave Wall', z: 0 },
  ice:      { type: 'ice',      walkable: true,  color: '#aaddff', detailColor: '#bbeeff', label: 'Ice', z: 0 },
  swamp:    { type: 'swamp',    walkable: true,  color: '#2a3a1a', detailColor: '#354a24', label: 'Swamp', z: 0 },
  mushroom: { type: 'mushroom', walkable: false, color: '#3a2a1e', detailColor: '#4a3a2e', label: 'Mushrooms', z: 0 },
  crystal:  { type: 'crystal',  walkable: false, color: '#1a3a5c', detailColor: '#2a5a8c', label: 'Crystal', z: 0 },
  bone:     { type: 'bone',     walkable: true,  color: '#3a3a2e', detailColor: '#4a4a3e', label: 'Bones', z: 0 },
  ash:      { type: 'ash',      walkable: true,  color: '#3a3028', detailColor: '#4a4038', label: 'Ash', z: 0 },
  obsidian: { type: 'obsidian', walkable: false, color: '#1a0a1a', detailColor: '#2a152a', label: 'Obsidian', z: 0 },
  tree:  { type: 'tree',  walkable: false, color: '#1a3a1a', detailColor: '#2d5a2d', label: 'Tree', z: 1 },
  rock:  { type: 'rock',  walkable: false, color: '#3a3a3a', detailColor: '#4a4a4a', label: 'Rock', z: 1 },
  wall:  { type: 'wall',  walkable: false, color: '#1a1a1a', detailColor: '#2a2a2a', label: 'Wall', z: 1 },
  flower:{ type: 'flower',walkable: true,  color: '#3d6b28', detailColor: '#d4a5d4', label: 'Flowers', z: 1 },
  bush:  { type: 'bush',  walkable: false, color: '#2a4a1a', detailColor: '#3a5a28', label: 'Bush', z: 1 },
};

function makeMap(width: number, height: number, fill: TileType): TileType[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
}

function rect(map: TileType[][], x: number, y: number, w: number, h: number, tile: TileType) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const ny = y + dy, nx = x + dx;
      if (ny >= 0 && ny < map.length && nx >= 0 && nx < map[0].length) map[ny][nx] = tile;
    }
  }
}

function scatter(map: TileType[][], onto: TileType[], place: TileType, count: number, margin = 2) {
  const h = map.length, w = map[0].length;
  let placed = 0, attempts = 0;
  while (placed < count && attempts < count * 50) {
    attempts++;
    const x = Math.floor(Math.random() * (w - margin * 2)) + margin;
    const y = Math.floor(Math.random() * (h - margin * 2)) + margin;
    if (onto.includes(map[y][x])) { map[y][x] = place; placed++; }
  }
}

function noise(map: TileType[][], base: TileType, variant: TileType, chance: number) {
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[0].length; x++) {
      if (map[y][x] === base && Math.random() < chance) map[y][x] = variant;
    }
  }
}

function path(map: TileType[][], x1: number, y1: number, x2: number, y2: number, tile: TileType, width: number = 1) {
  let cx = x1, cy = y1;
  while (cx !== x2 || cy !== y2) {
    for (let dy = -Math.floor((width - 1) / 2); dy <= Math.floor(width / 2); dy++) {
      for (let dx = -Math.floor((width - 1) / 2); dx <= Math.floor(width / 2); dx++) {
        const ny = cy + dy, nx = cx + dx;
        if (ny >= 0 && ny < map.length && nx >= 0 && nx < map[0].length) map[ny][nx] = tile;
      }
    }
    if (cx < x2) cx++;
    else if (cx > x2) cx--;
    else if (cy < y2) cy++;
    else if (cy > y2) cy--;
  }
  for (let dy = -Math.floor((width - 1) / 2); dy <= Math.floor(width / 2); dy++) {
    for (let dx = -Math.floor((width - 1) / 2); dx <= Math.floor(width / 2); dx++) {
      const ny = cy + dy, nx = cx + dx;
      if (ny >= 0 && ny < map.length && nx >= 0 && nx < map[0].length) map[ny][nx] = tile;
    }
  }
}

// ===================== ARIANUS - World of Air =====================
const arianus = makeMap(24, 18, 'void');
rect(arianus, 2, 2, 20, 14, 'cloud');
rect(arianus, 5, 5, 6, 5, 'grass');
rect(arianus, 13, 4, 7, 6, 'grass');
rect(arianus, 8, 11, 5, 4, 'grass');
rect(arianus, 16, 12, 4, 3, 'grass');
path(arianus, 8, 7, 13, 7, 'dirt_path', 2);
path(arianus, 10, 7, 10, 11, 'dirt_path', 2);
path(arianus, 16, 7, 18, 12, 'dirt_path', 2);
rect(arianus, 7, 6, 2, 2, 'water');
rect(arianus, 15, 5, 2, 2, 'water');
scatter(arianus, ['grass', 'cloud'], 'tree', 12, 2);
scatter(arianus, ['grass', 'cloud'], 'rock', 6, 2);
scatter(arianus, ['grass'], 'flower', 8, 2);
noise(arianus, 'grass', 'grass_dark', 0.15);
noise(arianus, 'cloud', 'cloud_dark', 0.1);

// ===================== PRYAN - World of Fire =====================
const pryan = makeMap(24, 18, 'stone');
rect(pryan, 2, 2, 20, 14, 'ash');
rect(pryan, 4, 4, 5, 5, 'dirt');
rect(pryan, 14, 3, 6, 5, 'dirt');
rect(pryan, 6, 11, 5, 4, 'dirt');
rect(pryan, 15, 10, 5, 5, 'dirt');
path(pryan, 3, 9, 21, 9, 'lava', 2);
path(pryan, 12, 2, 12, 16, 'lava', 2);
path(pryan, 11, 9, 13, 9, 'bridge', 1);
path(pryan, 12, 8, 12, 10, 'bridge', 1);
scatter(pryan, ['ash', 'dirt', 'stone'], 'obsidian', 8, 2);
scatter(pryan, ['ash', 'dirt'], 'rock', 10, 2);
scatter(pryan, ['ash', 'dirt'], 'stone_cracked', 6, 2);
noise(pryan, 'dirt', 'sand', 0.2);

// ===================== ABARRACH - World of Stone =====================
const abarrach = makeMap(24, 18, 'stone_wall');
rect(abarrach, 2, 2, 20, 14, 'cave_floor');
rect(abarrach, 4, 4, 5, 4, 'stone_floor');
rect(abarrach, 14, 3, 6, 5, 'stone_floor');
rect(abarrach, 5, 10, 6, 4, 'stone_floor');
rect(abarrach, 15, 10, 6, 4, 'stone_floor');
for (let y = 6; y < 14; y += 4) {
  for (let x = 6; x < 18; x += 4) {
    if (Math.random() > 0.3) abarrach[y][x] = 'stone_wall';
  }
}
scatter(abarrach, ['cave_floor', 'stone_floor'], 'crystal', 8, 2);
scatter(abarrach, ['cave_floor'], 'mushroom', 6, 2);
scatter(abarrach, ['cave_floor', 'stone_floor'], 'bone', 5, 2);
path(abarrach, 3, 8, 21, 8, 'lava_cracked', 1);
noise(abarrach, 'cave_floor', 'stone_cracked', 0.1);

// ===================== CHELESTRA - World of Water =====================
const chelestra = makeMap(24, 18, 'water_deep');
rect(chelestra, 2, 3, 7, 5, 'sand');
rect(chelestra, 12, 2, 8, 6, 'sand');
rect(chelestra, 5, 10, 6, 5, 'sand');
rect(chelestra, 15, 9, 6, 6, 'sand');
rect(chelestra, 9, 6, 4, 3, 'sand');
for (let y = 1; y < 17; y++) {
  for (let x = 1; x < 23; x++) {
    if (chelestra[y][x] === 'sand') {
      const neighbors = [[0,1],[0,-1],[1,0],[-1,0]];
      for (const [dy, dx] of neighbors) {
        const ny = y + dy, nx = x + dx;
        if (ny >= 0 && ny < 18 && nx >= 0 && nx < 24 && chelestra[ny][nx] === 'water_deep') {
          chelestra[ny][nx] = 'water_shallow';
        }
      }
    }
  }
}
rect(chelestra, 3, 4, 5, 3, 'grass');
rect(chelestra, 13, 3, 6, 4, 'grass');
rect(chelestra, 6, 11, 4, 3, 'grass');
path(chelestra, 9, 5, 12, 5, 'bridge', 1);
path(chelestra, 10, 5, 10, 10, 'bridge', 1);
path(chelestra, 11, 10, 15, 10, 'bridge', 1);
scatter(chelestra, ['grass'], 'tree', 10, 2);
scatter(chelestra, ['sand'], 'rock', 6, 2);
scatter(chelestra, ['grass'], 'flower', 6, 2);

// ===================== LABYRINTH - The Prison =====================
const labyrinth = makeMap(24, 18, 'void');
rect(labyrinth, 2, 2, 20, 14, 'void_floor');
for (let y = 4; y < 14; y += 3) {
  for (let x = 3; x < 21; x++) {
    if (x % 5 !== 0 && Math.random() > 0.2) labyrinth[y][x] = 'void_wall';
  }
}
for (let x = 5; x < 19; x += 4) {
  for (let y = 3; y < 15; y++) {
    if (y % 4 !== 0 && Math.random() > 0.2) labyrinth[y][x] = 'void_wall';
  }
}
rect(labyrinth, 4, 4, 3, 3, 'void_floor');
rect(labyrinth, 16, 4, 4, 3, 'void_floor');
rect(labyrinth, 5, 11, 4, 3, 'void_floor');
rect(labyrinth, 15, 11, 4, 3, 'void_floor');
scatter(labyrinth, ['void_floor'], 'bone', 10, 2);
scatter(labyrinth, ['void_floor'], 'crystal', 6, 2);
scatter(labyrinth, ['void_floor'], 'obsidian', 8, 2);
path(labyrinth, 3, 9, 21, 9, 'lava_cracked', 1);

export const WORLD_MAPS: WorldMap[] = [
  {
    id: 'world_arianus',
    name: 'Arianus',
    subtitle: 'World of Air',
    width: 24,
    height: 18,
    tiles: arianus,
    spawnX: 3,
    spawnY: 3,
    element: 'air',
    bgColor: '#0f0f2e',
    ambient: '#87CEEB',
    entities: [
      { id: 'town_skyport', type: 'structure', x: 7, y: 6, name: 'Skyport', data: 'town' },
      { id: 'dungeon_storm', type: 'structure', x: 16, y: 6, name: 'Storm Spire', data: 'dungeon' },
      { id: 'cave_cloud', type: 'structure', x: 9, y: 12, name: 'Cloud Cavern', data: 'cave' },
      { id: 'e1', type: 'enemy', x: 6, y: 4, name: 'Air Wisp', data: 'enemy_wisp' },
      { id: 'e2', type: 'enemy', x: 14, y: 5, name: 'Harpy', data: 'enemy_harpy' },
      { id: 'e3', type: 'enemy', x: 10, y: 10, name: 'Storm Vortex', data: 'enemy_vortex' },
      { id: 'e4', type: 'enemy', x: 18, y: 8, name: 'Sky Serpent', data: 'enemy_serpent' },
      { id: 'boss', type: 'enemy', x: 19, y: 13, name: 'Dragon Snake', data: 'boss_dragon_snake' },
      { id: 'portal_pryan', type: 'portal', x: 21, y: 2, name: 'To Pryan', data: 'world_pryan' },
      { id: 'portal_back', type: 'portal', x: 1, y: 16, name: 'To Nexus', data: 'world_arianus' },
      { id: 'potion1', type: 'item', x: 5, y: 5, name: 'Healing Potion', data: 'item_potion' },
      { id: 'potion2', type: 'item', x: 15, y: 7, name: 'Healing Potion', data: 'item_potion' },
      { id: 'mana1', type: 'item', x: 10, y: 8, name: 'Mana Vial', data: 'item_mana' },
      { id: 'npc_elder', type: 'npc', x: 8, y: 7, name: 'Sky Elder', data: 'Welcome to Skyport, traveler. The winds guide your path.' },
      { id: 'npc_guard', type: 'npc', x: 15, y: 5, name: 'Wind Guard', data: 'Beware the Storm Spire. Ancient magic stirs within.' },
    ],
  },
  {
    id: 'world_pryan',
    name: 'Pryan',
    subtitle: 'World of Fire',
    width: 24,
    height: 18,
    tiles: pryan,
    spawnX: 3,
    spawnY: 3,
    element: 'fire',
    bgColor: '#1a0a05',
    ambient: '#FF6B35',
    entities: [
      { id: 'town_ember', type: 'structure', x: 6, y: 6, name: 'Emberhold', data: 'town' },
      { id: 'dungeon_magma', type: 'structure', x: 17, y: 5, name: 'Magma Core', data: 'dungeon' },
      { id: 'cave_sulfur', type: 'structure', x: 8, y: 13, name: 'Sulfur Cave', data: 'cave' },
      { id: 'e5', type: 'enemy', x: 10, y: 5, name: 'Fire Spark', data: 'enemy_spark' },
      { id: 'e6', type: 'enemy', x: 16, y: 7, name: 'Salamander', data: 'enemy_salamander' },
      { id: 'e7', type: 'enemy', x: 8, y: 12, name: 'Ash Phoenix', data: 'enemy_phoenix' },
      { id: 'e8', type: 'enemy', x: 18, y: 13, name: 'Magma Beast', data: 'enemy_magma' },
      { id: 'boss2', type: 'enemy', x: 20, y: 15, name: 'Fire Dragon', data: 'boss_fire_dragon' },
      { id: 'portal_abarrach', type: 'portal', x: 21, y: 2, name: 'To Abarrach', data: 'world_abarrach' },
      { id: 'portal_back', type: 'portal', x: 1, y: 16, name: 'To Arianus', data: 'world_arianus' },
      { id: 'potion3', type: 'item', x: 5, y: 4, name: 'Healing Potion', data: 'item_potion' },
      { id: 'elixir1', type: 'item', x: 15, y: 12, name: 'Elixir', data: 'item_elixir' },
      { id: 'npc_smith', type: 'npc', x: 7, y: 7, name: 'Fire Smith', data: 'The forge burns eternal. What do you seek?' },
    ],
  },
  {
    id: 'world_abarrach',
    name: 'Abarrach',
    subtitle: 'World of Stone',
    width: 24,
    height: 18,
    tiles: abarrach,
    spawnX: 3,
    spawnY: 3,
    element: 'stone',
    bgColor: '#0f0a05',
    ambient: '#8B7355',
    entities: [
      { id: 'town_sartan', type: 'structure', x: 6, y: 5, name: "Sartan's Rest", data: 'town' },
      { id: 'dungeon_deep', type: 'structure', x: 16, y: 5, name: 'The Deep Roads', data: 'dungeon' },
      { id: 'cave_crystal', type: 'structure', x: 7, y: 12, name: 'Crystal Cavern', data: 'cave' },
      { id: 'e9', type: 'enemy', x: 9, y: 6, name: 'Earth Spirit', data: 'enemy_earth' },
      { id: 'e10', type: 'enemy', x: 15, y: 6, name: 'Stone Golem', data: 'enemy_golem' },
      { id: 'e11', type: 'enemy', x: 7, y: 11, name: 'Sartan Lich', data: 'enemy_lich' },
      { id: 'e12', type: 'enemy', x: 17, y: 12, name: 'Crystal Wraith', data: 'enemy_wraith' },
      { id: 'boss3', type: 'enemy', x: 20, y: 14, name: 'Kleitus', data: 'boss_kleitus' },
      { id: 'portal_chelestra', type: 'portal', x: 21, y: 2, name: 'To Chelestra', data: 'world_chelestra' },
      { id: 'portal_back', type: 'portal', x: 1, y: 16, name: 'To Pryan', data: 'world_pryan' },
      { id: 'potion4', type: 'item', x: 5, y: 4, name: 'Healing Potion', data: 'item_potion' },
      { id: 'mana2', type: 'item', x: 17, y: 6, name: 'Mana Vial', data: 'item_mana' },
      { id: 'npc_ghost', type: 'npc', x: 6, y: 6, name: 'Ancient Ghost', data: 'The dead do not rest easy here...' },
    ],
  },
  {
    id: 'world_chelestra',
    name: 'Chelestra',
    subtitle: 'World of Water',
    width: 24,
    height: 18,
    tiles: chelestra,
    spawnX: 3,
    spawnY: 4,
    element: 'water',
    bgColor: '#050f1a',
    ambient: '#4682B4',
    entities: [
      { id: 'town_tide', type: 'structure', x: 4, y: 4, name: 'Tideharbor', data: 'town' },
      { id: 'dungeon_abyss', type: 'structure', x: 15, y: 4, name: 'Abyssal Keep', data: 'dungeon' },
      { id: 'cave_sunken', type: 'structure', x: 7, y: 12, name: 'Sunken Grotto', data: 'cave' },
      { id: 'e13', type: 'enemy', x: 5, y: 5, name: 'Merfolk', data: 'enemy_merfolk' },
      { id: 'e14', type: 'enemy', x: 14, y: 5, name: 'Leviathan Spawn', data: 'enemy_leviathan' },
      { id: 'e15', type: 'enemy', x: 8, y: 12, name: 'Sartan Mage', data: 'enemy_sartan' },
      { id: 'e16', type: 'enemy', x: 17, y: 12, name: 'Tide Reaver', data: 'enemy_tide' },
      { id: 'boss4', type: 'enemy', x: 19, y: 14, name: 'Samah', data: 'boss_samah' },
      { id: 'portal_labyrinth', type: 'portal', x: 21, y: 2, name: 'To Labyrinth', data: 'world_labyrinth' },
      { id: 'portal_back', type: 'portal', x: 1, y: 16, name: 'To Abarrach', data: 'world_abarrach' },
      { id: 'potion5', type: 'item', x: 4, y: 5, name: 'Healing Potion', data: 'item_potion' },
      { id: 'elixir2', type: 'item', x: 16, y: 5, name: 'Elixir', data: 'item_elixir' },
      { id: 'npc_sailor', type: 'npc', x: 5, y: 5, name: 'Old Sailor', data: 'The tides shift with the magic of this world.' },
    ],
  },
  {
    id: 'world_labyrinth',
    name: 'The Labyrinth',
    subtitle: 'The Prison',
    width: 24,
    height: 18,
    tiles: labyrinth,
    spawnX: 3,
    spawnY: 3,
    element: 'labyrinth',
    bgColor: '#050510',
    ambient: '#9B59B6',
    entities: [
      { id: 'town_refuge', type: 'structure', x: 5, y: 5, name: 'Refuge', data: 'town' },
      { id: 'dungeon_heart', type: 'structure', x: 17, y: 5, name: 'The Heart', data: 'dungeon' },
      { id: 'cave_forgotten', type: 'structure', x: 6, y: 12, name: 'Forgotten Tunnel', data: 'cave' },
      { id: 'e17', type: 'enemy', x: 8, y: 6, name: 'Lazar', data: 'enemy_lazar' },
      { id: 'e18', type: 'enemy', x: 14, y: 7, name: 'Chaos Beast', data: 'enemy_chaos' },
      { id: 'e19', type: 'enemy', x: 7, y: 13, name: 'Mad Patryn', data: 'enemy_patryn' },
      { id: 'e20', type: 'enemy', x: 16, y: 13, name: 'Lazar', data: 'enemy_lazar' },
      { id: 'e21', type: 'enemy', x: 10, y: 9, name: 'Void Stalker', data: 'enemy_stalker' },
      { id: 'boss5', type: 'enemy', x: 20, y: 14, name: 'Lord Xar', data: 'boss_lord_xar' },
      { id: 'portal_back', type: 'portal', x: 1, y: 1, name: 'To Chelestra', data: 'world_chelestra' },
      { id: 'potion6', type: 'item', x: 5, y: 4, name: 'Healing Potion', data: 'item_potion' },
      { id: 'potion7', type: 'item', x: 18, y: 6, name: 'Healing Potion', data: 'item_potion' },
      { id: 'npc_prisoner', type: 'npc', x: 6, y: 6, name: 'Freed Prisoner', data: 'Escape while you can. The Labyrinth hungers...' },
    ],
  },
];
