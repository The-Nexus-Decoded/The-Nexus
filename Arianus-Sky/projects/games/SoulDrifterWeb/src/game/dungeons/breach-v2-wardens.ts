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
  createCinderboundWardenEffectSystem,
  type CinderboundWardenEffectListener,
  type CinderboundWardenEffectStatus,
  type CinderboundWardenEffectSystem,
} from "./breach-v2-warden-effects";
import {
  CINDERBOUND_WARDEN_VFX_REFERENCE_HEIGHT_METERS,
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

export const CINDERBOUND_WARDEN_ACTIONS = Object.freeze([
  "AshCall",
  "BladeSweep",
  "CinderSweep",
  "CombatIdle",
  "DeathCollapse",
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

const CINDERBOUND_WARDEN_LEGACY_ACTIONS = Object.freeze(
  CINDERBOUND_WARDEN_ACTIONS.filter((name) => name !== "FurnaceShutdown" && name !== "SoulTax"),
);

export function cinderboundWardenActionNames(kind: CinderboundWardenKind): readonly string[] {
  return kind === "wayfarer" ? CINDERBOUND_WARDEN_ACTIONS : CINDERBOUND_WARDEN_LEGACY_ACTIONS;
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

export interface CinderboundWardenSnapshot extends CinderboundWardenPlacement, BreachV2AnimationReviewSnapshot {
  label: string;
  currentClip: string;
  actionNames: string[];
  targetHeightMeters: number;
  damageFraction: number;
  healthPercent: number;
  detachedStages: number[];
  breakoff: CinderboundWardenBreakoffSnapshot[];
  activeEffects: CinderboundWardenEffectStatus[];
  groundingStatus: string;
  groundingClearanceMeters: number | null;
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
  setDamageFraction(damageFraction: number): void;
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
  stage: number;
  root: THREE.Group;
  geometries: THREE.BufferGeometry[];
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  floorY: number;
  restingCenterY: number;
  footprintRadius: number;
  settled: boolean;
  settledSeconds: number;
  ageSeconds: number;
  embers: WardenEmberBurstVisual | null;
  scorch: WardenScorchMarkVisual | null;
  exposedCore: WardenExposedCoreVisual;
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
  presentationMaterials: THREE.Material[];
  furnaceLight: THREE.PointLight;
  furnacePhaseSeconds: number;
  /** Shared shader uniform: 0 intact, 1 fully broken open; drives the ember heat. */
  damageHeat: { value: number };
  vfxResources: WardenVfxResources;
  effects: CinderboundWardenEffectSystem;
  review: BreachV2AnimationReviewState;
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
    footprintRadius: Math.max(0.2, Math.max(size.x, size.z) * 0.45),
    center,
  };
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
  let effectListener: CinderboundWardenEffectListener | null = null;
  const vfxScale = asset.targetHeightMeters / CINDERBOUND_WARDEN_VFX_REFERENCE_HEIGHT_METERS;
  const latestPlayer = new THREE.Vector3();
  const disposeSource = (source: GLTF): void => {
    disposeBreachV2ObjectResources(source.scene, resourceDisposalRegistry);
  };

  const clearDebris = (runtimeActor: RuntimeActor): void => {
    runtimeActor.debris.forEach((debris) => {
      debris.root.removeFromParent();
      debris.geometries.forEach((geometry) => geometry.dispose());
      debris.embers?.dispose();
      debris.scorch?.dispose();
      debris.exposedCore.dispose();
    });
    runtimeActor.debris.length = 0;
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
  const playActor = (runtimeActor: RuntimeActor, clipName: string, immediate = false): number => {
    const action = runtimeActor.actions.get(clipName);
    if (!action) throw new Error(`${asset.label} does not provide ${clipName}.`);
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
    runtimeActor.effects.beginClip(clipName);
    runtimeActor.groundingStatus = "pending";
    runtimeActor.groundingFrames = 0;
    runtimeActor.groundingClearanceMeters = null;
    if (immediate) evaluateBreachV2AnimationReviewPose(runtimeActor.review, runtimeActor.mixer, 0, true);
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
      stage,
      root: snapshot.root,
      geometries: snapshot.geometries,
      restingCenterY: snapshot.restingCenterY,
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
      presentationMaterials,
      furnaceLight,
      furnacePhaseSeconds: 0,
      damageHeat,
      vfxResources,
      effects,
      review: createBreachV2AnimationReviewState(),
    };
    mixer.addEventListener("finished", (event) => {
      if (event.action !== runtimeActor.currentAction) return;
      if (runtimeActor.review.loop !== null) return;
      if (runtimeActor.currentClip !== "DeathCollapse") playActor(runtimeActor, "CombatIdle");
    });
    playActor(runtimeActor, damageFraction >= 1 ? "DeathCollapse" : "Idle");
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
          calibratedThisFrame = true;
        }
        if (actor.currentClip === "DeathCollapse"
          && actor.groundingStatus !== "pending"
          && !calibratedThisFrame) {
          const grounding = measureAnimatedPoseGrounding(actor.root, actor.model);
          if (Math.abs(grounding.clearanceMeters) > 0.002) {
            actor.pivot.position.y -= grounding.clearanceMeters;
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
        // The chest furnace follows this frame's effect state: PalmFire surges it,
        // FurnaceShutdown gutters it, death leaves only a dull glow.
        const pulse = 0.9 + Math.sin(runtimeActor.furnacePhaseSeconds * 4.2) * 0.1;
        const healthGlow = damageFraction >= 1 ? 0.18 : 1 - damageFraction * 0.32;
        runtimeActor.furnaceLight.intensity = furnaceLightBaseIntensity * pulse * healthGlow * runtimeActor.effects.furnaceLightFactor();
        runtimeActor.debris.forEach((debris) => {
          debris.ageSeconds += deltaSeconds;
          if (debris.embers && !debris.embers.update(debris.ageSeconds)) {
            debris.embers.dispose();
            debris.embers = null;
          }
          debris.exposedCore.setPulse(runtimeActor.furnacePhaseSeconds, damageFraction);
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
          const restingY = debris.floorY + debris.restingCenterY;
          if (debris.root.position.y <= restingY) {
            debris.root.position.y = restingY;
            debris.settled = true;
            // The still-molten shell burns its outline into the floor where it lands.
            const scorch = createWardenScorchMarkVisual(
              runtimeActor.vfxResources,
              debris.footprintRadius,
              new THREE.Vector3(debris.root.position.x, debris.floorY + 0.012, debris.root.position.z),
              `${runtimeActor.placement.id}:breakoff-${debris.stage}:scorch`,
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
      actionNames: [...actor.actions.keys()].sort(),
      targetHeightMeters: asset.targetHeightMeters,
      damageFraction,
      healthPercent: Math.round((1 - damageFraction) * 100),
      detachedStages: [...actor.detachedStages].sort((left, right) => left - right),
      breakoff: actor.debris.map((debris) => ({
        stage: debris.stage,
        settled: debris.settled,
        scorchMark: debris.scorch !== null,
        exposedCore: debris.exposedCore.root.parent !== null,
      })),
      activeEffects: actor.effects.status(),
      groundingStatus: actor.groundingStatus,
      groundingClearanceMeters: actor.groundingClearanceMeters,
    }] : [],
    play: (clipName, playOptions) => playActor(actor ?? (() => { throw new Error("The Warden is not loaded."); })(), clipName, playOptions?.immediate),
    pose: (clipName, normalizedTime) => {
      if (!actor) throw new Error("The Warden is not loaded.");
      const duration = playActor(actor, clipName, true);
      actor.currentAction.paused = true;
      actor.currentAction.time = THREE.MathUtils.clamp(normalizedTime, 0, 1) * duration;
      evaluateBreachV2AnimationReviewPose(actor.review, actor.mixer, 0);
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
    setDamageFraction: (nextDamageFraction) => {
      const previous = damageFraction;
      damageFraction = THREE.MathUtils.clamp(nextDamageFraction, 0, 1);
      if (!actor) return;
      if (damageFraction < previous) resetDamageVisuals(actor);
      applyDamageVisuals(actor);
      if (damageFraction >= 1) playActor(actor, "DeathCollapse");
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
