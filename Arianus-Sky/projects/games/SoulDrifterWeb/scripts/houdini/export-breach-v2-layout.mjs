#!/usr/bin/env node
/**
 * Export a BREACH-V2 run layout JSON for the Houdini build (runbook §5.3).
 *
 *   node --experimental-strip-types scripts/houdini/export-breach-v2-layout.mjs <seed> <wayfarer|oathbreaker> <out.json>
 *
 * Thin CLI over src/game/dungeons/breach-v2-layout.ts (shared with the
 * runtime preview). Adds Houdini-only source-GLB resolution (kit + completion
 * kit dirs; the catalog sourceUrl carries the hanging-brazier alias).
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildBreachV2Layout } from "../../src/game/dungeons/breach-v2-layout.ts";
import { DUNGEON_PROP_ASSETS } from "../../src/game/environment/DungeonPropCatalog.ts";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const GAME_ROOT = resolve(SCRIPT_DIR, "../..");
const [seedRaw, pathId, outRaw] = process.argv.slice(2);
const seed = Number(seedRaw);
if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
  throw new Error(`Seed must be an unsigned 32-bit integer; received ${seedRaw}.`);
}
if (pathId !== "wayfarer" && pathId !== "oathbreaker") {
  throw new Error(`Path must be wayfarer|oathbreaker; received ${pathId}.`);
}
if (!outRaw) throw new Error("Missing output path.");
const outPath = resolve(GAME_ROOT, outRaw);
const relativeOutPath = relative(GAME_ROOT, outPath);
if (relativeOutPath.startsWith("..") || relativeOutPath === "") {
  throw new Error("Output must be a file inside the SoulDrifterWeb project root.");
}

const SOURCE_ROOTS = [
  "docs/3d-ai-studio/source-models/environment/dungeon-kit",
  "docs/3d-ai-studio/source-models/environment/dungeon-completion-kit",
];

function sourceGlb(spec) {
  const filename = spec?.sourceUrl ? spec.sourceUrl.split("/").pop() : null;
  if (!filename) return null;
  for (const root of SOURCE_ROOTS) {
    const candidate = resolve(GAME_ROOT, root, filename);
    if (existsSync(candidate)) return relative(GAME_ROOT, candidate).replaceAll("\\", "/");
  }
  return null;
}

const layout = buildBreachV2Layout(seed, pathId, DUNGEON_PROP_ASSETS);
for (const p of layout.placements) {
  const spec = DUNGEON_PROP_ASSETS[p.asset] ?? null;
  if (spec) {
    const source = sourceGlb(spec);
    if (!source) throw new Error(`No source GLB for kit asset ${p.asset}`);
    p.glbSource = source;
  } else {
    p.glbSource = null;
  }
}

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(layout, null, 2)}\n`, "utf8");
console.log(`wrote ${outPath}`);
console.log(`rooms=${layout.rooms.length} corridors=${layout.corridors.length} placements=${layout.placements.length} lights=${layout.lights.length} enemies=${layout.enemies.length}`);
