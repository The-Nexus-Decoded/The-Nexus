/** Type declarations for breach-v2-registry.mjs (kept in sync by review). */

export interface BreachV2Placement {
  asset: string;
  x: number;
  y: number;
  placement: "floor" | "wall" | "ceiling";
  group: string;
  facing: string;
  blocking: boolean;
  role: "dressing" | "loot-cache" | "wall-art" | "readable-props";
  width?: number;
}

export interface BreachV2FixedRoom {
  id: string;
  name: string;
  kind: "start" | "corridor" | "plaza" | "convergence" | "ante" | "boss" | "vault" | "exit";
  x: number;
  y: number;
  w: number;
  h: number;
  notes: string;
  placements: BreachV2Placement[];
}

export interface BreachV2DoorSocket {
  side: "W" | "E" | "N" | "S";
  x: number;
  y: number;
}

export interface BreachV2PoolRoom {
  id: string;
  name: string;
  kind: "gallery";
  pool: "easy" | "hard";
  w: number;
  h: number;
  flavor: string;
  doors: BreachV2DoorSocket[];
  spawnSockets: { x: number; y: number }[];
  placements: BreachV2Placement[];
}

export interface BreachV2Landmark {
  id: string;
  label: string;
  roomId: string;
  x: number; // room-local meters
  y: number;
  r?: number;
  apron?: number;
  w?: number;
  note?: string;
}

export interface BreachV2Path {
  difficulty: "easy" | "hard";
  pool: "easy" | "hard";
  minChambers: number;
  maxChambers: number;
  corridorWidthMeters: number;
  slotCenters: [number, number][];
  convergenceSocket: [number, number];
}

export interface BreachV2SpawnPreset {
  enemyCount: number;
  enemyKinds: string[];
  healthMult: number;
  damageMult: number;
  galleryPressureBase: number;
  bossPressureBase: number;
  enemies: string;
  distribution: string;
  health: string;
  damage: string;
  galleryPressure: string;
  bossPressure: string;
}

export interface BreachV2Registry {
  id: "breach-v2";
  sourceMap: string;
  units: { meters: true; navCellMeters: number; note: string };
  worldAnchor: { zone: string; x: number; z: number; note: string };
  fixedRooms: BreachV2FixedRoom[];
  landmarks: BreachV2Landmark[];
  paths: Record<"wayfarer" | "oathbreaker", BreachV2Path>;
  pools: { easy: BreachV2PoolRoom[]; hard: BreachV2PoolRoom[] };
  bossSet: {
    bosses: { id: string; name: string; weight: number; patterns: string[] }[];
    perRun: number;
    note: string;
    anchorSockets: [number, number][];
  };
  tables: {
    spawn: Record<"wayfarer" | "oathbreaker", BreachV2SpawnPreset>;
    loot: Record<string, Record<string, string>>;
    props: Record<string, string[]>;
  };
  corruption: { area: string; level: number }[];
  seedPolicy: Record<string, string | number>;
  invariants: Record<string, unknown>;
}

export const BREACH_V2_REGISTRY: BreachV2Registry;
