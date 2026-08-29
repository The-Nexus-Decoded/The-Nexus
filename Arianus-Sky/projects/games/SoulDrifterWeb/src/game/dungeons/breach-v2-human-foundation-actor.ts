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
export const BREACH_V2_HUMAN_FOUNDATION_CORE_ACTIONS_URL =
  "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-core-actions.glb";

export const BREACH_V2_HUMAN_FOUNDATION_ACTIONS = Object.freeze({
  idle: "MaleLocomotion__Idle",
  walk: "MaleLocomotion__Walking",
  run: "MaleLocomotion__StandardRun",
  drawSword: "ProSwordAndShield__DrawSword1",
  swordCombatIdle: "ProSwordAndShield__SwordAndShieldIdle",
  swordAttack: "ProSwordAndShield__SwordAndShieldAttack",
  sheatheSword: "ProSwordAndShield__SheathSword1",
  drawGreatsword: "GreatSword__DrawAGreatSword1",
  greatswordCombatIdle: "GreatSword__GreatSwordIdle",
  greatswordAttack: "GreatSword__GreatSwordAttack",
  greatswordWalk: "GreatSword__GreatSwordWalk",
  greatswordRun: "GreatSword__GreatSwordRun",
  staffAttack: "Interactions__HumanMasculineAthleticMuscularStaffButtSmash",
  equipBow: "ProLongbow__StandingEquipBow",
  bowCombatIdle: "ProLongbow__StandingIdle01",
  drawArrow: "ProLongbow__StandingDrawArrow",
  releaseArrow: "ProLongbow__StandingAimRecoil",
  disarmBow: "ProLongbow__StandingDisarmBow",
});

const LOOPING_ACTIONS: ReadonlySet<string> = new Set([
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.walk,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.run,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.swordCombatIdle,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordCombatIdle,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordWalk,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordRun,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.bowCombatIdle,
]);
const LOCOMOTION_ACTIONS: ReadonlySet<string> = new Set([
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.walk,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.run,
]);
const CROSSFADE_SECONDS = 0.18;
const LIVE_POSE_CALIBRATION_FRAME = 3;

export interface BreachV2HumanFoundationSnapshot {
  animation: string;
  timeSeconds: number;
  durationSeconds: number;
  groundingStatus: string;
  grounding?: {
    floorWorldY: number;
    lowerBoundWorldY: number;
    clearanceMeters: number;
    floorCorrectionMeters: number;
  };
}

export interface BreachV2HumanFoundationActor {
  root: THREE.Group;
  model: THREE.Object3D;
  animationNames(): readonly string[];
  setMoving(moving: boolean, running?: boolean): void;
  play(name: string, loop?: boolean): number;
  pose(name: string, normalizedTime: number): void;
  pause(paused: boolean): void;
  snapshot(): BreachV2HumanFoundationSnapshot;
  update(deltaSeconds: number): void;
  dispose(): void;
}

export interface BreachV2HumanFoundationActorFactory {
  createPlayer(id?: string): BreachV2HumanFoundationActor;
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

function prepareClip(source: THREE.AnimationClip, model: THREE.Object3D): THREE.AnimationClip {
  const bound = bindCompatibleAnimationClip(source, model, source.name);
  const rootTrack = bound.tracks.find((track) => {
    const separator = track.name.lastIndexOf(".");
    return separator > 0
      && track.name.slice(separator + 1) === "position"
      && /(?:hips|armature)$/i.test(track.name.slice(0, separator));
  });
  if (!rootTrack) throw new Error(`${source.name} has no locomotion-root position track.`);
  const rootName = rootTrack.name.slice(0, rootTrack.name.lastIndexOf("."));
  const targetRoot = model.getObjectByName(rootName);
  if (!targetRoot) throw new Error(`${source.name} targets missing root ${rootName}.`);
  return normalizeAnimationPackRootMotion(bound, rootName, targetRoot.position, "preserve");
}

export function createBreachV2HumanFoundationActor(
  sourceModel: THREE.Object3D,
  sourceAnimations: readonly THREE.AnimationClip[],
  id = "player",
  heightMeters = 2.06,
): BreachV2HumanFoundationActor {
  const model = cloneSkeleton(sourceModel);
  model.name = `breach-v2-human-foundation-${id}-model`;
  stripImportedHelpers(model);
  model.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(model, true);
  const sourceHeight = sourceBounds.max.y - sourceBounds.min.y;
  if (!(sourceHeight > 0) || !Number.isFinite(sourceHeight)) {
    throw new Error(`Human Foundation ${id} has no finite body height.`);
  }
  model.scale.setScalar(heightMeters / sourceHeight);

  const root = new THREE.Group();
  root.name = `breach-v2-human-foundation-${id}`;
  root.userData.breachV2VisibleActor = true;
  root.userData.actorRole = "player";
  root.userData.actorId = id;
  root.userData.sourceModelUrl = BREACH_V2_HUMAN_FOUNDATION_MODEL_URL;
  root.userData.spatialAuditExcluded = "runtime-humanoid-avatar";
  const groundingPivot = new THREE.Group();
  groundingPivot.name = `${root.name}-grounding-pivot`;
  groundingPivot.add(model);
  root.add(groundingPivot);

  const clips = new Map(sourceAnimations.map((source) => {
    const prepared = prepareClip(source, model);
    return [prepared.name, prepared] as const;
  }));
  for (const required of Object.values(BREACH_V2_HUMAN_FOUNDATION_ACTIONS).slice(0, 3)) {
    if (!clips.has(required)) throw new Error(`Human Foundation core pack is missing ${required}.`);
  }
  const mixer = new THREE.AnimationMixer(model);
  const actions = new Map<string, THREE.AnimationAction>();
  const actionFor = (name: string): THREE.AnimationAction => {
    const clip = clips.get(name);
    if (!clip) throw new Error(`Unknown Human Foundation action ${name}.`);
    let action = actions.get(name);
    if (!action) {
      action = mixer.clipAction(clip);
      actions.set(name, action);
    }
    return action;
  };

  let locomotionName: string = BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle;
  let currentName: string = locomotionName;
  let currentAction = actionFor(currentName);
  let grounded = false;
  let evaluatedFrames = 0;
  currentAction.play();
  root.userData.groundingStatus = "pending-first-evaluated-frame";

  const transitionTo = (name: string, loop: boolean): THREE.AnimationAction => {
    if (name === currentName && currentAction.isRunning()) return currentAction;
    const next = actionFor(name);
    next.reset();
    next.enabled = true;
    next.paused = false;
    next.clampWhenFinished = !loop;
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.fadeIn(CROSSFADE_SECONDS).play();
    currentAction.fadeOut(CROSSFADE_SECONDS);
    currentName = name;
    currentAction = next;
    return next;
  };
  mixer.addEventListener("finished", () => {
    if (!LOOPING_ACTIONS.has(currentName)) transitionTo(locomotionName, true);
  });

  return {
    root,
    model,
    animationNames: () => [...clips.keys()].sort(),
    setMoving: (moving, running = false) => {
      locomotionName = moving
        ? running ? BREACH_V2_HUMAN_FOUNDATION_ACTIONS.run : BREACH_V2_HUMAN_FOUNDATION_ACTIONS.walk
        : BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle;
      if (LOCOMOTION_ACTIONS.has(currentName)) transitionTo(locomotionName, true);
    },
    play: (name, loop = LOOPING_ACTIONS.has(name)) => {
      const action = transitionTo(name, loop);
      return action.getClip().duration;
    },
    pose: (name, normalizedTime) => {
      const action = transitionTo(name, false);
      action.paused = true;
      action.time = THREE.MathUtils.clamp(normalizedTime, 0, 1) * action.getClip().duration;
      mixer.update(0);
    },
    pause: (paused) => { currentAction.paused = paused; },
    snapshot: () => ({
      animation: currentName,
      timeSeconds: currentAction.time,
      durationSeconds: currentAction.getClip().duration,
      groundingStatus: String(root.userData.groundingStatus),
      grounding: root.userData.grounding,
    }),
    update: (deltaSeconds) => {
      mixer.update(deltaSeconds);
      evaluatedFrames += 1;
      if (grounded || evaluatedFrames < LIVE_POSE_CALIBRATION_FRAME) return;
      const grounding = calibrateAnimatedPoseOnFloor(root, model, groundingPivot, 0);
      const renderCorrectionMeters = grounding.floorCorrectionMeters
        * grounding.pivotResponseMetersPerMeter;
      groundingPivot.position.y = grounding.basePivotY + renderCorrectionMeters;
      groundingPivot.updateWorldMatrix(true, true);
      root.userData.grounding = {
        floorWorldY: grounding.floorWorldY,
        lowerBoundWorldY: grounding.floorWorldY,
        clearanceMeters: 0,
        floorCorrectionMeters: renderCorrectionMeters,
      };
      root.userData.groundingStatus = "calibrated-live-pose";
      grounded = true;
    },
    dispose: () => {
      mixer.stopAllAction();
      clips.forEach((clip) => mixer.uncacheClip(clip));
      mixer.uncacheRoot(model);
      root.removeFromParent();
    },
  };
}

export async function createBreachV2HumanFoundationActorFactory(
  loader: Pick<GLTFLoader, "loadAsync">,
): Promise<BreachV2HumanFoundationActorFactory> {
  const [body, core] = await Promise.all([
    loader.loadAsync(BREACH_V2_HUMAN_FOUNDATION_MODEL_URL),
    loader.loadAsync(BREACH_V2_HUMAN_FOUNDATION_CORE_ACTIONS_URL),
  ]);
  const actors = new Set<BreachV2HumanFoundationActor>();
  return {
    createPlayer: (id = "player") => {
      const actor = createBreachV2HumanFoundationActor(body.scene, core.animations, id);
      actors.add(actor);
      return actor;
    },
    dispose: () => {
      actors.forEach((actor) => actor.dispose());
      actors.clear();
    },
  };
}
