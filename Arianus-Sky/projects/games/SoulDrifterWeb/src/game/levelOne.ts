import type { LevelDefinition, TileDefinition, TileKind, WorldObjectDefinition } from "./types";

function floorRect(
  tiles: TileDefinition[],
  x1: number,
  x2: number,
  y1: number,
  y2: number,
  kind: TileKind,
): void {
  for (let x = x1; x <= x2; x += 1) {
    for (let y = y1; y <= y2; y += 1) {
      tiles.push({ x, y, kind, walkable: true });
    }
  }
}

const tiles: TileDefinition[] = [];
floorRect(tiles, 1, 6, 4, 10, "chamber");
floorRect(tiles, 7, 11, 6, 8, "corridor");
floorRect(tiles, 12, 18, 2, 12, "arena");

for (const tile of tiles) {
  if (tile.x >= 2 && tile.x <= 5 && tile.y >= 6 && tile.y <= 9) {
    tile.kind = "rune";
  }
  if (tile.x === 11 || tile.x === 12) {
    tile.kind = "threshold";
  }
}

const objects: WorldObjectDefinition[] = [
  { id: "well", kind: "soul-well", name: "Soul Well", x: 3, y: 7, blocksMovement: true },
  { id: "chamber-chest", kind: "chest", name: "Runebound Coffer", x: 5, y: 5, blocksMovement: true },
  { id: "torch-west", kind: "torch", name: "Memory Brazier", x: 1, y: 5, blocksMovement: false },
  { id: "torch-east", kind: "torch", name: "Memory Brazier", x: 6, y: 9, blocksMovement: false },
  { id: "corridor-pillar-a", kind: "pillar", name: "Fractured Pillar", x: 8, y: 6, blocksMovement: true },
  { id: "corridor-pillar-b", kind: "pillar", name: "Fractured Pillar", x: 10, y: 8, blocksMovement: true },
  { id: "threshold", kind: "threshold", name: "Arena Threshold", x: 11, y: 7, blocksMovement: false },
  { id: "dummy-a", kind: "dummy", name: "Guard Dummy", x: 14, y: 4, blocksMovement: true },
  { id: "dummy-b", kind: "dummy", name: "Channel Dummy", x: 16, y: 4, blocksMovement: true },
  { id: "dummy-c", kind: "dummy", name: "Execution Dummy", x: 17, y: 10, blocksMovement: true },
  { id: "sentinel", kind: "sentinel", name: "Sentinel Construct", x: 15, y: 8, blocksMovement: true },
  { id: "essence", kind: "soul-essence", name: "Soul Essence", x: 17, y: 7, blocksMovement: true },
];

export const levelOne: LevelDefinition = {
  id: "first-breach",
  name: "The First Breach",
  width: 20,
  height: 15,
  tiles,
  objects,
  playerStart: { x: 3, y: 10 },
  sentinelStart: { x: 15, y: 8 },
};
