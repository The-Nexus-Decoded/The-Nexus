import * as THREE from "three";
import type { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

import {
  calibrateAnimatedPoseOnFloor,
  measureAnimatedPoseGrounding,
} from "../animationPacks";
import type { BreachV2Layout } from "./breach-v2-layout";
import type { BreachV2RuntimeDiagnosticSink } from "./breach-v2-runtime-diagnostics";
import {
  breachV2AnimationReviewSnapshot,
  configureBreachV2AnimationReview,
  createBreachV2AnimationReviewState,
  evaluateBreachV2AnimationReviewPose,
  setBreachV2AnimationReviewPoseHooks,
  type BreachV2AnimationReviewActor,
  type BreachV2AnimationReviewPlayback,
  type BreachV2AnimationReviewPoseHooks,
  type BreachV2AnimationReviewSnapshot,
  type BreachV2AnimationReviewState,
} from "./breach-v2-animation-review";
import {
  createBreachV2ResourceDisposalRegistry,
  disposeBreachV2ActorSkeletons,
  disposeBreachV2ObjectResources,
  type BreachV2ResourceDisposalRegistry,
} from "./breach-v2-breachlings";
import {
  CINDERBOUND_WARDEN_SHATTER_CLIP,
  cinderboundWardenEffectSeconds,
  createCinderboundWardenEffectSystem,
  type CinderboundWardenEffectListener,
  type CinderboundWardenEffectStatus,
  type CinderboundWardenEffectSystem,
} from "./breach-v2-warden-effects";
import {
  CINDERBOUND_WARDEN_VFX_REFERENCE_HEIGHT_METERS,
  mulberry32,
  createWardenEmberBurstVisual,
  createWardenExposedCoreVisual,
  createWardenScorchMarkVisual,
  createWardenVfxResources,
  type WardenEmberBurstVisual,
  type WardenExposedCoreVisual,
  type WardenScorchMarkVisual,
  type WardenVfxResources,
} from "../vfx/cinderbound-warden-vfx";

export type CinderboundWardenKind = "wayfarer" | "oathbreaker";

export const CINDERBOUND_WARDEN_ASSETS: Readonly<Record<
  CinderboundWardenKind,
  {
    label: string;
    url: string;
    targetHeightMeters: number;
    tripoModelId: string;
    sourceSha256: string;
  }
>> = Object.freeze({
  wayfarer: {
    label: "Cinderbound Warden",
    url: "/assets/3d/creatures/cinderbound-wardens/cinderbound-warden.glb",
    targetHeightMeters: 3.6,
    tripoModelId: "c609af31-3f47-450b-be5e-664d78ad36af",
    sourceSha256: "180B3FE5113FAC2AEDD95CFC6DA95B60251DE13E95F85F7641284D7B23A9D374",
  },
  oathbreaker: {
    label: "Greater Cinderbound Warden",
    url: "/assets/3d/creatures/cinderbound-wardens/greater-cinderbound-warden.glb",
    targetHeightMeters: 3.9,
    tripoModelId: "248467bb-1824-46d1-9d2a-5d8a1d3147cf",
    sourceSha256: "08067E65782DE77B749202AE692DBCE5B2AB6631879478584DA120E6FB45C758",
  },
});

/**
 * Every clip a Warden pack may author, both deaths included.
 *
 * DeathShatter sits alongside DeathCollapse rather than replacing it: the staged
 * mechanical collapse and the shell bursting apart are two separate deaths. It is
 * the one clip a pack may legitimately not carry yet — see
 * CINDERBOUND_WARDEN_OPTIONAL_ACTIONS — because it only means anything on a body
 * that also ships fractured chunk nodes.
 */
export const CINDERBOUND_WARDEN_ACTIONS = Object.freeze([
  "AshCall",
  "BladeSweep",
  "CinderSweep",
  "CombatIdle",
  "DeathCollapse",
  "DeathShatter",
  "FurnaceShutdown",
  "HeadLook",
  "HeavyRun",
  "HeavyWalk",
  "HitReact",
  "Idle",
  "PalmFire",
  "SoulTax",
  "TurnLeft",
  "TurnRight",
]);

export const CINDERBOUND_WARDEN_COLLAPSE_CLIP = "DeathCollapse";
export const CINDERBOUND_WARDEN_DEATH_CLIPS = Object.freeze([
  "DeathCollapse", "DeathShatter",
] as const);
export type CinderboundWardenDeathClip = (typeof CINDERBOUND_WARDEN_DEATH_CLIPS)[number];

/**
 * Clips the loader accepts as absent. Only the shatter death: a pack without
 * fractured geometry has nothing for it to break, so it falls back to
 * DeathCollapse instead of failing to load. A pack that *does* ship chunks and
 * omits the clip is rejected outright — see createActor.
 */
export const CINDERBOUND_WARDEN_OPTIONAL_ACTIONS: readonly string[] = Object.freeze([
  CINDERBOUND_WARDEN_SHATTER_CLIP,
]);

const isCinderboundWardenDeathClip = (clipName: string): clipName is CinderboundWardenDeathClip =>
  (CINDERBOUND_WARDEN_DEATH_CLIPS as readonly string[]).includes(clipName);

/** Node prefix of the fractured pieces; zero padded and contiguous from 00. */
export const CINDERBOUND_WARDEN_SHATTER_CHUNK_PREFIX = "Shatter_Chunk_";

/** Intact body node of each kind; it keeps every face it has for the other clips. */
export const CINDERBOUND_WARDEN_BODY_NODES: Readonly<Record<CinderboundWardenKind, string>> = Object.freeze({
  wayfarer: "Cinderbound_Warden_Body",
  oathbreaker: "Greater_Cinderbound_Warden_Body",
});

const CINDERBOUND_WARDEN_REQUIRED_ACTIONS = Object.freeze(
  CINDERBOUND_WARDEN_ACTIONS.filter((name) => !CINDERBOUND_WARDEN_OPTIONAL_ACTIONS.includes(name)),
);
const CINDERBOUND_WARDEN_LEGACY_ACTIONS = Object.freeze(
  CINDERBOUND_WARDEN_REQUIRED_ACTIONS.filter((name) => name !== "FurnaceShutdown" && name !== "SoulTax"),
);

/** Clips a pack of this kind must author; the loader throws on a missing one. */
export function cinderboundWardenActionNames(kind: CinderboundWardenKind): readonly string[] {
  return kind === "wayfarer" ? CINDERBOUND_WARDEN_REQUIRED_ACTIONS : CINDERBOUND_WARDEN_LEGACY_ACTIONS;
}

/** Required clips plus the optional shatter death: the full set a pack may carry. */
export function cinderboundWardenClipSet(kind: CinderboundWardenKind): readonly string[] {
  return Object.freeze([...cinderboundWardenActionNames(kind), ...CINDERBOUND_WARDEN_OPTIONAL_ACTIONS]);
}

/** Source meshes face +X; rotate them onto the +Z forward convention (radians). */
export const CINDERBOUND_WARDEN_SOURCE_YAW_CORRECTION = -Math.PI / 2;

export const CINDERBOUND_BREAKOFF_STAGES = Object.freeze([
  { meshName: "Breakoff_30_Shoulders", damageFraction: 0.3 },
  { meshName: "Breakoff_60_Forearms", damageFraction: 0.6 },
  { meshName: "Breakoff_90_Thighs", damageFraction: 0.9 },
]);

const LOOPING_ACTIONS: ReadonlySet<string> = new Set([
  "CombatIdle", "HeadLook", "HeavyRun", "HeavyWalk", "Idle",
]);
const ACTION_TRANSITION_SECONDS = 0.32;

/**
 * Clips the motion composer authors with a `terminal: "yawed"` end pose: the whole
 * body has stepped around and the last frame leaves the root bone spun onto the new
 * heading. Every other clip must end where it started, so no other clip may hand a
 * heading to the actor root.
 */
const TERMINAL_YAW_ACTIONS: ReadonlySet<string> = new Set(["TurnLeft", "TurnRight"]);
/** Below this a terminal yaw is authoring noise, not a heading (0.06 degrees). */
const TERMINAL_YAW_EPSILON_RADIANS = 1e-3;
/** A terminal pose that is not a clean spin about +Y cannot move onto the actor root. */
const TERMINAL_YAW_TILT_EPSILON = 1e-4;
/** An action faded below this contributes no measurable pose. */
const SETTLED_ACTION_WEIGHT = 1e-4;

const signedAngle = (radians: number): number => Math.atan2(Math.sin(radians), Math.cos(radians));

/** The skinned hierarchy's topmost bone — the joint the composer writes its root track to. */
export function cinderboundWardenRootBone(model: THREE.Object3D): THREE.Bone | null {
  let rootBone: THREE.Bone | null = null;
  model.traverse((object) => {
    if (rootBone || !(object instanceof THREE.Bone)) return;
    if (object.parent instanceof THREE.Bone) return;
    rootBone = object;
  });
  return rootBone;
}

/**
 * Net heading (radians about +Y) a terminal-yaw clip bakes into the root bone track,
 * measured as the signed yaw between its first and last key. Returns 0 for every clip
 * that encodes no turn — including the shipped Warden packs, whose TurnLeft/TurnRight
 * root track starts and ends at yaw 0 and therefore has no heading to hand over.
 */
export function measureCinderboundWardenTerminalYaw(
  clip: THREE.AnimationClip,
  rootBoneName: string,
): number {
  if (!TERMINAL_YAW_ACTIONS.has(clip.name)) return 0;
  const track = clip.tracks.find((candidate) => candidate.name === `${rootBoneName}.quaternion`);
  if (!track || track.getValueSize() !== 4 || track.values.length < 8) return 0;
  const values = track.values;
  const end = values.length - 4;
  // Folding a tilted terminal pose into a yaw would lay the boss over on the frame it
  // is applied, so only a pose that is purely a spin about +Y is ever moved.
  const tilted = (offset: number): boolean =>
    Math.abs(values[offset]!) > TERMINAL_YAW_TILT_EPSILON
    || Math.abs(values[offset + 2]!) > TERMINAL_YAW_TILT_EPSILON;
  if (tilted(0) || tilted(end)) return 0;
  const heading = signedAngle(
    2 * Math.atan2(values[end + 1]!, values[end + 3]!) - 2 * Math.atan2(values[1]!, values[3]!),
  );
  return Math.abs(heading) < TERMINAL_YAW_EPSILON_RADIANS ? 0 : heading;
}

export interface CinderboundWardenPlacement {
  id: string;
  kind: CinderboundWardenKind;
  roomId: string;
  x: number;
  z: number;
  floorElevation: number;
  yaw: number;
}

export interface CinderboundWardenBreakoffSnapshot {
  stage: number;
  /** The shell debris has landed on the floor. */
  settled: boolean;
  /** A scorch mark has been burnt where the debris landed. */
  scorchMark: boolean;
  /** The exposed body area under the shell carries its ember treatment. */
  exposedCore: boolean;
}

export interface CinderboundWardenShatterSnapshot {
  /** The loaded body carries fractured chunks and the DeathShatter clip. */
  available: boolean;
  /** Fractured pieces the body ships (0 on every pack without the fracture). */
  chunkCount: number;
  /** The body has been swapped for its chunks. */
  active: boolean;
  /** Chunks currently in flight or resting on the floor. */
  releasedChunks: number;
  settledChunks: number;
  scorchMarks: number;
  /** The chest furnace has gone out for good. */
  furnaceBlownOut: boolean;
}

export interface CinderboundWardenSnapshot extends CinderboundWardenPlacement, BreachV2AnimationReviewSnapshot {
  label: string;
  currentClip: string;
  actionNames: string[];
  targetHeightMeters: number;
  damageFraction: number;
  healthPercent: number;
  detachedStages: number[];
  breakoff: CinderboundWardenBreakoffSnapshot[];
  shatter: CinderboundWardenShatterSnapshot;
  activeEffects: CinderboundWardenEffectStatus[];
  groundingStatus: string;
  groundingClearanceMeters: number | null;
  /**
   * World heading of the actor root (radians). It starts at the placement yaw and
   * keeps every heading a completed turn handed over, so it accumulates across turns.
   */
  facingYaw: number;
  /** Heading still bleeding out of the mixer while a finished turn fades (radians). */
  settlingTurnYaw: number;
}

export interface BreachV2WardenRuntime {
  warmAt(x: number, z: number): Promise<void>;
  update(playerX: number, playerZ: number, deltaSeconds: number): void;
  snapshots(): CinderboundWardenSnapshot[];
  play(clipName: string, options?: { immediate?: boolean }): number;
  pose(clipName: string, normalizedTime: number): void;
  pause(paused: boolean): void;
  reviewActor(): BreachV2AnimationReviewActor | null;
  setReviewPlayback(playback: BreachV2AnimationReviewPlayback): void;
  setReviewPoseHooks(hooks: BreachV2AnimationReviewPoseHooks | null): void;
  /**
   * `death` picks which death plays when the fraction reaches 1. DeathShatter
   * falls back to DeathCollapse on a body with no fractured chunks.
   */
  setDamageFraction(damageFraction: number, death?: CinderboundWardenDeathClip): void;
  /**
   * Attack effect events (telegraph, active, impact, end) with a geometric hit
   * test. Damage itself stays with the run controller; the listener lets the
   * caller route an impact into that existing path.
   */
  setEffectListener(listener: CinderboundWardenEffectListener | null): void;
  dispose(): void;
}

export interface BreachV2WardenRuntimeOptions {
  /** The review stage uses the real actor/controller at a neutral lab origin. */
  reviewPlacement?: CinderboundWardenPlacement;
}

interface BreakoffDebris {
  /** Which pass created it: a damage shell tearing off, or the shatter death. */
  kind: "breakoff" | "shatter";
  /** Damage stage for a shell (30/60/90), chunk index for a shatter piece. */
  stage: number;
  root: THREE.Group;
  geometries: THREE.BufferGeometry[];
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  floorY: number;
  restingCenterY: number;
  /**
   * Half extents of the piece around its own origin. Present on shatter chunks,
   * whose tumble is clamped against the rotated half height so no corner of a
   * piece can dip through the floor; null on shells, which rest on the fixed
   * `restingCenterY` they were snapshotted with.
   */
  halfExtents: THREE.Vector3 | null;
  footprintRadius: number;
  settled: boolean;
  settledSeconds: number;
  ageSeconds: number;
  embers: WardenEmberBurstVisual | null;
  scorch: WardenScorchMarkVisual | null;
  /** Only a torn-off shell leaves an exposed core behind; a shatter chunk does not. */
  exposedCore: WardenExposedCoreVisual | null;
}

interface RuntimeActor {
  placement: CinderboundWardenPlacement;
  root: THREE.Group;
  pivot: THREE.Group;
  model: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: Map<string, THREE.AnimationAction>;
  currentAction: THREE.AnimationAction;
  currentClip: string;
  groundingStatus: string;
  groundingFrames: number;
  groundingClearanceMeters: number | null;
  breakoffMeshes: Map<number, THREE.Object3D>;
  detachedStages: Set<number>;
  debris: BreakoffDebris[];
  /** Intact body node. Hidden while the shatter debris stands in for it. */
  bodyMesh: THREE.Object3D | null;
  /** Fractured pieces, index order, hidden until the shatter reveals them. */
  shatterChunks: THREE.Object3D[];
  /** The pack carries both the chunks and the DeathShatter clip. */
  shatterAvailable: boolean;
  shattered: boolean;
  /** The single ember burst thrown at the break. */
  shatterEmbers: WardenEmberBurstVisual | null;
  shatterEmberSeconds: number;
  /**
   * Corpse floor correction this death has pushed onto the grounding pivot.
   * Undone whenever another clip starts, so one death never hands its offset to
   * the other.
   */
  corpseCorrectionMeters: number;
  presentationMaterials: THREE.Material[];
  furnaceLight: THREE.PointLight;
  furnacePhaseSeconds: number;
  /** Shared shader uniform: 0 intact, 1 fully broken open; drives the ember heat. */
  damageHeat: { value: number };
  vfxResources: WardenVfxResources;
  effects: CinderboundWardenEffectSystem;
  review: BreachV2AnimationReviewState;
  /** Net heading each terminal-yaw clip of this pack bakes into the root bone (radians). */
  terminalYaw: ReadonlyMap<string, number>;
  /**
   * Headings already moved onto the root that the mixer is still posing out of the
   * bones. Each drains with its own action's weight, so the pivot can cancel exactly
   * the double-count and nothing else.
   */
  headingSettles: { action: THREE.AnimationAction; headingRadians: number }[];
  /** Bumped by every play so one finish can only hand over its heading once. */
  playId: number;
  headingCommittedPlayId: number;
}

export interface CinderboundWardenMaterialReadiness {
  ready: boolean;
  meshCount: number;
  materialCount: number;
  standardMaterialCount: number;
  mappedMaterialCount: number;
  readyMapCount: number;
  missingMapMaterials: string[];
  unreadyMapMaterials: string[];
  unsupportedMaterialTypes: string[];
  maxTextureDimension: number;
  estimatedDecodedRgbaBytes: number;
}

export function inspectCinderboundWardenMaterialReadiness(
  model: THREE.Object3D,
): CinderboundWardenMaterialReadiness {
  const materials = new Map<string, THREE.Material>();
  const standardMaterials = new Map<string, THREE.MeshStandardMaterial>();
  let meshCount = 0;
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    meshCount += 1;
    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
    meshMaterials.forEach((material) => {
      materials.set(material.uuid, material);
      if (material instanceof THREE.MeshStandardMaterial) standardMaterials.set(material.uuid, material);
    });
  });
  const missingMapMaterials: string[] = [];
  const unreadyMapMaterials: string[] = [];
  const unsupportedMaterialTypes = new Set<string>();
  const images = new Map<unknown, { width: number; height: number }>();
  let mappedMaterialCount = 0;
  let readyMapCount = 0;
  for (const material of materials.values()) {
    const label = material.name || material.uuid;
    if (!(material instanceof THREE.MeshStandardMaterial)) unsupportedMaterialTypes.add(material.type);
    const map = "map" in material && material.map instanceof THREE.Texture ? material.map : null;
    if (!map) {
      missingMapMaterials.push(label);
      continue;
    }
    mappedMaterialCount += 1;
    const image = map.image as { width?: number; height?: number; complete?: boolean } | undefined;
    const width = Number(image?.width ?? 0);
    const height = Number(image?.height ?? 0);
    if (!(width > 0) || !(height > 0) || image?.complete === false) {
      unreadyMapMaterials.push(label);
      continue;
    }
    readyMapCount += 1;
    images.set(image, { width, height });
  }
  const imageSizes = [...images.values()];
  const maxTextureDimension = imageSizes.reduce(
    (maximum, image) => Math.max(maximum, image.width, image.height),
    0,
  );
  const estimatedDecodedRgbaBytes = imageSizes.reduce(
    (total, image) => total + image.width * image.height * 4,
    0,
  );
  return {
    ready: materials.size > 0
      && standardMaterials.size === materials.size
      && mappedMaterialCount === materials.size
      && readyMapCount === mappedMaterialCount,
    meshCount,
    materialCount: materials.size,
    standardMaterialCount: standardMaterials.size,
    mappedMaterialCount,
    readyMapCount,
    missingMapMaterials,
    unreadyMapMaterials,
    unsupportedMaterialTypes: [...unsupportedMaterialTypes].sort(),
    maxTextureDimension,
    estimatedDecodedRgbaBytes,
  };
}

export function buildCinderboundWardenPlacement(
  layout: BreachV2Layout,
  path: CinderboundWardenKind,
): CinderboundWardenPlacement {
  const bossRoom = layout.rooms.find((room) => (
    layout.boss.x >= room.x
    && layout.boss.x <= room.x + room.w
    && layout.boss.z >= room.z
    && layout.boss.z <= room.z + room.h
  ));
  if (!bossRoom) throw new Error("BREACH-V2 boss is not inside a runtime room.");
  const centerX = bossRoom.x + bossRoom.w / 2;
  const centerZ = bossRoom.z + bossRoom.h / 2;
  return {
    id: `cinderbound-warden:${path}`,
    kind: path,
    roomId: bossRoom.id,
    x: layout.boss.x,
    z: layout.boss.z,
    floorElevation: layout.boss.elevation,
    yaw: Math.atan2(centerX - layout.boss.x, centerZ - layout.boss.z),
  };
}

function roomIdAt(layout: BreachV2Layout, x: number, z: number): string | null {
  return layout.rooms.find((room) => (
    x >= room.x && x <= room.x + room.w && z >= room.z && z <= room.z + room.h
  ))?.id ?? null;
}

function prepareCinderboundWardenMaterials(
  model: THREE.Object3D,
  kind: CinderboundWardenKind,
  damageHeat: { value: number },
): THREE.Material[] {
  const clonedMaterials = new Map<THREE.Material, THREE.Material>();
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const cloneMaterial = (source: THREE.Material): THREE.Material => {
      const existing = clonedMaterials.get(source);
      if (existing) return existing;
      const clone = source.clone();
      if (clone instanceof THREE.MeshStandardMaterial) {
        // Preserve the authored albedo instead of multiplying it by another dark
        // tint. A restrained neutral self-light keeps the bronze and iron detail
        // readable in the dungeon without turning the entire machine emissive.
        clone.color.setHex(0xffffff);
        clone.metalness = kind === "oathbreaker" ? 0.48 : 0.42;
        clone.roughness = kind === "oathbreaker" ? 0.66 : 0.7;
        clone.emissive.setHex(0x201815);
        clone.emissiveMap = clone.map;
        clone.emissiveIntensity = kind === "oathbreaker" ? 0.38 : 0.33;
        clone.userData.cinderboundPresentation = "dark-iron-ember-v2";
        clone.onBeforeCompile = (shader) => {
          shader.uniforms.cinderDamageHeat = damageHeat;
          shader.fragmentShader = shader.fragmentShader
            .replace("#include <common>", "#include <common>\nuniform float cinderDamageHeat;")
            .replace(
              "#include <emissivemap_fragment>",
              [
                "#include <emissivemap_fragment>",
                "#ifdef USE_MAP",
                "  float cinderWarmDominance = diffuseColor.r - max(diffuseColor.g * 1.35, diffuseColor.b * 2.2);",
                "  float cinderHeatMask = smoothstep(0.14, 0.42, cinderWarmDominance)",
                "    * smoothstep(0.24, 0.64, diffuseColor.r);",
                // Each torn-off shell exposes more of the furnace: the authored ember
                // seams burn hotter and the surrounding warm metal starts to glow.
                "  totalEmissiveRadiance += vec3(1.0, 0.16, 0.025) * cinderHeatMask * (1.65 + cinderDamageHeat * 2.2);",
                "  totalEmissiveRadiance += vec3(1.0, 0.30, 0.06) * smoothstep(0.04, 0.36, cinderWarmDominance) * cinderDamageHeat * 0.55;",
                "#endif",
              ].join("\n"),
            );
        };
        clone.customProgramCacheKey = () => "cinderbound-dark-iron-ember-v2-damage-heat";
      }
      clonedMaterials.set(source, clone);
      return clone;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneMaterial)
      : cloneMaterial(object.material);
  });
  return [...clonedMaterials.values()];
}

function snapshotBreakoffGeometry(source: THREE.Object3D): {
  root: THREE.Group;
  geometries: THREE.BufferGeometry[];
  restingCenterY: number;
  halfExtents: THREE.Vector3;
  footprintRadius: number;
  center: THREE.Vector3;
} {
  source.updateWorldMatrix(true, false);
  const snapshots: Array<{
    geometry: THREE.BufferGeometry;
    material: THREE.Material | THREE.Material[];
    positions: THREE.Vector3[];
  }> = [];
  const worldBounds = new THREE.Box3();
  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry.clone();
    const position = geometry.getAttribute("position");
    const positions: THREE.Vector3[] = [];
    const point = new THREE.Vector3();
    for (let index = 0; index < position.count; index += 1) {
      point.fromBufferAttribute(position, index);
      if (object instanceof THREE.SkinnedMesh) object.applyBoneTransform(index, point);
      point.applyMatrix4(object.matrixWorld);
      positions.push(point.clone());
      worldBounds.expandByPoint(point);
    }
    snapshots.push({ geometry, material: object.material, positions });
  });
  if (snapshots.length === 0 || worldBounds.isEmpty()) {
    throw new Error(`${source.name} has no mesh geometry for its damage breakoff.`);
  }
  const center = worldBounds.getCenter(new THREE.Vector3());
  const root = new THREE.Group();
  root.name = `${source.name}:detached`;
  root.position.copy(center);
  const geometries: THREE.BufferGeometry[] = [];
  for (const snapshot of snapshots) {
    const position = snapshot.geometry.getAttribute("position");
    snapshot.positions.forEach((point, index) => {
      position.setXYZ(index, point.x - center.x, point.y - center.y, point.z - center.z);
    });
    position.needsUpdate = true;
    snapshot.geometry.computeVertexNormals();
    snapshot.geometry.computeBoundingBox();
    const mesh = new THREE.Mesh(snapshot.geometry, snapshot.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    geometries.push(snapshot.geometry);
  }
  const size = worldBounds.getSize(new THREE.Vector3());
  return {
    root,
    geometries,
    restingCenterY: center.y - worldBounds.min.y,
    halfExtents: size.clone().multiplyScalar(0.5),
    footprintRadius: Math.max(0.2, Math.max(size.x, size.z) * 0.45),
    center,
  };
}

/**
 * Fractured pieces of a shatter-capable body, in index order.
 *
 * The contract is exact and every deviation is an error rather than a silently
 * dropped piece: `Shatter_Chunk_NN`, zero padded, contiguous from 00, each
 * carrying `extras.shatterChunk === true` (glTF extras land on `userData`).
 * Returns an empty list for a body that ships no chunks at all.
 */
export function collectCinderboundWardenShatterChunks(
  model: THREE.Object3D,
  label: string,
): THREE.Object3D[] {
  const prefix = CINDERBOUND_WARDEN_SHATTER_CHUNK_PREFIX;
  const indexed = new Map<number, THREE.Object3D>();
  const malformed: string[] = [];
  const unflagged: string[] = [];
  model.traverse((object) => {
    if (!object.name.startsWith(prefix)) return;
    const suffix = object.name.slice(prefix.length);
    const index = Number(suffix);
    if (!/^\d{2,}$/.test(suffix) || !Number.isSafeInteger(index)
      || suffix !== String(index).padStart(2, "0") || indexed.has(index)) {
      malformed.push(object.name);
      return;
    }
    if (object.userData.shatterChunk !== true) {
      unflagged.push(object.name);
      return;
    }
    indexed.set(index, object);
  });
  if (malformed.length > 0) {
    throw new Error(`${label} has malformed shatter chunk nodes: ${[...malformed].sort().join(", ")}.`);
  }
  if (unflagged.length > 0) {
    throw new Error(`${label} shatter chunk nodes are missing extras.shatterChunk: ${[...unflagged].sort().join(", ")}.`);
  }
  const chunks: THREE.Object3D[] = [];
  for (let index = 0; index < indexed.size; index += 1) {
    const chunk = indexed.get(index);
    if (!chunk) {
      throw new Error(`${label} shatter chunks are not contiguous from 00: ${prefix}${String(index).padStart(2, "0")} is missing.`);
    }
    chunks.push(chunk);
  }
  return chunks;
}

/**
 * The bone carrying the most skin weight in a chunk — the limb it broke off.
 * Null for a chunk that is not skinned, which simply loses the bone bias.
 */
export function dominantCinderboundWardenChunkBone(chunk: THREE.Object3D): THREE.Object3D | null {
  if (!(chunk instanceof THREE.SkinnedMesh)) return null;
  const skinIndex = chunk.geometry.getAttribute("skinIndex");
  const skinWeight = chunk.geometry.getAttribute("skinWeight");
  if (!skinIndex || !skinWeight) return null;
  const totals = new Map<number, number>();
  const slots = Math.min(skinIndex.itemSize, skinWeight.itemSize);
  for (let vertex = 0; vertex < skinIndex.count; vertex += 1) {
    for (let slot = 0; slot < slots; slot += 1) {
      const weight = skinWeight.getComponent(vertex, slot);
      if (!(weight > 0)) continue;
      const bone = skinIndex.getComponent(vertex, slot);
      totals.set(bone, (totals.get(bone) ?? 0) + weight);
    }
  }
  let bestBone = -1;
  let bestWeight = 0;
  totals.forEach((weight, bone) => {
    if (weight > bestWeight) {
      bestWeight = weight;
      bestBone = bone;
    }
  });
  return bestBone >= 0 ? chunk.skeleton.bones[bestBone] ?? null : null;
}

const SHATTER_ROTATION_MATRIX = new THREE.Matrix4();

/**
 * Half height of a tumbling piece's bounding box in world space. Clamping the
 * piece's centre against this is what stops a corner dipping through the floor
 * mid-tumble.
 */
export function rotatedHalfHeight(rotation: THREE.Euler, halfExtents: THREE.Vector3): number {
  const elements = SHATTER_ROTATION_MATRIX.makeRotationFromEuler(rotation).elements;
  return Math.abs(elements[1]!) * halfExtents.x
    + Math.abs(elements[5]!) * halfExtents.y
    + Math.abs(elements[9]!) * halfExtents.z;
}

function nearestAttachment(model: THREE.Object3D, point: THREE.Vector3): THREE.Object3D {
  let nearest: THREE.Object3D = model;
  let nearestDistance = Number.POSITIVE_INFINITY;
  const probe = new THREE.Vector3();
  model.traverse((object) => {
    if (!(object instanceof THREE.Bone)) return;
    const distance = object.getWorldPosition(probe).distanceToSquared(point);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = object;
    }
  });
  return nearest;
}

export function createBreachV2WardenRuntime(
  scene: THREE.Scene,
  layout: BreachV2Layout,
  loader: Pick<GLTFLoader, "loadAsync">,
  path: CinderboundWardenKind,
  diagnostics?: BreachV2RuntimeDiagnosticSink,
  resourceDisposalRegistry: BreachV2ResourceDisposalRegistry = createBreachV2ResourceDisposalRegistry(),
  options: BreachV2WardenRuntimeOptions = {},
): BreachV2WardenRuntime {
  const placement = options.reviewPlacement ?? buildCinderboundWardenPlacement(layout, path);
  const asset = CINDERBOUND_WARDEN_ASSETS[path];
  const furnaceLightBaseIntensity = path === "oathbreaker" ? 3.2 : 2.8;
  let sourcePromise: Promise<GLTF> | null = null;
  let resolvedSource: GLTF | null = null;
  let actor: RuntimeActor | null = null;
  let desiredRoomId: string | null = null;
  let activationToken = 0;
  let disposed = false;
  let damageFraction = 0;
  /**
   * Which death the next kill plays. DeathCollapse unless a caller asks for the
   * shatter, so nothing changes for a body that has no fractured pieces.
   */
  let deathClip: CinderboundWardenDeathClip = CINDERBOUND_WARDEN_COLLAPSE_CLIP;
  let effectListener: CinderboundWardenEffectListener | null = null;
  const vfxScale = asset.targetHeightMeters / CINDERBOUND_WARDEN_VFX_REFERENCE_HEIGHT_METERS;
  const latestPlayer = new THREE.Vector3();
  const disposeSource = (source: GLTF): void => {
    disposeBreachV2ObjectResources(source.scene, resourceDisposalRegistry);
  };

  const disposeDebris = (debris: BreakoffDebris): void => {
    debris.root.removeFromParent();
    debris.geometries.forEach((geometry) => geometry.dispose());
    debris.embers?.dispose();
    debris.scorch?.dispose();
    debris.exposedCore?.dispose();
  };
  /**
   * Puts the body back together: the shatter pieces, their embers and the blown
   * furnace all go, and the intact node is visible again. Called by every play,
   * so replaying a death — or switching to the other one — never starts on the
   * previous death's debris.
   */
  const restoreIntactBody = (runtimeActor: RuntimeActor): void => {
    for (let index = runtimeActor.debris.length - 1; index >= 0; index -= 1) {
      const debris = runtimeActor.debris[index]!;
      if (debris.kind !== "shatter") continue;
      disposeDebris(debris);
      runtimeActor.debris.splice(index, 1);
    }
    runtimeActor.shatterEmbers?.dispose();
    runtimeActor.shatterEmbers = null;
    runtimeActor.shatterEmberSeconds = 0;
    runtimeActor.shattered = false;
    if (runtimeActor.bodyMesh) runtimeActor.bodyMesh.visible = true;
    runtimeActor.furnaceLight.visible = true;
  };
  const clearDebris = (runtimeActor: RuntimeActor): void => {
    runtimeActor.debris.forEach(disposeDebris);
    runtimeActor.debris.length = 0;
    restoreIntactBody(runtimeActor);
  };
  const clearActor = (): void => {
    if (!actor) return;
    setBreachV2AnimationReviewPoseHooks(actor.review, null);
    actor.mixer.stopAllAction();
    clearDebris(actor);
    actor.effects.dispose();
    actor.vfxResources.dispose();
    disposeBreachV2ActorSkeletons(actor.model, resourceDisposalRegistry);
    actor.root.removeFromParent();
    actor.presentationMaterials.forEach((material) => material.dispose());
    actor = null;
  };
  /**
   * A finished turn keeps posing its terminal yaw out of the bones for the whole
   * crossfade, so the heading we moved onto the root would be applied twice. Cancel
   * exactly the part the bones are still contributing on the pivot and let it drain
   * with the action's own weight: the frame the heading lands is pose-identical to the
   * frame before it, and the pivot is back on its source correction once the fade ends.
   */
  const settleTurnHeading = (runtimeActor: RuntimeActor): number => {
    let residualRadians = 0;
    for (let index = runtimeActor.headingSettles.length - 1; index >= 0; index -= 1) {
      const settle = runtimeActor.headingSettles[index]!;
      const weight = settle.action.getEffectiveWeight();
      if (!(weight > SETTLED_ACTION_WEIGHT)) {
        runtimeActor.headingSettles.splice(index, 1);
        continue;
      }
      residualRadians += settle.headingRadians * weight;
    }
    runtimeActor.pivot.rotation.y = CINDERBOUND_WARDEN_SOURCE_YAW_CORRECTION - residualRadians;
    return residualRadians;
  };
  const commitTurnHeading = (runtimeActor: RuntimeActor, action: THREE.AnimationAction): void => {
    if (runtimeActor.headingCommittedPlayId === runtimeActor.playId) return;
    runtimeActor.headingCommittedPlayId = runtimeActor.playId;
    const headingRadians = runtimeActor.terminalYaw.get(action.getClip().name) ?? 0;
    if (headingRadians === 0) return;
    runtimeActor.root.rotation.y += headingRadians;
    runtimeActor.headingSettles.push({ action, headingRadians });
    settleTurnHeading(runtimeActor);
  };
  /**
   * A body with no fractured chunks does not offer the shatter at all: the
   * request resolves to the collapse instead of throwing on a clip the pack
   * either lacks or has nothing to break with.
   */
  const resolveClipName = (runtimeActor: RuntimeActor, clipName: string): string => (
    clipName === CINDERBOUND_WARDEN_SHATTER_CLIP && !runtimeActor.shatterAvailable
      ? CINDERBOUND_WARDEN_COLLAPSE_CLIP
      : clipName
  );
  const playActor = (runtimeActor: RuntimeActor, requestedClip: string, immediate = false): number => {
    const clipName = resolveClipName(runtimeActor, requestedClip);
    const action = runtimeActor.actions.get(clipName);
    if (!action) throw new Error(`${asset.label} does not provide ${clipName}.`);
    // Whatever plays next starts on an intact body, and on the grounding pivot the
    // last death left rather than the corpse offset it drifted to.
    restoreIntactBody(runtimeActor);
    if (runtimeActor.corpseCorrectionMeters !== 0) {
      runtimeActor.pivot.position.y -= runtimeActor.corpseCorrectionMeters;
      runtimeActor.corpseCorrectionMeters = 0;
    }
    runtimeActor.playId += 1;
    // A settle cancels a heading the bones are still posing while the finished action
    // fades. Both paths below end that pose: stopAllAction drops its weight, and a
    // replayed action restarts on its neutral first frame. The cancellation has to be
    // dropped with it, but the bones only adopt the new pose on the next mixer
    // evaluation, so the drop is finished after that evaluation rather than here.
    let prunedHeading = false;
    if (immediate) {
      prunedHeading = runtimeActor.headingSettles.length > 0;
      runtimeActor.headingSettles.length = 0;
    } else {
      for (let index = runtimeActor.headingSettles.length - 1; index >= 0; index -= 1) {
        if (runtimeActor.headingSettles[index]!.action === action) {
          runtimeActor.headingSettles.splice(index, 1);
          prunedHeading = true;
        }
      }
    }
    runtimeActor.review.hooks?.restore();
    const loops = runtimeActor.review.loop ?? LOOPING_ACTIONS.has(clipName);
    if (immediate) {
      runtimeActor.mixer.stopAllAction();
    } else if (runtimeActor.currentAction !== action) {
      runtimeActor.currentAction.fadeOut(ACTION_TRANSITION_SECONDS);
    }
    action.reset().stopFading().stopWarping();
    action.enabled = true;
    action.paused = false;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(1);
    action.clampWhenFinished = !loops;
    action.setLoop(loops ? THREE.LoopRepeat : THREE.LoopOnce, loops ? Infinity : 1);
    if (!immediate && runtimeActor.currentAction !== action) action.fadeIn(ACTION_TRANSITION_SECONDS);
    action.play();
    runtimeActor.currentAction = action;
    runtimeActor.currentClip = clipName;
    if (prunedHeading) {
      // Settle the bones onto the frame this action now holds before the pivot stops
      // cancelling. Without this the pivot releases a heading the skeleton is still
      // posing and the body snaps by the full turn for one frame.
      runtimeActor.mixer.update(0);
      settleTurnHeading(runtimeActor);
    }
    runtimeActor.effects.beginClip(clipName);
    runtimeActor.groundingStatus = "pending";
    runtimeActor.groundingFrames = 0;
    runtimeActor.groundingClearanceMeters = null;
    if (immediate) evaluateBreachV2AnimationReviewPose(runtimeActor.review, runtimeActor.mixer, 0, true);
    settleTurnHeading(runtimeActor);
    return action.getClip().duration;
  };
  const detachStage = (runtimeActor: RuntimeActor, stage: number): void => {
    if (runtimeActor.detachedStages.has(stage)) return;
    const section = runtimeActor.breakoffMeshes.get(stage);
    if (!section) throw new Error(`${asset.label} is missing its ${stage}% breakoff mesh.`);
    const snapshot = snapshotBreakoffGeometry(section);
    section.visible = false;
    snapshot.root.userData.damageStage = stage;
    scene.add(snapshot.root);
    const direction = stage === 30 ? -1 : stage === 60 ? 1 : -0.45;
    const prefix = `${runtimeActor.placement.id}:breakoff-${stage}`;
    // The shell tears free in a burst of embers ...
    const embers = createWardenEmberBurstVisual(runtimeActor.vfxResources, vfxScale, snapshot.center, `${prefix}:embers`);
    embers.update(0);
    scene.add(embers.root);
    // ... and the body area it covered is left as an exposed, glowing core that
    // rides the nearest bone through every clip.
    const attachment = nearestAttachment(runtimeActor.model, snapshot.center);
    const exposedCore = createWardenExposedCoreVisual(
      runtimeActor.vfxResources,
      vfxScale,
      attachment.getWorldScale(new THREE.Vector3()).x,
      `${prefix}:exposed-core`,
    );
    exposedCore.root.position.copy(attachment.worldToLocal(snapshot.center.clone()));
    exposedCore.setPulse(runtimeActor.furnacePhaseSeconds, damageFraction);
    attachment.add(exposedCore.root);
    runtimeActor.debris.push({
      kind: "breakoff",
      stage,
      root: snapshot.root,
      geometries: snapshot.geometries,
      restingCenterY: snapshot.restingCenterY,
      halfExtents: null,
      footprintRadius: snapshot.footprintRadius,
      velocity: new THREE.Vector3(direction * 0.7, 1.4 + stage / 100, (stage === 60 ? -1 : 1) * 0.55),
      angularVelocity: new THREE.Vector3(0.9 + stage / 160, direction * 1.1, 0.7),
      floorY: runtimeActor.placement.floorElevation,
      settled: false,
      settledSeconds: 0,
      ageSeconds: 0,
      embers,
      scorch: null,
      exposedCore,
    });
    runtimeActor.detachedStages.add(stage);
  };
  /**
   * The shatter frame. The intact body is swapped for its fractured pieces: each
   * chunk node is snapshotted in the pose it is holding and handed to the same
   * debris pass the torn-off shells use, so it tumbles, settles and burns its
   * scorch mark into the floor exactly as they do. A single ember burst is thrown
   * at the break, and the chest furnace goes out for good.
   */
  const shatterBody = (runtimeActor: RuntimeActor): void => {
    const body = runtimeActor.bodyMesh;
    if (runtimeActor.shattered || !runtimeActor.shatterAvailable || !body) return;
    body.updateWorldMatrix(true, true);
    const bodyBounds = new THREE.Box3().setFromObject(body, true);
    const bodyCenter = bodyBounds.getCenter(new THREE.Vector3());
    const bodyHalfHeight = Math.max(0.05, bodyBounds.getSize(new THREE.Vector3()).y * 0.5);
    const chunkCount = runtimeActor.shatterChunks.length;
    // Deterministic tumble: the same body always breaks the same way, so a review
    // pass and the dungeon show the same death.
    const random = mulberry32(0x5a77e2 + chunkCount);
    const boneProbe = new THREE.Vector3();
    runtimeActor.shatterChunks.forEach((chunk, index) => {
      const snapshot = snapshotBreakoffGeometry(chunk);
      snapshot.root.userData.shatterChunkIndex = index;
      scene.add(snapshot.root);
      const offset = snapshot.center.clone().sub(bodyCenter);
      const direction = new THREE.Vector3(offset.x, 0, offset.z);
      if (direction.lengthSq() < 1e-8) {
        // A piece sitting on the body axis has no outward direction of its own;
        // fan those out evenly instead of dropping them straight down.
        const angle = (index / Math.max(1, chunkCount)) * Math.PI * 2;
        direction.set(Math.sin(angle), 0, Math.cos(angle));
      }
      direction.normalize();
      const bone = dominantCinderboundWardenChunkBone(chunk);
      if (bone) {
        // Bias along the limb the piece is weighted to: an arm chunk is thrown
        // out along the arm rather than straight away from the body centre.
        const boneOffset = bone.getWorldPosition(boneProbe).sub(bodyCenter).setY(0);
        if (boneOffset.lengthSq() > 1e-8) direction.addScaledVector(boneOffset.normalize(), 0.55).normalize();
      }
      // Gravity bias: a piece high on the body is thrown further and higher, a
      // piece at the feet barely leaves the floor.
      const height = THREE.MathUtils.clamp(offset.y / bodyHalfHeight, -1, 1);
      const speed = 2.1 + 0.9 * (height * 0.5 + 0.5);
      const debrisVelocity = direction.multiplyScalar(speed);
      debrisVelocity.y = Math.max(0.35, 2.4 + height * 1.6);
      runtimeActor.debris.push({
        kind: "shatter",
        stage: index,
        root: snapshot.root,
        geometries: snapshot.geometries,
        restingCenterY: snapshot.restingCenterY,
        halfExtents: snapshot.halfExtents,
        footprintRadius: snapshot.footprintRadius,
        velocity: debrisVelocity,
        angularVelocity: new THREE.Vector3(
          (random() * 2 - 1) * 3.4, (random() * 2 - 1) * 3.4, (random() * 2 - 1) * 3.4,
        ),
        floorY: runtimeActor.placement.floorElevation,
        settled: false,
        settledSeconds: 0,
        ageSeconds: 0,
        embers: null,
        scorch: null,
        exposedCore: null,
      });
    });
    body.visible = false;
    const embers = createWardenEmberBurstVisual(
      runtimeActor.vfxResources, vfxScale, bodyCenter, `${runtimeActor.placement.id}:shatter:embers`,
    );
    embers.update(0);
    scene.add(embers.root);
    runtimeActor.shatterEmbers = embers;
    runtimeActor.shatterEmberSeconds = 0;
    runtimeActor.furnaceLight.visible = false;
    runtimeActor.shattered = true;
  };
  /**
   * Keeps the body's broken/intact state on the clip time, in both directions, so
   * a scrubbed review frame before the shatter shows the body whole again.
   */
  const syncShatterState = (runtimeActor: RuntimeActor): void => {
    if (runtimeActor.currentClip !== CINDERBOUND_WARDEN_SHATTER_CLIP) return;
    const duration = runtimeActor.currentAction.getClip().duration;
    if (!(duration > 0)) return;
    const shatterSeconds = cinderboundWardenEffectSeconds(CINDERBOUND_WARDEN_SHATTER_CLIP, duration).impact;
    if (runtimeActor.currentAction.time >= shatterSeconds) shatterBody(runtimeActor);
    else if (runtimeActor.shattered) restoreIntactBody(runtimeActor);
  };
  const resetDamageVisuals = (runtimeActor: RuntimeActor): void => {
    clearDebris(runtimeActor);
    runtimeActor.detachedStages.clear();
    runtimeActor.breakoffMeshes.forEach((section) => { section.visible = true; });
  };
  const applyDamageVisuals = (runtimeActor: RuntimeActor): void => {
    CINDERBOUND_BREAKOFF_STAGES.forEach((stage) => {
      if (damageFraction + 0.0001 >= stage.damageFraction) detachStage(runtimeActor, stage.damageFraction * 100);
    });
  };
  const createActor = (source: GLTF): RuntimeActor => {
    const model = cloneSkeleton(source.scene);
    model.name = `${asset.label} model`;
    const damageHeat = { value: 0 };
    const presentationMaterials = prepareCinderboundWardenMaterials(model, path, damageHeat);
    diagnostics?.record("warden-material-readiness", {
      label: asset.label,
      url: asset.url,
      ...inspectCinderboundWardenMaterialReadiness(model),
    });
    model.updateMatrixWorld(true);
    const sourceHeight = new THREE.Box3().setFromObject(model, true).getSize(new THREE.Vector3()).y;
    if (!(sourceHeight > 0)) throw new Error(`${asset.label} has no finite height.`);
    model.scale.setScalar(asset.targetHeightMeters / sourceHeight);
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });
    const root = new THREE.Group();
    const pivot = new THREE.Group();
    root.name = placement.id;
    root.position.set(placement.x, placement.floorElevation, placement.z);
    root.rotation.y = placement.yaw;
    root.userData.spatialOwnerId = placement.id;
    root.userData.roomId = placement.roomId;
    root.userData.wardenKind = path;
    root.userData.collisionMode = "animated-boss-preview-nonblocking";
    root.userData.blocksMovement = false;
    root.userData.blocksLineOfSight = false;
    root.userData.blocksCamera = false;
    const furnaceLight = new THREE.PointLight(
      0xff6326,
      furnaceLightBaseIntensity,
      asset.targetHeightMeters * 1.45,
      2,
    );
    furnaceLight.name = `${placement.id}:furnace-light`;
    furnaceLight.position.set(0, asset.targetHeightMeters * 0.6, asset.targetHeightMeters * 0.06);
    root.add(furnaceLight);
    // The warden meshes were modelled facing +X; the dungeon and Motion Forge treat +Z
    // (rotated by placement.yaw) as forward, so the pivot turns the source into that
    // convention once. Without it the boss stands and walks sideways to its facing.
    pivot.rotation.y = CINDERBOUND_WARDEN_SOURCE_YAW_CORRECTION;
    pivot.add(model);
    root.add(pivot);
    scene.add(root);
    root.updateMatrixWorld(true);
    const mixer = new THREE.AnimationMixer(model);
    const actions = new Map(source.animations.map((clip) => [clip.name, mixer.clipAction(clip)]));
    cinderboundWardenActionNames(path).forEach((required) => {
      if (!actions.has(required)) throw new Error(`${asset.label} is missing ${required}.`);
    });
    const breakoffMeshes = new Map<number, THREE.Object3D>();
    CINDERBOUND_BREAKOFF_STAGES.forEach((stage) => {
      const section = model.getObjectByName(stage.meshName);
      if (!section) throw new Error(`${asset.label} is missing ${stage.meshName}.`);
      breakoffMeshes.set(stage.damageFraction * 100, section);
    });
    const bodyNodeName = CINDERBOUND_WARDEN_BODY_NODES[path];
    const bodyMesh = model.getObjectByName(bodyNodeName) ?? null;
    // The fractured pieces ride the skeleton hidden until the shatter reveals
    // them; nothing else in the pack changes because they exist.
    const shatterChunks = collectCinderboundWardenShatterChunks(model, asset.label);
    shatterChunks.forEach((chunk) => { chunk.visible = false; });
    const hasShatterClip = actions.has(CINDERBOUND_WARDEN_SHATTER_CLIP);
    if (shatterChunks.length > 0 && !hasShatterClip) {
      throw new Error(
        `${asset.label} ships ${shatterChunks.length} shatter chunks but no ${CINDERBOUND_WARDEN_SHATTER_CLIP} clip.`,
      );
    }
    // A fractured pack must still carry the intact body under its contract name:
    // every other clip poses it, and the shatter is the only thing that hides it.
    if (shatterChunks.length > 0 && !bodyMesh) throw new Error(`${asset.label} is missing ${bodyNodeName}.`);
    const shatterAvailable = shatterChunks.length > 0 && hasShatterClip && bodyMesh !== null;
    diagnostics?.record("warden-shatter-readiness", {
      label: asset.label,
      url: asset.url,
      bodyNode: bodyNodeName,
      chunkCount: shatterChunks.length,
      clip: hasShatterClip,
      available: shatterAvailable,
    });
    // Which turns actually carry a heading is a property of the loaded pack, not of the
    // clip name: the shipped bodies author TurnLeft/TurnRight with a root track that
    // starts and ends at yaw 0, so they hand over nothing and are skipped outright.
    const rootBone = cinderboundWardenRootBone(model);
    const terminalYaw = new Map<string, number>();
    source.animations.forEach((clip) => {
      const headingRadians = rootBone ? measureCinderboundWardenTerminalYaw(clip, rootBone.name) : 0;
      if (headingRadians !== 0) terminalYaw.set(clip.name, headingRadians);
    });
    diagnostics?.record("warden-terminal-yaw", {
      label: asset.label,
      url: asset.url,
      rootBone: rootBone?.name ?? null,
      headingDegrees: Object.fromEntries(
        [...terminalYaw].map(([name, radians]) => [name, THREE.MathUtils.radToDeg(radians)]),
      ),
    });
    const idle = actions.get("Idle")!;
    const vfxResources = createWardenVfxResources();
    const effects = createCinderboundWardenEffectSystem({
      scene,
      actorRoot: root,
      model,
      ownerId: placement.id,
      targetHeightMeters: asset.targetHeightMeters,
    });
    effects.setListener(effectListener);
    const runtimeActor: RuntimeActor = {
      placement,
      root,
      pivot,
      model,
      mixer,
      actions,
      currentAction: idle,
      currentClip: "Idle",
      groundingStatus: "pending",
      groundingFrames: 0,
      groundingClearanceMeters: null,
      breakoffMeshes,
      detachedStages: new Set(),
      debris: [],
      bodyMesh,
      shatterChunks,
      shatterAvailable,
      shattered: false,
      shatterEmbers: null,
      shatterEmberSeconds: 0,
      corpseCorrectionMeters: 0,
      presentationMaterials,
      furnaceLight,
      furnacePhaseSeconds: 0,
      damageHeat,
      vfxResources,
      effects,
      review: createBreachV2AnimationReviewState(),
      terminalYaw,
      headingSettles: [],
      playId: 0,
      headingCommittedPlayId: -1,
    };
    mixer.addEventListener("finished", (event) => {
      if (event.action !== runtimeActor.currentAction) return;
      // The heading is handed over the moment the turn completes, whatever the review
      // stage does next, so the dungeon and the Motion Forge end up facing the same way.
      commitTurnHeading(runtimeActor, event.action);
      if (runtimeActor.review.loop !== null) return;
      // Either death holds its last frame; everything else returns to guard.
      if (!isCinderboundWardenDeathClip(runtimeActor.currentClip)) playActor(runtimeActor, "CombatIdle");
    });
    playActor(runtimeActor, damageFraction >= 1 ? deathClip : "Idle");
    applyDamageVisuals(runtimeActor);
    return runtimeActor;
  };
  const activateRoom = async (roomId: string | null): Promise<void> => {
    if (disposed) return;
    if (roomId === desiredRoomId) return;
    desiredRoomId = roomId;
    const token = ++activationToken;
    if (roomId !== placement.roomId) {
      clearActor();
      return;
    }
    sourcePromise ??= (() => {
      diagnostics?.record("warden-asset-load-start", { label: asset.label, url: asset.url });
      return loader.loadAsync(asset.url).then((source) => {
        diagnostics?.record("warden-asset-load-success", {
          label: asset.label,
          url: asset.url,
          animations: source.animations.length,
        });
        if (disposed) {
          disposeSource(source);
        } else {
          resolvedSource = source;
        }
        return source;
      }).catch((error: unknown) => {
        diagnostics?.record("warden-asset-load-failure", {
          label: asset.label,
          url: asset.url,
          error: error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error),
        });
        throw error;
      });
    })();
    const source = await sourcePromise;
    if (disposed || token !== activationToken) return;
    clearActor();
    if (disposed || token !== activationToken) return;
    actor = createActor(source);
  };

  return {
    warmAt: async (x, z) => {
      if (disposed) return;
      await activateRoom(roomIdAt(layout, x, z));
    },
    update: (playerX, playerZ, deltaSeconds) => {
      if (disposed) return;
      latestPlayer.set(playerX, placement.floorElevation, playerZ);
      void activateRoom(roomIdAt(layout, playerX, playerZ)).catch((error) => {
        diagnostics?.record("warden-runtime-activation-failure", {
          label: asset.label,
          url: asset.url,
          error: error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error),
        });
        console.error("Cinderbound Warden room activation failed", error);
      });
      if (actor) {
        evaluateBreachV2AnimationReviewPose(actor.review, actor.mixer, deltaSeconds);
        // After the mixer, before any world matrix is rebuilt: the pivot must cancel
        // this frame's residual, never the previous frame's.
        settleTurnHeading(actor);
        actor.furnacePhaseSeconds += deltaSeconds;
        actor.damageHeat.value = damageFraction >= 1
          ? 0.25
          : damageFraction * (0.85 + 0.15 * Math.sin(actor.furnacePhaseSeconds * 5.3));
        actor.groundingFrames += 1;
        let calibratedThisFrame = false;
        // Review offsets must remain visible defects/adjustments, never become
        // the runtime's floor-reference correction or its corpse correction.
        if (actor.review.hooks) {
          actor.review.hooks.restore();
          actor.root.updateMatrixWorld(true);
        }
        if (actor.groundingStatus === "pending" && actor.groundingFrames >= 3) {
          const grounding = calibrateAnimatedPoseOnFloor(actor.root, actor.model, actor.pivot, 0);
          actor.groundingClearanceMeters = grounding.clearanceMeters;
          actor.groundingStatus = "calibrated-live-pose";
          // The calibration writes the pivot absolutely, so any corpse drift it
          // replaced is gone and must not be unwound again on the next play.
          actor.corpseCorrectionMeters = 0;
          calibratedThisFrame = true;
        }
        // Corpse correction, for whichever death is playing. It stops once the
        // shell has burst: from there the pieces are free debris with their own
        // floor, and the hidden body is no longer the thing standing on it.
        if (isCinderboundWardenDeathClip(actor.currentClip)
          && !actor.shattered
          && actor.groundingStatus !== "pending"
          && !calibratedThisFrame) {
          const grounding = measureAnimatedPoseGrounding(actor.root, actor.model);
          if (Math.abs(grounding.clearanceMeters) > 0.002) {
            actor.pivot.position.y -= grounding.clearanceMeters;
            actor.corpseCorrectionMeters -= grounding.clearanceMeters;
            actor.pivot.updateWorldMatrix(true, true);
            actor.groundingClearanceMeters = 0;
          } else {
            actor.groundingClearanceMeters = grounding.clearanceMeters;
          }
        }
        if (actor.review.hooks) {
          actor.review.hooks.apply();
          actor.root.updateMatrixWorld(true);
        }
        const runtimeActor = actor;
        runtimeActor.effects.evaluate({
          clip: runtimeActor.currentClip,
          clipTimeSeconds: runtimeActor.currentAction.time,
          durationSeconds: runtimeActor.currentAction.getClip().duration,
          deltaSeconds,
          advancing: deltaSeconds > 0 && !runtimeActor.currentAction.paused,
          target: latestPlayer,
        });
        // The shatter frame is a clip time, so the swap is decided here, after the
        // mixer and the effect windows have both moved.
        syncShatterState(runtimeActor);
        // The chest furnace follows this frame's effect state: PalmFire surges it,
        // FurnaceShutdown gutters it, death leaves only a dull glow — and the
        // shatter blows it out entirely.
        const pulse = 0.9 + Math.sin(runtimeActor.furnacePhaseSeconds * 4.2) * 0.1;
        const healthGlow = damageFraction >= 1 ? 0.18 : 1 - damageFraction * 0.32;
        runtimeActor.furnaceLight.intensity = runtimeActor.shattered
          ? 0
          : furnaceLightBaseIntensity * pulse * healthGlow * runtimeActor.effects.furnaceLightFactor();
        if (runtimeActor.shatterEmbers) {
          runtimeActor.shatterEmberSeconds += deltaSeconds;
          if (!runtimeActor.shatterEmbers.update(runtimeActor.shatterEmberSeconds)) {
            runtimeActor.shatterEmbers.dispose();
            runtimeActor.shatterEmbers = null;
          }
        }
        runtimeActor.debris.forEach((debris) => {
          debris.ageSeconds += deltaSeconds;
          if (debris.embers && !debris.embers.update(debris.ageSeconds)) {
            debris.embers.dispose();
            debris.embers = null;
          }
          debris.exposedCore?.setPulse(runtimeActor.furnacePhaseSeconds, damageFraction);
          if (debris.settled) {
            debris.settledSeconds += deltaSeconds;
            debris.scorch?.setStrength(
              Math.min(1, debris.settledSeconds / 0.4),
              Math.max(0, 1 - debris.settledSeconds / 6),
            );
            return;
          }
          debris.velocity.y -= 8.8 * deltaSeconds;
          debris.root.position.addScaledVector(debris.velocity, deltaSeconds);
          debris.root.rotation.x += debris.angularVelocity.x * deltaSeconds;
          debris.root.rotation.y += debris.angularVelocity.y * deltaSeconds;
          debris.root.rotation.z += debris.angularVelocity.z * deltaSeconds;
          // A tumbling shatter chunk rests on whichever corner is lowest at that
          // rotation, so no piece can dip through the floor while it spins.
          const restingY = debris.floorY + (debris.halfExtents
            ? rotatedHalfHeight(debris.root.rotation, debris.halfExtents)
            : debris.restingCenterY);
          if (debris.root.position.y <= restingY) {
            debris.root.position.y = restingY;
            debris.settled = true;
            // The still-molten piece burns its outline into the floor where it lands.
            const scorch = createWardenScorchMarkVisual(
              runtimeActor.vfxResources,
              debris.footprintRadius,
              new THREE.Vector3(debris.root.position.x, debris.floorY + 0.012, debris.root.position.z),
              `${runtimeActor.placement.id}:${debris.kind === "shatter" ? "shatter-chunk" : "breakoff"}-${debris.stage}:scorch`,
            );
            scorch.setStrength(0, 1);
            scene.add(scorch.root);
            debris.scorch = scorch;
          }
        });
      }
    },
    snapshots: () => actor ? [{
      ...actor.placement,
      ...breachV2AnimationReviewSnapshot(actor.review, actor.currentAction),
      label: asset.label,
      currentClip: actor.currentClip,
      // A body with no fractured pieces does not offer the shatter at all.
      actionNames: [...actor.actions.keys()]
        .filter((name) => actor!.shatterAvailable || name !== CINDERBOUND_WARDEN_SHATTER_CLIP)
        .sort(),
      targetHeightMeters: asset.targetHeightMeters,
      damageFraction,
      healthPercent: Math.round((1 - damageFraction) * 100),
      detachedStages: [...actor.detachedStages].sort((left, right) => left - right),
      breakoff: actor.debris.filter((debris) => debris.kind === "breakoff").map((debris) => ({
        stage: debris.stage,
        settled: debris.settled,
        scorchMark: debris.scorch !== null,
        exposedCore: debris.exposedCore?.root.parent != null,
      })),
      shatter: {
        available: actor.shatterAvailable,
        chunkCount: actor.shatterChunks.length,
        active: actor.shattered,
        releasedChunks: actor.debris.filter((debris) => debris.kind === "shatter").length,
        settledChunks: actor.debris.filter((debris) => debris.kind === "shatter" && debris.settled).length,
        scorchMarks: actor.debris.filter((debris) => debris.kind === "shatter" && debris.scorch !== null).length,
        furnaceBlownOut: actor.shattered,
      },
      activeEffects: actor.effects.status(),
      groundingStatus: actor.groundingStatus,
      groundingClearanceMeters: actor.groundingClearanceMeters,
      facingYaw: actor.root.rotation.y,
      settlingTurnYaw: CINDERBOUND_WARDEN_SOURCE_YAW_CORRECTION - actor.pivot.rotation.y,
    }] : [],
    play: (clipName, playOptions) => playActor(actor ?? (() => { throw new Error("The Warden is not loaded."); })(), clipName, playOptions?.immediate),
    pose: (clipName, normalizedTime) => {
      if (!actor) throw new Error("The Warden is not loaded.");
      const duration = playActor(actor, clipName, true);
      actor.currentAction.paused = true;
      actor.currentAction.time = THREE.MathUtils.clamp(normalizedTime, 0, 1) * duration;
      evaluateBreachV2AnimationReviewPose(actor.review, actor.mixer, 0);
      // A scrubbed frame either side of the shatter shows the matching body, so
      // the review can step back and forth across the break.
      syncShatterState(actor);
      // A scrubbed turn never finishes, so it hands over no heading: the scrubbed root
      // track is already showing the turn, and the pivot must stay on its correction.
      settleTurnHeading(actor);
    },
    pause: (paused) => {
      if (!actor) throw new Error("The Warden is not loaded.");
      actor.currentAction.paused = paused;
    },
    reviewActor: () => actor ? { root: actor.root, model: actor.model } : null,
    setReviewPlayback: (playback) => {
      if (!actor) throw new Error("The Warden is not loaded.");
      configureBreachV2AnimationReview(actor.review, playback);
      const loops = actor.review.loop ?? LOOPING_ACTIONS.has(actor.currentClip);
      actor.currentAction.clampWhenFinished = !loops;
      actor.currentAction.setLoop(loops ? THREE.LoopRepeat : THREE.LoopOnce, loops ? Infinity : 1);
    },
    setReviewPoseHooks: (hooks) => {
      if (!actor) throw new Error("The Warden is not loaded.");
      setBreachV2AnimationReviewPoseHooks(actor.review, hooks);
    },
    setDamageFraction: (nextDamageFraction, death = CINDERBOUND_WARDEN_COLLAPSE_CLIP) => {
      const previous = damageFraction;
      damageFraction = THREE.MathUtils.clamp(nextDamageFraction, 0, 1);
      deathClip = death;
      if (!actor) return;
      if (damageFraction < previous) resetDamageVisuals(actor);
      applyDamageVisuals(actor);
      if (damageFraction >= 1) playActor(actor, deathClip);
      else if (damageFraction > previous) playActor(actor, "HitReact");
      else if (previous >= 1 || damageFraction === 0) playActor(actor, "CombatIdle");
    },
    setEffectListener: (listener) => {
      effectListener = listener;
      actor?.effects.setListener(listener);
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      activationToken += 1;
      desiredRoomId = null;
      clearActor();
      if (resolvedSource) disposeSource(resolvedSource);
      resolvedSource = null;
    },
  };
}
