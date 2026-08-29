import * as THREE from "three";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  bindOptionalCompatibleAnimationClip,
  calibrateAnimatedPoseOnFloor,
  measureAnimatedPoseGrounding,
  normalizeAnimationPackRootMotion,
} from "../animationPacks";
import { applyPilotSkinPreset } from "../pilotSkinReview";
import type { PilotAnimationReviewBridge } from "../../pilotAnimationReview";

const PILOT_MODEL_URL = "/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb";
const PILOT_LIBRARY_URL = "/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb";
const PILOT_HEIGHT_METERS = 2.06;
const PILOT_CLIP_COUNT = 400;
const FLOOR_TOLERANCE_METERS = 0.01;
const GROUND_CALIBRATION_CLIP = "MaleLocomotion__Idle";

export interface BreachV2AnimationPilot {
  root: THREE.Group;
  update(deltaSeconds: number): void;
  dispose(): void;
}

export async function createBreachV2AnimationPilot(loader: GLTFLoader): Promise<BreachV2AnimationPilot> {
  const [body, library] = await Promise.all([
    loader.loadAsync(PILOT_MODEL_URL),
    loader.loadAsync(PILOT_LIBRARY_URL),
  ]);
  if (library.animations.length !== PILOT_CLIP_COUNT) {
    throw new Error(`Issue #487 pilot library expected ${PILOT_CLIP_COUNT} clips, got ${library.animations.length}.`);
  }

  const model = body.scene;
  model.name = "issue-487-human-pilot-model";
  model.updateMatrixWorld(true);
  const sourceBounds = new THREE.Box3().setFromObject(model);
  const sourceHeight = Math.max(0.01, sourceBounds.max.y - sourceBounds.min.y);
  model.scale.setScalar(PILOT_HEIGHT_METERS / sourceHeight);
  model.updateMatrixWorld(true);
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });

  const root = new THREE.Group();
  root.name = "issue-487-human-animation-pilot";
  root.userData.spatialAuditExcluded = "runtime-player-avatar";
  const groundingPivot = new THREE.Group();
  groundingPivot.name = "issue-487-human-pilot-grounding-pivot";
  groundingPivot.add(model);
  root.add(groundingPivot);

  const mixer = new THREE.AnimationMixer(model);
  const uncalibratedPivotY = groundingPivot.position.y;
  const armatureRestPositions = new Map<string, THREE.Vector3>();
  model.traverse((node) => {
    if (/armature$/i.test(node.name)) armatureRestPositions.set(node.name, node.position.clone());
  });
  const sources = new Map(library.animations.map((clip) => [clip.name, clip]));
  const boundClips = new Map<string, THREE.AnimationClip>();
  const rootContracts = new Map<string, {
    rootNodeName: string;
    sourceRootBaselineY: number;
    targetRootRestY: number;
    normalizedRootStartY: number;
  }>();
  const resolveClip = (name: string): THREE.AnimationClip => {
    const cached = boundClips.get(name);
    if (cached) return cached;
    const source = sources.get(name);
    if (!source) throw new Error(`Unknown issue #487 pilot animation: ${name}`);
    const bound = bindOptionalCompatibleAnimationClip(source, model, source.name);
    if (!bound) throw new Error(`Issue #487 pilot clip ${name} is incompatible with the accepted body rig.`);
    const boundRoot = bound.tracks
      .map((track) => track.name.slice(0, track.name.lastIndexOf(".")))
      .find((node) => /armature$/i.test(node)) ?? "HumanFoundation_Armature";
    const targetRestPosition = armatureRestPositions.get(boundRoot);
    if (!targetRestPosition) {
      throw new Error(`Issue #487 pilot armature ${boundRoot} has no captured rest transform.`);
    }
    const sourceRootTrack = bound.tracks.find((track) => (
      track.name === `${boundRoot}.position` && track.getValueSize() >= 3
    ));
    const airborneClip = /jump|fall|airborne|climb|vault|dive|leap|hop|swim/i.test(name);
    const normalized = normalizeAnimationPackRootMotion(
      bound,
      boundRoot,
      targetRestPosition,
      airborneClip ? "preserve" : "lock-to-rest",
    );
    const normalizedRootTrack = normalized.tracks.find((track) => (
      track.name === `${boundRoot}.position` && track.getValueSize() >= 3
    ));
    rootContracts.set(name, {
      rootNodeName: boundRoot,
      sourceRootBaselineY: sourceRootTrack?.values[1] ?? targetRestPosition.y,
      targetRootRestY: targetRestPosition.y,
      normalizedRootStartY: normalizedRootTrack?.values[1] ?? targetRestPosition.y,
    });
    boundClips.set(name, normalized);
    return normalized;
  };

  // Raw GLB bind pose is not a grounded animation pose on this model. Seat the
  // parent from an explicit canonical contact clip at frame zero, then freeze
  // that one correction through every later clip and playback frame.
  const calibrationClipName = [...sources.keys()].find(
    (name) => name.toLowerCase() === GROUND_CALIBRATION_CLIP.toLowerCase(),
  );
  if (!calibrationClipName) {
    throw new Error(`Issue #487 pilot is missing grounded calibration clip ${GROUND_CALIBRATION_CLIP}.`);
  }
  const calibrationAction = mixer.clipAction(resolveClip(calibrationClipName));
  calibrationAction.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
  mixer.update(0);
  const groundCalibration = calibrateAnimatedPoseOnFloor(
    root,
    model,
    groundingPivot,
    uncalibratedPivotY,
  );
  const groundedPivotY = groundCalibration.appliedPivotY;
  mixer.stopAllAction();

  let currentAction: THREE.AnimationAction | null = null;
  let currentClip = "";
  let currentGrounding = {
    floorWorldY: groundCalibration.floorWorldY,
    lowerBoundWorldY: groundCalibration.lowerBoundWorldY,
    clearanceMeters: groundCalibration.clearanceMeters,
    floorCorrectionMeters: groundCalibration.floorCorrectionMeters,
    baseGroundingOffsetMeters: groundCalibration.basePivotY,
    appliedGroundingOffsetMeters: groundedPivotY,
    penetrationLiftMeters: groundCalibration.penetrationLiftMeters,
    pivotResponseMetersPerMeter: groundCalibration.pivotResponseMetersPerMeter,
    toleranceMeters: FLOOR_TOLERANCE_METERS,
    sourceRootBaselineY: 0,
    targetRootRestY: 0,
    normalizedRootStartY: 0,
    currentRootY: 0,
    authoredRootDeltaY: 0,
    airborneClearanceAllowed: false,
    pass: Math.abs(groundCalibration.clearanceMeters) <= FLOOR_TOLERANCE_METERS,
  };

  const reconcileGrounding = (): void => {
    const contract = rootContracts.get(currentClip);
    const currentRootY = contract
      ? model.getObjectByName(contract.rootNodeName)?.position.y ?? contract.targetRootRestY
      : 0;
    const authoredRootDeltaY = currentRootY - (contract?.targetRootRestY ?? currentRootY);
    const airborneClip = /jump|fall|airborne|climb|vault|dive|leap|hop|swim/i.test(currentClip);
    const measurement = measureAnimatedPoseGrounding(root, model);
    const airborneClearanceAllowed = airborneClip && (
      authoredRootDeltaY > FLOOR_TOLERANCE_METERS
      || measurement.clearanceMeters > FLOOR_TOLERANCE_METERS
    );
    currentGrounding = {
      floorWorldY: measurement.floorWorldY,
      lowerBoundWorldY: measurement.lowerBoundWorldY,
      clearanceMeters: measurement.clearanceMeters,
      floorCorrectionMeters: groundCalibration.floorCorrectionMeters,
      baseGroundingOffsetMeters: groundCalibration.basePivotY,
      appliedGroundingOffsetMeters: groundedPivotY,
      penetrationLiftMeters: groundCalibration.penetrationLiftMeters,
      pivotResponseMetersPerMeter: groundCalibration.pivotResponseMetersPerMeter,
      toleranceMeters: FLOOR_TOLERANCE_METERS,
      sourceRootBaselineY: contract?.sourceRootBaselineY ?? 0,
      targetRootRestY: contract?.targetRootRestY ?? 0,
      normalizedRootStartY: contract?.normalizedRootStartY ?? 0,
      currentRootY,
      authoredRootDeltaY,
      airborneClearanceAllowed,
      pass: airborneClip
        ? measurement.clearanceMeters >= -FLOOR_TOLERANCE_METERS
        : Math.abs(measurement.clearanceMeters) <= FLOOR_TOLERANCE_METERS,
    };
  };

  const beginAction = (name: string, loop: boolean): { action: THREE.AnimationAction; clip: THREE.AnimationClip } => {
    const clip = resolveClip(name);
    mixer.stopAllAction();
    currentAction = mixer.clipAction(clip);
    currentAction.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
    currentAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Number.POSITIVE_INFINITY : 1);
    currentAction.clampWhenFinished = true;
    currentAction.play();
    mixer.update(0);
    currentClip = name;
    reconcileGrounding();
    return { action: currentAction, clip };
  };

  const play = (name: string, loop: boolean): number => {
    const { clip } = beginAction(name, loop);
    return clip.duration;
  };

  const bridge: PilotAnimationReviewBridge = {
    reviewAnimations: () => [...sources.keys()].sort(),
    reviewAncestry: () => "human",
    playReview: play,
    pauseReview: (paused) => {
      if (currentAction) currentAction.paused = paused;
    },
    pose: (name, normalizedTime) => {
      const { action, clip } = beginAction(name, false);
      action.paused = true;
      action.time = THREE.MathUtils.clamp(normalizedTime, 0, 1) * clip.duration;
      mixer.update(0);
      reconcileGrounding();
    },
    setReviewSkin: (preset) => applyPilotSkinPreset(model, preset, "human"),
    snapshot: () => ({
      playerAnimation: currentClip,
      playerAnimationTime: currentAction?.time ?? 0,
      playerAnimationDuration: currentAction?.getClip().duration ?? 0,
      grounding: { ...currentGrounding },
    }),
  };
  window.__SOULDRIFTER_PILOT_REVIEW__ = bridge;

  const defaultClip = [...sources.keys()].find((name) => name.toLowerCase() === "malelocomotion__idle")
    ?? [...sources.keys()][0];
  if (defaultClip) play(defaultClip, true);

  return {
    root,
    update: (deltaSeconds) => {
      mixer.update(deltaSeconds);
      reconcileGrounding();
    },
    dispose: () => {
      mixer.stopAllAction();
      root.removeFromParent();
      if (window.__SOULDRIFTER_PILOT_REVIEW__ === bridge) delete window.__SOULDRIFTER_PILOT_REVIEW__;
    },
  };
}
