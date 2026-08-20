#!/usr/bin/env node
/**
 * Export a BREACH-V2 run layout JSON for the Houdini build (runbook §5.3).
 *
 *   node --experimental-strip-types scripts/houdini/export-breach-v2-layout.mjs <seed> <wayfarer|oathbreaker> <out.json>
 *
 * Runs the seeded generator (src/game/dungeons/breach-v2-generator.ts) against
 * the flat-map-derived registry and resolves every placement to its kit GLB +
 * catalog presentation metadata (elevation, fire anchors, vertical scale).
 * Coordinates: plan meters -> world meters, plan +y -> world +z (engine
 * convention), y-up heights in meters.
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { generateBreachV2 } from "../../src/game/dungeons/breach-v2-generator.ts";
import { BREACH_V2_REGISTRY as R } from "../../src/game/dungeons/breach-v2-registry.mjs";
import { DUNGEON_PROP_ASSETS } from "../../src/game/environment/DungeonPropCatalog.ts";

const [seedRaw, pathId, outRaw] = process.argv.slice(2);
const seed = Number(seedRaw);
if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
  throw new Error(`Seed must be an unsigned 32-bit integer; received ${seedRaw}.`);
}
if (pathId !== "wayfarer" && pathId !== "oathbreaker") {
  throw new Error(`Path must be wayfarer|oathbreaker; received ${pathId}.`);
}
if (!outRaw) throw new Error("Missing output path.");
const outPath = resolve(outRaw);

const gen = generateBreachV2(seed, pathId);
const corruptionByKind = {
  start: 0.05, corridor: 0.08, plaza: 0.10, convergence: 0.70,
  ante: 0.80, boss: 1.00, vault: 0.60, exit: 0.30,
};

const SOURCE_ROOTS = [
  "docs/3d-ai-studio/source-models/environment/dungeon-kit",
  "docs/3d-ai-studio/source-models/environment/dungeon-completion-kit",
];
const RUNTIME_ROOT = "/assets/3d/environment/dungeon-kit";

function sourceGlb(asset, spec) {
  // the catalog sourceUrl carries the physical file (hanging-brazier reuses floor-brazier.glb)
  const filename = spec?.sourceUrl ? spec.sourceUrl.split("/").pop() : `${asset}.glb`;
  for (const root of SOURCE_ROOTS) {
    const candidate = `${root}/${filename}`;
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

// deterministic prop yaw (stable per room template, independent of run seed)
function propYaw(asset, x, y) {
  let h = 2166136261;
  for (const ch of `${asset}:${x.toFixed(2)},${y.toFixed(2)}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (Math.abs(h) % 8) * 45;
}

const FACING_YAW = { south: 180, north: 0, east: 90, west: 270, up: null, down: null };

const placements = gen.placements.map((p) => {
  const spec = DUNGEON_PROP_ASSETS[p.asset] ?? null;
  const source = spec ? sourceGlb(p.asset, spec) : null;
  if (spec && !source) throw new Error(`No source GLB for kit asset ${p.asset}`);
  const isArt = p.role === "wall-art";
  const isBooks = p.group === "books";
  return {
    asset: p.asset,
    roomId: p.roomId,
    zone: p.zoneId,
    x: p.worldX,
    z: p.worldY,
    yaw: p.placement === "wall" ? (FACING_YAW[p.facing] ?? 0) : propYaw(p.asset, p.x, p.y),
    placement: p.placement,
    facing: p.facing,
    elevation: spec?.elevation ?? 0,
    height: p.height ?? spec?.targetHeight ?? 1.0,
    footprint: p.footprint ?? spec?.maxFootprint ?? 1.2,
    blocking: p.blocksMovement,
    role: p.role,
    width: p.width ?? null,
    glbSource: source,
    glbRuntime: spec ? `${RUNTIME_ROOT}/${p.asset}.glb` : null,
    fireColor: spec?.fireColor ?? null,
    fireAnchorY: spec?.fireAnchorY ?? null,
    fireCastsShadow: spec?.fireCastsShadow ?? false,
    verticalScale: spec?.verticalScale ?? null,
    note: isArt ? "framed PBR plane (runbook §5A)" : isBooks ? "texture-based book/scroll prop" : null,
  };
});

const rooms = [
  ...gen.fixedRooms.map((r) => ({
    id: r.id, name: r.name, kind: r.kind, fixed: true,
    x: r.x, z: r.y, w: r.w, h: r.h,
    corruption: corruptionByKind[r.kind] ?? 0.2,
  })),
  ...gen.chambers.map((c) => ({
    id: c.id, name: c.name, kind: "gallery", fixed: false, poolRoomId: c.poolRoomId,
    x: c.x, z: c.y, w: c.w, h: c.h,
    corruption: pathId === "wayfarer" ? 0.25 : 0.45,
  })),
];

const corridors = gen.corridors.map((c) => ({
  id: c.id,
  points: [[c.from.x, c.from.y], [c.bend.x, c.bend.y], [c.to.x, c.to.y]],
  width: c.width,
}));

const landmarkOut = (id) => {
  const lm = R.landmarks.find((l) => l.id === id);
  const room = R.fixedRooms.find((r) => r.id === lm.roomId);
  return { id, roomId: lm.roomId, x: room.x + lm.x, z: room.y + lm.y, r: lm.r ?? null, apron: lm.apron ?? null, w: lm.w ?? null, label: lm.label };
};

// light plan: every fire prop is a light anchor; plus landmark lights
const fireLights = placements
  .filter((p) => p.fireAnchorY !== null)
  .map((p, i) => ({
    id: `fire-${i}`, x: p.x, z: p.z, y: p.elevation + p.fireAnchorY,
    color: p.fireColor === "soul" ? "#7fe8ff" : "#ff9a50",
    intensity: p.asset === "wall-torch-sconce" ? 0.55 : 0.8,
    radius: 7.0, castsShadow: p.fireCastsShadow,
  }));
const well = landmarkOut("soul-well");
const lights = [
  ...fireLights,
  { id: "soul-well-glow", x: well.x, z: well.z, y: 1.6, color: "#7fe8ff", intensity: 2.2, radius: 10.0, castsShadow: true },
  { id: "boss-ember", x: gen.boss.x, z: gen.boss.y, y: 3.4, color: "#ff6a3c", intensity: 1.6, radius: 14.0, castsShadow: true },
  { id: "memory-glow", x: gen.firstMemory.x, z: gen.firstMemory.y, y: 1.8, color: "#c9a8ff", intensity: 1.4, radius: 7.0, castsShadow: false },
  { id: "exit-daylight", x: gen.exitPoint.x, z: gen.exitPoint.y, y: 3.0, color: "#cfe8c0", intensity: 1.5, radius: 10.0, castsShadow: false },
];

const layout = {
  meta: {
    dungeon: R.id, seed, path: pathId, navCell: R.units.navCellMeters,
    chamberCount: gen.chamberCount, comparisonSeed: 4182,
    sourceMap: R.sourceMap, generator: "src/game/dungeons/breach-v2-generator.ts",
  },
  rooms,
  corridors,
  placements,
  landmarks: {
    soulWell: landmarkOut("soul-well"),
    playerStart: { x: gen.playerStart.x, z: gen.playerStart.y },
    ilyra: landmarkOut("ilyra"),
    memoryLoom: landmarkOut("memory-loom"),
    coffer: landmarkOut("coffer"),
    effigy: landmarkOut("effigy"),
    orren: landmarkOut("orren"),
    brannoc: landmarkOut("brannoc"),
    doorWayfarer: landmarkOut("door-wayfarer"),
    doorOathbreaker: landmarkOut("door-oathbreaker"),
    firstMemory: { x: gen.firstMemory.x, z: gen.firstMemory.y },
    exitPoint: { x: gen.exitPoint.x, z: gen.exitPoint.y },
  },
  enemies: gen.enemies.map((e) => ({ id: e.id, kind: e.kind, x: e.x, z: e.y, maxHp: e.maxHp })),
  boss: { id: gen.boss.id, pattern: gen.boss.pattern, x: gen.boss.x, z: gen.boss.y, maxHp: gen.boss.maxHp },
  lights,
  pressures: { gallery: gen.galleryPressure, boss: gen.bossPressure },
  rewardId: gen.rewardId,
  bonusSkillAwakened: gen.bonusSkillAwakened,
};

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(layout, null, 2)}\n`, "utf8");
console.log(`wrote ${outPath}`);
console.log(`rooms=${rooms.length} corridors=${corridors.length} placements=${placements.length} lights=${lights.length} enemies=${gen.enemies.length}`);
