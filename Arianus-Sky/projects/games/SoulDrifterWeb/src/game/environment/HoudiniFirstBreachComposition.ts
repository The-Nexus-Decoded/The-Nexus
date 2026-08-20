import type { GridPoint } from "../types";
import type { DungeonProp, DungeonRoomKind, GeneratedDungeon } from "../dungeon";
import {
  DUNGEON_PROP_ASSET_IDS,
  DUNGEON_PROP_ASSETS,
  type DungeonPropAssetId,
} from "./DungeonPropCatalog";

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
} satisfies Record<DungeonPropAssetId, DungeonRoomKind>;

const LIGHTING_ASSET_IDS = ["wall-torch-sconce", "floor-brazier", "hanging-brazier"] as const;
type LightingAssetId = typeof LIGHTING_ASSET_IDS[number];

const LIGHTING_FIXTURE_QUOTAS: Record<DungeonRoomKind, Record<LightingAssetId, number>> = {
  training: { "wall-torch-sconce": 5, "floor-brazier": 2, "hanging-brazier": 2 },
  skirmish: { "wall-torch-sconce": 8, "floor-brazier": 3, "hanging-brazier": 3 },
  boss: { "wall-torch-sconce": 4, "floor-brazier": 4, "hanging-brazier": 2 },
};

interface BoundaryCandidate extends GridPoint {
  dx: number;
  dy: number;
}

const DIRECTIONS: readonly Pick<BoundaryCandidate, "dx" | "dy">[] = [
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
];

function pointKey(point: GridPoint): string {
  return `${point.x},${point.y}`;
}

function boundaryRotation(dx: number, dy: number): number {
  if (dx < 0) return 0;
  if (dx > 0) return Math.PI;
  return dy > 0 ? Math.PI / 2 : -Math.PI / 2;
}

function placementScore(seed: number, assetId: string, candidate: GridPoint): number {
  let value = (seed ^ Math.imul(candidate.x, 0x1f123bb5) ^ Math.imul(candidate.y, 0x5f356495)) >>> 0;
  for (const character of assetId) value = Math.imul(value ^ character.charCodeAt(0), 0x45d9f3b) >>> 0;
  return value;
}

function boundaryCandidates(sourceDungeon: GeneratedDungeon, reserved: ReadonlySet<string>): BoundaryCandidate[] {
  const dungeonTileKeys = new Set(sourceDungeon.tiles.map(pointKey));
  return sourceDungeon.tiles
    .filter((tile) => !reserved.has(pointKey(tile)))
    .flatMap((tile) => DIRECTIONS
      .filter(({ dx, dy }) => !dungeonTileKeys.has(pointKey({ x: tile.x + dx, y: tile.y + dy })))
      .map(({ dx, dy }) => ({ x: tile.x, y: tile.y, dx, dy })));
}

function lightSeparation(candidate: GridPoint, lights: readonly DungeonProp[]): number {
  if (lights.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...lights.map((light) => Math.abs(candidate.x - light.x) + Math.abs(candidate.y - light.y)));
}

/**
 * Applies the exact deterministic prop composition used to author the Houdini
 * Apprentice scene. The browser uses this locked translation so the QA review
 * renders the approved seed, complete asset kit, and fixture quotas.
 */
export function completeHoudiniFirstBreachComposition(sourceDungeon: GeneratedDungeon): GeneratedDungeon {
  const props: DungeonProp[] = sourceDungeon.props.map((prop): DungeonProp => {
    if (prop.id === "gate-wayfarer") {
      return { ...prop, assetId: "rusted-portcullis", offsetX: 0.49, offsetY: 0, rotationY: Math.PI };
    }
    if (prop.id === "gate-oathbreaker") {
      return { ...prop, assetId: "heavy-door", offsetX: 0.49, offsetY: 0, rotationY: Math.PI };
    }
    if (prop.id === "starter-coffer") return { ...prop, assetId: "storage-chest", offsetX: 0, offsetY: 0 };
    if (prop.id === "training-effigy") return { ...prop, assetId: "guardian-statue", offsetX: 0, offsetY: 0 };
    if (prop.id === "memory-loom") return { ...prop, assetId: "ruined-altar", offsetX: 0, offsetY: 0 };
    if (!prop.assetId) return prop;
    const spec = DUNGEON_PROP_ASSETS[prop.assetId];
    if (spec.placement === "floor") return { ...prop, offsetX: 0, offsetY: 0 };
    if (spec.placement === "wall" && (prop.offsetX || prop.offsetY)) {
      return {
        ...prop,
        rotationY: boundaryRotation(Math.sign(prop.offsetX ?? 0), Math.sign(prop.offsetY ?? 0)),
      };
    }
    return prop;
  });
  const missingAssetIds = DUNGEON_PROP_ASSET_IDS.filter((assetId) => !props.some(
    (prop) => prop.assetId === assetId && prop.roomId === COMPLETE_KIT_ROOM[assetId],
  ));
  const reserved = new Set([
    ...props,
    ...sourceDungeon.npcs,
    ...sourceDungeon.enemies,
    ...sourceDungeon.blockedTiles,
    sourceDungeon.playerStart,
  ].map(pointKey));
  const well = props.find((prop) => prop.id === "well");

  for (const assetId of missingAssetIds) {
    const spec = DUNGEON_PROP_ASSETS[assetId];
    const roomId = COMPLETE_KIT_ROOM[assetId];
    const candidates = boundaryCandidates(sourceDungeon, reserved)
      .filter((candidate) => sourceDungeon.tiles.some(
        (tile) => tile.x === candidate.x && tile.y === candidate.y && tile.roomId === roomId,
      ))
      .filter((candidate) => roomId !== "training" || !well
        || Math.abs(candidate.x - well.x) + Math.abs(candidate.y - well.y) >= 5)
      .sort((left, right) => {
        const leftVisibility = left.dy < 0 || left.dx > 0 ? 0 : 1;
        const rightVisibility = right.dy < 0 || right.dx > 0 ? 0 : 1;
        return leftVisibility - rightVisibility
          || placementScore(sourceDungeon.seed, assetId, left) - placementScore(sourceDungeon.seed, assetId, right);
      });
    const candidate = candidates[0];
    if (!candidate) throw new Error(`Unable to place complete-kit asset ${assetId} in ${roomId}.`);
    reserved.add(pointKey(candidate));
    const edgeOffset = spec.placement === "wall" ? 0.42 : spec.placement === "ceiling" ? 0.12 : 0;
    const score = placementScore(sourceDungeon.seed, assetId, candidate);
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
      rotationY: boundaryRotation(candidate.dx, candidate.dy)
        + (spec.placement === "wall" ? 0 : ((score / 0xffff_ffff) - 0.5) * 0.16),
    });
  }

  for (const roomId of ["training", "skirmish", "boss"] as const) {
    for (const assetId of LIGHTING_ASSET_IDS) {
      const spec = DUNGEON_PROP_ASSETS[assetId];
      const targetCount = LIGHTING_FIXTURE_QUOTAS[roomId][assetId];
      let currentCount = props.filter((prop) => prop.roomId === roomId && prop.assetId === assetId).length;
      while (currentCount < targetCount) {
        const existingLights = props.filter((prop) => prop.roomId === roomId
          && prop.assetId !== undefined
          && DUNGEON_PROP_ASSETS[prop.assetId].fireAnchorY !== undefined);
        const candidates = boundaryCandidates(sourceDungeon, reserved)
          .filter((candidate) => sourceDungeon.tiles.some(
            (tile) => tile.x === candidate.x && tile.y === candidate.y && tile.roomId === roomId,
          ))
          .filter((candidate) => roomId !== "training" || !well
            || Math.abs(candidate.x - well.x) + Math.abs(candidate.y - well.y) >= 4)
          .sort((left, right) => {
            const separationDifference = lightSeparation(right, existingLights) - lightSeparation(left, existingLights);
            const leftVisibility = left.dy < 0 || left.dx > 0 ? 0 : 1;
            const rightVisibility = right.dy < 0 || right.dx > 0 ? 0 : 1;
            const placementId = `${assetId}-${currentCount}`;
            return separationDifference || leftVisibility - rightVisibility
              || placementScore(sourceDungeon.seed, placementId, left) - placementScore(sourceDungeon.seed, placementId, right);
          });
        const candidate = candidates[0];
        if (!candidate) {
          throw new Error(`Unable to place ${assetId} lighting fixture ${currentCount + 1}/${targetCount} in ${roomId}.`);
        }
        reserved.add(pointKey(candidate));
        const edgeOffset = spec.placement === "wall" ? 0.42 : spec.placement === "ceiling" ? 0.12 : 0;
        const score = placementScore(sourceDungeon.seed, `${assetId}-${currentCount}`, candidate);
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
          rotationY: boundaryRotation(candidate.dx, candidate.dy)
            + (spec.placement === "wall" ? 0 : ((score / 0xffff_ffff) - 0.5) * 0.16),
        });
        currentCount += 1;
      }
    }
  }

  return { ...sourceDungeon, props };
}
