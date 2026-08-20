#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const input = option("--input");
const output = option("--output");
if (!input || !output) {
  throw new Error("Usage: node scripts/build-mixamo-death-ledger.mjs --input <catalog.json> --output <ledger.json>");
}

const source = JSON.parse(await readFile(input, "utf8"));
const products = Array.isArray(source) ? source : source.products;
if (!Array.isArray(products)) throw new Error("Mixamo catalog must contain a products array.");

const DEATH_PATTERN = /\b(?:death|dying|die|killed|dead|electrocuted)\b/i;

function textOf(product) {
  return `${product.name ?? ""} ${product.description ?? ""}`.trim();
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 54);
}

function direction(text) {
  if (/\b(?:left|left side)\b/i.test(text)) return "left";
  if (/\b(?:right|right side)\b/i.test(text)) return "right";
  if (/\b(?:back|backward|backwards|behind)\b/i.test(text)) return "backward";
  if (/\b(?:front|forward|forwards)\b/i.test(text)) return "forward";
  return "unspecified";
}

function posture(text) {
  if (/\bcrouch/i.test(text)) return "crouched";
  if (/\b(?:prone|laying|ground)\b/i.test(text)) return "grounded";
  if (/\brun(?:ning)?\b/i.test(text)) return "running";
  if (/\bwalk(?:ing)?\b/i.test(text)) return "walking";
  return "standing";
}

function damageType(text) {
  if (/electrocut/i.test(text)) return "electric";
  if (/explosion|flying back/i.test(text)) return "explosive-knockback";
  if (/headshot|shot|rifle|bow/i.test(text)) return "projectile";
  if (/sword|shield/i.test(text)) return "weapon-melee";
  if (/zombie|mutant/i.test(text)) return "creature-physical";
  return "physical";
}

function weaponFamily(text) {
  if (/sword and shield/i.test(text)) return "sword-shield";
  if (/two handed sword|great ?sword/i.test(text)) return "greatsword";
  if (/\bbow\b/i.test(text)) return "bow";
  if (/\brifle\b/i.test(text)) return "rifle-source";
  return "unarmed-or-any";
}

const unique = new Map();
for (const product of products) {
  if (product.type !== "Motion" || !DEATH_PATTERN.test(textOf(product))) continue;
  const id = product.motion_id ?? product.id;
  if (!id || unique.has(id)) continue;
  unique.set(id, product);
}

const motions = [...unique.values()]
  .map((product) => {
    const id = product.motion_id ?? product.id;
    const text = textOf(product);
    return {
      actionId: `death.mixamo.${slug(product.name || "death")}-${id.slice(0, 8)}`,
      mixamoId: id,
      displayName: product.name,
      description: product.description,
      genre: product.genres || null,
      situation: {
        direction: direction(text),
        posture: posture(text),
        damageType: damageType(text),
        weaponFamily: weaponFamily(text),
      },
      acquisition: {
        state: "cataloged-not-downloaded",
        format: "FBX Binary",
        skin: "Without Skin",
        fps: 30,
        keyframeReduction: "none",
      },
      runtime: {
        state: "candidate",
        terminal: true,
        randomPool: `death.${posture(text)}.${direction(text)}`,
        avoidImmediateRepeat: true,
      },
    };
  })
  .sort((a, b) => a.actionId.localeCompare(b.actionId));

const ledger = {
  schemaVersion: 1,
  issue: 448,
  sourceCatalog: path.basename(input),
  sourceCapturedAt: source.capturedAt ?? null,
  generatedAt: new Date().toISOString(),
  uniqueDeathMotionCount: motions.length,
  selectionPolicy: {
    match: ["posture", "direction", "damageType", "weaponFamily"],
    fallbackOrder: ["weaponFamily", "damageType", "direction", "posture"],
    randomizeWithinMostSpecificValidPool: true,
    avoidImmediateRepeat: true,
  },
  motions,
};

await writeFile(output, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, uniqueDeathMotionCount: motions.length }, null, 2));
