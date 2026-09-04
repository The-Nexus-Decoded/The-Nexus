import {
  ARKIT_FACIAL_MORPH_NAMES,
  BAKED_META_VISEME_MORPH_NAMES,
  DIALOGUE_FACIAL_MORPH_NAMES,
} from "./facialAnimationDriver";

export const HUMANOID_FACIAL_FIT_RECEIPT_SCHEMA =
  "souldrifter.humanoid-facial-fit-receipt.v2";
export const HUMANOID_FACIAL_FIT_RECEIPT_V1_SCHEMA =
  "souldrifter.humanoid-facial-fit-receipt.v1";
export const HUMANOID_FACIAL_FIT_V1_AUDIT_ONLY_ERROR =
  "receipt.schema souldrifter.humanoid-facial-fit-receipt.v1 is audit-only and cannot be promoted; regenerate a complete v2 receipt";

export const MAXIMUM_LOCKED_SEAM_DELTA_METERS = 1e-6;
export const MAXIMUM_DUPLICATE_PARITY_DELTA_METERS = 1e-7;
export const CANONICAL_FACIAL_SWEEP_WEIGHTS = [0, 0.25, 0.5, 0.75, 1] as const;

export const REQUIRED_FACIAL_RUNTIME_SURFACES = [
  "creator",
  "world",
  "npcCloseUp",
  "dialogue",
  "quest",
  "paperDoll",
] as const;

export const REQUIRED_RIGIFY_AUTHORING_MODULES = [
  "face.skin_eye",
  "face.skin_jaw",
  "face.basic_tongue",
  "skin.stretchy_chain",
] as const;

export const REQUIRED_EXACT_HEAD_SEMANTIC_REGIONS = [
  "leftEye",
  "rightEye",
  "mouthUpper",
  "mouthLower",
  "jaw",
  "tongue",
  "neckSeam",
] as const;

type FacialRuntimeSurface = typeof REQUIRED_FACIAL_RUNTIME_SURFACES[number];
type RigifyAuthoringModule = typeof REQUIRED_RIGIFY_AUTHORING_MODULES[number];

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

interface StructuralGateReceipt {
  readonly coordinateDuplicateSplitCount: number;
  readonly duplicateParityMaximumDeltaMeters: number;
  readonly neckSeamMaximumDeltaMeters: number;
  readonly newNonadjacentSelfOverlapCount: number;
  readonly nonFiniteValueCount: number;
  readonly openTearCount: number;
  readonly outsideSemanticRegionMaximumDeltaMeters: number;
  readonly proofSha256: string;
  readonly semanticBoundaryCrossingCount: number;
  readonly status: "PASS";
  readonly triangleFlipCount: number;
}

interface SweepSampleReceipt {
  readonly affectedLogicalVertexCount: number;
  readonly deltaSha256: string;
  readonly gates: StructuralGateReceipt;
  readonly geometrySha256: string;
  readonly maximumDeltaMeters: number;
  readonly status: "PASS";
  readonly weight: number;
}

interface TargetProofReceipt {
  readonly authoringModules: readonly RigifyAuthoringModule[];
  readonly semanticRegionIds: readonly string[];
  readonly targetSha256: string;
  readonly sweep: {
    readonly adaptiveSamples: readonly SweepSampleReceipt[];
    readonly canonicalSamples: readonly SweepSampleReceipt[];
    readonly canonicalWeights: typeof CANONICAL_FACIAL_SWEEP_WEIGHTS;
    readonly sweepSha256: string;
    readonly uncertifiedIntervalCount: number;
  };
}

interface OralComponentReceipt {
  readonly materialSha256: string;
  readonly meshName: string;
  readonly polygonCount: number;
  readonly topologySha256: string;
  readonly vertexCount: number;
}

interface RuntimeSurfaceReceipt {
  readonly canonicalHeadAssetId: string;
  readonly capabilityStatus: "READY";
  readonly controlContractSha256: string;
  readonly probe: {
    readonly animatedMeshCount: number;
    readonly availableMorphNames: readonly string[];
    readonly capabilities: {
      readonly blink: true;
      readonly gaze: true;
      readonly speech: true;
    };
    readonly executionMode: "REAL_THREE_WEBGL_RUNTIME";
    readonly loadedOutputSha256: string;
    readonly missingMorphNames: readonly string[];
    readonly morphDictionarySha256: string;
    readonly morphTargetCount: number;
    readonly probeSha256: string;
    readonly status: "PASS";
  };
  readonly render: {
    readonly cameraSha256: string;
    readonly heightPixels: number;
    readonly nonBackgroundPixelCount: number;
    readonly renderSha256: string;
    readonly renderer: "THREE_WEBGLRENDERER";
    readonly status: "PASS";
    readonly widthPixels: number;
  };
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
  readonly topologyProvenance: {
    readonly acceptedSmartMeshSha256: string;
    readonly authority: "EXACT_APPROVED_TRIPO_QUAD_SMART_MESH";
    readonly basisSha256: string;
    readonly directExactHeadWorkflow: true;
    readonly duplicateGroupSha256: string;
    readonly extractedHeadSha256: string;
    readonly logicalTopologySha256: string;
    readonly quadMode: "TRIPO_QUAD_FACE" | "ALREADY_APPROVED_QUAD";
    readonly rawToLogicalMapSha256: string;
    readonly templateTransferCount: 0;
    readonly topologySha256: string;
  };
  readonly semanticFit: {
    readonly logicalTopologySha256: string;
    readonly method: "TARGET_DERIVED_EXACT_TOPOLOGY";
    readonly regionAggregateSha256: string;
    readonly regions: readonly {
      readonly boundarySha256: string;
      readonly id: string;
      readonly logicalVertexCount: number;
      readonly membershipSha256: string;
      readonly rawVertexCount: number;
      readonly selectionMethod: "EXACT_TOPOLOGY_GRAPH_AND_MEASURED_BOUNDS";
    }[];
  };
  readonly authoringRig: {
    readonly blenderVersion: string;
    readonly fitAggregateSha256: string;
    readonly modules: readonly {
      readonly authoringOnly: true;
      readonly controlCount: number;
      readonly fitSha256: string;
      readonly generatedBoneCount: number;
      readonly instanceCount: number;
      readonly module: RigifyAuthoringModule;
      readonly strippedBeforeExport: true;
    }[];
    readonly rigifyVersion: string;
    readonly runtimeArmaturePolicy: "SEPARATE_AUTHORING_RIG";
    readonly system: "BLENDER_RIGIFY";
  };
  readonly targets: {
    readonly arkit: TargetSetReceipt;
    readonly metaVisemes: TargetSetReceipt & {
      readonly silenceRepresentation: "ZERO_WEIGHT_NO_GEOMETRY";
    };
    readonly proofByName: Readonly<Record<string, TargetProofReceipt>>;
  };
  readonly criticalCombinationProof: {
    readonly aggregateSha256: string;
    readonly coverage: {
      readonly bilateralBlink: true;
      readonly blinkGazeSpeech: true;
      readonly jawWithSpeech: true;
    };
    readonly proofByName: Readonly<Record<string, {
      readonly gates: StructuralGateReceipt;
      readonly geometrySha256: string;
      readonly proofSha256: string;
      readonly status: "PASS";
      readonly targetWeights: Readonly<Record<string, number>>;
    }>>;
  };
  readonly oralAnatomy: {
    readonly componentIsolationSha256: string;
    readonly components: {
      readonly lowerTeeth: OralComponentReceipt;
      readonly mouthCavity: OralComponentReceipt;
      readonly tongue: OralComponentReceipt;
      readonly upperTeeth: OralComponentReceipt;
    };
    readonly jawOpenCentralGapIncreaseMeters: number;
    readonly lipControlModule: "skin.stretchy_chain";
    readonly maximumInterpenetrationMeters: number;
    readonly mouthCavityDepthMeters: number;
    readonly neutralLipSealMaximumGapMeters: number;
    readonly nonFiniteValueCount: number;
    readonly status: "PASS";
    readonly tongueControlModule: "face.basic_tongue";
  };
  readonly neutralStructuralProof: {
    readonly basisSha256: string;
    readonly coordinateDuplicateMaximumSplitMeters: number;
    readonly coordinateDuplicateSplitCount: number;
    readonly materialSha256: string;
    readonly neckSeamMaximumDeltaMeters: number;
    readonly newNonadjacentSelfOverlapCount: number;
    readonly nonFiniteValueCount: number;
    readonly normalSha256: string;
    readonly openTearCount: number;
    readonly polygonCount: number;
    readonly proofSha256: string;
    readonly skinWeightSha256: string;
    readonly status: "PASS";
    readonly topologySha256: string;
    readonly triangleFlipCount: number;
    readonly uvSha256: string;
    readonly vertexCount: number;
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
    readonly authoringRigObjectCount: number;
    readonly basis: {
      readonly basisSha256: string;
      readonly materialSha256: string;
      readonly normalSha256: string;
      readonly polygonCount: number;
      readonly skinWeightSha256: string;
      readonly topologySha256: string;
      readonly uvSha256: string;
      readonly vertexCount: number;
    };
    readonly cleanBlenderProcess: true;
    readonly equivalenceSha256: string;
    readonly importer: "BLENDER_GLTF_2_0";
    readonly meshObjectCount: number;
    readonly morphTargetCount: number;
    readonly outputSha256: string;
    readonly skeleton: SkeletonSignature;
    readonly status: "PASS";
    readonly targets: TargetSetReceipt;
  };
  readonly runtimeResolution: {
    readonly aggregateProbeSha256: string;
    readonly aggregateRenderSha256: string;
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
const ALL_TARGET_NAMES = [...DIALOGUE_FACIAL_MORPH_NAMES] as readonly string[];
const ALL_TARGET_NAME_SET = new Set(ALL_TARGET_NAMES);
const RIGIFY_MODULE_SET = new Set<string>(REQUIRED_RIGIFY_AUTHORING_MODULES);
const SEMANTIC_REGION_SET = new Set<string>(REQUIRED_EXACT_HEAD_SEMANTIC_REGIONS);
const GAZE_TARGET_SET = new Set<string>([
  "eyeLookDownLeft",
  "eyeLookDownRight",
  "eyeLookInLeft",
  "eyeLookInRight",
  "eyeLookOutLeft",
  "eyeLookOutRight",
  "eyeLookUpLeft",
  "eyeLookUpRight",
]);

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

function nonNegative(errors: string[], value: unknown, path: string): number | null {
  const candidate = finite(errors, value, path);
  if (candidate !== null && candidate < 0) errors.push(`${path} must be non-negative`);
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

function requireTrue(errors: string[], value: unknown, path: string): void {
  if (value !== true) errors.push(`${path} must equal true`);
}

function sameExactNames(value: unknown, expected: readonly unknown[]): boolean {
  return Array.isArray(value)
    && value.length === expected.length
    && value.every((name, index) => name === expected[index]);
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
): Record<string, unknown> | null {
  const targetSet = requireRecord(errors, value, path);
  if (!targetSet) return null;
  requireHash(errors, targetSet.aggregateSha256, `${path}.aggregateSha256`);
  if (!sameExactNames(targetSet.names, expected)) {
    errors.push(`${path}.names must equal the exact ${expected.length}-name standardized set in canonical order`);
  }
  const hashes = requireRecord(errors, targetSet.targetSha256ByName, `${path}.targetSha256ByName`);
  if (!hashes) return targetSet;
  if (!sameExactNames(Object.keys(hashes).sort(), [...expected].sort())) {
    errors.push(`${path}.targetSha256ByName must contain exactly the standardized target names`);
  }
  for (const name of expected) requireHash(errors, hashes[name], `${path}.targetSha256ByName.${name}`);
  return targetSet;
}

function validateStructuralGates(errors: string[], value: unknown, path: string): void {
  const gates = requireRecord(errors, value, path);
  if (!gates) return;
  if (gates.status !== "PASS") errors.push(`${path}.status must equal PASS`);
  requireHash(errors, gates.proofSha256, `${path}.proofSha256`);
  for (const field of [
    "coordinateDuplicateSplitCount",
    "newNonadjacentSelfOverlapCount",
    "nonFiniteValueCount",
    "openTearCount",
    "semanticBoundaryCrossingCount",
    "triangleFlipCount",
  ]) requireZero(errors, gates[field], `${path}.${field}`);
  for (const [field, maximum] of [
    ["duplicateParityMaximumDeltaMeters", MAXIMUM_DUPLICATE_PARITY_DELTA_METERS],
    ["neckSeamMaximumDeltaMeters", MAXIMUM_LOCKED_SEAM_DELTA_METERS],
    ["outsideSemanticRegionMaximumDeltaMeters", MAXIMUM_DUPLICATE_PARITY_DELTA_METERS],
  ] as const) {
    const delta = nonNegative(errors, gates[field], `${path}.${field}`);
    if (delta !== null && delta > maximum) errors.push(`${path}.${field} must be at most ${maximum}`);
  }
}

function validateSweepSample(
  errors: string[],
  value: unknown,
  path: string,
  expectedWeight?: number,
): number | null {
  const sample = requireRecord(errors, value, path);
  if (!sample) return null;
  if (sample.status !== "PASS") errors.push(`${path}.status must equal PASS`);
  const weight = finite(errors, sample.weight, `${path}.weight`);
  if (weight !== null && (weight < 0 || weight > 1)) errors.push(`${path}.weight must be between 0 and 1`);
  if (expectedWeight !== undefined && weight !== expectedWeight) errors.push(`${path}.weight must equal ${expectedWeight}`);
  const affected = nonNegativeInteger(errors, sample.affectedLogicalVertexCount, `${path}.affectedLogicalVertexCount`);
  const maximumDelta = nonNegative(errors, sample.maximumDeltaMeters, `${path}.maximumDeltaMeters`);
  if (weight === 0) {
    if (affected !== 0) errors.push(`${path}.affectedLogicalVertexCount must equal 0 at neutral weight`);
    if (maximumDelta !== 0) errors.push(`${path}.maximumDeltaMeters must equal 0 at neutral weight`);
  } else if (weight !== null) {
    if (affected === 0) errors.push(`${path}.affectedLogicalVertexCount must be greater than zero above neutral weight`);
    if (maximumDelta === 0) errors.push(`${path}.maximumDeltaMeters must be greater than zero above neutral weight`);
  }
  requireHash(errors, sample.deltaSha256, `${path}.deltaSha256`);
  requireHash(errors, sample.geometrySha256, `${path}.geometrySha256`);
  validateStructuralGates(errors, sample.gates, `${path}.gates`);
  return maximumDelta;
}

function validateTargetProof(
  errors: string[],
  value: unknown,
  name: string,
  expectedHash: unknown,
): void {
  const path = `receipt.targets.proofByName.${name}`;
  const proof = requireRecord(errors, value, path);
  if (!proof) return;
  const targetHash = requireHash(errors, proof.targetSha256, `${path}.targetSha256`);
  if (targetHash !== null && typeof expectedHash === "string" && targetHash !== expectedHash) {
    errors.push(`${path}.targetSha256 must match the standardized target-set hash`);
  }
  if (!Array.isArray(proof.semanticRegionIds) || proof.semanticRegionIds.length === 0) {
    errors.push(`${path}.semanticRegionIds must be a non-empty array`);
  } else if (
    new Set(proof.semanticRegionIds).size !== proof.semanticRegionIds.length
    || proof.semanticRegionIds.some((id) => typeof id !== "string" || !SEMANTIC_REGION_SET.has(id))
  ) {
    errors.push(`${path}.semanticRegionIds must contain unique declared semantic region ids`);
  }
  if (!Array.isArray(proof.authoringModules) || proof.authoringModules.length === 0) {
    errors.push(`${path}.authoringModules must be a non-empty array`);
  } else if (
    new Set(proof.authoringModules).size !== proof.authoringModules.length
    || proof.authoringModules.some((module) => typeof module !== "string" || !RIGIFY_MODULE_SET.has(module))
  ) {
    errors.push(`${path}.authoringModules must contain unique required Rigify module names`);
  }
  const sweep = requireRecord(errors, proof.sweep, `${path}.sweep`);
  if (!sweep) return;
  requireHash(errors, sweep.sweepSha256, `${path}.sweep.sweepSha256`);
  requireZero(errors, sweep.uncertifiedIntervalCount, `${path}.sweep.uncertifiedIntervalCount`);
  if (!sameExactNames(sweep.canonicalWeights, CANONICAL_FACIAL_SWEEP_WEIGHTS)) {
    errors.push(`${path}.sweep.canonicalWeights must equal [0, 0.25, 0.5, 0.75, 1]`);
  }
  const samples = sweep.canonicalSamples;
  if (!Array.isArray(samples) || samples.length !== CANONICAL_FACIAL_SWEEP_WEIGHTS.length) {
    errors.push(`${path}.sweep.canonicalSamples must contain exactly five canonical samples`);
  } else {
    let priorDelta = -Infinity;
    samples.forEach((sample, index) => {
      const maximumDelta = validateSweepSample(
        errors,
        sample,
        `${path}.sweep.canonicalSamples[${index}]`,
        CANONICAL_FACIAL_SWEEP_WEIGHTS[index],
      );
      if (maximumDelta !== null && maximumDelta < priorDelta) {
        errors.push(`${path}.sweep.canonicalSamples maximumDeltaMeters must be monotonic`);
      }
      if (maximumDelta !== null) priorDelta = maximumDelta;
    });
  }
  if (!Array.isArray(sweep.adaptiveSamples)) {
    errors.push(`${path}.sweep.adaptiveSamples must be an array (empty when no adaptive samples are needed)`);
  } else {
    const weights = new Set<number>();
    sweep.adaptiveSamples.forEach((sample, index) => {
      const sampleRecord = record(sample);
      const weight = sampleRecord?.weight;
      validateSweepSample(errors, sample, `${path}.sweep.adaptiveSamples[${index}]`);
      if (typeof weight === "number") {
        if (CANONICAL_FACIAL_SWEEP_WEIGHTS.some((canonical) => canonical === weight)) {
          errors.push(`${path}.sweep.adaptiveSamples[${index}].weight must not duplicate a canonical weight`);
        }
        if (weights.has(weight)) errors.push(`${path}.sweep.adaptiveSamples duplicates weight ${weight}`);
        weights.add(weight);
      }
    });
  }
}

function validateTopologyAndSemanticFit(
  errors: string[],
  receipt: Record<string, unknown>,
  inputs: Record<string, unknown> | null,
  basis: Record<string, unknown> | null,
): void {
  const provenance = requireRecord(errors, receipt.topologyProvenance, "receipt.topologyProvenance");
  if (provenance?.authority !== "EXACT_APPROVED_TRIPO_QUAD_SMART_MESH") {
    errors.push("receipt.topologyProvenance.authority must equal EXACT_APPROVED_TRIPO_QUAD_SMART_MESH");
  }
  if (provenance?.quadMode !== "TRIPO_QUAD_FACE" && provenance?.quadMode !== "ALREADY_APPROVED_QUAD") {
    errors.push("receipt.topologyProvenance.quadMode must equal TRIPO_QUAD_FACE or ALREADY_APPROVED_QUAD");
  }
  requireTrue(errors, provenance?.directExactHeadWorkflow, "receipt.topologyProvenance.directExactHeadWorkflow");
  requireZero(errors, provenance?.templateTransferCount, "receipt.topologyProvenance.templateTransferCount");
  for (const field of [
    "acceptedSmartMeshSha256",
    "basisSha256",
    "duplicateGroupSha256",
    "extractedHeadSha256",
    "logicalTopologySha256",
    "rawToLogicalMapSha256",
    "topologySha256",
  ]) requireHash(errors, provenance?.[field], `receipt.topologyProvenance.${field}`);
  const smartMesh = record(inputs?.acceptedSmartMesh);
  const extractedHead = record(inputs?.extractedHead);
  if (provenance && smartMesh && provenance.acceptedSmartMeshSha256 !== smartMesh.sha256) {
    errors.push("receipt.topologyProvenance.acceptedSmartMeshSha256 must equal inputs.acceptedSmartMesh.sha256");
  }
  if (provenance && extractedHead && provenance.extractedHeadSha256 !== extractedHead.sha256) {
    errors.push("receipt.topologyProvenance.extractedHeadSha256 must equal inputs.extractedHead.sha256");
  }
  if (provenance && basis) {
    if (provenance.basisSha256 !== basis.basisSha256) errors.push("receipt.topologyProvenance.basisSha256 must equal basis.basisSha256");
    if (provenance.topologySha256 !== basis.topologySha256) errors.push("receipt.topologyProvenance.topologySha256 must equal basis.topologySha256");
  }

  const semanticFit = requireRecord(errors, receipt.semanticFit, "receipt.semanticFit");
  if (semanticFit?.method !== "TARGET_DERIVED_EXACT_TOPOLOGY") {
    errors.push("receipt.semanticFit.method must equal TARGET_DERIVED_EXACT_TOPOLOGY");
  }
  requireHash(errors, semanticFit?.logicalTopologySha256, "receipt.semanticFit.logicalTopologySha256");
  requireHash(errors, semanticFit?.regionAggregateSha256, "receipt.semanticFit.regionAggregateSha256");
  if (semanticFit && provenance && semanticFit.logicalTopologySha256 !== provenance.logicalTopologySha256) {
    errors.push("receipt.semanticFit.logicalTopologySha256 must equal topologyProvenance.logicalTopologySha256");
  }
  if (!Array.isArray(semanticFit?.regions)) {
    errors.push("receipt.semanticFit.regions must be an array");
    return;
  }
  const regionIds = semanticFit.regions.map((region) => record(region)?.id);
  if (!sameExactNames(regionIds, REQUIRED_EXACT_HEAD_SEMANTIC_REGIONS)) {
    errors.push("receipt.semanticFit.regions must contain exactly the required semantic regions in canonical order");
  }
  semanticFit.regions.forEach((value, index) => {
    const path = `receipt.semanticFit.regions[${index}]`;
    const region = requireRecord(errors, value, path);
    if (!region) return;
    requireString(errors, region.id, `${path}.id`);
    if (region.selectionMethod !== "EXACT_TOPOLOGY_GRAPH_AND_MEASURED_BOUNDS") {
      errors.push(`${path}.selectionMethod must equal EXACT_TOPOLOGY_GRAPH_AND_MEASURED_BOUNDS`);
    }
    const logical = positiveInteger(errors, region.logicalVertexCount, `${path}.logicalVertexCount`);
    const raw = positiveInteger(errors, region.rawVertexCount, `${path}.rawVertexCount`);
    if (logical !== null && raw !== null && raw < logical) errors.push(`${path}.rawVertexCount must be at least logicalVertexCount`);
    requireHash(errors, region.boundarySha256, `${path}.boundarySha256`);
    requireHash(errors, region.membershipSha256, `${path}.membershipSha256`);
  });
}

function validateAuthoringRig(errors: string[], value: unknown): void {
  const path = "receipt.authoringRig";
  const rig = requireRecord(errors, value, path);
  if (!rig) return;
  if (rig.system !== "BLENDER_RIGIFY") errors.push(`${path}.system must equal BLENDER_RIGIFY`);
  if (rig.runtimeArmaturePolicy !== "SEPARATE_AUTHORING_RIG") errors.push(`${path}.runtimeArmaturePolicy must equal SEPARATE_AUTHORING_RIG`);
  requireString(errors, rig.blenderVersion, `${path}.blenderVersion`);
  requireString(errors, rig.rigifyVersion, `${path}.rigifyVersion`);
  requireHash(errors, rig.fitAggregateSha256, `${path}.fitAggregateSha256`);
  if (!Array.isArray(rig.modules)) {
    errors.push(`${path}.modules must be an array`);
    return;
  }
  const moduleNames = rig.modules.map((module) => record(module)?.module);
  if (!sameExactNames(moduleNames, REQUIRED_RIGIFY_AUTHORING_MODULES)) {
    errors.push(`${path}.modules must contain exactly face.skin_eye, face.skin_jaw, face.basic_tongue, skin.stretchy_chain in canonical order`);
  }
  rig.modules.forEach((value, index) => {
    const modulePath = `${path}.modules[${index}]`;
    const module = requireRecord(errors, value, modulePath);
    if (!module) return;
    if (!RIGIFY_MODULE_SET.has(String(module.module))) errors.push(`${modulePath}.module is not an approved Rigify module`);
    positiveInteger(errors, module.instanceCount, `${modulePath}.instanceCount`);
    positiveInteger(errors, module.generatedBoneCount, `${modulePath}.generatedBoneCount`);
    positiveInteger(errors, module.controlCount, `${modulePath}.controlCount`);
    requireHash(errors, module.fitSha256, `${modulePath}.fitSha256`);
    requireTrue(errors, module.authoringOnly, `${modulePath}.authoringOnly`);
    requireTrue(errors, module.strippedBeforeExport, `${modulePath}.strippedBeforeExport`);
  });
}

function validateTargets(errors: string[], value: unknown): void {
  const targets = requireRecord(errors, value, "receipt.targets");
  if (!targets) return;
  const arkit = validateExactTargetSet(errors, targets.arkit, ARKIT_FACIAL_MORPH_NAMES, "receipt.targets.arkit");
  const visemes = validateExactTargetSet(errors, targets.metaVisemes, BAKED_META_VISEME_MORPH_NAMES, "receipt.targets.metaVisemes");
  if (record(targets.metaVisemes)?.silenceRepresentation !== "ZERO_WEIGHT_NO_GEOMETRY") {
    errors.push("receipt.targets.metaVisemes.silenceRepresentation must equal ZERO_WEIGHT_NO_GEOMETRY");
  }
  const proofByName = requireRecord(errors, targets.proofByName, "receipt.targets.proofByName");
  if (!proofByName) return;
  if (!sameExactNames(Object.keys(proofByName).sort(), [...ALL_TARGET_NAMES].sort())) {
    errors.push("receipt.targets.proofByName must contain exactly all 66 standardized facial targets");
  }
  const arkitHashes = record(arkit?.targetSha256ByName);
  const visemeHashes = record(visemes?.targetSha256ByName);
  for (const name of ALL_TARGET_NAMES) {
    validateTargetProof(errors, proofByName[name], name, arkitHashes?.[name] ?? visemeHashes?.[name]);
  }
}

function validateCriticalCombinations(errors: string[], value: unknown): void {
  const path = "receipt.criticalCombinationProof";
  const combinations = requireRecord(errors, value, path);
  if (!combinations) return;
  requireHash(errors, combinations.aggregateSha256, `${path}.aggregateSha256`);
  const coverage = requireRecord(errors, combinations.coverage, `${path}.coverage`);
  for (const field of ["bilateralBlink", "blinkGazeSpeech", "jawWithSpeech"]) {
    requireTrue(errors, coverage?.[field], `${path}.coverage.${field}`);
  }
  const proofByName = requireRecord(errors, combinations.proofByName, `${path}.proofByName`);
  if (!proofByName || Object.keys(proofByName).length < 3) {
    errors.push(`${path}.proofByName must contain at least three critical combination proofs`);
    return;
  }
  let bilateralBlink = false;
  let jawWithSpeech = false;
  let blinkGazeSpeech = false;
  for (const [name, value] of Object.entries(proofByName)) {
    const proofPath = `${path}.proofByName.${name}`;
    const proof = requireRecord(errors, value, proofPath);
    if (!proof) continue;
    if (proof.status !== "PASS") errors.push(`${proofPath}.status must equal PASS`);
    requireHash(errors, proof.geometrySha256, `${proofPath}.geometrySha256`);
    requireHash(errors, proof.proofSha256, `${proofPath}.proofSha256`);
    validateStructuralGates(errors, proof.gates, `${proofPath}.gates`);
    const weights = requireRecord(errors, proof.targetWeights, `${proofPath}.targetWeights`);
    if (!weights || Object.keys(weights).length < 2) {
      errors.push(`${proofPath}.targetWeights must contain at least two target weights`);
      continue;
    }
    const active = new Set<string>();
    for (const [targetName, targetWeight] of Object.entries(weights)) {
      if (!ALL_TARGET_NAME_SET.has(targetName)) errors.push(`${proofPath}.targetWeights.${targetName} is not a standardized facial target`);
      const weight = positive(errors, targetWeight, `${proofPath}.targetWeights.${targetName}`);
      if (weight !== null && weight > 1) errors.push(`${proofPath}.targetWeights.${targetName} must be at most 1`);
      if (weight !== null && weight <= 1) active.add(targetName);
    }
    const hasBlink = active.has("eyeBlinkLeft") || active.has("eyeBlinkRight");
    const hasGaze = [...active].some((targetName) => GAZE_TARGET_SET.has(targetName));
    const hasViseme = [...active].some((targetName) => BAKED_META_VISEME_MORPH_NAMES.some((viseme) => viseme === targetName));
    bilateralBlink ||= active.has("eyeBlinkLeft") && active.has("eyeBlinkRight");
    jawWithSpeech ||= active.has("jawOpen") && hasViseme;
    blinkGazeSpeech ||= hasBlink && hasGaze && hasViseme;
  }
  if (!bilateralBlink) errors.push(`${path}.proofByName must prove bilateral blink coexistence`);
  if (!jawWithSpeech) errors.push(`${path}.proofByName must prove jawOpen with a speech viseme`);
  if (!blinkGazeSpeech) errors.push(`${path}.proofByName must prove blink, gaze, and speech coexistence`);
}

function validateOralAnatomy(errors: string[], value: unknown): void {
  const path = "receipt.oralAnatomy";
  const oral = requireRecord(errors, value, path);
  if (!oral) return;
  if (oral.status !== "PASS") errors.push(`${path}.status must equal PASS`);
  if (oral.tongueControlModule !== "face.basic_tongue") errors.push(`${path}.tongueControlModule must equal face.basic_tongue`);
  if (oral.lipControlModule !== "skin.stretchy_chain") errors.push(`${path}.lipControlModule must equal skin.stretchy_chain`);
  requireHash(errors, oral.componentIsolationSha256, `${path}.componentIsolationSha256`);
  const cavityDepth = positive(errors, oral.mouthCavityDepthMeters, `${path}.mouthCavityDepthMeters`);
  if (cavityDepth !== null && cavityDepth < 0.003) errors.push(`${path}.mouthCavityDepthMeters must be at least 0.003`);
  const opening = positive(errors, oral.jawOpenCentralGapIncreaseMeters, `${path}.jawOpenCentralGapIncreaseMeters`);
  if (opening !== null && opening < 0.002) errors.push(`${path}.jawOpenCentralGapIncreaseMeters must be at least 0.002`);
  const lipSeal = nonNegative(errors, oral.neutralLipSealMaximumGapMeters, `${path}.neutralLipSealMaximumGapMeters`);
  if (lipSeal !== null && lipSeal > MAXIMUM_LOCKED_SEAM_DELTA_METERS) errors.push(`${path}.neutralLipSealMaximumGapMeters must be at most ${MAXIMUM_LOCKED_SEAM_DELTA_METERS}`);
  requireZero(errors, oral.maximumInterpenetrationMeters, `${path}.maximumInterpenetrationMeters`);
  requireZero(errors, oral.nonFiniteValueCount, `${path}.nonFiniteValueCount`);
  const components = requireRecord(errors, oral.components, `${path}.components`);
  const expected = ["lowerTeeth", "mouthCavity", "tongue", "upperTeeth"];
  if (!components || !sameExactNames(Object.keys(components).sort(), expected)) {
    errors.push(`${path}.components must contain exactly mouthCavity, upperTeeth, lowerTeeth, and tongue`);
    return;
  }
  const meshNames = new Set<string>();
  for (const name of expected) {
    const componentPath = `${path}.components.${name}`;
    const component = requireRecord(errors, components[name], componentPath);
    if (!component) continue;
    const meshName = requireString(errors, component.meshName, `${componentPath}.meshName`);
    if (meshName !== null) {
      if (meshNames.has(meshName)) errors.push(`${path}.components must use distinct mesh names`);
      meshNames.add(meshName);
    }
    positiveInteger(errors, component.vertexCount, `${componentPath}.vertexCount`);
    positiveInteger(errors, component.polygonCount, `${componentPath}.polygonCount`);
    requireHash(errors, component.topologySha256, `${componentPath}.topologySha256`);
    requireHash(errors, component.materialSha256, `${componentPath}.materialSha256`);
  }
}

function validateNeutralProof(errors: string[], value: unknown, basis: Record<string, unknown> | null): void {
  const path = "receipt.neutralStructuralProof";
  const proof = requireRecord(errors, value, path);
  if (!proof) return;
  if (proof.status !== "PASS") errors.push(`${path}.status must equal PASS`);
  requireHash(errors, proof.proofSha256, `${path}.proofSha256`);
  for (const field of ["basisSha256", "materialSha256", "normalSha256", "skinWeightSha256", "topologySha256", "uvSha256"]) {
    requireHash(errors, proof[field], `${path}.${field}`);
    if (basis && proof[field] !== basis[field]) errors.push(`${path}.${field} must equal basis.${field}`);
  }
  for (const field of ["vertexCount", "polygonCount"]) {
    positiveInteger(errors, proof[field], `${path}.${field}`);
    if (basis && proof[field] !== basis[field]) errors.push(`${path}.${field} must equal basis.${field}`);
  }
  for (const field of ["coordinateDuplicateSplitCount", "newNonadjacentSelfOverlapCount", "nonFiniteValueCount", "openTearCount", "triangleFlipCount"]) {
    requireZero(errors, proof[field], `${path}.${field}`);
  }
  for (const field of ["coordinateDuplicateMaximumSplitMeters", "neckSeamMaximumDeltaMeters"]) {
    const delta = nonNegative(errors, proof[field], `${path}.${field}`);
    if (delta !== null && delta > MAXIMUM_LOCKED_SEAM_DELTA_METERS) errors.push(`${path}.${field} must be at most ${MAXIMUM_LOCKED_SEAM_DELTA_METERS}`);
  }
}

function validateAuthoringStrip(errors: string[], value: unknown): void {
  const path = "receipt.authoringStrip";
  const strip = requireRecord(errors, value, path);
  if (!strip) return;
  if (strip.status !== "PASS") errors.push(`${path}.status must equal PASS`);
  for (const field of ["embeddedAuthoringActionCount", "metaObjectCount", "rigifyConstraintCount", "rigifyDriverCount", "rigifyGeneratedBoneCount", "rigifyModifierCount", "rigObjectCount"]) {
    requireZero(errors, strip[field], `${path}.${field}`);
  }
}

function validateFreshImport(
  errors: string[],
  value: unknown,
  output: Record<string, unknown> | null,
  basis: Record<string, unknown> | null,
  basisSkeleton: Record<string, unknown> | null,
  targets: Record<string, unknown> | null,
): void {
  const path = "receipt.freshImport";
  const fresh = requireRecord(errors, value, path);
  if (!fresh) return;
  if (fresh.status !== "PASS") errors.push(`${path}.status must equal PASS`);
  requireTrue(errors, fresh.cleanBlenderProcess, `${path}.cleanBlenderProcess`);
  if (fresh.importer !== "BLENDER_GLTF_2_0") errors.push(`${path}.importer must equal BLENDER_GLTF_2_0`);
  if (fresh.armatureCount !== 1) errors.push(`${path}.armatureCount must equal 1`);
  requireZero(errors, fresh.authoringRigObjectCount, `${path}.authoringRigObjectCount`);
  positiveInteger(errors, fresh.meshObjectCount, `${path}.meshObjectCount`);
  if (fresh.morphTargetCount !== ALL_TARGET_NAMES.length) errors.push(`${path}.morphTargetCount must equal ${ALL_TARGET_NAMES.length}`);
  requireHash(errors, fresh.equivalenceSha256, `${path}.equivalenceSha256`);
  const outputHash = requireHash(errors, fresh.outputSha256, `${path}.outputSha256`);
  if (output && outputHash !== null && outputHash !== output.sha256) errors.push(`${path}.outputSha256 must equal output.sha256`);
  const skeleton = validateSkeleton(errors, fresh.skeleton, `${path}.skeleton`);
  if (skeleton && basisSkeleton) {
    for (const field of ["boneCount", "rootBone", "hierarchySha256", "restTransformsSha256"]) {
      if (skeleton[field] !== basisSkeleton[field]) errors.push(`${path}.skeleton.${field} must equal basis.skeleton.${field}`);
    }
  }
  const freshBasis = requireRecord(errors, fresh.basis, `${path}.basis`);
  if (freshBasis) {
    for (const field of ["basisSha256", "materialSha256", "normalSha256", "skinWeightSha256", "topologySha256", "uvSha256"]) {
      requireHash(errors, freshBasis[field], `${path}.basis.${field}`);
      if (basis && freshBasis[field] !== basis[field]) errors.push(`${path}.basis.${field} must equal basis.${field}`);
    }
    for (const field of ["vertexCount", "polygonCount"]) {
      positiveInteger(errors, freshBasis[field], `${path}.basis.${field}`);
      if (basis && freshBasis[field] !== basis[field]) errors.push(`${path}.basis.${field} must equal basis.${field}`);
    }
  }
  const freshTargets = validateExactTargetSet(errors, fresh.targets, ALL_TARGET_NAMES, `${path}.targets`);
  const freshHashes = record(freshTargets?.targetSha256ByName);
  const arkitHashes = record(record(targets?.arkit)?.targetSha256ByName);
  const visemeHashes = record(record(targets?.metaVisemes)?.targetSha256ByName);
  if (freshHashes) {
    for (const name of ALL_TARGET_NAMES) {
      if (freshHashes[name] !== (arkitHashes?.[name] ?? visemeHashes?.[name])) {
        errors.push(`${path}.targets.targetSha256ByName.${name} must match the authored target hash`);
      }
    }
  }
}

function validateRuntime(errors: string[], value: unknown, output: Record<string, unknown> | null): void {
  const path = "receipt.runtimeResolution";
  const runtime = requireRecord(errors, value, path);
  if (!runtime) return;
  requireHash(errors, runtime.aggregateProbeSha256, `${path}.aggregateProbeSha256`);
  requireHash(errors, runtime.aggregateRenderSha256, `${path}.aggregateRenderSha256`);
  const canonicalHeadAssetId = requireString(errors, runtime.canonicalHeadAssetId, `${path}.canonicalHeadAssetId`);
  const controlContractSha256 = requireHash(errors, runtime.controlContractSha256, `${path}.controlContractSha256`);
  if (output && canonicalHeadAssetId !== null && canonicalHeadAssetId !== output.assetId) errors.push(`${path}.canonicalHeadAssetId must equal output.assetId`);
  const surfaces = requireRecord(errors, runtime.surfaces, `${path}.surfaces`);
  if (!surfaces || !sameExactNames(Object.keys(surfaces).sort(), [...REQUIRED_FACIAL_RUNTIME_SURFACES].sort())) {
    errors.push(`${path}.surfaces must contain exactly the required creator/runtime surfaces`);
    return;
  }
  for (const surfaceName of REQUIRED_FACIAL_RUNTIME_SURFACES) {
    const surfacePath = `${path}.surfaces.${surfaceName}`;
    const surface = requireRecord(errors, surfaces[surfaceName], surfacePath);
    if (!surface) continue;
    if (surface.capabilityStatus !== "READY") errors.push(`${surfacePath}.capabilityStatus must equal READY`);
    if (canonicalHeadAssetId !== null && surface.canonicalHeadAssetId !== canonicalHeadAssetId) errors.push(`${surfacePath}.canonicalHeadAssetId must resolve the canonical head`);
    if (controlContractSha256 !== null && surface.controlContractSha256 !== controlContractSha256) errors.push(`${surfacePath}.controlContractSha256 must resolve the canonical controls`);
    const probe = requireRecord(errors, surface.probe, `${surfacePath}.probe`);
    if (probe) {
      if (probe.status !== "PASS") errors.push(`${surfacePath}.probe.status must equal PASS`);
      if (probe.executionMode !== "REAL_THREE_WEBGL_RUNTIME") errors.push(`${surfacePath}.probe.executionMode must equal REAL_THREE_WEBGL_RUNTIME`);
      requireHash(errors, probe.probeSha256, `${surfacePath}.probe.probeSha256`);
      requireHash(errors, probe.morphDictionarySha256, `${surfacePath}.probe.morphDictionarySha256`);
      const loadedHash = requireHash(errors, probe.loadedOutputSha256, `${surfacePath}.probe.loadedOutputSha256`);
      if (output && loadedHash !== null && loadedHash !== output.sha256) errors.push(`${surfacePath}.probe.loadedOutputSha256 must equal output.sha256`);
      positiveInteger(errors, probe.animatedMeshCount, `${surfacePath}.probe.animatedMeshCount`);
      if (probe.morphTargetCount !== ALL_TARGET_NAMES.length) errors.push(`${surfacePath}.probe.morphTargetCount must equal ${ALL_TARGET_NAMES.length}`);
      if (!sameExactNames(probe.availableMorphNames, ALL_TARGET_NAMES)) errors.push(`${surfacePath}.probe.availableMorphNames must equal all standardized targets in canonical order`);
      if (!Array.isArray(probe.missingMorphNames) || probe.missingMorphNames.length !== 0) errors.push(`${surfacePath}.probe.missingMorphNames must be empty`);
      const capabilities = requireRecord(errors, probe.capabilities, `${surfacePath}.probe.capabilities`);
      for (const capability of ["blink", "gaze", "speech"]) requireTrue(errors, capabilities?.[capability], `${surfacePath}.probe.capabilities.${capability}`);
    }
    const render = requireRecord(errors, surface.render, `${surfacePath}.render`);
    if (render) {
      if (render.status !== "PASS") errors.push(`${surfacePath}.render.status must equal PASS`);
      if (render.renderer !== "THREE_WEBGLRENDERER") errors.push(`${surfacePath}.render.renderer must equal THREE_WEBGLRENDERER`);
      requireHash(errors, render.cameraSha256, `${surfacePath}.render.cameraSha256`);
      requireHash(errors, render.renderSha256, `${surfacePath}.render.renderSha256`);
      positiveInteger(errors, render.widthPixels, `${surfacePath}.render.widthPixels`);
      positiveInteger(errors, render.heightPixels, `${surfacePath}.render.heightPixels`);
      positiveInteger(errors, render.nonBackgroundPixelCount, `${surfacePath}.render.nonBackgroundPixelCount`);
    }
  }
}

export function validateHumanoidFacialFitReceipt(value: unknown): HumanoidFacialFitValidation {
  const errors: string[] = [];
  const receipt = requireRecord(errors, value, "receipt");
  if (!receipt) return { valid: false, errors };
  if (receipt.schema === HUMANOID_FACIAL_FIT_RECEIPT_V1_SCHEMA) {
    return { valid: false, errors: [HUMANOID_FACIAL_FIT_V1_AUDIT_ONLY_ERROR] };
  }
  if (receipt.schema !== HUMANOID_FACIAL_FIT_RECEIPT_SCHEMA) {
    errors.push(`receipt.schema must equal ${HUMANOID_FACIAL_FIT_RECEIPT_SCHEMA}`);
  }
  for (const obsoleteField of ["registration", "derivativeProof"]) {
    if (obsoleteField in receipt) errors.push(`receipt.${obsoleteField} is obsolete in v2 and must not be used for promotion`);
  }
  positiveInteger(errors, receipt.issue, "receipt.issue");
  if (receipt.status !== "PASS") errors.push("receipt.status must equal PASS");
  requireString(errors, receipt.headId, "receipt.headId");

  const inputs = requireRecord(errors, receipt.inputs, "receipt.inputs");
  validateArtifact(errors, inputs?.acceptedBody, "receipt.inputs.acceptedBody");
  validateArtifact(errors, inputs?.acceptedSmartMesh, "receipt.inputs.acceptedSmartMesh");
  const extractedHead = validateArtifact(errors, inputs?.extractedHead, "receipt.inputs.extractedHead");

  const basis = requireRecord(errors, receipt.basis, "receipt.basis");
  for (const field of ["basisSha256", "materialSha256", "neckSeamSha256", "normalSha256", "skinWeightSha256", "sourceExtractedHeadSha256", "topologySha256", "uvSha256"]) {
    requireHash(errors, basis?.[field], `receipt.basis.${field}`);
  }
  requireString(errors, basis?.neckSeamVersion, "receipt.basis.neckSeamVersion");
  positiveInteger(errors, basis?.vertexCount, "receipt.basis.vertexCount");
  positiveInteger(errors, basis?.polygonCount, "receipt.basis.polygonCount");
  const basisSkeleton = validateSkeleton(errors, basis?.skeleton, "receipt.basis.skeleton");
  if (basis && extractedHead && basis.sourceExtractedHeadSha256 !== extractedHead.sha256) {
    errors.push("receipt.basis.sourceExtractedHeadSha256 must equal inputs.extractedHead.sha256");
  }

  const measurements = requireRecord(errors, receipt.measurements, "receipt.measurements");
  if (measurements?.axes !== "RIGHT_HANDED_X_LATERAL_Y_VERTICAL_Z_DEPTH") errors.push("receipt.measurements.axes must equal RIGHT_HANDED_X_LATERAL_Y_VERTICAL_Z_DEPTH");
  positive(errors, measurements?.headHeightMeters, "receipt.measurements.headHeightMeters");
  positive(errors, measurements?.interocularDistanceMeters, "receipt.measurements.interocularDistanceMeters");
  positive(errors, measurements?.unitScaleMeters, "receipt.measurements.unitScaleMeters");
  positiveInteger(errors, measurements?.neckSeamVertexCount, "receipt.measurements.neckSeamVertexCount");
  if (!Array.isArray(measurements?.originMeters) || measurements.originMeters.length !== 3 || measurements.originMeters.some((coordinate) => typeof coordinate !== "number" || !Number.isFinite(coordinate))) {
    errors.push("receipt.measurements.originMeters must contain three finite coordinates");
  }

  validateTopologyAndSemanticFit(errors, receipt, inputs, basis);
  validateAuthoringRig(errors, receipt.authoringRig);
  validateTargets(errors, receipt.targets);
  validateCriticalCombinations(errors, receipt.criticalCombinationProof);
  validateOralAnatomy(errors, receipt.oralAnatomy);
  validateNeutralProof(errors, receipt.neutralStructuralProof, basis);
  const output = validateArtifact(errors, receipt.output, "receipt.output");
  validateAuthoringStrip(errors, receipt.authoringStrip);
  validateFreshImport(errors, receipt.freshImport, output, basis, basisSkeleton, record(receipt.targets));
  validateRuntime(errors, receipt.runtimeResolution, output);
  return { valid: errors.length === 0, errors };
}
