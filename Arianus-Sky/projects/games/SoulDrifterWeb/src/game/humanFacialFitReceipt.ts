import {
  ARKIT_FACIAL_MORPH_NAMES,
  BAKED_META_VISEME_MORPH_NAMES,
} from "./facialAnimationDriver";

export const HUMANOID_FACIAL_FIT_RECEIPT_SCHEMA =
  "souldrifter.humanoid-facial-fit-receipt.v1";

export const ANALYTIC_DERIVATIVE_RELATIVE_TOLERANCE = Math.cbrt(Number.EPSILON);
export const MAXIMUM_NUMERIC_JACOBIAN_CONDITION = 1 / Math.sqrt(Number.EPSILON);
export const MAXIMUM_LOCKED_SEAM_DELTA_METERS = 1e-6;

export const REQUIRED_FACIAL_RUNTIME_SURFACES = [
  "creator",
  "world",
  "npcCloseUp",
  "dialogue",
  "quest",
  "paperDoll",
] as const;

type FacialRuntimeSurface = typeof REQUIRED_FACIAL_RUNTIME_SURFACES[number];

interface ArtifactSignature {
  readonly assetId: string;
  readonly sha256: string;
}

interface SkeletonSignature {
  readonly boneCount: number;
  readonly hierarchySha256: string;
  readonly restTransformsSha256: string;
  readonly rootBone: string;
}

interface TargetSetReceipt {
  readonly aggregateSha256: string;
  readonly names: readonly string[];
  readonly targetSha256ByName: Readonly<Record<string, string>>;
}

interface LocalMapCrossValidationReceipt {
  readonly exactFiniteSecantSampleCount: number;
  readonly heldOutControlCount: number;
  readonly localTargetLandmarkSpacingMeters: number;
  readonly maximumDisplacementDisagreementMeters: number;
  readonly maximumHeldOutPositionErrorMeters: number;
  readonly minimumMovementDirectionDot: number;
  readonly movementDirectionReversalCount: number;
  readonly normalizedMaximumHeldOutPositionError: number;
  readonly numericalRoundoffMeters: number;
  readonly orientationReversalCount: number;
}

interface SemanticNeighborhoodReceipt {
  readonly affectedTransferSampleCount: number;
  readonly controlCount: number;
  readonly coverageComplete: boolean;
  readonly crossValidation: LocalMapCrossValidationReceipt;
  readonly id: string;
  readonly minimumSourceSingularValue: number;
  readonly minimumTargetSingularValue: number;
  readonly nonCoplanar: boolean;
  readonly selectionMethod: "TOPOLOGY_GEODESIC";
  readonly sourceRank: number;
  readonly supportVertexCount: number;
  readonly targetRank: number;
}

interface RuntimeSurfaceReceipt {
  readonly canonicalHeadAssetId: string;
  readonly controlContractSha256: string;
  readonly status: "PASS";
}

export interface HumanoidFacialFitReceipt {
  readonly schema: typeof HUMANOID_FACIAL_FIT_RECEIPT_SCHEMA;
  readonly issue: number;
  readonly status: "PASS";
  readonly headId: string;
  readonly inputs: {
    readonly acceptedBody: ArtifactSignature;
    readonly acceptedSmartMesh: ArtifactSignature;
    readonly extractedHead: ArtifactSignature;
  };
  readonly basis: {
    readonly basisSha256: string;
    readonly materialSha256: string;
    readonly neckSeamSha256: string;
    readonly neckSeamVersion: string;
    readonly normalSha256: string;
    readonly polygonCount: number;
    readonly skinWeightSha256: string;
    readonly sourceExtractedHeadSha256: string;
    readonly topologySha256: string;
    readonly uvSha256: string;
    readonly vertexCount: number;
    readonly skeleton: SkeletonSignature;
  };
  readonly measurements: {
    readonly axes: "RIGHT_HANDED_X_LATERAL_Y_VERTICAL_Z_DEPTH";
    readonly headHeightMeters: number;
    readonly interocularDistanceMeters: number;
    readonly neckSeamVertexCount: number;
    readonly originMeters: readonly [number, number, number];
    readonly unitScaleMeters: number;
  };
  readonly targets: {
    readonly arkit: TargetSetReceipt;
    readonly metaVisemes: TargetSetReceipt & {
      readonly silenceRepresentation: "ZERO_WEIGHT_NO_GEOMETRY";
    };
  };
  readonly registration: {
    readonly correspondenceSha256: string;
    readonly semanticNeighborhoods: readonly SemanticNeighborhoodReceipt[];
  };
  readonly derivativeProof: {
    readonly analyticMethod: "ANALYTIC_POLYHARMONIC_R3";
    readonly maximumConditionNumber: number;
    readonly minimumDeterminant: number;
    readonly nonFiniteDerivativeCount: number;
    readonly orientationReversalCount: number;
    readonly sampleCounts: {
      readonly adaptiveTriangleSamples: number;
      readonly controls: number;
      readonly supportVertices: number;
      readonly transferSamples: number;
      readonly uncertifiedTriangles: number;
    };
    readonly centralDifferenceConvergence: {
      readonly maximumRelativeError: number;
      readonly method: "SYMMETRIC_CENTRAL_DIFFERENCE_V1";
      readonly sampleCount: number;
      readonly stepMultipliers: readonly [0.5, 1, 2];
      readonly stepStrategy: "CBRT_EPSILON_TIMES_LOCKED_ANATOMICAL_SCALE";
    };
  };
  readonly structuralProof: {
    readonly coordinateDuplicateMaximumSplitMeters: number;
    readonly coordinateDuplicateSplitCount: number;
    readonly neckSeamMaximumDeltaMeters: number;
    readonly newNonadjacentSelfOverlapCount: number;
    readonly nonFiniteValueCount: number;
    readonly openTearCount: number;
    readonly semanticBoundaryCrossingCount: number;
    readonly triangleFlipCount: number;
  };
  readonly output: ArtifactSignature;
  readonly authoringStrip: {
    readonly embeddedAuthoringActionCount: number;
    readonly metaObjectCount: number;
    readonly rigifyConstraintCount: number;
    readonly rigifyDriverCount: number;
    readonly rigifyGeneratedBoneCount: number;
    readonly rigifyModifierCount: number;
    readonly rigObjectCount: number;
    readonly status: "PASS";
  };
  readonly freshImport: {
    readonly armatureCount: number;
    readonly cleanBlenderProcess: boolean;
    readonly outputSha256: string;
    readonly skeleton: SkeletonSignature;
    readonly status: "PASS";
  };
  readonly runtimeResolution: {
    readonly canonicalHeadAssetId: string;
    readonly controlContractSha256: string;
    readonly surfaces: Readonly<Record<FacialRuntimeSurface, RuntimeSurfaceReceipt>>;
  };
}

export interface HumanoidFacialFitValidation {
  readonly errors: readonly string[];
  readonly valid: boolean;
}

const SHA256 = /^[A-F0-9]{64}$/;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function requireRecord(errors: string[], value: unknown, path: string): Record<string, unknown> | null {
  const candidate = record(value);
  if (!candidate) errors.push(`${path} must be an object`);
  return candidate;
}

function requireString(errors: string[], value: unknown, path: string): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} must be a non-empty string`);
    return null;
  }
  return value;
}

function requireHash(errors: string[], value: unknown, path: string): string | null {
  if (typeof value !== "string" || !SHA256.test(value)) {
    errors.push(`${path} must be an uppercase SHA-256`);
    return null;
  }
  return value;
}

function finite(errors: string[], value: unknown, path: string): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${path} must be a finite number`);
    return null;
  }
  return value;
}

function positive(errors: string[], value: unknown, path: string): number | null {
  const candidate = finite(errors, value, path);
  if (candidate !== null && candidate <= 0) errors.push(`${path} must be greater than zero`);
  return candidate;
}

function nonNegativeInteger(errors: string[], value: unknown, path: string): number | null {
  if (!Number.isInteger(value) || (value as number) < 0) {
    errors.push(`${path} must be a non-negative integer`);
    return null;
  }
  return value as number;
}

function positiveInteger(errors: string[], value: unknown, path: string): number | null {
  const candidate = nonNegativeInteger(errors, value, path);
  if (candidate !== null && candidate === 0) errors.push(`${path} must be greater than zero`);
  return candidate;
}

function requireZero(errors: string[], value: unknown, path: string): void {
  if (value !== 0) errors.push(`${path} must equal 0`);
}

function approximatelyEqual(left: number, right: number): boolean {
  const scale = Math.max(1, Math.abs(left), Math.abs(right));
  return Math.abs(left - right) <= 64 * Number.EPSILON * scale;
}

function validateArtifact(errors: string[], value: unknown, path: string): Record<string, unknown> | null {
  const artifact = requireRecord(errors, value, path);
  if (!artifact) return null;
  requireString(errors, artifact.assetId, `${path}.assetId`);
  requireHash(errors, artifact.sha256, `${path}.sha256`);
  return artifact;
}

function validateSkeleton(errors: string[], value: unknown, path: string): Record<string, unknown> | null {
  const skeleton = requireRecord(errors, value, path);
  if (!skeleton) return null;
  if (skeleton.boneCount !== 65) errors.push(`${path}.boneCount must equal 65`);
  if (skeleton.rootBone !== "mixamorig:Hips") errors.push(`${path}.rootBone must equal mixamorig:Hips`);
  requireHash(errors, skeleton.hierarchySha256, `${path}.hierarchySha256`);
  requireHash(errors, skeleton.restTransformsSha256, `${path}.restTransformsSha256`);
  return skeleton;
}

function validateExactTargetSet(
  errors: string[],
  value: unknown,
  expected: readonly string[],
  path: string,
): void {
  const targetSet = requireRecord(errors, value, path);
  if (!targetSet) return;
  requireHash(errors, targetSet.aggregateSha256, `${path}.aggregateSha256`);
  if (!Array.isArray(targetSet.names)
    || targetSet.names.length !== expected.length
    || targetSet.names.some((name, index) => name !== expected[index])) {
    errors.push(`${path}.names must equal the exact ${expected.length}-name standardized set in canonical order`);
  }
  const hashes = requireRecord(errors, targetSet.targetSha256ByName, `${path}.targetSha256ByName`);
  if (!hashes) return;
  const actualNames = Object.keys(hashes).sort();
  const expectedNames = [...expected].sort();
  if (actualNames.length !== expectedNames.length
    || actualNames.some((name, index) => name !== expectedNames[index])) {
    errors.push(`${path}.targetSha256ByName must contain exactly the standardized target names`);
  }
  for (const name of expected) requireHash(errors, hashes[name], `${path}.targetSha256ByName.${name}`);
}

function validateNeighborhood(errors: string[], value: unknown, index: number): void {
  const path = `registration.semanticNeighborhoods[${index}]`;
  const neighborhood = requireRecord(errors, value, path);
  if (!neighborhood) return;
  requireString(errors, neighborhood.id, `${path}.id`);
  if (neighborhood.selectionMethod !== "TOPOLOGY_GEODESIC") {
    errors.push(`${path}.selectionMethod must equal TOPOLOGY_GEODESIC`);
  }
  const controls = positiveInteger(errors, neighborhood.controlCount, `${path}.controlCount`);
  if (controls !== null && controls < 4) errors.push(`${path}.controlCount must be at least 4`);
  if (neighborhood.sourceRank !== 3) errors.push(`${path}.sourceRank must equal 3`);
  if (neighborhood.targetRank !== 3) errors.push(`${path}.targetRank must equal 3`);
  if (neighborhood.nonCoplanar !== true) errors.push(`${path}.nonCoplanar must equal true`);
  if (neighborhood.coverageComplete !== true) errors.push(`${path}.coverageComplete must equal true`);
  positive(errors, neighborhood.minimumSourceSingularValue, `${path}.minimumSourceSingularValue`);
  positive(errors, neighborhood.minimumTargetSingularValue, `${path}.minimumTargetSingularValue`);
  const supportCount = positiveInteger(errors, neighborhood.supportVertexCount, `${path}.supportVertexCount`);
  if (supportCount !== null && controls !== null && supportCount < controls) {
    errors.push(`${path}.supportVertexCount must be at least controlCount`);
  }
  const affected = positiveInteger(
    errors,
    neighborhood.affectedTransferSampleCount,
    `${path}.affectedTransferSampleCount`,
  );

  const crossValidation = requireRecord(errors, neighborhood.crossValidation, `${path}.crossValidation`);
  if (!crossValidation) return;
  if (controls !== null && crossValidation.heldOutControlCount !== controls) {
    errors.push(`${path}.crossValidation.heldOutControlCount must equal controlCount`);
  }
  if (affected !== null && crossValidation.exactFiniteSecantSampleCount !== affected) {
    errors.push(`${path}.crossValidation.exactFiniteSecantSampleCount must equal affectedTransferSampleCount`);
  }
  const spacing = positive(
    errors,
    crossValidation.localTargetLandmarkSpacingMeters,
    `${path}.crossValidation.localTargetLandmarkSpacingMeters`,
  );
  const heldOutError = finite(
    errors,
    crossValidation.maximumHeldOutPositionErrorMeters,
    `${path}.crossValidation.maximumHeldOutPositionErrorMeters`,
  );
  const normalizedError = finite(
    errors,
    crossValidation.normalizedMaximumHeldOutPositionError,
    `${path}.crossValidation.normalizedMaximumHeldOutPositionError`,
  );
  if (heldOutError !== null && heldOutError < 0) {
    errors.push(`${path}.crossValidation.maximumHeldOutPositionErrorMeters must be non-negative`);
  }
  if (normalizedError !== null && normalizedError < 0) {
    errors.push(`${path}.crossValidation.normalizedMaximumHeldOutPositionError must be non-negative`);
  }
  if (spacing !== null && heldOutError !== null && normalizedError !== null
    && !approximatelyEqual(normalizedError, heldOutError / spacing)) {
    errors.push(`${path}.crossValidation.normalizedMaximumHeldOutPositionError must equal error divided by local spacing`);
  }
  requireZero(errors, crossValidation.orientationReversalCount, `${path}.crossValidation.orientationReversalCount`);
  requireZero(
    errors,
    crossValidation.movementDirectionReversalCount,
    `${path}.crossValidation.movementDirectionReversalCount`,
  );
  positive(errors, crossValidation.minimumMovementDirectionDot, `${path}.crossValidation.minimumMovementDirectionDot`);
  const disagreement = finite(
    errors,
    crossValidation.maximumDisplacementDisagreementMeters,
    `${path}.crossValidation.maximumDisplacementDisagreementMeters`,
  );
  const roundoff = finite(
    errors,
    crossValidation.numericalRoundoffMeters,
    `${path}.crossValidation.numericalRoundoffMeters`,
  );
  if (disagreement !== null && disagreement < 0) {
    errors.push(`${path}.crossValidation.maximumDisplacementDisagreementMeters must be non-negative`);
  }
  if (roundoff !== null && roundoff < 0) {
    errors.push(`${path}.crossValidation.numericalRoundoffMeters must be non-negative`);
  }
  if (disagreement !== null && heldOutError !== null && roundoff !== null
    && disagreement > 2 * heldOutError + roundoff) {
    errors.push(`${path}.crossValidation displacement disagreement exceeds twice held-out error plus roundoff`);
  }
}

export function validateHumanoidFacialFitReceipt(value: unknown): HumanoidFacialFitValidation {
  const errors: string[] = [];
  const receipt = requireRecord(errors, value, "receipt");
  if (!receipt) return { valid: false, errors };

  if (receipt.schema !== HUMANOID_FACIAL_FIT_RECEIPT_SCHEMA) {
    errors.push(`receipt.schema must equal ${HUMANOID_FACIAL_FIT_RECEIPT_SCHEMA}`);
  }
  positiveInteger(errors, receipt.issue, "receipt.issue");
  if (receipt.status !== "PASS") errors.push("receipt.status must equal PASS");
  requireString(errors, receipt.headId, "receipt.headId");

  const inputs = requireRecord(errors, receipt.inputs, "receipt.inputs");
  const acceptedBody = validateArtifact(errors, inputs?.acceptedBody, "receipt.inputs.acceptedBody");
  validateArtifact(errors, inputs?.acceptedSmartMesh, "receipt.inputs.acceptedSmartMesh");
  const extractedHead = validateArtifact(errors, inputs?.extractedHead, "receipt.inputs.extractedHead");

  const basis = requireRecord(errors, receipt.basis, "receipt.basis");
  for (const field of [
    "basisSha256",
    "materialSha256",
    "neckSeamSha256",
    "normalSha256",
    "skinWeightSha256",
    "sourceExtractedHeadSha256",
    "topologySha256",
    "uvSha256",
  ]) requireHash(errors, basis?.[field], `receipt.basis.${field}`);
  requireString(errors, basis?.neckSeamVersion, "receipt.basis.neckSeamVersion");
  positiveInteger(errors, basis?.vertexCount, "receipt.basis.vertexCount");
  positiveInteger(errors, basis?.polygonCount, "receipt.basis.polygonCount");
  const basisSkeleton = validateSkeleton(errors, basis?.skeleton, "receipt.basis.skeleton");
  if (basis && extractedHead && basis.sourceExtractedHeadSha256 !== extractedHead.sha256) {
    errors.push("receipt.basis.sourceExtractedHeadSha256 must equal inputs.extractedHead.sha256");
  }

  const measurements = requireRecord(errors, receipt.measurements, "receipt.measurements");
  if (measurements?.axes !== "RIGHT_HANDED_X_LATERAL_Y_VERTICAL_Z_DEPTH") {
    errors.push("receipt.measurements.axes must equal RIGHT_HANDED_X_LATERAL_Y_VERTICAL_Z_DEPTH");
  }
  positive(errors, measurements?.headHeightMeters, "receipt.measurements.headHeightMeters");
  positive(errors, measurements?.interocularDistanceMeters, "receipt.measurements.interocularDistanceMeters");
  positive(errors, measurements?.unitScaleMeters, "receipt.measurements.unitScaleMeters");
  positiveInteger(errors, measurements?.neckSeamVertexCount, "receipt.measurements.neckSeamVertexCount");
  if (!Array.isArray(measurements?.originMeters)
    || measurements.originMeters.length !== 3
    || measurements.originMeters.some((coordinate) => typeof coordinate !== "number" || !Number.isFinite(coordinate))) {
    errors.push("receipt.measurements.originMeters must contain three finite coordinates");
  }

  const targets = requireRecord(errors, receipt.targets, "receipt.targets");
  validateExactTargetSet(errors, targets?.arkit, ARKIT_FACIAL_MORPH_NAMES, "receipt.targets.arkit");
  validateExactTargetSet(
    errors,
    targets?.metaVisemes,
    BAKED_META_VISEME_MORPH_NAMES,
    "receipt.targets.metaVisemes",
  );
  const metaVisemes = record(targets?.metaVisemes);
  if (metaVisemes?.silenceRepresentation !== "ZERO_WEIGHT_NO_GEOMETRY") {
    errors.push("receipt.targets.metaVisemes.silenceRepresentation must equal ZERO_WEIGHT_NO_GEOMETRY");
  }

  const registration = requireRecord(errors, receipt.registration, "receipt.registration");
  requireHash(errors, registration?.correspondenceSha256, "receipt.registration.correspondenceSha256");
  const neighborhoods = registration?.semanticNeighborhoods;
  if (!Array.isArray(neighborhoods) || neighborhoods.length === 0) {
    errors.push("receipt.registration.semanticNeighborhoods must be a non-empty array");
  } else {
    const ids = new Set<string>();
    neighborhoods.forEach((neighborhood, index) => {
      validateNeighborhood(errors, neighborhood, index);
      const id = record(neighborhood)?.id;
      if (typeof id === "string") {
        if (ids.has(id)) errors.push(`receipt.registration.semanticNeighborhoods duplicates id ${id}`);
        ids.add(id);
      }
    });
  }

  const derivative = requireRecord(errors, receipt.derivativeProof, "receipt.derivativeProof");
  if (derivative?.analyticMethod !== "ANALYTIC_POLYHARMONIC_R3") {
    errors.push("receipt.derivativeProof.analyticMethod must equal ANALYTIC_POLYHARMONIC_R3");
  }
  positive(errors, derivative?.minimumDeterminant, "receipt.derivativeProof.minimumDeterminant");
  requireZero(errors, derivative?.orientationReversalCount, "receipt.derivativeProof.orientationReversalCount");
  requireZero(errors, derivative?.nonFiniteDerivativeCount, "receipt.derivativeProof.nonFiniteDerivativeCount");
  const condition = positive(errors, derivative?.maximumConditionNumber, "receipt.derivativeProof.maximumConditionNumber");
  if (condition !== null && condition >= MAXIMUM_NUMERIC_JACOBIAN_CONDITION) {
    errors.push(`receipt.derivativeProof.maximumConditionNumber must be below ${MAXIMUM_NUMERIC_JACOBIAN_CONDITION}`);
  }
  const sampleCounts = requireRecord(errors, derivative?.sampleCounts, "receipt.derivativeProof.sampleCounts");
  let derivativeSampleCount = 0;
  for (const field of ["adaptiveTriangleSamples", "controls", "supportVertices", "transferSamples"]) {
    const count = positiveInteger(errors, sampleCounts?.[field], `receipt.derivativeProof.sampleCounts.${field}`);
    if (count !== null) derivativeSampleCount += count;
  }
  requireZero(errors, sampleCounts?.uncertifiedTriangles, "receipt.derivativeProof.sampleCounts.uncertifiedTriangles");
  const convergence = requireRecord(
    errors,
    derivative?.centralDifferenceConvergence,
    "receipt.derivativeProof.centralDifferenceConvergence",
  );
  if (convergence?.method !== "SYMMETRIC_CENTRAL_DIFFERENCE_V1") {
    errors.push("receipt.derivativeProof.centralDifferenceConvergence.method must equal SYMMETRIC_CENTRAL_DIFFERENCE_V1");
  }
  if (convergence?.stepStrategy !== "CBRT_EPSILON_TIMES_LOCKED_ANATOMICAL_SCALE") {
    errors.push("receipt.derivativeProof.centralDifferenceConvergence.stepStrategy must equal CBRT_EPSILON_TIMES_LOCKED_ANATOMICAL_SCALE");
  }
  if (!Array.isArray(convergence?.stepMultipliers)
    || convergence.stepMultipliers.length !== 3
    || convergence.stepMultipliers.some((value, index) => value !== [0.5, 1, 2][index])) {
    errors.push("receipt.derivativeProof.centralDifferenceConvergence.stepMultipliers must equal [0.5, 1, 2]");
  }
  if (convergence?.sampleCount !== derivativeSampleCount) {
    errors.push("receipt.derivativeProof.centralDifferenceConvergence.sampleCount must cover every derivative sample");
  }
  const relativeError = finite(
    errors,
    convergence?.maximumRelativeError,
    "receipt.derivativeProof.centralDifferenceConvergence.maximumRelativeError",
  );
  if (relativeError !== null
    && (relativeError < 0 || relativeError > ANALYTIC_DERIVATIVE_RELATIVE_TOLERANCE)) {
    errors.push(
      "receipt.derivativeProof.centralDifferenceConvergence.maximumRelativeError exceeds the versioned cbrt(epsilon) tolerance",
    );
  }

  const structural = requireRecord(errors, receipt.structuralProof, "receipt.structuralProof");
  for (const field of [
    "coordinateDuplicateSplitCount",
    "newNonadjacentSelfOverlapCount",
    "nonFiniteValueCount",
    "openTearCount",
    "semanticBoundaryCrossingCount",
    "triangleFlipCount",
  ]) requireZero(errors, structural?.[field], `receipt.structuralProof.${field}`);
  for (const field of ["coordinateDuplicateMaximumSplitMeters", "neckSeamMaximumDeltaMeters"]) {
    const delta = finite(errors, structural?.[field], `receipt.structuralProof.${field}`);
    if (delta !== null && (delta < 0 || delta > MAXIMUM_LOCKED_SEAM_DELTA_METERS)) {
      errors.push(`receipt.structuralProof.${field} must be between 0 and ${MAXIMUM_LOCKED_SEAM_DELTA_METERS}`);
    }
  }

  const output = validateArtifact(errors, receipt.output, "receipt.output");
  const authoringStrip = requireRecord(errors, receipt.authoringStrip, "receipt.authoringStrip");
  if (authoringStrip?.status !== "PASS") errors.push("receipt.authoringStrip.status must equal PASS");
  for (const field of [
    "embeddedAuthoringActionCount",
    "metaObjectCount",
    "rigifyConstraintCount",
    "rigifyDriverCount",
    "rigifyGeneratedBoneCount",
    "rigifyModifierCount",
    "rigObjectCount",
  ]) requireZero(errors, authoringStrip?.[field], `receipt.authoringStrip.${field}`);

  const freshImport = requireRecord(errors, receipt.freshImport, "receipt.freshImport");
  if (freshImport?.status !== "PASS") errors.push("receipt.freshImport.status must equal PASS");
  if (freshImport?.cleanBlenderProcess !== true) {
    errors.push("receipt.freshImport.cleanBlenderProcess must equal true");
  }
  if (freshImport?.armatureCount !== 1) errors.push("receipt.freshImport.armatureCount must equal 1");
  requireHash(errors, freshImport?.outputSha256, "receipt.freshImport.outputSha256");
  const freshSkeleton = validateSkeleton(errors, freshImport?.skeleton, "receipt.freshImport.skeleton");
  if (output && freshImport && freshImport.outputSha256 !== output.sha256) {
    errors.push("receipt.freshImport.outputSha256 must equal output.sha256");
  }
  if (basisSkeleton && freshSkeleton) {
    for (const field of ["boneCount", "rootBone", "hierarchySha256", "restTransformsSha256"]) {
      if (freshSkeleton[field] !== basisSkeleton[field]) {
        errors.push(`receipt.freshImport.skeleton.${field} must match basis.skeleton.${field}`);
      }
    }
  }

  const runtime = requireRecord(errors, receipt.runtimeResolution, "receipt.runtimeResolution");
  const canonicalHeadAssetId = requireString(
    errors,
    runtime?.canonicalHeadAssetId,
    "receipt.runtimeResolution.canonicalHeadAssetId",
  );
  const controlContractSha256 = requireHash(
    errors,
    runtime?.controlContractSha256,
    "receipt.runtimeResolution.controlContractSha256",
  );
  if (output && canonicalHeadAssetId !== null && output.assetId !== canonicalHeadAssetId) {
    errors.push("receipt.runtimeResolution.canonicalHeadAssetId must equal output.assetId");
  }
  const surfaces = requireRecord(errors, runtime?.surfaces, "receipt.runtimeResolution.surfaces");
  if (surfaces) {
    const actual = Object.keys(surfaces).sort();
    const expected = [...REQUIRED_FACIAL_RUNTIME_SURFACES].sort();
    if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) {
      errors.push("receipt.runtimeResolution.surfaces must contain exactly the required creator/runtime surfaces");
    }
    for (const surfaceName of REQUIRED_FACIAL_RUNTIME_SURFACES) {
      const surface = requireRecord(
        errors,
        surfaces[surfaceName],
        `receipt.runtimeResolution.surfaces.${surfaceName}`,
      );
      if (!surface) continue;
      if (surface.status !== "PASS") {
        errors.push(`receipt.runtimeResolution.surfaces.${surfaceName}.status must equal PASS`);
      }
      if (canonicalHeadAssetId !== null && surface.canonicalHeadAssetId !== canonicalHeadAssetId) {
        errors.push(`receipt.runtimeResolution.surfaces.${surfaceName}.canonicalHeadAssetId must resolve the canonical head`);
      }
      if (controlContractSha256 !== null && surface.controlContractSha256 !== controlContractSha256) {
        errors.push(`receipt.runtimeResolution.surfaces.${surfaceName}.controlContractSha256 must resolve the canonical controls`);
      }
    }
  }

  // Retain this reference so an omitted accepted body can never be silently ignored.
  void acceptedBody;
  return { valid: errors.length === 0, errors };
}
