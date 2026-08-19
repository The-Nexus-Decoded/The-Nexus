/**
 * Heartvale zone registry — the tiled zone cut of the first Thalenyr SECTION.
 *
 * WORLD-BUILDING TAXONOMY (approved 2026-08-19, docs/THALENYR_SCALE_AND_SECTIONS.md):
 *   Map/Landmass → Section → Zone → Connector (+ Shard at runtime)
 *   - Map/Landmass: a whole painted realm map (Thalenyr, M-003).
 *   - Section: a named sub-region authored as ONE continuous world (Heartvale).
 *   - Zone: a server/simulation/streaming slice of a section (this registry,
 *     hv-1 … hv-7). 30 players per shard; overflow spawns another shard.
 *   - Connector: an authored crossing site on a zone seam (road, ford, bridge).
 *     The seamless handoff works along the ENTIRE shared edge; connectors are
 *     just the named, content-rich crossing points.
 *   - Shard: runtime overflow instance of a zone (`hv-1#2`). Operational only.
 *
 * AUTHORING RULE: the section is built whole (one heightmap, one river/road
 * network) and then sliced — zone boundaries are simulation seams, never
 * authored walls. Roads and rivers line up across zones by construction.
 *
 * SCALE (v2, POI-safe cut):
 *   Canon: 1 grid cell on the M-003 painted atlas = 1 day on foot = 30 km.
 *   World: 20:1 distance compression → 1 cell = 1500 m in-world
 *   (~16.7 min continuous walk at 1.5 m/s). The painted plate is 2048×1152 px,
 *   256 px per cell, so the full plate maps to a 12000 m × 6750 m world.
 *   Every zone boundary runs through empty terrain — no POI straddles a seam
 *   (v1 had Anwel and Thalen's Heir cut in half; fixed in v2, see docs).
 *
 * Coordinates are world meters on the plate frame: x east, z south,
 * origin at the plate's top-left corner. Zone membership is decided purely
 * by coordinates — zoneAt(x, z) — never by which road/river was followed.
 */

export const CELL_WORLD_METERS = 1500;
export const CELL_CANON_KM = 30;
export const DISTANCE_COMPRESSION = 20;
export const PLATE_WORLD_WIDTH_M = 12000;
export const PLATE_WORLD_HEIGHT_M = 6750;

/**
 * @typedef {{ id: string, name: string,
 *   rect: { x0: number, z0: number, x1: number, z1: number },
 *   adjacent: string[] }} ZoneDef
 */

/** @type {ZoneDef[]} */
export const HEARTVALE_ZONES = [
  {
    id: "hv-1",
    name: "Soul Well Basin",
    rect: { x0: 4980, z0: 2531.25, x1: 6240, z1: 2970 },
    adjacent: ["hv-2", "hv-3", "hv-5", "hv-6"],
  },
  {
    id: "hv-2",
    name: "Anwel & Lockroot Reach",
    rect: { x0: 4980, z0: 1552.5, x1: 6720, z1: 2531.25 },
    adjacent: ["hv-1", "hv-5", "hv-6"],
  },
  {
    id: "hv-3",
    name: "Vaeldor Crown",
    rect: { x0: 4980, z0: 2970, x1: 6240, z1: 3375 },
    adjacent: ["hv-1", "hv-4", "hv-6", "hv-7"],
  },
  {
    id: "hv-4",
    name: "Thalen's Heir",
    rect: { x0: 4980, z0: 3375, x1: 6240, z1: 4252.5 },
    adjacent: ["hv-3", "hv-6", "hv-7"],
  },
  {
    id: "hv-5",
    name: "Erboug Stones",
    rect: { x0: 6240, z0: 2531.25, x1: 7680, z1: 2970 },
    adjacent: ["hv-1", "hv-2", "hv-7"],
  },
  {
    id: "hv-6",
    name: "West Vale Wilds",
    rect: { x0: 4320, z0: 1552.5, x1: 4980, z1: 4252.5 },
    adjacent: ["hv-1", "hv-2", "hv-3", "hv-4"],
  },
  {
    id: "hv-7",
    name: "East March",
    rect: { x0: 6240, z0: 2970, x1: 7680, z1: 4252.5 },
    adjacent: ["hv-3", "hv-4", "hv-5"],
  },
];

/**
 * Measured POI marker positions (painted-plate pixels → world meters).
 * Zone assignment validated against the v2 cut: every POI sits fully inside
 * its zone. The plate pixel is authoritative for boundary math; the atlas
 * data.js coords are near-identical gameplay anchors.
 */
export const HEARTVALE_POIS = [
  { id: "soulwell", name: "Soul Well (start)", zone: "hv-1", plate: [928, 452], world: [5437.5, 2648.44] },
  { id: "anwel", name: "Anwel", zone: "hv-2", plate: [928, 417], world: [5437.5, 2441.41] },
  { id: "lockroot", name: "Lockroot Vaults", zone: "hv-2", plate: [995, 355], world: [5830.08, 2078.91] },
  { id: "vaeldor", name: "Vaeldor (capital)", zone: "hv-3", plate: [1007, 552], world: [5900.39, 3234.38] },
  { id: "thalensheir", name: "Thalen's Heir", zone: "hv-4", plate: [875, 598], world: [5126.95, 3503.91] },
  { id: "erboug", name: "Echoing (Erboug) Stones", zone: "hv-5", plate: [1125, 480], world: [6591.8, 2812.5] },
  { id: "lockfragment", name: "Lock-Inscription Fragment", zone: "hv-6", plate: [828, 288], world: [4851.56, 1687.5] },
];

/** @type {Map<string, ZoneDef>} */
const byId = new Map(HEARTVALE_ZONES.map((zone) => [zone.id, zone]));

/** @param {string} id */
export function getZone(id) {
  return byId.get(id) ?? null;
}

/**
 * Which zone contains a world point, if any.
 * @param {number} x @param {number} z
 * @returns {ZoneDef | null}
 */
export function zoneAt(x, z) {
  for (const zone of HEARTVALE_ZONES) {
    const { x0, z0, x1, z1 } = zone.rect;
    if (x >= x0 && x < x1 && z >= z0 && z < z1) return zone;
  }
  return null;
}

/** @deprecated Use HEARTVALE_ZONES / zoneAt — kept for the v1 name. */
export const HEARTVALE_SECTIONS = HEARTVALE_ZONES;
export const getSection = getZone;
export const sectionAt = zoneAt;
