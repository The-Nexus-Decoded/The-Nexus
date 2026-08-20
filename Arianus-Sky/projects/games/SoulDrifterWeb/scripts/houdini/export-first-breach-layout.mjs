#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { generateSoulwellDungeon } from "../../src/game/dungeon.ts";
import { DUNGEON_PROP_ASSETS } from "../../src/game/environment/DungeonPropCatalog.ts";

const DEFAULT_SEED = 2215682322;
const seed = Number(process.argv[2] ?? DEFAULT_SEED);
const outputPath = process.argv[3] ? resolve(process.argv[3]) : null;

if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
  throw new Error(`Seed must be an unsigned 32-bit integer; received ${process.argv[2]}.`);
}
if (!outputPath) {
  throw new Error("Usage: node --experimental-strip-types export-first-breach-layout.mjs [seed] <output.json>");
}

const COMPLETE_KIT_ROOM = {
  "archive-bookshelf": "training",
  "archive-cupboard": "training",
  "storage-chest": "training",
  "reinforced-crate": "training",
  "storage-barrel": "training",
  "trestle-table": "training",
  "heavy-bench": "training",
  "high-backed-chair": "training",
  "empty-weapon-rack": "training",
  "wall-torch-sconce": "training",
  "floor-brazier": "training",
  "hanging-brazier": "training",
  "heavy-door": "training",
  "rusted-portcullis": "training",
  "candelabra-cluster": "training",
  "bottles-jugs-crockery-cluster": "training",
  "cave-in-rubble": "skirmish",
  "masonry-barricade": "skirmish",
  "bone-pile": "skirmish",
  "chain-shackle": "skirmish",
  "false-wall-panel": "skirmish",
  "supply-pile": "skirmish",
  "corruption-growth": "skirmish",
  "ruined-stone-archway": "skirmish",
  "wooden-support-brace": "skirmish",
  "iron-floor-grate": "skirmish",
  "collapsed-timber-masonry-pile": "skirmish",
  "hanging-iron-cage": "skirmish",
  "weapon-armor-heap": "skirmish",
  "broken-handcart": "skirmish",
  "monster-egg-nest": "skirmish",
  "cocooned-remains-web-mass": "skirmish",
  "shed-chitin-pile": "skirmish",
  "burrowed-wall-breach-plug": "skirmish",
  "ruined-altar": "boss",
  "guardian-statue": "boss",
  "reliquary-wall-alcove": "boss",
  "broken-stone-stair-dais": "boss",
};

const LIGHTING_FIXTURE_QUOTAS = {
  training: {
    "wall-torch-sconce": 5,
    "floor-brazier": 2,
    "hanging-brazier": 2,
  },
  skirmish: {
    "wall-torch-sconce": 8,
    "floor-brazier": 3,
    "hanging-brazier": 3,
  },
  boss: {
    "wall-torch-sconce": 4,
    "floor-brazier": 4,
    "hanging-brazier": 2,
  },
};

function pointKey(point) {
  return `${point.x},${point.y}`;
}

function boundaryRotation(dx, dy) {
  if (dx < 0) return 0;
  if (dx > 0) return Math.PI;
  return dy > 0 ? Math.PI / 2 : -Math.PI / 2;
}

function placementScore(assetId, candidate) {
  let value = (seed ^ Math.imul(candidate.x, 0x1f123bb5) ^ Math.imul(candidate.y, 0x5f356495)) >>> 0;
  for (const character of assetId) value = Math.imul(value ^ character.charCodeAt(0), 0x45d9f3b) >>> 0;
  return value;
}

function completeHoudiniComposition(sourceDungeon) {
  const props = sourceDungeon.props.map((prop) => {
    if (prop.id === "gate-wayfarer") {
      return { ...prop, assetId: "rusted-portcullis", offsetX: 0.49, offsetY: 0, rotationY: Math.PI };
    }
    if (prop.id === "gate-oathbreaker") {
      return { ...prop, assetId: "heavy-door", offsetX: 0.49, offsetY: 0, rotationY: Math.PI };
    }
    if (prop.id === "starter-coffer") {
      return { ...prop, assetId: "storage-chest", offsetX: 0, offsetY: 0 };
    }
    if (prop.id === "training-effigy") {
      return { ...prop, assetId: "guardian-statue", offsetX: 0, offsetY: 0 };
    }
    if (prop.id === "memory-loom") {
      return { ...prop, assetId: "ruined-altar", offsetX: 0, offsetY: 0 };
    }
    if (prop.assetId) {
      const spec = DUNGEON_PROP_ASSETS[prop.assetId];
      if (spec.placement === "floor") return { ...prop, offsetX: 0, offsetY: 0 };
      if (spec.placement === "wall" && (prop.offsetX || prop.offsetY)) {
        return {
          ...prop,
          rotationY: boundaryRotation(Math.sign(prop.offsetX ?? 0), Math.sign(prop.offsetY ?? 0)),
        };
      }
    }
    return prop;
  });
  const missingAssetIds = Object.keys(DUNGEON_PROP_ASSETS).filter((assetId) => !props.some(
    (prop) => prop.assetId === assetId && prop.roomId === COMPLETE_KIT_ROOM[assetId],
  ));
  const unexpectedMissing = missingAssetIds.filter((assetId) => !(assetId in COMPLETE_KIT_ROOM));
  if (unexpectedMissing.length > 0) {
    throw new Error(`Houdini composition has no semantic room assignment for: ${unexpectedMissing.join(", ")}`);
  }

  const dungeonTileKeys = new Set(sourceDungeon.tiles.map(pointKey));
  const reserved = new Set([
    ...props,
    ...sourceDungeon.npcs,
    ...sourceDungeon.enemies,
    ...sourceDungeon.blockedTiles,
    sourceDungeon.playerStart,
  ].map(pointKey));
  const well = props.find((prop) => prop.id === "well");
  const directions = [
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
  ];

  for (const assetId of missingAssetIds) {
    const spec = DUNGEON_PROP_ASSETS[assetId];
    const roomId = COMPLETE_KIT_ROOM[assetId];
    const candidates = sourceDungeon.tiles
      .filter((tile) => tile.roomId === roomId && !reserved.has(pointKey(tile)))
      .filter((tile) => roomId !== "training" || !well || Math.abs(tile.x - well.x) + Math.abs(tile.y - well.y) >= 5)
      .flatMap((tile) => directions
        .filter(({ dx, dy }) => !dungeonTileKeys.has(pointKey({ x: tile.x + dx, y: tile.y + dy })))
        .map(({ dx, dy }) => ({ x: tile.x, y: tile.y, dx, dy })))
      .sort((left, right) => {
        const leftVisibility = left.dy < 0 || left.dx > 0 ? 0 : 1;
        const rightVisibility = right.dy < 0 || right.dx > 0 ? 0 : 1;
        return leftVisibility - rightVisibility || placementScore(assetId, left) - placementScore(assetId, right);
      });
    const candidate = candidates[0];
    if (!candidate) throw new Error(`Unable to place complete-kit asset ${assetId} in ${roomId}.`);
    reserved.add(pointKey(candidate));
    const edgeOffset = spec.placement === "wall" ? 0.42 : spec.placement === "ceiling" ? 0.12 : 0;
    const score = placementScore(assetId, candidate);
    props.push({
      id: `houdini-complete-${assetId}`,
      kind: spec.kind,
      roomId,
      blocksMovement: spec.blocksMovement,
      assetId,
      x: candidate.x,
      y: candidate.y,
      offsetX: candidate.dx * edgeOffset,
      offsetY: candidate.dy * edgeOffset,
      rotationY: boundaryRotation(candidate.dx, candidate.dy) + (spec.placement === "wall" ? 0 : ((score / 0xffff_ffff) - 0.5) * 0.16),
    });
  }

  for (const [roomId, quotas] of Object.entries(LIGHTING_FIXTURE_QUOTAS)) {
    for (const [assetId, targetCount] of Object.entries(quotas)) {
      const spec = DUNGEON_PROP_ASSETS[assetId];
      let currentCount = props.filter((prop) => prop.roomId === roomId && prop.assetId === assetId).length;
      while (currentCount < targetCount) {
        const existingLights = props.filter((prop) => {
          const propSpec = prop.assetId ? DUNGEON_PROP_ASSETS[prop.assetId] : null;
          return prop.roomId === roomId && propSpec?.fireAnchorY != null;
        });
        const candidates = sourceDungeon.tiles
          .filter((tile) => tile.roomId === roomId && !reserved.has(pointKey(tile)))
          .filter((tile) => roomId !== "training" || !well || Math.abs(tile.x - well.x) + Math.abs(tile.y - well.y) >= 4)
          .flatMap((tile) => directions
            .filter(({ dx, dy }) => !dungeonTileKeys.has(pointKey({ x: tile.x + dx, y: tile.y + dy })))
            .map(({ dx, dy }) => ({ x: tile.x, y: tile.y, dx, dy })))
          .sort((left, right) => {
            const lightSeparation = (candidate) => existingLights.length === 0
              ? Number.POSITIVE_INFINITY
              : Math.min(...existingLights.map((light) => Math.abs(candidate.x - light.x) + Math.abs(candidate.y - light.y)));
            const separationDifference = lightSeparation(right) - lightSeparation(left);
            const leftVisibility = left.dy < 0 || left.dx > 0 ? 0 : 1;
            const rightVisibility = right.dy < 0 || right.dx > 0 ? 0 : 1;
            return separationDifference || leftVisibility - rightVisibility || placementScore(`${assetId}-${currentCount}`, left) - placementScore(`${assetId}-${currentCount}`, right);
          });
        const candidate = candidates[0];
        if (!candidate) throw new Error(`Unable to place ${assetId} lighting fixture ${currentCount + 1}/${targetCount} in ${roomId}.`);
        reserved.add(pointKey(candidate));
        const edgeOffset = spec.placement === "wall" ? 0.42 : spec.placement === "ceiling" ? 0.12 : 0;
        const score = placementScore(`${assetId}-${currentCount}`, candidate);
        props.push({
          id: `houdini-light-${roomId}-${assetId}-${currentCount}`,
          kind: spec.kind,
          roomId,
          blocksMovement: spec.blocksMovement,
          assetId,
          x: candidate.x,
          y: candidate.y,
          offsetX: candidate.dx * edgeOffset,
          offsetY: candidate.dy * edgeOffset,
          rotationY: boundaryRotation(candidate.dx, candidate.dy) + (spec.placement === "wall" ? 0 : ((score / 0xffff_ffff) - 0.5) * 0.16),
        });
        currentCount += 1;
      }
    }
  }

  return { ...sourceDungeon, props };
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
  dungeon: completeHoudiniComposition(generateSoulwellDungeon(seed)),
  environmentAssets: DUNGEON_PROP_ASSETS,
  modelReferences,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  outputPath,
  seed,
  tiles: payload.dungeon.tiles.length,
  props: payload.dungeon.props.length,
  environmentAssets: Object.keys(payload.environmentAssets).length,
  uniqueEnvironmentAssets: new Set(payload.dungeon.props.flatMap((prop) => prop.assetId ? [prop.assetId] : [])).size,
  npcs: payload.dungeon.npcs.length,
  enemies: payload.dungeon.enemies.length,
  libraryModels: Object.keys(modelReferences.library).length,
}));
