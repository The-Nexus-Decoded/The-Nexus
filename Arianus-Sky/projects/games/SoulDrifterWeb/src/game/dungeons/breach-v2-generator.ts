/**
 * BREACH-V2 seeded generator (runbook §4, issue #451).
 *
 * Assembles one run of the starting zone from the registry:
 * fixed spine (Vestibule -> Plaza -> two doors) -> 3-5 seeded chambers drawn
 * from the CHOSEN path's pool (never the other pool, never duplicates) ->
 * Convergence -> Ashen Lock -> First Memory Vault -> exit Connector.
 *
 * Seed discipline: mulberry32 lineage (same as src/game/dungeon.ts). The
 * layout seed controls topology/chambers/encounters; dressing placement is
 * authored in the registry (legal socket configurations, never scatter).
 * Same seed + same path -> same run. Comparison seed: 4182.
 */

import { BREACH_V2_REGISTRY as R } from "./breach-v2-registry.mjs";
import type {
  BreachV2FixedRoom, BreachV2Placement, BreachV2PoolRoom,
} from "./breach-v2-registry.mjs";

export type BreachV2PathId = "wayfarer" | "oathbreaker";
export type BreachV2BossPattern = "cinder-sweep" | "ash-call" | "soul-tax";

export interface BreachV2ChamberInstance {
  id: string;
  poolRoomId: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  slot: number;
}

export interface BreachV2Corridor {
  id: string;
  from: { x: number; y: number };
  bend: { x: number; y: number };
  to: { x: number; y: number };
  width: number;
}

export interface BreachV2PlacedProp extends BreachV2Placement {
  roomId: string;
  zoneId: string;
  worldX: number;
  worldY: number;
  blocksMovement: boolean;
  footprint: number;
}

export interface BreachV2Enemy {
  id: string;
  kind: string;
  chamberId: string;
  x: number;
  y: number;
  maxHp: number;
}

export interface BreachV2Cell {
  col: number;
  row: number;
}

export interface GeneratedBreachV2 {
  seed: number;
  pathId: BreachV2PathId;
  chamberCount: number;
  chambers: BreachV2ChamberInstance[];
  corridors: BreachV2Corridor[];
  fixedRooms: BreachV2FixedRoom[];
  placements: BreachV2PlacedProp[];
  enemies: BreachV2Enemy[];
  boss: { id: string; pattern: BreachV2BossPattern; anchorSocket: [number, number]; x: number; y: number; maxHp: number };
  navCells: BreachV2Cell[];
  blockedCells: BreachV2Cell[];
  playerStart: { x: number; y: number };
  firstMemory: { x: number; y: number };
  exitPoint: { x: number; y: number };
  galleryPressure: number;
  bossPressure: number;
  bonusSkillAwakened: boolean | null;
  rewardId: string;
}

interface RandomSource {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(values: readonly T[]): T;
  shuffle<T>(values: T[]): T[];
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
    pick: <T>(values: readonly T[]) => values[Math.floor(next() * values.length)]!,
    shuffle: <T>(values: T[]) => {
      const copy = [...values];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      }
      return copy;
    },
  };
}

const NAV_CELL = R.units.navCellMeters; // 1.75 m, hidden under continuous geometry

export function breachV2CellKey(cell: BreachV2Cell): string {
  return `${cell.col},${cell.row}`;
}

function cellAt(x: number, y: number): BreachV2Cell {
  return { col: Math.floor(x / NAV_CELL), row: Math.floor(y / NAV_CELL) };
}

function roomCells(room: { x: number; y: number; w: number; h: number }): BreachV2Cell[] {
  const cells: BreachV2Cell[] = [];
  const c0 = Math.floor(room.x / NAV_CELL);
  const c1 = Math.floor((room.x + room.w - 0.01) / NAV_CELL);
  const r0 = Math.floor(room.y / NAV_CELL);
  const r1 = Math.floor((room.y + room.h - 0.01) / NAV_CELL);
  for (let col = c0; col <= c1; col += 1) {
    for (let row = r0; row <= r1; row += 1) cells.push({ col, row });
  }
  return cells;
}

function corridorCells(c: BreachV2Corridor): BreachV2Cell[] {
  const cells = new Map<string, BreachV2Cell>();
  const half = c.width / 2;
  const walk = (a: { x: number; y: number }, b: { x: number; y: number }): void => {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(length / (NAV_CELL / 2)));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const px = a.x + (b.x - a.x) * t;
      const py = a.y + (b.y - a.y) * t;
      for (let ox = -half; ox <= half; ox += NAV_CELL * 0.5) {
        for (let oy = -half; oy <= half; oy += NAV_CELL * 0.5) {
          const cell = cellAt(px + ox, py + oy);
          cells.set(breachV2CellKey(cell), cell);
        }
      }
    }
  };
  walk(c.from, c.bend);
  walk(c.bend, c.to);
  return [...cells.values()];
}

function doorWorld(ch: BreachV2ChamberInstance, side: "W" | "E"): { x: number; y: number } {
  return side === "W"
    ? { x: ch.x, y: ch.y + ch.h / 2 }
    : { x: ch.x + ch.w, y: ch.y + ch.h / 2 };
}

function landmark(id: string) {
  const lm = R.landmarks.find((l) => l.id === id);
  if (!lm) throw new Error(`missing landmark ${id}`);
  const room = R.fixedRooms.find((r) => r.id === lm.roomId);
  if (!room) throw new Error(`missing room ${lm.roomId}`);
  return { ...lm, worldX: room.x + lm.x, worldY: room.y + lm.y };
}

export function generateBreachV2(seed: number, pathId: BreachV2PathId): GeneratedBreachV2 {
  const random = mulberry32((seed || 1) >>> 0);
  const path = R.paths[pathId];
  const pool = R.pools[path.pool];
  const preset = R.tables.spawn[pathId];

  // --- chambers: 3-5, drawn without replacement from the path pool only
  const chamberCount = random.int(path.minChambers, path.maxChambers);
  const drawn = random.shuffle([...pool]).slice(0, chamberCount);
  const chambers: BreachV2ChamberInstance[] = drawn.map((room: BreachV2PoolRoom, index) => {
    const [cx, cy] = path.slotCenters[index]!;
    return {
      id: `chamber-${index + 1}`,
      poolRoomId: room.id,
      name: room.name,
      x: cx - room.w / 2,
      y: cy - room.h / 2,
      w: room.w,
      h: room.h,
      slot: index + 1,
    };
  });

  // --- corridors: plaza door -> S1 W; then each chamber E -> next chamber W;
  // --- last chamber E -> convergence socket
  const doorLm = landmark(pathId === "wayfarer" ? "door-wayfarer" : "door-oathbreaker");
  const corridorWidth = path.corridorWidthMeters;
  const corridors: BreachV2Corridor[] = [];
  const entryFrom = { x: doorLm.worldX, y: doorLm.worldY };
  const firstW = doorWorld(chambers[0]!, "W");
  corridors.push({
    id: "corridor-entry",
    from: entryFrom,
    bend: { x: firstW.x, y: entryFrom.y },
    to: firstW,
    width: corridorWidth,
  });
  const conv = { x: path.convergenceSocket[0], y: path.convergenceSocket[1] };
  for (let i = 0; i < chambers.length; i += 1) {
    const exit = doorWorld(chambers[i]!, "E");
    const next = i + 1 < chambers.length ? doorWorld(chambers[i + 1]!, "W") : conv;
    corridors.push({
      id: `corridor-out-${i + 1}`,
      from: exit,
      bend: { x: next.x, y: exit.y },
      to: next,
      width: corridorWidth,
    });
  }

  // --- fixed connectors between the fixed rooms (same every run)
  const fixedConnectors: BreachV2Corridor[] = [];
  const link = (id: string, a: [number, number], b: [number, number], width: number): void => {
    fixedConnectors.push({ id, from: { x: a[0], y: a[1] }, bend: { x: b[0], y: a[1] }, to: { x: b[0], y: b[1] }, width });
  };
  link("conv-ante", [188, 10], [192, 10], 3.2);
  link("ante-boss", [204, 10], [208, 10], 3.2);
  link("boss-vault", [232, 7], [236, 7], 2.5);   // sealed until the Warden falls (state, not geometry)
  link("boss-exit", [232, 15], [236, 15], 2.5);
  const allCorridors = [...corridors, ...fixedConnectors];

  // --- placements: fixed rooms + chamber templates, world-space
  const placements: BreachV2PlacedProp[] = [];
  const placeRoom = (roomId: string, zoneId: string, ox: number, oy: number, items: BreachV2Placement[]): void => {
    for (const p of items) {
      placements.push({
        ...p,
        roomId,
        zoneId,
        worldX: ox + p.x,
        worldY: oy + p.y,
        blocksMovement: p.blocking,
        footprint: p.footprint ?? 1.2,
      });
    }
  };
  for (const room of R.fixedRooms) placeRoom(room.id, room.kind, room.x, room.y, room.placements);
  const poolById = new Map(pool.map((room) => [room.id, room]));
  for (const ch of chambers) {
    const template = poolById.get(ch.poolRoomId)!;
    placeRoom(ch.id, path.difficulty, ch.x, ch.y, template.placements);
  }

  // --- enemies on authored spawn sockets (never more than a chamber's sockets)
  const enemies: BreachV2Enemy[] = [];
  const socketUse = new Map<string, number>();
  const kinds = preset.enemyKinds;
  for (let index = 0; index < preset.enemyCount; index += 1) {
    const maxPer = pathId === "wayfarer" ? 1 : 2;
    const candidates = chambers.filter((ch) => {
      const used = socketUse.get(ch.id) ?? 0;
      const template = poolById.get(ch.poolRoomId)!;
      return used < Math.min(maxPer, template.spawnSockets.length);
    });
    const ch = candidates.length > 0 ? random.pick(candidates) : chambers[chambers.length - 1]!;
    const template = poolById.get(ch.poolRoomId)!;
    const used = socketUse.get(ch.id) ?? 0;
    const socket = template.spawnSockets[used % template.spawnSockets.length]!;
    socketUse.set(ch.id, used + 1);
    const kind = kinds[index % kinds.length]!;
    enemies.push({
      id: `${kind}-${index + 1}`,
      kind,
      chamberId: ch.id,
      x: ch.x + socket.x,
      y: ch.y + socket.y,
      maxHp: random.int(12, 16) + (pathId === "oathbreaker" ? 2 : 0),
    });
  }

  // --- boss: seeded anchor + pattern (set rule: exactly 1 per run)
  const anchor = random.pick(R.bossSet.anchorSockets);
  const boss = {
    id: R.bossSet.bosses[0]!.id,
    pattern: random.pick(R.bossSet.bosses[0]!.patterns) as BreachV2BossPattern,
    anchorSocket: anchor,
    x: anchor[0],
    y: anchor[1],
    maxHp: random.int(52, 62),
  };

  // --- nav grid: rooms + corridors, then blocking placements reserve cells
  const floor = new Map<string, BreachV2Cell>();
  for (const room of R.fixedRooms) for (const c of roomCells(room)) floor.set(breachV2CellKey(c), c);
  for (const ch of chambers) for (const c of roomCells(ch)) floor.set(breachV2CellKey(c), c);
  for (const c of allCorridors) for (const cell of corridorCells(c)) floor.set(breachV2CellKey(cell), cell);

  const blocked = new Map<string, BreachV2Cell>();
  // authored spawn sockets are gameplay anchors: their cells stay open even
  // when a blocking prop's footprint radius clips the cell edge (legal-socket
  // discipline — placements already keep >= 1.2 m center clearance).
  const protectedCells = new Set<string>();
  for (const enemy of enemies) protectedCells.add(breachV2CellKey(cellAt(enemy.x, enemy.y)));
  const blockRadius = (wx: number, wy: number, radius: number): void => {
    for (let ox = -radius; ox <= radius; ox += NAV_CELL * 0.5) {
      for (let oy = -radius; oy <= radius; oy += NAV_CELL * 0.5) {
        if (Math.hypot(ox, oy) > radius) continue;
        const cell = cellAt(wx + ox, wy + oy);
        const key = breachV2CellKey(cell);
        if (floor.has(key) && !protectedCells.has(key)) blocked.set(key, cell);
      }
    }
  };
  for (const p of placements) {
    if (!p.blocksMovement) continue;
    const radius = Math.min(p.footprint / 2, 1.6);
    if (p.placement === "wall" || p.placement === "ceiling") continue; // hugging walls; floor stays open
    blockRadius(p.worldX, p.worldY, radius);
  }
  // fixed landmark blockers: the Soul Well water, Loom, coffer, effigy
  const well = landmark("soul-well");
  blockRadius(well.worldX, well.worldY, well.r ?? 1.8);
  for (const id of ["memory-loom", "coffer", "effigy"]) {
    const lm = landmark(id);
    blockRadius(lm.worldX, lm.worldY, 1.0);
  }

  const emergence = landmark("player-emergence");
  const vault = R.fixedRooms.find((r) => r.id === "memory-vault")!;
  const exitRoom = R.fixedRooms.find((r) => r.id === "exit-connector")!;

  return {
    seed: seed >>> 0,
    pathId,
    chamberCount,
    chambers,
    corridors: allCorridors,
    fixedRooms: R.fixedRooms,
    placements,
    enemies,
    boss,
    navCells: [...floor.values()],
    blockedCells: [...blocked.values()],
    playerStart: { x: emergence.worldX, y: emergence.worldY },
    firstMemory: { x: vault.x + 5.0, y: vault.y + 4.0 },
    exitPoint: { x: exitRoom.x + exitRoom.w - 1.0, y: exitRoom.y + exitRoom.h / 2 },
    galleryPressure: preset.galleryPressureBase + random.int(0, 6),
    bossPressure: preset.bossPressureBase + random.int(0, 6),
    bonusSkillAwakened: pathId === "oathbreaker" ? random.next() < 0.68 : null,
    rewardId: pathId === "oathbreaker" ? "grave-iron-class-implement" : "tempered-training-gear",
  };
}
