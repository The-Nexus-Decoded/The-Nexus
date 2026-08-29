import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const REQUIRED_TECHNICAL_CHECKS = [
  "freshImport",
  "canonicalSkeleton",
  "rootMotion",
  "grounding",
  "contacts",
  "duration",
  "semantic",
];

export const REQUIRED_VISUAL_CHECKS = [
  "windUp",
  "semanticReadability",
  "fullBodyMechanics",
  "balanceWeightTransfer",
  "feetKneesHipsPelvis",
  "spineShouldersElbowsHands",
  "propSurfaceContacts",
  "cadence",
  "followThroughRecovery",
  "groundingRootMotion",
  "gameplayCamera",
];

export const ONE_SHOT_BOUNDARY_POSE_CONTRACT = Object.freeze({
  method: "FRAMEWISE_BONE_QUATERNION_RMS_PLUS_ARMS_WIDE_SCORE",
  minimumSampledUpperBodyBoneCount: 8,
  maximumDeclaredPoseRmsErrorDegrees: 5,
  minimumBindPoseRmsSeparationDegrees: 12,
  maximumArmsWideScore: 0.35,
});

export const HARVEST_INTERACTION_CONTRACTS = Object.freeze({
  "interaction.harvest.tree": Object.freeze({
    actionVariant: "TREE_HARVEST",
    requiredMotionBeats: Object.freeze([
      "GROUND_BUCKET_READY",
      "UPWARD_FRUIT_PICK",
      "FRUIT_TRANSFER",
      "BUCKET_DEPOSIT",
    ]),
  }),
  "interaction.harvest.plant": Object.freeze({
    actionVariant: "PLANT_HARVEST",
    requiredMotionBeats: Object.freeze([
      "GROUND_BUCKET_READY",
      "LOW_BEND_HINGE_PLANT_PICK",
      "RISE_AND_TRANSFER",
      "BUCKET_DEPOSIT",
    ]),
  }),
});

export const VALVE_INTERACTION_CONTRACT = Object.freeze({
  semanticId: "interaction.valve",
  actionVariant: "MOUNTED_VALVE_TWO_HAND_TURN",
  minimumSignedActorPlaneDistanceMeters: 0.25,
  maximumSignedActorPlaneDistanceMeters: 1.1,
  minimumActorForwardTowardValveDot: 0.9,
  maximumLateralOffsetFromValveCenterMeters: 0.15,
  minimumLeftRightSideSeparationMeters: 0.08,
  minimumInterHandClearanceMeters: 0.05,
  minimumDurationSeconds: 2,
  maximumSingleHandRegripGapFrames: 6,
});

export const ORGANIC_AUTHORING_WORKFLOW_CONTRACT = Object.freeze({
  sourceRestRigUse: "REST_RIG_AUTHORITY_ONLY",
  blockingInterpolation: "CONSTANT",
  authoringRoute: "BLENDER_DENSE_FULL_FRAME",
  polishMethods: Object.freeze([
    "BLENDER_GRAPH_EDITOR",
    "PROGRAMMATIC_FCURVE_POLISH",
    "PURPOSEFUL_MIX",
  ]),
  minimumReviewWidth: 960,
  minimumReviewHeight: 720,
  cascadeurStatus: "DEFERRED_NOT_USED",
});

const SHA256_PATTERN = /^[A-F0-9]{64}$/;
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const repositoryRoot = resolve(projectRoot, "../../../..");
const shippingAssetRoot = resolve(projectRoot, "public/assets");

function normalizedSha(value) {
  return typeof value === "string" ? value.toUpperCase() : "";
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex").toUpperCase();
}

function resolveEvidencePath(value, receiptPath) {
  if (typeof value !== "string" || value.length === 0) return null;
  if (isAbsolute(value)) return resolve(value);
  return resolve(receiptPath ? resolve(receiptPath, "..") : projectRoot, value);
}

function resolveProjectPath(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  if (isAbsolute(value)) return resolve(value);
  const repositoryRelative = resolve(repositoryRoot, value);
  if (existsSync(repositoryRelative)) return repositoryRelative;
  return resolve(projectRoot, value);
}

function isShippingAssetPath(value) {
  if (typeof value !== "string") return false;
  return value.replaceAll("\\", "/").toLowerCase().includes("public/assets/");
}

function isWithin(root, value) {
  if (!value) return false;
  const relativePath = relative(root, resolve(value));
  return relativePath.length > 0 && !relativePath.startsWith("..") && !isAbsolute(relativePath);
}

function requireString(errors, value, path) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} must be a non-empty string`);
  }
}

function requireFiniteNumber(errors, value, path) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${path} must be a finite number`);
    return null;
  }
  return value;
}

function validatePolishNotes(errors, notes, path, required) {
  if (!Array.isArray(notes) || notes.some((note) => typeof note !== "string" || note.trim().length === 0)) {
    errors.push(`${path} must be an array of non-empty strings`);
    return;
  }
  if (required && notes.length === 0) errors.push(`${path} must describe every accepted minor deviation`);
  if (!required && notes.length !== 0) errors.push(`${path} must be empty unless status is PROVISIONAL_PILOT`);
}

function validateOneShotBoundaryPose(errors, candidate, technical) {
  if (!candidate || typeof candidate !== "object") return;
  if (!["ONE_SHOT", "LOOP"].includes(candidate.playIntent)) {
    errors.push("candidate.playIntent must equal ONE_SHOT or LOOP");
    return;
  }
  if (candidate.playIntent !== "ONE_SHOT") return;

  const path = "technicalReview.evidence.boundaryPose";
  const boundary = technical?.evidence?.boundaryPose;
  if (!boundary || typeof boundary !== "object") {
    errors.push(`${path} must be an object for ONE_SHOT candidates`);
    return;
  }

  if (boundary.method !== ONE_SHOT_BOUNDARY_POSE_CONTRACT.method) {
    errors.push(`${path}.method must equal ${ONE_SHOT_BOUNDARY_POSE_CONTRACT.method}`);
  }
  if (boundary.naturalGameplayStanceRequired !== true) {
    errors.push(`${path}.naturalGameplayStanceRequired must equal true`);
  }
  for (const key of ["declaredStartPose", "declaredEndPose"]) {
    requireString(errors, boundary[key], `${path}.${key}`);
    if (typeof boundary[key] === "string" && /(?:^|[ _-])(?:T[ _-]?POSE|BIND[ _-]?POSE)(?:$|[ _-])/i.test(boundary[key])) {
      errors.push(`${path}.${key} must name a natural gameplay stance, not a bind or T-pose`);
    }
  }
  if (!Number.isInteger(boundary.startFrame) || boundary.startFrame < 0) {
    errors.push(`${path}.startFrame must be a non-negative integer`);
  }
  if (!Number.isInteger(boundary.endFrame) || boundary.endFrame <= boundary.startFrame) {
    errors.push(`${path}.endFrame must be an integer greater than startFrame`);
  }
  for (const key of [
    "sourceBindPoseSampleSha256",
    "declaredStartPoseSampleSha256",
    "declaredEndPoseSampleSha256",
    "startPoseSampleSha256",
    "endPoseSampleSha256",
  ]) {
    if (!SHA256_PATTERN.test(normalizedSha(boundary[key]))) {
      errors.push(`${path}.${key} must be a 64-character SHA-256`);
    }
  }
  if (!Number.isInteger(boundary.sampledUpperBodyBoneCount)
    || boundary.sampledUpperBodyBoneCount < ONE_SHOT_BOUNDARY_POSE_CONTRACT.minimumSampledUpperBodyBoneCount) {
    errors.push(
      `${path}.sampledUpperBodyBoneCount must be at least ${ONE_SHOT_BOUNDARY_POSE_CONTRACT.minimumSampledUpperBodyBoneCount}`,
    );
  }

  const maximumDeclaredError = requireFiniteNumber(
    errors,
    boundary.maximumDeclaredPoseRmsErrorDegrees,
    `${path}.maximumDeclaredPoseRmsErrorDegrees`,
  );
  if (maximumDeclaredError !== null
    && (maximumDeclaredError <= 0
      || maximumDeclaredError > ONE_SHOT_BOUNDARY_POSE_CONTRACT.maximumDeclaredPoseRmsErrorDegrees)) {
    errors.push(
      `${path}.maximumDeclaredPoseRmsErrorDegrees must be greater than 0 and at most ${ONE_SHOT_BOUNDARY_POSE_CONTRACT.maximumDeclaredPoseRmsErrorDegrees}`,
    );
  }
  for (const key of [
    "startPoseRmsAngularErrorToDeclaredDegrees",
    "endPoseRmsAngularErrorToDeclaredDegrees",
  ]) {
    const value = requireFiniteNumber(errors, boundary[key], `${path}.${key}`);
    if (value !== null && (value < 0 || maximumDeclaredError === null || value > maximumDeclaredError)) {
      errors.push(`${path}.${key} must be between 0 and maximumDeclaredPoseRmsErrorDegrees`);
    }
  }

  const minimumBindSeparation = requireFiniteNumber(
    errors,
    boundary.minimumBindPoseRmsSeparationDegrees,
    `${path}.minimumBindPoseRmsSeparationDegrees`,
  );
  if (minimumBindSeparation !== null
    && minimumBindSeparation < ONE_SHOT_BOUNDARY_POSE_CONTRACT.minimumBindPoseRmsSeparationDegrees) {
    errors.push(
      `${path}.minimumBindPoseRmsSeparationDegrees must be at least ${ONE_SHOT_BOUNDARY_POSE_CONTRACT.minimumBindPoseRmsSeparationDegrees}`,
    );
  }
  for (const key of [
    "startPoseRmsAngularDistanceFromBindDegrees",
    "endPoseRmsAngularDistanceFromBindDegrees",
  ]) {
    const value = requireFiniteNumber(errors, boundary[key], `${path}.${key}`);
    if (value !== null && (minimumBindSeparation === null || value < minimumBindSeparation)) {
      errors.push(`${path}.${key} must be at least minimumBindPoseRmsSeparationDegrees`);
    }
  }

  const maximumArmsWideScore = requireFiniteNumber(
    errors,
    boundary.maximumArmsWideScore,
    `${path}.maximumArmsWideScore`,
  );
  if (maximumArmsWideScore !== null
    && (maximumArmsWideScore < 0 || maximumArmsWideScore > ONE_SHOT_BOUNDARY_POSE_CONTRACT.maximumArmsWideScore)) {
    errors.push(
      `${path}.maximumArmsWideScore must be between 0 and ${ONE_SHOT_BOUNDARY_POSE_CONTRACT.maximumArmsWideScore}`,
    );
  }
  for (const key of ["startArmsWideScore", "endArmsWideScore"]) {
    const value = requireFiniteNumber(errors, boundary[key], `${path}.${key}`);
    if (value !== null && (value < 0 || maximumArmsWideScore === null || value > maximumArmsWideScore)) {
      errors.push(`${path}.${key} must be between 0 and maximumArmsWideScore`);
    }
  }
  if (boundary.bindOrTPoseAtBoundary !== false) {
    errors.push(`${path}.bindOrTPoseAtBoundary must equal false`);
  }
}

function validateHarvestInteractionContext(errors, candidate, technical) {
  if (candidate?.semanticId === "interaction.harvest") {
    errors.push(
      "candidate.semanticId interaction.harvest is retired; use interaction.harvest.tree or interaction.harvest.plant",
    );
    return;
  }
  const contract = HARVEST_INTERACTION_CONTRACTS[candidate?.semanticId];
  if (!contract) return;

  const path = "technicalReview.evidence.interactionContext";
  const context = technical?.evidence?.interactionContext;
  if (!context || typeof context !== "object") {
    errors.push(`${path} must be an object for ${candidate.semanticId}`);
    return;
  }
  if (context.actionVariant !== contract.actionVariant) {
    errors.push(`${path}.actionVariant must equal ${contract.actionVariant}`);
  }
  if (!Array.isArray(context.requiredMotionBeats)
    || context.requiredMotionBeats.length !== contract.requiredMotionBeats.length
    || context.requiredMotionBeats.some((beat, index) => beat !== contract.requiredMotionBeats[index])) {
    errors.push(`${path}.requiredMotionBeats must match the canonical ${contract.actionVariant} beat order`);
  }

  const bucket = context.bucketProp;
  if (!bucket || typeof bucket !== "object") {
    errors.push(`${path}.bucketProp must be an object`);
  } else {
    if (bucket.propId !== "HARVEST_BUCKET") errors.push(`${path}.bucketProp.propId must equal HARVEST_BUCKET`);
    if (bucket.binding !== "RUNTIME_BOUND") errors.push(`${path}.bucketProp.binding must equal RUNTIME_BOUND`);
    if (bucket.placement !== "GROUND_PLACED") errors.push(`${path}.bucketProp.placement must equal GROUND_PLACED`);
    if (bucket.bakedIntoAnimationArtifact !== false) {
      errors.push(`${path}.bucketProp.bakedIntoAnimationArtifact must equal false`);
    }
    if (bucket.floating !== false) errors.push(`${path}.bucketProp.floating must equal false`);
  }
  if (context.fruitBinding !== "RUNTIME_BOUND_ITEM") {
    errors.push(`${path}.fruitBinding must equal RUNTIME_BOUND_ITEM`);
  }
  if (context.fruitBakedIntoAnimationArtifact !== false) {
    errors.push(`${path}.fruitBakedIntoAnimationArtifact must equal false`);
  }
  if (context.previewIncludesGroundedBucket !== true) {
    errors.push(`${path}.previewIncludesGroundedBucket must equal true`);
  }
  for (const key of ["handFruit", "handBucket", "fruitBucket"]) {
    if (context.collisionChecks?.[key] !== "PASS") {
      errors.push(`${path}.collisionChecks.${key} must equal PASS`);
    }
  }
}

function validateValveInteractionContext(errors, candidate, technical) {
  if (candidate?.semanticId !== VALVE_INTERACTION_CONTRACT.semanticId) return;

  const path = "technicalReview.evidence.valveInteraction";
  const context = technical?.evidence?.valveInteraction;
  if (!context || typeof context !== "object") {
    errors.push(`${path} must be an object for ${VALVE_INTERACTION_CONTRACT.semanticId}`);
    return;
  }
  if (context.actionVariant !== VALVE_INTERACTION_CONTRACT.actionVariant) {
    errors.push(`${path}.actionVariant must equal ${VALVE_INTERACTION_CONTRACT.actionVariant}`);
  }

  const prop = context.mountedValveProp;
  if (!prop || typeof prop !== "object") {
    errors.push(`${path}.mountedValveProp must be an object`);
  } else {
    if (prop.propId !== "MOUNTED_VALVE") errors.push(`${path}.mountedValveProp.propId must equal MOUNTED_VALVE`);
    if (prop.binding !== "RUNTIME_BOUND") errors.push(`${path}.mountedValveProp.binding must equal RUNTIME_BOUND`);
    if (prop.reviewProxyIncluded !== true) errors.push(`${path}.mountedValveProp.reviewProxyIncluded must equal true`);
    if (prop.bakedIntoAnimationArtifact !== false) {
      errors.push(`${path}.mountedValveProp.bakedIntoAnimationArtifact must equal false`);
    }
  }

  const placement = context.actorPlacement;
  if (!placement || typeof placement !== "object") {
    errors.push(`${path}.actorPlacement must be an object`);
  } else {
    if (placement.valvePlaneNormalConvention !== "OUTWARD_FROM_MOUNTING_SURFACE") {
      errors.push(`${path}.actorPlacement.valvePlaneNormalConvention must equal OUTWARD_FROM_MOUNTING_SURFACE`);
    }
    const signedDistance = requireFiniteNumber(
      errors,
      placement.signedActorCenterDistanceFromValvePlaneMeters,
      `${path}.actorPlacement.signedActorCenterDistanceFromValvePlaneMeters`,
    );
    if (signedDistance !== null
      && (signedDistance < VALVE_INTERACTION_CONTRACT.minimumSignedActorPlaneDistanceMeters
        || signedDistance > VALVE_INTERACTION_CONTRACT.maximumSignedActorPlaneDistanceMeters)) {
      errors.push(
        `${path}.actorPlacement.signedActorCenterDistanceFromValvePlaneMeters must be positive/front-side and between ${VALVE_INTERACTION_CONTRACT.minimumSignedActorPlaneDistanceMeters} and ${VALVE_INTERACTION_CONTRACT.maximumSignedActorPlaneDistanceMeters}`,
      );
    }
    const facingDot = requireFiniteNumber(
      errors,
      placement.actorForwardTowardValveDot,
      `${path}.actorPlacement.actorForwardTowardValveDot`,
    );
    if (facingDot !== null && facingDot < VALVE_INTERACTION_CONTRACT.minimumActorForwardTowardValveDot) {
      errors.push(
        `${path}.actorPlacement.actorForwardTowardValveDot must be at least ${VALVE_INTERACTION_CONTRACT.minimumActorForwardTowardValveDot}`,
      );
    }
    const lateralOffset = requireFiniteNumber(
      errors,
      placement.lateralOffsetFromValveCenterMeters,
      `${path}.actorPlacement.lateralOffsetFromValveCenterMeters`,
    );
    if (lateralOffset !== null
      && Math.abs(lateralOffset) > VALVE_INTERACTION_CONTRACT.maximumLateralOffsetFromValveCenterMeters) {
      errors.push(
        `${path}.actorPlacement.lateralOffsetFromValveCenterMeters absolute value must be at most ${VALVE_INTERACTION_CONTRACT.maximumLateralOffsetFromValveCenterMeters}`,
      );
    }
    if (placement.squarelyInFrontOfValve !== true) {
      errors.push(`${path}.actorPlacement.squarelyInFrontOfValve must equal true`);
    }
  }

  const hands = context.handMechanics;
  if (!hands || typeof hands !== "object") {
    errors.push(`${path}.handMechanics must be an object`);
  } else {
    if (hands.twoHandsControlAtAllTimesExceptDeclaredRegripFrames !== true) {
      errors.push(`${path}.handMechanics.twoHandsControlAtAllTimesExceptDeclaredRegripFrames must equal true`);
    }
    const minimumLeft = requireFiniteNumber(
      errors,
      hands.minimumLeftHandValveLocalXMeters,
      `${path}.handMechanics.minimumLeftHandValveLocalXMeters`,
    );
    if (minimumLeft !== null && minimumLeft < 0) {
      errors.push(`${path}.handMechanics.minimumLeftHandValveLocalXMeters must be at least 0`);
    }
    const maximumRight = requireFiniteNumber(
      errors,
      hands.maximumRightHandValveLocalXMeters,
      `${path}.handMechanics.maximumRightHandValveLocalXMeters`,
    );
    if (maximumRight !== null && maximumRight > 0) {
      errors.push(`${path}.handMechanics.maximumRightHandValveLocalXMeters must be at most 0`);
    }
    const sideSeparation = requireFiniteNumber(
      errors,
      hands.minimumLeftMinusRightValveLocalXMeters,
      `${path}.handMechanics.minimumLeftMinusRightValveLocalXMeters`,
    );
    if (sideSeparation !== null
      && sideSeparation < VALVE_INTERACTION_CONTRACT.minimumLeftRightSideSeparationMeters) {
      errors.push(
        `${path}.handMechanics.minimumLeftMinusRightValveLocalXMeters must be at least ${VALVE_INTERACTION_CONTRACT.minimumLeftRightSideSeparationMeters}`,
      );
    }
    const clearance = requireFiniteNumber(
      errors,
      hands.minimumInterHandClearanceMeters,
      `${path}.handMechanics.minimumInterHandClearanceMeters`,
    );
    if (clearance !== null && clearance < VALVE_INTERACTION_CONTRACT.minimumInterHandClearanceMeters) {
      errors.push(
        `${path}.handMechanics.minimumInterHandClearanceMeters must be at least ${VALVE_INTERACTION_CONTRACT.minimumInterHandClearanceMeters}`,
      );
    }
    for (const key of ["bodyMidlineCrossingCount", "interArmCrossingCount"]) {
      if (!Number.isInteger(hands[key]) || hands[key] !== 0) {
        errors.push(`${path}.handMechanics.${key} must equal 0`);
      }
    }
    if (hands.handWorkingSideOrderPreserved !== true) {
      errors.push(`${path}.handMechanics.handWorkingSideOrderPreserved must equal true`);
    }
    if (!Array.isArray(hands.regripFrames) || hands.regripFrames.length === 0
      || hands.regripFrames.some((frame) => !Number.isInteger(frame) || frame < 0)) {
      errors.push(`${path}.handMechanics.regripFrames must contain non-negative integer frame numbers`);
    }
    if (!Array.isArray(hands.crossingFrames) || hands.crossingFrames.length !== 0) {
      errors.push(`${path}.handMechanics.crossingFrames must be an empty array`);
    }
    if (hands.regripBeforePotentialCrossing !== true) {
      errors.push(`${path}.handMechanics.regripBeforePotentialCrossing must equal true`);
    }
    const maximumRegripGap = requireFiniteNumber(
      errors,
      hands.maximumSingleHandRegripGapFrames,
      `${path}.handMechanics.maximumSingleHandRegripGapFrames`,
    );
    if (maximumRegripGap !== null
      && (maximumRegripGap < 0
        || maximumRegripGap > VALVE_INTERACTION_CONTRACT.maximumSingleHandRegripGapFrames)) {
      errors.push(
        `${path}.handMechanics.maximumSingleHandRegripGapFrames must be between 0 and ${VALVE_INTERACTION_CONTRACT.maximumSingleHandRegripGapFrames}`,
      );
    }
  }

  if (context.cadence?.classification !== "SLOW_DELIBERATE") {
    errors.push(`${path}.cadence.classification must equal SLOW_DELIBERATE`);
  }
  const duration = requireFiniteNumber(errors, context.cadence?.durationSeconds, `${path}.cadence.durationSeconds`);
  if (duration !== null && duration < VALVE_INTERACTION_CONTRACT.minimumDurationSeconds) {
    errors.push(`${path}.cadence.durationSeconds must be at least ${VALVE_INTERACTION_CONTRACT.minimumDurationSeconds}`);
  }
  for (const key of ["handValve", "armTorso", "interArm"]) {
    if (context.collisionChecks?.[key] !== "PASS") {
      errors.push(`${path}.collisionChecks.${key} must equal PASS`);
    }
  }
}

function validateHashedFile(errors, descriptor, path, receiptPath, pathResolver = resolveEvidencePath) {
  if (!descriptor || typeof descriptor !== "object") {
    errors.push(`${path} must be an object`);
    return null;
  }
  requireString(errors, descriptor.path, `${path}.path`);
  if (!Number.isInteger(descriptor.bytes) || descriptor.bytes <= 0) {
    errors.push(`${path}.bytes must be a positive integer`);
  }
  const expectedHash = normalizedSha(descriptor.sha256);
  if (!SHA256_PATTERN.test(expectedHash)) {
    errors.push(`${path}.sha256 must be a 64-character SHA-256`);
  }
  const resolvedPath = pathResolver(descriptor.path, receiptPath);
  if (!resolvedPath || !existsSync(resolvedPath)) {
    errors.push(`${path}.path does not exist: ${descriptor.path ?? "<missing>"}`);
    return resolvedPath;
  }
  const bytes = readFileSync(resolvedPath);
  if (descriptor.bytes !== bytes.length) {
    errors.push(`${path}.bytes ${descriptor.bytes} does not match file bytes ${bytes.length}`);
  }
  const actualHash = sha256(bytes);
  if (expectedHash !== actualHash) {
    errors.push(`${path}.sha256 ${expectedHash} does not match file SHA-256 ${actualHash}`);
  }
  return resolvedPath;
}

function probeAndDecodeVideo(errors, normalSpeed, videoPath, path = "playbackEvidence.normalSpeed") {
  if (!videoPath) return;
  const probe = spawnSync(
    "ffprobe",
    [
      "-v", "error",
      "-select_streams", "v:0",
      "-count_frames",
      "-show_entries", "stream=width,height,avg_frame_rate,nb_read_frames:format=duration",
      "-of", "json",
      videoPath,
    ],
    { encoding: "utf8" },
  );
  if (probe.error || probe.status !== 0) {
    errors.push(`${path} could not be probed: ${probe.stderr || probe.error}`);
    return;
  }
  let payload;
  try {
    payload = JSON.parse(probe.stdout);
  } catch {
    errors.push(`${path} ffprobe output was not valid JSON`);
    return;
  }
  const stream = payload.streams?.[0];
  const duration = Number(payload.format?.duration);
  const frameCount = Number(stream?.nb_read_frames);
  const [fpsNumerator, fpsDenominator] = String(stream?.avg_frame_rate ?? "0/1")
    .split("/")
    .map(Number);
  const fps = fpsDenominator ? fpsNumerator / fpsDenominator : 0;
  if (stream?.width !== normalSpeed.width || stream?.height !== normalSpeed.height) {
    errors.push(`${path} dimensions do not match the decoded video`);
  }
  if (frameCount !== normalSpeed.frameCount) {
    errors.push(`${path}.frameCount ${normalSpeed.frameCount} does not match decoded ${frameCount}`);
  }
  if (Math.abs(fps - normalSpeed.fps) > 0.01) {
    errors.push(`${path}.fps ${normalSpeed.fps} does not match decoded ${fps}`);
  }
  if (Math.abs(duration - normalSpeed.durationSeconds) > 0.05) {
    errors.push(`${path}.durationSeconds ${normalSpeed.durationSeconds} does not match decoded ${duration}`);
  }
  const decode = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", videoPath, "-f", "null", "-"],
    { encoding: "utf8" },
  );
  if (decode.error || decode.status !== 0) {
    errors.push(`${path} full decode failed: ${decode.stderr || decode.error}`);
  }
}

function validateReferences(errors, references) {
  if (!Array.isArray(references) || references.length === 0) {
    errors.push("provenance.realPersonReferences must contain at least one reference");
    return;
  }
  references.forEach((reference, index) => {
    const prefix = `provenance.realPersonReferences[${index}]`;
    requireString(errors, reference?.url, `${prefix}.url`);
    requireString(errors, reference?.publisher, `${prefix}.publisher`);
    requireString(errors, reference?.retrievedAt, `${prefix}.retrievedAt`);
    requireString(errors, reference?.timeRange, `${prefix}.timeRange`);
    const mechanics = reference?.mechanics;
    if (!mechanics || typeof mechanics !== "object") {
      errors.push(`${prefix}.mechanics must be an object`);
      return;
    }
    for (const key of [
      "stance",
      "weightTransfer",
      "footwork",
      "hipsShoulders",
      "handsGripContacts",
      "anticipation",
      "cadence",
      "followThroughRecovery",
    ]) {
      requireString(errors, mechanics[key], `${prefix}.mechanics.${key}`);
    }
  });
}

function validateOrganicReviewVideo(errors, descriptor, path, receiptPath, verifyFiles, verifyMedia) {
  let videoPath = null;
  if (verifyFiles) videoPath = validateHashedFile(errors, descriptor, path, receiptPath);
  else if (!descriptor || typeof descriptor !== "object") errors.push(`${path} must be an object`);
  if (!descriptor || typeof descriptor !== "object") return;

  if (!verifyFiles) {
    requireString(errors, descriptor.path, `${path}.path`);
    if (!Number.isInteger(descriptor.bytes) || descriptor.bytes <= 0) {
      errors.push(`${path}.bytes must be a positive integer`);
    }
    if (!SHA256_PATTERN.test(normalizedSha(descriptor.sha256))) {
      errors.push(`${path}.sha256 must be a 64-character SHA-256`);
    }
  }
  if (descriptor.playbackRate !== 1) errors.push(`${path}.playbackRate must equal 1`);
  if (descriptor.width < ORGANIC_AUTHORING_WORKFLOW_CONTRACT.minimumReviewWidth
    || descriptor.height < ORGANIC_AUTHORING_WORKFLOW_CONTRACT.minimumReviewHeight) {
    errors.push(
      `${path} must be at least ${ORGANIC_AUTHORING_WORKFLOW_CONTRACT.minimumReviewWidth}x${ORGANIC_AUTHORING_WORKFLOW_CONTRACT.minimumReviewHeight}`,
    );
  }
  if (descriptor.fps < 24) errors.push(`${path}.fps must be at least 24`);
  if (!Number.isInteger(descriptor.frameCount) || descriptor.frameCount <= 0) {
    errors.push(`${path}.frameCount must be a positive integer`);
  }
  if (!(descriptor.durationSeconds > 0)) errors.push(`${path}.durationSeconds must be positive`);
  if (descriptor.fullMotion !== true) errors.push(`${path}.fullMotion must equal true`);
  if (descriptor.fullDecodePassed !== true) errors.push(`${path}.fullDecodePassed must equal true`);
  if (verifyMedia) probeAndDecodeVideo(errors, descriptor, videoPath, path);
}

function validateOrganicAuthoringWorkflow(
  errors,
  provenance,
  technical,
  artifact,
  receiptPath,
  verifyFiles,
  verifyMedia,
) {
  if (provenance?.route !== "ORIGINAL_TIER_3") return;

  const path = "technicalReview.evidence.organicAuthoringWorkflow";
  const workflow = technical?.evidence?.organicAuthoringWorkflow;
  if (!workflow || typeof workflow !== "object") {
    errors.push(`${path} must be an object for ORIGINAL_TIER_3 candidates`);
    return;
  }
  const provisional = workflow.status === "PROVISIONAL_PILOT";
  if (!provisional && workflow.status !== "PASS") {
    errors.push(`${path}.status must equal PASS or PROVISIONAL_PILOT`);
  }
  if (workflow.sourceRestRigUse !== ORGANIC_AUTHORING_WORKFLOW_CONTRACT.sourceRestRigUse) {
    errors.push(`${path}.sourceRestRigUse must equal ${ORGANIC_AUTHORING_WORKFLOW_CONTRACT.sourceRestRigUse}`);
  }
  if (workflow.sourceRestRigUsedAsMotionSource !== false) {
    errors.push(`${path}.sourceRestRigUsedAsMotionSource must equal false`);
  }
  if (workflow.sparseScriptedPoseSynthesisOnly !== false) {
    errors.push(`${path}.sparseScriptedPoseSynthesisOnly must equal false`);
  }
  if (workflow.realPersonReferenceAnalysis !== "PASS") {
    errors.push(`${path}.realPersonReferenceAnalysis must equal PASS`);
  }

  const stages = [
    ["steppedBlocking", "blockingEvidenceSha256"],
    ["ikContactConstraints", "constraintEvidenceSha256"],
    ["pelvisCenterOfMassReview", "centerOfMassEvidenceSha256"],
    ["motionPathCurveVelocityReview", "motionCurveVelocityEvidenceSha256"],
  ];
  for (const [stageKey, evidenceKey] of stages) {
    const stage = workflow[stageKey];
    if (!stage || typeof stage !== "object") {
      errors.push(`${path}.${stageKey} must be an object`);
      continue;
    }
    if (stage.status !== "PASS") errors.push(`${path}.${stageKey}.status must equal PASS`);
    if (!SHA256_PATTERN.test(normalizedSha(stage[evidenceKey]))) {
      errors.push(`${path}.${stageKey}.${evidenceKey} must be a 64-character SHA-256`);
    }
  }
  const curvePolish = workflow.curvePolish;
  if (!curvePolish || typeof curvePolish !== "object") {
    errors.push(`${path}.curvePolish must be an object`);
  } else {
    if (curvePolish.status !== "PASS" && !(provisional && curvePolish.status === "PROVISIONAL_PILOT")) {
      errors.push(`${path}.curvePolish.status must equal PASS${provisional ? " or PROVISIONAL_PILOT" : ""}`);
    }
    if (!SHA256_PATTERN.test(normalizedSha(curvePolish.curvePolishEvidenceSha256))) {
      errors.push(`${path}.curvePolish.curvePolishEvidenceSha256 must be a 64-character SHA-256`);
    }
  }
  if (workflow.steppedBlocking?.interpolation !== ORGANIC_AUTHORING_WORKFLOW_CONTRACT.blockingInterpolation) {
    errors.push(
      `${path}.steppedBlocking.interpolation must equal ${ORGANIC_AUTHORING_WORKFLOW_CONTRACT.blockingInterpolation}`,
    );
  }
  if (workflow.ikContactConstraints?.handFootPropConstraintsAuthored !== true) {
    errors.push(`${path}.ikContactConstraints.handFootPropConstraintsAuthored must equal true`);
  }
  if (workflow.ikContactConstraints?.denseBodyMechanicsAuthoredEveryFrame !== true) {
    errors.push(`${path}.ikContactConstraints.denseBodyMechanicsAuthoredEveryFrame must equal true`);
  }
  if (workflow.ikContactConstraints?.contactConstraintsEvaluatedEveryFrame !== true) {
    errors.push(`${path}.ikContactConstraints.contactConstraintsEvaluatedEveryFrame must equal true`);
  }
  if (workflow.ikContactConstraints?.bakedSampleStepFrames !== 1) {
    errors.push(`${path}.ikContactConstraints.bakedSampleStepFrames must equal 1`);
  }
  if (!Number.isInteger(workflow.ikContactConstraints?.minorContactDeviationCount)
    || workflow.ikContactConstraints.minorContactDeviationCount < 0) {
    errors.push(`${path}.ikContactConstraints.minorContactDeviationCount must be a non-negative integer`);
  }
  if (workflow.ikContactConstraints?.catastrophicContactFailureCount !== 0) {
    errors.push(`${path}.ikContactConstraints.catastrophicContactFailureCount must equal 0`);
  }
  if (workflow.pelvisCenterOfMassReview?.supportAndWeightTransferReviewed !== true) {
    errors.push(`${path}.pelvisCenterOfMassReview.supportAndWeightTransferReviewed must equal true`);
  }
  if (workflow.motionPathCurveVelocityReview?.pelvisHandsFeetAndPropPathsReviewed !== true) {
    errors.push(`${path}.motionPathCurveVelocityReview.pelvisHandsFeetAndPropPathsReviewed must equal true`);
  }
  if (workflow.motionPathCurveVelocityReview?.linearVelocityContinuityReviewed !== true) {
    errors.push(`${path}.motionPathCurveVelocityReview.linearVelocityContinuityReviewed must equal true`);
  }
  if (workflow.motionPathCurveVelocityReview?.angularVelocityContinuityReviewed !== true) {
    errors.push(`${path}.motionPathCurveVelocityReview.angularVelocityContinuityReviewed must equal true`);
  }
  const velocitySpikes = workflow.motionPathCurveVelocityReview?.unexplainedVelocitySpikeCount;
  if (!Number.isInteger(velocitySpikes) || velocitySpikes < 0) {
    errors.push(`${path}.motionPathCurveVelocityReview.unexplainedVelocitySpikeCount must be a non-negative integer`);
  } else if (velocitySpikes > 0 && !provisional) {
    errors.push(`${path}.motionPathCurveVelocityReview.unexplainedVelocitySpikeCount must equal 0 unless status is PROVISIONAL_PILOT`);
  }
  if (workflow.motionPathCurveVelocityReview?.catastrophicMotionDiscontinuityCount !== 0) {
    errors.push(`${path}.motionPathCurveVelocityReview.catastrophicMotionDiscontinuityCount must equal 0`);
  }
  if (!ORGANIC_AUTHORING_WORKFLOW_CONTRACT.polishMethods.includes(workflow.curvePolish?.polishMethod)) {
    errors.push(
      `${path}.curvePolish.polishMethod must equal ${ORGANIC_AUTHORING_WORKFLOW_CONTRACT.polishMethods.join(", ")}`,
    );
  }
  if (workflow.curvePolish?.curveContinuityAndOvershootReviewed !== true) {
    errors.push(`${path}.curvePolish.curveContinuityAndOvershootReviewed must equal true`);
  }
  if (!Number.isInteger(workflow.curvePolish?.minorCurveDeviationCount)
    || workflow.curvePolish.minorCurveDeviationCount < 0) {
    errors.push(`${path}.curvePolish.minorCurveDeviationCount must be a non-negative integer`);
  }

  const bake = workflow.bakeExport;
  if (!bake || typeof bake !== "object") {
    errors.push(`${path}.bakeExport must be an object`);
  } else {
    if (bake.status !== "PASS") errors.push(`${path}.bakeExport.status must equal PASS`);
    if (bake.constraintsBakedBeforeExport !== true) {
      errors.push(`${path}.bakeExport.constraintsBakedBeforeExport must equal true`);
    }
    if (normalizedSha(bake.exportedArtifactSha256) !== normalizedSha(artifact?.sha256)) {
      errors.push(`${path}.bakeExport.exportedArtifactSha256 must match candidateArtifact.sha256`);
    }
  }

  const selfReview = workflow.normalSpeedSelfReview;
  if (!selfReview || typeof selfReview !== "object") {
    errors.push(`${path}.normalSpeedSelfReview must be an object`);
  } else {
    if (selfReview.status !== "PASS" && !(provisional && selfReview.status === "PROVISIONAL_PILOT")) {
      errors.push(`${path}.normalSpeedSelfReview.status must equal PASS${provisional ? " or PROVISIONAL_PILOT" : ""}`);
    }
    if (selfReview.watchedEntireSideAndThreeQuarter !== true) {
      errors.push(`${path}.normalSpeedSelfReview.watchedEntireSideAndThreeQuarter must equal true`);
    }
    validateOrganicReviewVideo(
      errors,
      selfReview.sideView,
      `${path}.normalSpeedSelfReview.sideView`,
      receiptPath,
      verifyFiles,
      verifyMedia,
    );
    validateOrganicReviewVideo(
      errors,
      selfReview.threeQuarterView,
      `${path}.normalSpeedSelfReview.threeQuarterView`,
      receiptPath,
      verifyFiles,
      verifyMedia,
    );
    if (normalizedSha(selfReview.sideView?.sha256)
      === normalizedSha(selfReview.threeQuarterView?.sha256)) {
      errors.push(`${path}.normalSpeedSelfReview side and three-quarter videos must have different SHA-256 values`);
    }
    if (!Array.isArray(selfReview.blockingFindings) || selfReview.blockingFindings.length !== 0) {
      errors.push(`${path}.normalSpeedSelfReview.blockingFindings must be an empty array`);
    }
  }
  const minorDeviationCount = (workflow.ikContactConstraints?.minorContactDeviationCount ?? 0)
    + (workflow.motionPathCurveVelocityReview?.unexplainedVelocitySpikeCount ?? 0)
    + (workflow.curvePolish?.minorCurveDeviationCount ?? 0);
  if (minorDeviationCount > 0 && !provisional) {
    errors.push(`${path}.status must equal PROVISIONAL_PILOT when minor deviations remain`);
  }
  validatePolishNotes(errors, workflow.polishNotes, `${path}.polishNotes`, provisional);
  if (workflow.technicalMetricsAloneCanPromote !== false) {
    errors.push(`${path}.technicalMetricsAloneCanPromote must equal false`);
  }
  if (workflow.visiblyBadClipRejected !== true) {
    errors.push(`${path}.visiblyBadClipRejected must equal true`);
  }
  if (workflow.authoringRoute !== ORGANIC_AUTHORING_WORKFLOW_CONTRACT.authoringRoute) {
    errors.push(`${path}.authoringRoute must equal ${ORGANIC_AUTHORING_WORKFLOW_CONTRACT.authoringRoute}`);
  }
  if (workflow.cascadeurStatus !== ORGANIC_AUTHORING_WORKFLOW_CONTRACT.cascadeurStatus) {
    errors.push(`${path}.cascadeurStatus must equal ${ORGANIC_AUTHORING_WORKFLOW_CONTRACT.cascadeurStatus}`);
  }
}

export function validateCandidateReceipt(
  receipt,
  { gate = "owner-review", receiptPath = null, verifyFiles = true, verifyMedia = true } = {},
) {
  const errors = [];
  if (!receipt || typeof receipt !== "object") return { errors: ["receipt must be a JSON object"] };
  if (receipt.schemaVersion !== 1) errors.push("schemaVersion must equal 1");
  if (receipt.issue !== 487) errors.push("issue must equal 487");

  const candidate = receipt.candidate;
  if (!candidate || typeof candidate !== "object") {
    errors.push("candidate must be an object");
  } else {
    for (const key of ["id", "semanticId", "clipName", "authorId", "authoringLane"]) {
      requireString(errors, candidate[key], `candidate.${key}`);
    }
    if (!Number.isInteger(candidate.version) || candidate.version < 1) {
      errors.push("candidate.version must be a positive integer");
    }
  }

  const artifact = receipt.candidateArtifact;
  let artifactPath = null;
  if (verifyFiles) artifactPath = validateHashedFile(errors, artifact, "candidateArtifact", receiptPath);
  else if (!artifact || typeof artifact !== "object") errors.push("candidateArtifact must be an object");
  if (artifact?.stagingOnly !== true) errors.push("candidateArtifact.stagingOnly must be true before owner approval");
  if (isShippingAssetPath(artifact?.path) || isShippingAssetPath(artifactPath)) {
    errors.push("candidateArtifact must be staged outside public/assets before owner approval");
  }

  const sourceRig = receipt.sourceRestRig;
  if (!sourceRig || typeof sourceRig !== "object") {
    errors.push("sourceRestRig must be an object");
  } else {
    if (verifyFiles) validateHashedFile(errors, sourceRig, "sourceRestRig", null, resolveProjectPath);
    if (sourceRig.importedActionCount !== 0) errors.push("sourceRestRig.importedActionCount must equal 0");
    if (sourceRig.boneCount !== 65) errors.push("sourceRestRig.boneCount must equal 65");
    if (sourceRig.rootBone !== "mixamorig:Hips") errors.push("sourceRestRig.rootBone must equal mixamorig:Hips");
    if (!SHA256_PATTERN.test(normalizedSha(sourceRig.sha256))) {
      errors.push("sourceRestRig.sha256 must be a 64-character SHA-256");
    }
  }

  const provenance = receipt.provenance;
  if (!provenance || typeof provenance !== "object") {
    errors.push("provenance must be an object");
  } else if (provenance.route === "ORIGINAL_TIER_3") {
    if (provenance.authoredFromZeroActionRestRig !== true) {
      errors.push("provenance.authoredFromZeroActionRestRig must be true for ORIGINAL_TIER_3");
    }
    if (provenance.sourceAnimationsSampled !== false) {
      errors.push("provenance.sourceAnimationsSampled must be false for ORIGINAL_TIER_3");
    }
    if (!Array.isArray(provenance.forbiddenOperationsUsed) || provenance.forbiddenOperationsUsed.length !== 0) {
      errors.push("provenance.forbiddenOperationsUsed must be an empty array");
    }
    validateReferences(errors, provenance.realPersonReferences);
  } else if (provenance?.route === "EXACT_PROVIDER_PRESET") {
    validateReferences(errors, provenance.realPersonReferences);
    for (const key of ["provider", "sourceName", "sourceUrl", "licenseNote"]) {
      requireString(errors, provenance.providerSource?.[key], `provenance.providerSource.${key}`);
    }
    if (!SHA256_PATTERN.test(normalizedSha(provenance.providerSource?.sha256))) {
      errors.push("provenance.providerSource.sha256 must be a 64-character SHA-256");
    }
  } else {
    errors.push("provenance.route must be ORIGINAL_TIER_3 or EXACT_PROVIDER_PRESET");
  }

  const technical = receipt.technicalReview;
  validateOneShotBoundaryPose(errors, candidate, technical);
  validateHarvestInteractionContext(errors, candidate, technical);
  validateValveInteractionContext(errors, candidate, technical);
  validateOrganicAuthoringWorkflow(
    errors,
    provenance,
    technical,
    artifact,
    receiptPath,
    verifyFiles,
    verifyMedia,
  );
  const provisionalAllowed = gate !== "shipping";
  if (gate === "quarantine") {
    if (!["PASS", "REWORK", "PROVISIONAL_PILOT"].includes(technical?.status)) {
      errors.push("technicalReview.status must equal PASS, REWORK, or PROVISIONAL_PILOT at quarantine");
    }
    for (const key of REQUIRED_TECHNICAL_CHECKS) {
      if (!["PASS", "REWORK"].includes(technical?.checks?.[key])) {
        errors.push(`technicalReview.checks.${key} must equal PASS or REWORK at quarantine`);
      }
    }
  } else {
    if (technical?.status !== "PASS" && !(provisionalAllowed && technical?.status === "PROVISIONAL_PILOT")) {
      errors.push(`technicalReview.status must equal PASS${provisionalAllowed ? " or PROVISIONAL_PILOT" : ""}`);
    }
    if (provenance?.route === "ORIGINAL_TIER_3"
      && technical?.evidence?.organicAuthoringWorkflow?.status !== technical?.status) {
      errors.push("technicalReview.evidence.organicAuthoringWorkflow.status must match technicalReview.status");
    }
    for (const key of REQUIRED_TECHNICAL_CHECKS) {
      if (technical?.checks?.[key] !== "PASS") errors.push(`technicalReview.checks.${key} must equal PASS`);
    }
  }

  const normalSpeed = receipt.playbackEvidence?.normalSpeed;
  let videoPath = null;
  if (verifyFiles) videoPath = validateHashedFile(errors, normalSpeed, "playbackEvidence.normalSpeed", receiptPath);
  else if (!normalSpeed || typeof normalSpeed !== "object") errors.push("playbackEvidence.normalSpeed must be an object");
  if (normalSpeed) {
    if (normalSpeed.playbackRate !== 1) errors.push("playbackEvidence.normalSpeed.playbackRate must equal 1");
    if (normalSpeed.width < 720 || normalSpeed.height < 720) {
      errors.push("playbackEvidence.normalSpeed must be at least 720x720");
    }
    if (normalSpeed.fps < 24) errors.push("playbackEvidence.normalSpeed.fps must be at least 24");
    if (!Number.isInteger(normalSpeed.frameCount) || normalSpeed.frameCount <= 0) {
      errors.push("playbackEvidence.normalSpeed.frameCount must be a positive integer");
    }
    if (!(normalSpeed.durationSeconds > 0)) errors.push("playbackEvidence.normalSpeed.durationSeconds must be positive");
    if (normalSpeed.fullDecodePassed !== true) errors.push("playbackEvidence.normalSpeed.fullDecodePassed must be true");
  }
  if (verifyMedia) probeAndDecodeVideo(errors, normalSpeed, videoPath);

  const visual = receipt.independentVisualReview;
  if (visual?.reviewerRole !== "INDEPENDENT_COORDINATOR") {
    errors.push("independentVisualReview.reviewerRole must equal INDEPENDENT_COORDINATOR");
  }
  requireString(errors, visual?.reviewerId, "independentVisualReview.reviewerId");
  if (visual?.reviewerId && visual.reviewerId === candidate?.authorId) {
    errors.push("independentVisualReview.reviewerId must differ from candidate.authorId");
  }
  if (normalizedSha(visual?.playbackSha256) !== normalizedSha(normalSpeed?.sha256)) {
    errors.push("independentVisualReview.playbackSha256 must match playbackEvidence.normalSpeed.sha256");
  }
  if (gate === "quarantine") {
    if (visual?.status !== "REWORK") errors.push("independentVisualReview.status must equal REWORK at quarantine");
    if (visual?.watchedEntireNormalSpeed !== false) {
      errors.push("independentVisualReview.watchedEntireNormalSpeed must remain false at quarantine");
    }
    for (const key of REQUIRED_VISUAL_CHECKS) {
      if (visual?.checklist?.[key] !== "REWORK") {
        errors.push(`independentVisualReview.checklist.${key} must remain REWORK at quarantine`);
      }
    }
    if (!Array.isArray(visual?.blockingFindings) || visual.blockingFindings.length === 0) {
      errors.push("independentVisualReview.blockingFindings must describe the pending review at quarantine");
    }
  } else {
    const visualProvisional = visual?.status === "PROVISIONAL_PILOT";
    if (visual?.status !== "PASS" && !(provisionalAllowed && visualProvisional)) {
      errors.push(`independentVisualReview.status must equal PASS${provisionalAllowed ? " or PROVISIONAL_PILOT" : ""}`);
    }
    if (visual?.watchedEntireNormalSpeed !== true) {
      errors.push("independentVisualReview.watchedEntireNormalSpeed must be true");
    }
    for (const key of REQUIRED_VISUAL_CHECKS) {
      if (visual?.checklist?.[key] !== "PASS") errors.push(`independentVisualReview.checklist.${key} must equal PASS`);
    }
    if (!Array.isArray(visual?.blockingFindings) || visual.blockingFindings.length !== 0) {
      errors.push("independentVisualReview.blockingFindings must be an empty array");
    }
    validatePolishNotes(
      errors,
      visual?.polishNotes,
      "independentVisualReview.polishNotes",
      visualProvisional,
    );
  }

  if (gate === "quarantine") {
    if (receipt.ownerReview?.status !== "NOT_PRESENTED") {
      errors.push("ownerReview.status must equal NOT_PRESENTED at quarantine");
    }
    if (receipt.promotion?.status !== "QUARANTINED") {
      errors.push("promotion.status must equal QUARANTINED");
    }
    if (receipt.promotion?.runtimeInstalled !== false) {
      errors.push("promotion.runtimeInstalled must be false at quarantine");
    }
  } else if (gate === "owner-review") {
    if (receipt.ownerReview?.status !== "NOT_PRESENTED") {
      errors.push("ownerReview.status must equal NOT_PRESENTED before export to owner review");
    }
    if (receipt.promotion?.status !== "OWNER_REVIEW_READY") {
      errors.push("promotion.status must equal OWNER_REVIEW_READY");
    }
    if (receipt.promotion?.runtimeInstalled !== false) {
      errors.push("promotion.runtimeInstalled must be false before owner approval");
    }
  } else if (gate === "runtime-install") {
    if (receipt.ownerReview?.status !== "APPROVED") errors.push("ownerReview.status must equal APPROVED");
    if (normalizedSha(receipt.ownerReview?.selectedCandidateSha256) !== normalizedSha(artifact?.sha256)) {
      errors.push("ownerReview.selectedCandidateSha256 must match candidateArtifact.sha256");
    }
    if (receipt.promotion?.status !== "OWNER_APPROVED") errors.push("promotion.status must equal OWNER_APPROVED");
    if (receipt.promotion?.runtimeInstalled !== false) errors.push("promotion.runtimeInstalled must remain false before installation");
  } else if (gate === "shipping") {
    if (receipt.ownerReview?.status !== "APPROVED") errors.push("ownerReview.status must equal APPROVED");
    if (normalizedSha(receipt.ownerReview?.selectedCandidateSha256) !== normalizedSha(artifact?.sha256)) {
      errors.push("ownerReview.selectedCandidateSha256 must match candidateArtifact.sha256");
    }
    if (receipt.promotion?.status !== "RUNTIME_INSTALLED") errors.push("promotion.status must equal RUNTIME_INSTALLED");
    if (receipt.promotion?.runtimeInstalled !== true) errors.push("promotion.runtimeInstalled must equal true");
    const installed = receipt.promotion?.installedAsset;
    const installedPath = verifyFiles
      ? validateHashedFile(errors, installed, "promotion.installedAsset", receiptPath)
      : resolveEvidencePath(installed?.path, receiptPath);
    if (!isWithin(shippingAssetRoot, installedPath)) {
      errors.push("promotion.installedAsset.path must be inside public/assets");
    }
    if (normalizedSha(installed?.sha256) !== normalizedSha(artifact?.sha256)) {
      errors.push("promotion.installedAsset.sha256 must match candidateArtifact.sha256");
    }
    for (const key of ["typecheck", "tests", "build", "breachV2BrowserSmoke"]) {
      if (receipt.runtimeVerification?.[key] !== "PASS") {
        errors.push(`runtimeVerification.${key} must equal PASS`);
      }
    }
  } else {
    errors.push(`unsupported gate: ${gate}`);
  }

  return { errors };
}

export function validateCandidateReceiptFile(path, options = {}) {
  const receiptPath = resolve(path);
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  return { receipt, ...validateCandidateReceipt(receipt, { ...options, receiptPath }) };
}

function parseCli(argv) {
  const args = { gate: "owner-review", receiptPath: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--gate") args.gate = argv[++index];
    else if (!args.receiptPath) args.receiptPath = argv[index];
    else throw new Error(`Unexpected argument: ${argv[index]}`);
  }
  if (!args.receiptPath) throw new Error("Usage: node validate-human-animation-candidate.mjs [--gate quarantine|owner-review|runtime-install|shipping] <receipt.json>");
  return args;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseCli(process.argv.slice(2));
    const result = validateCandidateReceiptFile(args.receiptPath, { gate: args.gate });
    if (result.errors.length) {
      console.error(JSON.stringify({ status: "REJECTED", gate: args.gate, errors: result.errors }, null, 2));
      process.exitCode = 1;
    } else {
      console.log(JSON.stringify({ status: "PASS", gate: args.gate, candidateId: result.receipt.candidate.id }, null, 2));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
