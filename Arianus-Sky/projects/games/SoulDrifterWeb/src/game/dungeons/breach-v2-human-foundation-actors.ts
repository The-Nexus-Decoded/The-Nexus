import * as THREE from "three";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

import {
  bindCompatibleAnimationClip,
  calibrateAnimatedPoseOnFloor,
  normalizeAnimationPackRootMotion,
} from "../animationPacks";

export const BREACH_V2_HUMAN_FOUNDATION_MODEL_URL =
  "/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb";
export const BREACH_V2_HUMAN_FOUNDATION_ANIMATION_URL =
  "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb";

const FOUNDATION_IDLE_CLIP = "MaleLocomotion__Idle";
const FOUNDATION_WALK_CLIP = "MaleLocomotion__Walking";
const CROSSFADE_SECONDS = 0.18;
const LIVE_POSE_CALIBRATION_FRAME = 3;

export interface BreachV2HumanFoundationActorOptions {
  id: string;
  heightMeters: number;
  role: "player" | "npc";
}

export interface BreachV2HumanFoundationActor {
  root: THREE.Group;
  model: THREE.Object3D;
  scale: number;
  setMoving(moving: boolean): void;
  update(deltaSeconds: number): void;
  dispose(): void;
}

export interface BreachV2HumanFoundationActorFactory {
  createActor(options: BreachV2HumanFoundationActorOptions): BreachV2HumanFoundationActor;
  dispose(): void;
}

function stripImportedHelpers(model: THREE.Object3D): void {
  const helpers: THREE.Object3D[] = [];
  model.traverse((object) => {
    if (object instanceof THREE.Camera || object instanceof THREE.Light
      || (/^(?:Cube|Icosphere)$/i.test(object.name) && !(object instanceof THREE.SkinnedMesh))) {
      helpers.push(object);
      return;
    }
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const cloned = materials.map((material) => material.clone());
    object.material = Array.isArray(object.material) ? cloned : cloned[0]!;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  helpers.forEach((helper) => helper.removeFromParent());
}

function inPlaceGroundedClip(
  source: THREE.AnimationClip,
  model: THREE.Object3D,
  semanticName: string,
): THREE.AnimationClip {
  const bound = bindCompatibleAnimationClip(source, model, semanticName);
  const positionTrackFor = (nodePattern: RegExp) => bound.tracks.find((track) => {
    const separator = track.name.lastIndexOf(".");
    return separator > 0
      && track.name.slice(separator + 1) === "position"
      && nodePattern.test(track.name.slice(0, separator));
  });
  const rootTrack = positionTrackFor(/hips$/i) ?? positionTrackFor(/armature$/i);
  if (!rootTrack) throw new Error(`${semanticName} has no locomotion-root position track.`);
  const rootNodeName = rootTrack.name.slice(0, rootTrack.name.lastIndexOf("."));
  const targetRoot = model.getObjectByName(rootNodeName);
  if (!targetRoot) throw new Error(`${semanticName} targets missing locomotion root ${rootNodeName}.`);
  return normalizeAnimationPackRootMotion(bound, rootNodeName, targetRoot.position, "lock-to-rest");
}

/** Creates a visible actor only; navigation and collision remain separate runtime data. */
export function createBreachV2HumanFoundationActor(
  sourceModel: THREE.Object3D,
  idleSource: THREE.AnimationClip,
  walkSource: THREE.AnimationClip,
  options: BreachV2HumanFoundationActorOptions,
): BreachV2HumanFoundationActor {
  const model = cloneSkeleton(sourceModel);
  model.name = `breach-v2-human-foundation-${options.id}-model`;
  stripImportedHelpers(model);
  model.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(model, true);
  const sourceHeight = sourceBounds.max.y - sourceBounds.min.y;
  if (!(sourceHeight > 0) || !Number.isFinite(sourceHeight)) {
    throw new Error(`Human foundation ${options.id} has no finite body height.`);
  }
  const scale = options.heightMeters / sourceHeight;
  model.scale.setScalar(scale);

  const root = new THREE.Group();
  root.name = `breach-v2-human-foundation-${options.id}`;
  root.userData.breachV2VisibleActor = true;
  root.userData.actorRole = options.role;
  root.userData.actorId = options.id;
  root.userData.sourceModelUrl = BREACH_V2_HUMAN_FOUNDATION_MODEL_URL;
  root.userData.sourceAnimationUrl = BREACH_V2_HUMAN_FOUNDATION_ANIMATION_URL;
  root.userData.spatialAuditExcluded = "runtime-humanoid-avatar";
  const groundingPivot = new THREE.Group();
  groundingPivot.name = `${root.name}-grounding-pivot`;
  groundingPivot.add(model);
  root.add(groundingPivot);

  const mixer = new THREE.AnimationMixer(model);
  const idleClip = inPlaceGroundedClip(idleSource, model, `${options.id}__Idle`);
  const walkClip = inPlaceGroundedClip(walkSource, model, `${options.id}__Walk`);
  const idleAction = mixer.clipAction(idleClip);
  const walkAction = mixer.clipAction(walkClip);
  idleAction.play();
  root.userData.groundingStatus = "pending-first-evaluated-frame";

  let moving = false;
  let grounded = false;
  let evaluatedFrames = 0;
  let currentAction = idleAction;
  return {
    root,
    model,
    scale,
    setMoving: (nextMoving) => {
      if (nextMoving === moving) return;
      moving = nextMoving;
      const nextAction = moving ? walkAction : idleAction;
      nextAction.reset().fadeIn(CROSSFADE_SECONDS).play();
      currentAction.fadeOut(CROSSFADE_SECONDS);
      currentAction = nextAction;
    },
    update: (deltaSeconds) => {
      mixer.update(deltaSeconds);
      evaluatedFrames += 1;
      if (grounded || evaluatedFrames < LIVE_POSE_CALIBRATION_FRAME) return;
      const grounding = calibrateAnimatedPoseOnFloor(root, model, groundingPivot, 0);
      const renderCorrectionMeters = grounding.floorCorrectionMeters
        * grounding.pivotResponseMetersPerMeter;
      groundingPivot.position.y = grounding.basePivotY + renderCorrectionMeters;
      groundingPivot.updateWorldMatrix(true, true);
      root.userData.groundingClearanceMeters = 0;
      root.userData.grounding = {
        floorWorldY: grounding.floorWorldY,
        lowerBoundWorldY: grounding.floorWorldY,
        clearanceMeters: 0,
        floorCorrectionMeters: renderCorrectionMeters,
        cpuProbePivotResponseMetersPerMeter: grounding.pivotResponseMetersPerMeter,
      };
      root.userData.groundingStatus = "calibrated-live-pose";
      grounded = true;
    },
    dispose: () => {
      mixer.stopAllAction();
      mixer.uncacheClip(idleClip);
      mixer.uncacheClip(walkClip);
      mixer.uncacheRoot(model);
      root.removeFromParent();
    },
  };
}

export async function createBreachV2HumanFoundationActorFactory(
  loader: Pick<GLTFLoader, "loadAsync">,
): Promise<BreachV2HumanFoundationActorFactory> {
  const [body, animationLibrary] = await Promise.all([
    loader.loadAsync(BREACH_V2_HUMAN_FOUNDATION_MODEL_URL),
    loader.loadAsync(BREACH_V2_HUMAN_FOUNDATION_ANIMATION_URL),
  ]);
  const clip = (name: string) => {
    const found = THREE.AnimationClip.findByName(animationLibrary.animations, name);
    if (!found) throw new Error(`Human foundation animation library is missing ${name}.`);
    return found;
  };
  const idle = clip(FOUNDATION_IDLE_CLIP);
  const walk = clip(FOUNDATION_WALK_CLIP);
  const actors = new Set<BreachV2HumanFoundationActor>();
  return {
    createActor: (options) => {
      const actor = createBreachV2HumanFoundationActor(body.scene, idle, walk, options);
      actors.add(actor);
      return actor;
    },
    dispose: () => {
      actors.forEach((actor) => actor.dispose());
      actors.clear();
    },
  };
}
