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
export const BREACH_V2_HUMAN_FOUNDATION_STARTER_LONGSWORD_URL =
  "/assets/3d/weapons/sword/weapon-sword-longsword-starter-v001.glb";

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
const DRAW_SWORD_SOCKET_TRANSFER_NORMALIZED_TIME = 0.9;
const SHEATHE_SWORD_SOCKET_TRANSFER_NORMALIZED_TIME = 0.74;

export interface BreachV2HumanFoundationSnapshot {
  animation: string;
  timeSeconds: number;
  durationSeconds: number;
  groundingStatus: string;
  weaponState: "unavailable" | "sheathed" | "drawn";
  weaponSource?: string;
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

interface FoundationWeaponPresentation {
  handSocket: THREE.Group;
  hipSocket: THREE.Group;
  state: "sheathed" | "drawn";
}

function findFoundationSocketBone(
  model: THREE.Object3D,
  candidates: readonly string[],
): THREE.Object3D | null {
  const normalizedCandidates = new Set(
    candidates.map((candidate) => candidate.toLowerCase().replace(/[^a-z0-9]/g, "")),
  );
  const matches: THREE.Object3D[] = [];
  model.traverse((object) => {
    if (!(object instanceof THREE.Bone)) return;
    const normalizedName = object.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalizedCandidates.has(normalizedName)) matches.push(object);
  });
  if (matches.length > 1) {
    throw new Error(`Human Foundation starter longsword socket is ambiguous: ${matches.map(({ name }) => name).join(", ")}.`);
  }
  return matches[0] ?? null;
}

function createFoundationWeaponPresentation(
  model: THREE.Object3D,
  sourceWeapon?: THREE.Object3D,
): FoundationWeaponPresentation | null {
  if (!sourceWeapon) return null;
  const handBone = findFoundationSocketBone(model, ["mixamorig:RightHand", "hand_r"]);
  const hipBone = findFoundationSocketBone(model, ["mixamorig:Hips", "pelvis"]);
  if (!handBone || !hipBone) {
    throw new Error("Human Foundation starter longsword requires right-hand and hip sockets.");
  }
  const inverseModelScale = 1 / model.scale.x;
  const handSocket = new THREE.Group();
  handSocket.name = "weapon-socket-hand-r";
  const handVisual = sourceWeapon.clone(true);
  handVisual.name = "weapon-sword-longsword-starter-v001-hand";
  handVisual.scale.multiplyScalar(inverseModelScale);
  handSocket.add(handVisual);
  handBone.add(handSocket);

  const hipSocket = new THREE.Group();
  hipSocket.name = "weapon-socket-hip-l";
  hipSocket.position.set(0.09056, 0.1034, 0.07796);
  hipSocket.rotation.set(0.08, -0.12, 2.95);
  const hipVisual = sourceWeapon.clone(true);
  hipVisual.name = "weapon-sword-longsword-starter-v001-hip";
  hipVisual.scale.multiplyScalar(inverseModelScale);
  hipSocket.add(hipVisual);
  hipBone.add(hipSocket);
  return { handSocket, hipSocket, state: "sheathed" };
}

function setFoundationWeaponState(
  weapon: FoundationWeaponPresentation | null,
  state: "sheathed" | "drawn",
): void {
  if (!weapon) return;
  weapon.state = state;
  weapon.handSocket.visible = state === "drawn";
  weapon.hipSocket.visible = state === "sheathed";
}

export function createBreachV2HumanFoundationActor(
  sourceModel: THREE.Object3D,
  sourceAnimations: readonly THREE.AnimationClip[],
  id = "player",
  heightMeters = 2.06,
  sourceWeapon?: THREE.Object3D,
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
  const weapon = createFoundationWeaponPresentation(model, sourceWeapon);
  setFoundationWeaponState(weapon, "sheathed");
  if (weapon) root.userData.weaponSource = BREACH_V2_HUMAN_FOUNDATION_STARTER_LONGSWORD_URL;

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

  const syncWeaponForAction = (name: string, normalizedTime: number): void => {
    const progress = THREE.MathUtils.clamp(normalizedTime, 0, 1);
    if (name === BREACH_V2_HUMAN_FOUNDATION_ACTIONS.drawSword
      || name === BREACH_V2_HUMAN_FOUNDATION_ACTIONS.drawGreatsword) {
      setFoundationWeaponState(
        weapon,
        progress < DRAW_SWORD_SOCKET_TRANSFER_NORMALIZED_TIME ? "sheathed" : "drawn",
      );
      return;
    }
    if (name === BREACH_V2_HUMAN_FOUNDATION_ACTIONS.sheatheSword) {
      setFoundationWeaponState(
        weapon,
        progress < SHEATHE_SWORD_SOCKET_TRANSFER_NORMALIZED_TIME ? "drawn" : "sheathed",
      );
      return;
    }
    if (name === BREACH_V2_HUMAN_FOUNDATION_ACTIONS.swordCombatIdle
      || name === BREACH_V2_HUMAN_FOUNDATION_ACTIONS.swordAttack
      || name === BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordCombatIdle
      || name === BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordAttack
      || name === BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordWalk
      || name === BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordRun) {
      setFoundationWeaponState(weapon, "drawn");
      return;
    }
    setFoundationWeaponState(weapon, "sheathed");
  };

  const recoveryFor = (name: string): string => {
    const preferred = name === BREACH_V2_HUMAN_FOUNDATION_ACTIONS.drawSword
      || name === BREACH_V2_HUMAN_FOUNDATION_ACTIONS.swordAttack
      ? BREACH_V2_HUMAN_FOUNDATION_ACTIONS.swordCombatIdle
      : name === BREACH_V2_HUMAN_FOUNDATION_ACTIONS.drawGreatsword
        || name === BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordAttack
        ? BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordCombatIdle
        : name === BREACH_V2_HUMAN_FOUNDATION_ACTIONS.equipBow
          || name === BREACH_V2_HUMAN_FOUNDATION_ACTIONS.drawArrow
          || name === BREACH_V2_HUMAN_FOUNDATION_ACTIONS.releaseArrow
          ? BREACH_V2_HUMAN_FOUNDATION_ACTIONS.bowCombatIdle
          : locomotionName;
    return clips.has(preferred) ? preferred : locomotionName;
  };

  const transitionTo = (name: string, loop: boolean): THREE.AnimationAction => {
    if (name === currentName) return currentAction;
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
    syncWeaponForAction(name, 0);
    return next;
  };
  mixer.addEventListener("finished", (event) => {
    if (event.action !== currentAction || LOOPING_ACTIONS.has(currentName)) return;
    const recovery = recoveryFor(currentName);
    transitionTo(recovery, LOOPING_ACTIONS.has(recovery));
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
      const restartCurrent = name === currentName;
      const action = transitionTo(name, loop);
      if (restartCurrent) {
        action.reset();
        action.enabled = true;
        action.paused = false;
        action.clampWhenFinished = !loop;
        action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        action.play();
        syncWeaponForAction(name, 0);
      }
      return action.getClip().duration;
    },
    pose: (name, normalizedTime) => {
      const action = transitionTo(name, false);
      action.paused = true;
      action.time = THREE.MathUtils.clamp(normalizedTime, 0, 1) * action.getClip().duration;
      mixer.update(0);
      syncWeaponForAction(name, normalizedTime);
    },
    pause: (paused) => { currentAction.paused = paused; },
    snapshot: () => ({
      animation: currentName,
      timeSeconds: currentAction.time,
      durationSeconds: currentAction.getClip().duration,
      groundingStatus: String(root.userData.groundingStatus),
      weaponState: weapon?.state ?? "unavailable",
      weaponSource: weapon ? BREACH_V2_HUMAN_FOUNDATION_STARTER_LONGSWORD_URL : undefined,
      grounding: root.userData.grounding,
    }),
    update: (deltaSeconds) => {
      mixer.update(deltaSeconds);
      syncWeaponForAction(
        currentName,
        currentAction.getClip().duration > 0
          ? currentAction.time / currentAction.getClip().duration
          : 0,
      );
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
  const [body, core, weapon] = await Promise.all([
    loader.loadAsync(BREACH_V2_HUMAN_FOUNDATION_MODEL_URL),
    loader.loadAsync(BREACH_V2_HUMAN_FOUNDATION_CORE_ACTIONS_URL),
    loader.loadAsync(BREACH_V2_HUMAN_FOUNDATION_STARTER_LONGSWORD_URL),
  ]);
  const actors = new Set<BreachV2HumanFoundationActor>();
  return {
    createPlayer: (id = "player") => {
      const actor = createBreachV2HumanFoundationActor(body.scene, core.animations, id, 2.06, weapon.scene);
      actors.add(actor);
      return actor;
    },
    dispose: () => {
      actors.forEach((actor) => actor.dispose());
      actors.clear();
    },
  };
}
