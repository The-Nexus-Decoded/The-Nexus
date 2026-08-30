import * as THREE from "three";
import type { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

import {
  calibrateAnimatedPoseOnFloor,
  measureAnimatedPoseGrounding,
} from "../animationPacks";
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

  const disposedGeometries = new Set<THREE.BufferGeometry>();
  const disposedMaterials = new Set<THREE.Material>();
  const disposedTextures = new Set<THREE.Texture>();
  const disposeSource = (source: GLTF): void => {
    source.scene.traverse((object) => {
      const renderable = object as THREE.Object3D & {
        geometry?: THREE.BufferGeometry;
        material?: THREE.Material | THREE.Material[];
        skeleton?: THREE.Skeleton;
      };
      if (renderable.geometry && !disposedGeometries.has(renderable.geometry)) {
        disposedGeometries.add(renderable.geometry);
        renderable.geometry.dispose();
      }
      const materials = renderable.material
        ? Array.isArray(renderable.material) ? renderable.material : [renderable.material]
        : [];
      materials.forEach((material) => {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture && !disposedTextures.has(value)) {
            disposedTextures.add(value);
            value.dispose();
          }
        }
        if (!disposedMaterials.has(material)) {
          disposedMaterials.add(material);
          material.dispose();
        }
      });
      const boneTexture = renderable.skeleton?.boneTexture;
      if (boneTexture && !disposedTextures.has(boneTexture)) {
        disposedTextures.add(boneTexture);
        boneTexture.dispose();
      }
    });
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
      actor.root.removeFromParent();
    });
    actors.clear();
  };
  const playActor = (actor: RuntimeActor, clipName: string): number => {
    const action = actor.actions.get(clipName);
    if (!action) throw new Error(`${actor.placement.id} does not provide ${clipName}.`);
    const loops = LOOPING_ACTIONS.has(clipName);
    if (actor.currentAction !== action) actor.currentAction.fadeOut(0.18);
    action.reset();
    action.enabled = true;
    action.paused = false;
    action.clampWhenFinished = !loops;
    action.setLoop(loops ? THREE.LoopRepeat : THREE.LoopOnce, loops ? Infinity : 1);
    action.fadeIn(0.18).play();
    actor.currentAction = action;
    actor.currentClip = clipName;
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
    const actor: RuntimeActor = {
      placement, root, pivot, model, mixer, actions,
      currentAction: idle, currentClip: "Idle", groundingStatus: "pending", groundingFrames: 0,
      groundingClearanceMeters: null, spitFired: false,
    };
    mixer.addEventListener("finished", () => {
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
        actor.groundingFrames += 1;
        if (actor.groundingStatus === "pending" && actor.groundingFrames >= 3) {
          const grounding = calibrateAnimatedPoseOnFloor(actor.root, actor.model, actor.pivot, 0);
          actor.groundingClearanceMeters = grounding.clearanceMeters;
          actor.groundingStatus = "calibrated-live-pose";
        }
        if (actor.currentClip === "Death" && actor.groundingStatus !== "pending") {
          const grounding = measureAnimatedPoseGrounding(actor.root, actor.model);
          if (Math.abs(grounding.clearanceMeters) > 0.002) actor.pivot.position.y -= grounding.clearanceMeters;
          actor.groundingClearanceMeters = measureAnimatedPoseGrounding(actor.root, actor.model).clearanceMeters;
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
      const duration = playActor(actor, clipName);
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
