/**
 * BREACH-V2 dungeon preview — `?dungeonPreview=breach-v2&seed=4182&path=wayfarer&cam=vestibule`.
 *
 * True-3D indoor zone on the Heartvale preview pattern (owner ruling V15):
 * Three.js perspective camera, PBR kit + first-breach shell textures, real-time
 * lights, continuous geometry with the nav grid hidden underneath. Assembles
 * the seeded run LIVE from the registry via breach-v2-layout.ts — the same
 * data the Houdini build consumes — so preview and build never drift.
 *
 * Review hooks (runbook §5.5): window.__dungeonScene / __dungeonLayout /
 * __dungeonRenderer / __dungeonCamera / __dungeonControls / __dungeonFrames /
 * __dungeonLoopError / __dungeonStats.
 *
 * Level 01 is untouched: this module only runs behind the preview flag.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {
  createBreachV2HumanFoundationActorFactory,
  type BreachV2HumanFoundationActor,
} from "./breach-v2-human-foundation-actor.ts";
import {
  setupBreachV2HumanFoundationReview,
  type BreachV2HumanFoundationReview,
} from "./breach-v2-human-foundation-review.ts";
import {
  createBreachV2BreachlingRuntime,
  type BreachV2BreachlingRuntime,
} from "./breach-v2-breachlings.ts";
import {
  setupBreachV2CreatureReview,
  type BreachV2CreatureReview,
} from "./breach-v2-creature-review.ts";

import { buildBreachV2Layout, type BreachV2Layout } from "./breach-v2-layout.ts";
import {
  BREACH_V2_DEFAULT_APERTURE_CLEAR_HEIGHT,
  splitBreachV2Boundary,
  type BreachV2TopologyBoundary,
  type BreachV2TopologyPoint,
} from "./breach-v2-topology.ts";
import { generateBreachV2, breachV2CellKey } from "./breach-v2-generator.ts";
import {
  resolveBreachV2LegacyLandmarkRoomId,
  setupBreachV2DevPanel,
} from "./breach-v2-dev-panel.ts";
import {
  clearBreachV2LegacySpatialStateForExplicitUrl,
  compileBreachV2StartupShaders,
} from "./breach-v2-startup-safety.ts";
import { setupBreachV2FogOfWar, type BreachV2FogState } from "./breach-v2-fog-of-war.ts";
import {
  BREACH_V2_ISOMETRIC_MAX_DISTANCE,
  BREACH_V2_ISOMETRIC_MIN_DISTANCE,
  BREACH_V2_TOUCH_ROTATE_THRESHOLD,
  type BreachV2GraphicsMode,
  type BreachV2GraphicsQuality,
  resolveBreachV2CameraStep,
  resolveBreachV2AutoGraphicsQuality,
  resolveBreachV2PinchDistance,
  resolveBreachV2TouchYaw,
  shouldDockBreachV2PerformanceDetails,
  setupBreachV2MobileLandscapeGate,
  setupBreachV2MobileMovementPad,
  setupBreachV2SettingsPanel,
} from "./breach-v2-mobile-controls.ts";
import {
  createBreachV2RunController,
  type BreachV2EnvironmentDamageResult,
  type BreachV2EnvironmentObjectConfig,
  type BreachV2EnvironmentState,
  type BreachV2RunState,
} from "./breach-v2-gameplay";
import {
  setupBreachV2GameplayUi,
  type BreachV2EnvironmentUiTarget,
} from "./breach-v2-gameplay-ui";
import { storyDatabase } from "../persistence";
import { DUNGEON_PROP_ASSETS } from "../environment/DungeonPropCatalog";
import { instantiateDungeonProp, createDungeonFireEffect } from "../environment/DungeonPropKit";
import {
  HEAVY_DUNGEON_DOOR_FRAME_LIMITS,
  partitionHeavyDungeonDoor,
} from "../environment/HeavyDungeonDoor";

const TEX_ROOT = "/assets/textures/environment/first-breach";
const ART_ROOT = "/assets/textures/environment/breach-v2/art";

const WALL_H = 3.2;
const WALL_H_GRAND = 4.0;
const WALL_H_BOSS = 4.5;
const WALL_T = 0.5;
const FLOOR_T = 0.3;
const DOOR_LINTEL_H = BREACH_V2_DEFAULT_APERTURE_CLEAR_HEIGHT;
const DOOR_PORTAL_W = 2.5;
const PLAYER_CAPSULE_HEIGHT = 1.69;
const PLAYER_CAPSULE_CLEARANCE = 0.04;
const CAMERA_COLLISION_RADIUS = 0.24;
const CAMERA_COLLISION_SKIN = 0.02;
const CEILING_CUTAWAY_HYSTERESIS = 0.3;

export const BREACH_V2_HEAVY_DOOR_SOURCE_BOUNDS = Object.freeze({
  thickness: 0.245622262358666,
  height: 1,
  width: 0.646009266376496,
});
export const BREACH_V2_HEAVY_DOOR_FITTED_BOUNDS = Object.freeze({
  thickness: BREACH_V2_HEAVY_DOOR_SOURCE_BOUNDS.thickness * 3,
  height: BREACH_V2_HEAVY_DOOR_SOURCE_BOUNDS.height * 3,
  width: BREACH_V2_HEAVY_DOOR_SOURCE_BOUNDS.width * 3,
});

interface PreviewHooks {
  __dungeonScene: THREE.Scene;
  __dungeonLayout: BreachV2Layout;
  __dungeonRenderer: THREE.WebGLRenderer;
  __dungeonCamera: THREE.PerspectiveCamera;
  __dungeonControls: OrbitControls | null;
  __dungeonFrames: number;
  __dungeonLoopError: string | null;
  __dungeonStats: { calls: number; triangles: number; geometries: number; textures: number };
  __dungeonMode: string;
  __dungeonCameraDistance: () => number;
  __dungeonCameraYaw: () => number;
  __dungeonFogOfWar: () => {
    currentRoomId: string | null;
    discoveredRoomIds: string[];
    roomStates: Record<string, BreachV2FogState>;
  };
  __dungeonPlayer: { x: number; y: number; z: number };
  __dungeonHumanFoundation: {
    animationNames: () => readonly string[];
    snapshot: BreachV2HumanFoundationActor["snapshot"];
    play: BreachV2HumanFoundationActor["play"];
    pose: BreachV2HumanFoundationActor["pose"];
    pause: BreachV2HumanFoundationActor["pause"];
  } | null;
  __dungeonCreatures: {
    snapshots: BreachV2BreachlingRuntime["snapshots"];
    play: BreachV2BreachlingRuntime["play"];
    pose: BreachV2BreachlingRuntime["pose"];
    pause: BreachV2BreachlingRuntime["pause"];
  };
  __dungeonWalkTo: (x: number, z: number) => boolean;
  __dungeonCanStandAt: (x: number, z: number) => boolean;
  __dungeonNavigateTo: (x: number, z: number) => boolean;
  __dungeonPathRemaining: () => number;
  __dungeonPathSnapshot: () => { x: number; y: number; z: number }[];
  __dungeonCollisionBlockers: BreachV2PlanarCollider[];
  __dungeonSpatialContractAudit: BreachV2SpatialContractAudit;
  __dungeonRefreshSpatialContractAudit: () => BreachV2SpatialContractAudit;
  __dungeonCanProfileStandAt: (radius: number, x: number, z: number) => boolean;
  __dungeonPlanProfilePath: (
    radius: number,
    start: { x: number; z: number },
    target: { x: number; z: number },
  ) => { x: number; z: number }[];
  __dungeonSweepMovement: (
    start: { x: number; z: number },
    requestedEnd: { x: number; z: number },
  ) => BreachV2MovementSweep;
  __dungeonSweepProfileMovement: (
    radius: number,
    start: { x: number; z: number },
    requestedEnd: { x: number; z: number },
  ) => BreachV2MovementSweep;
  __dungeonLineOfSightBlocked: (
    start: { x: number; z: number },
    end: { x: number; z: number },
  ) => boolean;
  __dungeonSetDoorsOpen: (open: boolean) => void;
  __dungeonKeys: Set<string>;
  __dungeonGameplay: {
    snapshot: () => BreachV2RunState;
    objective: () => string;
    interact: (targetId: string) => string;
    enterRoom: (roomId: string) => void;
    attack: () => void;
    guard: () => void;
    recover: () => void;
    restartEncounter: () => void;
    setCombatStyle: (style: "real-time" | "turn-based") => void;
    requestDoor: (doorId: string) => boolean;
  };
  __dungeonEnvironment: {
    objects: () => BreachV2EnvironmentObjectConfig[];
    snapshot: () => BreachV2EnvironmentState;
    damage: (targetId: string, damage?: number) => BreachV2EnvironmentDamageResult;
    collectPickup: () => string;
    cleanupDebris: (targetId?: string) => void;
    activeDebrisCount: () => number;
  };
}

interface BreachV2RuntimeEnvironmentObject extends BreachV2EnvironmentObjectConfig {
  x: number;
  z: number;
  root: THREE.Object3D;
  coffer: boolean;
  pickupRoot?: THREE.Object3D;
  setCofferOpen?: (open: boolean) => void;
}

const BREACH_V2_DESTRUCTIBLE_ASSETS = new Set([
  "reinforced-crate",
  "storage-barrel",
  "trestle-table",
  "high-backed-chair",
  "heavy-bench",
  "broken-handcart",
  "wooden-support-brace",
  "boss-cover-pillar",
]);

export function buildBreachV2EnvironmentObjectConfigs(
  layout: BreachV2Layout,
): BreachV2EnvironmentObjectConfig[] {
  return layout.placements.map((placement, index) => {
    const id = `${placement.roomId}:${placement.asset}:${index}`;
    const coffer = placement.roomId === "vestibule" && placement.asset === "storage-chest";
    const destructible = placement.role === "destructible-cover"
      || BREACH_V2_DESTRUCTIBLE_ASSETS.has(placement.asset);
    return {
      id,
      label: placement.asset.replaceAll("-", " "),
      destructionClass: coffer
        ? "INTERACTABLE_CONTAINER"
        : destructible
          ? "DESTRUCTIBLE_SOLID_PROP"
          : "PROTECTED_PROP_OR_STRUCTURE",
      durability: placement.asset === "boss-cover-pillar"
        ? 120
        : placement.asset === "broken-handcart" ? 90 : 55,
      protectionReason: coffer
        ? "container interaction owns its state transition"
        : destructible ? undefined : "structural, fixture, or progression contract",
    };
  });
}

export interface BreachV2MovementSweep {
  resolvedEnd: { x: number; z: number };
  completed: boolean;
  sampleCount: number;
}

export interface BreachV2SpatialContractAudit {
  renderableCount: number;
  excludedRenderableCount: number;
  classifiedRenderableCount: number;
  unresolvedRenderableNames: string[];
  blockingRenderOwnerIds: string[];
  missingBlockingColliderOwnerIds: string[];
  unexpectedMovementColliderOwnerIds: string[];
  missingLineOfSightColliderOwnerIds: string[];
  unexpectedLineOfSightColliderOwnerIds: string[];
  missingCameraColliderOwnerIds: string[];
  unexpectedCameraColliderOwnerIds: string[];
  unexplainedColliderIds: string[];
  postFitProxyMismatchOwnerIds: string[];
}

interface BreachV2SpatialContract {
  spatialOwnerId: string;
  collisionMode: string;
  blocksMovement: boolean;
  blocksLineOfSight: boolean;
  blocksCamera?: boolean;
  collisionId?: string;
  collisionIdPrefix?: string;
  colliderOwnerClass?: BreachV2PlanarCollider["ownerClass"];
  postFitAuditMode?: "exact" | "compound-envelope" | "shell-topology";
  contractReason?: string;
}

function setSpatialContract(
  object: THREE.Object3D,
  contract: BreachV2SpatialContract,
): void {
  object.userData = { ...object.userData, ...contract };
}

// ---------------------------------------------------------------------------
// materials
// ---------------------------------------------------------------------------
function loadShellTextures(loader: THREE.TextureLoader) {
  const load = (name: string, srgb = false) => {
    const tex = loader.load(`${TEX_ROOT}/${name}`);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
  const make = (set: string) => {
    const ao = load(`${set}-ao.jpg`);
    ao.channel = 0; // share the world-scale UV channel
    return new THREE.MeshStandardMaterial({
      map: load(`${set}-color.jpg`, true),
      normalMap: load(`${set}-normal-gl.jpg`),
      roughnessMap: load(`${set}-roughness.jpg`),
      aoMap: ao,
      roughness: 1.0,
      metalness: 0.02,
    });
  };
  return { flagstone: make("flagstone"), masonry: make("masonry") };
}

/** World-scale UVs: one texture repeat per 4 m, so the grid never shows. */
function scaleBoxUV(geometry: THREE.BufferGeometry, w: number, h: number, d: number, repeat = 4): void {
  const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z — 4 verts each
  const faceSizes: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let face = 0; face < 6; face += 1) {
    const [fw, fh] = faceSizes[face]!;
    for (let v = 0; v < 4; v += 1) {
      const i = face * 4 + v;
      uv.setXY(i, uv.getX(i) * (fw / repeat), uv.getY(i) * (fh / repeat));
    }
  }
  uv.needsUpdate = true;
}

function texturedBox(w: number, h: number, d: number, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(w, h, d);
  scaleBoxUV(geometry, w, h, d);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

interface SharedAscent {
  axis: "x" | "z";
  along: number;
  width: number;
  from: number;
  to: number;
  fromElevation: number;
  toElevation: number;
}

function sharedAscents(layout: BreachV2Layout): SharedAscent[] {
  const ascents: SharedAscent[] = [];
  const fixedRooms = layout.rooms.filter((room) => room.fixed);
  for (const a of fixedRooms) {
    for (const b of fixedRooms) {
      if (a.id >= b.id || Math.abs(a.floorElevation - b.floorElevation) < 0.01) continue;
      const z0 = Math.max(a.z, b.z);
      const z1 = Math.min(a.z + a.h, b.z + b.h);
      if (z1 - z0 > 1 && (Math.abs(a.x + a.w - b.x) < 0.05 || Math.abs(b.x + b.w - a.x) < 0.05)) {
        const west = a.x < b.x ? a : b;
        const east = west === a ? b : a;
        const boundary = west.x + west.w;
        const run = Math.min(1.8, (west.floorElevation < east.floorElevation ? west.w : east.w) * 0.2);
        ascents.push({
          axis: "x", along: (z0 + z1) / 2,
          width: Math.min(z1 - z0 - 1, DOOR_PORTAL_W),
          from: west.floorElevation < east.floorElevation ? boundary - run : boundary + run,
          to: boundary,
          fromElevation: west.floorElevation < east.floorElevation ? west.floorElevation : east.floorElevation,
          toElevation: west.floorElevation < east.floorElevation ? east.floorElevation : west.floorElevation,
        });
      }
    }
  }
  return ascents;
}

function segmentElevation(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  fromElevation: number,
  toElevation: number,
  x: number,
  z: number,
): { elevation: number; distance: number; progress: number; rawProgress: number } {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  const rawProgress = lengthSq > 0 ? ((x - ax) * dx + (z - az) * dz) / lengthSq : 0;
  const progress = THREE.MathUtils.clamp(rawProgress, 0, 1);
  const px = ax + dx * progress;
  const pz = az + dz * progress;
  return {
    elevation: THREE.MathUtils.lerp(fromElevation, toElevation, progress),
    distance: Math.hypot(x - px, z - pz),
    progress,
    rawProgress,
  };
}

function floorElevationSampleAt(layout: BreachV2Layout, x: number, z: number): number | null {
  for (const corridor of layout.corridors) {
    for (let index = 0; index < corridor.points.length - 1; index += 1) {
      const [ax, az] = corridor.points[index]!;
      const [bx, bz] = corridor.points[index + 1]!;
      if (Math.hypot(bx - ax, bz - az) < 0.01) continue;
      const sample = segmentElevation(
        ax, az, bx, bz,
        corridor.elevations[index]!, corridor.elevations[index + 1]!,
        x, z,
      );
      if (
        sample.rawProgress >= -0.005
        && sample.rawProgress <= 1.005
        && sample.distance <= corridor.width / 2 + 0.1
      ) return sample.elevation;
    }
  }
  for (const ascent of sharedAscents(layout)) {
    const low = Math.min(ascent.from, ascent.to);
    const high = Math.max(ascent.from, ascent.to);
    const cross = ascent.axis === "x" ? x : z;
    const along = ascent.axis === "x" ? z : x;
    if (cross >= low && cross <= high && Math.abs(along - ascent.along) <= ascent.width / 2) {
      const progress = Math.abs(cross - ascent.from) / Math.abs(ascent.to - ascent.from);
      return THREE.MathUtils.lerp(ascent.fromElevation, ascent.toElevation, progress);
    }
  }
  const room = layout.rooms.find((candidate) => (
    x >= candidate.x - 0.05 && x <= candidate.x + candidate.w + 0.05
    && z >= candidate.z - 0.05 && z <= candidate.z + candidate.h + 0.05
  ));
  if (!room) return null;
  const progress = room.w > 0 ? THREE.MathUtils.clamp((x - room.x) / room.w, 0, 1) : 0;
  return THREE.MathUtils.lerp(room.floorElevation, room.endElevation, progress);
}

export function floorElevationAt(layout: BreachV2Layout, x: number, z: number): number {
  return floorElevationSampleAt(layout, x, z) ?? 0;
}

export function hasDungeonFloorAt(layout: BreachV2Layout, x: number, z: number): boolean {
  return floorElevationSampleAt(layout, x, z) !== null;
}

export function sweepBreachV2Movement(
  start: { x: number; z: number },
  requestedEnd: { x: number; z: number },
  canStandAt: (x: number, z: number) => boolean,
  maxSampleDistance = 0.05,
): BreachV2MovementSweep {
  const distance = Math.hypot(requestedEnd.x - start.x, requestedEnd.z - start.z);
  const sampleCount = Math.max(1, Math.ceil(distance / maxSampleDistance));
  let resolvedEnd = { ...start };
  for (let index = 1; index <= sampleCount; index += 1) {
    const progress = index / sampleCount;
    const sample = {
      x: THREE.MathUtils.lerp(start.x, requestedEnd.x, progress),
      z: THREE.MathUtils.lerp(start.z, requestedEnd.z, progress),
    };
    if (!canStandAt(sample.x, sample.z)) {
      return { resolvedEnd, completed: false, sampleCount };
    }
    resolvedEnd = sample;
  }
  return { resolvedEnd, completed: true, sampleCount };
}

export function findBreachV2RuntimePath(
  start: { x: number; z: number },
  target: { x: number; z: number },
  cellSize: number,
  canStandAt: (x: number, z: number) => boolean,
): { x: number; z: number }[] {
  interface PathCell { x: number; y: number }
  const key = (cell: PathCell): string => `${cell.x},${cell.y}`;
  const worldPoint = (cell: PathCell): { x: number; z: number } => ({
    x: (cell.x + 0.5) * cellSize,
    z: (cell.y + 0.5) * cellSize,
  });
  const segmentClear = (
    from: { x: number; z: number },
    to: { x: number; z: number },
  ): boolean => sweepBreachV2Movement(from, to, canStandAt).completed;

  const nearestConnectedCell = (point: { x: number; z: number }): PathCell | null => {
    const center = {
      x: Math.floor(point.x / cellSize),
      y: Math.floor(point.z / cellSize),
    };
    const candidates: PathCell[] = [];
    for (let radius = 0; radius <= 3; radius += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
          if (radius > 0 && Math.max(Math.abs(offsetX), Math.abs(offsetY)) !== radius) continue;
          candidates.push({ x: center.x + offsetX, y: center.y + offsetY });
        }
      }
    }
    return candidates
      .filter((cell) => {
        const world = worldPoint(cell);
        return canStandAt(world.x, world.z) && segmentClear(point, world);
      })
      .sort((a, b) => {
        const worldA = worldPoint(a);
        const worldB = worldPoint(b);
        return Math.hypot(worldA.x - point.x, worldA.z - point.z)
          - Math.hypot(worldB.x - point.x, worldB.z - point.z);
      })[0] ?? null;
  };
  const startCell = nearestConnectedCell(start);
  const targetCell = nearestConnectedCell(target);
  if (!startCell || !targetCell) return [];
  const startKey = key(startCell);
  const targetKey = key(targetCell);
  if (startKey === targetKey) return [worldPoint(targetCell)];

  const directions = [
    { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
    { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
  ] as const;
  const queue: PathCell[] = [startCell];
  let queueIndex = 0;
  const cameFrom = new Map<string, PathCell | null>([[startKey, null]]);
  while (queueIndex < queue.length) {
    const current = queue[queueIndex++]!;
    const currentWorld = worldPoint(current);
    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const nextKey = key(next);
      if (cameFrom.has(nextKey)) continue;
      const nextWorld = worldPoint(next);
      if (!canStandAt(nextWorld.x, nextWorld.z) || !segmentClear(currentWorld, nextWorld)) continue;
      cameFrom.set(nextKey, current);
      if (nextKey === targetKey) {
        const reversed: PathCell[] = [next];
        let cursor = current;
        while (key(cursor) !== startKey) {
          reversed.push(cursor);
          cursor = cameFrom.get(key(cursor))!;
        }
        reversed.push(startCell);
        return reversed.reverse().map(worldPoint);
      }
      queue.push(next);
    }
  }
  return [];
}

export function findBreachV2AdaptiveRuntimePath(
  start: { x: number; z: number },
  target: { x: number; z: number },
  baseCellSize: number,
  canStandAt: (x: number, z: number) => boolean,
): { x: number; z: number }[] {
  const coarse = findBreachV2RuntimePath(start, target, baseCellSize, canStandAt);
  if (coarse.length > 0) return coarse;
  // A valid continuous route around a tight dogleg can fall between the
  // globally anchored coarse samples. Finer grids are not strictly monotonic:
  // nearest-cell snapping at half spacing can put the two ends of a narrow
  // aperture on opposite raster phases even when quarter spacing connects it.
  // Retry both resolutions before declaring the topology disconnected; every
  // edge is still swept through the exact final fitted standability predicate.
  const fine = findBreachV2RuntimePath(start, target, baseCellSize / 2, canStandAt);
  if (fine.length > 0) return fine;
  return findBreachV2RuntimePath(start, target, baseCellSize / 4, canStandAt);
}

export interface BreachV2PlanarCollider {
  id: string;
  asset: string;
  roomId: string;
  ownerClass: "placement" | "shell" | "landmark" | "portal";
  shape: "aabb" | "circle" | "oriented-box";
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  centerX?: number;
  centerZ?: number;
  radius?: number;
  halfX?: number;
  halfZ?: number;
  yaw?: number;
  /** Runtime builders always set this; omission stays movement-solid for legacy test fixtures. */
  blocksMovement?: boolean;
  blocksLineOfSight: boolean;
  /** Defaults to blocksLineOfSight; raised overhead gates remain camera-solid without blocking actor LOS. */
  blocksCamera?: boolean;
}

export interface BreachV2PlacementProxyMeasurement {
  id: string;
  centerX: number;
  centerZ: number;
  halfX: number;
  halfZ: number;
  yaw: number;
  minY: number;
  maxY: number;
}

export interface BreachV2CameraOnlyColliderSet {
  lintels: BreachV2PlanarCollider[];
  ceilings: BreachV2PlanarCollider[];
}

function isBreachV2DynamicallyRemoved(object: THREE.Object3D): boolean {
  let cursor: THREE.Object3D | null = object;
  while (cursor) {
    if (cursor.userData.dynamicRemoved === true) return true;
    cursor = cursor.parent;
  }
  return false;
}

function isBreachV2SpatialAuditExcluded(object: THREE.Object3D): boolean {
  let cursor: THREE.Object3D | null = object;
  while (cursor) {
    if (cursor.userData.spatialAuditExcluded) return true;
    cursor = cursor.parent;
  }
  return false;
}

function forEachWorldGeometryCorner(
  roots: readonly THREE.Object3D[],
  visit: (corner: THREE.Vector3, renderable: THREE.Object3D) => void,
): void {
  const corner = new THREE.Vector3();
  for (const root of roots) {
    root.updateWorldMatrix(true, true);
    root.traverse((object) => {
      if (isBreachV2DynamicallyRemoved(object) || isBreachV2SpatialAuditExcluded(object)) return;
      if (
        !(object instanceof THREE.Mesh)
        && !(object instanceof THREE.Line)
        && !(object instanceof THREE.Points)
      ) return;
      const geometry = object.geometry;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const bounds = geometry.boundingBox;
      if (!bounds || bounds.isEmpty()) return;
      for (const x of [bounds.min.x, bounds.max.x]) {
        for (const y of [bounds.min.y, bounds.max.y]) {
          for (const z of [bounds.min.z, bounds.max.z]) {
            corner.set(x, y, z).applyMatrix4(object.matrixWorld);
            visit(corner, object);
          }
        }
      }
    });
  }
}

export function buildBreachV2PlacementColliders(
  layout: BreachV2Layout,
  postFitMeasurements: readonly BreachV2PlacementProxyMeasurement[] = [],
): BreachV2PlanarCollider[] {
  const colliders: BreachV2PlanarCollider[] = [];
  const measurementsById = new Map(postFitMeasurements.map((measurement) => [measurement.id, measurement]));
  const exitClearWidth = layout.corridors.find((corridor) => corridor.id === "heartvale-exit")?.width
    ?? DOOR_PORTAL_W;
  for (const [index, placement] of layout.placements.entries()) {
    if (!placement.blocking) continue;
    const id = `${placement.roomId}:${placement.asset}:${index}`;
    const half = placement.footprint / 2;
    if (placement.asset !== "ruined-stone-archway") {
      const measured = measurementsById.get(id);
      if (measured) {
        const cosine = Math.cos(measured.yaw);
        const sine = Math.sin(measured.yaw);
        const extentX = Math.abs(cosine) * measured.halfX + Math.abs(sine) * measured.halfZ;
        const extentZ = Math.abs(sine) * measured.halfX + Math.abs(cosine) * measured.halfZ;
        colliders.push({
          id,
          asset: placement.asset,
          roomId: placement.roomId,
          ownerClass: "placement",
          shape: "oriented-box",
          minX: measured.centerX - extentX,
          maxX: measured.centerX + extentX,
          minZ: measured.centerZ - extentZ,
          maxZ: measured.centerZ + extentZ,
          centerX: measured.centerX,
          centerZ: measured.centerZ,
          halfX: measured.halfX,
          halfZ: measured.halfZ,
          yaw: measured.yaw,
          minY: measured.minY,
          maxY: measured.maxY,
          blocksMovement: true,
          blocksLineOfSight: measured.maxY - measured.minY >= 1.25,
        });
        continue;
      }
      // Deterministic registry fallback for pure topology tests and any
      // procedural placement without a fitted render root. Live GLB props
      // supply the tighter post-fit oriented measurement above.
      colliders.push({
        id,
        asset: placement.asset,
        roomId: placement.roomId,
        ownerClass: "placement",
        shape: "aabb",
        minX: placement.x - half,
        maxX: placement.x + half,
        minZ: placement.z - half,
        maxZ: placement.z + half,
        minY: placement.elevation,
        maxY: placement.elevation + placement.height,
        blocksMovement: true,
        blocksLineOfSight: placement.height >= 1.25,
      });
      continue;
    }

    // An arch is a frame, not one solid obstacle. Preserve collision on both
    // stone uprights while leaving its authored corridor-width opening usable.
    const clearHalf = Math.min(exitClearWidth / 2, Math.max(0, half - 0.05));
    const frameDepth = Math.min(0.65, half);
    const spansZ = placement.facing === "east" || placement.facing === "west";
    if (spansZ) {
      colliders.push(
        {
          id: `${id}:left-upright`, asset: placement.asset, roomId: placement.roomId,
          ownerClass: "placement", shape: "aabb",
          minX: placement.x - frameDepth, maxX: placement.x + frameDepth,
          minZ: placement.z - half, maxZ: placement.z - clearHalf,
          minY: placement.elevation, maxY: placement.elevation + placement.height,
          blocksMovement: true,
          blocksLineOfSight: true,
        },
        {
          id: `${id}:right-upright`, asset: placement.asset, roomId: placement.roomId,
          ownerClass: "placement", shape: "aabb",
          minX: placement.x - frameDepth, maxX: placement.x + frameDepth,
          minZ: placement.z + clearHalf, maxZ: placement.z + half,
          minY: placement.elevation, maxY: placement.elevation + placement.height,
          blocksMovement: true,
          blocksLineOfSight: true,
        },
      );
    } else {
      colliders.push(
        {
          id: `${id}:left-upright`, asset: placement.asset, roomId: placement.roomId,
          ownerClass: "placement", shape: "aabb",
          minX: placement.x - half, maxX: placement.x - clearHalf,
          minZ: placement.z - frameDepth, maxZ: placement.z + frameDepth,
          minY: placement.elevation, maxY: placement.elevation + placement.height,
          blocksMovement: true,
          blocksLineOfSight: true,
        },
        {
          id: `${id}:right-upright`, asset: placement.asset, roomId: placement.roomId,
          ownerClass: "placement", shape: "aabb",
          minX: placement.x + clearHalf, maxX: placement.x + half,
          minZ: placement.z - frameDepth, maxZ: placement.z + frameDepth,
          minY: placement.elevation, maxY: placement.elevation + placement.height,
          blocksMovement: true,
          blocksLineOfSight: true,
        },
      );
    }
  }
  return colliders.filter((collider) => collider.maxX > collider.minX && collider.maxZ > collider.minZ);
}

export function buildBreachV2ShellColliders(
  layout: BreachV2Layout,
): BreachV2PlanarCollider[] {
  return layout.topology.boundaries.flatMap((boundary) => {
    const halfThickness = boundary.thickness / 2;
    return splitBreachV2Boundary(boundary).solidSpans.flatMap((span, spanIndex) => {
      const spanLength = span.endDistance - span.startDistance;
      const sliceCount = Math.max(1, Math.ceil(spanLength / 1.2));
      return Array.from({ length: sliceCount }, (_, sliceIndex) => {
        const p0 = sliceIndex / sliceCount;
        const p1 = (sliceIndex + 1) / sliceCount;
        const start: BreachV2TopologyPoint = [
          THREE.MathUtils.lerp(span.start[0], span.end[0], p0),
          THREE.MathUtils.lerp(span.start[1], span.end[1], p0),
        ];
        const end: BreachV2TopologyPoint = [
          THREE.MathUtils.lerp(span.start[0], span.end[0], p1),
          THREE.MathUtils.lerp(span.start[1], span.end[1], p1),
        ];
        const horizontal = Math.abs(start[1] - end[1]) < 1e-6;
        const vertical = Math.abs(start[0] - end[0]) < 1e-6;
        if (!horizontal && !vertical) {
          throw new Error(`BREACH-V2 shell collider requires a rectilinear span: ${boundary.boundaryId}`);
        }
        const midpoint: BreachV2TopologyPoint = [
          (start[0] + end[0]) / 2,
          (start[1] + end[1]) / 2,
        ];
        const verticalEnvelope = boundaryVerticalEnvelope(layout, boundary, midpoint);
        return {
          id: `shell:${boundary.boundaryId}:solid:${spanIndex}:slice:${sliceIndex}`,
          asset: "shell-wall",
          roomId: boundary.owner,
          ownerClass: "shell" as const,
          shape: "aabb" as const,
          minX: Math.min(start[0], end[0]) - (horizontal ? 0 : halfThickness),
          maxX: Math.max(start[0], end[0]) + (horizontal ? 0 : halfThickness),
          minZ: Math.min(start[1], end[1]) - (horizontal ? halfThickness : 0),
          maxZ: Math.max(start[1], end[1]) + (horizontal ? halfThickness : 0),
          minY: verticalEnvelope.base,
          maxY: verticalEnvelope.top,
          blocksMovement: true,
          blocksLineOfSight: true,
        };
      });
    });
  }).filter((collider) => collider.maxX > collider.minX && collider.maxZ > collider.minZ);
}

export function getBreachV2ApertureSpanClearHeight(
  boundary: BreachV2TopologyBoundary,
  apertureIds: readonly string[],
): number {
  const matchingHeights = boundary.apertures
    .filter((aperture) => apertureIds.includes(aperture.apertureId))
    .map((aperture) => aperture.clearHeight);
  return matchingHeights.length > 0
    ? Math.max(...matchingHeights)
    : BREACH_V2_DEFAULT_APERTURE_CLEAR_HEIGHT;
}

/**
 * Camera-only volumes for rendered overhead shell geometry. These volumes are
 * deliberately separate from the planar shell colliders: an actor may walk
 * through the clear part of an aperture and beneath a ceiling, while a raised
 * third-person camera must not pass through the masonry that is actually
 * visible on screen.
 */
export function buildBreachV2CameraOnlyColliders(
  layout: BreachV2Layout,
): BreachV2CameraOnlyColliderSet {
  const lintels: BreachV2PlanarCollider[] = [];
  for (const boundary of layout.topology.boundaries) {
    const halfThickness = boundary.thickness / 2;
    for (const [index, span] of splitBreachV2Boundary(boundary).apertureSpans.entries()) {
      const horizontal = Math.abs(span.start[1] - span.end[1]) < 1e-6;
      const vertical = Math.abs(span.start[0] - span.end[0]) < 1e-6;
      if (!horizontal && !vertical) {
        throw new Error(`BREACH-V2 lintel collider requires a rectilinear span: ${boundary.boundaryId}`);
      }
      const midpoint: BreachV2TopologyPoint = [
        (span.start[0] + span.end[0]) / 2,
        (span.start[1] + span.end[1]) / 2,
      ];
      const envelope = boundaryVerticalEnvelope(layout, boundary, midpoint);
      const lintelBase = envelope.base + getBreachV2ApertureSpanClearHeight(boundary, span.apertureIds);
      if (envelope.top - lintelBase <= 0.05) continue;
      lintels.push({
        id: `camera:shell:lintel:${boundary.boundaryId}:${index}`,
        asset: "shell-aperture-lintel",
        roomId: boundary.owner,
        ownerClass: "shell",
        shape: "aabb",
        minX: Math.min(span.start[0], span.end[0]) - (horizontal ? 0 : halfThickness),
        maxX: Math.max(span.start[0], span.end[0]) + (horizontal ? 0 : halfThickness),
        minZ: Math.min(span.start[1], span.end[1]) - (horizontal ? halfThickness : 0),
        maxZ: Math.max(span.start[1], span.end[1]) + (horizontal ? halfThickness : 0),
        minY: lintelBase,
        maxY: envelope.top,
        blocksMovement: false,
        blocksLineOfSight: false,
        blocksCamera: true,
      });
    }
  }

  const ceilings: BreachV2PlanarCollider[] = layout.rooms.map((room) => {
    const minY = Math.max(room.floorElevation, room.endElevation) + roomWallHeight(room);
    return {
      id: `camera:shell:ceiling:room:${room.id}`,
      asset: "shell-room-ceiling",
      roomId: room.id,
      ownerClass: "shell" as const,
      shape: "aabb" as const,
      minX: room.x - WALL_T,
      maxX: room.x + room.w + WALL_T,
      minZ: room.z - WALL_T,
      maxZ: room.z + room.h + WALL_T,
      minY,
      maxY: minY + 0.25,
      blocksMovement: false,
      blocksLineOfSight: false,
      blocksCamera: true,
    };
  });
  for (const corridor of layout.corridors) {
    for (let index = 0; index < corridor.points.length - 1; index += 1) {
      const [ax, az] = corridor.points[index]!;
      const [bx, bz] = corridor.points[index + 1]!;
      const length = Math.hypot(bx - ax, bz - az);
      if (length < 0.01) continue;
      const vertical = Math.abs(bx - ax) < 0.01;
      const width = vertical ? corridor.width + WALL_T * 2 : length;
      const depth = vertical ? length : corridor.width + WALL_T * 2;
      const centerX = (ax + bx) / 2;
      const centerZ = (az + bz) / 2;
      const minY = Math.max(corridor.elevations[index]!, corridor.elevations[index + 1]!) + WALL_H;
      ceilings.push({
        id: `camera:shell:ceiling:corridor:${corridor.id}:${index}`,
        asset: "shell-corridor-ceiling",
        roomId: corridor.id,
        ownerClass: "shell",
        shape: "aabb",
        minX: centerX - width / 2,
        maxX: centerX + width / 2,
        minZ: centerZ - depth / 2,
        maxZ: centerZ + depth / 2,
        minY,
        maxY: minY + 0.25,
        blocksMovement: false,
        blocksLineOfSight: false,
        blocksCamera: true,
      });
    }
  }

  return { lintels, ceilings };
}

export function getBreachV2VisibleCameraColliders(
  colliders: BreachV2CameraOnlyColliderSet,
  ceilingsVisible: boolean,
): BreachV2PlanarCollider[] {
  return ceilingsVisible
    ? [...colliders.lintels, ...colliders.ceilings]
    : [...colliders.lintels];
}

export function buildBreachV2LandmarkColliders(
  layout: BreachV2Layout,
): BreachV2PlanarCollider[] {
  const { soulWell, memoryLoom, effigy } = layout.landmarks;
  const soulWellRadius = (soulWell.apron ?? 2.65) + 0.08;
  const soulWellFloor = floorElevationAt(layout, soulWell.x, soulWell.z);
  const loomFloor = floorElevationAt(layout, memoryLoom.x, memoryLoom.z);
  const effigyFloor = floorElevationAt(layout, effigy.x, effigy.z);
  return [
    {
      id: "landmark:soul-well",
      asset: "soul-well-masonry",
      roomId: "vestibule",
      ownerClass: "landmark",
      shape: "circle",
      minX: soulWell.x - soulWellRadius,
      maxX: soulWell.x + soulWellRadius,
      minZ: soulWell.z - soulWellRadius,
      maxZ: soulWell.z + soulWellRadius,
      centerX: soulWell.x,
      centerZ: soulWell.z,
      radius: soulWellRadius,
      minY: soulWellFloor,
      maxY: soulWellFloor + 0.98,
      blocksMovement: true,
      blocksLineOfSight: false,
    },
    {
      id: "landmark:memory-loom",
      asset: "memory-loom",
      roomId: "memory-vault",
      ownerClass: "landmark",
      shape: "aabb",
      minX: memoryLoom.x - 1.62,
      maxX: memoryLoom.x + 1.22,
      minZ: memoryLoom.z - 0.3,
      maxZ: memoryLoom.z + 0.3,
      minY: loomFloor,
      maxY: loomFloor + 2.65,
      blocksMovement: true,
      blocksLineOfSight: true,
    },
    {
      id: "landmark:training-effigy",
      asset: "training-effigy",
      roomId: "vestibule",
      ownerClass: "landmark",
      shape: "aabb",
      minX: effigy.x - 0.75,
      maxX: effigy.x + 0.75,
      minZ: effigy.z - 0.21,
      maxZ: effigy.z + 0.21,
      minY: effigyFloor,
      maxY: effigyFloor + 2.2,
      blocksMovement: true,
      blocksLineOfSight: true,
    },
  ];
}

export function isBreachV2PlacementBlocked(
  colliders: readonly BreachV2PlanarCollider[],
  x: number,
  z: number,
  radius: number,
): boolean {
  return colliders.some((collider) => {
    if (collider.blocksMovement === false) return false;
    if (collider.shape === "circle") {
      return Math.hypot(
        x - collider.centerX!,
        z - collider.centerZ!,
      ) <= collider.radius! + radius;
    }
    if (collider.shape === "oriented-box") {
      const cosine = Math.cos(collider.yaw ?? 0);
      const sine = Math.sin(collider.yaw ?? 0);
      const dx = x - collider.centerX!;
      const dz = z - collider.centerZ!;
      const localX = dx * cosine - dz * sine;
      const localZ = dx * sine + dz * cosine;
      const closestX = THREE.MathUtils.clamp(localX, -collider.halfX!, collider.halfX!);
      const closestZ = THREE.MathUtils.clamp(localZ, -collider.halfZ!, collider.halfZ!);
      return (localX - closestX) ** 2 + (localZ - closestZ) ** 2 <= radius ** 2;
    }
    const closestX = THREE.MathUtils.clamp(x, collider.minX, collider.maxX);
    const closestZ = THREE.MathUtils.clamp(z, collider.minZ, collider.maxZ);
    return (x - closestX) ** 2 + (z - closestZ) ** 2 <= radius ** 2;
  });
}

export function filterBreachV2RemovedColliders(
  colliders: readonly BreachV2PlanarCollider[],
  removedColliderIds: readonly string[],
): BreachV2PlanarCollider[] {
  const removed = new Set(removedColliderIds);
  return colliders.filter((collider) => !removed.has(collider.id));
}

export function getBreachV2SegmentIntervalXZ(
  collider: BreachV2PlanarCollider,
  start: { x: number; z: number },
  end: { x: number; z: number },
  padding = 0,
): { enter: number; exit: number } | null {
  if (collider.shape === "circle") {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const offsetX = start.x - collider.centerX!;
    const offsetZ = start.z - collider.centerZ!;
    const a = dx * dx + dz * dz;
    const radius = collider.radius! + padding;
    if (a < 1e-10) {
      return offsetX * offsetX + offsetZ * offsetZ <= radius ** 2
        ? { enter: 0, exit: 1 }
        : null;
    }
    const b = 2 * (offsetX * dx + offsetZ * dz);
    const c = offsetX * offsetX + offsetZ * offsetZ - radius ** 2;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    const root = Math.sqrt(discriminant);
    const first = (-b - root) / (2 * a);
    const second = (-b + root) / (2 * a);
    const enter = Math.max(0, Math.min(first, second));
    const exit = Math.min(1, Math.max(first, second));
    return enter <= exit ? { enter, exit } : null;
  }
  let lineStart = start;
  let lineEnd = end;
  let minX = collider.minX - padding;
  let maxX = collider.maxX + padding;
  let minZ = collider.minZ - padding;
  let maxZ = collider.maxZ + padding;
  if (collider.shape === "oriented-box") {
    const cosine = Math.cos(collider.yaw ?? 0);
    const sine = Math.sin(collider.yaw ?? 0);
    const rotate = (point: { x: number; z: number }) => {
      const dx = point.x - collider.centerX!;
      const dz = point.z - collider.centerZ!;
      return { x: dx * cosine - dz * sine, z: dx * sine + dz * cosine };
    };
    lineStart = rotate(start);
    lineEnd = rotate(end);
    minX = -collider.halfX! - padding;
    maxX = collider.halfX! + padding;
    minZ = -collider.halfZ! - padding;
    maxZ = collider.halfZ! + padding;
  }
  let enter = 0;
  let exit = 1;
  for (const [origin, delta, lower, upper] of [
    [lineStart.x, lineEnd.x - lineStart.x, minX, maxX],
    [lineStart.z, lineEnd.z - lineStart.z, minZ, maxZ],
  ] as const) {
    if (Math.abs(delta) < 1e-8) {
      if (origin < lower || origin > upper) return null;
      continue;
    }
    const first = (lower - origin) / delta;
    const second = (upper - origin) / delta;
    enter = Math.max(enter, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
    if (enter > exit) return null;
  }
  return { enter, exit };
}

export function isBreachV2LineOfSightBlocked(
  colliders: readonly BreachV2PlanarCollider[],
  start: { x: number; z: number },
  end: { x: number; z: number },
): boolean {
  return colliders.some((collider) => (
    collider.blocksLineOfSight && getBreachV2SegmentIntervalXZ(collider, start, end) !== null
  ));
}

export function firstBreachV2CameraHit(
  colliders: readonly BreachV2PlanarCollider[],
  start: { x: number; y: number; z: number },
  end: { x: number; y: number; z: number },
  cameraRadius = 0,
): { collider: BreachV2PlanarCollider; fraction: number } | null {
  let nearest: { collider: BreachV2PlanarCollider; fraction: number } | null = null;
  for (const collider of colliders) {
    if (!(collider.blocksCamera ?? collider.blocksLineOfSight)) continue;
    const horizontal = getBreachV2SegmentIntervalXZ(collider, start, end, cameraRadius);
    if (!horizontal) continue;
    const deltaY = end.y - start.y;
    let verticalEnter = 0;
    let verticalExit = 1;
    if (Math.abs(deltaY) < 1e-8) {
      if (start.y < collider.minY - cameraRadius || start.y > collider.maxY + cameraRadius) continue;
    } else {
      const first = (collider.minY - cameraRadius - start.y) / deltaY;
      const second = (collider.maxY + cameraRadius - start.y) / deltaY;
      verticalEnter = Math.max(0, Math.min(first, second));
      verticalExit = Math.min(1, Math.max(first, second));
      if (verticalEnter > verticalExit) continue;
    }
    const fraction = Math.max(horizontal.enter, verticalEnter);
    if (fraction > Math.min(horizontal.exit, verticalExit)) continue;
    if (!nearest || fraction < nearest.fraction) nearest = { collider, fraction };
  }
  return nearest;
}

export function resolveBreachV2CameraDistance(
  desiredDistance: number,
  hitFraction: number | null,
  skin = CAMERA_COLLISION_SKIN,
): number {
  if (hitFraction === null) return Math.max(0, desiredDistance);
  const hitDistance = Math.max(0, desiredDistance) * THREE.MathUtils.clamp(hitFraction, 0, 1);
  return Math.min(Math.max(0, desiredDistance), Math.max(0, hitDistance - Math.max(0, skin)));
}

export function resolveBreachV2CameraFloorY(
  requestedY: number,
  sampledFloorY: number | null,
  fallbackFloorY: number,
  cameraRadius = CAMERA_COLLISION_RADIUS,
): number {
  const floorY = sampledFloorY ?? fallbackFloorY;
  return Math.max(requestedY, floorY + Math.max(0, cameraRadius));
}

export function resolveBreachV2PlaceholderAvatarOpacity(cameraDistance: number): number {
  return THREE.MathUtils.smoothstep(Math.max(0, cameraDistance), 0.85, 1.75);
}

export type BreachV2CeilingCameraMode = "firstperson" | "thirdperson" | "isometric" | "overview" | "orbit";

export function resolveBreachV2CeilingVisibility(
  currentVisible: boolean,
  mode: BreachV2CeilingCameraMode,
  desiredCameraY: number,
  localCeilingY: number | null,
  hysteresis = CEILING_CUTAWAY_HYSTERESIS,
): boolean {
  if (mode === "firstperson") return true;
  if (mode === "isometric" || mode === "overview") return false;
  if (localCeilingY === null) return currentVisible;
  const band = Math.max(0, hysteresis);
  if (currentVisible && desiredCameraY >= localCeilingY + band) return false;
  if (!currentVisible && desiredCameraY <= localCeilingY - band) return true;
  return currentVisible;
}

export function isBreachV2LandmarkBlocked(
  layout: BreachV2Layout,
  x: number,
  z: number,
  radius: number,
): boolean {
  return isBreachV2PlacementBlocked(buildBreachV2LandmarkColliders(layout), x, z, radius);
}

export function getBreachV2ClosedDoorYaw(frontNormal: { x: number; z: number }): number {
  return Math.atan2(-frontNormal.z, frontNormal.x);
}

export const BREACH_V2_PORTAL_TRAVERSAL_READY_PROGRESS = 0.995;

export function isBreachV2PortalReadyForTraversal(progress: number): boolean {
  return THREE.MathUtils.clamp(progress, 0, 1) >= BREACH_V2_PORTAL_TRAVERSAL_READY_PROGRESS;
}

export function doesBreachV2PortalBlockMovement(
  kind: "door" | "gate",
  progress: number,
  gateClearsCapsule: boolean,
): boolean {
  return kind === "door" ? !isBreachV2PortalReadyForTraversal(progress) : !gateClearsCapsule;
}

export function resolveBreachV2CameraDistanceForMode(
  requestedDistance: number, hitFraction: number | null, isometric: boolean,
): number {
  return isometric ? Math.max(0, requestedDistance) : resolveBreachV2CameraDistance(requestedDistance, hitFraction);
}

export const BREACH_V2_ISOMETRIC_DEFAULT_YAW = THREE.MathUtils.degToRad(-45);
export const BREACH_V2_ISOMETRIC_DEFAULT_PITCH = THREE.MathUtils.degToRad(30);
export const BREACH_V2_ISOMETRIC_DEFAULT_DISTANCE = 18.5;
export const BREACH_V2_ISOMETRIC_LOOK_AHEAD = 4.25;
export const BREACH_V2_ISOMETRIC_MIN_PITCH = THREE.MathUtils.degToRad(8);
export const BREACH_V2_ISOMETRIC_MAX_PITCH = THREE.MathUtils.degToRad(58);

export function writeBreachV2IsometricCameraPose(
  playerPosition: { x: number; y: number; z: number },
  yaw: number,
  pitch: number,
  distance: number,
  target: THREE.Vector3,
  position: THREE.Vector3,
): void {
  const resolvedPitch = THREE.MathUtils.clamp(
    pitch,
    BREACH_V2_ISOMETRIC_MIN_PITCH,
    BREACH_V2_ISOMETRIC_MAX_PITCH,
  );
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  target.set(
    playerPosition.x + forwardX * BREACH_V2_ISOMETRIC_LOOK_AHEAD,
    playerPosition.y + 1.4,
    playerPosition.z + forwardZ * BREACH_V2_ISOMETRIC_LOOK_AHEAD,
  );
  const horizontalDistance = Math.cos(resolvedPitch) * distance;
  position.set(
    target.x - forwardX * horizontalDistance,
    target.y + Math.sin(resolvedPitch) * distance,
    target.z - forwardZ * horizontalDistance,
  );
}

export function buildBreachV2DoorLeafCollider(input: {
  id: string;
  x: number;
  z: number;
  closedYaw: number;
  progress: number;
  halfThickness: number;
  halfSpan: number;
  minY?: number;
  maxY?: number;
}): BreachV2PlanarCollider {
  const yaw = input.closedYaw + THREE.MathUtils.clamp(input.progress, 0, 1) * (Math.PI / 2);
  const hingeX = input.x - Math.sin(input.closedYaw) * input.halfSpan;
  const hingeZ = input.z - Math.cos(input.closedYaw) * input.halfSpan;
  const centerX = hingeX + Math.sin(yaw) * input.halfSpan;
  const centerZ = hingeZ + Math.cos(yaw) * input.halfSpan;
  const extentX = Math.abs(Math.cos(yaw)) * input.halfThickness
    + Math.abs(Math.sin(yaw)) * input.halfSpan;
  const extentZ = Math.abs(Math.sin(yaw)) * input.halfThickness
    + Math.abs(Math.cos(yaw)) * input.halfSpan;
  return {
    id: `portal:${input.id}:leaf`,
    asset: "heavy-door",
    roomId: input.id,
    ownerClass: "portal",
    shape: "oriented-box",
    minX: centerX - extentX,
    maxX: centerX + extentX,
    minZ: centerZ - extentZ,
    maxZ: centerZ + extentZ,
    centerX,
    centerZ,
    halfX: input.halfThickness,
    halfZ: input.halfSpan,
    yaw,
    minY: input.minY ?? 0,
    maxY: input.maxY ?? BREACH_V2_HEAVY_DOOR_FITTED_BOUNDS.height,
    blocksMovement: true,
    blocksLineOfSight: true,
  };
}

export function isBreachV2PortalClosureSafe(
  input: {
    kind: "door" | "gate";
    id: string;
    x: number;
    z: number;
    axis: "x" | "z";
    closedYaw: number;
    clearWidth: number;
    progress: number;
    halfThickness: number;
    halfSpan: number;
  },
  occupant: { x: number; z: number },
  occupantRadius = 0.35,
): boolean {
  const radius = Math.max(0, occupantRadius);
  if (input.kind === "gate") {
    const normalHalf = input.halfThickness;
    const spanHalf = input.halfSpan;
    const closedGate: BreachV2PlanarCollider = {
      id: `portal:${input.id}:closure-sweep`,
      asset: "rusted-portcullis",
      roomId: input.id,
      ownerClass: "portal",
      shape: "aabb",
      minX: input.x - (input.axis === "x" ? normalHalf : spanHalf),
      maxX: input.x + (input.axis === "x" ? normalHalf : spanHalf),
      minZ: input.z - (input.axis === "x" ? spanHalf : normalHalf),
      maxZ: input.z + (input.axis === "x" ? spanHalf : normalHalf),
      minY: 0,
      maxY: DOOR_LINTEL_H,
      blocksMovement: true,
      blocksLineOfSight: true,
    };
    return !isBreachV2PlacementBlocked([closedGate], occupant.x, occupant.z, radius);
  }

  const closingProgress = THREE.MathUtils.clamp(input.progress, 0, 1);
  const arcLength = (Math.PI / 2) * input.halfSpan * 2
    * closingProgress;
  const sampleSpacing = Math.max(0.05, radius * 0.4);
  const sampleCount = Math.max(1, Math.ceil(arcLength / sampleSpacing));
  for (let index = 0; index <= sampleCount; index += 1) {
    const progress = closingProgress * (index / sampleCount);
    const leaf = buildBreachV2DoorLeafCollider({
      id: `${input.id}:closure-sweep`,
      x: input.x,
      z: input.z,
      closedYaw: input.closedYaw,
      progress,
      halfThickness: input.halfThickness,
      halfSpan: input.halfSpan,
    });
    if (isBreachV2PlacementBlocked([leaf], occupant.x, occupant.z, radius)) return false;
  }
  return true;
}

export function auditBreachV2SpatialContracts(
  scene: THREE.Scene,
  colliders: readonly BreachV2PlanarCollider[],
): BreachV2SpatialContractAudit {
  scene.updateMatrixWorld(true);
  const renderables: THREE.Object3D[] = [];
  scene.traverse((object) => {
    if (isBreachV2DynamicallyRemoved(object)) return;
    if (
      object instanceof THREE.Mesh
      || object instanceof THREE.Line
      || object instanceof THREE.Points
      || object instanceof THREE.Sprite
    ) renderables.push(object);
  });
  const unresolved = new Set<string>();
  const contractRoots = new Set<THREE.Object3D>();
  let classifiedRenderableCount = 0;
  let excludedRenderableCount = 0;
  const objectPath = (object: THREE.Object3D): string => {
    const names: string[] = [];
    let cursor: THREE.Object3D | null = object;
    while (cursor && !(cursor instanceof THREE.Scene)) {
      names.unshift(cursor.name || cursor.type);
      cursor = cursor.parent;
    }
    return names.join("/");
  };
  for (const renderable of renderables) {
    let cursor: THREE.Object3D | null = renderable;
    let contractRoot: THREE.Object3D | null = null;
    let excluded = false;
    while (cursor && !(cursor instanceof THREE.Scene)) {
      if (cursor.userData.spatialAuditExcluded) {
        excluded = true;
        break;
      }
      if (typeof cursor.userData.collisionMode === "string") {
        contractRoot = cursor;
        break;
      }
      cursor = cursor.parent;
    }
    if (excluded) {
      excludedRenderableCount += 1;
      continue;
    }
    if (!contractRoot) {
      unresolved.add(objectPath(renderable));
      continue;
    }
    classifiedRenderableCount += 1;
    contractRoots.add(contractRoot);
  }

  const explainedColliderIds = new Set<string>();
  const blockingRenderOwnerIds = new Set<string>();
  const missingBlockingColliderOwnerIds = new Set<string>();
  const unexpectedMovementColliderOwnerIds = new Set<string>();
  const missingLineOfSightColliderOwnerIds = new Set<string>();
  const unexpectedLineOfSightColliderOwnerIds = new Set<string>();
  const missingCameraColliderOwnerIds = new Set<string>();
  const unexpectedCameraColliderOwnerIds = new Set<string>();
  const postFitProxyMismatchOwnerIds = new Set<string>();
  const postFitGroups = new Map<string, {
    roots: Set<THREE.Object3D>;
    colliders: Map<string, BreachV2PlanarCollider>;
    mode: NonNullable<BreachV2SpatialContract["postFitAuditMode"]>;
  }>();
  const tolerance = 0.12;
  for (const root of contractRoots) {
    const contract = root.userData as BreachV2SpatialContract;
    const matchingColliders = colliders.filter((collider) => (
      (contract.collisionId !== undefined && collider.id === contract.collisionId)
      || (contract.collisionIdPrefix !== undefined && collider.id.startsWith(contract.collisionIdPrefix))
      || (contract.colliderOwnerClass !== undefined && collider.ownerClass === contract.colliderOwnerClass)
    ));
    matchingColliders.forEach((collider) => explainedColliderIds.add(collider.id));
    const movementColliders = matchingColliders.filter((collider) => collider.blocksMovement !== false);
    const lineOfSightColliders = matchingColliders.filter((collider) => collider.blocksLineOfSight);
    const cameraColliders = matchingColliders.filter((collider) => (
      collider.blocksCamera ?? collider.blocksLineOfSight
    ));
    if (contract.blocksMovement) {
      blockingRenderOwnerIds.add(contract.spatialOwnerId);
      if (movementColliders.length === 0) {
        missingBlockingColliderOwnerIds.add(contract.spatialOwnerId);
      }
    } else if (movementColliders.length > 0) {
      unexpectedMovementColliderOwnerIds.add(contract.spatialOwnerId);
    }
    if (contract.blocksLineOfSight) {
      if (lineOfSightColliders.length === 0) {
        missingLineOfSightColliderOwnerIds.add(contract.spatialOwnerId);
      }
    } else if (lineOfSightColliders.length > 0) {
      unexpectedLineOfSightColliderOwnerIds.add(contract.spatialOwnerId);
    }
    if (contract.blocksCamera === true) {
      if (cameraColliders.length === 0) {
        missingCameraColliderOwnerIds.add(contract.spatialOwnerId);
      }
    } else if (contract.blocksCamera === false && cameraColliders.length > 0) {
      unexpectedCameraColliderOwnerIds.add(contract.spatialOwnerId);
    }

    if (matchingColliders.length === 0) continue;
    const mode = contract.postFitAuditMode
      ?? (contract.colliderOwnerClass === "shell" ? "shell-topology" : "exact");
    if (mode === "shell-topology") continue;
    const group = postFitGroups.get(contract.spatialOwnerId) ?? {
      roots: new Set<THREE.Object3D>(),
      colliders: new Map<string, BreachV2PlanarCollider>(),
      mode,
    };
    group.roots.add(root);
    matchingColliders.forEach((collider) => group.colliders.set(collider.id, collider));
    if (mode === "compound-envelope") group.mode = mode;
    postFitGroups.set(contract.spatialOwnerId, group);
  }

  for (const [spatialOwnerId, group] of postFitGroups) {
    const renderBounds = new THREE.Box3();
    for (const root of group.roots) {
      forEachWorldGeometryCorner([root], (corner, renderable) => {
        let owner: THREE.Object3D | null = renderable;
        while (owner && !(owner instanceof THREE.Scene)) {
          if (typeof owner.userData.collisionMode === "string") break;
          owner = owner.parent;
        }
        if (owner === root) renderBounds.expandByPoint(corner);
      });
    }
    if (renderBounds.isEmpty()) continue;
    // Compound frames are compared by their complete outer envelope; shell
    // spans are excluded above because their parity is proven boundary-by-
    // boundary rather than against one merged render mesh.
    const proxyBounds = [...group.colliders.values()].reduce((bounds, collider) => ({
      minX: Math.min(bounds.minX, collider.minX),
      maxX: Math.max(bounds.maxX, collider.maxX),
      minZ: Math.min(bounds.minZ, collider.minZ),
      maxZ: Math.max(bounds.maxZ, collider.maxZ),
      minY: Math.min(bounds.minY, collider.minY),
      maxY: Math.max(bounds.maxY, collider.maxY),
    }), {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    });
    const groupTolerance = group.mode === "compound-envelope" ? 0.18 : tolerance;
    const renderOutsideProxy = (
      renderBounds.min.x < proxyBounds.minX - groupTolerance
      || renderBounds.max.x > proxyBounds.maxX + groupTolerance
      || renderBounds.min.z < proxyBounds.minZ - groupTolerance
      || renderBounds.max.z > proxyBounds.maxZ + groupTolerance
      || renderBounds.min.y < proxyBounds.minY - groupTolerance
      || renderBounds.max.y > proxyBounds.maxY + groupTolerance
    );
    const proxyFarOutsideRender = (
      proxyBounds.minX < renderBounds.min.x - groupTolerance
      || proxyBounds.maxX > renderBounds.max.x + groupTolerance
      || proxyBounds.minZ < renderBounds.min.z - groupTolerance
      || proxyBounds.maxZ > renderBounds.max.z + groupTolerance
      || proxyBounds.minY < renderBounds.min.y - groupTolerance
      || proxyBounds.maxY > renderBounds.max.y + groupTolerance
    );
    if (renderOutsideProxy || proxyFarOutsideRender) {
      postFitProxyMismatchOwnerIds.add(spatialOwnerId);
    }
  }

  return {
    renderableCount: renderables.length - excludedRenderableCount,
    excludedRenderableCount,
    classifiedRenderableCount,
    unresolvedRenderableNames: [...unresolved].sort(),
    blockingRenderOwnerIds: [...blockingRenderOwnerIds].sort(),
    missingBlockingColliderOwnerIds: [...missingBlockingColliderOwnerIds].sort(),
    unexpectedMovementColliderOwnerIds: [...unexpectedMovementColliderOwnerIds].sort(),
    missingLineOfSightColliderOwnerIds: [...missingLineOfSightColliderOwnerIds].sort(),
    unexpectedLineOfSightColliderOwnerIds: [...unexpectedLineOfSightColliderOwnerIds].sort(),
    missingCameraColliderOwnerIds: [...missingCameraColliderOwnerIds].sort(),
    unexpectedCameraColliderOwnerIds: [...unexpectedCameraColliderOwnerIds].sort(),
    unexplainedColliderIds: colliders
      .filter((collider) => !explainedColliderIds.has(collider.id))
      .map((collider) => collider.id)
      .sort(),
    postFitProxyMismatchOwnerIds: [...postFitProxyMismatchOwnerIds].sort(),
  };
}

function roomWallHeight(room: BreachV2Layout["rooms"][number]): number {
  return room.kind === "boss" ? WALL_H_BOSS : room.kind === "start" ? WALL_H_GRAND : WALL_H;
}

function roomElevationAt(room: BreachV2Layout["rooms"][number], x: number): number {
  const progress = room.w > 0 ? THREE.MathUtils.clamp((x - room.x) / room.w, 0, 1) : 0;
  return THREE.MathUtils.lerp(room.floorElevation, room.endElevation, progress);
}

function connectionElevationAt(
  connection: BreachV2Layout["topology"]["connections"][number],
  point: BreachV2TopologyPoint,
): number {
  let nearest = { distance: Number.POSITIVE_INFINITY, elevation: connection.elevations[0] ?? 0 };
  for (let index = 0; index < connection.centerline.length - 1; index += 1) {
    const [ax, az] = connection.centerline[index]!;
    const [bx, bz] = connection.centerline[index + 1]!;
    const sample = segmentElevation(
      ax, az, bx, bz,
      connection.elevations[index]!, connection.elevations[index + 1]!,
      point[0], point[1],
    );
    if (sample.distance < nearest.distance) nearest = sample;
  }
  return nearest.elevation;
}

function boundaryVerticalEnvelope(
  layout: BreachV2Layout,
  boundary: BreachV2TopologyBoundary,
  point: BreachV2TopologyPoint,
): { base: number; top: number } {
  const adjoiningRooms = layout.rooms.filter((room) => (
    room.id === boundary.owner || room.id === boundary.adjacentTo
  ));
  if (adjoiningRooms.length > 0) {
    const bases = adjoiningRooms.map((room) => roomElevationAt(room, point[0]));
    const tops = adjoiningRooms.map((room, index) => bases[index]! + roomWallHeight(room));
    return { base: Math.min(...bases), top: Math.max(...tops) };
  }
  const connectorId = boundary.owner.startsWith("connector:")
    ? boundary.owner.slice("connector:".length)
    : null;
  const connection = connectorId
    ? layout.topology.connections.find((candidate) => candidate.edgeId === connectorId)
    : layout.topology.connections.find((candidate) => (
      candidate.sourceBoundaryId === boundary.boundaryId
      || candidate.destinationBoundaryId === boundary.boundaryId
    ));
  const base = connection ? connectionElevationAt(connection, point) : 0;
  return { base, top: base + WALL_H };
}

// ---------------------------------------------------------------------------
// shell: floors + walls with door gaps + corridors (mirrors the Houdini build)
// ---------------------------------------------------------------------------
function buildShell(layout: BreachV2Layout, materials: { flagstone: THREE.MeshStandardMaterial; masonry: THREE.MeshStandardMaterial }): THREE.Group {
  const shell = new THREE.Group();
  shell.name = "breach-v2-shell";
  const rooms = layout.rooms;
  const corridors = layout.corridors;

  // ---- geometry buckets merged per material (draw-call discipline) ----------
  const buckets = {
    flagstone: [] as THREE.BufferGeometry[],
    solidMasonry: [] as THREE.BufferGeometry[],
    lintelMasonry: [] as THREE.BufferGeometry[],
  };
  const pushBox = (bucket: THREE.BufferGeometry[], w: number, h: number, d: number,
                   cx: number, cy: number, cz: number): void => {
    const geometry = new THREE.BoxGeometry(w, h, d);
    scaleBoxUV(geometry, w, h, d);
    geometry.translate(cx, cy, cz);
    bucket.push(geometry);
  };
  const pushWallSpan = (
    start: BreachV2TopologyPoint,
    end: BreachV2TopologyPoint,
    height: number,
    baseY: number,
    thickness: number,
    bucket: THREE.BufferGeometry[],
  ): void => {
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const length = Math.hypot(dx, dz);
    if (length < 0.01 || height < 0.01) return;
    const geometry = new THREE.BoxGeometry(length, height, thickness);
    scaleBoxUV(geometry, length, height, thickness);
    geometry.rotateY(-Math.atan2(dz, dx));
    geometry.translate(
      (start[0] + end[0]) / 2,
      baseY + height / 2,
      (start[1] + end[1]) / 2,
    );
    bucket.push(geometry);
  };
  let stairTreadCount = 0;
  const addSteppedRun = (
    ax: number,
    az: number,
    bx: number,
    bz: number,
    width: number,
    fromElevation: number,
    toElevation: number,
  ): void => {
    const length = Math.hypot(bx - ax, bz - az);
    if (length < 0.01) return;
    const rise = Math.abs(toElevation - fromElevation);
    const steps = rise < 0.01 ? 1 : Math.max(2, Math.ceil(rise / 0.18));
    const vertical = Math.abs(bx - ax) < 0.01;
    for (let index = 0; index < steps; index += 1) {
      const p0 = index / steps;
      const p1 = (index + 1) / steps;
      const elevation = THREE.MathUtils.lerp(fromElevation, toElevation, steps === 1 ? 0 : index / (steps - 1));
      const cx = THREE.MathUtils.lerp(ax, bx, (p0 + p1) / 2);
      const cz = THREE.MathUtils.lerp(az, bz, (p0 + p1) / 2);
      const run = length / steps + 0.03;
      pushBox(
        buckets.flagstone,
        vertical ? width : run,
        FLOOR_T,
        vertical ? run : width,
        cx,
        elevation - FLOOR_T / 2,
        cz,
      );
    }
    if (steps > 1) stairTreadCount += steps;
  };

  for (const room of rooms) {
    const { x: rx, z: rz, w: rw, h: rh } = room;
    if (Math.abs(room.endElevation - room.floorElevation) < 0.01) {
      pushBox(buckets.flagstone, rw + WALL_T * 2, FLOOR_T, rh + WALL_T * 2, rx + rw / 2, room.floorElevation - FLOOR_T / 2, rz + rh / 2);
    } else {
      addSteppedRun(rx, rz + rh / 2, rx + rw, rz + rh / 2, rh + WALL_T * 2, room.floorElevation, room.endElevation);
    }
  }

  for (const corridor of corridors) {
    const pts = corridor.points;
    const w = corridor.width;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const [ax, az] = pts[i]!;
      const [bx, bz] = pts[i + 1]!;
      if (Math.hypot(bx - ax, bz - az) < 0.01) continue;
      const fromElevation = corridor.elevations[i]!;
      const toElevation = corridor.elevations[i + 1]!;
      addSteppedRun(ax, az, bx, bz, w + WALL_T * 2, fromElevation, toElevation);
    }
  }

  let canonicalWallSpanCount = 0;
  let canonicalLintelSpanCount = 0;
  for (const boundary of layout.topology.boundaries) {
    const split = splitBreachV2Boundary(boundary);
    for (const span of split.solidSpans) {
      const spanLength = span.endDistance - span.startDistance;
      const slices = Math.max(1, Math.ceil(spanLength / 1.2));
      for (let index = 0; index < slices; index += 1) {
        const p0 = index / slices;
        const p1 = (index + 1) / slices;
        const start: BreachV2TopologyPoint = [
          THREE.MathUtils.lerp(span.start[0], span.end[0], p0),
          THREE.MathUtils.lerp(span.start[1], span.end[1], p0),
        ];
        const end: BreachV2TopologyPoint = [
          THREE.MathUtils.lerp(span.start[0], span.end[0], p1),
          THREE.MathUtils.lerp(span.start[1], span.end[1], p1),
        ];
        const midpoint: BreachV2TopologyPoint = [
          (start[0] + end[0]) / 2,
          (start[1] + end[1]) / 2,
        ];
        const envelope = boundaryVerticalEnvelope(layout, boundary, midpoint);
        pushWallSpan(
          start,
          end,
          envelope.top - envelope.base,
          envelope.base,
          boundary.thickness,
          buckets.solidMasonry,
        );
        canonicalWallSpanCount += 1;
      }
    }
    for (const span of split.apertureSpans) {
      const midpoint: BreachV2TopologyPoint = [
        (span.start[0] + span.end[0]) / 2,
        (span.start[1] + span.end[1]) / 2,
      ];
      const envelope = boundaryVerticalEnvelope(layout, boundary, midpoint);
      const lintelBase = envelope.base + getBreachV2ApertureSpanClearHeight(boundary, span.apertureIds);
      if (envelope.top - lintelBase <= 0.05) continue;
      pushWallSpan(
        span.start,
        span.end,
        envelope.top - lintelBase,
        lintelBase,
        boundary.thickness,
        buckets.lintelMasonry,
      );
      canonicalLintelSpanCount += 1;
    }
  }

  for (const ascent of sharedAscents(layout)) {
    if (ascent.axis === "x") {
      addSteppedRun(ascent.from, ascent.along, ascent.to, ascent.along, ascent.width, ascent.fromElevation, ascent.toElevation);
    }
  }

  // merge buckets into single meshes per material
  const flagstoneMesh = new THREE.Mesh(mergeGeometries(buckets.flagstone), materials.flagstone);
  flagstoneMesh.name = "shell-floors";
  flagstoneMesh.userData = { stairTreadCount };
  setSpatialContract(flagstoneMesh, {
    spatialOwnerId: "shell:walkable-surfaces",
    collisionMode: "traversable-surface",
    blocksMovement: false,
    blocksLineOfSight: false,
    contractReason: "Walkable floor and stair surfaces are governed by the canonical nav-floor predicate.",
  });
  flagstoneMesh.receiveShadow = true;
  shell.add(flagstoneMesh);
  const masonryMesh = new THREE.Mesh(mergeGeometries(buckets.solidMasonry), materials.masonry);
  masonryMesh.name = "shell-walls";
  masonryMesh.castShadow = true;
  masonryMesh.receiveShadow = true;
  masonryMesh.userData = {
    topologyPolicyId: layout.topology.policyId,
    topologyGate: layout.topology.automatedGate,
    canonicalBoundaryCount: layout.topology.boundaries.length,
    canonicalWallSpanCount,
  };
  setSpatialContract(masonryMesh, {
    spatialOwnerId: "shell:canonical-boundaries",
    collisionMode: "static-solid",
    blocksMovement: true,
    blocksLineOfSight: true,
    collisionIdPrefix: "shell:",
    postFitAuditMode: "shell-topology",
  });
  shell.add(masonryMesh);
  const lintelMesh = new THREE.Mesh(mergeGeometries(buckets.lintelMasonry), materials.masonry);
  lintelMesh.name = "shell-lintels";
  lintelMesh.castShadow = true;
  lintelMesh.receiveShadow = true;
  lintelMesh.userData = { canonicalLintelSpanCount };
  setSpatialContract(lintelMesh, {
    spatialOwnerId: "shell:aperture-lintels",
    collisionMode: "camera-only-overhead",
    blocksMovement: false,
    blocksLineOfSight: false,
    blocksCamera: true,
    collisionIdPrefix: "camera:shell:lintel:",
    postFitAuditMode: "shell-topology",
    contractReason: "Canonical aperture lintels are actor-nonblocking but camera-solid while their masonry is visible.",
  });
  shell.add(lintelMesh);

  // Room and corridor ceilings (dark timber-stone caps) read as a continuous
  // dungeon shell at eye level and cut away together when the review camera
  // rises (see the render loop toggle).
  const ceilingGeos: THREE.BufferGeometry[] = [];
  for (const room of rooms) {
    const wallH = room.kind === "boss" ? WALL_H_BOSS : room.kind === "start" ? WALL_H_GRAND : WALL_H;
    const g = new THREE.BoxGeometry(room.w + WALL_T * 2, 0.25, room.h + WALL_T * 2);
    scaleBoxUV(g, room.w, 0.25, room.h);
    g.translate(room.x + room.w / 2, Math.max(room.floorElevation, room.endElevation) + wallH + 0.125, room.z + room.h / 2);
    ceilingGeos.push(g);
  }
  let corridorCeilingSegmentCount = 0;
  for (const corridor of corridors) {
    const pts = corridor.points;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const [ax, az] = pts[i]!;
      const [bx, bz] = pts[i + 1]!;
      const length = Math.hypot(bx - ax, bz - az);
      if (length < 0.01) continue;
      const vertical = Math.abs(bx - ax) < 0.01;
      const width = vertical ? corridor.width + WALL_T * 2 : length;
      const depth = vertical ? length : corridor.width + WALL_T * 2;
      const g = new THREE.BoxGeometry(width, 0.25, depth);
      scaleBoxUV(g, width, 0.25, depth);
      g.translate((ax + bx) / 2, Math.max(corridor.elevations[i]!, corridor.elevations[i + 1]!) + WALL_H + 0.125, (az + bz) / 2);
      ceilingGeos.push(g);
      corridorCeilingSegmentCount += 1;
    }
  }
  const ceilingMat = new THREE.MeshStandardMaterial({
    map: materials.masonry.map,
    emissiveMap: materials.masonry.map,
    roughness: 0.96,
    metalness: 0.0,
    color: 0x6b6258,
    emissive: 0x241f1a,
    emissiveIntensity: 0.34,
    side: THREE.DoubleSide,
  });
  const ceilings = new THREE.Mesh(mergeGeometries(ceilingGeos), ceilingMat);
  ceilings.name = "shell-ceilings";
  ceilings.castShadow = false;
  ceilings.receiveShadow = true;
  ceilings.userData = {
    roomCapCount: rooms.length,
    corridorCapCount: corridorCeilingSegmentCount,
  };
  setSpatialContract(ceilings, {
    spatialOwnerId: "shell:overhead-caps",
    collisionMode: "camera-only-overhead",
    blocksMovement: false,
    blocksLineOfSight: false,
    blocksCamera: true,
    collisionIdPrefix: "camera:shell:ceiling:",
    postFitAuditMode: "shell-topology",
    contractReason: "Ceiling caps are actor-nonblocking and camera-solid only while the non-isometric cutaway keeps them visible.",
  });
  shell.add(ceilings);

  // void undercroft
  const bx0 = Math.min(...rooms.map((r) => r.x)) - 4;
  const bx1 = Math.max(...rooms.map((r) => r.x + r.w)) + 4;
  const bz0 = Math.min(...rooms.map((r) => r.z)) - 4;
  const bz1 = Math.max(...rooms.map((r) => r.z + r.h)) + 4;
  const voidMesh = new THREE.Mesh(
    new THREE.BoxGeometry(bx1 - bx0, 3, bz1 - bz0),
    new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.95 }),
  );
  voidMesh.position.set((bx0 + bx1) / 2, -1.8, (bz0 + bz1) / 2);
  voidMesh.receiveShadow = true;
  setSpatialContract(voidMesh, {
    spatialOwnerId: "shell:void-undercroft",
    collisionMode: "nonwalkable-background",
    blocksMovement: false,
    blocksLineOfSight: false,
    contractReason: "The undercroft is visual background below every canonical floor surface.",
  });
  shell.add(voidMesh);
  return shell;
}

/** Boss cover is tagged for the later combat/destruction pass. */
function buildArchitecturalPolish(
  scene: THREE.Scene,
  layout: BreachV2Layout,
  materials: { flagstone: THREE.MeshStandardMaterial; masonry: THREE.MeshStandardMaterial },
): BreachV2RuntimeEnvironmentObject[] {
  const environmentObjects: BreachV2RuntimeEnvironmentObject[] = [];
  const group = new THREE.Group();
  group.name = "breach-v2-architectural-polish";
  scene.add(group);

  const bossRoom = layout.rooms.find((room) => room.kind === "boss");
  const coverPlacements = layout.placements
    .map((placement, placementIndex) => ({ placement, placementIndex }))
    .filter(({ placement }) => placement.asset === "boss-cover-pillar");
  if (bossRoom && coverPlacements.length > 0) {
    const cover = new THREE.Group();
    cover.name = "boss-destructible-cover";
    const cx = bossRoom.x + bossRoom.w / 2;
    const cz = bossRoom.z + bossRoom.h / 2;
    cover.position.set(cx, bossRoom.floorElevation, cz);
    cover.userData = {
      combatCoverSet: true,
      lineOfSightBlockerCount: coverPlacements.length,
      authoritativeInventory: true,
    };
    for (const [index, { placement, placementIndex }] of coverPlacements.entries()) {
      const pillar = new THREE.Group();
      pillar.name = `destructible-pillar-${index + 1}`;
      pillar.position.set(placement.x - cx, 0, placement.z - cz);
      pillar.userData = {
        destructible: true,
        hitPoints: 120,
        combatCover: true,
        blocksLineOfSight: true,
        collisionId: `${placement.roomId}:${placement.asset}:${placementIndex}`,
      };
      setSpatialContract(pillar, {
        spatialOwnerId: `${placement.roomId}:${placement.asset}:${placementIndex}`,
        collisionMode: "destructible-solid",
        blocksMovement: true,
        blocksLineOfSight: true,
        collisionId: `${placement.roomId}:${placement.asset}:${placementIndex}`,
      });
      const base = texturedBox(placement.footprint, 0.42, placement.footprint, materials.masonry);
      base.position.y = 0.21;
      const shaft = texturedBox(1.08, 2.45, 1.08, materials.masonry);
      shaft.position.y = 1.62;
      const capital = texturedBox(1.55, 0.38, 1.55, materials.masonry);
      capital.position.y = 3.03;
      pillar.add(base, shaft, capital);
      cover.add(pillar);
      environmentObjects.push({
        id: `${placement.roomId}:${placement.asset}:${placementIndex}`,
        label: "boss cover pillar",
        destructionClass: "DESTRUCTIBLE_SOLID_PROP",
        durability: 120,
        x: placement.x,
        z: placement.z,
        root: pillar,
        coffer: false,
      });
    }
    group.add(cover);
  }
  return environmentObjects;
}

interface SectionDoorSystem {
  tickables: ((elapsed: number) => void)[];
  cullables: THREE.Object3D[];
  interactionRoots: THREE.Object3D[];
  isBlocked(x: number, z: number, radius: number): boolean;
  getCollisionBlockers(): BreachV2PlanarCollider[];
  setAllOpen(open: boolean): void;
  ensureNearestOpen(x: number, z: number, maxDistance?: number): string | null;
  toggleNearest(x: number, z: number, maxDistance?: number): string | null;
  toggleHit(
    playerX: number,
    playerZ: number,
    hitObject: THREE.Object3D,
    maxPlayerDistance?: number,
  ): string | null;
  toggleAt(
    playerX: number,
    playerZ: number,
    targetX: number,
    targetZ: number,
    maxPlayerDistance?: number,
    maxTargetDistance?: number,
  ): string | null;
}

/** Use authored 3DAI Studio doors and portcullises at section boundaries. */
async function placeSectionDoors(
  scene: THREE.Scene,
  layout: BreachV2Layout,
  loader: GLTFLoader,
  authorizeDoor: (doorId: string) => boolean,
  getOccupantPosition: () => { x: number; z: number } | null,
): Promise<SectionDoorSystem> {
  const doorSpec = DUNGEON_PROP_ASSETS["heavy-door"];
  const gateSpec = DUNGEON_PROP_ASSETS["rusted-portcullis"];
  const [doorGltf, gateGltf] = await Promise.all([
    loader.loadAsync(doorSpec.sourceUrl),
    loader.loadAsync(gateSpec.sourceUrl),
  ]);
  const doors = layout.sectionPortals;

  const tickables: ((elapsed: number) => void)[] = [];
  const routeMists: THREE.Object3D[] = [];
  const routeMistByDoorId = new Map<string, {
    mesh: THREE.Mesh;
    material: THREE.ShaderMaterial;
    closedOpacity: number;
  }>();
  const states: {
    id: string;
    x: number;
    z: number;
    axis: "x" | "z";
    clearWidth: number;
    clearHeight: number;
    frontNormal: { x: number; z: number };
    closedYaw: number;
    floorY: number;
    root: THREE.Group;
    frameRoot: THREE.Group | null;
    kind: "door" | "gate";
    active: boolean;
    open: boolean;
    progress: number;
    leafHalfThickness: number;
    leafHalfSpan: number;
    leafHeight: number;
    leafVerticalOffset: number;
    closedLeafOffset: THREE.Vector3;
    collisionBlocker: BreachV2PlanarCollider;
  }[] = [];
  for (const [index, door] of doors.entries()) {
    const floorY = floorElevationAt(layout, door.x, door.z);
    const { kind, active } = door;
    const sourceSpec = kind === "door" ? doorSpec : gateSpec;
    const sourceScene = kind === "door" ? doorGltf.scene : gateGltf.scene;
    const instance = instantiateDungeonProp(sourceScene, sourceSpec, index * 0.23);
    const sourceModel = instance.root.getObjectByName(`${sourceSpec.id}-model`);
    let leafHalfThickness = 0.4;
    let leafHalfSpan = door.clearWidth / 2 + 0.05;
    let leafHeight = DOOR_LINTEL_H + 0.08;
    let leafVerticalOffset = 0;
    let modelVerticalOffset = 0;
    let leafHingeLocalZ = -leafHalfSpan;
    let fittedArtifactWidth = leafHalfSpan * 2;
    let fittedArtifactHeight = leafHeight;
    let frameRoot: THREE.Group | null = null;
    let frameTriangleCount = 0;
    let leafTriangleCount = 0;
    if (kind === "door" && !sourceModel) {
      throw new Error(`BREACH-V2 imported heavy-door model root is missing for ${door.id}`);
    }
    if (kind === "door" && sourceModel) {
      // DungeonPropKit already applies the catalog's uniform 3 m fit. Preserve
      // that authored aspect ratio and let topology fit masonry to the asset.
      // The imported artifact is one connected mesh, so partition its authored
      // perimeter from the central leaf before applying hinge animation. This
      // keeps the outer frame seated in masonry while the original wood,
      // handle, lock, straps, and leaf-side hinge hardware swing together.
      sourceModel.visible = true;
      sourceModel.updateMatrixWorld(true);
      const partition = partitionHeavyDungeonDoor(sourceModel);
      const fittedSize = partition.fullBounds.getSize(new THREE.Vector3());
      const fittedLeafSize = partition.leafBounds.getSize(new THREE.Vector3());
      fittedArtifactWidth = fittedSize.z;
      fittedArtifactHeight = fittedSize.y;
      modelVerticalOffset = Math.max(0, (door.clearHeight - fittedSize.y) / 2);
      leafHalfThickness = fittedLeafSize.x / 2;
      leafHalfSpan = fittedLeafSize.z / 2;
      leafHeight = fittedLeafSize.y;
      leafVerticalOffset = modelVerticalOffset + partition.leafBounds.min.y;
      leafHingeLocalZ = partition.leafBounds.min.z;
      frameTriangleCount = partition.frameTriangleCount;
      leafTriangleCount = partition.leafTriangleCount;
      sourceModel.parent?.remove(sourceModel);
      partition.leaf.name = "heavy-door-moving-leaf";
      instance.root.add(partition.leaf);
      frameRoot = new THREE.Group();
      frameRoot.name = `section-door-frame-${door.id}`;
      partition.frame.name = "heavy-door-stationary-frame";
      frameRoot.add(partition.frame);
      const topRailHeight = fittedSize.y * (1 - HEAVY_DUNGEON_DOOR_FRAME_LIMITS.top) / 2;
      const topRailDepth = Math.min(0.22, fittedSize.x * 0.55);
      const topRailGeometry = new THREE.BoxGeometry(
        topRailDepth,
        topRailHeight,
        fittedSize.z,
      );
      const topRailMaterial = new THREE.MeshStandardMaterial({
        color: 0x211b17,
        metalness: 0.78,
        roughness: 0.58,
      });
      const topRail = new THREE.Mesh(topRailGeometry, topRailMaterial);
      topRail.name = "heavy-door-clean-top-rail";
      topRail.position.set(0, fittedSize.y - topRailHeight / 2, 0);
      topRail.castShadow = true;
      topRail.receiveShadow = true;
      topRail.userData.disposableGeometries = [topRailGeometry];
      topRail.userData.disposableMaterials = [topRailMaterial];
      frameRoot.add(topRail);
      partition.leaf.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          material.side = THREE.DoubleSide;
          material.needsUpdate = true;
        });
      });
      partition.frame.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          material.side = THREE.DoubleSide;
          material.needsUpdate = true;
        });
      });
    } else if (kind === "gate" && sourceModel) {
      // The height-constrained catalog fit leaves this particular source GLB
      // only ~2.17 m wide. Widen its dominant horizontal axis so the metal
      // overlaps the canonical stone jambs instead of leaving daylight seams.
      sourceModel.updateMatrixWorld(true);
      const size = new THREE.Box3().setFromObject(sourceModel, true).getSize(new THREE.Vector3());
      const targetWidth = door.clearWidth + 0.08;
      if (size.z >= size.x) sourceModel.scale.z *= targetWidth / Math.max(size.z, 0.001);
      else sourceModel.scale.x *= targetWidth / Math.max(size.x, 0.001);
      sourceModel.updateMatrixWorld(true);
      const fittedSize = new THREE.Box3().setFromObject(sourceModel, true).getSize(new THREE.Vector3());
      leafHalfThickness = Math.min(fittedSize.x, fittedSize.z) / 2;
      leafHalfSpan = Math.max(fittedSize.x, fittedSize.z) / 2;
      leafHeight = fittedSize.y;
      fittedArtifactWidth = leafHalfSpan * 2;
      fittedArtifactHeight = leafHeight;
    }
    const closedYaw = kind === "door"
      ? getBreachV2ClosedDoorYaw(door.frontNormal)
      : door.axis === "x" ? 0 : Math.PI / 2;
    const fittedWidth = fittedArtifactWidth;
    const fittedThickness = leafHalfThickness * 2;
    const jambClearancePerSide = (door.clearWidth - fittedWidth) / 2;
    const lintelClearance = (door.clearHeight - fittedArtifactHeight) / 2;
    const pivot = new THREE.Group();
    pivot.name = `section-${kind}-${door.id}`;
    pivot.userData = {
      ...instance.root.userData,
      connectorId: door.id,
      state: active ? "closed" : "sealed",
      openProgress: 0,
      blocksMovement: true,
      blocksAperture: true,
      blocksLineOfSight: true,
      collisionMode: "dynamic-solid",
      spatialOwnerId: `portal:${door.id}`,
      collisionId: `portal:${door.id}:leaf`,
      activeRouteDoor: active,
      portalKind: kind,
      sourceAsset: kind === "door" ? "heavy-door.glb" : "rusted-portcullis.glb",
      portalX: door.x,
      portalZ: door.z,
      portalAxis: door.axis,
      frontNormal: { ...door.frontNormal },
      closedYaw,
      apertureId: door.apertureId,
      boundaryId: door.boundaryId,
      clearWidth: door.clearWidth,
      clearHeight: door.clearHeight,
      fittedWidth,
      fittedHeight: fittedArtifactHeight,
      fittedThickness,
      fittedLeafWidth: leafHalfSpan * 2,
      fittedLeafHeight: leafHeight,
      frameTriangleCount,
      leafTriangleCount,
      sourceAspect: kind === "door"
        ? BREACH_V2_HEAVY_DOOR_SOURCE_BOUNDS.width / BREACH_V2_HEAVY_DOOR_SOURCE_BOUNDS.height
        : null,
      fittedAspect: fittedWidth / Math.max(fittedArtifactHeight, 0.001),
      apertureClearWidth: door.clearWidth,
      apertureClearHeight: door.clearHeight,
      jambClearancePerSide,
      lintelClearance,
      floorElevation: floorY,
      postFitColliderHalfThickness: leafHalfThickness,
      postFitColliderHalfSpan: leafHalfSpan,
      postFitColliderHeight: leafHeight,
    };
    instance.root.name = `section-${kind}-leaf-${door.id}`;
    pivot.rotation.y = closedYaw;
    const closedLeafOffset = new THREE.Vector3(0, 0, leafHalfSpan)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), closedYaw);
    if (kind === "door") {
      // Swing only the central leaf around the jamb-side hinge. The frame is
      // mounted separately below and never inherits this pivot rotation.
      pivot.position.set(door.x - closedLeafOffset.x, floorY, door.z - closedLeafOffset.z);
      instance.root.position.set(0, modelVerticalOffset, -leafHingeLocalZ);
      if (frameRoot) {
        frameRoot.position.set(door.x, floorY + modelVerticalOffset, door.z);
        frameRoot.rotation.y = closedYaw;
        frameRoot.userData = {
          connectorId: door.id,
          portalKind: kind,
          sourceAsset: "heavy-door.glb",
          state: "stationary-frame",
          frameTriangleCount,
          spatialOwnerId: `portal:${door.id}:frame`,
          collisionMode: "shell-owned-stationary-frame",
          blocksMovement: false,
          blocksLineOfSight: false,
          blocksCamera: false,
          contractReason: "The imported perimeter stays seated over canonical masonry; the shell jamb and lintel own its static collision.",
        };
      }
    } else {
      // Portcullises sit centered in the opening and lift into the lintel.
      // Their open motion is vertical; they never rotate like a hinged leaf.
      pivot.position.set(door.x, floorY, door.z);
      instance.root.position.set(0, 0, 0);
    }
    const collisionBlocker: BreachV2PlanarCollider = kind === "door"
      ? buildBreachV2DoorLeafCollider({
        id: door.id,
        x: door.x,
        z: door.z,
        closedYaw,
        progress: 0,
        halfThickness: leafHalfThickness,
        halfSpan: leafHalfSpan,
        minY: floorY + leafVerticalOffset,
        maxY: floorY + leafVerticalOffset + leafHeight,
      })
      : {
        id: `portal:${door.id}:leaf`,
        asset: "rusted-portcullis",
        roomId: door.id,
        ownerClass: "portal",
        shape: "aabb",
        minX: door.x - (door.axis === "x" ? leafHalfThickness : leafHalfSpan),
        maxX: door.x + (door.axis === "x" ? leafHalfThickness : leafHalfSpan),
        minZ: door.z - (door.axis === "x" ? leafHalfSpan : leafHalfThickness),
        maxZ: door.z + (door.axis === "x" ? leafHalfSpan : leafHalfThickness),
        minY: floorY,
        maxY: floorY + leafHeight,
        blocksMovement: true,
        blocksLineOfSight: true,
      };
    collisionBlocker.blocksCamera = true;
    pivot.add(instance.root);
    scene.add(pivot);
    if (frameRoot) scene.add(frameRoot);
    tickables.push(instance.animate);
    states.push({
      ...door,
      floorY,
      root: pivot,
      frameRoot,
      kind,
      active,
      open: false,
      progress: 0,
      closedYaw,
      leafHalfThickness,
      leafHalfSpan,
      leafHeight,
      leafVerticalOffset,
      closedLeafOffset,
      collisionBlocker,
    });

    if (door.routeChoice) {
      const smokeMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: active ? 0.78 : 0.96 },
          uTint: {
            value: new THREE.Color(door.id === "wayfarer-choice" ? 0x46d9e8 : 0xe86a3c),
          },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float uTime;
          uniform float uOpacity;
          uniform vec3 uTint;
          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
          }
          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
              mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
          }
          void main() {
            vec2 flow = vec2(vUv.x * 3.8 + sin(vUv.y * 7.0 + uTime) * 0.2,
              vUv.y * 5.2 - uTime * 0.18);
            float smoke = noise(flow) * 0.55 + noise(flow * 2.1 + 4.0) * 0.3;
            float wisp = pow(0.5 + 0.5 * sin(
              vUv.y * 31.0 - uTime * 2.1 + noise(vec2(vUv.x * 7.0, uTime * 0.08)) * 8.0
            ), 7.0);
            float shimmer = pow(0.5 + 0.5 * sin(
              vUv.x * 46.0 + vUv.y * 9.0 + uTime * 2.8
            ), 14.0) * (0.25 + smoke * 0.75);
            float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x)
              * smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
            vec3 color = mix(vec3(0.008, 0.006, 0.012), uTint, 0.20 + smoke * 0.63 + wisp * 0.14);
            color += uTint * shimmer * 0.22;
            gl_FragColor = vec4(color, uOpacity * edge * (0.17 + smoke * 0.66 + wisp * 0.12));
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const smoke = new THREE.Mesh(
        new THREE.PlaneGeometry(door.clearWidth + 0.18, DOOR_LINTEL_H + 0.08, 1, 1),
        smokeMaterial,
      );
      smoke.name = `route-mist-${door.id}`;
      smoke.position.set(door.x + (door.axis === "x" ? 0.34 : 0), floorY + (DOOR_LINTEL_H + 0.08) / 2,
        door.z + (door.axis === "z" ? 0.34 : 0));
      smoke.rotation.y = door.axis === "x" ? Math.PI / 2 : 0;
      smoke.userData = {
        activeRoute: active,
        connectorId: door.id,
        blocksMovement: false,
        blocksLineOfSight: false,
        collisionMode: "vfx-only",
        spatialOwnerId: `portal:${door.id}:route-mist`,
        contractReason: "Route mist is a visual state layer; the authored gate leaf owns collision.",
      };
      scene.add(smoke);
      routeMists.push(smoke);
      routeMistByDoorId.set(door.id, {
        mesh: smoke,
        material: smokeMaterial,
        closedOpacity: active ? 0.78 : 0.96,
      });
      tickables.push((elapsed) => { smokeMaterial.uniforms.uTime!.value = elapsed; });
    }
  }

  let lastDoorTickElapsed: number | null = null;
  tickables.push((elapsed) => {
    const delta = lastDoorTickElapsed === null
      ? 1 / 30
      : Math.min(0.5, Math.max(0, elapsed - lastDoorTickElapsed));
    lastDoorTickElapsed = elapsed;
    const animationAlpha = 1 - Math.exp(-5.5 * delta);
    for (const state of states) {
      let target = state.open ? 1 : 0;
      const occupant = getOccupantPosition();
      if (
        target === 0
        && state.active
        && !state.open
        && state.progress > 0.001
        && occupant
        && !isBreachV2PortalClosureSafe({
          kind: state.kind,
          id: state.id,
          x: state.x,
          z: state.z,
          axis: state.axis,
          closedYaw: state.closedYaw,
          clearWidth: state.clearWidth,
          progress: state.progress,
          halfThickness: state.leafHalfThickness,
          halfSpan: state.leafHalfSpan,
        }, occupant)
      ) {
        // Reverse before a descending gate or swinging leaf can overlap the
        // live capsule. Movement collision then keeps the occupant outside
        // the current leaf while this future-sweep guard keeps the leaf away.
        state.open = true;
        target = 1;
      }
      state.progress += (target - state.progress) * animationAlpha;
      if (Math.abs(target - state.progress) < 0.001) state.progress = target;
      if (state.kind === "door") {
        state.root.position.set(
          state.x - state.closedLeafOffset.x,
          state.floorY,
          state.z - state.closedLeafOffset.z,
        );
        state.root.rotation.y = state.closedYaw + state.progress * (Math.PI / 2);
      } else {
        state.root.position.set(state.x, state.floorY + state.progress * (state.clearHeight + 0.42), state.z);
        state.root.rotation.y = state.closedYaw;
      }
      state.root.userData.state = state.active ? (state.open ? "open" : "closed") : "sealed";
      state.root.userData.openProgress = state.progress;
      const gateBottomY = state.floorY + state.progress * (state.clearHeight + 0.42);
      const gateClearsCapsule = gateBottomY >= (
        state.floorY + PLAYER_CAPSULE_HEIGHT + PLAYER_CAPSULE_CLEARANCE
      );
      const blocksMovement = doesBreachV2PortalBlockMovement(state.kind, state.progress, gateClearsCapsule);
      const blocksActorLineOfSight = blocksMovement;
      const blocksAperture = blocksMovement;
      state.root.userData.blocksAperture = blocksAperture;
      // A raised portcullis and a fully seated hinged leaf leave the walk plane.
      // The static jamb/wall collider still owns the non-aperture boundary. The
      // raised gate remains a spatial object above the capsule for height-aware
      // camera/projectile queries, but it no longer blocks actor eye-level LOS.
      state.root.userData.blocksMovement = blocksMovement;
      state.root.userData.blocksLineOfSight = blocksActorLineOfSight;
      const blocker = state.collisionBlocker;
      if (state.kind === "gate") {
        blocker.minY = gateBottomY;
        blocker.maxY = gateBottomY + state.leafHeight;
        blocker.blocksCamera = true;
      } else {
        const yaw = state.closedYaw + state.progress * (Math.PI / 2);
        const hingeX = state.x - Math.sin(state.closedYaw) * state.leafHalfSpan;
        const hingeZ = state.z - Math.cos(state.closedYaw) * state.leafHalfSpan;
        const centerX = hingeX + Math.sin(yaw) * state.leafHalfSpan;
        const centerZ = hingeZ + Math.cos(yaw) * state.leafHalfSpan;
        const extentX = Math.abs(Math.cos(yaw)) * state.leafHalfThickness
          + Math.abs(Math.sin(yaw)) * state.leafHalfSpan;
        const extentZ = Math.abs(Math.sin(yaw)) * state.leafHalfThickness
          + Math.abs(Math.cos(yaw)) * state.leafHalfSpan;
        blocker.minX = centerX - extentX;
        blocker.maxX = centerX + extentX;
        blocker.minZ = centerZ - extentZ;
        blocker.maxZ = centerZ + extentZ;
        blocker.centerX = centerX;
        blocker.centerZ = centerZ;
        blocker.yaw = yaw;
        blocker.blocksCamera = blocksMovement;
      }
      blocker.blocksMovement = blocksMovement;
      blocker.blocksLineOfSight = blocksActorLineOfSight;
      const routeMist = routeMistByDoorId.get(state.id);
      if (routeMist) {
        // The inactive route remains visibly sealed. The chosen route's mist
        // follows the physical portal progress so an open route-choice door
        // never leaves an opaque phantom barrier across the aperture.
        const openFactor = state.active ? 1 - state.progress : 1;
        routeMist.material.uniforms.uOpacity!.value = routeMist.closedOpacity * openFactor;
        routeMist.mesh.userData.openProgress = state.progress;
      }
    }
  });

  const setOpen = (state: (typeof states)[number], open: boolean): boolean => {
    if (!state.active) {
      state.open = false;
      return false;
    }
    const occupant = getOccupantPosition();
    if (
      !open
      && occupant
      && !isBreachV2PortalClosureSafe({
        kind: state.kind,
        id: state.id,
        x: state.x,
        z: state.z,
        axis: state.axis,
        closedYaw: state.closedYaw,
        clearWidth: state.clearWidth,
        progress: state.progress,
        halfThickness: state.leafHalfThickness,
        halfSpan: state.leafHalfSpan,
      }, occupant)
    ) return false;
    state.open = open;
    return true;
  };
  const toggleState = (state: (typeof states)[number]): string | null => {
    if (!state.open && !authorizeDoor(state.id)) return state.id;
    return setOpen(state, !state.open) ? state.id : null;
  };
  // Keep portal collider identities stable. Rebuilding these objects every
  // animation frame created garbage-collection hitches exactly while a door
  // was opening; the animation tick now mutates only the changing bounds.
  const collisionBlockers = states.map((state) => state.collisionBlocker);
  const getCollisionBlockers = (): BreachV2PlanarCollider[] => collisionBlockers;
  return {
    tickables,
    cullables: [
      ...states.flatMap((state) => state.frameRoot ? [state.root, state.frameRoot] : [state.root]),
      ...routeMists,
    ],
    interactionRoots: states.flatMap((state) => (
      state.frameRoot ? [state.root, state.frameRoot] : [state.root]
    )),
    isBlocked: (x, z, radius) => isBreachV2PlacementBlocked(getCollisionBlockers(), x, z, radius),
    getCollisionBlockers,
    setAllOpen: (open) => states.forEach((state) => setOpen(state, open)),
    ensureNearestOpen: (x, z, maxDistance = 4.6) => {
      const nearest = states
        .map((state) => ({ state, distance: Math.hypot(state.x - x, state.z - z) }))
        // A path planned through an open aperture must not resume while the
        // leaf is still sweeping across the player capsule. The old 90%
        // cutoff released movement early and could pin the avatar in the jamb.
        .filter(({ state, distance }) => state.active
          && distance <= maxDistance
          && !isBreachV2PortalReadyForTraversal(state.progress))
        .sort((a, b) => a.distance - b.distance)[0]?.state;
      if (!nearest) return null;
      if (!nearest.open && authorizeDoor(nearest.id)) setOpen(nearest, true);
      return nearest.id;
    },
    toggleNearest: (x, z, maxDistance = 4.2) => {
      const nearest = states
        .map((state) => ({ state, distance: Math.hypot(state.x - x, state.z - z) }))
        .filter(({ state, distance }) => state.active && distance <= maxDistance)
        // Short connectors can put two doors inside the keyboard interaction
        // radius. Continue forward by preferring a closed door over an open
        // door behind the player; once both share a state, distance wins.
        .sort((a, b) => a.state.open === b.state.open
          ? a.distance - b.distance
          : a.state.open ? 1 : -1)[0]?.state;
      if (!nearest) return null;
      return toggleState(nearest);
    },
    toggleHit: (playerX, playerZ, hitObject, maxPlayerDistance = 4.2) => {
      let cursor: THREE.Object3D | null = hitObject;
      let hitState: (typeof states)[number] | undefined;
      while (cursor && !(cursor instanceof THREE.Scene)) {
        hitState = states.find((state) => state.root === cursor || state.frameRoot === cursor);
        if (hitState) break;
        cursor = cursor.parent;
      }
      if (
        !hitState
        || !hitState.active
        || Math.hypot(hitState.x - playerX, hitState.z - playerZ) > maxPlayerDistance
      ) return null;
      return toggleState(hitState);
    },
    toggleAt: (
      playerX,
      playerZ,
      targetX,
      targetZ,
      maxPlayerDistance = 4.2,
      maxTargetDistance = 1.55,
    ) => {
      const nearest = states
        .map((state) => ({
          state,
          playerDistance: Math.hypot(state.x - playerX, state.z - playerZ),
          targetDistance: Math.hypot(state.x - targetX, state.z - targetZ),
        }))
        .filter(({ state, playerDistance, targetDistance }) => (
          state.active
          && playerDistance <= maxPlayerDistance
          && targetDistance <= maxTargetDistance
        ))
        .sort((a, b) => a.targetDistance - b.targetDistance)[0]?.state;
      if (!nearest) return null;
      return toggleState(nearest);
    },
  };
}
// ---------------------------------------------------------------------------
// kit props via DungeonPropKit (catalog-normalized, hanging assemblies, fires)
// ---------------------------------------------------------------------------
export const BREACH_V2_LOCAL_FIRE_LIGHT_POOL_SIZE = 12;

interface PropPlacements {
  tickables: ((elapsed: number) => void)[];
  cullables: THREE.Object3D[];
  placementProxyMeasurements: BreachV2PlacementProxyMeasurement[];
  environmentObjects: BreachV2RuntimeEnvironmentObject[];
}

function measureBreachV2PlacementProxy(
  id: string,
  roots: readonly THREE.Object3D[],
  yaw: number,
): BreachV2PlacementProxyMeasurement | null {
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  let minLocalX = Number.POSITIVE_INFINITY;
  let maxLocalX = Number.NEGATIVE_INFINITY;
  let minLocalZ = Number.POSITIVE_INFINITY;
  let maxLocalZ = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  forEachWorldGeometryCorner(roots, (corner) => {
    const localX = corner.x * cosine - corner.z * sine;
    const localZ = corner.x * sine + corner.z * cosine;
    minLocalX = Math.min(minLocalX, localX);
    maxLocalX = Math.max(maxLocalX, localX);
    minLocalZ = Math.min(minLocalZ, localZ);
    maxLocalZ = Math.max(maxLocalZ, localZ);
    minY = Math.min(minY, corner.y);
    maxY = Math.max(maxY, corner.y);
  });
  if (!Number.isFinite(minLocalX) || !Number.isFinite(minY)) return null;
  const localCenterX = (minLocalX + maxLocalX) / 2;
  const localCenterZ = (minLocalZ + maxLocalZ) / 2;
  return {
    id,
    centerX: localCenterX * cosine + localCenterZ * sine,
    centerZ: -localCenterX * sine + localCenterZ * cosine,
    halfX: Math.max(0.01, (maxLocalX - minLocalX) / 2),
    halfZ: Math.max(0.01, (maxLocalZ - minLocalZ) / 2),
    yaw,
    minY,
    maxY,
  };
}

async function placeKitProps(
  scene: THREE.Scene,
  layout: BreachV2Layout,
  loader: GLTFLoader,
): Promise<PropPlacements> {
  const used = new Map<string, Promise<GLTF>>();
  const hasWeaponRacks = layout.placements.some((placement) => placement.asset === "empty-weapon-rack");
  const rackWeaponPromise = hasWeaponRacks
    ? loader.loadAsync("/assets/3d/characters/elf-shadowknight/elf-shadowknight.glb")
    : null;
  for (const p of layout.placements) {
    if (p.glbRuntime && p.asset !== "heavy-door" && !used.has(p.glbRuntime)) {
      used.set(p.glbRuntime, loader.loadAsync(p.glbRuntime));
    }
  }
  const needsCandelabraSupports = layout.placements.some((placement) => (
    placement.asset === "candelabra-cluster" && placement.elevation - placement.floorElevation < 0.2
  ));
  const candelabraSupportSpec = DUNGEON_PROP_ASSETS["reinforced-crate"];
  if (needsCandelabraSupports && !used.has(candelabraSupportSpec.sourceUrl)) {
    used.set(candelabraSupportSpec.sourceUrl, loader.loadAsync(candelabraSupportSpec.sourceUrl));
  }
  const loaded = new Map<string, GLTF>();
  await Promise.all([...used.entries()].map(async ([url, promise]) => {
    loaded.set(url, await promise);
  }));

  // The environment kit intentionally ships an empty rack. Populate it with
  // the real starter longsword meshes from the imported Shadowknight kit,
  // preserving their authored geometry and materials instead of drawing
  // procedural box "weapons" over the rack.
  const rackWeaponSource = new THREE.Group();
  if (rackWeaponPromise) {
    const rackWeaponGltf = await rackWeaponPromise;
    const weaponParts = new THREE.Group();
    for (const name of [
      "SK_StarterLongsword_Blade",
      "SK_StarterLongsword_Guard",
      "SK_StarterLongsword_Grip",
      "SK_StarterLongsword_Pommel",
    ]) {
      const sourcePart = rackWeaponGltf.scene.getObjectByName(name);
      if (!(sourcePart instanceof THREE.Mesh)) continue;
      const part = sourcePart.clone(false);
      part.position.copy(sourcePart.position);
      part.quaternion.copy(sourcePart.quaternion);
      part.scale.copy(sourcePart.scale);
      part.castShadow = true;
      part.receiveShadow = true;
      weaponParts.add(part);
    }
    weaponParts.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(weaponParts);
    if (!bounds.isEmpty()) {
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      weaponParts.position.sub(center);
      rackWeaponSource.scale.setScalar(1.24 / Math.max(size.x, size.y, size.z));
    }
    rackWeaponSource.add(weaponParts);
  }

  const tickables: ((elapsed: number) => void)[] = [];
  const cullables: THREE.Object3D[] = [];
  const placementProxyMeasurements: BreachV2PlacementProxyMeasurement[] = [];
  const environmentObjects: BreachV2RuntimeEnvironmentObject[] = [];
  const localFireLightCandidates: {
    root: THREE.Object3D;
    source: THREE.PointLight;
  }[] = [];
  const environmentConfigById = new Map(
    buildBreachV2EnvironmentObjectConfigs(layout).map((config) => [config.id, config]),
  );
  const addRackWeapons = (
    x: number,
    y: number,
    z: number,
    yaw: number,
    spatialOwnerId: string,
  ): void => {
    if (rackWeaponSource.children.length === 0) return;
    const dressing = new THREE.Group();
    dressing.name = "training-rack-imported-longswords";
    dressing.position.set(x, y, z);
    dressing.rotation.y = yaw;
    [-0.62, 0, 0.62].forEach((offset, index) => {
      const weapon = rackWeaponSource.clone(true);
      weapon.position.set(offset, 1.18, 0.08);
      weapon.rotation.z = (index - 1) * 0.12;
      dressing.add(weapon);
    });
    dressing.userData = { importedWeaponDisplay: true, sourceAsset: "elf-shadowknight-starter-longsword" };
    setSpatialContract(dressing, {
      spatialOwnerId,
      collisionMode: "placement-dressing-detail",
      blocksMovement: false,
      blocksLineOfSight: false,
      contractReason: "Mounted longswords inherit the rack owner but do not add a second collision proxy.",
    });
    scene.add(dressing);
    cullables.push(dressing);
  };
  let phase = 0;
  const litSconceSides = new Map<string, number>();
  const litBrazierRooms = new Set<string>();
  for (const [placementIndex, p] of layout.placements.entries()) {
    if (!p.glbRuntime || p.asset === "heavy-door") continue;
    const spatialOwnerId = `${p.roomId}:${p.asset}:${placementIndex}`;
    const physicalBlocking = p.blocking;
    const spec = DUNGEON_PROP_ASSETS[p.asset as keyof typeof DUNGEON_PROP_ASSETS];
    const gltf = loaded.get(p.glbRuntime)!;
    const needsCandleStand = p.asset === "candelabra-cluster" && p.elevation - p.floorElevation < 0.2;
    const instance = instantiateDungeonProp(gltf.scene, {
      ...spec,
      targetHeight: needsCandleStand ? 0.72 : p.height,
      maxFootprint: needsCandleStand ? 0.82 : p.footprint,
    }, phase);
    const proxyRoots: THREE.Object3D[] = [instance.root];
    phase += 0.37;
    instance.root.position.set(p.x, p.elevation + (needsCandleStand ? 0.76 : 0), p.z);
    if (needsCandleStand) {
      const supportGltf = loaded.get(candelabraSupportSpec.sourceUrl)!;
      const support = instantiateDungeonProp(supportGltf.scene, {
        ...candelabraSupportSpec,
        targetHeight: 0.74,
        maxFootprint: 0.9,
      }, phase + 0.11);
      support.root.name = "candelabra-imported-crate-support";
      support.root.position.set(p.x, p.elevation, p.z);
      support.root.rotation.y = THREE.MathUtils.degToRad(p.yaw + 90);
      support.root.userData = {
        ...support.root.userData,
        supportFor: "candelabra-cluster",
        sourceAsset: "reinforced-crate",
      };
      setSpatialContract(support.root, {
        spatialOwnerId,
        collisionMode: "placement-support",
        blocksMovement: physicalBlocking,
        blocksLineOfSight: physicalBlocking && p.height >= 1.25,
        collisionId: physicalBlocking ? spatialOwnerId : undefined,
        contractReason: "The imported support is part of the candelabra placement and shares its single proxy.",
      });
      scene.add(support.root);
      cullables.push(support.root);
      proxyRoots.push(support.root);
    }
    // The 3DAI heavy-door source faces across its local X axis, while authored
    // wall yaw is expressed as a wall normal. Correct that source-local basis
    // once here so registry doors sit inside their frames instead of edge-on.
    const sourceYawCorrection = {
      "archive-bookshelf": 90,
      "archive-cupboard": 90,
      "empty-weapon-rack": 90,
      "guardian-statue": 270,
      "reliquary-wall-alcove": 90,
      "ruined-stone-archway": 90,
    }[p.asset] ?? 0;
    const tutorialAsset = p.roomId === "vestibule" && [
      "trestle-table", "high-backed-chair", "storage-chest",
      "reinforced-crate", "storage-barrel",
    ].includes(p.asset);
    const authoredFloorFacing = tutorialAsset || p.asset === "guardian-statue";
    const vestibuleGuardianFacing = p.roomId === "vestibule" && p.asset === "guardian-statue"
      ? 270 // both flanking guardians look west into the approaching room
      : null;
    const tutorialFacing = vestibuleGuardianFacing ?? (authoredFloorFacing
      ? ({ north: 0, east: 90, south: 180, west: 270 }[p.facing] ?? p.yaw)
      : p.yaw);
    instance.root.rotation.y = THREE.MathUtils.degToRad(tutorialFacing + sourceYawCorrection);
    const environmentConfig = environmentConfigById.get(spatialOwnerId)!;
    instance.root.userData = {
      ...instance.root.userData,
      destructionClass: environmentConfig.destructionClass,
      protectionReason: environmentConfig.protectionReason,
    };
    if (tutorialAsset) {
      const actions = p.asset === "storage-chest"
        ? ["inspect", "open", "move"]
        : p.asset === "reinforced-crate" || p.asset === "storage-barrel"
          ? ["inspect", "move", "destroy"]
          : ["inspect", "move"];
      instance.root.userData = {
        ...instance.root.userData,
        tutorialProp: true,
        interactable: true,
        interactionActions: actions,
      };
    }
    if (p.role === "destructible-cover") {
      instance.root.userData = {
        ...instance.root.userData,
        combatCover: true,
        destructible: true,
        hitPoints: p.asset === "broken-handcart" ? 90 : 55,
        interactionActions: ["inspect", "move", "destroy"],
      };
    }
    if (p.role === "loot-cache") {
      const unlockCondition = p.roomId.startsWith("chamber-")
        ? "room-complete"
        : p.roomId === "memory-vault"
          ? "boss-defeated"
          : "available";
      instance.root.userData = {
        ...instance.root.userData,
        lootCache: true,
        lootRoomId: p.roomId,
        unlockCondition,
        interactable: true,
        interactionActions: ["inspect", "open"],
      };
    }
    setSpatialContract(instance.root, {
      spatialOwnerId,
      collisionMode: physicalBlocking
        ? p.role === "destructible-cover" ? "destructible-solid" : "placement-solid"
        : p.placement === "ceiling"
          ? "overhead-nonblocking"
          : p.asset === "iron-floor-grate" ? "traversable-surface" : "intentional-nonblocking",
      blocksMovement: physicalBlocking,
      blocksLineOfSight: physicalBlocking && p.height >= 1.25,
      collisionId: physicalBlocking && p.asset !== "ruined-stone-archway"
        ? spatialOwnerId
        : undefined,
      collisionIdPrefix: physicalBlocking && p.asset === "ruined-stone-archway"
        ? `${spatialOwnerId}:`
        : undefined,
      postFitAuditMode: p.asset === "ruined-stone-archway" ? "compound-envelope" : "exact",
      contractReason: physicalBlocking
        ? "The generated layout placement owns the runtime footprint collider."
        : "The generated layout classifies this rendered placement as nonblocking.",
    });
    scene.add(instance.root);
    cullables.push(instance.root);
    if (physicalBlocking) {
      const measurement = measureBreachV2PlacementProxy(
        spatialOwnerId,
        proxyRoots,
        instance.root.rotation.y,
      );
      if (measurement) {
        placementProxyMeasurements.push(measurement);
        const measuredBlocksLineOfSight = measurement.maxY - measurement.minY >= 1.25;
        proxyRoots.forEach((root) => {
          root.userData.blocksLineOfSight = measuredBlocksLineOfSight;
        });
      }
    }
    tickables.push((elapsed) => {
      if (instance.root.visible) instance.animate(elapsed);
    });
    if (p.asset === "empty-weapon-rack") {
      addRackWeapons(p.x, p.elevation, p.z, instance.root.rotation.y, spatialOwnerId);
    }
    const coffer = p.roomId === "vestibule" && p.asset === "storage-chest";
    let pickupRoot: THREE.Object3D | undefined;
    let setCofferOpen: ((open: boolean) => void) | undefined;
    if (coffer) {
      const model = instance.root.getObjectByName("storage-chest-model");
      if (model) {
        const closedScaleY = model.scale.y;
        const lid = model.clone(true);
        lid.name = "storage-chest-imported-open-lid";
        lid.visible = false;
        lid.userData.spatialAuditExcluded = "inactive-coffer-state-geometry";
        instance.root.add(lid);
        setCofferOpen = (open) => {
          model.scale.y = closedScaleY * (open ? 0.72 : 1);
          lid.visible = open;
          lid.scale.y = closedScaleY * 0.28;
          lid.position.y = model.position.y + p.height * 0.7;
          lid.position.z = model.position.z - p.footprint * 0.16;
          lid.rotation.x = open ? -0.95 : 0;
          lid.userData.spatialAuditExcluded = open
            ? undefined
            : "inactive-coffer-state-geometry";
          instance.root.userData.cofferLidOpen = open;
        };
      }
      if (rackWeaponSource.children.length > 0) {
        pickupRoot = rackWeaponSource.clone(true);
        pickupRoot.name = "coffer-deterministic-starter-pickup";
        pickupRoot.position.set(p.x + 1.25, p.elevation + 0.62, p.z);
        pickupRoot.rotation.set(0, instance.root.rotation.y, Math.PI / 2);
        pickupRoot.visible = false;
        setSpatialContract(pickupRoot, {
          spatialOwnerId: "pickup:coffer-starter",
          collisionMode: "pickup-trigger-nonblocking",
          blocksMovement: false,
          blocksLineOfSight: false,
          contractReason: "The deterministic Gate 8 starter pickup is an interaction trigger, never a solid.",
        });
        scene.add(pickupRoot);
      }
    }
    environmentObjects.push({
      ...environmentConfig,
      x: p.x,
      z: p.z,
      root: instance.root,
      coffer,
      pickupRoot,
      setCofferOpen,
    });
    if (p.fireAnchorY !== null && p.fireColor) {
      // B7 texture-unit discipline: fire lights never cast shadows in the
      // preview — every shadow-casting point light adds a cube shadow map to
      // every lit material, and ~15 braziers blew past MAX_TEXTURE_IMAGE_UNITS
      // on real GPUs. Local glow only; the two landmark lights carry shadows.
      const fire = createDungeonFireEffect({
        anchorY: p.fireAnchorY,
        color: p.fireColor,
        castShadow: false,
        phase,
      });
      // Fire belongs to the imported fixture, not to the world. The sconce's
      // authored torch cup is offset from its wall plate; this one loader-side
      // source-space correction seats the flame in that cup for every wall
      // orientation. Braziers stay centered, and hanging flames inherit sway.
      const fixtureFireOffset = p.asset === "wall-torch-sconce"
        ? new THREE.Vector3(0.1, p.fireAnchorY - 0.22, -0.31)
        : new THREE.Vector3(0, p.fireAnchorY, 0);
      fire.root.position.copy(fixtureFireOffset);
      fire.root.userData = {
        fixtureAsset: p.asset,
        fixtureRoomId: p.roomId,
        fixtureLocalAnchor: fixtureFireOffset.toArray(),
      };
      setSpatialContract(fire.root, {
        spatialOwnerId,
        collisionMode: "fixture-vfx",
        blocksMovement: false,
        blocksLineOfSight: false,
        contractReason: "Fire particles and glow inherit the fixture transform without adding collision.",
      });
      const flameScale = p.asset === "wall-torch-sconce" ? 0.48
        : p.asset === "floor-brazier" ? 0.68
          : 0.58;
      fire.root.scale.setScalar(flameScale);
      // Large rooms keep two real sconce lights on each opposing wall so
      // tutorial props remain readable. Smaller rooms keep one per wall. Their
      // animated source lights remain hidden; a fixed-size world-space pool
      // copies currently visible sources without changing Three.js's visible
      // point-light count and recompiling every lit material during traversal.
      const sconceSide = `${p.roomId}:${p.facing}`;
      const roomWidth = layout.rooms.find((room) => room.id === p.roomId)?.w ?? 0;
      const sconceLimit = roomWidth >= 18 ? 2 : 1;
      const sconceCount = litSconceSides.get(sconceSide) ?? 0;
      const keepSconce = p.asset === "wall-torch-sconce"
        && (p.facing === "north" || p.facing === "south")
        && sconceCount < sconceLimit;
      const keepBrazier = p.asset === "floor-brazier" && !litBrazierRooms.has(p.roomId);
      if (keepSconce) litSconceSides.set(sconceSide, sconceCount + 1);
      if (keepBrazier) litBrazierRooms.add(p.roomId);
      const keepLocalLight = keepSconce || keepBrazier;
      const localLights: THREE.PointLight[] = [];
      fire.root.traverse((child) => {
        if (!(child instanceof THREE.PointLight)) return;
        child.visible = false;
        child.distance = p.asset === "floor-brazier" ? 15 : 12;
        child.decay = 1.5;
        if (keepLocalLight) {
          localLights.push(child);
          localFireLightCandidates.push({ root: fire.root, source: child });
        }
      });
      instance.fireMount.add(fire.root);
      cullables.push(fire.root);
      tickables.push((elapsed) => {
        // Hidden rooms do not need particle-buffer or shader-uniform updates.
        // For visible rooms, lift the physical-light energy after the shared
        // fire animator applies its flicker baseline.
        if (!fire.root.visible) return;
        fire.animate(elapsed);
        const lightScale = p.asset === "floor-brazier" ? 3.4
          : p.asset === "hanging-brazier" ? 2.6
            : 1.7;
        localLights.forEach((light) => { light.intensity *= lightScale; });
      });
    }
  }

  const pooledFireLights = Array.from(
    { length: BREACH_V2_LOCAL_FIRE_LIGHT_POOL_SIZE },
    (_, index) => {
      const light = new THREE.PointLight(0xff8a4c, 0, 15, 1.5);
      light.name = `breach-v2-local-fire-light-${index}`;
      light.castShadow = false;
      light.visible = true;
      light.userData = {
        spatialAuditExcluded: "fixed-count-local-fire-light-pool",
        blocksMovement: false,
        blocksLineOfSight: false,
      };
      scene.add(light);
      return light;
    },
  );
  const pooledLightPosition = new THREE.Vector3();
  const isEffectivelyVisible = (object: THREE.Object3D): boolean => {
    let cursor: THREE.Object3D | null = object;
    while (cursor) {
      if (!cursor.visible) return false;
      cursor = cursor.parent;
    }
    return true;
  };
  tickables.push(() => {
    let poolIndex = 0;
    for (const candidate of localFireLightCandidates) {
      if (poolIndex >= pooledFireLights.length) break;
      if (!isEffectivelyVisible(candidate.root)) continue;
      const pooled = pooledFireLights[poolIndex]!;
      candidate.source.getWorldPosition(pooledLightPosition);
      pooled.position.copy(pooledLightPosition);
      pooled.color.copy(candidate.source.color);
      pooled.intensity = candidate.source.intensity;
      pooled.distance = candidate.source.distance;
      pooled.decay = candidate.source.decay;
      poolIndex += 1;
    }
    while (poolIndex < pooledFireLights.length) {
      pooledFireLights[poolIndex]!.intensity = 0;
      poolIndex += 1;
    }
  });
  return { tickables, cullables, placementProxyMeasurements, environmentObjects };
}

// ---------------------------------------------------------------------------
// landmarks (custom — never kit-substituted)
// ---------------------------------------------------------------------------
export function resolveBreachV2WorldY(floorElevation: number, localOffset: number): number {
  return floorElevation + localOffset;
}

function buildLandmarks(scene: THREE.Scene, layout: BreachV2Layout): ((elapsed: number) => void)[] {
  const tickables: ((elapsed: number) => void)[] = [];
  const lm = layout.landmarks;
  const group = new THREE.Group();
  group.name = "breach-v2-landmarks";
  scene.add(group);

  // Soul Well: dungeon-masonry basin, animated water, splashes, and a suspended
  // cluster of soul-memory crystal rather than a smooth UI-like pool.
  const well = lm.soulWell;
  const basinMat = new THREE.MeshStandardMaterial({
    map: new THREE.TextureLoader().load(`${TEX_ROOT}/masonry-color.jpg`),
    roughness: 0.85, metalness: 0.04, color: 0x9a9187,
  });
  basinMat.map!.colorSpace = THREE.SRGBColorSpace;
  basinMat.map!.wrapS = THREE.RepeatWrapping;
  basinMat.map!.wrapT = THREE.RepeatWrapping;
  const apron = well.apron ?? 2.65;
  const basinBase = new THREE.Mesh(
    new THREE.CylinderGeometry(apron - 0.18, apron + 0.08, 0.58, 8),
    basinMat,
  );
  basinBase.position.set(well.x, 0.29, well.z);
  basinBase.castShadow = true;
  basinBase.receiveShadow = true;
  group.add(basinBase);
  const soulWellSolidParts: THREE.Object3D[] = [basinBase];
  const ringRadius = apron - 0.14;
  const blockLength = 2 * ringRadius * Math.tan(Math.PI / 8) * 0.94;
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    const block = texturedBox(blockLength, 0.55, 0.48, basinMat);
    block.position.set(well.x + Math.cos(angle) * ringRadius, 0.68, well.z + Math.sin(angle) * ringRadius);
    block.rotation.y = Math.PI / 2 - angle;
    group.add(block);
    soulWellSolidParts.push(block);
  }
  // Recessed soul-water is an opaque abyssal realm surface. It deliberately
  // hides the masonry below; shallow translucent water makes the Soul Well
  // read as a basin instead of a one-way passage into another realm.
  const waterMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vLift;
      void main() {
        vUv = uv;
        vec2 p = (uv - 0.5) * 2.0;
        float radius = length(p);
        float angle = atan(p.y, p.x);
        float spiral = sin(angle * 5.0 - radius * 19.0 - uTime * 1.85);
        float crossWave = sin(p.x * 15.0 + p.y * 11.0 + uTime * 1.35);
        float edgeEnvelope = 1.0 - smoothstep(0.76, 1.0, radius);
        vLift = (spiral * 0.72 + crossWave * 0.28) * edgeEnvelope;
        vec3 displaced = position;
        displaced.z += vLift * 0.045;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying float vLift;
      uniform float uTime;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float radius = length(p);
        if (radius > 1.0) discard;
        float angle = atan(p.y, p.x);
        float spiralA = sin(angle * 6.0 - radius * 23.0 - uTime * 2.05) * 0.5 + 0.5;
        float spiralB = sin(angle * -4.0 - radius * 34.0 + uTime * 1.45) * 0.5 + 0.5;
        float current = pow(max(0.0, spiralA + spiralB - 1.12), 2.6);
        float fineCurrent = pow(0.5 + 0.5 * sin(
          angle * 10.0 - radius * 52.0 - uTime * 3.1
        ), 9.0);
        float abyss = 1.0 - smoothstep(0.08, 0.78, radius);
        float rim = smoothstep(0.76, 0.98, radius);
        vec3 blackDepth = vec3(0.002, 0.018, 0.026);
        vec3 deepSoul = vec3(0.015, 0.115, 0.145);
        vec3 currentColor = vec3(0.12, 0.48, 0.54);
        vec3 soulWhite = vec3(0.68, 0.94, 0.91);
        vec3 color = mix(deepSoul, blackDepth, abyss * 0.88);
        color = mix(color, currentColor, current * (0.38 + radius * 0.28));
        color = mix(color, soulWhite, fineCurrent * (0.08 + rim * 0.30));
        color += currentColor * max(vLift, 0.0) * 0.08;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    transparent: false,
    depthWrite: true,
    side: THREE.DoubleSide,
  });
  const waterRadius = (well.r ?? 1.8) + 0.24;
  const waterGeometry = new THREE.PlaneGeometry(waterRadius * 2, waterRadius * 2, 48, 48);
  const water = new THREE.Mesh(waterGeometry, waterMat);
  water.name = "vestibule-soulwell-abyss-water";
  water.rotation.x = -Math.PI / 2;
  water.position.set(well.x, 0.575, well.z);
  water.userData = {
    vfxKind: "abyssal-soulwell-vortex",
    visualDepth: "bottomless-realm-threshold",
    sourceLane: "HOUDINI_APPRENTICE_POC_RUNTIME_SHADER",
    collisionMode: "landmark-vfx-detail",
    spatialOwnerId: "landmark:soul-well",
    blocksMovement: false,
    blocksLineOfSight: false,
    contractReason: "The visible water inherits the Soul Well owner; masonry owns the boundary collider.",
  };
  group.add(water);
  const jetGeometries: THREE.BufferGeometry[] = [];
  for (let index = 0; index < 3; index += 1) {
    const angle = index * (Math.PI * 2 / 3) + 0.35;
    const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const curve = new THREE.QuadraticBezierCurve3(
      direction.clone().multiplyScalar(0.18),
      direction.clone().multiplyScalar(0.5).setY(0.46),
      direction.clone().multiplyScalar(0.92),
    );
    jetGeometries.push(new THREE.TubeGeometry(curve, 16, 0.008, 5, false));
  }
  const splashGeometry = mergeGeometries(jetGeometries)!;
  const splashMaterial = new THREE.MeshBasicMaterial({
    color: 0x4faeb8,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const splashes = new THREE.Mesh(splashGeometry, splashMaterial);
  splashes.name = "vestibule-soulwell-current-jets";
  splashes.position.set(well.x, 0.59, well.z);
  setSpatialContract(splashes, {
    spatialOwnerId: "landmark:soul-well",
    collisionMode: "landmark-vfx-detail",
    blocksMovement: false,
    blocksLineOfSight: false,
  });
  group.add(splashes);
  const ripples: THREE.Mesh[] = [];
  [0.7, 1.25, 1.75].forEach((radius) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.014, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x75c7cf, transparent: true, opacity: 0.14 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(well.x, 0.58, well.z);
    setSpatialContract(ring, {
      spatialOwnerId: "landmark:soul-well",
      collisionMode: "landmark-vfx-detail",
      blocksMovement: false,
      blocksLineOfSight: false,
    });
    group.add(ring);
    ripples.push(ring);
  });
  const soulWellKey = new THREE.PointLight(0x66dce1, 7.2, 11, 1.75);
  soulWellKey.name = "soulwell-fx-key";
  soulWellKey.position.set(well.x, 1.28, well.z);
  soulWellKey.castShadow = true;
  soulWellKey.shadow.mapSize.set(512, 512);
  soulWellKey.shadow.bias = -0.01;
  group.add(soulWellKey);
  const soulWellBounce = new THREE.PointLight(0x245c70, 2.4, 7.5, 1.9);
  soulWellBounce.name = "soulwell-fx-bounce";
  soulWellBounce.position.set(well.x, 0.72, well.z);
  group.add(soulWellBounce);
  const moteCount = 22;
  const motePositions = new Float32Array(moteCount * 3);
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute("position", new THREE.BufferAttribute(motePositions, 3));
  const soulMotes = new THREE.Points(
    moteGeometry,
    new THREE.PointsMaterial({
      color: 0x89f5ed,
      size: 0.075,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  soulMotes.name = "vestibule-soulwell-rising-motes";
  soulMotes.position.set(well.x, 0.61, well.z);
  setSpatialContract(soulMotes, {
    spatialOwnerId: "landmark:soul-well",
    collisionMode: "landmark-vfx-detail",
    blocksMovement: false,
    blocksLineOfSight: false,
  });
  group.add(soulMotes);
  // emergence step at the south edge (stone)
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.7), basinMat);
  step.position.set(well.x, 0.11, well.z + apron + 0.15);
  step.castShadow = true;
  setSpatialContract(step, {
    spatialOwnerId: "surface:soul-well-emergence-step",
    collisionMode: "traversable-surface",
    blocksMovement: false,
    blocksLineOfSight: false,
  });
  group.add(step);
  soulWellSolidParts.forEach((part) => setSpatialContract(part, {
    spatialOwnerId: "landmark:soul-well",
    collisionMode: "landmark-solid",
    blocksMovement: true,
    blocksLineOfSight: false,
    collisionId: "landmark:soul-well",
  }));
  tickables.push((elapsed) => {
    waterMat.uniforms.uTime!.value = elapsed;
    const jetPulse = 0.88 + Math.sin(elapsed * 1.8) * 0.12;
    splashes.scale.set(1, jetPulse, 1);
    splashMaterial.opacity = 0.14 + Math.sin(elapsed * 1.8) * 0.04;
    ripples.forEach((ring, i) => {
      const phase = (elapsed * 0.35 + i / ripples.length) % 1;
      const s = 0.4 + phase * 1.1;
      ring.scale.set(s, s, 1);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.16 * (1 - phase);
    });
    soulWellKey.intensity = 6.8 + Math.sin(elapsed * 1.15) * 0.65;
    soulWellKey.position.y = 1.26 + Math.sin(elapsed * 0.7) * 0.08;
    soulWellBounce.intensity = 2.2 + Math.sin(elapsed * 0.8 + 1.4) * 0.25;
    for (let index = 0; index < moteCount; index += 1) {
      const rise = (elapsed * (0.12 + (index % 5) * 0.012) + index * 0.137) % 1;
      const angle = index * 2.399 + elapsed * (0.18 + (index % 3) * 0.035);
      const radius = 0.32 + (index % 7) * 0.17;
      motePositions[index * 3] = Math.cos(angle) * radius;
      motePositions[index * 3 + 1] = 0.12 + rise * 2.15;
      motePositions[index * 3 + 2] = Math.sin(angle) * radius;
    }
    moteGeometry.attributes.position!.needsUpdate = true;
  });

  // Memory Loom: recognizable timber loom with heddles, shuttle, wheel, and
  // woven memory strands instead of a cage-like row of vertical bars.
  const loom = lm.memoryLoom;
  const loomMat = new THREE.MeshStandardMaterial({ color: 0x52402a, roughness: 0.7, metalness: 0.1 });
  const threadMat = new THREE.MeshStandardMaterial({
    color: 0x8070c0, roughness: 0.4, emissive: 0x8c73d9, emissiveIntensity: 0.7,
  });
  const loomChildStart = group.children.length;
  const addBox = (x: number, y: number, z: number, w: number, h: number, d: number, mat: THREE.Material): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
  };
  addBox(loom.x - 1.1, 1.3, loom.z, 0.18, 2.6, 0.18, loomMat);
  addBox(loom.x + 1.1, 1.3, loom.z, 0.18, 2.6, 0.18, loomMat);
  addBox(loom.x, 2.5, loom.z, 2.4, 0.18, 0.18, loomMat);
  addBox(loom.x, 0.11, loom.z, 2.2, 0.22, 0.5, loomMat);
  addBox(loom.x, 1.05, loom.z, 2.0, 0.12, 0.22, loomMat);
  addBox(loom.x, 1.72, loom.z, 1.9, 0.1, 0.18, loomMat);
  const loomWheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.055, 8, 24), loomMat);
  loomWheel.position.set(loom.x - 1.18, 0.78, loom.z + 0.02);
  group.add(loomWheel);
  const shuttle = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.09, 0.16), threadMat);
  shuttle.position.set(loom.x, 1.32, loom.z - 0.08);
  group.add(shuttle);
  const threads: THREE.Mesh[] = [];
  for (let t = 0; t < 6; t += 1) {
    const thread = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1.32, 0.018), threadMat);
    thread.position.set(loom.x - 0.72 + t * 0.29, 1.78, loom.z);
    group.add(thread);
    threads.push(thread);
  }
  group.children.slice(loomChildStart).forEach((part) => setSpatialContract(part, {
    spatialOwnerId: "landmark:memory-loom",
    collisionMode: "landmark-solid",
    blocksMovement: true,
    blocksLineOfSight: true,
    collisionId: "landmark:memory-loom",
  }));
  tickables.push((elapsed) => {
    loomWheel.rotation.z = elapsed * 0.22;
    shuttle.position.x = loom.x + Math.sin(elapsed * 0.55) * 0.42;
    threads.forEach((thread, i) => {
      thread.rotation.z = Math.sin(elapsed * 0.7 + i * 0.8) * 0.04;
    });
  });

  // Training effigy
  const effigy = lm.effigy;
  const effigyMat = new THREE.MeshStandardMaterial({ color: 0x735626, roughness: 0.85 });
  const effigyChildStart = group.children.length;
  addBox(effigy.x, 0.85, effigy.z, 0.22, 1.7, 0.22, effigyMat);
  addBox(effigy.x, 1.35, effigy.z, 1.5, 0.18, 0.18, effigyMat);
  addBox(effigy.x, 1.95, effigy.z, 0.42, 0.5, 0.42, effigyMat);
  group.children.slice(effigyChildStart).forEach((part) => setSpatialContract(part, {
    spatialOwnerId: "landmark:training-effigy",
    collisionMode: "landmark-solid",
    blocksMovement: true,
    blocksLineOfSight: true,
    collisionId: "landmark:training-effigy",
  }));

  // First Memory: an open illuminated codex grounded on the imported ruined
  // altar. This is a readable reward object, not a floating white UI marker.
  const fm = lm.firstMemory;
  const memoryTexture = new THREE.TextureLoader().load(`${ART_ROOT}/art-relief-first-memory.webp`);
  memoryTexture.colorSpace = THREE.SRGBColorSpace;
  const coverMaterial = new THREE.MeshStandardMaterial({
    color: 0x3b1b14,
    roughness: 0.78,
    metalness: 0.05,
  });
  const pageMaterial = new THREE.MeshStandardMaterial({
    map: memoryTexture,
    emissiveMap: memoryTexture,
    emissive: new THREE.Color(0x4b2314),
    emissiveIntensity: 0.28,
    roughness: 0.7,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const memoryCodex = new THREE.Group();
  memoryCodex.name = "first-memory-codex";
  memoryCodex.position.set(fm.x, 1.5, fm.z);
  memoryCodex.userData = {
    objective: "first-memory",
    interactable: true,
    unlockCondition: "boss-defeated",
    interactionActions: ["inspect", "claim"],
  };
  setSpatialContract(memoryCodex, {
    spatialOwnerId: "landmark:first-memory",
    collisionMode: "interactable-nonblocking",
    blocksMovement: false,
    blocksLineOfSight: false,
    contractReason: "The codex is an interaction target mounted above its supporting altar placement.",
  });
  const cover = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.02), coverMaterial);
  cover.position.y = -0.06;
  cover.castShadow = true;
  cover.receiveShadow = true;
  memoryCodex.add(cover);
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.02, 10), coverMaterial);
  spine.rotation.x = Math.PI / 2;
  spine.position.y = 0.015;
  spine.castShadow = true;
  memoryCodex.add(spine);
  const pages: THREE.Mesh[] = [];
  for (const side of [-1, 1] as const) {
    const page = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.92, 2, 2), pageMaterial);
    page.position.set(side * 0.35, 0.045, 0);
    page.rotation.set(-Math.PI / 2, 0, side * -0.075);
    page.castShadow = true;
    memoryCodex.add(page);
    pages.push(page);
  }
  group.add(memoryCodex);
  tickables.push((elapsed) => {
    pageMaterial.emissiveIntensity = 0.24 + Math.sin(elapsed * 0.9) * 0.06;
    pages.forEach((page, index) => {
      page.rotation.z = (index === 0 ? 1 : -1) * (0.075 + Math.sin(elapsed * 0.55) * 0.006);
    });
  });

  // #448/#449 own the real characters/monsters. Placeholder markers stay off
  // in normal review/mobile builds and can be explicitly enabled for socket QA.
  const markersHidden = new URL(window.location.href).searchParams.get("markers") !== "1";
  const markerMat = (color: number) => new THREE.MeshStandardMaterial({
    color, roughness: 0.5, emissive: color, emissiveIntensity: 0.18,
    transparent: true, opacity: 0.42,
  });
  for (const [id, pos, color, h] of [
    ["ilyra", lm.ilyra, 0x66e080, 1.5], ["orren", lm.orren, 0x66cc73, 1.5],
    ["brannoc", lm.brannoc, 0x80bf60, 1.5],
  ] as const) {
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, h, 16), markerMat(color));
    marker.name = `debug-actor-marker-${id}`;
    marker.position.set(pos.x, h / 2, pos.z);
    marker.visible = !markersHidden;
    setSpatialContract(marker, {
      spatialOwnerId: `debug:actor-marker:${id}`,
      collisionMode: "debug-marker",
      blocksMovement: false,
      blocksLineOfSight: false,
    });
    group.add(marker);
  }
  for (const enemy of layout.enemies) {
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.8, 12), markerMat(0xbf4030));
    marker.name = `debug-enemy-marker-${enemy.id}`;
    marker.position.set(enemy.x, 0.4, enemy.z);
    marker.visible = !markersHidden;
    setSpatialContract(marker, {
      spatialOwnerId: `debug:enemy-marker:${enemy.id}`,
      collisionMode: "debug-marker",
      blocksMovement: false,
      blocksLineOfSight: false,
    });
    group.add(marker);
  }
  // Cinderbound Warden sigil: a coherent realm-lock lattice with eight
  // deliberately different glyphs, not repeated bars or random characters.
  const bossRoom = layout.rooms.find((room) => room.kind === "boss")!;
  const arenaCenter = new THREE.Vector3(
    bossRoom.x + bossRoom.w / 2,
    0,
    bossRoom.z + bossRoom.h / 2,
  );
  const runeRadius = 3.35;
  const runeGroup = new THREE.Group();
  runeGroup.name = "boss-activation-sigil";
  runeGroup.position.copy(arenaCenter);
  runeGroup.userData = {
    encounterAnchor: true,
    bossId: layout.boss.id,
    periodicHazard: "radial-cinder-lanes",
  };
  setSpatialContract(runeGroup, {
    spatialOwnerId: `hazard:${layout.boss.id}:activation-sigil`,
    collisionMode: "hazard-telegraph",
    blocksMovement: false,
    blocksLineOfSight: false,
    contractReason: "The sigil and cinder lanes are damage telegraphs, not physical blockers.",
  });
  const runeMat = new THREE.MeshStandardMaterial({
    color: 0x7a2c14, roughness: 0.5, emissive: 0xff5a2c, emissiveIntensity: 1.1,
  });
  for (const [inner, outer] of [[0.93, 1], [0.57, 0.62], [0.25, 0.29]] as const) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(runeRadius * inner, runeRadius * outer, 96), runeMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.065;
    runeGroup.add(ring);
  }
  type GlyphSegment = readonly [number, number, number, number];
  const glyphs: readonly (readonly GlyphSegment[])[] = [
    [[-0.34, -0.42, -0.34, 0.42], [-0.34, 0.05, 0.32, -0.38], [-0.34, 0.05, 0.28, 0.38]],
    [[-0.32, -0.42, 0.32, -0.42], [0.32, -0.42, -0.1, 0.05], [-0.1, 0.05, 0.34, 0.42]],
    [[-0.36, 0.38, 0, -0.42], [0, -0.42, 0.36, 0.38], [-0.22, 0.05, 0.22, 0.05]],
    [[-0.36, -0.38, 0.36, 0.38], [-0.36, 0.38, 0.36, -0.38], [0, -0.42, 0, 0.42]],
    [[-0.34, -0.42, -0.34, 0.42], [-0.34, -0.42, 0.34, -0.1], [0.34, -0.1, -0.1, 0.42]],
    [[0, -0.44, 0, 0.44], [-0.34, -0.12, 0, -0.44], [0, 0.44, 0.34, 0.12]],
    [[-0.38, -0.38, 0.38, -0.38], [0.38, -0.38, 0.05, 0.1], [0.05, 0.1, 0.38, 0.4]],
    [[-0.38, 0, 0, -0.42], [0, -0.42, 0.38, 0], [0.38, 0, 0, 0.42], [0, 0.42, -0.38, 0]],
  ];
  const addGlyphSegment = (parent: THREE.Group, [x1, z1, x2, z2]: GlyphSegment): void => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const segment = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(dx, dz), 0.025, 0.085), runeMat);
    segment.position.set((x1 + x2) / 2, 0.075, (z1 + z2) / 2);
    segment.rotation.y = -Math.atan2(dz, dx);
    parent.add(segment);
  };
  glyphs.forEach((segments, index) => {
    const angle = (index / glyphs.length) * Math.PI * 2;
    const glyph = new THREE.Group();
    glyph.position.set(Math.cos(angle) * runeRadius * 0.78, 0, Math.sin(angle) * runeRadius * 0.78);
    glyph.rotation.y = -angle + Math.PI / 2;
    segments.forEach((segment) => addGlyphSegment(glyph, segment));
    runeGroup.add(glyph);
  });
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(runeRadius * 0.52, 0.025, 0.055), runeMat);
    spoke.position.set(Math.cos(angle) * runeRadius * 0.28, 0.07, Math.sin(angle) * runeRadius * 0.28);
    spoke.rotation.y = -angle;
    runeGroup.add(spoke);
  }
  // Preserve the V1 encounter grammar: the centre lock periodically sends
  // cinder down readable radial lanes. These meshes are also semantic combat
  // sockets for the later encounter controller, not arbitrary decoration.
  const hazardMaterials = [0, 1].map(() => new THREE.MeshBasicMaterial({
    color: 0xff5d28,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  const hazardLength = 7.0;
  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2;
    const lane = new THREE.Mesh(
      new THREE.BoxGeometry(hazardLength, 0.028, 0.16),
      hazardMaterials[index % 2]!,
    );
    const laneRadius = runeRadius + hazardLength / 2 - 0.12;
    lane.position.set(Math.cos(angle) * laneRadius, 0.055, Math.sin(angle) * laneRadius);
    lane.rotation.y = -angle;
    lane.name = `boss-cinder-hazard-lane-${index + 1}`;
    lane.userData = {
      periodicHazard: true,
      damageType: "fire",
      activationGroup: index % 2,
      telegraphSeconds: 1.1,
    };
    runeGroup.add(lane);
  }
  group.add(runeGroup);
  tickables.push((elapsed) => {
    runeMat.emissiveIntensity = 0.95 + Math.sin(elapsed * 1.6) * 0.3;
    const pulse = Math.sin(elapsed * 1.8);
    hazardMaterials[0]!.opacity = 0.2 + Math.max(0, pulse) * 0.44;
    hazardMaterials[1]!.opacity = 0.2 + Math.max(0, -pulse) * 0.44;
  });

  // Sparse authored puddles sit at room-edge low points. They are intentionally
  // shallow, nonblocking, and visually distinct from the opaque Soul Well.
  const puddleMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float irregularRadius = length(p * vec2(0.86, 1.08))
          + sin(atan(p.y, p.x) * 5.0 + 0.7) * 0.065;
        if (irregularRadius > 0.94) discard;
        float edge = smoothstep(0.94, 0.64, irregularRadius);
        float waveA = sin(p.x * 13.0 + p.y * 7.0 - uTime * 1.65) * 0.5 + 0.5;
        float waveB = sin(p.y * 17.0 - p.x * 5.0 + uTime * 1.15) * 0.5 + 0.5;
        float shimmer = pow(max(0.0, waveA + waveB - 1.18), 3.2);
        vec3 color = mix(vec3(0.035, 0.16, 0.18), vec3(0.52, 0.78, 0.75), shimmer * 0.68);
        gl_FragColor = vec4(color, edge * (0.54 + shimmer * 0.20));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const puddleRoomIds = new Set([
    "threshold-plaza", "convergence", "ashen-threshold", "memory-vault", "exit-connector",
  ]);
  const puddleRooms = layout.rooms.filter((room, index) => (
    puddleRoomIds.has(room.id) || (room.kind === "gallery" && index % 2 === 0)
  ));
  for (const [index, room] of puddleRooms.entries()) {
    const insetX = 1.15 + (index % 3) * 0.16;
    const insetZ = 1.05 + (index % 2) * 0.2;
    const candidates = [
      [room.x + insetX, room.z + insetZ],
      [room.x + room.w - insetX, room.z + insetZ],
      [room.x + insetX, room.z + room.h - insetZ],
      [room.x + room.w - insetX, room.z + room.h - insetZ],
    ] as const;
    const roomProps = layout.placements.filter((placement) => placement.roomId === room.id);
    const puddlePosition = candidates
      .map(([x, z]) => ({
        x,
        z,
        clearance: roomProps.reduce(
          (minimum, placement) => Math.min(minimum, Math.hypot(x - placement.x, z - placement.z)),
          Number.POSITIVE_INFINITY,
        ),
      }))
      .sort((a, b) => b.clearance - a.clearance)[0]!;
    const puddle = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.02, 12, 8), puddleMaterial);
    puddle.name = `dungeon-puddle-${room.id}`;
    puddle.rotation.set(-Math.PI / 2, 0, index * 0.73);
    puddle.scale.set(0.78 + (index % 3) * 0.14, 0.72 + (index % 2) * 0.16, 1);
    puddle.position.set(puddlePosition.x, 0.028, puddlePosition.z);
    puddle.renderOrder = 2;
    puddle.userData = {
      vfxKind: "shallow-animated-puddle",
      collisionMode: "nonblocking",
      spatialOwnerId: `effect:puddle:${room.id}`,
      blocksMovement: false,
      blocksLineOfSight: false,
      visualDepth: "shallow",
      authoredLowPoint: true,
    };
    group.add(puddle);
  }
  tickables.push((elapsed) => { puddleMaterial.uniforms.uTime!.value = elapsed; });

  const fogBase = new THREE.Color(0x0d0f14);
  const fogSoulTint = new THREE.Color(0x102229);
  tickables.push((elapsed) => {
    if (!(scene.fog instanceof THREE.FogExp2)) return;
    const breath = 0.5 + 0.5 * Math.sin(elapsed * 0.23);
    scene.fog.density = 0.00525 + breath * 0.00035;
    scene.fog.color.lerpColors(fogBase, fogSoulTint, breath * 0.18);
  });

  // The Heartvale threshold is not a door: it is the vertical skin of the
  // Soulwell above. Keep this runtime layer traversable and translucent so the
  // outdoor terrain remains visible through the downward-flowing water. Its
  // dimensions, arch mask, flow phases, and normal displacement mirror the
  // isolated Houdini FX POC in build-soulwell-exit-water-poc.py.
  const exitWaterMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x123c49) },
      uSoul: { value: new THREE.Color(0x69d7d5) },
      uShimmer: { value: new THREE.Color(0xd9fff4) },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vRipple;
      void main() {
        vUv = uv;
        vec3 displaced = position;
        float edge = smoothstep(0.0, 0.13, uv.x) * smoothstep(0.0, 0.13, 1.0 - uv.x);
        vRipple = sin(uv.y * 22.0 - uTime * 2.8 + sin(uv.x * 11.0) * 1.8);
        displaced.z += vRipple * 0.055 * edge;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uSoul;
      uniform vec3 uShimmer;
      varying vec2 vUv;
      varying float vRipple;
      void main() {
        vec2 p = vUv;
        float halfWidth = 0.5;
        float shoulderY = 0.58;
        float body = (1.0 - step(halfWidth, abs(p.x - 0.5))) * (1.0 - step(shoulderY, p.y));
        vec2 archPoint = vec2((p.x - 0.5) / halfWidth, (p.y - shoulderY) / 0.28);
        float crown = (1.0 - step(1.0, length(archPoint))) * step(shoulderY, p.y);
        float archMask = max(body, crown);
        if (archMask < 0.5) discard;
        float fallA = sin(p.x * 18.0 + p.y * 7.0 + uTime * 1.4) * 0.5 + 0.5;
        float fallB = sin(p.x * 31.0 - p.y * 13.0 - uTime * 2.1) * 0.5 + 0.5;
        float verticalFlow = sin((p.y + fallA * 0.045) * 52.0 + uTime * 5.2) * 0.5 + 0.5;
        float caustic = pow(max(0.0, fallA + fallB + verticalFlow * 0.45 - 1.42), 2.4);
        float fallingStreak = pow(0.5 + 0.5 * sin(
          p.x * 93.0 + sin(p.y * 19.0 - uTime * 3.1) * 2.8 - uTime * 5.7
        ), 17.0);
        float crossingStreak = pow(0.5 + 0.5 * sin(
          p.x * 51.0 - p.y * 14.0 + uTime * 3.4
        ), 15.0);
        float rippleLine = pow(0.5 + 0.5 * sin(
          p.y * 84.0 + sin(p.x * 21.0) * 2.2 + uTime * 7.2
        ), 18.0);
        float sheetShimmer = max(fallingStreak * 0.74, crossingStreak * 0.18)
          + rippleLine * 0.10;
        float edge = 1.0 - smoothstep(0.34, 0.5, abs(p.x - 0.5));
        float baseMix = 0.3 + fallA * 0.18 + (vRipple * 0.5 + 0.5) * 0.08;
        vec3 color = mix(uDeep, uSoul, baseMix);
        color = mix(color, uShimmer, min(0.72, caustic * 0.38 + sheetShimmer * 0.54));
        float alpha = 0.30 + caustic * 0.12 + sheetShimmer * 0.22 + edge * 0.06;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const exitPortalBoundary = layout.topology.boundaries.find((boundary) => (
    boundary.classification === "PORTAL_FRAME"
  ));
  const exitPortalAperture = exitPortalBoundary?.apertures.find((aperture) => aperture.assembly === "PORTAL");
  const exitPortalWidth = exitPortalAperture?.clearWidth ?? 2.5;
  const exitPortalCenter: BreachV2TopologyPoint = exitPortalAperture
    ? [
      (exitPortalAperture.start[0] + exitPortalAperture.end[0]) / 2,
      (exitPortalAperture.start[1] + exitPortalAperture.end[1]) / 2,
    ]
    : [lm.exitPoint.x + 0.6, lm.exitPoint.z];
  const exitWater = new THREE.Mesh(
    new THREE.PlaneGeometry(exitPortalWidth, 3.4, 32, 24),
    exitWaterMaterial,
  );
  exitWater.name = "heartvale-soulwell-water-threshold";
  exitWater.position.set(exitPortalCenter[0], 1.7, exitPortalCenter[1]);
  exitWater.rotation.y = exitPortalBoundary
    && Math.abs(exitPortalBoundary.start[0] - exitPortalBoundary.end[0]) < 0.001
    ? -Math.PI / 2 : 0;
  exitWater.renderOrder = 5;
  exitWater.userData = {
    vfxKind: "soulwell-water-threshold",
    collisionMode: "traversable",
    spatialOwnerId: `effect:soulwell-exit:${exitPortalAperture?.apertureId ?? "unresolved"}`,
    blocksMovement: false,
    blocksLineOfSight: false,
    sourceLane: "HOUDINI_APPRENTICE_POC_RUNTIME_SHADER",
    houdiniProductionStatus: "POC_VALIDATED_NONCOMMERCIAL",
    boundaryId: exitPortalBoundary?.boundaryId ?? null,
    apertureId: exitPortalAperture?.apertureId ?? null,
    clearWidth: exitPortalWidth,
  };
  group.add(exitWater);
  tickables.push((elapsed) => { exitWaterMaterial.uniforms.uTime!.value = elapsed; });

  // Landmark builders use local floor-relative Y values. Lift each authored
  // assembly once after construction so animated children retain local motion.
  for (const child of group.children) {
    child.position.y += floorElevationAt(layout, child.position.x, child.position.z);
  }

  return tickables;
}


// ---------------------------------------------------------------------------
// wall art (§5A framed planes) + book/scroll props
// ---------------------------------------------------------------------------
const ART_TEXTURES: Record<string, string> = {
  "art-thalenyr-atlas": `${ART_ROOT}/thalenyr-atlas.webp`,
  "art-heartvale-section": `${ART_ROOT}/heartvale-section.webp`,
  "art-breach-v2-flatmap": `${ART_ROOT}/breach-v2-flatmap.webp`,
  "art-banner-wayfarer": `${ART_ROOT}/art-banner-wayfarer.webp`,
  "art-banner-oathbreaker": `${ART_ROOT}/art-banner-oathbreaker.webp`,
  "art-banner-ashen": `${ART_ROOT}/art-banner-ashen.webp`,
  "art-banner-cinderbound": `${ART_ROOT}/art-banner-cinderbound.webp`,
  "art-banner-oathscar": `${ART_ROOT}/art-banner-oathscar.webp`,
  "art-relief-warden": `${ART_ROOT}/art-relief-warden.webp`,
  "art-relief-first-memory": `${ART_ROOT}/art-relief-first-memory.webp`,
  "art-relief-toll": `${ART_ROOT}/art-relief-toll.webp`,
  "art-relief-lock-inscription": `${ART_ROOT}/art-relief-lock-inscription.webp`,
  "art-painting-reliquary": `${ART_ROOT}/art-painting-reliquary.webp`,
  "art-painting-winged-skyship": `${ART_ROOT}/art-painting-winged-skyship.webp`,
  "art-map-thalenyr-scroll": `${ART_ROOT}/art-map-thalenyr-scroll.webp`,
};
const ART_FACING_NORMAL: Record<string, [number, number]> = {
  south: [0, 1], north: [0, -1], east: [1, 0], west: [-1, 0],
};

function buildWallArtAndBooks(scene: THREE.Scene, layout: BreachV2Layout, texLoader: THREE.TextureLoader): void {
  const group = new THREE.Group();
  group.name = "breach-v2-wall-art";
  scene.add(group);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3d2e1a, roughness: 0.5, metalness: 0.35 });
  const placeholderMat = new THREE.MeshStandardMaterial({ color: 0x4d424d, roughness: 0.8 });
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xc9b78f, roughness: 0.92 });
  const bookCoverMats = [0x4d211d, 0x233a32, 0x2b3154, 0x5b4421].map((color) => (
    new THREE.MeshStandardMaterial({ color, roughness: 0.76, metalness: 0.02 })
  ));

  for (const [placementIndex, p] of layout.placements.entries()) {
    const spatialOwnerId = `${p.roomId}:${p.asset}:${placementIndex}`;
    if (p.role === "wall-art") {
      const w = p.width ?? 1.6;
      const h = p.height ?? w * 0.7;
      const [nx, nz] = ART_FACING_NORMAL[p.facing] ?? [0, 1];
      const yaw = Math.atan2(nx, nz);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.08), frameMat);
      frame.position.set(p.x, p.floorElevation + 1.65, p.z);
      frame.rotation.y = yaw;
      frame.castShadow = true;
      setSpatialContract(frame, {
        spatialOwnerId,
        collisionMode: "wall-attachment-nonblocking",
        blocksMovement: false,
        blocksLineOfSight: false,
      });
      group.add(frame);
      const url = ART_TEXTURES[p.asset];
      let artMat: THREE.Material = placeholderMat;
      if (url) {
        const tex = texLoader.load(url);
        tex.colorSpace = THREE.SRGBColorSpace;
        artMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
      }
      const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), artMat);
      art.position.set(p.x + nx * 0.07, p.floorElevation + 1.65, p.z + nz * 0.07);
      art.rotation.y = yaw;
      setSpatialContract(art, {
        spatialOwnerId,
        collisionMode: "wall-attachment-nonblocking",
        blocksMovement: false,
        blocksLineOfSight: false,
      });
      group.add(art);
    } else if (p.role === "readable-props") {
      const pile = new THREE.Group();
      pile.name = `readable-${p.asset}`;
      pile.position.set(p.x, p.elevation ?? 0, p.z);
      pile.rotation.y = THREE.MathUtils.degToRad(p.yaw);
      setSpatialContract(pile, {
        spatialOwnerId,
        collisionMode: "readable-prop-nonblocking",
        blocksMovement: false,
        blocksLineOfSight: false,
      });
      if (p.asset === "scrolls-pile") {
        for (let index = 0; index < 3; index += 1) {
          const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.46 + index * 0.05, 10), paperMat);
          scroll.position.set((index - 1) * 0.15, 0.09 + index * 0.035, (index % 2) * 0.09);
          scroll.rotation.z = Math.PI / 2;
          scroll.rotation.y = index * 0.22;
          scroll.castShadow = true;
          pile.add(scroll);
        }
      } else {
        const dimensions = [[0.54, 0.09, 0.36], [0.48, 0.1, 0.34], [0.5, 0.085, 0.32]] as const;
        let y = 0;
        for (const [index, [w, h, d]] of dimensions.entries()) {
          const cover = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bookCoverMats[index % bookCoverMats.length]);
          cover.position.set((index - 1) * 0.025, y + h / 2, index % 2 === 0 ? 0.01 : -0.015);
          cover.rotation.y = (index - 1) * 0.08;
          cover.castShadow = true;
          const pages = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, h * 0.62, d * 0.93), paperMat);
          pages.position.copy(cover.position);
          pages.rotation.copy(cover.rotation);
          pages.castShadow = true;
          pile.add(cover, pages);
          y += h + 0.012;
        }
      }
      group.add(pile);
    }
  }
}

/** Corruption veins: emissive strips scaling with room corruption level. */
function buildCorruption(scene: THREE.Scene, layout: BreachV2Layout): void {
  const group = new THREE.Group();
  group.name = "breach-v2-corruption";
  scene.add(group);
  for (const room of layout.rooms) {
    if (room.corruption < 0.45) continue;
    const intensity = 0.35 + room.corruption * 0.8;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x661f14, roughness: 0.5, emissive: 0xd94d26, emissiveIntensity: intensity,
    });
    for (const [stripIndex, [cx, cz, sx, sz]] of ([
      [room.x + room.w / 2, room.z + 0.12, room.w * 0.8, 0.06],
      [room.x + 0.12, room.z + room.h / 2, 0.06, room.h * 0.8],
    ] as const).entries()) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.05, sz), mat);
      strip.position.set(cx, floorElevationAt(layout, cx, cz) + 0.06, cz);
      setSpatialContract(strip, {
        spatialOwnerId: `effect:corruption:${room.id}:${stripIndex}`,
        collisionMode: "surface-vfx",
        blocksMovement: false,
        blocksLineOfSight: false,
      });
      group.add(strip);
    }
  }
}

// ---------------------------------------------------------------------------
// lights + cameras + HUD + hooks
// ---------------------------------------------------------------------------
function setupLights(scene: THREE.Scene, layout: BreachV2Layout): void {
  // readable base layer — darkness never blocks navigation or readability
  scene.add(new THREE.HemisphereLight(0x526177, 0x342b20, 1.65));
  scene.add(new THREE.AmbientLight(0x404752, 1.15));
  // cool "breach light" from the east so far walls never fall to black
  const breachGlow = new THREE.DirectionalLight(0x667b94, 0.8);
  breachGlow.position.set(260, 40, 10);
  scene.add(breachGlow);
  // Shadow discipline: only the two landmark lights cast (each shadow-casting
  // point light adds a cube shadow pass AND one shader texture unit per light —
  // uncapped shadows exceed MAX_TEXTURE_IMAGE_UNITS and explode the frame cost).
  const SHADOW_LIGHTS = new Set(["boss-ember"]);
  for (const spec of layout.lights) {
    // Each authored fire fixture already owns its local point light. Creating
    // the registry light again doubled the per-fragment lighting cost. The
    // Soul Well owns a tuned animated key/bounce pair in buildLandmarks.
    if (spec.id.startsWith("fire-") || spec.id === "exit-daylight" || spec.id === "soul-well-glow") continue;
    const light = new THREE.PointLight(new THREE.Color(spec.color), spec.intensity * 14, spec.radius * 2.4, 1.5);
    light.position.set(spec.x, spec.y, spec.z);
    light.castShadow = spec.castsShadow && SHADOW_LIGHTS.has(spec.id);
    if (light.castShadow) {
      light.shadow.mapSize.set(512, 512);
      light.shadow.bias = -0.01;
    }
    scene.add(light);
  }
  // trial-door accents: cyan over Wayfarer, ember over Oathbreaker
  for (const [lm, color] of [[layout.landmarks.doorWayfarer, 0x46d9e8], [layout.landmarks.doorOathbreaker, 0xe86a3c]] as const) {
    const doorLight = new THREE.PointLight(color, 8, 9, 1.6);
    doorLight.position.set(lm.x - 1.2, lm.elevation + 2.6, lm.z);
    scene.add(doorLight);
  }
  const vestibuleExitLight = new THREE.PointLight(0xfff0dc, 7.5, 9, 1.65);
  vestibuleExitLight.name = "vestibule-exit-read-light";
  vestibuleExitLight.position.set(27.2, floorElevationAt(layout, 27.2, 11) + 2.35, 11);
  scene.add(vestibuleExitLight);
  // the "first outdoor moment": daylight spilling west into the Way Upward
  const exitSpec = layout.lights.find((l) => l.id === "exit-daylight");
  if (exitSpec) {
    const day = new THREE.SpotLight(0xd7e7c7, 10, 34, Math.PI / 3.0, 0.6, 1.25);
    day.name = "heartvale-threshold-daylight";
    day.position.set(exitSpec.x + 4, exitSpec.y + 0.4, exitSpec.z);
    day.target.position.set(exitSpec.x - 12, floorElevationAt(layout, exitSpec.x - 12, exitSpec.z) + 1.0, exitSpec.z);
    scene.add(day, day.target);
  }
  // wall-map accent lights so the readable art reads (§5A) — maps brightest
  for (const p of layout.placements) {
    if (p.role !== "wall-art") continue;
    const isMap = ["art-thalenyr-atlas", "art-heartvale-section", "art-breach-v2-flatmap"].includes(p.asset);
    if (!isMap) continue;
    const [nx, nz] = ART_FACING_NORMAL[p.facing] ?? [0, 1];
    const artLight = new THREE.PointLight(0xfff0d8, isMap ? 3.4 : 1.6, isMap ? 7 : 5, 1.7);
    artLight.position.set(p.x + nx * 1.2, p.floorElevation + 2.5, p.z + nz * 1.2);
    scene.add(artLight);
  }
}

export interface CameraPreset {
  target: [number, number, number];
  offset: [number, number, number];
  minDistance?: number;
}

export function cameraPresets(layout: BreachV2Layout): Record<string, CameraPreset> {
  const lm = layout.landmarks;
  const firstChamber = layout.rooms.find((r) => !r.fixed) ?? layout.rooms[0]!;
  const isometricTarget = new THREE.Vector3();
  const isometricPosition = new THREE.Vector3();
  writeBreachV2IsometricCameraPose(
    { x: lm.playerStart.x, y: lm.playerStart.elevation, z: lm.playerStart.z },
    BREACH_V2_ISOMETRIC_DEFAULT_YAW,
    BREACH_V2_ISOMETRIC_DEFAULT_PITCH,
    BREACH_V2_ISOMETRIC_DEFAULT_DISTANCE,
    isometricTarget,
    isometricPosition,
  );
  const isometricOffset = isometricPosition.sub(isometricTarget);
  return {
    vestibule: {
      target: [lm.soulWell.x, lm.soulWell.elevation + 0.8, lm.soulWell.z],
      offset: [10.5, 6.2, 9.0],
      minDistance: 5.5,
    },
    isometric: {
      target: [isometricTarget.x, isometricTarget.y, isometricTarget.z],
      offset: [isometricOffset.x, isometricOffset.y, isometricOffset.z],
    },
    plaza: { target: [lm.doorWayfarer.x - 4, lm.doorWayfarer.elevation + 1.2, lm.doorWayfarer.z + 3.5], offset: [-9, 3.4, 0.5] },
    gallery: {
      target: [firstChamber.x + firstChamber.w / 2, firstChamber.floorElevation + 1.0, firstChamber.z + firstChamber.h / 2],
      offset: [-6.5, 4.4, -5.0],
    },
    boss: { target: [layout.boss.x, layout.boss.elevation + 1.2, layout.boss.z], offset: [-9.5, 5.4, -6.5] },
    exit: { target: [lm.exitPoint.x - 2, lm.exitPoint.elevation + 1.4, lm.exitPoint.z], offset: [-10.5, 3.2, 0.2] },
    overview: { target: [130, 4, 12], offset: [0, 165, -46] },
  };
}

function setupHud(container: HTMLElement): HTMLDivElement {
  const hud = document.createElement("div");
  hud.dataset.testid = "breach-v2-performance-details";
  hud.setAttribute("aria-live", "polite");
  hud.style.cssText = [
    "position:absolute", "left:12px", "top:calc(max(12px,env(safe-area-inset-top)) + 52px)", "z-index:26",
    "max-width:min(760px,calc(100vw - 24px))", "padding:7px 10px", "box-sizing:border-box",
    "background:rgba(7,11,16,.76)", "border:1px solid rgba(127,232,255,.24)", "color:#d8e8e6",
    "font:10px/1.45 ui-monospace,Consolas,monospace", "border-radius:9px", "pointer-events:none",
    "white-space:pre-wrap", "box-shadow:0 8px 22px rgba(0,0,0,.34)", "backdrop-filter:blur(7px)",
  ].join(";");
  container.appendChild(hud);
  return hud;
}

export async function startDungeonPreview(
  container: HTMLElement,
  options: { seed: number; path: "wayfarer" | "oathbreaker"; cam: string },
): Promise<void> {
  container.style.cssText = "position:fixed;inset:0;overflow:hidden;background:#0b0d10;";
  const loading = document.createElement("div");
  loading.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#e0d8c0;font:14px monospace;";
  loading.textContent = `Assembling BREACH-V2 — seed ${options.seed} · ${options.path}…`;
  container.appendChild(loading);

  const layout = buildBreachV2Layout(options.seed, options.path, DUNGEON_PROP_ASSETS);
  const legacyLandmarkRoomId = resolveBreachV2LegacyLandmarkRoomId(options.cam, layout.rooms);
  const activeCameraMode = legacyLandmarkRoomId ? "isometric" : options.cam;
  const environmentConfigs = buildBreachV2EnvironmentObjectConfigs(layout);
  const cofferObjectId = environmentConfigs.find((config) => (
    config.destructionClass === "INTERACTABLE_CONTAINER"
  ))?.id ?? "vestibule:storage-chest";
  let removedEnvironmentColliderIds: string[] = [];
  let debrisCleanupDeadlineMs = 0;
  let syncEnvironmentState: ((state: BreachV2EnvironmentState) => void) | null = null;
  const runId = `breach-v2:${options.seed}:${options.path}`;
  const previewUrl = new URL(window.location.href);
  const animationReviewEnabled = previewUrl.searchParams.get("animationReview") === "1";
  const creatureReviewEnabled = previewUrl.searchParams.get("creatureReview") === "1";
  clearBreachV2LegacySpatialStateForExplicitUrl(previewUrl, window.sessionStorage);
  // The preview is a production-zone test harness: active-route doors are
  // unlocked by default so reviewers can traverse every section. Add
  // `gates=on` only when explicitly validating the campaign progression locks.
  const progressionGatesEnabled = previewUrl.searchParams.get("gates") === "on";
  if (previewUrl.searchParams.get("fresh") === "1") {
    await storyDatabase.clearDungeonRun(runId);
    previewUrl.searchParams.delete("fresh");
    window.history.replaceState(null, "", previewUrl);
  }
  const savedState = await storyDatabase.loadDungeonRun<BreachV2RunState>(runId);
  const gameplay = createBreachV2RunController({
    seed: options.seed,
    path: options.path,
    chamberIds: layout.rooms.filter((room) => !room.fixed).map((room) => room.id),
    rewardId: layout.rewardId,
    bossHp: layout.boss.maxHp,
    cofferObjectId,
    deterministicTestItemId: `breach-v2-starter-${options.seed}-${options.path}`,
    environmentObjects: environmentConfigs,
    savedState,
    onChange: (state) => {
      syncEnvironmentState?.(state.environment);
      void storyDatabase.saveDungeonRun(runId, state).catch((error: unknown) => {
        console.error("unable to persist BREACH-V2 run", error);
      });
    },
  });

  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const storedGraphicsMode = window.localStorage.getItem("breach-v2-graphics-mode");
  let graphicsMode: BreachV2GraphicsMode = storedGraphicsMode === "low"
    || storedGraphicsMode === "standard"
    || storedGraphicsMode === "high"
    || storedGraphicsMode === "auto"
    ? storedGraphicsMode
    : "auto";
  const deviceMemoryGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null;
  const autoGraphicsCeiling = resolveBreachV2AutoGraphicsQuality({
    coarsePointer,
    hardwareConcurrency: navigator.hardwareConcurrency || 4,
    deviceMemoryGb,
    pixelRatio: window.devicePixelRatio,
  });
  let graphicsQuality: BreachV2GraphicsQuality = graphicsMode === "auto"
    ? autoGraphicsCeiling
    : graphicsMode;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(container.clientWidth, container.clientHeight);
  if (coarsePointer) renderer.domElement.style.touchAction = "none";
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d10);
  scene.fog = new THREE.FogExp2(0x0d0f14, 0.0055);

  const applyGraphicsQuality = (quality: BreachV2GraphicsQuality): void => {
    graphicsQuality = quality;
    const pixelRatioCap = quality === "low" ? 0.8 : quality === "standard" ? 1 : 1.35;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
    renderer.shadowMap.enabled = quality !== "low";
    renderer.shadowMap.needsUpdate = true;
  };
  applyGraphicsQuality(graphicsQuality);

  const camera = new THREE.PerspectiveCamera(
    46, container.clientWidth / container.clientHeight, 0.2, 400,
  );
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxDistance = 180;

  const texLoader = new THREE.TextureLoader();
  const gltfLoader = new GLTFLoader();
  gltfLoader.setMeshoptDecoder(MeshoptDecoder); // kit GLBs are meshopt-compressed

  const materials = loadShellTextures(texLoader);
  const shellGroup = buildShell(layout, materials);
  scene.add(shellGroup);
  const architecturalEnvironmentObjects = buildArchitecturalPolish(scene, layout, materials);
  const ceilings = shellGroup.getObjectByName("shell-ceilings");
  const propPlacement = await placeKitProps(scene, layout, gltfLoader);
  const environmentObjects = [
    ...architecturalEnvironmentObjects,
    ...propPlacement.environmentObjects,
  ];
  let runtimeCollisionRefreshRequested = true;
  syncEnvironmentState = (state) => {
    removedEnvironmentColliderIds = [...state.removedColliderIds];
    debrisCleanupDeadlineMs = state.debrisObjectIds.length > 0
      ? debrisCleanupDeadlineMs || performance.now() + 2500
      : 0;
    const destroyedIds = new Set(state.destroyedObjectIds);
    for (const object of environmentObjects) {
      const destroyed = destroyedIds.has(object.id);
      const openCoffer = object.coffer && state.cofferOpened;
      object.root.userData.dynamicRemoved = destroyed;
      object.root.userData.blocksMovement = !destroyed && !openCoffer
        && object.root.userData.blocksMovement === true;
      object.root.userData.blocksLineOfSight = !destroyed && !openCoffer
        && object.root.userData.blocksLineOfSight === true;
      object.root.userData.collisionMode = destroyed
        ? "destroyed-removed"
        : openCoffer ? "opened-container-nonblocking" : object.root.userData.collisionMode;
      object.root.visible = !destroyed;
      object.setCofferOpen?.(openCoffer);
      if (object.pickupRoot) {
        object.pickupRoot.visible = state.pickupDropped && !state.pickupCollected;
      }
    }
    runtimeCollisionRefreshRequested = true;
  };
  syncEnvironmentState(gameplay.snapshot().environment);
  let playerPositionForPortalSafety: { x: number; z: number } | null = null;
  const sectionDoors = await placeSectionDoors(
    scene,
    layout,
    gltfLoader,
    (doorId) => !progressionGatesEnabled || gameplay.requestDoor(doorId).allowed,
    () => playerPositionForPortalSafety,
  );
  const landmarkTickables = buildLandmarks(scene, layout);
  buildWallArtAndBooks(scene, layout, texLoader);
  buildCorruption(scene, layout);
  setupLights(scene, layout);
  if (activeCameraMode === "overview") {
    // Survey mode is an architectural QA view, so the whole shell must remain
    // legible at once instead of depending on local sconces hundreds of metres
    // apart. Gameplay cameras retain the authored lighting and fog.
    scene.fog = null;
    renderer.toneMappingExposure = 1.3;
    scene.add(new THREE.HemisphereLight(0xb9c8d6, 0x54483d, 3.2));
    for (const material of [materials.flagstone, materials.masonry]) {
      material.emissiveMap = material.map;
      material.emissive.set(0x454545);
      material.emissiveIntensity = 0.7;
      material.needsUpdate = true;
    }
  }

  const presets = cameraPresets(layout);

  // ---- walk mode: WASD on the hidden nav grid (collision from the generator's
  // own walkable cells — the same data the invariant suite proves reachable)
  const firstPersonMode = activeCameraMode === "firstperson";
  const isometricMode = activeCameraMode === "isometric";
  const walkMode = activeCameraMode === "walk" || firstPersonMode || isometricMode;
  const ceilingCameraMode: BreachV2CeilingCameraMode = firstPersonMode
    ? "firstperson"
    : isometricMode
      ? "isometric"
      : activeCameraMode === "overview"
        ? "overview"
        : walkMode
          ? "thirdperson"
          : "orbit";
  let ceilingsVisible = walkMode && !isometricMode;
  const syncCeilingRenderState = (): void => {
    if (!ceilings) return;
    ceilings.visible = ceilingsVisible;
    ceilings.userData.blocksCamera = ceilingsVisible;
  };
  syncCeilingRenderState();
  const genData = generateBreachV2(options.seed, options.path);
  // blockedCells remains a coarse generator diagnostic/export. Runtime
  // standability uses final fitted colliders; deleting whole 1.75 m cells and
  // then expanding them again by the actor radius creates false raster chokes.
  const walkable = new Set(genData.navCells.map(breachV2CellKey));
  const NAV = layout.meta.navCell;
  const placementColliders = buildBreachV2PlacementColliders(
    layout,
    propPlacement.placementProxyMeasurements,
  );
  const staticCollisionBlockers = [
    ...buildBreachV2ShellColliders(layout),
    ...placementColliders,
    ...buildBreachV2LandmarkColliders(layout),
  ];
  const cameraOnlyColliders = buildBreachV2CameraOnlyColliders(layout);
  const localCeilingYAt = (x: number, z: number): number | null => {
    const localCaps = cameraOnlyColliders.ceilings.filter((collider) => (
      x >= collider.minX && x <= collider.maxX && z >= collider.minZ && z <= collider.maxZ
    ));
    return localCaps.length > 0
      ? Math.min(...localCaps.map((collider) => collider.minY))
      : null;
  };
  const updateCeilingState = (desiredCameraY: number, targetX: number, targetZ: number): boolean => {
    const previous = ceilingsVisible;
    ceilingsVisible = resolveBreachV2CeilingVisibility(
      ceilingsVisible,
      ceilingCameraMode,
      desiredCameraY,
      localCeilingYAt(targetX, targetZ),
    );
    syncCeilingRenderState();
    return previous !== ceilingsVisible;
  };
  const getRuntimeCollisionBlockers = (): BreachV2PlanarCollider[] => [
    ...filterBreachV2RemovedColliders(staticCollisionBlockers, removedEnvironmentColliderIds),
    ...getBreachV2VisibleCameraColliders(cameraOnlyColliders, ceilingsVisible),
    ...sectionDoors.getCollisionBlockers(),
  ];
  const getNavigationCollisionBlockers = (): BreachV2PlanarCollider[] => [
    ...filterBreachV2RemovedColliders(staticCollisionBlockers, removedEnvironmentColliderIds),
    ...getBreachV2VisibleCameraColliders(cameraOnlyColliders, ceilingsVisible),
  ];
  let runtimeCollisionBlockers = getRuntimeCollisionBlockers();
  runtimeCollisionRefreshRequested = false;
  // The generator's 1.75 m cells prove whole-zone reachability, but they are
  // too coarse for click paths around a player-radius dogleg. Plan at half a
  // nav cell while retaining the exact same floor, blocker, and door predicate
  // used by WASD movement.
  const PATH_CELL = NAV / 2;
  const canProfileStandAtWith = (
    blockers: readonly BreachV2PlanarCollider[],
    radius: number,
    x: number,
    z: number,
  ): boolean => {
    const r = Math.max(0, radius);
    if (isBreachV2PlacementBlocked(blockers, x, z, r)) return false;
    for (const [ox, oz] of [[r, r], [r, -r], [-r, r], [-r, -r]] as const) {
      if (!hasDungeonFloorAt(layout, x + ox, z + oz)) return false;
      if (!walkable.has(`${Math.floor((x + ox) / NAV)},${Math.floor((z + oz) / NAV)}`)) return false;
    }
    return true;
  };
  const canProfileStandAt = (radius: number, x: number, z: number): boolean => (
    canProfileStandAtWith(runtimeCollisionBlockers, radius, x, z)
  );
  const isWalkable = (x: number, z: number): boolean => canProfileStandAt(0.35, x, z);
  const requestedStart = new URL(window.location.href).searchParams.get("start")
    ?? legacyLandmarkRoomId;
  const requestedRoom = requestedStart
    ? layout.rooms.find((room) => room.id === requestedStart || ("poolRoomId" in room && room.poolRoomId === requestedStart))
    : null;
  const isSpawnClear = (x: number, z: number): boolean => layout.placements.every((placement) => {
    if (placement.placement !== "floor") return true;
    const clearance = (placement.footprint ?? 0.8) / 2 + 0.55;
    return Math.hypot(x - placement.x, z - placement.z) >= clearance;
  });
  const nearestWalkable = (
    x: number,
    z: number,
    requirePropClear = false,
    destinationRoom: BreachV2Layout["rooms"][number] | null = null,
  ): [number, number] => {
    const insideDestination = (candidateX: number, candidateZ: number): boolean => (
      !destinationRoom
      || (
        candidateX >= destinationRoom.x + 0.45
        && candidateX <= destinationRoom.x + destinationRoom.w - 0.45
        && candidateZ >= destinationRoom.z + 0.45
        && candidateZ <= destinationRoom.z + destinationRoom.h - 0.45
      )
    );
    const valid = (candidateX: number, candidateZ: number): boolean => (
      insideDestination(candidateX, candidateZ) &&
      isWalkable(candidateX, candidateZ)
      && (!requirePropClear || isSpawnClear(candidateX, candidateZ))
    );
    if (valid(x, z)) return [x, z];
    for (let radius = PATH_CELL; radius <= NAV * 5; radius += PATH_CELL) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const candidateX = x + Math.cos(angle) * radius;
        const candidateZ = z + Math.sin(angle) * radius;
        if (valid(candidateX, candidateZ)) return [candidateX, candidateZ];
      }
    }
    if (destinationRoom) {
      for (let candidateZ = destinationRoom.z + PATH_CELL; candidateZ < destinationRoom.z + destinationRoom.h; candidateZ += PATH_CELL) {
        for (let candidateX = destinationRoom.x + PATH_CELL; candidateX < destinationRoom.x + destinationRoom.w; candidateX += PATH_CELL) {
          if (valid(candidateX, candidateZ)) return [candidateX, candidateZ];
        }
      }
    }
    return [layout.landmarks.playerStart.x, layout.landmarks.playerStart.z];
  };
  const requestedPosition = requestedRoom && requestedRoom.id !== "vestibule"
    ? nearestWalkable(
      requestedRoom.x + requestedRoom.w / 2,
      requestedRoom.z + requestedRoom.h / 2,
      true,
      requestedRoom,
    )
    : nearestWalkable(layout.landmarks.playerStart.x, layout.landmarks.playerStart.z);
  const playerPos = new THREE.Vector3(
    requestedPosition[0],
    floorElevationAt(layout, requestedPosition[0], requestedPosition[1]),
    requestedPosition[1],
  );
  const fogOfWar = setupBreachV2FogOfWar({
    scene,
    layout,
    initialX: playerPos.x,
    initialZ: playerPos.z,
  });
  playerPositionForPortalSafety = playerPos;
  const setPlayerPosition = (x: number, z: number): void => {
    playerPos.set(x, floorElevationAt(layout, x, z), z);
  };
  const gameplayUi = setupBreachV2GameplayUi({
    container,
    layout,
    controller: gameplay,
    getPlayerPosition: () => playerPos,
    getEnvironmentTargets: () => {
      const state = gameplay.snapshot().environment;
      const destroyed = new Set(state.destroyedObjectIds);
      const targets: BreachV2EnvironmentUiTarget[] = environmentObjects
        .filter((object) => !destroyed.has(object.id))
        .map((object) => ({
          id: object.id,
          label: object.label,
          x: object.x,
          z: object.z,
          damageable: !object.coffer,
        }));
      const coffer = environmentObjects.find((object) => object.coffer);
      if (coffer && state.pickupDropped && !state.pickupCollected) {
        targets.push({
          id: "coffer-pickup",
          label: "dropped starter weapon",
          x: coffer.x + 1.25,
          z: coffer.z,
          damageable: false,
          interactionId: "coffer-pickup",
        });
      }
      return targets;
    },
    damageEnvironment: (targetId) => { gameplay.damageEnvironmentObject(targetId, 999); },
    isLineOfSightBlocked: (start, end) => (
      isBreachV2LineOfSightBlocked(runtimeCollisionBlockers, start, end)
    ),
  });
  loading.textContent = "Loading creatures for the active room…";
  const breachlingRuntime = createBreachV2BreachlingRuntime(
    scene,
    layout,
    gltfLoader,
    options.path,
  );
  await breachlingRuntime.warmAt(playerPos.x, playerPos.z);
  let creatureAnimationReview: BreachV2CreatureReview | null = null;
  if (creatureReviewEnabled) {
    creatureAnimationReview = setupBreachV2CreatureReview(container, breachlingRuntime);
  }
  let camYaw = isometricMode ? BREACH_V2_ISOMETRIC_DEFAULT_YAW : 0.08;
  let camPitch = isometricMode ? BREACH_V2_ISOMETRIC_DEFAULT_PITCH : 0.24;
  let camDist = firstPersonMode ? 0 : isometricMode ? BREACH_V2_ISOMETRIC_DEFAULT_DISTANCE : 4.4;
  const keys = new Set<string>();
  const clickPath: THREE.Vector3[] = [];
  let queueClickDestination: ((x: number, z: number) => boolean) | null = null;
  let player: THREE.Object3D | null = null;
  let foundationPlayerActor: BreachV2HumanFoundationActor | null = null;
  let foundationAnimationReview: BreachV2HumanFoundationReview | null = null;
  setupBreachV2MobileMovementPad({
    container,
    keys,
    enabled: coarsePointer && walkMode,
    adjustCameraDistance: (delta) => {
      if (firstPersonMode) return;
      const minDistance = isometricMode ? BREACH_V2_ISOMETRIC_MIN_DISTANCE : 2.4;
      const maxDistance = isometricMode ? BREACH_V2_ISOMETRIC_MAX_DISTANCE : 10;
      camDist = resolveBreachV2CameraStep(camDist, delta, minDistance, maxDistance);
    },
  });
  setupBreachV2MobileLandscapeGate({
    container,
    enabled: coarsePointer && walkMode,
  });
  if (walkMode) {
    controls.enabled = false;
    loading.textContent = "Loading Human Foundation player…";
    const humanFoundationFactory = await createBreachV2HumanFoundationActorFactory(gltfLoader);
    foundationPlayerActor = humanFoundationFactory.createPlayer();
    player = foundationPlayerActor.root;
    player.visible = !firstPersonMode;
    player.userData.spatialAuditExcluded = "runtime-player-avatar";
    scene.add(player);
    player.position.set(playerPos.x, playerPos.y, playerPos.z);
    if (animationReviewEnabled) {
      foundationAnimationReview = setupBreachV2HumanFoundationReview(container, foundationPlayerActor);
    }
    let dragging = false;
    let pointerTravel = 0;
    let primaryPointerId: number | null = null;
    let pinchSpan: number | null = null;
    let pointerWasPinch = false;
    let pointerRotated = false;
    const activePointers = new Map<number, { x: number; y: number; pointerType: string }>();
    const pointerRaycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const activePointerSpan = (): number | null => {
      const points = [...activePointers.values()];
      if (points.length < 2) return null;
      return Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y);
    };
    const setPointerRay = (clientX: number, clientY: number): void => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      pointerRaycaster.setFromCamera(pointerNdc, camera);
    };
    const pickDoorObject = (): THREE.Object3D | null => {
      const doorHit = pointerRaycaster.intersectObjects(sectionDoors.interactionRoots, true)[0];
      if (!doorHit) return null;
      // The nearest physical render owner must be this door. Walls, landmarks,
      // fitted props and boss cover all occlude interaction; nonblocking VFX,
      // floors and debug markers do not steal the tap.
      const physicalHit = pointerRaycaster.intersectObjects(scene.children, true).find((intersection) => {
        let cursor: THREE.Object3D | null = intersection.object;
        while (cursor && !(cursor instanceof THREE.Scene)) {
          if (cursor.userData.blocksMovement === true || cursor.userData.blocksLineOfSight === true) {
            return true;
          }
          cursor = cursor.parent;
        }
        return false;
      });
      return !physicalHit || doorHit.distance <= physicalHit.distance + 0.02
        ? doorHit.object
        : null;
    };
    const pickWalkPoint = (): THREE.Vector3 | null => {
      return pointerRaycaster.intersectObject(shellGroup, true)
        .find((intersection) => intersection.object.name === "shell-floors")?.point.clone() ?? null;
    };
    const setClickDestination = (point: THREE.Vector3): void => {
      const targetRoom = layout.rooms.find((room) => (
        point.x >= room.x && point.x <= room.x + room.w
        && point.z >= room.z && point.z <= room.z + room.h
      ));
      const targetFogState = targetRoom ? fogOfWar.snapshot().roomStates[targetRoom.id] : null;
      if (targetFogState === "hidden") {
        clickPath.length = 0;
        return;
      }
      const [targetX, targetZ] = nearestWalkable(point.x, point.z);
      const navigationBlockers = getNavigationCollisionBlockers();
      const path = findBreachV2AdaptiveRuntimePath(
        { x: playerPos.x, z: playerPos.z },
        { x: targetX, z: targetZ },
        PATH_CELL,
        (x, z) => canProfileStandAtWith(navigationBlockers, 0.35, x, z),
      );
      clickPath.splice(0, clickPath.length, ...path.map((point) => (
        new THREE.Vector3(
          point.x,
          floorElevationAt(layout, point.x, point.z),
          point.z,
        )
      )));
    };
    queueClickDestination = (x, z) => {
      const [targetX, targetZ] = nearestWalkable(x, z);
      setClickDestination(new THREE.Vector3(
        targetX,
        floorElevationAt(layout, targetX, targetZ),
        targetZ,
      ));
      return clickPath.length > 0;
    };
    renderer.domElement.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY, pointerType: e.pointerType });
      renderer.domElement.setPointerCapture(e.pointerId);
      if (e.pointerType === "touch" && activePointers.size >= 2) {
        pointerWasPinch = true;
        pinchSpan = activePointerSpan();
        dragging = false;
        pointerTravel = Number.POSITIVE_INFINITY;
        return;
      }
      primaryPointerId = e.pointerId;
      dragging = true;
      pointerTravel = 0;
      pointerRotated = false;
    });
    renderer.domElement.addEventListener("pointerup", (e) => {
      e.preventDefault();
      const tapThreshold = e.pointerType === "touch" ? 16 : 8;
      const shouldTap = !pointerWasPinch
        && !pointerRotated
        && activePointers.size === 1
        && primaryPointerId === e.pointerId
        && pointerTravel < tapThreshold;
      if (shouldTap) {
        setPointerRay(e.clientX, e.clientY);
        const hitDoor = pickDoorObject();
        const toggledDoor = hitDoor
          ? sectionDoors.toggleHit(playerPos.x, playerPos.z, hitDoor)
          : null;
        const target = pickWalkPoint();
        if (!toggledDoor && target) setClickDestination(target);
      }
      activePointers.delete(e.pointerId);
      if (renderer.domElement.hasPointerCapture(e.pointerId)) {
        renderer.domElement.releasePointerCapture(e.pointerId);
      }
      if (activePointers.size < 2) pinchSpan = null;
      if (activePointers.size === 0) {
        dragging = false;
        primaryPointerId = null;
        pointerWasPinch = false;
        pointerRotated = false;
      }
    });
    renderer.domElement.addEventListener("pointermove", (e) => {
      const previous = activePointers.get(e.pointerId);
      if (!previous) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY, pointerType: e.pointerType });
      if (e.pointerType === "touch" && activePointers.size >= 2 && !firstPersonMode) {
        e.preventDefault();
        const nextSpan = activePointerSpan();
        if (pinchSpan !== null && nextSpan !== null) {
          const minDistance = isometricMode ? BREACH_V2_ISOMETRIC_MIN_DISTANCE : 2.4;
          const maxDistance = isometricMode ? BREACH_V2_ISOMETRIC_MAX_DISTANCE : 10;
          camDist = resolveBreachV2PinchDistance(
            camDist,
            pinchSpan,
            nextSpan,
            minDistance,
            maxDistance,
          );
        }
        pinchSpan = nextSpan;
        return;
      }
      if (!dragging || primaryPointerId !== e.pointerId) return;
      const movementX = e.clientX - previous.x;
      const movementY = e.clientY - previous.y;
      pointerTravel += Math.abs(movementX) + Math.abs(movementY);
      // A short contact remains a dependable floor tap. Once the deliberate
      // drag threshold is crossed, that gesture becomes camera orbit and can
      // no longer dispatch a movement target on release.
      if (e.pointerType === "touch") {
        if (pointerTravel >= BREACH_V2_TOUCH_ROTATE_THRESHOLD) {
          pointerRotated = true;
          camYaw = resolveBreachV2TouchYaw(camYaw, movementX);
          if (isometricMode) {
            camPitch = THREE.MathUtils.clamp(
              camPitch + movementY * 0.004,
              BREACH_V2_ISOMETRIC_MIN_PITCH,
              BREACH_V2_ISOMETRIC_MAX_PITCH,
            );
          }
        }
        return;
      }
      camYaw -= movementX * 0.0052;
      const minPitch = isometricMode ? BREACH_V2_ISOMETRIC_MIN_PITCH : -0.18;
      const maxPitch = isometricMode ? BREACH_V2_ISOMETRIC_MAX_PITCH : 0.58;
      camPitch = Math.min(maxPitch, Math.max(minPitch, camPitch + movementY * 0.004));
    });
    renderer.domElement.addEventListener("pointercancel", (e) => {
      activePointers.delete(e.pointerId);
      if (activePointers.size === 0) {
        dragging = false;
        primaryPointerId = null;
        pinchSpan = null;
        pointerWasPinch = false;
        pointerRotated = false;
      }
    });
    renderer.domElement.addEventListener("wheel", (e) => {
      if (!firstPersonMode) {
        const minDistance = isometricMode ? BREACH_V2_ISOMETRIC_MIN_DISTANCE : 2.4;
        const maxDistance = isometricMode ? BREACH_V2_ISOMETRIC_MAX_DISTANCE : 10;
        camDist = Math.min(maxDistance, Math.max(minDistance, camDist + e.deltaY * 0.008));
      }
    }, { passive: true });
    window.addEventListener("keydown", (e) => {
      keys.add(e.code);
      if (e.code === "KeyF" && !e.repeat) sectionDoors.toggleNearest(playerPos.x, playerPos.z);
      if (e.code === "KeyR" && !e.repeat) gameplayUi.interactNearest();
      if (e.code === "KeyX" && !e.repeat) gameplayUi.damageNearest();
      if (e.code === "Digit1" && !e.repeat) gameplay.attack();
      if (e.code === "Digit2" && !e.repeat) gameplay.guard();
      if (e.code === "Digit3" && !e.repeat) gameplay.recover();
    });
    window.addEventListener("keyup", (e) => keys.delete(e.code));
  }

  const preset = presets[activeCameraMode] ?? presets.vestibule!;
  if (!walkMode) {
    controls.minDistance = preset.minDistance ?? 0;
    controls.target.set(...preset.target);
    camera.position.set(
      preset.target[0] + preset.offset[0],
      preset.target[1] + preset.offset[1],
      preset.target[2] + preset.offset[2],
    );
  }

  const hud = setupHud(container);
  let statsVisible = window.localStorage.getItem("breach-v2-performance-details") === "1";
  hud.hidden = !statsVisible;
  const settingsPanel = setupBreachV2SettingsPanel({
    container,
    initialMode: graphicsMode,
    initialEffectiveQuality: graphicsQuality,
    initialStatsVisible: statsVisible,
    performanceDetails: hud,
    dockPerformanceDetails: shouldDockBreachV2PerformanceDetails(coarsePointer, window.innerWidth),
    onModeChange: (mode) => {
      graphicsMode = mode;
      window.localStorage.setItem("breach-v2-graphics-mode", mode);
      applyGraphicsQuality(mode === "auto" ? autoGraphicsCeiling : mode);
      settingsPanel.updateEffectiveQuality(graphicsQuality);
    },
    onStatsVisibilityChange: (visible) => {
      statsVisible = visible;
      hud.hidden = !visible;
      window.localStorage.setItem("breach-v2-performance-details", visible ? "1" : "0");
    },
  });
  loading.textContent = "Compiling dungeon shaders…";
  try {
    await compileBreachV2StartupShaders(renderer, scene, camera);
    scene.userData.gpuWarmup = { mode: "shaders-only" };
  } catch (error) {
    console.warn("BREACH-V2 shader compilation was unavailable; continuing with lazy initialization", error);
  }
  loading.remove();

  const hooks = window as unknown as PreviewHooks;
  hooks.__dungeonScene = scene;
  hooks.__dungeonLayout = layout;
  hooks.__dungeonRenderer = renderer;
  hooks.__dungeonCamera = camera;
  hooks.__dungeonControls = walkMode ? null : controls;
  hooks.__dungeonFrames = 0;
  hooks.__dungeonLoopError = null;
  hooks.__dungeonStats = { calls: 0, triangles: 0, geometries: 0, textures: 0 };
  hooks.__dungeonMode = walkMode ? "walk" : "orbit";
  hooks.__dungeonCameraDistance = () => camDist;
  hooks.__dungeonCameraYaw = () => camYaw;
  hooks.__dungeonFogOfWar = () => fogOfWar.snapshot();
  hooks.__dungeonPlayer = { x: playerPos.x, y: playerPos.y, z: playerPos.z };
  hooks.__dungeonHumanFoundation = foundationPlayerActor ? {
    animationNames: foundationPlayerActor.animationNames,
    snapshot: foundationPlayerActor.snapshot,
    play: foundationPlayerActor.play,
    pose: foundationPlayerActor.pose,
    pause: foundationPlayerActor.pause,
  } : null;
  hooks.__dungeonCreatures = {
    snapshots: breachlingRuntime.snapshots,
    play: breachlingRuntime.play,
    pose: breachlingRuntime.pose,
    pause: breachlingRuntime.pause,
  };
  hooks.__dungeonWalkTo = (x, z) => {
    if (!walkMode || !isWalkable(x, z)) return false;
    setPlayerPosition(x, z);
    return true;
  };
  hooks.__dungeonCanStandAt = (x, z) => walkMode && isWalkable(x, z);
  hooks.__dungeonNavigateTo = (x, z) => queueClickDestination?.(x, z) ?? false;
  hooks.__dungeonPathRemaining = () => clickPath.length;
  hooks.__dungeonPathSnapshot = () => clickPath.map((point) => ({
    x: point.x,
    y: point.y,
    z: point.z,
  }));
  hooks.__dungeonCollisionBlockers = runtimeCollisionBlockers;
  hooks.__dungeonSpatialContractAudit = auditBreachV2SpatialContracts(scene, runtimeCollisionBlockers);
  hooks.__dungeonRefreshSpatialContractAudit = () => {
    const audit = auditBreachV2SpatialContracts(scene, runtimeCollisionBlockers);
    hooks.__dungeonSpatialContractAudit = audit;
    return audit;
  };
  hooks.__dungeonCanProfileStandAt = (radius, x, z) => (
    walkMode && canProfileStandAt(radius, x, z)
  );
  hooks.__dungeonPlanProfilePath = (radius, start, target) => (
    walkMode
      ? findBreachV2AdaptiveRuntimePath(
        start,
        target,
        PATH_CELL,
        (x, z) => canProfileStandAt(radius, x, z),
      )
      : []
  );
  hooks.__dungeonSweepMovement = (start, requestedEnd) => (
    sweepBreachV2Movement(start, requestedEnd, isWalkable)
  );
  hooks.__dungeonSweepProfileMovement = (radius, start, requestedEnd) => (
    sweepBreachV2Movement(
      start,
      requestedEnd,
      (x, z) => canProfileStandAt(radius, x, z),
    )
  );
  hooks.__dungeonLineOfSightBlocked = (start, end) => (
    isBreachV2LineOfSightBlocked(runtimeCollisionBlockers, start, end)
  );
  hooks.__dungeonSetDoorsOpen = (open) => sectionDoors.setAllOpen(open);
  hooks.__dungeonKeys = keys; // probe visibility
  hooks.__dungeonGameplay = {
    snapshot: () => gameplay.snapshot(),
    objective: () => gameplay.objective(),
    interact: (targetId) => gameplay.interact(targetId),
    enterRoom: (roomId) => gameplay.enterRoom(roomId),
    attack: () => gameplay.attack(),
    guard: () => gameplay.guard(),
    recover: () => gameplay.recover(),
    restartEncounter: () => gameplay.restartEncounter(),
    setCombatStyle: (style) => gameplay.setCombatStyle(style),
    requestDoor: (doorId) => gameplay.requestDoor(doorId).allowed,
  };
  hooks.__dungeonEnvironment = {
    objects: () => environmentConfigs.map((config) => ({ ...config })),
    snapshot: () => gameplay.snapshot().environment,
    damage: (targetId, damage) => gameplay.damageEnvironmentObject(targetId, damage),
    collectPickup: () => gameplay.interact("coffer-pickup"),
    cleanupDebris: (targetId) => gameplay.cleanupEnvironmentDebris(targetId),
    activeDebrisCount: () => gameplay.snapshot().environment.debrisObjectIds.length,
  };

  const warp = (roomId: string, x: number, z: number): boolean => {
    const destinationRoom = layout.rooms.find((room) => room.id === roomId);
    if (!destinationRoom) return false;
    const [walkX, walkZ] = nearestWalkable(x, z, true, destinationRoom);
    const insideDestination = walkX >= destinationRoom.x
      && walkX <= destinationRoom.x + destinationRoom.w
      && walkZ >= destinationRoom.z
      && walkZ <= destinationRoom.z + destinationRoom.h;
    if (!insideDestination) return false;
    if (walkMode) {
      clickPath.length = 0;
      setPlayerPosition(walkX, walkZ);
      fogOfWar.update(walkX, walkZ);
      gameplay.enterRoom(destinationRoom.id);
      return true;
    }
    // The dev panel handles a false result by reloading the destination in
    // isometric gameplay. Moving only an orbit camera left no avatar to continue with.
    return false;
  };
  setupBreachV2DevPanel({
    container,
    layout,
    seed: options.seed,
    path: options.path,
    cam: activeCameraMode,
    warp,
    setAllDoorsOpen: (open) => sectionDoors.setAllOpen(open),
  });

  const timer = new THREE.Timer();
  timer.connect(document);
  const cameraTarget = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const cameraDirection = new THREE.Vector3();
  const movementForward = new THREE.Vector3();
  const movementRight = new THREE.Vector3();
  const movementUp = new THREE.Vector3(0, 1, 0);
  const clampDesiredCameraAboveFloor = (
    requested: THREE.Vector3,
    fallbackFloor: number,
  ): void => {
    requested.y = resolveBreachV2CameraFloorY(
      requested.y,
      floorElevationSampleAt(layout, requested.x, requested.z),
      fallbackFloor,
    );
  };
  const resolveCameraAgainstScene = (
    target: THREE.Vector3,
    requested: THREE.Vector3,
  ): number => {
    cameraDirection.copy(requested).sub(target);
    const requestedDistance = cameraDirection.length();
    if (requestedDistance <= 1e-6) {
      camera.position.copy(target);
      return 0;
    }
    cameraDirection.multiplyScalar(1 / requestedDistance);
    const cameraHit = firstBreachV2CameraHit(
      runtimeCollisionBlockers,
      target,
      requested,
      CAMERA_COLLISION_RADIUS,
    );
    // The isometric cutaway intentionally renders above the room shell. A
    // doorway between the avatar and the elevated camera must not compress
    // the view into the avatar capsule as though this were third person.
    const resolvedDistance = resolveBreachV2CameraDistanceForMode(
      requestedDistance,
      cameraHit?.fraction ?? null,
      isometricMode,
    );
    camera.position.copy(target).addScaledVector(cameraDirection, resolvedDistance);
    return resolvedDistance;
  };
  let fpsAccum = 0;
  let fpsFrames = 0;
  let fpsText = "…";
  let sampledFps = 0;
  let worstHitchMs = 0;
  let autoSampleSeconds = 0;
  let autoSampleFrames = 0;
  let autoStableSamples = 0;
  let refreshHud = true;
  const graphicsOrder: readonly BreachV2GraphicsQuality[] = ["low", "standard", "high"];
  const debugRendererInfo = renderer.getContext().getExtension("WEBGL_debug_renderer_info");
  const gpuName = debugRendererInfo
    ? String(renderer.getContext().getParameter(debugRendererInfo.UNMASKED_RENDERER_WEBGL))
    : "WebGL renderer";
  const tickables = [...propPlacement.tickables, ...sectionDoors.tickables, ...landmarkTickables];
  const detailCullables: THREE.Object3D[] = [
    ...propPlacement.cullables,
    ...sectionDoors.cullables,
  ];
  for (const groupName of [
    "breach-v2-architectural-polish",
    "breach-v2-landmarks",
    "breach-v2-wall-art",
    "breach-v2-corruption",
  ]) {
    const group = scene.getObjectByName(groupName);
    if (group) detailCullables.push(...group.children);
  }
  const detailBaseVisibility = new Map(detailCullables.map((object) => [object, object.visible]));
  const cullOrigin = new THREE.Vector3();
  const cullObjectPosition = new THREE.Vector3();
  const updateDetailVisibility = (): void => {
    if (activeCameraMode === "overview") {
      detailCullables.forEach((object) => { object.visible = false; });
      return;
    }
    if (walkMode) cullOrigin.copy(playerPos);
    else cullOrigin.set(controls.target.x, 0, controls.target.z);
    const qualityRadius = graphicsQuality === "low" ? 30 : graphicsQuality === "standard" ? 38 : 46;
    const radius = isometricMode ? qualityRadius : Math.min(qualityRadius, 38);
    const radiusSq = radius * radius;
    detailCullables.forEach((object) => {
      object.getWorldPosition(cullObjectPosition);
      const dx = cullObjectPosition.x - cullOrigin.x;
      const dz = cullObjectPosition.z - cullOrigin.z;
      object.visible = object.userData.dynamicRemoved !== true
        && detailBaseVisibility.get(object) !== false
        && dx * dx + dz * dz <= radiusSq;
    });
  };
  updateDetailVisibility();
  let cullFrames = 0;

  renderer.setAnimationLoop((frameMs) => {
    const targetFps = graphicsQuality === "low" ? 30 : graphicsQuality === "standard" ? 45 : 60;
    try {
      timer.update(frameMs);
      const delta = timer.getDelta();
      const elapsed = timer.getElapsed();
      const frameDurationMs = delta * 1000;
      fpsAccum += delta;
      fpsFrames += 1;
      autoSampleSeconds += delta;
      autoSampleFrames += 1;
      worstHitchMs = Math.max(worstHitchMs, frameDurationMs);
      if (fpsAccum >= 0.5) {
        sampledFps = fpsFrames / fpsAccum;
        fpsText = `${sampledFps.toFixed(0)} fps · ${(1000 / sampledFps).toFixed(1)} ms`;
        fpsAccum = 0;
        fpsFrames = 0;
        refreshHud = true;
      }
      if (autoSampleSeconds >= 2) {
        const measuredFps = autoSampleFrames / autoSampleSeconds;
        if (graphicsMode === "auto") {
          const currentIndex = graphicsOrder.indexOf(graphicsQuality);
          const ceilingIndex = graphicsOrder.indexOf(autoGraphicsCeiling);
          const slow = measuredFps < targetFps * 0.82 || worstHitchMs >= 80;
          const stable = measuredFps >= targetFps * 0.94 && worstHitchMs < 48;
          if (slow && currentIndex > 0) {
            applyGraphicsQuality(graphicsOrder[currentIndex - 1]!);
            settingsPanel.updateEffectiveQuality(graphicsQuality);
            autoStableSamples = 0;
            updateDetailVisibility();
          } else if (stable && currentIndex < ceilingIndex) {
            autoStableSamples += 1;
            if (autoStableSamples >= 5) {
              applyGraphicsQuality(graphicsOrder[currentIndex + 1]!);
              settingsPanel.updateEffectiveQuality(graphicsQuality);
              autoStableSamples = 0;
              updateDetailVisibility();
            }
          } else {
            autoStableSamples = 0;
          }
        }
        autoSampleSeconds = 0;
        autoSampleFrames = 0;
        worstHitchMs = frameDurationMs;
        refreshHud = true;
      }
      for (const tick of tickables) tick(elapsed);
      if (debrisCleanupDeadlineMs > 0 && frameMs >= debrisCleanupDeadlineMs) {
        gameplay.cleanupEnvironmentDebris();
      }
      if (runtimeCollisionRefreshRequested) {
        runtimeCollisionBlockers = getRuntimeCollisionBlockers();
        hooks.__dungeonCollisionBlockers = runtimeCollisionBlockers;
        runtimeCollisionRefreshRequested = false;
      }
      if (walkMode && player) {
        const frameStartX = playerPos.x;
        const frameStartZ = playerPos.z;
        // movement relative to the camera's ground forward
        const run = keys.has("ShiftLeft") || keys.has("ShiftRight");
        // A thin portal must never be skipped by one long low-FPS movement
        // sample. The cap stays above normal 45 fps travel but below the
        // closed-door collision band, so keyboard and click travel remain
        // governed by the same runtime walkability predicate.
        const step = Math.min((run ? 6.2 : 3.2) * delta, 0.28);
        if (keys.has("KeyQ")) camYaw += delta * 1.9;
        if (keys.has("KeyE")) camYaw -= delta * 1.9;
        camera.getWorldDirection(movementForward);
        movementForward.y = 0;
        movementForward.normalize();
        movementRight.crossVectors(movementForward, movementUp);
        let mx = 0;
        let mz = 0;
        if (keys.has("KeyW") || keys.has("ArrowUp")) mz += 1;
        if (keys.has("KeyS") || keys.has("ArrowDown")) mz -= 1;
        if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
        if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
        if (mx !== 0 || mz !== 0) {
          clickPath.length = 0;
          const move = movementForward
            .multiplyScalar(mz)
            .add(movementRight.multiplyScalar(mx));
          move.normalize().multiplyScalar(step);
          const nx = playerPos.x + move.x;
          const nz = playerPos.z + move.z;
          const start = { x: playerPos.x, z: playerPos.z };
          const primarySweep = sweepBreachV2Movement(start, { x: nx, z: nz }, isWalkable);
          if (primarySweep.completed) {
            setPlayerPosition(primarySweep.resolvedEnd.x, primarySweep.resolvedEnd.z);
          } else {
            const xSweep = sweepBreachV2Movement(start, { x: nx, z: playerPos.z }, isWalkable);
            const zSweep = sweepBreachV2Movement(start, { x: playerPos.x, z: nz }, isWalkable);
            if (xSweep.completed) {
              setPlayerPosition(xSweep.resolvedEnd.x, xSweep.resolvedEnd.z); // slide along walls
            } else if (zSweep.completed) {
              setPlayerPosition(zSweep.resolvedEnd.x, zSweep.resolvedEnd.z);
            }
          }
          player.rotation.y = Math.atan2(move.x, move.z);
        } else if (clickPath.length > 0) {
          const target = clickPath[0]!;
          const dx = target.x - playerPos.x;
          const dz = target.z - playerPos.z;
          const distance = Math.hypot(dx, dz);
          const openingDoor = sectionDoors.ensureNearestOpen(playerPos.x, playerPos.z);
          if (!openingDoor) {
            const nextX = distance <= step ? target.x : playerPos.x + (dx / distance) * step;
            const nextZ = distance <= step ? target.z : playerPos.z + (dz / distance) * step;
            const sweep = sweepBreachV2Movement(
              { x: playerPos.x, z: playerPos.z },
              { x: nextX, z: nextZ },
              isWalkable,
            );
            if (sweep.completed) {
              setPlayerPosition(sweep.resolvedEnd.x, sweep.resolvedEnd.z);
              if (distance <= step) clickPath.shift();
            } else {
              // Static geometry changed after path planning; abandon this
              // destination rather than coast through a new blocker.
              clickPath.length = 0;
            }
          }
          player.rotation.y = Math.atan2(dx, dz);
        }
        player.position.set(playerPos.x, playerPos.y, playerPos.z);
        const playerMoved = Math.hypot(
          playerPos.x - frameStartX,
          playerPos.z - frameStartZ,
        ) > 0.0001;
        foundationPlayerActor?.setMoving(playerMoved, playerMoved && run);
        foundationPlayerActor?.update(delta);
        foundationAnimationReview?.update();
        if (firstPersonMode) {
          camera.position.set(playerPos.x, playerPos.y + 1.62, playerPos.z);
          cameraTarget.set(
            playerPos.x - Math.sin(camYaw) * Math.cos(camPitch),
            playerPos.y + 1.62 - Math.sin(camPitch),
            playerPos.z - Math.cos(camYaw) * Math.cos(camPitch),
          );
          camera.lookAt(cameraTarget);
        } else {
          if (isometricMode) {
            writeBreachV2IsometricCameraPose(
              playerPos,
              camYaw,
              camPitch,
              camDist,
              cameraTarget,
              desiredCamera,
            );
          } else {
            const cp = Math.cos(camPitch);
            desiredCamera.set(
              playerPos.x + Math.sin(camYaw) * camDist * cp,
              playerPos.y + 1.4 + Math.sin(camPitch) * camDist,
              playerPos.z + Math.cos(camYaw) * camDist * cp,
            );
            cameraTarget.set(playerPos.x, playerPos.y + 1.4, playerPos.z);
          }
          clampDesiredCameraAboveFloor(desiredCamera, playerPos.y);
          if (updateCeilingState(desiredCamera.y, cameraTarget.x, cameraTarget.z)) {
            runtimeCollisionBlockers = getRuntimeCollisionBlockers();
            hooks.__dungeonCollisionBlockers = runtimeCollisionBlockers;
          }
          resolveCameraAgainstScene(cameraTarget, desiredCamera);
          camera.lookAt(cameraTarget);
        }
        hooks.__dungeonPlayer.x = playerPos.x;
        hooks.__dungeonPlayer.y = playerPos.y;
        hooks.__dungeonPlayer.z = playerPos.z;
      } else {
        controls.update();
        desiredCamera.copy(camera.position);
        cameraTarget.copy(controls.target);
        const targetFloor = floorElevationSampleAt(
          layout,
          cameraTarget.x,
          cameraTarget.z,
        ) ?? cameraTarget.y;
        clampDesiredCameraAboveFloor(desiredCamera, targetFloor);
        if (updateCeilingState(desiredCamera.y, cameraTarget.x, cameraTarget.z)) {
          runtimeCollisionBlockers = getRuntimeCollisionBlockers();
          hooks.__dungeonCollisionBlockers = runtimeCollisionBlockers;
        }
        resolveCameraAgainstScene(cameraTarget, desiredCamera);
      }
      breachlingRuntime.update(playerPos.x, playerPos.z, delta);
      creatureAnimationReview?.update();
      const currentRoom = layout.rooms.find((room) => (
        playerPos.x >= room.x
        && playerPos.x <= room.x + room.w
        && playerPos.z >= room.z
        && playerPos.z <= room.z + room.h
      ));
      fogOfWar.update(playerPos.x, playerPos.z);
      if (currentRoom) gameplay.enterRoom(currentRoom.id);
      gameplay.tick(delta * 1000);
      gameplayUi.update();
      cullFrames += 1;
      if (cullFrames % 20 === 0) updateDetailVisibility();
      renderer.render(scene, camera);
      hooks.__dungeonFrames += 1;
      hooks.__dungeonStats = {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      };
      if (statsVisible && refreshHud) {
        let visibleLights = 0;
        scene.traverse((object) => {
          if (object instanceof THREE.Light && object.visible) visibleLights += 1;
        });
        hud.textContent =
          `${graphicsMode.toUpperCase()} → ${graphicsQuality.toUpperCase()} · ${fpsText} · worst hitch ${worstHitchMs.toFixed(1)} ms\n` +
          `draw ${hooks.__dungeonStats.calls} · tris ${hooks.__dungeonStats.triangles.toLocaleString()} · ` +
          `geo ${hooks.__dungeonStats.geometries} · tex ${hooks.__dungeonStats.textures} · lights ${visibleLights}\n` +
          `CAM xyz ${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)} · ` +
          `TARGET xyz ${cameraTarget.x.toFixed(2)}, ${cameraTarget.y.toFixed(2)}, ${cameraTarget.z.toFixed(2)}\n` +
          `ORBIT yaw ${THREE.MathUtils.radToDeg(camYaw).toFixed(1)}° · ` +
          `pitch ${THREE.MathUtils.radToDeg(camPitch).toFixed(1)}° · distance ${camDist.toFixed(2)} · ` +
          `PLAYER xyz ${playerPos.x.toFixed(2)}, ${playerPos.y.toFixed(2)}, ${playerPos.z.toFixed(2)}\n` +
          `GPU ${gpuName}`;
        refreshHud = false;
      }
    } catch (error) {
      hooks.__dungeonLoopError = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
      console.error("dungeon preview loop error", error);
    }
  });

  window.addEventListener("resize", () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}
