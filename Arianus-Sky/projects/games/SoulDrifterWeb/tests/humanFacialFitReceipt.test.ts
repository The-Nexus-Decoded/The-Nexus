import { describe, expect, it } from "vitest";

import {
  ARKIT_FACIAL_MORPH_NAMES,
  BAKED_META_VISEME_MORPH_NAMES,
} from "../src/game/facialAnimationDriver";
import {
  ANALYTIC_DERIVATIVE_RELATIVE_TOLERANCE,
  HUMANOID_FACIAL_FIT_RECEIPT_SCHEMA,
  REQUIRED_FACIAL_RUNTIME_SURFACES,
  type HumanoidFacialFitReceipt,
  validateHumanoidFacialFitReceipt,
} from "../src/game/humanFacialFitReceipt";

const HASH = "A".repeat(64);
const HEAD_ASSET_ID = "human-foundation-pilot-head-v3";
const CONTROL_CONTRACT_SHA256 = "B".repeat(64);

function targetHashes(names: readonly string[]): Readonly<Record<string, string>> {
  return Object.fromEntries(names.map((name) => [name, HASH]));
}

function passingReceipt(
  measurements: HumanoidFacialFitReceipt["measurements"] = {
    axes: "RIGHT_HANDED_X_LATERAL_Y_VERTICAL_Z_DEPTH",
    headHeightMeters: 0.238,
    interocularDistanceMeters: 0.063,
    neckSeamVertexCount: 64,
    originMeters: [0.012, -0.374, 0.007],
    unitScaleMeters: 1,
  },
): HumanoidFacialFitReceipt {
  const skeleton = {
    boneCount: 65,
    hierarchySha256: HASH,
    restTransformsSha256: HASH,
    rootBone: "mixamorig:Hips",
  } as const;
  const surfaces = Object.fromEntries(REQUIRED_FACIAL_RUNTIME_SURFACES.map((surface) => [
    surface,
    {
      canonicalHeadAssetId: HEAD_ASSET_ID,
      controlContractSha256: CONTROL_CONTRACT_SHA256,
      status: "PASS",
    },
  ])) as HumanoidFacialFitReceipt["runtimeResolution"]["surfaces"];

  return {
    schema: HUMANOID_FACIAL_FIT_RECEIPT_SCHEMA,
    issue: 487,
    status: "PASS",
    headId: "human-foundation-pilot",
    inputs: {
      acceptedBody: { assetId: "human-foundation-pilot-body", sha256: HASH },
      acceptedSmartMesh: { assetId: "tripo-smart-mesh-079291c6", sha256: HASH },
      extractedHead: { assetId: "human-foundation-pilot-extracted-head", sha256: HASH },
    },
    basis: {
      basisSha256: HASH,
      materialSha256: HASH,
      neckSeamSha256: HASH,
      neckSeamVersion: "human-foundation-neck-seam-v1",
      normalSha256: HASH,
      polygonCount: 6264,
      skinWeightSha256: HASH,
      sourceExtractedHeadSha256: HASH,
      topologySha256: HASH,
      uvSha256: HASH,
      vertexCount: 6025,
      skeleton,
    },
    measurements,
    targets: {
      arkit: {
        aggregateSha256: HASH,
        names: [...ARKIT_FACIAL_MORPH_NAMES],
        targetSha256ByName: targetHashes(ARKIT_FACIAL_MORPH_NAMES),
      },
      metaVisemes: {
        aggregateSha256: HASH,
        names: [...BAKED_META_VISEME_MORPH_NAMES],
        targetSha256ByName: targetHashes(BAKED_META_VISEME_MORPH_NAMES),
        silenceRepresentation: "ZERO_WEIGHT_NO_GEOMETRY",
      },
    },
    registration: {
      correspondenceSha256: HASH,
      semanticNeighborhoods: [{
        id: "left-eye-complete-support",
        affectedTransferSampleCount: 143,
        controlCount: 24,
        coverageComplete: true,
        minimumSourceSingularValue: 0.018,
        minimumTargetSingularValue: 0.0012,
        nonCoplanar: true,
        selectionMethod: "TOPOLOGY_GEODESIC",
        sourceRank: 3,
        supportVertexCount: 636,
        targetRank: 3,
        crossValidation: {
          exactFiniteSecantSampleCount: 143,
          heldOutControlCount: 24,
          localTargetLandmarkSpacingMeters: 0.01,
          maximumDisplacementDisagreementMeters: 0.0015,
          maximumHeldOutPositionErrorMeters: 0.001,
          minimumMovementDirectionDot: 0.81,
          movementDirectionReversalCount: 0,
          normalizedMaximumHeldOutPositionError: 0.1,
          numericalRoundoffMeters: 1e-12,
          orientationReversalCount: 0,
        },
      }],
    },
    derivativeProof: {
      analyticMethod: "ANALYTIC_POLYHARMONIC_R3",
      maximumConditionNumber: 84,
      minimumDeterminant: 0.00001,
      nonFiniteDerivativeCount: 0,
      orientationReversalCount: 0,
      sampleCounts: {
        adaptiveTriangleSamples: 512,
        controls: 16,
        supportVertices: 128,
        transferSamples: 256,
        uncertifiedTriangles: 0,
      },
      centralDifferenceConvergence: {
        maximumRelativeError: ANALYTIC_DERIVATIVE_RELATIVE_TOLERANCE / 2,
        method: "SYMMETRIC_CENTRAL_DIFFERENCE_V1",
        sampleCount: 912,
        stepMultipliers: [0.5, 1, 2],
        stepStrategy: "CBRT_EPSILON_TIMES_LOCKED_ANATOMICAL_SCALE",
      },
    },
    structuralProof: {
      coordinateDuplicateMaximumSplitMeters: 0,
      coordinateDuplicateSplitCount: 0,
      neckSeamMaximumDeltaMeters: 0,
      newNonadjacentSelfOverlapCount: 0,
      nonFiniteValueCount: 0,
      openTearCount: 0,
      semanticBoundaryCrossingCount: 0,
      triangleFlipCount: 0,
    },
    output: { assetId: HEAD_ASSET_ID, sha256: HASH },
    authoringStrip: {
      embeddedAuthoringActionCount: 0,
      metaObjectCount: 0,
      rigifyConstraintCount: 0,
      rigifyDriverCount: 0,
      rigifyGeneratedBoneCount: 0,
      rigifyModifierCount: 0,
      rigObjectCount: 0,
      status: "PASS",
    },
    freshImport: {
      armatureCount: 1,
      cleanBlenderProcess: true,
      outputSha256: HASH,
      skeleton,
      status: "PASS",
    },
    runtimeResolution: {
      canonicalHeadAssetId: HEAD_ASSET_ID,
      controlContractSha256: CONTROL_CONTRACT_SHA256,
      surfaces,
    },
  };
}

function errors(receipt: unknown): readonly string[] {
  return validateHumanoidFacialFitReceipt(receipt).errors;
}

describe("reusable humanoid facial-fit receipt gate", () => {
  it("accepts a complete receipt and varying per-head measurements", () => {
    expect(validateHumanoidFacialFitReceipt(passingReceipt())).toEqual({ valid: true, errors: [] });
    expect(validateHumanoidFacialFitReceipt(passingReceipt({
      axes: "RIGHT_HANDED_X_LATERAL_Y_VERTICAL_Z_DEPTH",
      headHeightMeters: 0.31,
      interocularDistanceMeters: 0.074,
      neckSeamVertexCount: 80,
      originMeters: [-0.02, 0.41, 0.013],
      unitScaleMeters: 0.01,
    }))).toEqual({ valid: true, errors: [] });
  });

  it("rejects changed signatures, incomplete standardized targets, and stale skeleton imports", () => {
    const receipt = structuredClone(passingReceipt()) as unknown as Record<string, any>;
    receipt.basis.sourceExtractedHeadSha256 = "C".repeat(64);
    receipt.targets.arkit.names.pop();
    delete receipt.targets.arkit.targetSha256ByName.tongueOut;
    receipt.freshImport.armatureCount = 2;
    receipt.freshImport.skeleton = {
      ...receipt.freshImport.skeleton,
      boneCount: 66,
      hierarchySha256: "D".repeat(64),
    };

    expect(errors(receipt)).toEqual(expect.arrayContaining([
      "receipt.basis.sourceExtractedHeadSha256 must equal inputs.extractedHead.sha256",
      "receipt.targets.arkit.names must equal the exact 52-name standardized set in canonical order",
      "receipt.targets.arkit.targetSha256ByName must contain exactly the standardized target names",
      "receipt.freshImport.armatureCount must equal 1",
      "receipt.freshImport.skeleton.boneCount must equal 65",
      "receipt.freshImport.skeleton.hierarchySha256 must match basis.skeleton.hierarchySha256",
    ]));
  });

  it("rejects folds, derivative drift, rank-deficient neighborhoods, and unsupported LOO motion", () => {
    const receipt = structuredClone(passingReceipt()) as unknown as Record<string, any>;
    receipt.derivativeProof.minimumDeterminant = -0.0001;
    receipt.derivativeProof.orientationReversalCount = 1;
    receipt.derivativeProof.centralDifferenceConvergence.maximumRelativeError =
      ANALYTIC_DERIVATIVE_RELATIVE_TOLERANCE * 2;
    const neighborhood = receipt.registration.semanticNeighborhoods[0];
    neighborhood.sourceRank = 2;
    neighborhood.nonCoplanar = false;
    neighborhood.crossValidation.movementDirectionReversalCount = 1;
    neighborhood.crossValidation.minimumMovementDirectionDot = -0.2;
    neighborhood.crossValidation.maximumDisplacementDisagreementMeters = 0.003;

    expect(errors(receipt)).toEqual(expect.arrayContaining([
      "receipt.derivativeProof.minimumDeterminant must be greater than zero",
      "receipt.derivativeProof.orientationReversalCount must equal 0",
      "receipt.derivativeProof.centralDifferenceConvergence.maximumRelativeError exceeds the versioned cbrt(epsilon) tolerance",
      "registration.semanticNeighborhoods[0].sourceRank must equal 3",
      "registration.semanticNeighborhoods[0].nonCoplanar must equal true",
      "registration.semanticNeighborhoods[0].crossValidation.movementDirectionReversalCount must equal 0",
      "registration.semanticNeighborhoods[0].crossValidation.minimumMovementDirectionDot must be greater than zero",
      "registration.semanticNeighborhoods[0].crossValidation displacement disagreement exceeds twice held-out error plus roundoff",
    ]));
  });

  it("rejects seam damage, duplicate splits, mesh damage, authoring residue, and divergent surfaces", () => {
    const receipt = structuredClone(passingReceipt()) as unknown as Record<string, any>;
    receipt.structuralProof.neckSeamMaximumDeltaMeters = 0.00001;
    receipt.structuralProof.coordinateDuplicateSplitCount = 1;
    receipt.structuralProof.triangleFlipCount = 2;
    receipt.structuralProof.newNonadjacentSelfOverlapCount = 1;
    receipt.authoringStrip.rigObjectCount = 1;
    receipt.authoringStrip.rigifyGeneratedBoneCount = 12;
    receipt.runtimeResolution.surfaces.dialogue.canonicalHeadAssetId = "different-head";
    receipt.runtimeResolution.surfaces.quest.controlContractSha256 = "C".repeat(64);

    expect(errors(receipt)).toEqual(expect.arrayContaining([
      "receipt.structuralProof.neckSeamMaximumDeltaMeters must be between 0 and 0.000001",
      "receipt.structuralProof.coordinateDuplicateSplitCount must equal 0",
      "receipt.structuralProof.triangleFlipCount must equal 0",
      "receipt.structuralProof.newNonadjacentSelfOverlapCount must equal 0",
      "receipt.authoringStrip.rigObjectCount must equal 0",
      "receipt.authoringStrip.rigifyGeneratedBoneCount must equal 0",
      "receipt.runtimeResolution.surfaces.dialogue.canonicalHeadAssetId must resolve the canonical head",
      "receipt.runtimeResolution.surfaces.quest.controlContractSha256 must resolve the canonical controls",
    ]));
  });
});
