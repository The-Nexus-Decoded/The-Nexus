#!/usr/bin/env node

/**
 * Build deterministic local visual-topology derivatives for every accepted
 * issue-448 humanoid body anchor. Provider sources and generated derivatives
 * remain outside the shipping tree; the resulting batch manifest records the
 * exact source lineage and ancestry-appropriate production scale.
 */

import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_BLENDER =
  "H:/CodexData/.codex/tmp/blender-4.5.12-portable/blender-4.5.12-windows-x64/blender.exe";
const DEFAULT_SOURCE_ROOT =
  "H:/Projects/AI_Tools_And_Information/The-Nexus-asset-intake/SoulDrifter/issue-448/body-anchors/untouched";
const DEFAULT_OUTPUT_ROOT =
  "H:/Projects/AI_Tools_And_Information/The-Nexus-asset-intake/SoulDrifter/issue-448/technicalized-pilots/humanoid-bodies-v001";
const ACCEPTED_REFERENCE_ID = "body-human-masculine-heavy-v001";

const HEIGHTS_METERS = {
  "human/masculine": 1.82,
  "human/feminine": 1.72,
  "elf/masculine": 1.88,
  "elf/feminine": 1.78,
  "dwarf/masculine": 1.42,
  "dwarf/feminine": 1.34,
  "halfling/masculine": 1.1,
  "halfling/feminine": 1.04,
};

function parseArgs(argv) {
  const result = {
    blender: process.env.BLENDER_BIN ?? DEFAULT_BLENDER,
    manifest: null,
    sourceRoot: DEFAULT_SOURCE_ROOT,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    script: null,
    includeReference: false,
    force: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--include-reference") result.includeReference = true;
    else if (key === "--force") result.force = true;
    else if (key.startsWith("--")) {
      const value = argv[index + 1];
      if (!value) throw new Error(`Missing value for ${key}`);
      const property = key
        .slice(2)
        .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      result[property] = value;
      index += 1;
    }
  }
  if (!result.manifest) throw new Error("--manifest is required");
  if (!result.script) throw new Error("--script is required");
  return result;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(command)} exited with code ${code}`));
    });
  });
}

async function validCachedAudit(auditPath, outputPath, sourceSha256) {
  if (!(await exists(auditPath)) || !(await exists(outputPath))) return false;
  try {
    const audit = JSON.parse(await readFile(auditPath, "utf8"));
    return audit.parentSource?.sha256 === sourceSha256;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = path.resolve(args.manifest);
  const sourceRoot = path.resolve(args.sourceRoot);
  const outputRoot = path.resolve(args.outputRoot);
  const blender = path.resolve(args.blender);
  const builderScript = path.resolve(args.script);
  await Promise.all([access(blender), access(builderScript), access(manifestPath), mkdir(outputRoot, { recursive: true })]);

  const sourceManifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const selected = sourceManifest.artifacts.filter(
    (asset) => args.includeReference || asset.assetId !== ACCEPTED_REFERENCE_ID,
  );
  const outputs = [];

  for (const [index, asset] of selected.entries()) {
    const heightKey = `${asset.ancestry}/${asset.presentation}`;
    const targetHeight = HEIGHTS_METERS[heightKey];
    if (!targetHeight) throw new Error(`Missing height contract for ${heightKey}`);

    const source = path.join(sourceRoot, asset.untouchedGlb.file);
    const assetRoot = path.join(outputRoot, asset.assetId);
    const stem = asset.untouchedGlb.file.replace(/\.glb$/i, "-local-retopo-v001");
    const output = path.join(assetRoot, `${stem}.glb`);
    const audit = path.join(assetRoot, `${stem}.audit.json`);
    const preview = path.join(assetRoot, `${stem}.preview.png`);
    await mkdir(assetRoot, { recursive: true });

    console.log(`\n[${index + 1}/${selected.length}] ${asset.assetId} (${targetHeight.toFixed(2)} m)`);
    if (!args.force && (await validCachedAudit(audit, output, asset.untouchedGlb.sha256))) {
      console.log("  cached derivative matches source hash; skipping rebuild");
    } else {
      await run(blender, [
        "--background",
        "--python",
        builderScript,
        "--",
        "--input",
        source,
        "--output",
        output,
        "--audit",
        audit,
        "--preview",
        preview,
        "--asset-id",
        `${asset.assetId}-local-retopo-v001`,
        "--source-task-id",
        asset.taskId,
        "--expected-source-sha256",
        asset.untouchedGlb.sha256,
        "--intended-runtime-slot",
        `character-body/${asset.ancestry}/${asset.presentation}/${asset.bodyProfile}`,
        "--target-height-meters",
        String(targetHeight),
        "--target-triangles",
        "45000",
      ]);
    }

    const builtAudit = JSON.parse(await readFile(audit, "utf8"));
    outputs.push({
      assetId: asset.assetId,
      ancestry: asset.ancestry,
      presentation: asset.presentation,
      bodyProfile: asset.bodyProfile,
      targetHeightMeters: targetHeight,
      sourceSha256: asset.untouchedGlb.sha256,
      output: builtAudit.output,
      intendedRuntimeSlot: builtAudit.intendedRuntimeSlot,
      runtimePromotionAllowed: false,
    });
  }

  const batch = {
    schemaVersion: 1,
    issue: 448,
    generatedAt: new Date().toISOString(),
    recipe: "scripts/technicalize-humanoid-family.mjs",
    builder: "scripts/build-humanoid-retopo-pilot.py",
    acceptedReferenceExcluded: !args.includeReference,
    acceptedReferenceAssetId: ACCEPTED_REFERENCE_ID,
    outputCount: outputs.length,
    outputs,
  };
  const batchPath = path.join(outputRoot, "humanoid-body-technicalization-batch-v001.json");
  await writeFile(batchPath, `${JSON.stringify(batch, null, 2)}\n`);
  console.log(`\nCompleted ${outputs.length} body derivatives.`);
  console.log(batchPath);
}

await main();
