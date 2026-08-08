import type { GridPoint } from "./types";

export type DungeonRoomKind = "training" | "skirmish" | "boss";
export type DungeonZoneId = "training" | "passage-one" | "skirmish" | "passage-two" | "boss";
export type BossPattern = "cinder-sweep" | "ash-call" | "soul-tax";

export interface DungeonRoom {
  id: DungeonRoomKind;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  center: GridPoint;
}

export interface DungeonCrawlSection {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  center: GridPoint;
}

export interface DungeonTile extends GridPoint {
  zoneId: DungeonZoneId;
  roomId: DungeonRoomKind;
}

export interface DungeonProp extends GridPoint {
  id: string;
  kind: "soul-well" | "chest" | "pillar" | "rubble" | "brazier" | "gate" | "essence" | "memory-loom" | "training-effigy";
  roomId: DungeonRoomKind;
  blocksMovement: boolean;
}

export interface DungeonNpc extends GridPoint {
  id: "ilyra" | "orren" | "brannoc";
  roomId: DungeonRoomKind;
}

export interface DungeonEnemy extends GridPoint {
  id: string;
  name: string;
  roomId: "skirmish" | "boss";
  kind: "breachling" | "miniboss";
  maxHp: number;
}

export interface GeneratedDungeon {
  seed: number;
  rooms: readonly DungeonRoom[];
  crawlSections: readonly DungeonCrawlSection[];
  tiles: readonly DungeonTile[];
  props: readonly DungeonProp[];
  npcs: readonly DungeonNpc[];
  enemies: readonly DungeonEnemy[];
  blockedTiles: readonly GridPoint[];
  playerStart: GridPoint;
  bossPattern: BossPattern;
  modifier: string;
}

interface RandomSource {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(values: readonly T[]): T;
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
  };
}

function tileKey(point: GridPoint): string {
  return `${point.x},${point.y}`;
}

function roomTiles(room: DungeonRoom): GridPoint[] {
  const tiles: GridPoint[] = [];
  for (let x = room.x; x < room.x + room.width; x += 1) {
    for (let y = room.y; y < room.y + room.height; y += 1) tiles.push({ x, y });
  }
  return tiles;
}

function soulwellChamberTiles(room: DungeonRoom): GridPoint[] {
  const tiles: GridPoint[] = [];
  for (let localY = 0; localY < room.height; localY += 1) {
    const inset = localY === 0 || localY === room.height - 1 ? 2 : localY === 1 || localY === room.height - 2 ? 1 : 0;
    for (let localX = inset; localX < room.width - inset; localX += 1) {
      tiles.push({ x: room.x + localX, y: room.y + localY });
    }
  }
  return tiles;
}

function corridor(
  from: GridPoint,
  to: GridPoint,
  width: number,
): GridPoint[] {
  const points: GridPoint[] = [];
  const horizontalStart = Math.min(from.x, to.x);
  const horizontalEnd = Math.max(from.x, to.x);
  const half = Math.floor(width / 2);

  for (let x = horizontalStart; x <= horizontalEnd; x += 1) {
    for (let offset = -half; offset <= half; offset += 1) points.push({ x, y: from.y + offset });
  }
  const verticalStart = Math.min(from.y, to.y);
  const verticalEnd = Math.max(from.y, to.y);
  for (let y = verticalStart; y <= verticalEnd; y += 1) {
    for (let offset = -half; offset <= half; offset += 1) points.push({ x: to.x + offset, y });
  }
  return points;
}

function inside(room: DungeonRoom, point: GridPoint, margin = 0): boolean {
  return point.x >= room.x + margin
    && point.x < room.x + room.width - margin
    && point.y >= room.y + margin
    && point.y < room.y + room.height - margin;
}

function randomOpenPoint(
  random: RandomSource,
  room: DungeonRoom,
  reserved: Set<string>,
  margin = 2,
): GridPoint {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const point = {
      x: random.int(room.x + margin, room.x + room.width - margin - 1),
      y: random.int(room.y + margin, room.y + room.height - margin - 1),
    };
    if (!reserved.has(tileKey(point))) {
      reserved.add(tileKey(point));
      return point;
    }
  }
  throw new Error(`Unable to place an object in ${room.id}.`);
}

export function createRunSeed(): number {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now();
  }
  return Date.now() >>> 0;
}

export function generateSoulwellDungeon(seed: number): GeneratedDungeon {
  const random = mulberry32(seed || 1);
  const training: DungeonRoom = {
    id: "training",
    name: "The Realm-Lock Vestibule",
    x: 0,
    y: 0,
    width: 16,
    height: 14,
    center: { x: 8, y: 7 },
  };

  const firstPassage = random.int(5, 8);
  const skirmishX = training.x + training.width + firstPassage;
  const skirmishY = random.int(-3, 2);
  const bend = random.pick([-1, 1] as const);
  const sectionCount = random.int(3, 5);
  const sectionNames = ["The Split Antechamber", "The Broken Crossing", "The Crooked Reliquary", "The Hollow Junction", "The Breach Depth"];
  const crawlSections: DungeonCrawlSection[] = [];
  for (let index = 0; index < sectionCount; index += 1) {
    const previous = crawlSections[index - 1];
    const width = random.int(8, 11);
    const height = random.int(7, 10);
    const x = previous ? previous.x + previous.width + random.int(4, 7) : skirmishX;
    const offsetBand = index % 2 === 0 ? -random.int(0, 3) : random.int(5, 9);
    const y = skirmishY + bend * offsetBand;
    crawlSections.push({
      id: `gallery-${index + 1}`,
      name: sectionNames[index]!,
      x,
      y,
      width,
      height,
      center: { x: x + Math.floor(width / 2), y: y + Math.floor(height / 2) },
    });
  }
  const entryVault = crawlSections[0]!;
  const brokenCrossing = crawlSections[Math.floor(crawlSections.length / 2)]!;
  const breachDepth = crawlSections.at(-1)!;
  const crawlMinY = Math.min(...crawlSections.map((section) => section.y));
  const crawlMaxY = Math.max(...crawlSections.map((section) => section.y + section.height));
  const skirmish: DungeonRoom = {
    id: "skirmish",
    name: "The Fractured Galleries",
    x: entryVault.x,
    y: crawlMinY,
    width: breachDepth.x + breachDepth.width - entryVault.x,
    height: crawlMaxY - crawlMinY,
    center: { ...brokenCrossing.center },
  };

  const secondPassage = random.int(6, 10);
  const bossWidth = random.int(19, 21);
  const bossHeight = random.int(15, 17);
  const bossY = breachDepth.y + random.int(-3, 3);
  const boss: DungeonRoom = {
    id: "boss",
    name: "The Ashen Lock",
    x: breachDepth.x + breachDepth.width + secondPassage,
    y: bossY,
    width: bossWidth,
    height: bossHeight,
    center: {
      x: breachDepth.x + breachDepth.width + secondPassage + Math.floor(bossWidth / 2),
      y: bossY + Math.floor(bossHeight / 2),
    },
  };

  const tileMap = new Map<string, DungeonTile>();
  const addTiles = (points: GridPoint[], zoneId: DungeonZoneId, roomId: DungeonRoomKind): void => {
    for (const point of points) tileMap.set(tileKey(point), { ...point, zoneId, roomId });
  };
  addTiles(soulwellChamberTiles(training), "training", "training");
  crawlSections.forEach((section) => addTiles(roomTiles({ ...section, id: "skirmish" }), "skirmish", "skirmish"));
  crawlSections.slice(1).forEach((section, index) => {
    addTiles(corridor(crawlSections[index]!.center, section.center, 3), "skirmish", "skirmish");
  });
  addTiles(roomTiles(boss), "boss", "boss");

  const trainingExit = { x: training.x + training.width - 1, y: training.center.y };
  const skirmishEntrance = { x: entryVault.x, y: entryVault.center.y };
  const skirmishExit = { x: breachDepth.x + breachDepth.width - 1, y: breachDepth.center.y };
  const bossEntrance = { x: boss.x, y: boss.center.y };
  addTiles(corridor(trainingExit, skirmishEntrance, 3), "passage-one", "skirmish");
  addTiles(corridor(skirmishExit, bossEntrance, 3), "passage-two", "boss");

  const reserved = new Set<string>();
  const reserve = (point: GridPoint): GridPoint => {
    reserved.add(tileKey(point));
    return point;
  };
  const reserveLane = (from: GridPoint, to: GridPoint, width = 1): void => {
    for (const point of corridor(from, to, width)) reserved.add(tileKey(point));
  };
  const playerStart = reserve({ x: 6, y: 11 });
  const wellPoint = reserve({ x: 6, y: 7 });
  const ilyraPoint = reserve({ x: 8, y: 9 });
  const orrenPoint = reserve({ x: trainingExit.x + 2, y: trainingExit.y });
  const brannocPoint = reserve({ x: skirmishEntrance.x - 1, y: skirmishEntrance.y });
  const chestPoint = reserve({ x: 12, y: 10 });
  const loomPoint = reserve({ x: 3, y: 9 });
  const effigyPoint = reserve({ x: 11, y: 5 });
  const easyGatePoint = reserve({ x: trainingExit.x, y: trainingExit.y - 1 });
  const hardGatePoint = reserve({ x: trainingExit.x, y: trainingExit.y + 1 });
  const blockedTiles: GridPoint[] = [];
  for (let x = wellPoint.x - 1; x <= wellPoint.x + 1; x += 1) {
    for (let y = wellPoint.y - 1; y <= wellPoint.y + 1; y += 1) {
      const point = { x, y };
      blockedTiles.push(point);
      reserved.add(tileKey(point));
    }
  }
  const essencePoint = reserve({ x: boss.x + boss.width - 4, y: boss.center.y });
  const bossPoint = reserve({ x: boss.center.x + 2, y: boss.center.y });

  // Reserve broad navigation spines and authored-object approaches before adding
  // random blockers. This is the dungeon invariant: every run remains completable.
  reserveLane({ x: training.x + 1, y: training.center.y }, trainingExit, 3);
  crawlSections.slice(1).forEach((section, index) => reserveLane(crawlSections[index]!.center, section.center, 3));
  reserveLane(bossEntrance, { x: boss.x + boss.width - 2, y: boss.center.y }, 3);
  reserveLane(trainingExit, skirmishEntrance, 3);
  reserveLane(skirmishExit, bossEntrance, 3);
  reserveLane(playerStart, { x: playerStart.x, y: training.center.y }, 3);
  for (const point of [ilyraPoint, orrenPoint, brannocPoint, chestPoint, loomPoint, effigyPoint, easyGatePoint, hardGatePoint]) {
    reserveLane(training.center, point);
  }
  reserveLane(boss.center, essencePoint);
  reserveLane(boss.center, bossPoint);

  const enemies: DungeonEnemy[] = [];
  // Both trial doors converge on this shared room. The Wayfarer trial uses
  // the first three actors; Oathbreaker awakens all five, so the map remains
  // authored once while encounter composition changes with the chosen door.
  const skirmishCount = 5;
  for (let index = 0; index < skirmishCount; index += 1) {
    const sectionIndex = Math.min(crawlSections.length - 1, Math.floor((index * crawlSections.length) / skirmishCount));
    const section = crawlSections[sectionIndex]!;
    const point = randomOpenPoint(random, { ...section, id: "skirmish" }, reserved, 2);
    enemies.push({
      id: `breachling-${index + 1}`,
      name: index === 0 ? "Breachling Stalker" : "Breachling",
      roomId: "skirmish",
      kind: "breachling",
      maxHp: random.int(12, 16),
      ...point,
    });
  }
  enemies.push({
    id: "cinderbound-warden",
    name: "Cinderbound Warden",
    roomId: "boss",
    kind: "miniboss",
    maxHp: random.int(52, 62),
    ...bossPoint,
  });

  const props: DungeonProp[] = [
    { id: "well", kind: "soul-well", roomId: "training", blocksMovement: true, ...wellPoint },
    { id: "starter-coffer", kind: "chest", roomId: "training", blocksMovement: true, ...chestPoint },
    { id: "memory-loom", kind: "memory-loom", roomId: "training", blocksMovement: true, ...loomPoint },
    { id: "training-effigy", kind: "training-effigy", roomId: "training", blocksMovement: true, ...effigyPoint },
    { id: "gate-wayfarer", kind: "gate", roomId: "training", blocksMovement: false, ...easyGatePoint },
    { id: "gate-oathbreaker", kind: "gate", roomId: "training", blocksMovement: false, ...hardGatePoint },
  ];

  const decorationKinds = ["pillar", "rubble", "brazier"] as const;
  const decorationRooms = [
    ...crawlSections.map((section) => ({ ...section, roomId: "skirmish" as const, propPrefix: section.id })),
    { ...boss, roomId: "boss" as const, propPrefix: "boss" },
  ];
  for (const room of decorationRooms) {
    const count = room.roomId === "boss" ? random.int(10, 15) : random.int(3, 5);
    for (let index = 0; index < count; index += 1) {
      const point = randomOpenPoint(random, { ...room, id: room.roomId }, reserved, room.roomId === "boss" ? 2 : 1);
      const kind = random.pick(decorationKinds);
      props.push({
        id: `${room.propPrefix}-${kind}-${index}`,
        kind,
        roomId: room.roomId,
        blocksMovement: kind !== "brazier",
        ...point,
      });
    }
  }

  props.push({ id: "first-memory", kind: "essence", roomId: "boss", blocksMovement: true, ...essencePoint });

  const npcs: DungeonNpc[] = [
    { id: "ilyra", roomId: "training", ...ilyraPoint },
    { id: "orren", roomId: "skirmish", ...orrenPoint },
    { id: "brannoc", roomId: "skirmish", ...brannocPoint },
  ];

  return {
    seed: seed >>> 0,
    rooms: [training, skirmish, boss],
    crawlSections,
    tiles: [...tileMap.values()],
    props,
    npcs,
    enemies,
    blockedTiles,
    playerStart,
    bossPattern: random.pick(["cinder-sweep", "ash-call", "soul-tax"] as const),
    modifier: random.pick([
      "Restless geometry: corridors shift around broken pillars.",
      "Thin veil: Stability recovery is precious in the galleries.",
      "Cinder wake: the miniboss telegraphs stronger finishing blows.",
    ]),
  };
}

export function dungeonTileKey(point: GridPoint): string {
  return tileKey(point);
}

export function roomContains(room: DungeonRoom, point: GridPoint): boolean {
  return inside(room, point);
}
