#!/usr/bin/env node
/**
 * BREACH-V2 runtime exports (runbook §5.4) -> public/data/dungeons/breach-v2/
 *
 *   node --experimental-strip-types scripts/export-breach-v2-runtime.mjs
 *
 * Emits the registry as data (registry.json), the fixed review fixtures
 * (comparison seed 4182 + sparse/median/dense representatives per path), and
 * an index.json. The runtime preview generates arbitrary seeds live; these
 * fixtures pin the review/validation set.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { BREACH_V2_REGISTRY as R } from "../src/game/dungeons/breach-v2-registry.mjs";
import { buildBreachV2Layout } from "../src/game/dungeons/breach-v2-layout.ts";
import { DUNGEON_PROP_ASSETS } from "../src/game/environment/DungeonPropCatalog.ts";

const OUT_DIR = resolve("public/data/dungeons/breach-v2");

const cliArgs = process.argv.slice(2);
const fixturesOnly = cliArgs.includes("--fixtures-only");
const metadataOnly = cliArgs.includes("--metadata-only");
if (fixturesOnly && metadataOnly) {
  throw new Error("--fixtures-only and --metadata-only are mutually exclusive");
}
const onlySeedsArg = cliArgs.find((arg) => arg.startsWith("--only-seeds="));
const onlySeeds = onlySeedsArg
  ? new Set(onlySeedsArg.slice("--only-seeds=".length).split(",").map((value) => Number.parseInt(value, 10)))
  : null;
if (onlySeeds?.has(Number.NaN)) throw new Error(`invalid --only-seeds value: ${onlySeedsArg}`);

const FIXTURE_SEEDS = [
  { seed: 4182, label: "comparison" }, // kept from #450 — direct comparison seed
  { seed: 7, label: "sparse-3ch" },    // 3 chambers (both paths, sweep-verified)
  { seed: 1, label: "median-4ch" },    // 4 chambers
  { seed: 2, label: "dense-5ch" },     // 5 chambers
];
const PATHS = ["wayfarer", "oathbreaker"];

await mkdir(OUT_DIR, { recursive: true });

// minified — these are data payloads, not reading material (150 MiB budget)
if (!fixturesOnly) await writeFile(`${OUT_DIR}/registry.json`, `${JSON.stringify(R)}\n`, "utf8");

const fixtures = [];
for (const { seed, label } of FIXTURE_SEEDS) {
  for (const pathId of PATHS) {
    const layout = buildBreachV2Layout(seed, pathId, DUNGEON_PROP_ASSETS);
    const file = `layout-${seed}-${pathId}.json`;
    if (!metadataOnly && (!onlySeeds || onlySeeds.has(seed))) {
      await writeFile(`${OUT_DIR}/${file}`, `${JSON.stringify(layout)}\n`, "utf8");
    }
    fixtures.push({
      file, seed, path: pathId, label,
      chambers: layout.meta.chamberCount,
      rooms: layout.rooms.map((r) => r.poolRoomId ?? r.id),
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
if (!fixturesOnly) await writeFile(`${OUT_DIR}/index.json`, `${JSON.stringify(index, null, 2)}\n`, "utf8");

const emittedFixtures = metadataOnly
  ? []
  : fixtures.filter((fixture) => !onlySeeds || onlySeeds.has(fixture.seed));
console.log(
  fixturesOnly
    ? `wrote ${emittedFixtures.length} fixtures to ${OUT_DIR}`
    : metadataOnly
      ? `wrote registry.json + index.json to ${OUT_DIR}`
      : `wrote registry.json + ${emittedFixtures.length} fixtures + index.json to ${OUT_DIR}`,
);
for (const f of emittedFixtures) {
  console.log(`  ${f.file}: ${f.chambers} chambers (${f.label}) placements=${f.placements} boss=${f.bossPattern}`);
}
