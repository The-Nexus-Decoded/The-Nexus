#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildBreachV2Layout } from "../src/game/dungeons/breach-v2-layout.ts";
import { DUNGEON_PROP_ASSETS } from "../src/game/environment/DungeonPropCatalog.ts";
import { renderBreachV2TopologySvg } from "../src/game/dungeons/breach-v2-topology.ts";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..");

function usage() {
  console.log(`Export the SEA topology-gate record and CAD-style plan for First Breach.

Usage:
  node --experimental-strip-types scripts/export-breach-v2-topology.mjs [options]

Options:
  --seed <integer>             Deterministic seed (default: 4182)
  --path <wayfarer|oathbreaker|both>
                               Route to export (default: both)
  --out-dir <directory>        Artifact directory (default: artifacts/topology)
  --help                       Show this help
`);
}

function valueAfter(args, flag, fallback) {
  const index = args.indexOf(flag);
  if (index < 0) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

const args = process.argv.slice(2);
if (args.includes("--help")) {
  usage();
  process.exit(0);
}

const seed = Number(valueAfter(args, "--seed", "4182"));
if (!Number.isSafeInteger(seed)) throw new Error("--seed must be a safe integer");
const requestedPath = valueAfter(args, "--path", "both");
if (!["wayfarer", "oathbreaker", "both"].includes(requestedPath)) {
  throw new Error("--path must be wayfarer, oathbreaker, or both");
}
const outDir = path.resolve(PROJECT_ROOT, valueAfter(args, "--out-dir", "artifacts/topology"));
const pathIds = requestedPath === "both" ? ["wayfarer", "oathbreaker"] : [requestedPath];
const commit = (() => {
  try {
    const head = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const worktreeStatus = execFileSync("git", ["status", "--porcelain"], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return worktreeStatus ? `WORKTREE@${head}` : head;
  } catch {
    return "WORKTREE";
  }
})();

await mkdir(outDir, { recursive: true });
const results = [];
for (const pathId of pathIds) {
  const layout = buildBreachV2Layout(seed, pathId, DUNGEON_PROP_ASSETS);
  const stem = `breach-v2-seed-${seed}-${pathId}-topology`;
  const svgPath = path.join(outDir, `${stem}.svg`);
  const jsonPath = path.join(outDir, `${stem}.json`);
  const relativeSvgPath = path.relative(PROJECT_ROOT, svgPath).replaceAll("\\", "/");
  const manifest = {
    ...layout.topology,
    commit,
    topDownDiagnostic: {
      ...layout.topology.topDownDiagnostic,
      imagePath: relativeSvgPath,
    },
  };
  await writeFile(svgPath, renderBreachV2TopologySvg(manifest), "utf8");
  await writeFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  results.push({
    pathId,
    automatedGate: manifest.automatedGate,
    metrics: manifest.metrics,
    jsonPath,
    svgPath,
  });
}

console.log(JSON.stringify({ seed, commit, results }, null, 2));
if (results.some((result) => result.automatedGate !== "PASS")) process.exitCode = 1;
