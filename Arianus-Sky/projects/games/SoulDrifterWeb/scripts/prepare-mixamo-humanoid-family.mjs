#!/usr/bin/env node

/**
 * Prepare hash-verified FBX intake packages for the individually fitted
 * issue-448 humanoid body rigs. Outputs stay outside the repository and are
 * intentionally unrigged until each anatomy receives its own Mixamo bind.
 */

import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_BLENDER =
  "H:/CodexData/.codex/tmp/blender-4.5.12-portable/blender-4.5.12-windows-x64/blender.exe";
const DEFAULT_SOURCE_ROOT =
  "H:/Projects/AI_Tools_And_Information/The-Nexus-asset-intake/SoulDrifter/issue-448/technicalized-pilots/humanoid-bodies-v001";
const DEFAULT_OUTPUT_ROOT =
  "H:/Projects/AI_Tools_And_Information/The-Nexus-asset-intake/SoulDrifter/issue-448/mixamo-intake/humanoid-bodies-v001";

function parseArgs(argv) {
  const result = {
    blender: process.env.BLENDER_BIN ?? DEFAULT_BLENDER,
    manifest: null,
    sourceRoot: DEFAULT_SOURCE_ROOT,
    outputRoot: DEFAULT_OUTPUT_ROOT,
    script: null,
    assetIds: null,
    force: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--force") result.force = true;
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

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", windowsHide: true });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(command)} exited with code ${code}`));
    });
  });
}

async function cachedAuditMatches(auditPath, sourceSha256) {
  try {
    const audit = JSON.parse(await readFile(auditPath, "utf8"));
    return audit.parentSource?.sha256 === sourceSha256 && audit.output?.sha256;
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
  const intakeScript = path.resolve(args.script);
  await Promise.all([
    access(blender),
    access(intakeScript),
    access(manifestPath),
    mkdir(outputRoot, { recursive: true }),
  ]);

  const technicalized = JSON.parse(await readFile(manifestPath, "utf8"));
  const selectedIds = args.assetIds
    ? new Set(args.assetIds.split(",").map((value) => value.trim()).filter(Boolean))
    : null;
  const selected = technicalized.outputs.filter(
    (asset) => !selectedIds || selectedIds.has(asset.assetId),
  );
  if (selectedIds && selected.length !== selectedIds.size) {
    const found = new Set(selected.map((asset) => asset.assetId));
    const missing = [...selectedIds].filter((assetId) => !found.has(assetId));
    throw new Error(`Unknown asset ids: ${missing.join(", ")}`);
  }

  const outputs = [];
  for (const [index, asset] of selected.entries()) {
    const source = path.join(sourceRoot, asset.assetId, asset.output.file);
    const intakeAssetId = `${asset.assetId}-mixamo-intake-v001`;
    const assetRoot = path.join(outputRoot, asset.assetId);
    const output = path.join(assetRoot, `${intakeAssetId}.fbx`);
    const audit = path.join(assetRoot, `${intakeAssetId}.audit.json`);
    const preview = path.join(assetRoot, `${intakeAssetId}.preview.png`);
    await Promise.all([access(source), mkdir(assetRoot, { recursive: true })]);

    console.log(`\n[${index + 1}/${selected.length}] ${asset.assetId}`);
    if (!args.force && (await cachedAuditMatches(audit, asset.output.sha256))) {
      console.log("  cached intake matches derivative hash; skipping rebuild");
    } else {
      await run(blender, [
        "--background",
        "--python",
        intakeScript,
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
        intakeAssetId,
        "--parent-asset-id",
        `${asset.assetId}-local-retopo-v001`,
        "--expected-source-sha256",
        asset.output.sha256,
        "--yaw-degrees",
        "-90",
      ]);
    }

    const builtAudit = JSON.parse(await readFile(audit, "utf8"));
    outputs.push({
      assetId: asset.assetId,
      ancestry: asset.ancestry,
      presentation: asset.presentation,
      bodyProfile: asset.bodyProfile,
      intendedRuntimeSlot: asset.intendedRuntimeSlot,
      parentSha256: asset.output.sha256,
      intake: builtAudit.output,
      externalUploadState: builtAudit.externalUploadState,
      runtimePromotionAllowed: false,
    });
  }

  const batch = {
    schemaVersion: 1,
    issue: 448,
    generatedAt: new Date().toISOString(),
    recipe: "scripts/prepare-mixamo-humanoid-family.mjs",
    builder: "scripts/prepare-mixamo-intake.py",
    outputCount: outputs.length,
    outputs,
  };
  const batchPath = path.join(outputRoot, "humanoid-mixamo-intake-batch-v001.json");
  await writeFile(batchPath, `${JSON.stringify(batch, null, 2)}\n`);
  console.log(`\nPrepared ${outputs.length} humanoid Mixamo intake packages.`);
  console.log(batchPath);
}

await main();
