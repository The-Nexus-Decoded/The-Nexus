import * as THREE from "three";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  bindOptionalCompatibleAnimationClip,
  calibrateAnimatedPoseOnFloor,
  measureAnimatedPoseGrounding,
  normalizeAnimationPackRootMotion,
} from "../animationPacks";
import { HUMAN_FOUNDATION_APPROVED_ANIMATIONS } from "../humanFoundationApprovedAnimations";
import {
  HUMAN_FOUNDATION_RUNTIME_REVIEW_QUEUE,
  resolveHumanFoundationRuntimeReviewQueue,
} from "../humanFoundationRuntimeReviewQueue";
import {
  loadPilotAnimationCatalog,
  PilotAnimationCatalogLoader,
} from "../pilotAnimationCatalog";
import { applyPilotSkinPreset } from "../pilotSkinReview";
import { createHumanFacialReview } from "../humanFacialReview";
import type { PilotAnimationReviewBridge } from "../../pilotAnimationReview";

const PILOT_MODEL_URL = "/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb";
const PILOT_HEIGHT_METERS = 2.06;
const FLOOR_TOLERANCE_METERS = 0.01;
const GROUND_CALIBRATION_CLIP = "MaleLocomotion__Idle";
const MAX_RESIDENT_RAW_ASSETS = 2;
const MAX_RESIDENT_BOUND_CLIPS = 2;

interface RootContract {
  rootNodeName: string;
  sourceRootBaselineY: number;
  targetRootRestY: number;
  normalizedRootStartY: number;
}

interface PreparedClip {
  clip: THREE.AnimationClip;
  rootContract: RootContract;
}

export interface BreachV2AnimationPilot {
  root: THREE.Group;
  update(deltaSeconds: number): void;
  dispose(): void;
}

export interface BreachV2AnimationPilotOptions {
  /** Accepted actor asset handoff; defaults to the currently accepted body. */
  acceptedActorUrl?: string;
}

export async function createBreachV2AnimationPilot(
  loader: GLTFLoader,
  options: BreachV2AnimationPilotOptions = {},
): Promise<BreachV2AnimationPilot> {
  const [body, catalog] = await Promise.all([
    loader.loadAsync(options.acceptedActorUrl ?? PILOT_MODEL_URL),
    loadPilotAnimationCatalog(),
  ]);
  const catalogLoader = new PilotAnimationCatalogLoader(catalog, loader, MAX_RESIDENT_RAW_ASSETS);

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
  const facialReview = createHumanFacialReview(model);

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
  const approvedSpecs = new Map(HUMAN_FOUNDATION_APPROVED_ANIMATIONS.map((spec) => [spec.semanticClipName, spec]));
  const runtimeReviewSpecs = new Map<string, (typeof HUMAN_FOUNDATION_RUNTIME_REVIEW_QUEUE)[number]>(
    HUMAN_FOUNDATION_RUNTIME_REVIEW_QUEUE.map((spec) => [spec.clipName, spec] as const),
  );
  const allowsAirborneClearance = (name: string): boolean => (
    runtimeReviewSpecs.get(name)?.allowsAirborneClearance
      ?? /jump|fall|airborne|climb|vault|dive|leap|hop|swim/i.test(name)
  );
  const approvedGroundedRootPositions = new Map<string, THREE.Vector3>();
  for (const spec of HUMAN_FOUNDATION_APPROVED_ANIMATIONS) {
    const referenceSource = await catalogLoader.loadClip(spec.groundedReferenceClipName);
    const reference = bindOptionalCompatibleAnimationClip(referenceSource, model, referenceSource.name);
    const referenceTrack = reference?.tracks.find((track) => (
      track.name === `${spec.rootNodeName}.position` && track.getValueSize() >= 3
    ));
    if (!referenceTrack) {
      throw new Error(`Grounded reference ${spec.groundedReferenceClipName} has no ${spec.rootNodeName}.position track.`);
    }
    approvedGroundedRootPositions.set(spec.semanticClipName, new THREE.Vector3(
      referenceTrack.values[0] ?? 0,
      referenceTrack.values[1] ?? 0,
      referenceTrack.values[2] ?? 0,
    ));
  }

  const boundClips = new Map<string, THREE.AnimationClip>();
  const rootContracts = new Map<string, RootContract>();
  const touchBoundClip = (name: string, clip: THREE.AnimationClip, contract: RootContract): void => {
    boundClips.delete(name);
    rootContracts.delete(name);
    boundClips.set(name, clip);
    rootContracts.set(name, contract);
  };
  const retainBoundClip = (name: string, prepared: PreparedClip): void => {
    touchBoundClip(name, prepared.clip, prepared.rootContract);
    while (boundClips.size > MAX_RESIDENT_BOUND_CLIPS) {
      const oldestName = boundClips.keys().next().value as string | undefined;
      if (!oldestName) break;
      const evicted = boundClips.get(oldestName);
      boundClips.delete(oldestName);
      rootContracts.delete(oldestName);
      if (evicted) mixer.uncacheClip(evicted);
    }
  };
  const prepareClip = async (name: string): Promise<PreparedClip> => {
    const cached = boundClips.get(name);
    const cachedContract = rootContracts.get(name);
    if (cached && cachedContract) {
      touchBoundClip(name, cached, cachedContract);
      return { clip: cached, rootContract: cachedContract };
    }
    const source = await catalogLoader.loadClip(name);
    const bound = bindOptionalCompatibleAnimationClip(source, model, source.name);
    if (!bound) throw new Error(`Issue #487 pilot clip ${name} is incompatible with the accepted body rig.`);
    const approvedSpec = approvedSpecs.get(name);
    const boundRoot = approvedSpec?.rootNodeName ?? bound.tracks
      .map((track) => track.name.slice(0, track.name.lastIndexOf(".")))
      .find((node) => /armature$/i.test(node)) ?? "HumanFoundation_Armature";
    const targetRestPosition = approvedSpec
      ? approvedGroundedRootPositions.get(name)
      : armatureRestPositions.get(boundRoot);
    if (!targetRestPosition) {
      throw new Error(`Issue #487 pilot armature ${boundRoot} has no captured rest transform.`);
    }
    const sourceRootTrack = bound.tracks.find((track) => (
      track.name === `${boundRoot}.position` && track.getValueSize() >= 3
    ));
    const airborneClip = allowsAirborneClearance(name);
    const preserveAuthoredRoot = approvedSpec?.rootPolicy === "authored"
      || runtimeReviewSpecs.get(name)?.preserveAuthoredTravel === true;
    const normalized = normalizeAnimationPackRootMotion(
      bound,
      boundRoot,
      targetRestPosition,
      airborneClip || preserveAuthoredRoot ? "preserve" : "lock-to-rest",
    );
    const normalizedRootTrack = normalized.tracks.find((track) => (
      track.name === `${boundRoot}.position` && track.getValueSize() >= 3
    ));
    return {
      clip: normalized,
      rootContract: {
        rootNodeName: boundRoot,
        sourceRootBaselineY: sourceRootTrack?.values[1] ?? targetRestPosition.y,
        targetRootRestY: targetRestPosition.y,
        normalizedRootStartY: normalizedRootTrack?.values[1] ?? targetRestPosition.y,
      },
    };
  };

  const queuedReviewNames = resolveHumanFoundationRuntimeReviewQueue(catalog);
  const queuedReviewSet = new Set(queuedReviewNames);
  const reviewNames = [
    ...queuedReviewNames,
    ...catalogLoader.reviewAnimations().filter((name) => !queuedReviewSet.has(name)),
  ];
  const calibrationClipName = reviewNames.find(
    (name) => name.toLowerCase() === GROUND_CALIBRATION_CLIP.toLowerCase(),
  );
  if (!calibrationClipName) {
    throw new Error(`Issue #487 pilot is missing grounded calibration clip ${GROUND_CALIBRATION_CLIP}.`);
  }
  const calibrationPrepared = await prepareClip(calibrationClipName);
  retainBoundClip(calibrationClipName, calibrationPrepared);
  const calibrationAction = mixer.clipAction(calibrationPrepared.clip);
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
  let currentReviewName = "";
  let selectionRequest = 0;
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
    const airborneClip = allowsAirborneClearance(currentClip);
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

  const beginAction = async (
    name: string,
    loop: boolean,
  ): Promise<{ action: THREE.AnimationAction; clip: THREE.AnimationClip } | null> => {
    const request = ++selectionRequest;
    const prepared = await prepareClip(name);
    if (request !== selectionRequest) return null;
    mixer.stopAllAction();
    currentAction = null;
    retainBoundClip(name, prepared);
    currentAction = mixer.clipAction(prepared.clip);
    currentAction.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
    currentAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Number.POSITIVE_INFINITY : 1);
    currentAction.clampWhenFinished = true;
    currentAction.play();
    mixer.update(0);
    currentClip = name;
    reconcileGrounding();
    return { action: currentAction, clip: prepared.clip };
  };

  const allReviewNames = [...reviewNames, ...facialReview.entries()];
  const playBodyReview = async (name: string, loop: boolean): Promise<number> => {
    facialReview.reset();
    const selected = await beginAction(name, loop);
    if (!selected) return 0;
    currentReviewName = name;
    return selected.clip.duration;
  };
  const playFacialReview = async (name: string, loop: boolean): Promise<number> => {
    const selected = await beginAction(calibrationClipName, true);
    if (!selected) return 0;
    const duration = facialReview.play(name, loop);
    currentReviewName = name;
    return duration;
  };
  const poseBodyReview = async (name: string, normalizedTime: number): Promise<void> => {
    facialReview.reset();
    const selected = await beginAction(name, false);
    if (!selected) return;
    selected.action.paused = true;
    selected.action.time = THREE.MathUtils.clamp(normalizedTime, 0, 1) * selected.clip.duration;
    mixer.update(0);
    currentReviewName = name;
    reconcileGrounding();
  };
  const poseFacialReview = async (name: string, normalizedTime: number): Promise<void> => {
    const selected = await beginAction(calibrationClipName, true);
    if (!selected) return;
    facialReview.pose(name, normalizedTime);
    currentReviewName = name;
    reconcileGrounding();
  };

  const bridge: PilotAnimationReviewBridge = {
    reviewAnimations: () => allReviewNames,
    reviewAncestry: () => "human",
    playReview: (name, loop) => facialReview.isEntry(name)
      ? playFacialReview(name, loop)
      : playBodyReview(name, loop),
    pauseReview: (paused) => {
      if (currentAction) currentAction.paused = paused;
      facialReview.pause(paused);
    },
    pose: (name, normalizedTime) => facialReview.isEntry(name)
      ? poseFacialReview(name, normalizedTime)
      : poseBodyReview(name, normalizedTime),
    reviewResidency: () => {
      const raw = catalogLoader.residency();
      return {
        residentAssetIds: raw.residentAssetIds,
        residentPackIds: raw.residentPackIds,
        residentRawClipCount: raw.residentClipCount,
        residentBoundClipNames: [...boundClips.keys()],
        pendingAssetIds: raw.pendingAssetIds,
      };
    },
    setReviewSkin: (preset) => applyPilotSkinPreset(model, preset, "human"),
    snapshot: () => {
      const facialSnapshot = facialReview.snapshot();
      const facialActive = facialReview.isEntry(currentReviewName);
      return {
        playerAnimation: currentReviewName || currentClip,
        playerAnimationTime: facialActive ? facialSnapshot.timeSeconds : currentAction?.time ?? 0,
        playerAnimationDuration: facialActive
          ? facialSnapshot.durationSeconds
          : currentAction?.getClip().duration ?? 0,
        grounding: { ...currentGrounding },
      };
    },
  };
  window.__SOULDRIFTER_PILOT_REVIEW__ = bridge;

  const defaultClip = reviewNames.find((name) => name.toLowerCase() === "malelocomotion__idle")
    ?? reviewNames[0];
  if (defaultClip) await bridge.playReview(defaultClip, true);

  return {
    root,
    update: (deltaSeconds) => {
      mixer.update(deltaSeconds);
      facialReview.update(deltaSeconds);
      reconcileGrounding();
    },
    dispose: () => {
      selectionRequest += 1;
      mixer.stopAllAction();
      boundClips.forEach((clip) => mixer.uncacheClip(clip));
      boundClips.clear();
      rootContracts.clear();
      catalogLoader.clear();
      facialReview.dispose();
      root.removeFromParent();
      if (window.__SOULDRIFTER_PILOT_REVIEW__ === bridge) delete window.__SOULDRIFTER_PILOT_REVIEW__;
    },
  };
}
