/**
 * Client mirror of the Heartvale zone registry (server/sections.mjs).
 *
 * KEEP IN SYNC with server/sections.mjs — tests/heartvaleZones.test.ts
 * imports both and asserts rect/adjacency/zoneAt parity, so a drifted edit
 * fails the suite. The background (taxonomy, scale model, v2 POI-safe cut)
 * lives in docs/THALENYR_SCALE_AND_SECTIONS.md; only what the client needs
 * at runtime is mirrored here: rects, adjacency, zone lookup, and edge
 * proximity for the crossover pre-join.
 */

export interface ZoneRect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface ZoneDef {
  id: string;
  name: string;
  rect: ZoneRect;
  adjacent: string[];
}

export const HEARTVALE_ZONES: ZoneDef[] = [
  { id: "hv-1", name: "Soul Well Basin", rect: { x0: 4980, z0: 2531.25, x1: 6240, z1: 2970 }, adjacent: ["hv-2", "hv-3", "hv-5", "hv-6"] },
  { id: "hv-2", name: "Anwel & Lockroot Reach", rect: { x0: 4980, z0: 1552.5, x1: 6720, z1: 2531.25 }, adjacent: ["hv-1", "hv-5", "hv-6"] },
  { id: "hv-3", name: "Vaeldor Crown", rect: { x0: 4980, z0: 2970, x1: 6240, z1: 3375 }, adjacent: ["hv-1", "hv-4", "hv-6", "hv-7"] },
  { id: "hv-4", name: "Thalen's Heir", rect: { x0: 4980, z0: 3375, x1: 6240, z1: 4252.5 }, adjacent: ["hv-3", "hv-6", "hv-7"] },
  { id: "hv-5", name: "Erboug Stones", rect: { x0: 6240, z0: 2531.25, x1: 7680, z1: 2970 }, adjacent: ["hv-1", "hv-2", "hv-7"] },
  { id: "hv-6", name: "West Vale Wilds", rect: { x0: 4320, z0: 1552.5, x1: 4980, z1: 4252.5 }, adjacent: ["hv-1", "hv-2", "hv-3", "hv-4"] },
  { id: "hv-7", name: "East March", rect: { x0: 6240, z0: 2970, x1: 7680, z1: 4252.5 }, adjacent: ["hv-3", "hv-4", "hv-5"] },
];

const byId = new Map(HEARTVALE_ZONES.map((zone) => [zone.id, zone]));

export function getZone(id: string): ZoneDef | null {
  return byId.get(id) ?? null;
}

/** Which zone contains a world point (meters, plate frame: +x east, +z south). */
export function zoneAt(x: number, z: number): ZoneDef | null {
  for (const zone of HEARTVALE_ZONES) {
    const { x0, z0, x1, z1 } = zone.rect;
    if (x >= x0 && x < x1 && z >= z0 && z < z1) return zone;
  }
  return null;
}

/** Distance from a point to a rect edge (0 when inside). */
export function distanceToRect(x: number, z: number, rect: ZoneRect): number {
  const dx = Math.max(rect.x0 - x, 0, x - rect.x1);
  const dz = Math.max(rect.z0 - z, 0, z - rect.z1);
  return Math.hypot(dx, dz);
}

/**
 * The adjacent zone whose edge is nearest to the player, and how far its
 * edge is. Returns null when the player is outside every zone (dungeon /
 * unzoned ground) or when no adjacency is reachable.
 */
export function nearestAdjacentEdge(
  x: number,
  z: number,
): { current: ZoneDef; neighbor: ZoneDef; distance: number } | null {
  const current = zoneAt(x, z);
  if (!current) return null;
  let best: { current: ZoneDef; neighbor: ZoneDef; distance: number } | null = null;
  for (const id of current.adjacent) {
    const neighbor = byId.get(id);
    if (!neighbor) continue;
    const distance = distanceToRect(x, z, neighbor.rect);
    if (!best || distance < best.distance) best = { current, neighbor, distance };
  }
  return best;
}
