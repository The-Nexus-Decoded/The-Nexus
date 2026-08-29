import * as THREE from "three";
import type { GLTF, GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { resolvePlayerAvatarManifest } from "../avatarIdentity";
import { storyDatabase } from "../persistence";

const DEFAULT_PLAYER_MODEL = "/assets/3d/characters/human-shadowknight/human-shadowknight.glb";
const FALLBACK_PLAYER_MODEL = "/assets/3d/characters/warrior.gltf";
const PLAYER_RENDER_HEIGHT = 1.86;

export interface BreachV2PlayerAvatar {
  root: THREE.Group;
  setMoving(moving: boolean): void;
  update(deltaSeconds: number): void;
}

async function resolvePreviewPlayerModelPath(): Promise<string> {
  try {
    const profile = await storyDatabase.loadCharacter();
    if (profile) return resolvePlayerAvatarManifest(profile).modelPath;
  } catch {
    // Preview startup must still produce a real avatar when saved-profile
    // storage is unavailable or contains a stale record.
  }
  return DEFAULT_PLAYER_MODEL;
}

async function loadFirstAvailableModel(loader: GLTFLoader): Promise<GLTF> {
  const preferredPath = await resolvePreviewPlayerModelPath();
  const candidates = [...new Set([preferredPath, DEFAULT_PLAYER_MODEL, FALLBACK_PLAYER_MODEL])];
  let lastError: unknown;
  for (const path of candidates) {
    try {
      return await loader.loadAsync(path);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No player avatar model could be loaded.");
}

function findClip(clips: readonly THREE.AnimationClip[], names: readonly string[]): THREE.AnimationClip | null {
  const normalizedNames = new Set(names.map((name) => name.toLowerCase()));
  return clips.find((clip) => normalizedNames.has(clip.name.toLowerCase())) ?? null;
}

export async function createBreachV2PlayerAvatar(loader: GLTFLoader): Promise<BreachV2PlayerAvatar> {
  const gltf = await loadFirstAvailableModel(loader);
  const model = gltf.scene;
  model.name = "SoulDrifter player model";
  model.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(model);
  const sourceHeight = Math.max(0.001, sourceBounds.getSize(new THREE.Vector3()).y);
  model.scale.setScalar(PLAYER_RENDER_HEIGHT / sourceHeight);
  model.updateMatrixWorld(true);
  const fittedBounds = new THREE.Box3().setFromObject(model);
  const fittedCenter = fittedBounds.getCenter(new THREE.Vector3());
  model.position.x -= fittedCenter.x;
  model.position.y -= fittedBounds.min.y;
  model.position.z -= fittedCenter.z;
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });

  const root = new THREE.Group();
  root.name = "SoulDrifter player";
  root.userData.spatialAuditExcluded = "runtime-player-avatar";
  root.add(model);

  const mixer = new THREE.AnimationMixer(model);
  const idleClip = findClip(gltf.animations, ["Idle", "CombatIdle"]);
  const walkClip = findClip(gltf.animations, ["Walk", "Run", "RunBaseline"]);
  const idleAction = idleClip ? mixer.clipAction(idleClip) : null;
  const walkAction = walkClip ? mixer.clipAction(walkClip) : null;
  let currentAction: THREE.AnimationAction | null = null;

  const play = (nextAction: THREE.AnimationAction | null): void => {
    if (!nextAction || nextAction === currentAction) return;
    currentAction?.fadeOut(0.16);
    nextAction.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.16).play();
    currentAction = nextAction;
  };
  play(idleAction ?? walkAction);

  return {
    root,
    setMoving: (moving) => play(moving ? walkAction ?? idleAction : idleAction ?? walkAction),
    update: (deltaSeconds) => mixer.update(deltaSeconds),
  };
}
