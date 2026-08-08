export type Direction = 'north' | 'south' | 'east' | 'west';
export type CombatPhase = 'exploration' | 'orders' | 'resolution';
export type ReactionMode = 'full_timing' | 'wide_timing' | 'auto_resolve' | 'no_timing_bonus';

export interface Vec2 {
  x: number;
  y: number;
}

export interface TileCoord {
  x: number;
  y: number;
  z?: number;
}

export type TerrainType =
  | 'floor_soulwell' | 'floor_stone' | 'floor_stone_cracked'
  | 'floor_grass' | 'floor_dirt' | 'floor_wood'
  | 'floor_basalt' | 'floor_obsidian' | 'floor_ash'
  | 'floor_sand' | 'floor_coral' | 'floor_kelp'
  | 'wall_stone' | 'wall_rune' | 'wall_breach' | 'wall_basalt' | 'wall_coral'
  | 'hazard_void' | 'hazard_wind_lane' | 'hazard_lift' | 'hazard_heat'
  | 'water' | 'water_shallow' | 'water_deep' | 'current_lane' | 'glow_coral' | 'lava' | 'nullwater'
  | 'conduit_broken' | 'conduit_active'
  | 'cover_half' | 'cover_full';

export interface TerrainDef {
  type: TerrainType;
  walkable: boolean;
  blocksLoS: boolean;
  cover: 'none' | 'half' | 'full';
  elevation: number;
  color: string;
  detailColor: string;
  label: string;
  hazard?: string;
}

export interface MapTile {
  x: number;
  y: number;
  terrain: TerrainType;
  elevation: number;
  entityId?: string;
  effect?: string;
}

export interface GameMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: MapTile[][];
  spawnPoints: Vec2[];
  realm: RealmId;
  objectives: string[];
}

export type RealmId = 'arianus' | 'pryan' | 'chelestra' | 'abarrach';

export interface RealmDef {
  id: RealmId;
  name: string;
  subtitle: string;
  law: string;
  pressureType: string;
  bgColor: string;
  ambientColor: string;
  tileColors: Record<string, string>;
}

export type RaceId = 'human' | 'elf' | 'dwarf' | 'halfling';

export interface RaceDef {
  id: RaceId;
  name: string;
  description: string;
  trait: string;
  modifiers: { hp: number; mp: number; initiative: number; movement: number };
  color: string;
}

export type ClassId = 'warrior' | 'mage' | 'priest' | 'sharpshooter' | 'paladin';

export interface ClassDef {
  id: ClassId;
  name: string;
  description: string;
  role: string;
  startingSkill: string;
  resources: string[];
  allowedArmor: string[];
  color: string;
}

export type AbilityId =
  | 'rune_slash' | 'guard_split' | 'anchor_step' | 'realm_rush'
  | 'meteor_swarm' | 'color_field'
  | 'holy_arrow' | 'ward_mend' | 'clean_ground'
  | 'multishot' | 'prey_mark' | 'snare_trap' | 'command_pet'
  | 'thors_hammer' | 'oath_guard' | 'vow_field' | 'cleanse_strike'
  | 'fire_bolt' | 'magma_slam' | 'cinder_spit'
  | 'tide_hex' | 'tidal_slam' | 'ink_cloud'
  | 'move' | 'attack' | 'defend' | 'interact' | 'inspect'
  | 'active_block' | 'dodge' | 'aim_timing';

export type AbilityShape = 'self' | 'single' | 'line' | 'cone' | 'arc' | 'radius' | 'tile';

export interface AbilityDef {
  id: AbilityId;
  name: string;
  description: string;
  shape: AbilityShape;
  range: number;
  actionCost: number;
  classRequired?: ClassId;
  damageType?: 'physical' | 'magic' | 'rune' | 'holy' | 'ranged' | 'fire' | 'water';
  damage?: number;
  heal?: number;
  tileEffects?: string[];
  statusEffects?: string[];
  resourceCost?: Record<string, number>;
  reaction?: boolean;
}

export interface Unit {
  id: string;
  name: string;
  isPlayer: boolean;
  classId?: ClassId;
  raceId?: RaceId;
  enemyId?: EnemyId;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  initiative: number;
  movement: number;
  position: Vec2;
  facing: Direction;
  abilities: AbilityId[];
  resources: Record<string, number>;
  conditions: string[];
  soulMemories: string[];
  equipment: string[];
  sprite: string;
  portrait: string;
}

export type EnemyId =
  | 'dummy_mk1' | 'dummy_reactive' | 'sentinel_construct'
  | 'cinder_imp' | 'magma_beetle' | 'ember_golem'
  | 'tide_lurker' | 'drowned_acolyte' | 'reef_stalker' | 'chapel_warden';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  title: string;
  hp: number;
  attack: number;
  defense: number;
  initiative: number;
  movement: number;
  abilities: AbilityId[];
  sprite: string;
  description: string;
  isBoss?: boolean;
  xpReward: number;
  goldReward: number;
  loot?: string[];
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  kind: 'consumable' | 'equipment' | 'key';
  heal?: number;
  resourceRestore?: number;
  cure?: string[];
  icon: string;
}

export interface Floater {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

export interface ReactionPrompt {
  active: boolean;
  type: 'block' | 'dodge' | 'aim';
  windowMs: number;
  startTime: number;
  attackerName: string;
  damage: number;
  targetId: string;
  attackerId: string;
}

export interface CombatRewards {
  xp: number;
  gold: number;
  items: string[];
  levelUps: string[];
}

export interface CombatState {
  phase: CombatPhase;
  turnOrder: string[];
  activeUnitIndex: number;
  round: number;
  movedThisTurn: boolean;
  actedThisTurn: boolean;
  moveRange: Vec2[];
  selectedAbility: AbilityId | null;
  targetTiles: Vec2[];
  affectedTiles: Vec2[];
  engagedIds: string[];
  reactionPrompt: ReactionPrompt | null;
  log: string[];
  ended: boolean;
  result: 'victory' | 'defeat' | 'retreat' | null;
  rewards: CombatRewards | null;
}

export interface PartyState {
  members: Unit[];
  activeMemberIndex: number;
  inventory: string[];
  soulEssences: string[];
  memories: string[];
  gold: number;
}

export type ScreenId = 'title' | 'character' | 'hub' | 'game' | 'combat_result' | 'gameover';

export interface SoulDriftState {
  screen: ScreenId;
  party: PartyState;
  enemies: Unit[];
  currentMap: GameMap | null;
  combat: CombatState | null;
  camera: Vec2;
  selectedUnit: string | null;
  hoveredTile: Vec2 | null;
  exploredTiles: Set<string>;
  floaters: Floater[];
  actionFx: ActionFx | null;
  message: string;
  dialog: string | null;
  shop: string | null;
  reactionMode: ReactionMode;
  animationSpeed: number;
  clearedObjectives: string[];
  defeatedUnitIds: string[];
}

export interface MapEntity {
  id: string;
  type: 'npc' | 'item' | 'conduit' | 'door' | 'soul_essence' | 'memory' | 'hazard';
  x: number;
  y: number;
  name: string;
  data?: string;
  interactable: boolean;
  sprite: string;
  requiresObjective?: string;
}

export interface SaveData {
  version: number;
  party: PartyState;
  currentMapId: string;
  defeatedUnitIds: string[];
  clearedObjectives: string[];
  reactionMode: ReactionMode;
}

export interface ProfileMeta {
  name: string;
  classId: string;
  raceId: string;
  level: number;
  mapId: string;
  createdAt: number;
  lastPlayed: number;
}

export interface ProfileRecord {
  meta: ProfileMeta;
  save: SaveData;
}

export interface ActionFx {
  id: number;
  unitId: string;
  kind: 'attack' | 'hit' | 'cast';
}
