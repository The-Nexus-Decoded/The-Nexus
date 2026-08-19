#!/usr/bin/env node

/**
 * Export the Heartvale SECTION layout (v2 zone frame) — single layout authority.
 *
 * Frame (owner-approved 2026-08-19, docs/THALENYR_SCALE_AND_SECTIONS.md):
 *   origin  = top-left corner of the M-003 painted plate; +x east, +z south
 *   units   = meters; plate = 2048×1152 px = 12000×6750 m (5.859375 m/px)
 *   1 grid cell = 1500 m world (20:1 compression of 30 km canon)
 *   zones   = hv-1…hv-7, POIs = HEARTVALE_POIS — both imported from
 *             server/sections.mjs. NEVER re-measure, never round.
 *
 * Method: legacy data.js atlas coordinates preserve the painted plate's
 * bearings and river/road shapes. Each legacy grid waypoint is mapped
 * grid → atlas % → plate pixels → world meters, then the whole network is
 * rigidly translated so the legacy Soul Well lands exactly on its measured
 * HEARTVALE_POIS anchor. All other anchors land within ±5 m (validated in
 * tests). Village-scale features (Anwel lane loop, dock spur) are authored
 * directly in meters around the Anwel anchor — they must NOT be stretched
 * by the basin transform.
 *
 * Consumed by scripts/houdini/build-heartvale-realistic.py (Houdini build)
 * and by the runtime zone loader (public/data/zones/heartvale/layout.json).
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CELL_WORLD_METERS,
  HEARTVALE_POIS,
  HEARTVALE_ZONES,
  PLATE_WORLD_HEIGHT_M,
  PLATE_WORLD_WIDTH_M,
} from "../../server/sections.mjs";

const SEED = 318044611;

/** Logical gameplay grid on top of the world frame (documented per runbook §3). */
const TILE_SIZE = 15; // meters; hv-1 = 84 × 29.25 tiles

// --- Legacy atlas frame (shape/bearing source only — NOT the scale authority) --
const LEGACY_ZONE_ORIGIN_ATLAS = { x: 38.0, y: 24.0 };
const LEGACY_ATLAS_UNIT_TILES = 5;
const LEGACY_POIS = [
  { id: "soulwell", name: "The Soul Well & First Breach", type: "well", atlas: { x: 46.0, y: 38.5 } },
  { id: "anwel", name: "Anwel", type: "city", atlas: { x: 46.0, y: 35.5 } },
  { id: "lockroot", name: "Lockroot Vaults", type: "dungeon", atlas: { x: 48.5, y: 31.0 } },
  { id: "vaeldor", name: "Vaeldor", type: "capital", atlas: { x: 49.5, y: 47.5 } },
  { id: "erboug", name: "The Erboug Stones", type: "poi", atlas: { x: 55.5, y: 41.0 } },
  { id: "thalensheir", name: "Thalen's Heir", type: "city", atlas: { x: 46.5, y: 51.5 } },
];

/** Legacy grid (as used by the v1 exporter) -> plate world meters, unshifted. */
function legacyGridToPlateWorld(gx, gy) {
  const atlasX = gx / LEGACY_ATLAS_UNIT_TILES + LEGACY_ZONE_ORIGIN_ATLAS.x;
  const atlasY = gy / LEGACY_ATLAS_UNIT_TILES + LEGACY_ZONE_ORIGIN_ATLAS.y;
  return {
    x: (atlasX / 100) * PLATE_WORLD_WIDTH_M,
    z: (atlasY / 100) * PLATE_WORLD_HEIGHT_M,
  };
}

const poiById = new Map(HEARTVALE_POIS.map((poi) => [poi.id, poi]));
const measuredSoulwell = poiById.get("soulwell");
if (!measuredSoulwell) throw new Error("HEARTVALE_POIS is missing 'soulwell'.");

// Rigid shift: legacy soulwell grid point (40, 72.5) -> measured plate anchor.
const legacySoulwellWorld = legacyGridToPlateWorld(40, 72.5);
const SHIFT = {
  x: measuredSoulwell.world[0] - legacySoulwellWorld.x,
  z: measuredSoulwell.world[1] - legacySoulwellWorld.z,
};

const toWorld = (gx, gy) => {
  const point = legacyGridToPlateWorld(gx, gy);
  return [point.x + SHIFT.x, point.z + SHIFT.z];
};

// The legacy atlas coords and the measured plate markers disagree by up to a
// few hundred meters for some POIs (data.js is hand-tuned). Roads and rivers
// must SERVE the measured anchors, so after the rigid shift we apply an
// inverse-distance-weighted correction field built from the six POI deltas —
// waypoints sitting on a legacy POI snap exactly to its measured anchor, and
// the correction falls off smoothly (weight 1/d⁴) everywhere else.
const CORRECTIONS = LEGACY_POIS.map((legacy) => {
  const gridX = (legacy.atlas.x - LEGACY_ZONE_ORIGIN_ATLAS.x) * LEGACY_ATLAS_UNIT_TILES;
  const gridY = (legacy.atlas.y - LEGACY_ZONE_ORIGIN_ATLAS.y) * LEGACY_ATLAS_UNIT_TILES;
  const [legacyX, legacyZ] = toWorld(gridX, gridY);
  const measured = poiById.get(legacy.id);
  return { x: legacyX, z: legacyZ, dx: measured.world[0] - legacyX, dz: measured.world[1] - legacyZ };
});

function correctToMeasured(wx, wz) {
  let weightSum = 0;
  let dxSum = 0;
  let dzSum = 0;
  for (const c of CORRECTIONS) {
    const d2 = (wx - c.x) ** 2 + (wz - c.z) ** 2;
    if (d2 < 0.25) return [c.x + c.dx, c.z + c.dz]; // on the POI: exact measured anchor
    const weight = 1 / (d2 * d2);
    weightSum += weight;
    dxSum += weight * c.dx;
    dzSum += weight * c.dz;
  }
  return [wx + dxSum / weightSum, wz + dzSum / weightSum];
}

const toFrame = (gx, gy) => correctToMeasured(...toWorld(gx, gy));

// Anchors: measured plate positions are authoritative (never re-measured).
const anchors = LEGACY_POIS.map((legacy) => {
  const measured = poiById.get(legacy.id);
  if (!measured) throw new Error(`HEARTVALE_POIS is missing '${legacy.id}'.`);
  const legacyWorld = toWorld(
    (legacy.atlas.x - LEGACY_ZONE_ORIGIN_ATLAS.x) * LEGACY_ATLAS_UNIT_TILES,
    (legacy.atlas.y - LEGACY_ZONE_ORIGIN_ATLAS.y) * LEGACY_ATLAS_UNIT_TILES,
  );
  const world = { x: measured.world[0], z: measured.world[1] };
  return {
    id: legacy.id,
    name: legacy.name,
    type: legacy.type,
    zone: measured.zone,
    plate: measured.plate,
    world,
    grid: { x: world.x / TILE_SIZE, y: world.z / TILE_SIZE },
    driftMeters: Math.hypot(world.x - legacyWorld[0], world.z - legacyWorld[1]),
  };
});

/** Resample a world-meter waypoint polyline at ~`spacing` meter spacing. */
function samplePolyline(waypoints, spacing = 5.0) {
  const samples = [];
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const [ax, az] = waypoints[i];
    const [bx, bz] = waypoints[i + 1];
    const length = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(1, Math.round(length / spacing));
    for (let s = 0; s < steps; s += 1) {
      const t = s / steps;
      samples.push([ax + (bx - ax) * t, az + (bz - az) * t]);
    }
  }
  samples.push(waypoints[waypoints.length - 1]);
  return samples;
}

// Two rivers meet at Vaeldor ("raised at the meeting of the rivers"), then one
// continues south past Thalen's Heir toward the Fenward Mires. Anwel sits on
// the northern run, above (upstream of) the Well. Legacy grid waypoints keep
// the painted shapes; the frame transform carries them into world meters.
const RIVERS = [
  {
    id: "anwel-run",
    waypoints: [[40, 6], [40.5, 30], [40, 57.5], [37.5, 66], [36.5, 74], [38, 84], [44, 98], [52, 110], [57.5, 117.5]],
  },
  {
    id: "lockroot-run",
    waypoints: [[68, 14], [62, 26], [57, 36], [60, 52], [62, 72], [61, 92], [58.5, 108], [57.5, 117.5]],
  },
  {
    id: "heir-run",
    waypoints: [[57.5, 117.5], [52, 126], [46, 133], [42.5, 137.5], [39, 150], [38, 158]],
  },
].map((river) => ({ id: river.id, samples: samplePolyline(river.waypoints.map(([gx, gy]) => toFrame(gx, gy))) }));

// Basin-scale roads: plate transform. Village-scale roads: meter offsets.
const anwel = poiById.get("anwel");
const ANWEL_WORLD = { x: anwel.world[0], z: anwel.world[1] };
const villageLaneOffsets = [
  [1.0, -0.93], [2.8, -1.03], [4.01, -0.93], [4.2, -3.22], [6.0, -4.83],
  [8.59, -5.23], [10.8, -4.02], [11.6, -1.63], [11.6, 0.98], [10.61, 3.38],
  [8.4, 4.57], [6.0, 4.38], [4.39, 2.98], [4.01, 0.98], [4.01, -0.93],
];
const dockSpurOffsets = [[1.0, 0.27], [-1.4, 0.67], [-2.61, 0.88]];
const offsetToWorld = ([ox, oz]) => [ANWEL_WORLD.x + ox, ANWEL_WORLD.z + oz];

const ROADS = [
  { id: "well-to-anwel", waypoints: [[40, 72.5], [39.8, 64], [39.6, 58], [40, 57.5]] },
  { id: "anwel-to-lockroot", waypoints: [[40, 57.5], [45, 48], [49, 41], [52.5, 35]] },
  {
    // Through-road (runbook rule 7): the river road continues north past Anwel
    // along the east bank toward the basin rim — never dead-end at a settlement.
    id: "anwel-north-road",
    waypoints: [[40, 57.5], [41.5, 48], [42, 38], [42.5, 26], [43, 14], [43.5, 3]],
  },
  { id: "well-to-vaeldor", waypoints: [[40, 72.5], [40.5, 80], [42, 88], [46, 96], [51, 105], [55, 112], [57.5, 117.5]] },
  { id: "vaeldor-to-thalensheir", waypoints: [[57.5, 117.5], [53, 124], [48, 131], [42.5, 137.5]] },
  { id: "vaeldor-road-to-erboug", waypoints: [[46, 96], [56, 92], [66, 89], [76, 86.5], [87.5, 85]] },
].map((road) => ({ id: road.id, samples: samplePolyline(road.waypoints.map(([gx, gy]) => toFrame(gx, gy))) }));

ROADS.push(
  {
    id: "anwel-village-lane",
    samples: samplePolyline(villageLaneOffsets.map(offsetToWorld), 2.0),
  },
  {
    id: "anwel-dock-spur",
    samples: samplePolyline(dockSpurOffsets.map(offsetToWorld), 2.0),
  },
);

const payload = {
  schemaVersion: 2,
  source: "scripts/houdini/export-heartvale-soulwell-layout.mjs",
  frameSource: "server/sections.mjs",
  seed: SEED,
  scale: {
    frame: "plate-world-meters",
    frameNote: "origin = M-003 plate top-left, +x east, +z south, meters; 1 cell = 1500 m; plate = 12000×6750 m",
    tileSize: TILE_SIZE,
    tileNote: "logical gameplay grid only: 1 tile = 15 m (hv-1 = 84×29.25 tiles)",
    cellWorldMeters: CELL_WORLD_METERS,
    plateWorld: { width: PLATE_WORLD_WIDTH_M, height: PLATE_WORLD_HEIGHT_M },
    worldAxes: "+X east, +Z south, +Y up",
  },
  zones: HEARTVALE_ZONES,
  anchors,
  rivers: RIVERS,
  roads: ROADS,
  startingArea: {
    centerWorld: [measuredSoulwell.world[0], measuredSoulwell.world[1]],
    radiusMeters: 330,
    note: "Detailed dressing (terrace, well, portal, trees, rocks) is authored inside this radius; the rest of the basin is terrain, rivers, roads, and anchor markers only.",
  },
};

const here = dirname(fileURLToPath(import.meta.url));
const defaultOutput = resolve(here, "../../source-assets/houdini/heartvale-layout.json");
const outputPath = process.argv[2] ? resolve(process.argv[2]) : defaultOutput;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  outputPath,
  seed: SEED,
  tileSize: TILE_SIZE,
  anchors: anchors.map((a) => ({ id: a.id, world: a.world, driftMeters: Number(a.driftMeters.toFixed(2)) })),
  riverSamples: payload.rivers.reduce((sum, river) => sum + river.samples.length, 0),
  roadSamples: payload.roads.reduce((sum, road) => sum + road.samples.length, 0),
}));
