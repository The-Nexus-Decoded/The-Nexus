/**
 * Heartvale section registry — the tiled "mini-world" cut of the first
 * Thalenyr region (see docs/THALENYR_SCALE_AND_SECTIONS.md).
 *
 * Canon scale: 1 grid cell on the M-003 painted atlas = 1 day on foot = 30 km.
 * World scale: 20:1 distance compression → 1 cell = 1500 m in-world
 * (~16.7 min continuous walk at 1.5 m/s). The painted plate is 2048×1152 px,
 * 256 px per cell, so the full plate maps to a 12000 m × 6750 m world.
 *
 * Each section is a semi-zone: one shard holds up to 30 concurrent players;
 * overflow spawns another shard instance of the same section. Sections share
 * edges (adjacency list) so the client can pre-join the neighboring shard
 * before the player crosses — no loading screen.
 *
 * Coordinates are world meters on the plate frame: x east, z south,
 * origin at the plate's top-left corner.
 */

export const CELL_WORLD_METERS = 1500;
export const CELL_CANON_KM = 30;
export const DISTANCE_COMPRESSION = 20;
export const PLATE_WORLD_WIDTH_M = 12000;
export const PLATE_WORLD_HEIGHT_M = 6750;

/**
 * @typedef {{ id: string, name: string,
 *   rect: { x0: number, z0: number, x1: number, z1: number },
 *   adjacent: string[] }} SectionDef
 */

/** @type {SectionDef[]} */
export const HEARTVALE_SECTIONS = [
  {
    id: "hv-1",
    name: "Soul Well Basin",
    rect: { x0: 4920, z0: 2430, x1: 6240, z1: 2970 },
    adjacent: ["hv-2", "hv-3", "hv-5", "hv-6"],
  },
  {
    id: "hv-2",
    name: "Anwel & Lockroot Reach",
    rect: { x0: 4920, z0: 1755, x1: 6720, z1: 2430 },
    adjacent: ["hv-1", "hv-5", "hv-6"],
  },
  {
    id: "hv-3",
    name: "Vaeldor Crown",
    rect: { x0: 4920, z0: 2970, x1: 6240, z1: 3442.5 },
    adjacent: ["hv-1", "hv-4", "hv-6", "hv-7"],
  },
  {
    id: "hv-4",
    name: "Thalen's Heir",
    rect: { x0: 4920, z0: 3442.5, x1: 6240, z1: 4252.5 },
    adjacent: ["hv-3", "hv-6", "hv-7"],
  },
  {
    id: "hv-5",
    name: "Erboug Stones",
    rect: { x0: 6240, z0: 2430, x1: 7680, z1: 2970 },
    adjacent: ["hv-1", "hv-2", "hv-7"],
  },
  {
    id: "hv-6",
    name: "West Vale Wilds",
    rect: { x0: 4320, z0: 1755, x1: 4920, z1: 4252.5 },
    adjacent: ["hv-1", "hv-2", "hv-3", "hv-4"],
  },
  {
    id: "hv-7",
    name: "East March",
    rect: { x0: 6240, z0: 2970, x1: 7680, z1: 4252.5 },
    adjacent: ["hv-3", "hv-4", "hv-5"],
  },
];

/** @type {Map<string, SectionDef>} */
const byId = new Map(HEARTVALE_SECTIONS.map((section) => [section.id, section]));

/** @param {string} id */
export function getSection(id) {
  return byId.get(id) ?? null;
}

/**
 * Which section contains a world point, if any.
 * @param {number} x @param {number} z
 * @returns {SectionDef | null}
 */
export function sectionAt(x, z) {
  for (const section of HEARTVALE_SECTIONS) {
    const { x0, z0, x1, z1 } = section.rect;
    if (x >= x0 && x < x1 && z >= z0 && z < z1) return section;
  }
  return null;
}
