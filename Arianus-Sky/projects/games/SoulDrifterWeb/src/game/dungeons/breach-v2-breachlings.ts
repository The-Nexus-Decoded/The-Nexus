import * as THREE from "three";
import type { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

import { measureAnimatedPoseGrounding } from "../animationPacks";
import type { BreachV2Layout } from "./breach-v2-layout";

export type BreachlingTier = "base" | "stalker" | "oathbound" | "ravager";

export const BREACHLING_RUNTIME_ASSETS: Readonly<Record<
  BreachlingTier,
  { label: string; url: string; targetHeightMeters: number; tripoModelId: string }
>> = Object.freeze({
  base: {
    label: "Base Breachling",
    url: "/assets/3d/characters/breachlings/breachling-base.glb",
    targetHeightMeters: 1.025,
    tripoModelId: "bacf8bed-a798-4ffd-b98b-76e09a0e7b89",
  },
  stalker: {
    label: "Breachling Stalker",
    url: "/assets/3d/characters/breachlings/breachling-stalker.glb",
    targetHeightMeters: 1.075,
    tripoModelId: "f346efc2-559a-4bbc-b665-40476546893b",
  },
  oathbound: {
    label: "Oathbound Breachling",
    url: "/assets/3d/characters/breachlings/oathbound-breachling.glb",
    targetHeightMeters: 1.2,
    tripoModelId: "f93d8ae9-863a-4746-b223-c6186f8d3520",
  },
  ravager: {
    label: "Breachling Ravager",
    url: "/assets/3d/characters/breachlings/breachling-ravager.glb",
    targetHeightMeters: 1.325,
    tripoModelId: "345cd816-480c-442e-a3a6-acfef94a34f5",
  },
});

export const BREACHLING_BASE_ACTIONS = Object.freeze([
  "Idle", "CombatIdle", "Walk", "Run", "BiteAttack", "ClawAttack",
  "TailWhip", "RecieveHit", "Death",
]);
export const BREACHLING_UPPER_ACTIONS = Object.freeze([
  ...BREACHLING_BASE_ACTIONS,
  "SpitAttack",
]);
const LOOPING_ACTIONS: ReadonlySet<string> = new Set(["Idle", "CombatIdle", "Walk", "Run"]);
const ACTION_TRANSITION_SECONDS = 0.28;
const UPPER_TIERS: ReadonlySet<BreachlingTier> = new Set(["oathbound", "ravager"]);
const ROOM_OFFSETS: readonly (readonly [number, number])[] = [
  [-0.23, -0.2], [0.23, 0.18], [0.04, -0.27], [-0.24, 0.22], [0.25, -0.16], [0.02, 0.26],
];

export interface BreachlingPlacement {
  id: string;
  tier: BreachlingTier;
  roomId: string;
  x: number;
  z: number;
  floorElevation: number;
  yaw: number;
}

export interface BreachlingRuntimeSnapshot extends BreachlingPlacement {
  currentClip: string;
  actionNames: string[];
  targetHeightMeters: number;
  groundingStatus: string;
  groundingClearanceMeters: number | null;
}

export interface BreachV2BreachlingRuntime {
  warmAt(x: number, z: number): Promise<void>;
  update(playerX: number, playerZ: number, deltaSeconds: number): void;
  snapshots(): BreachlingRuntimeSnapshot[];
  play(actorId: string, clipName: string): number;
  pose(actorId: string, clipName: string, normalizedTime: number): void;
  pause(actorId: string, paused: boolean): void;
  dispose(): void;
}

export interface BreachV2ResourceDisposalRegistry {
  geometries: Set<THREE.BufferGeometry>;
  materials: Set<THREE.Material>;
  skeletons: WeakSet<THREE.Skeleton>;
  textures: Set<THREE.Texture>;
}

export function createBreachV2ResourceDisposalRegistry(): BreachV2ResourceDisposalRegistry {
  return {
    geometries: new Set<THREE.BufferGeometry>(),
    materials: new Set<THREE.Material>(),
    skeletons: new WeakSet<THREE.Skeleton>(),
    textures: new Set<THREE.Texture>(),
  };
}

export function disposeBreachV2ActorSkeletons(
  root: THREE.Object3D,
  registry: BreachV2ResourceDisposalRegistry,
): { skeletons: number; textures: number } {
  let skeletons = 0;
  let textures = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.SkinnedMesh)) return;
    const { skeleton } = object;
    if (registry.skeletons.has(skeleton)) return;
    registry.skeletons.add(skeleton);
    const boneTexture = skeleton.boneTexture;
    if (boneTexture) {
      if (registry.textures.has(boneTexture)) {
        skeleton.boneTexture = null;
      } else {
        registry.textures.add(boneTexture);
        textures += 1;
      }
    }
    skeleton.dispose();
    skeletons += 1;
  });
  return { skeletons, textures };
}

export function disposeBreachV2ObjectResources(
  root: THREE.Object3D,
  registry: BreachV2ResourceDisposalRegistry,
): { geometries: number; materials: number; textures: number } {
  let geometries = 0;
  let materials = 0;
  let textures = 0;
  root.traverse((object) => {
    const renderable = object as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    if (renderable.geometry && !registry.geometries.has(renderable.geometry)) {
      registry.geometries.add(renderable.geometry);
      renderable.geometry.dispose();
      geometries += 1;
    }
    const objectMaterials = renderable.material
      ? Array.isArray(renderable.material) ? renderable.material : [renderable.material]
      : [];
    objectMaterials.forEach((material) => {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture && !registry.textures.has(value)) {
          registry.textures.add(value);
          value.dispose();
          textures += 1;
        }
      }
      if (!registry.materials.has(material)) {
        registry.materials.add(material);
        material.dispose();
        materials += 1;
      }
    });
  });
  textures += disposeBreachV2ActorSkeletons(root, registry).textures;
  return { geometries, materials, textures };
}

interface RuntimeActor {
  placement: BreachlingPlacement;
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
  groundingOffsets: Map<string, number>;
  groundingFromY: number;
  groundingTargetY: number;
  groundingBlendSeconds: number;
  spitFired: boolean;
}

interface PoisonProjectile {
  root: THREE.Mesh;
  velocity: THREE.Vector3;
  remainingSeconds: number;
}

export function breachlingActionNames(tier: BreachlingTier): readonly string[] {
  return UPPER_TIERS.has(tier) ? BREACHLING_UPPER_ACTIONS : BREACHLING_BASE_ACTIONS;
}

export function buildBreachlingPlacements(
  layout: BreachV2Layout,
  path: "wayfarer" | "oathbreaker",
): BreachlingPlacement[] {
  const rooms = layout.rooms.filter((room) => !room.fixed);
  const perRoom = path === "oathbreaker" ? 3 : 2;
  const tiers: readonly BreachlingTier[] = ["base", "stalker", "oathbound", "ravager"];
  const placements: BreachlingPlacement[] = [];
  rooms.forEach((room, roomIndex) => {
    const floorProps = layout.placements.filter((placement) => (
      placement.roomId === room.id && placement.placement === "floor"
    ));
    const roomPlacements: BreachlingPlacement[] = [];
    const centerX = room.x + room.w / 2;
    const centerZ = room.z + room.h / 2;
    for (let index = 0; index < perRoom; index += 1) {
      const progression = rooms.length <= 1
        ? index / Math.max(1, perRoom - 1)
        : (roomIndex + index / perRoom * 0.45) / (rooms.length - 0.55);
      const tier = tiers[Math.min(tiers.length - 1, Math.floor(progression * tiers.length))]!;
      let chosen: readonly [number, number] | null = null;
      const startOffset = (roomIndex * perRoom + index) % ROOM_OFFSETS.length;
      for (let attempt = 0; attempt < ROOM_OFFSETS.length; attempt += 1) {
        const [offsetX, offsetZ] = ROOM_OFFSETS[(startOffset + attempt) % ROOM_OFFSETS.length]!;
        const x = THREE.MathUtils.clamp(centerX + room.w * offsetX, room.x + 1.5, room.x + room.w - 1.5);
        const z = THREE.MathUtils.clamp(centerZ + room.h * offsetZ, room.z + 1.5, room.z + room.h - 1.5);
        const clearsProps = floorProps.every((prop) => (
          Math.hypot(x - prop.x, z - prop.z) >= (prop.footprint ?? 0.8) / 2 + 0.75
        ));
        const clearsCreatures = roomPlacements.every((other) => Math.hypot(x - other.x, z - other.z) >= 1.5);
        if (clearsProps && clearsCreatures) {
          chosen = [x, z];
          break;
        }
      }
      const [x, z] = chosen ?? [centerX + (index - (perRoom - 1) / 2) * 1.7, centerZ];
      const placement: BreachlingPlacement = {
        id: `breachling:${room.id}:${index + 1}`,
        tier,
        roomId: room.id,
        x,
        z,
        floorElevation: room.floorElevation,
        yaw: Math.atan2(centerX - x, centerZ - z),
      };
      roomPlacements.push(placement);
      placements.push(placement);
    }
  });
  return placements;
}

function roomIdAt(layout: BreachV2Layout, x: number, z: number): string | null {
  return layout.rooms.find((room) => (
    x >= room.x && x <= room.x + room.w && z >= room.z && z <= room.z + room.h
  ))?.id ?? null;
}

export function createBreachV2BreachlingRuntime(
  scene: THREE.Scene,
  layout: BreachV2Layout,
  loader: Pick<GLTFLoader, "loadAsync">,
  path: "wayfarer" | "oathbreaker",
  resourceDisposalRegistry = createBreachV2ResourceDisposalRegistry(),
): BreachV2BreachlingRuntime {
  const placements = buildBreachlingPlacements(layout, path);
  const sourcePromises = new Map<BreachlingTier, Promise<GLTF>>();
  const resolvedSources = new Set<GLTF>();
  const actors = new Map<string, RuntimeActor>();
  const projectiles: PoisonProjectile[] = [];
  const projectileGeometry = new THREE.SphereGeometry(0.08, 8, 6);
  const projectileMaterial = new THREE.MeshStandardMaterial({ color: 0x82d94d, emissive: 0x2f8f28, emissiveIntensity: 2 });
  let desiredRoomId: string | null = null;
  let activationToken = 0;
  let disposed = false;
  let latestPlayer = new THREE.Vector3();

  const disposeSource = (source: GLTF): void => {
    disposeBreachV2ObjectResources(source.scene, resourceDisposalRegistry);
  };

  const sourceFor = (tier: BreachlingTier): Promise<GLTF> => {
    if (disposed) return Promise.reject(new Error("Breachling runtime is disposed."));
    let promise = sourcePromises.get(tier);
    if (!promise) {
      promise = loader.loadAsync(BREACHLING_RUNTIME_ASSETS[tier].url).then((source) => {
        if (disposed) {
          disposeSource(source);
        } else {
          resolvedSources.add(source);
        }
        return source;
      });
      sourcePromises.set(tier, promise);
    }
    return promise;
  };
  const clearActors = (): void => {
    actors.forEach((actor) => {
      actor.mixer.stopAllAction();
      disposeBreachV2ActorSkeletons(actor.model, resourceDisposalRegistry);
      actor.root.removeFromParent();
    });
    actors.clear();
  };
  const playActor = (actor: RuntimeActor, clipName: string, immediate = false): number => {
    const action = actor.actions.get(clipName);
    if (!action) throw new Error(`${actor.placement.id} does not provide ${clipName}.`);
    const loops = LOOPING_ACTIONS.has(clipName);
    if (immediate) {
      actor.mixer.stopAllAction();
    } else if (actor.currentAction !== action) {
      actor.currentAction.fadeOut(ACTION_TRANSITION_SECONDS);
    }
    action.reset().stopFading().stopWarping();
    action.enabled = true;
    action.paused = false;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(1);
    action.clampWhenFinished = !loops;
    action.setLoop(loops ? THREE.LoopRepeat : THREE.LoopOnce, loops ? Infinity : 1);
    if (!immediate && actor.currentAction !== action) action.fadeIn(ACTION_TRANSITION_SECONDS);
    action.play();
    actor.currentAction = action;
    actor.currentClip = clipName;
    actor.groundingFromY = actor.pivot.position.y;
    actor.groundingTargetY = actor.groundingOffsets.get(clipName)!;
    actor.groundingBlendSeconds = immediate ? ACTION_TRANSITION_SECONDS : 0;
    if (immediate) actor.pivot.position.y = actor.groundingTargetY;
    actor.groundingStatus = "pending";
    actor.groundingFrames = 0;
    actor.groundingClearanceMeters = null;
    actor.spitFired = false;
    return action.getClip().duration;
  };
  const createActor = (placement: BreachlingPlacement, source: GLTF): RuntimeActor => {
    const model = cloneSkeleton(source.scene);
    model.name = `${BREACHLING_RUNTIME_ASSETS[placement.tier].label} model`;
    model.updateMatrixWorld(true);
    const sourceHeight = new THREE.Box3().setFromObject(model, true).getSize(new THREE.Vector3()).y;
    if (!(sourceHeight > 0)) throw new Error(`${placement.tier} Breachling has no finite height.`);
    model.scale.setScalar(BREACHLING_RUNTIME_ASSETS[placement.tier].targetHeightMeters / sourceHeight);
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
    root.userData.creatureTier = placement.tier;
    root.userData.roomId = placement.roomId;
    root.userData.collisionMode = "animated-creature-preview-nonblocking";
    root.userData.blocksMovement = false;
    root.userData.blocksLineOfSight = false;
    root.userData.blocksCamera = false;
    pivot.add(model);
    root.add(pivot);
    scene.add(root);
    const mixer = new THREE.AnimationMixer(model);
    const actions = new Map(source.animations.map((clip) => [clip.name, mixer.clipAction(clip)]));
    for (const required of breachlingActionNames(placement.tier)) {
      if (!actions.has(required)) throw new Error(`${placement.tier} Breachling is missing ${required}.`);
    }
    const idle = actions.get("Idle")!;
    // Reference each clip's grounded first pose, never the current scrub time
    // or a partially blended attack. Cache once and preserve airborne motion.
    const groundingOffsets = new Map<string, number>();
    for (const [name, action] of actions) {
      mixer.stopAllAction();
      action.reset().play();
      mixer.update(0);
      root.updateWorldMatrix(true, false);
      // SkinnedMesh.updateMatrixWorld also refreshes its attached inverse bind;
      // updateWorldMatrix alone leaves it stale after changing a parent pivot.
      root.updateMatrixWorld(true);
      const response = root.matrixWorld.elements[5]!;
      if (!(response > 1e-6)) throw new Error("Breachling floor reference must have a positive up axis.");
      groundingOffsets.set(name, -measureAnimatedPoseGrounding(root, model).clearanceMeters / response);
    }
    mixer.stopAllAction();
    pivot.position.y = groundingOffsets.get("Idle")!;
    const actor: RuntimeActor = {
      placement, root, pivot, model, mixer, actions,
      currentAction: idle, currentClip: "Idle", groundingStatus: "pending", groundingFrames: 0,
      groundingClearanceMeters: null, spitFired: false,
      groundingOffsets, groundingFromY: pivot.position.y, groundingTargetY: pivot.position.y,
      groundingBlendSeconds: ACTION_TRANSITION_SECONDS,
    };
    mixer.addEventListener("finished", (event) => {
      if (event.action !== actor.currentAction) return;
      if (actor.currentClip !== "Death") playActor(actor, "CombatIdle");
    });
    playActor(actor, "Idle");
    return actor;
  };
  const activateRoom = async (roomId: string | null): Promise<void> => {
    if (disposed) return;
    if (roomId === desiredRoomId) return;
    desiredRoomId = roomId;
    const token = ++activationToken;
    const requested = placements.filter((placement) => placement.roomId === roomId);
    if (requested.length === 0) {
      clearActors();
      return;
    }
    const sources = new Map<BreachlingTier, GLTF>();
    await Promise.all([...new Set(requested.map((placement) => placement.tier))].map(async (tier) => {
      sources.set(tier, await sourceFor(tier));
    }));
    if (disposed || token !== activationToken) return;
    clearActors();
    for (const placement of requested) {
      if (disposed || token !== activationToken) return;
      actors.set(placement.id, createActor(placement, sources.get(placement.tier)!));
    }
  };
  const spawnPoison = (actor: RuntimeActor): void => {
    const mouth = actor.model.getObjectByName("jaw") ?? actor.model.getObjectByName("head") ?? actor.model;
    const origin = mouth.getWorldPosition(new THREE.Vector3());
    const target = latestPlayer.clone().setY(latestPlayer.y + 0.8);
    const velocity = target.sub(origin).normalize().multiplyScalar(6.5);
    const root = new THREE.Mesh(projectileGeometry, projectileMaterial);
    root.name = `${actor.placement.id}:poison-spit`;
    root.position.copy(origin);
    scene.add(root);
    projectiles.push({ root, velocity, remainingSeconds: 1.4 });
  };

  return {
    warmAt: async (x, z) => {
      if (disposed) return;
      await activateRoom(roomIdAt(layout, x, z));
    },
    update: (playerX, playerZ, deltaSeconds) => {
      if (disposed) return;
      latestPlayer.set(playerX, 0, playerZ);
      void activateRoom(roomIdAt(layout, playerX, playerZ)).catch((error) => console.error("Breachling room activation failed", error));
      actors.forEach((actor) => {
        actor.mixer.update(deltaSeconds);
        actor.groundingBlendSeconds = Math.min(ACTION_TRANSITION_SECONDS, actor.groundingBlendSeconds + deltaSeconds);
        actor.pivot.position.y = THREE.MathUtils.lerp(
          actor.groundingFromY, actor.groundingTargetY,
          actor.groundingBlendSeconds / ACTION_TRANSITION_SECONDS,
        );
        actor.groundingFrames += 1;
        if (actor.groundingStatus === "pending" && actor.groundingFrames >= 3) {
          actor.root.updateMatrixWorld(true);
          const grounding = measureAnimatedPoseGrounding(actor.root, actor.model);
          actor.groundingClearanceMeters = grounding.clearanceMeters;
          actor.groundingStatus = "calibrated-live-pose";
        }
        if (actor.currentClip === "SpitAttack" && !actor.spitFired
          && actor.currentAction.time >= actor.currentAction.getClip().duration * 0.46) {
          actor.spitFired = true;
          spawnPoison(actor);
        }
      });
      for (let index = projectiles.length - 1; index >= 0; index -= 1) {
        const projectile = projectiles[index]!;
        projectile.root.position.addScaledVector(projectile.velocity, deltaSeconds);
        projectile.remainingSeconds -= deltaSeconds;
        if (projectile.remainingSeconds <= 0) {
          projectile.root.removeFromParent();
          projectiles.splice(index, 1);
        }
      }
    },
    snapshots: () => [...actors.values()].map((actor) => ({
      ...actor.placement,
      currentClip: actor.currentClip,
      actionNames: [...actor.actions.keys()].filter((name) => name !== "SwordSlashOutward").sort(),
      targetHeightMeters: BREACHLING_RUNTIME_ASSETS[actor.placement.tier].targetHeightMeters,
      groundingStatus: actor.groundingStatus,
      groundingClearanceMeters: actor.groundingClearanceMeters,
    })),
    play: (actorId, clipName) => playActor(actors.get(actorId) ?? (() => { throw new Error(`Unknown Breachling ${actorId}.`); })(), clipName),
    pose: (actorId, clipName, normalizedTime) => {
      const actor = actors.get(actorId);
      if (!actor) throw new Error(`Unknown Breachling ${actorId}.`);
      const duration = playActor(actor, clipName, true);
      actor.currentAction.paused = true;
      actor.currentAction.time = THREE.MathUtils.clamp(normalizedTime, 0, 1) * duration;
      actor.mixer.update(0);
    },
    pause: (actorId, paused) => {
      const actor = actors.get(actorId);
      if (!actor) throw new Error(`Unknown Breachling ${actorId}.`);
      actor.currentAction.paused = paused;
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      activationToken += 1;
      desiredRoomId = null;
      clearActors();
      projectiles.forEach((projectile) => projectile.root.removeFromParent());
      projectiles.length = 0;
      resolvedSources.forEach(disposeSource);
      resolvedSources.clear();
      projectileGeometry.dispose();
      projectileMaterial.dispose();
    },
  };
}
