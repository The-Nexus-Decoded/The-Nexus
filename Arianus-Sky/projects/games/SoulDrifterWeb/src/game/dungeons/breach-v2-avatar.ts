import * as THREE from "three";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import {
  createStarterLongswordPresentation,
  setWeaponVisualState,
} from "../presentation";

export const BREACH_V2_PILOT_MODEL_URL = "/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb";
export const BREACH_V2_PILOT_ANIMATION_URL = "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb";
export const BREACH_V2_STARTER_LONGSWORD_URL = "/assets/3d/weapons/sword/weapon-sword-longsword-starter-v001.glb";
export const BREACH_V2_PILOT_HEIGHT = 1.82;

const PILOT_IDLE_CLIP = "ProSwordAndShield__SwordAndShieldIdle";

export interface BreachV2PreviewAvatar {
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
}

/** Fits the review-pick pilot to the same meter-space used by BREACH-V2. */
export function normalizeBreachV2PreviewAvatar(
  model: THREE.Object3D,
  desiredHeight = BREACH_V2_PILOT_HEIGHT,
): THREE.Group {
  model.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(model, true);
  const sourceHeight = sourceBounds.max.y - sourceBounds.min.y;
  if (!Number.isFinite(sourceHeight) || sourceHeight <= 0.01) {
    throw new Error("BREACH-V2 pilot has no usable body bounds");
  }

  model.scale.multiplyScalar(desiredHeight / sourceHeight);
  model.updateMatrixWorld(true);
  const fittedBounds = new THREE.Box3().setFromObject(model, true);
  model.position.y -= fittedBounds.min.y;
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  const root = new THREE.Group();
  root.name = "breach-v2-human-foundation-pilot";
  root.userData.spatialAuditExcluded = "runtime-player-avatar";
  root.add(model);
  return root;
}

/** Loads the modular pilot, its approved animation library, and the #435 sword. */
export async function loadBreachV2PreviewAvatar(
  loader: GLTFLoader,
): Promise<BreachV2PreviewAvatar> {
  const [pilotGltf, swordGltf, animationGltf] = await Promise.all([
    loader.loadAsync(BREACH_V2_PILOT_MODEL_URL),
    loader.loadAsync(BREACH_V2_STARTER_LONGSWORD_URL),
    loader.loadAsync(BREACH_V2_PILOT_ANIMATION_URL),
  ]);
  const model = pilotGltf.scene;
  const root = normalizeBreachV2PreviewAvatar(model);
  const weapon = createStarterLongswordPresentation(model, swordGltf.scene);
  if (!weapon) throw new Error("BREACH-V2 pilot is missing its Mixamo hand or hip socket");
  setWeaponVisualState(weapon, "drawn");

  const idle = animationGltf.animations.find((clip) => clip.name === PILOT_IDLE_CLIP);
  const mixer = idle ? new THREE.AnimationMixer(model) : null;
  mixer?.clipAction(idle!).play();
  root.userData.avatarSource = BREACH_V2_PILOT_MODEL_URL;
  root.userData.weaponSource = BREACH_V2_STARTER_LONGSWORD_URL;
  root.userData.animationSource = BREACH_V2_PILOT_ANIMATION_URL;
  return { root, mixer };
}
