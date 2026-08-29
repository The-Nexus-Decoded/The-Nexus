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

function probeAndDecodeVideo(errors, normalSpeed, videoPath) {
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
    errors.push(`playbackEvidence.normalSpeed could not be probed: ${probe.stderr || probe.error}`);
    return;
  }
  let payload;
  try {
    payload = JSON.parse(probe.stdout);
  } catch {
    errors.push("playbackEvidence.normalSpeed ffprobe output was not valid JSON");
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
    errors.push("playbackEvidence.normalSpeed dimensions do not match the decoded video");
  }
  if (frameCount !== normalSpeed.frameCount) {
    errors.push(`playbackEvidence.normalSpeed.frameCount ${normalSpeed.frameCount} does not match decoded ${frameCount}`);
  }
  if (Math.abs(fps - normalSpeed.fps) > 0.01) {
    errors.push(`playbackEvidence.normalSpeed.fps ${normalSpeed.fps} does not match decoded ${fps}`);
  }
  if (Math.abs(duration - normalSpeed.durationSeconds) > 0.05) {
    errors.push(`playbackEvidence.normalSpeed.durationSeconds ${normalSpeed.durationSeconds} does not match decoded ${duration}`);
  }
  const decode = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", videoPath, "-f", "null", "-"],
    { encoding: "utf8" },
  );
  if (decode.error || decode.status !== 0) {
    errors.push(`playbackEvidence.normalSpeed full decode failed: ${decode.stderr || decode.error}`);
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
  if (technical?.status !== "PASS") errors.push("technicalReview.status must equal PASS");
  for (const key of REQUIRED_TECHNICAL_CHECKS) {
    if (technical?.checks?.[key] !== "PASS") errors.push(`technicalReview.checks.${key} must equal PASS`);
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
  if (visual?.status !== "PASS") errors.push("independentVisualReview.status must equal PASS");
  if (visual?.reviewerRole !== "INDEPENDENT_COORDINATOR") {
    errors.push("independentVisualReview.reviewerRole must equal INDEPENDENT_COORDINATOR");
  }
  requireString(errors, visual?.reviewerId, "independentVisualReview.reviewerId");
  if (visual?.reviewerId && visual.reviewerId === candidate?.authorId) {
    errors.push("independentVisualReview.reviewerId must differ from candidate.authorId");
  }
  if (visual?.watchedEntireNormalSpeed !== true) {
    errors.push("independentVisualReview.watchedEntireNormalSpeed must be true");
  }
  if (normalizedSha(visual?.playbackSha256) !== normalizedSha(normalSpeed?.sha256)) {
    errors.push("independentVisualReview.playbackSha256 must match playbackEvidence.normalSpeed.sha256");
  }
  for (const key of REQUIRED_VISUAL_CHECKS) {
    if (visual?.checklist?.[key] !== "PASS") errors.push(`independentVisualReview.checklist.${key} must equal PASS`);
  }
  if (!Array.isArray(visual?.blockingFindings) || visual.blockingFindings.length !== 0) {
    errors.push("independentVisualReview.blockingFindings must be an empty array");
  }

  if (gate === "owner-review") {
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
  } else if (gate !== "authoring") {
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
  if (!args.receiptPath) throw new Error("Usage: node validate-human-animation-candidate.mjs [--gate owner-review|runtime-install|shipping] <receipt.json>");
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
