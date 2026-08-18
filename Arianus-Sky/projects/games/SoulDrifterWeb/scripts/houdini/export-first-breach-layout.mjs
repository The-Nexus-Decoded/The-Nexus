#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { generateSoulwellDungeon } from "../../src/game/dungeon.ts";

const DEFAULT_SEED = 2215682322;
const seed = Number(process.argv[2] ?? DEFAULT_SEED);
const outputPath = process.argv[3] ? resolve(process.argv[3]) : null;

if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
  throw new Error(`Seed must be an unsigned 32-bit integer; received ${process.argv[2]}.`);
}
if (!outputPath) {
  throw new Error("Usage: node --experimental-strip-types export-first-breach-layout.mjs [seed] <output.json>");
}

const modelReferences = {
  gameplay: {
    player: "assets/3d/characters/human-shadowknight/human-shadowknight.glb",
    breachling: "assets/3d/characters/enemy-breachling.gltf",
    miniboss: "assets/3d/characters/paladin.gltf",
    npcs: {
      ilyra: "assets/3d/characters/npc-ilyra.gltf",
      orren: "assets/3d/characters/npc-orren.gltf",
      brannoc: "assets/3d/characters/npc-brannoc.gltf",
    },
  },
  library: {
    warrior: "assets/3d/characters/warrior.gltf",
    mage: "assets/3d/characters/mage.gltf",
    priest: "assets/3d/characters/priest.gltf",
    sharpshooter: "assets/3d/characters/sharpshooter.gltf",
    paladin: "assets/3d/characters/paladin.gltf",
    summoner: "assets/3d/characters/summoner.gltf",
    asura: "assets/3d/characters/asura.gltf",
    slayer: "assets/3d/characters/slayer.gltf",
    shadowknight: "assets/3d/characters/shadowknight.gltf",
    elfShadowknight: "assets/3d/characters/elf-shadowknight-v2/elf-shadowknight-v2.glb",
    humanShadowknight: "assets/3d/characters/human-shadowknight/human-shadowknight.glb",
  },
};

const payload = {
  schemaVersion: 1,
  source: "src/game/dungeon.ts#generateSoulwellDungeon",
  seed,
  tileSize: 1.75,
  floorHeight: 0.22,
  dungeon: generateSoulwellDungeon(seed),
  modelReferences,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  outputPath,
  seed,
  tiles: payload.dungeon.tiles.length,
  props: payload.dungeon.props.length,
  npcs: payload.dungeon.npcs.length,
  enemies: payload.dungeon.enemies.length,
  libraryModels: Object.keys(modelReferences.library).length,
}));
