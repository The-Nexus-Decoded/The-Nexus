import * as THREE from "three";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

import {
  bindCompatibleAnimationClip,
  calibrateAnimatedPoseOnFloor,
} from "../animationPacks";
import {
  APPROVED_GREATSWORD_CALIBRATION,
  applyAdditiveHumanHandGrip,
  solveGreatswordSupportGrip,
} from "../humanWeaponCalibration";

export const BREACH_V2_HUMAN_FOUNDATION_MODEL_URL =
  "/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb";
export const BREACH_V2_HUMAN_FOUNDATION_ANIMATIONS_URL =
  "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb";
export const BREACH_V2_HUMAN_FOUNDATION_STARTER_LONGSWORD_URL =
  "/assets/3d/weapons/sword/weapon-sword-longsword-starter-v001.glb";

export const BREACH_V2_HUMAN_FOUNDATION_ACTIONS = Object.freeze({
  idle: "MaleLocomotion__Idle",
  walk: "MaleLocomotion__Walking",
  run: "MaleLocomotion__StandardRun",
  drawGreatsword: "GreatSword__DrawAGreatSword2",
  greatswordCombatIdle: "GreatSword__GreatSwordIdle",
  greatswordAttack: "GreatSword__GreatSwordAttack",
  greatswordSlash: "GreatSword__GreatSwordSlash",
  greatswordSlash2: "GreatSword__GreatSwordSlash2",
  greatswordSlash3: "GreatSword__GreatSwordSlash3",
  greatswordHighSpin: "GreatSword__GreatSwordHighSpinAttack",
  greatswordJumpAttack: "GreatSword__GreatSwordJumpAttack",
  greatswordBlock: "GreatSword__GreatSwordBlocking",
  greatswordWalk: "GreatSword__GreatSwordWalk",
  greatswordRun: "GreatSword__GreatSwordRun",
});
const APPROVED_ACTIONS: ReadonlySet<string> = new Set(Object.values(BREACH_V2_HUMAN_FOUNDATION_ACTIONS));

const LOOPING_ACTIONS: ReadonlySet<string> = new Set([
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.walk,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.run,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordCombatIdle,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordWalk,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordRun,
]);
const LOCOMOTION_ACTIONS: ReadonlySet<string> = new Set([
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.walk,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.run,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordCombatIdle,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordWalk,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordRun,
]);
const MOVING_GAITS: ReadonlySet<string> = new Set([
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.walk,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.run,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordWalk,
  BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordRun,
]);
const CROSSFADE_SECONDS = 0.18;
const LIVE_POSE_CALIBRATION_FRAME = 3;

export interface BreachV2HumanFoundationSnapshot {
  animation: string;
  timeSeconds: number;
  durationSeconds: number;
  playback: { activation: number; completedCycles: number; loop: "repeat" | "once"; phase: number };
  groundingStatus: string;
  weaponState: "unavailable" | "unequipped" | "drawn";
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
  // The canonical GLB armature is locally Z-up: its hips-Y travel is forward,
  // not height. Project using the actual imported parent frame so navigation
  // owns world XZ while jumping/bobbing retain only true vertical displacement.
  model.updateMatrixWorld(true);
  const upInParent = new THREE.Vector3(0, 1, 0);
  if (targetRoot.parent) upInParent.transformDirection(targetRoot.parent.matrixWorld.clone().invert());
  const anchor = new THREE.Vector3().fromArray(rootTrack.values);
  const delta = new THREE.Vector3();
  const stride = rootTrack.getValueSize();
  for (let index = 0; index < rootTrack.values.length; index += stride) {
    delta.fromArray(rootTrack.values, index).sub(anchor);
    const height = delta.dot(upInParent);
    delta.copy(targetRoot.position).addScaledVector(upInParent, height);
    delta.toArray(rootTrack.values, index);
  }
  return bound;
}

interface FoundationWeaponPresentation {
  handSocket: THREE.Group;
  state: "unequipped" | "drawn";
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
  if (!handBone) {
    throw new Error("Human Foundation starter longsword requires a right-hand socket.");
  }
  const inverseModelScale = 1 / model.scale.x;
  const handSocket = new THREE.Group();
  handSocket.name = "weapon-socket-hand-r";
  handSocket.scale.setScalar(inverseModelScale);
  handSocket.position.fromArray(APPROVED_GREATSWORD_CALIBRATION.socketPosition).multiplyScalar(inverseModelScale);
  handSocket.rotation.set(...APPROVED_GREATSWORD_CALIBRATION.socketRotation);
  const handVisual = sourceWeapon.clone(true);
  handVisual.name = "weapon-sword-longsword-starter-v001-hand";
  handSocket.add(handVisual);
  handBone.add(handSocket);

  return { handSocket, state: "unequipped" };
}

function setFoundationWeaponState(
  weapon: FoundationWeaponPresentation | null,
  state: "unequipped" | "drawn",
): void {
  if (!weapon) return;
  weapon.state = state;
  weapon.handSocket.visible = state === "drawn";
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
  const ownedMaterials = new Set<THREE.Material>();
  const ownedSkeletons = new Set<THREE.Skeleton>();
  model.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) ownedMaterials.add(material);
    }
    if (node instanceof THREE.SkinnedMesh) ownedSkeletons.add(node.skeleton);
  });
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
  setFoundationWeaponState(weapon, "unequipped");
  if (weapon) root.userData.weaponSource = BREACH_V2_HUMAN_FOUNDATION_STARTER_LONGSWORD_URL;
  root.userData.humanCalibration = "issue-435-approved-greatsword-v1";
  root.userData.humanEquipmentScope = "greatsword-and-unarmed; full loadouts and authored sheath remain in weapon-lab";

  // The shared 400-clip library is authoritative. Expose only combinations this
  // actor can actually present; a sword is never shown under bow/staff labels.
  const clips = new Map(sourceAnimations.filter((source) => APPROVED_ACTIONS.has(source.name)).map((source) => {
    const prepared = prepareClip(source, model);
    return [prepared.name, prepared] as const;
  }));
  for (const required of Object.values(BREACH_V2_HUMAN_FOUNDATION_ACTIONS).slice(0, 3)) {
    if (!clips.has(required)) throw new Error(`Human Foundation animation library is missing ${required}.`);
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
  let activation = 0;
  let completedCycles = 0;
  let disposed = false;
  const bones: THREE.Bone[] = [];
  model.traverse((object) => { if (object instanceof THREE.Bone) bones.push(object); });
  const overlay = new Map<THREE.Bone, THREE.Quaternion>();
  const supportBase = new Map<THREE.Bone, THREE.Quaternion>();
  currentAction.play();
  root.userData.groundingStatus = "pending-first-evaluated-frame";

  const syncWeaponForAction = (name: string): void => {
    // Draw2 uses the accepted lab's hand attachment throughout; no rejected
    // hip-socket transfer is reused. Explicit unarmed actions unequip it.
    setFoundationWeaponState(weapon, name.startsWith("GreatSword__") ? "drawn" : "unequipped");
    root.userData.weaponState = weapon?.state ?? "unavailable";
  };
  const restoreCalibration = (): void => {
    for (const [bone, quaternion] of overlay) bone.quaternion.multiply(quaternion.clone().invert());
    overlay.clear();
    for (const [bone, quaternion] of supportBase) bone.quaternion.copy(quaternion);
    supportBase.clear();
  };
  const evaluate = (deltaSeconds: number): void => {
    restoreCalibration();
    mixer.update(deltaSeconds);
    syncWeaponForAction(currentName);
    if (weapon?.state === "drawn") {
      const calibration = APPROVED_GREATSWORD_CALIBRATION;
      applyAdditiveHumanHandGrip(bones, "Right", calibration.curls, calibration.thumb, overlay);
      applyAdditiveHumanHandGrip(bones, "Left", calibration.curls, calibration.thumb, overlay);
      if (currentName !== BREACH_V2_HUMAN_FOUNDATION_ACTIONS.drawGreatsword) {
        solveGreatswordSupportGrip(model, bones, weapon.handSocket, supportBase);
      }
    }
    model.updateMatrixWorld(true);
  };

  const recoveryFor = (name: string): string => {
    const preferred = name.startsWith("GreatSword__")
      ? locomotionName.startsWith("GreatSword__") ? locomotionName : BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordCombatIdle
      : locomotionName;
    return clips.has(preferred) ? preferred : locomotionName;
  };

  const transitionTo = (name: string, loop: boolean): THREE.AnimationAction => {
    if (name === currentName) return currentAction;
    const next = actionFor(name);
    const phase = MOVING_GAITS.has(name) && MOVING_GAITS.has(currentName)
      ? currentAction.time / Math.max(currentAction.getClip().duration, 0.0001) : 0;
    next.reset();
    next.time = phase * next.getClip().duration;
    next.setEffectiveWeight(1);
    next.enabled = true;
    next.paused = false;
    next.clampWhenFinished = !loop;
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.fadeIn(CROSSFADE_SECONDS).play();
    currentAction.fadeOut(CROSSFADE_SECONDS);
    currentName = name;
    currentAction = next;
    activation += 1;
    completedCycles = 0;
    syncWeaponForAction(name);
    return next;
  };
  mixer.addEventListener("loop", (event) => {
    if (event.action === currentAction) completedCycles += Math.abs(event.loopDelta);
  });
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
      const armed = weapon?.state === "drawn";
      locomotionName = armed
        ? moving
          ? running ? BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordRun : BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordWalk
          : BREACH_V2_HUMAN_FOUNDATION_ACTIONS.greatswordCombatIdle
        : moving
          ? running ? BREACH_V2_HUMAN_FOUNDATION_ACTIONS.run : BREACH_V2_HUMAN_FOUNDATION_ACTIONS.walk
          : BREACH_V2_HUMAN_FOUNDATION_ACTIONS.idle;
      if (!clips.has(locomotionName)) return;
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
        activation += 1;
        completedCycles = 0;
        syncWeaponForAction(name);
      }
      return action.getClip().duration;
    },
    pose: (name, normalizedTime) => {
      // Scrubbing is an exact source pose, not a crossfade from the last clip.
      const action = actionFor(name);
      restoreCalibration();
      mixer.stopAllAction();
      action.reset().setEffectiveWeight(1).setLoop(THREE.LoopOnce, 1).play();
      action.clampWhenFinished = true;
      action.paused = true;
      action.time = THREE.MathUtils.clamp(normalizedTime, 0, 1) * action.getClip().duration;
      currentName = name;
      currentAction = action;
      activation += 1;
      completedCycles = 0;
      evaluate(0);
    },
    pause: (paused) => { currentAction.paused = paused; },
    snapshot: () => ({
      animation: currentName,
      timeSeconds: currentAction.time,
      durationSeconds: currentAction.getClip().duration,
      playback: {
        activation,
        completedCycles,
        loop: currentAction.loop === THREE.LoopRepeat ? "repeat" : "once",
        phase: currentAction.time / Math.max(currentAction.getClip().duration, 0.0001),
      },
      groundingStatus: String(root.userData.groundingStatus),
      weaponState: weapon?.state ?? "unavailable",
      weaponSource: weapon ? BREACH_V2_HUMAN_FOUNDATION_STARTER_LONGSWORD_URL : undefined,
      grounding: root.userData.grounding,
    }),
    update: (deltaSeconds) => {
      if (disposed) return;
      evaluate(deltaSeconds);
      evaluatedFrames += 1;
      if (grounded || evaluatedFrames < LIVE_POSE_CALIBRATION_FRAME) return;
      // Equipment, including invisible unequipped geometry, cannot set feet Y.
      const weaponParent = weapon?.handSocket.parent;
      weapon?.handSocket.removeFromParent();
      let grounding: ReturnType<typeof calibrateAnimatedPoseOnFloor>;
      try {
        grounding = calibrateAnimatedPoseOnFloor(root, model, groundingPivot, 0);
      } finally {
        if (weapon && weaponParent) weaponParent.add(weapon.handSocket);
      }
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
      if (disposed) return;
      disposed = true;
      restoreCalibration();
      mixer.stopAllAction();
      clips.forEach((clip) => mixer.uncacheClip(clip));
      mixer.uncacheRoot(model);
      ownedMaterials.forEach((material) => material.dispose());
      ownedSkeletons.forEach((skeleton) => skeleton.dispose());
      root.removeFromParent();
    },
  };
}

export async function createBreachV2HumanFoundationActorFactory(
  loader: Pick<GLTFLoader, "loadAsync">,
): Promise<BreachV2HumanFoundationActorFactory> {
  const results = await Promise.allSettled([
    loader.loadAsync(BREACH_V2_HUMAN_FOUNDATION_MODEL_URL),
    loader.loadAsync(BREACH_V2_HUMAN_FOUNDATION_ANIMATIONS_URL),
    loader.loadAsync(BREACH_V2_HUMAN_FOUNDATION_STARTER_LONGSWORD_URL),
  ]);
  const loaded = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const disposeSources = (): void => {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    const skeletons = new Set<THREE.Skeleton>();
    for (const source of loaded) source.scene.traverse((node) => {
      if (node instanceof THREE.SkinnedMesh) skeletons.add(node.skeleton);
      if (!(node instanceof THREE.Mesh)) return;
      geometries.add(node.geometry);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
      }
    });
    skeletons.forEach((skeleton) => skeleton.dispose());
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    textures.forEach((texture) => texture.dispose());
  };
  const failed = results.find((result) => result.status === "rejected");
  if (failed?.status === "rejected") {
    disposeSources();
    throw failed.reason;
  }
  const [body, library, weapon] = loaded;
  if (!body || !library || !weapon) throw new Error("Human Foundation asset load did not complete.");
  const actors = new Set<BreachV2HumanFoundationActor>();
  let disposed = false;
  return {
    createPlayer: (id = "player") => {
      if (disposed) throw new Error("Human Foundation factory is disposed.");
      const actor = createBreachV2HumanFoundationActor(body.scene, library.animations, id, 2.06, weapon.scene);
      actors.add(actor);
      return actor;
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      actors.forEach((actor) => actor.dispose());
      actors.clear();
      disposeSources();
    },
  };
}
