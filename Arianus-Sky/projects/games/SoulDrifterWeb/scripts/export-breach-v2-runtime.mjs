#!/usr/bin/env node
/** Generate the complete BREACH-V2 runtime data set as one validated unit. */

import {
  mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile,
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { BREACH_V2_REGISTRY as R } from "../src/game/dungeons/breach-v2-registry.mjs";
import { buildBreachV2Layout } from "../src/game/dungeons/breach-v2-layout.ts";
import { DUNGEON_PROP_ASSETS } from "../src/game/environment/DungeonPropCatalog.ts";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, "..");
const DEFAULT_OUT_DIR = resolve(PROJECT_ROOT, "public/data/dungeons/breach-v2");
const FIXTURE_SEEDS = [
  { seed: 4182, label: "comparison" },
  { seed: 7, label: "sparse-3ch" },
  { seed: 1, label: "median-4ch" },
  { seed: 2, label: "dense-5ch" },
];
const PATHS = ["wayfarer", "oathbreaker"];

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function validateOutputDirectory(raw) {
  const output = raw ? resolve(PROJECT_ROOT, raw) : DEFAULT_OUT_DIR;
  const projectRelative = relative(PROJECT_ROOT, output);
  if (projectRelative === "" || projectRelative.startsWith("..")) {
    throw new Error("--out-dir must stay inside the SoulDrifterWeb project root.");
  }
  return output;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function generateCompleteSet(outDir) {
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "registry.json"), `${JSON.stringify(R)}\n`, "utf8");
  const fixtures = [];
  for (const { seed, label } of FIXTURE_SEEDS) {
    for (const pathId of PATHS) {
      const layout = buildBreachV2Layout(seed, pathId, DUNGEON_PROP_ASSETS);
      const file = `layout-${seed}-${pathId}.json`;
      await writeFile(join(outDir, file), `${JSON.stringify(layout)}\n`, "utf8");
      fixtures.push({
        file,
        seed,
        path: pathId,
        label,
        chambers: layout.meta.chamberCount,
        rooms: layout.rooms.map((room) => room.poolRoomId ?? room.id),
        bossPattern: layout.boss.pattern,
        placements: layout.placements.length,
      });
    }
  }
  const index = {
    dungeon: R.id,
    sourceMap: R.sourceMap,
    worldAnchor: R.worldAnchor,
    seedPolicy: R.seedPolicy,
    note: "the preview generates arbitrary seeds live; these fixtures pin the review set",
    fixtures,
  };
  await writeFile(join(outDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");
  return fixtures;
}

async function validateCompleteSet(outDir, fixtures) {
  const expectedFiles = new Set(["registry.json", "index.json", ...fixtures.map(({ file }) => file)]);
  const actualFiles = new Set(await readdir(outDir));
  if (actualFiles.size !== expectedFiles.size || [...expectedFiles].some((file) => !actualFiles.has(file))) {
    throw new Error("BREACH-V2 staged export is incomplete or contains stale files.");
  }
  const registry = JSON.parse(await readFile(join(outDir, "registry.json"), "utf8"));
  const index = JSON.parse(await readFile(join(outDir, "index.json"), "utf8"));
  if (JSON.stringify(registry) !== JSON.stringify(R)) throw new Error("Staged registry differs from canonical data.");
  if (index.fixtures.length !== FIXTURE_SEEDS.length * PATHS.length) {
    throw new Error("Staged index does not enumerate the complete fixture matrix.");
  }
  for (const fixture of index.fixtures) {
    const layout = JSON.parse(await readFile(join(outDir, fixture.file), "utf8"));
    if (layout.meta.seed !== fixture.seed || layout.meta.path !== fixture.path) {
      throw new Error(`Fixture metadata drift: ${fixture.file}`);
    }
    if (layout.placements.length !== fixture.placements) {
      throw new Error(`Fixture placement-count drift: ${fixture.file}`);
    }
  }
}

async function assertMatchesTracked(stagedDir, outDir) {
  if (!(await exists(outDir))) throw new Error("BREACH-V2 tracked export directory is missing.");
  const stagedFiles = (await readdir(stagedDir)).sort();
  const trackedFiles = (await readdir(outDir)).sort();
  if (JSON.stringify(stagedFiles) !== JSON.stringify(trackedFiles)) {
    throw new Error("BREACH-V2 tracked export file inventory is stale.");
  }
  for (const file of stagedFiles) {
    const [staged, tracked] = await Promise.all([
      readFile(join(stagedDir, file)),
      readFile(join(outDir, file)),
    ]);
    if (!staged.equals(tracked)) throw new Error(`BREACH-V2 tracked export is stale: ${file}`);
  }
}

const args = process.argv.slice(2);
if (args.includes("--fixtures-only") || args.includes("--metadata-only")) {
  throw new Error("Partial export modes are not supported; generate and validate the complete set.");
}
const allowedArgs = new Set(["--check", "--out-dir"]);
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--out-dir") {
    index += 1;
    continue;
  }
  if (!allowedArgs.has(arg)) throw new Error(`Unknown argument: ${arg}`);
}
const outDir = validateOutputDirectory(valueAfter(args, "--out-dir"));
const parent = dirname(outDir);
await mkdir(parent, { recursive: true });
const stagedDir = await mkdtemp(join(parent, ".breach-v2-stage-"));
const backupDir = `${outDir}.backup-${process.pid}`;
try {
  const fixtures = await generateCompleteSet(stagedDir);
  await validateCompleteSet(stagedDir, fixtures);
  if (args.includes("--check")) {
    await assertMatchesTracked(stagedDir, outDir);
    console.log(`verified complete BREACH-V2 export at ${outDir}`);
  } else {
    if (await exists(backupDir)) await rm(backupDir, { recursive: true, force: true });
    if (await exists(outDir)) await rename(outDir, backupDir);
    try {
      await rename(stagedDir, outDir);
      await rm(backupDir, { recursive: true, force: true });
    } catch (error) {
      if (!(await exists(outDir)) && await exists(backupDir)) await rename(backupDir, outDir);
      throw error;
    }
    console.log(`wrote complete BREACH-V2 export to ${outDir}`);
  }
} finally {
  await rm(stagedDir, { recursive: true, force: true });
}
