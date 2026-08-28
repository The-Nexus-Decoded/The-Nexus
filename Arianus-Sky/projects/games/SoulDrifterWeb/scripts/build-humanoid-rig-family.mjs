#!/usr/bin/env node

/** Build and independently audit the complete 12-body humanoid rig family. */

import { spawn } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BLENDER =
  "H:/CodexData/Tools/Blender-4.5-LTS/portable/blender-4.5.12-windows-x64/blender.exe";
const INTAKE =
  "H:/Projects/AI_Tools_And_Information/The-Nexus-asset-intake/SoulDrifter/issue-448/technicalized-pilots";
const BODY_BATCH = `${INTAKE}/humanoid-bodies-v001/humanoid-body-technicalization-batch-v001.json`;
const BODY_ROOT = `${INTAKE}/humanoid-bodies-v001`;
const OUTPUT_ROOT = `${INTAKE}/humanoid-rigs-v001`;
const CANONICAL = "public/assets/3d/characters/human-shadowknight/human-shadowknight.glb";

const ANCHORS = {
  "body-human-masculine-heavy-v001": `${INTAKE}/full-finger-rigs-v001/body-human-masculine-heavy-v001-full-fingers-v002.fbx`,
  "body-human-feminine-heavy-v001": `${INTAKE}/full-finger-rigs-v001/body-human-feminine-heavy-v001-full-fingers-v002.fbx`,
  "body-dwarf-masculine-heavy-v001": `${INTAKE}/full-finger-rigs-v001/body-dwarf-masculine-heavy-v001-full-fingers-v002.fbx`,
  "body-dwarf-feminine-heavy-v001": `${OUTPUT_ROOT}/body-dwarf-feminine-heavy-v001-rigged-v006.fbx`,
};

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

async function runAndExpect(command, args, expectedPaths) {
  for (const expectedPath of expectedPaths) {
    await rm(expectedPath, { force: true });
  }
  await run(command, args);
  for (const expectedPath of expectedPaths) {
    await access(expectedPath);
  }
}

function templateFor(asset) {
  if (asset.ancestry === "halfling") {
    return asset.presentation === "feminine"
      ? ANCHORS["body-dwarf-feminine-heavy-v001"]
      : ANCHORS["body-dwarf-masculine-heavy-v001"];
  }
  return asset.presentation === "feminine"
    ? ANCHORS["body-human-feminine-heavy-v001"]
    : ANCHORS["body-human-masculine-heavy-v001"];
}

async function audit(assetId, source) {
  const auditRoot = path.join(OUTPUT_ROOT, "audits", assetId);
  await mkdir(auditRoot, { recursive: true });
  const reportPath = path.join(auditRoot, `${assetId}-rig-audit.json`);
  await runAndExpect(BLENDER, [
    "--background",
    "--python",
    "scripts/audit-mixamo-rig.py",
    "--",
    "--input",
    source,
    "--output-dir",
    auditRoot,
    "--label",
    assetId,
    "--resolution",
    "512",
  ], [reportPath]);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  if (!report.structuralPass) {
    throw new Error(`${assetId} failed structural audit: ${reportPath}`);
  }
  return { reportPath, report };
}

async function main() {
  const bodyBatch = JSON.parse(await readFile(BODY_BATCH, "utf8"));
  const outputs = new Map(bodyBatch.outputs.map((asset) => [asset.assetId, asset]));
  await mkdir(OUTPUT_ROOT, { recursive: true });

  const buildAssets = bodyBatch.outputs.filter((asset) => !ANCHORS[asset.assetId]);
  for (const [index, asset] of buildAssets.entries()) {
    const assetRoot = path.join(OUTPUT_ROOT, asset.assetId);
    const stage = path.join(assetRoot, `${asset.assetId}-template-bind-stage-v001.fbx`);
    const stageReport = path.join(assetRoot, `${asset.assetId}-template-bind-stage-v001.json`);
    const final = path.join(assetRoot, `${asset.assetId}-rigged-v001.fbx`);
    const finalReport = path.join(assetRoot, `${asset.assetId}-rigged-v001.json`);
    await mkdir(assetRoot, { recursive: true });
    console.log(`\n[${index + 1}/${buildAssets.length}] binding ${asset.assetId}`);
    const bodySource = path.join(BODY_ROOT, asset.assetId, asset.output.file);
    await runAndExpect(BLENDER, [
      "--background",
      "--python",
      "scripts/bind-humanoid-to-template-rig.py",
      "--",
      "--input",
      bodySource,
      "--template",
      templateFor(asset),
      "--output",
      stage,
      "--report",
      stageReport,
      "--asset-id",
      asset.assetId,
    ], [stage, stageReport]);
    await runAndExpect(BLENDER, [
      "--background",
      "--python",
      "scripts/repair-mixamo-full-finger-rig.py",
      "--",
      "--input",
      stage,
      "--canonical",
      CANONICAL,
      "--output",
      final,
      "--report",
      finalReport,
    ], [final, finalReport]);
    ANCHORS[asset.assetId] = final;
  }

  const family = [];
  const allIds = [
    ...Object.keys(ANCHORS).filter((id) => outputs.has(id) || id === "body-human-masculine-heavy-v001"),
  ].sort();
  for (const [index, assetId] of allIds.entries()) {
    console.log(`\n[audit ${index + 1}/${allIds.length}] ${assetId}`);
    const { reportPath, report } = await audit(assetId, ANCHORS[assetId]);
    const source = outputs.get(assetId);
    family.push({
      assetId,
      ancestry: source?.ancestry ?? "human",
      presentation: source?.presentation ?? "masculine",
      bodyProfile: source?.bodyProfile ?? "heavy",
      riggedFbx: ANCHORS[assetId],
      riggedSha256: report.sourceSha256,
      audit: reportPath,
      bones: report.bones,
      missingFingerBones: report.missingFingerBones,
      missingWeightedFingerBones: report.missingWeightedFingerBones,
      structuralPass: report.structuralPass,
      runtimePromotionAllowed: false,
    });
  }

  if (family.length !== 12 || family.some((item) => !item.structuralPass)) {
    throw new Error(`Expected 12 passing humanoid rigs; found ${family.length}`);
  }
  const manifest = {
    schemaVersion: 1,
    issue: 448,
    generatedAt: new Date().toISOString(),
    recipe: "scripts/build-humanoid-rig-family.mjs",
    outputCount: family.length,
    structuralPass: true,
    visualDeformationReviewRequired: true,
    runtimePromotionAllowed: false,
    outputs: family,
  };
  const manifestPath = path.join(OUTPUT_ROOT, "humanoid-rig-family-v001.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nComplete: ${manifestPath}`);
}

await main();
