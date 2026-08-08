export type CombatStyle = "turn-based" | "real-time";
export type RuntimeState = "exploration" | "orders" | "resolution" | "victory" | "defeat";
export type ActorId = "player" | "sentinel";

export type TileKind =
  | "chamber"
  | "rune"
  | "corridor"
  | "arena"
  | "threshold"
  | "void";

export interface GridPoint {
  x: number;
  y: number;
  z?: number;
}

export interface TileDefinition extends GridPoint {
  kind: TileKind;
  walkable: boolean;
}

export type WorldObjectKind =
  | "soul-well"
  | "chest"
  | "torch"
  | "pillar"
  | "dummy"
  | "sentinel"
  | "soul-essence"
  | "threshold"
  | "npc";

export interface WorldObjectDefinition extends GridPoint {
  id: string;
  kind: WorldObjectKind;
  name: string;
  blocksMovement: boolean;
}

export interface ActorState extends GridPoint {
  id: ActorId;
  name: string;
  maxHp: number;
  hp: number;
  movement: number;
  guard: boolean;
  alive: boolean;
}

export interface LevelDefinition {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TileDefinition[];
  objects: WorldObjectDefinition[];
  playerStart: GridPoint;
  sentinelStart: GridPoint;
}
