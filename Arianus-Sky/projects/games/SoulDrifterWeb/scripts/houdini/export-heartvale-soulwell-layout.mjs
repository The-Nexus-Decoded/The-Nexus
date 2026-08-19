#!/usr/bin/env node

/**
 * Export the Heartvale basin layout for the Houdini Soul Well starting-area build.
 *
 * Canon source: public/lore-atlas/data.js (POI atlas coordinates, realm lore).
 * This script is the single scale authority for the outdoor world:
 *
 *   1 tile        = 1.75 metres (matches src/game/dungeon.ts tileSize)
 *   1 atlas unit  = 5 tiles = 8.75 metres (atlas coords are % of the realm map)
 *   zone grid     = 160 x 160 tiles (280 m x 280 m), the Heartvale basin
 *   zone origin   = atlas (38.0, 24.0)  -> grid (0, 0)
 *   world origin  = the Soul Well terrace (grid 40, 72.5); +X east, +Z south
 *
 * Any future zone or location placed with these constants stays on the same
 * scale as the lore atlas, so distances and bearings between POIs are preserved.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const SEED = 318044611;

const TILE_SIZE = 1.75;
const ATLAS_UNIT_TILES = 5;
const ZONE_GRID = 160;
const ZONE_ORIGIN_ATLAS = { x: 38.0, y: 24.0 };

const atlasToGrid = (atlasX, atlasY) => ({
  x: (atlasX - ZONE_ORIGIN_ATLAS.x) * ATLAS_UNIT_TILES,
  y: (atlasY - ZONE_ORIGIN_ATLAS.y) * ATLAS_UNIT_TILES,
});

// Canon POI coordinates from public/lore-atlas/data.js (do not edit that file).
const POIS = [
  { id: "soulwell",    name: "The Soul Well & First Breach", type: "well",    atlas: { x: 46.0, y: 38.5 } },
  { id: "anwel",       name: "Anwel",                        type: "city",    atlas: { x: 46.0, y: 35.5 } },
  { id: "lockroot",    name: "Lockroot Vaults",              type: "dungeon", atlas: { x: 48.5, y: 31.0 } },
  { id: "vaeldor",     name: "Vaeldor",                      type: "capital", atlas: { x: 49.5, y: 47.5 } },
  { id: "erboug",      name: "The Erboug Stones",            type: "poi",     atlas: { x: 55.5, y: 41.0 } },
  { id: "thalensheir", name: "Thalen's Heir",                type: "city",    atlas: { x: 46.5, y: 51.5 } },
];

const soulwellGrid = atlasToGrid(46.0, 38.5);
const gridToWorld = (gx, gy) => ({
  x: (gx - soulwellGrid.x) * TILE_SIZE,
  z: (gy - soulwellGrid.y) * TILE_SIZE,
});

const anchors = POIS.map((poi) => {
  const grid = atlasToGrid(poi.atlas.x, poi.atlas.y);
  const world = gridToWorld(grid.x, grid.y);
  return { id: poi.id, name: poi.name, type: poi.type, atlas: poi.atlas, grid, world };
});

/** Resample a waypoint polyline at ~1-tile spacing (grid coords). */
function samplePolyline(waypoints, spacing = 1.0) {
  const samples = [];
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const [ax, ay] = waypoints[i];
    const [bx, by] = waypoints[i + 1];
    const length = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.round(length / spacing));
    for (let s = 0; s < steps; s += 1) {
      const t = s / steps;
      samples.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
  }
  samples.push(waypoints[waypoints.length - 1]);
  return samples;
}

// Two rivers meet at Vaeldor ("raised at the meeting of the rivers"), then one
// continues south past Thalen's Heir toward the Fenward Mires. Anwel sits on
// the northern run, above (upstream of) the Well.
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
];

// Walkable road network connecting all six anchors (grid coords).
const ROADS = [
  {
    id: "well-to-anwel",
    waypoints: [[40, 72.5], [39.8, 64], [39.6, 58], [40, 57.5]],
  },
  {
    id: "anwel-to-lockroot",
    waypoints: [[40, 57.5], [45, 48], [49, 41], [52.5, 35]],
  },
  {
    // Through-road (runbook rule 9): the atlas shows the river road continuing
    // north past Anwel along the east bank toward the basin rim.
    id: "anwel-north-road",
    waypoints: [[40, 57.5], [41.5, 48], [42, 38], [42.5, 26], [43, 14], [43.5, 3]],
  },
  {
    id: "well-to-vaeldor",
    waypoints: [[40, 72.5], [40.5, 80], [42, 88], [46, 96], [51, 105], [55, 112], [57.5, 117.5]],
  },
  {
    id: "vaeldor-to-thalensheir",
    waypoints: [[57.5, 117.5], [53, 124], [48, 131], [42.5, 137.5]],
  },
  {
    id: "vaeldor-road-to-erboug",
    waypoints: [[46, 96], [56, 92], [66, 89], [76, 86.5], [87.5, 85]],
  },
  {
    // Village lane: leaves the river road and loops around Anwel's green so the
    // settlement reads as a real place — houses face the lane, set back behind
    // garden plots, instead of clustering on the plaza (world-space design in
    // build-heartvale-realistic.py; grid = world/1.75 + (40, 72.5)).
    id: "anwel-village-lane",
    waypoints: [
      [40.57, 56.96], [41.6, 56.84], [42.29, 56.9], [42.4, 55.59], [43.43, 54.67],
      [44.91, 54.44], [46.17, 55.13], [46.63, 56.5], [46.63, 57.99], [46.06, 59.36],
      [44.8, 60.04], [43.43, 59.93], [42.51, 59.13], [42.29, 57.99], [42.29, 56.9],
    ],
  },
  {
    id: "anwel-dock-spur",
    waypoints: [[40.57, 57.64], [39.2, 57.87], [38.51, 57.99]],
  },
];

const payload = {
  schemaVersion: 1,
  source: "scripts/houdini/export-heartvale-soulwell-layout.mjs",
  canonSource: "public/lore-atlas/data.js",
  seed: SEED,
  scale: {
    tileSize: TILE_SIZE,
    atlasUnitTiles: ATLAS_UNIT_TILES,
    atlasUnitMeters: TILE_SIZE * ATLAS_UNIT_TILES,
    zoneGrid: ZONE_GRID,
    zoneOriginAtlas: ZONE_ORIGIN_ATLAS,
    worldOrigin: "soulwell-terrace",
    worldAxes: "+X east, +Z south, +Y up",
  },
  anchors,
  rivers: RIVERS.map((river) => ({ id: river.id, samples: samplePolyline(river.waypoints) })),
  roads: ROADS.map((road) => ({ id: road.id, samples: samplePolyline(road.waypoints) })),
  startingArea: {
    centerGrid: [soulwellGrid.x, soulwellGrid.y],
    radiusTiles: 22,
    note: "Detailed dressing (terrace, well, portal, trees, rocks) is authored inside this radius; the rest of the basin is terrain, rivers, roads, and anchor markers only.",
  },
};

const outputPath = process.argv[2] ? resolve(process.argv[2]) : null;
if (!outputPath) {
  throw new Error("Usage: node export-heartvale-soulwell-layout.mjs <output.json>");
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  outputPath,
  seed: SEED,
  anchors: anchors.length,
  riverSamples: payload.rivers.reduce((sum, river) => sum + river.samples.length, 0),
  roadSamples: payload.roads.reduce((sum, road) => sum + road.samples.length, 0),
}));
