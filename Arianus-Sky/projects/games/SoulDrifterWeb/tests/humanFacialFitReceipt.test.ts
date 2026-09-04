import { describe, expect, it } from "vitest";

import {
  ARKIT_FACIAL_MORPH_NAMES,
  BAKED_META_VISEME_MORPH_NAMES,
  DIALOGUE_FACIAL_MORPH_NAMES,
} from "../src/game/facialAnimationDriver";
import {
  CANONICAL_FACIAL_SWEEP_WEIGHTS,
  HUMANOID_FACIAL_FIT_RECEIPT_SCHEMA,
  HUMANOID_FACIAL_FIT_RECEIPT_V1_SCHEMA,
  HUMANOID_FACIAL_FIT_V1_AUDIT_ONLY_ERROR,
  REQUIRED_EXACT_HEAD_SEMANTIC_REGIONS,
  REQUIRED_FACIAL_RUNTIME_SURFACES,
  REQUIRED_RIGIFY_AUTHORING_MODULES,
  type HumanoidFacialFitReceipt,
  validateHumanoidFacialFitReceipt,
} from "../src/game/humanFacialFitReceipt";

const HASH = "A".repeat(64);
const OTHER_HASH = "B".repeat(64);
const HEAD_ASSET_ID = "human-foundation-pilot-head-v4";
const CONTROL_CONTRACT_SHA256 = "C".repeat(64);

function targetHashes(names: readonly string[]): Readonly<Record<string, string>> {
  return Object.fromEntries(names.map((name) => [name, HASH]));
}

function structuralGates() {
  return {
    coordinateDuplicateSplitCount: 0,
    duplicateParityMaximumDeltaMeters: 0,
    neckSeamMaximumDeltaMeters: 0,
    newNonadjacentSelfOverlapCount: 0,
    nonFiniteValueCount: 0,
    openTearCount: 0,
    outsideSemanticRegionMaximumDeltaMeters: 0,
    proofSha256: HASH,
    semanticBoundaryCrossingCount: 0,
    status: "PASS" as const,
    triangleFlipCount: 0,
  };
}

function sweepSample(weight: number) {
  return {
    affectedLogicalVertexCount: weight === 0 ? 0 : 128,
    deltaSha256: HASH,
    gates: structuralGates(),
    geometrySha256: HASH,
    maximumDeltaMeters: weight * 0.01,
    status: "PASS" as const,
    weight,
  };
}

function proofForTarget(name: string) {
  let semanticRegionIds: readonly string[] = ["jaw"];
  let authoringModules: readonly (typeof REQUIRED_RIGIFY_AUTHORING_MODULES[number])[] = ["face.skin_jaw"];
  if (name.startsWith("eye") || name.startsWith("brow")) {
    semanticRegionIds = [name.endsWith("Right") ? "rightEye" : "leftEye"];
    authoringModules = ["face.skin_eye"];
  } else if (name === "tongueOut") {
    semanticRegionIds = ["tongue"];
    authoringModules = ["face.basic_tongue"];
  } else if (name.startsWith("mouth") || name.startsWith("viseme_")) {
    semanticRegionIds = ["mouthUpper", "mouthLower", "jaw"];
    authoringModules = ["face.skin_jaw", "skin.stretchy_chain"];
  }
  return {
    authoringModules,
    semanticRegionIds,
    targetSha256: HASH,
    sweep: {
      adaptiveSamples: [],
      canonicalSamples: CANONICAL_FACIAL_SWEEP_WEIGHTS.map(sweepSample),
      canonicalWeights: [...CANONICAL_FACIAL_SWEEP_WEIGHTS] as [0, 0.25, 0.5, 0.75, 1],
      sweepSha256: HASH,
      uncertifiedIntervalCount: 0,
    },
  };
}

function oralComponent(meshName: string) {
  return {
    materialSha256: HASH,
    meshName,
    polygonCount: 96,
    topologySha256: HASH,
    vertexCount: 64,
  };
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
  quadMode: HumanoidFacialFitReceipt["topologyProvenance"]["quadMode"] = "TRIPO_QUAD_FACE",
): HumanoidFacialFitReceipt {
  const skeleton = {
    boneCount: 65,
    hierarchySha256: HASH,
    restTransformsSha256: HASH,
    rootBone: "mixamorig:Hips",
  } as const;
  const targetSha256ByName = targetHashes(DIALOGUE_FACIAL_MORPH_NAMES);
  const surfaces = Object.fromEntries(REQUIRED_FACIAL_RUNTIME_SURFACES.map((surface) => [
    surface,
    {
      canonicalHeadAssetId: HEAD_ASSET_ID,
      capabilityStatus: "READY",
      controlContractSha256: CONTROL_CONTRACT_SHA256,
      probe: {
        animatedMeshCount: 1,
        availableMorphNames: [...DIALOGUE_FACIAL_MORPH_NAMES],
        capabilities: { blink: true, gaze: true, speech: true },
        executionMode: "REAL_THREE_WEBGL_RUNTIME",
        loadedOutputSha256: HASH,
        missingMorphNames: [],
        morphDictionarySha256: HASH,
        morphTargetCount: DIALOGUE_FACIAL_MORPH_NAMES.length,
        probeSha256: HASH,
        status: "PASS",
      },
      render: {
        cameraSha256: HASH,
        heightPixels: 720,
        nonBackgroundPixelCount: 120_000,
        renderSha256: HASH,
        renderer: "THREE_WEBGLRENDERER",
        status: "PASS",
        widthPixels: 1280,
      },
    },
  ])) as unknown as HumanoidFacialFitReceipt["runtimeResolution"]["surfaces"];

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
    topologyProvenance: {
      acceptedSmartMeshSha256: HASH,
      authority: "EXACT_APPROVED_TRIPO_QUAD_SMART_MESH",
      basisSha256: HASH,
      directExactHeadWorkflow: true,
      duplicateGroupSha256: HASH,
      extractedHeadSha256: HASH,
      logicalTopologySha256: HASH,
      quadMode,
      rawToLogicalMapSha256: HASH,
      templateTransferCount: 0,
      topologySha256: HASH,
    },
    semanticFit: {
      logicalTopologySha256: HASH,
      method: "TARGET_DERIVED_EXACT_TOPOLOGY",
      regionAggregateSha256: HASH,
      regions: REQUIRED_EXACT_HEAD_SEMANTIC_REGIONS.map((id) => ({
        boundarySha256: HASH,
        id,
        logicalVertexCount: 64,
        membershipSha256: HASH,
        rawVertexCount: 80,
        selectionMethod: "EXACT_TOPOLOGY_GRAPH_AND_MEASURED_BOUNDS" as const,
      })),
    },
    authoringRig: {
      blenderVersion: "5.2.1",
      fitAggregateSha256: HASH,
      modules: REQUIRED_RIGIFY_AUTHORING_MODULES.map((module) => ({
        authoringOnly: true as const,
        controlCount: 4,
        fitSha256: HASH,
        generatedBoneCount: 12,
        instanceCount: module === "face.skin_eye" ? 2 : 1,
        module,
        strippedBeforeExport: true as const,
      })),
      rigifyVersion: "0.6.10",
      runtimeArmaturePolicy: "SEPARATE_AUTHORING_RIG",
      system: "BLENDER_RIGIFY",
    },
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
      proofByName: Object.fromEntries(
        DIALOGUE_FACIAL_MORPH_NAMES.map((name) => [name, proofForTarget(name)]),
      ),
    },
    criticalCombinationProof: {
      aggregateSha256: HASH,
      coverage: {
        bilateralBlink: true,
        blinkGazeSpeech: true,
        jawWithSpeech: true,
      },
      proofByName: {
        bilateralBlink: {
          gates: structuralGates(),
          geometrySha256: HASH,
          proofSha256: HASH,
          status: "PASS",
          targetWeights: { eyeBlinkLeft: 1, eyeBlinkRight: 1 },
        },
        blinkGazeSpeech: {
          gates: structuralGates(),
          geometrySha256: HASH,
          proofSha256: HASH,
          status: "PASS",
          targetWeights: { eyeBlinkLeft: 0.5, eyeLookUpLeft: 0.5, viseme_E: 0.75 },
        },
        jawWithSpeech: {
          gates: structuralGates(),
          geometrySha256: HASH,
          proofSha256: HASH,
          status: "PASS",
          targetWeights: { jawOpen: 0.75, viseme_aa: 1 },
        },
      },
    },
    oralAnatomy: {
      componentIsolationSha256: HASH,
      components: {
        lowerTeeth: oralComponent("LowerTeeth"),
        mouthCavity: oralComponent("MouthCavity"),
        tongue: oralComponent("Tongue"),
        upperTeeth: oralComponent("UpperTeeth"),
      },
      jawOpenCentralGapIncreaseMeters: 0.003,
      lipControlModule: "skin.stretchy_chain",
      maximumInterpenetrationMeters: 0,
      mouthCavityDepthMeters: 0.005,
      neutralLipSealMaximumGapMeters: 0,
      nonFiniteValueCount: 0,
      status: "PASS",
      tongueControlModule: "face.basic_tongue",
    },
    neutralStructuralProof: {
      basisSha256: HASH,
      coordinateDuplicateMaximumSplitMeters: 0,
      coordinateDuplicateSplitCount: 0,
      materialSha256: HASH,
      neckSeamMaximumDeltaMeters: 0,
      newNonadjacentSelfOverlapCount: 0,
      nonFiniteValueCount: 0,
      normalSha256: HASH,
      openTearCount: 0,
      polygonCount: 6264,
      proofSha256: HASH,
      skinWeightSha256: HASH,
      status: "PASS",
      topologySha256: HASH,
      triangleFlipCount: 0,
      uvSha256: HASH,
      vertexCount: 6025,
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
      authoringRigObjectCount: 0,
      basis: {
        basisSha256: HASH,
        materialSha256: HASH,
        normalSha256: HASH,
        polygonCount: 6264,
        skinWeightSha256: HASH,
        topologySha256: HASH,
        uvSha256: HASH,
        vertexCount: 6025,
      },
      cleanBlenderProcess: true,
      equivalenceSha256: HASH,
      importer: "BLENDER_GLTF_2_0",
      meshObjectCount: 5,
      morphTargetCount: DIALOGUE_FACIAL_MORPH_NAMES.length,
      outputSha256: HASH,
      skeleton,
      status: "PASS",
      targets: {
        aggregateSha256: HASH,
        names: [...DIALOGUE_FACIAL_MORPH_NAMES],
        targetSha256ByName,
      },
    },
    runtimeResolution: {
      aggregateProbeSha256: HASH,
      aggregateRenderSha256: HASH,
      canonicalHeadAssetId: HEAD_ASSET_ID,
      controlContractSha256: CONTROL_CONTRACT_SHA256,
      surfaces,
    },
  };
}

function errors(receipt: unknown): readonly string[] {
  return validateHumanoidFacialFitReceipt(receipt).errors;
}

describe("reusable humanoid facial-fit v2 receipt gate", () => {
  it("accepts complete direct exact-head receipts for both approved quad modes", () => {
    expect(validateHumanoidFacialFitReceipt(passingReceipt())).toEqual({ valid: true, errors: [] });
    expect(validateHumanoidFacialFitReceipt(passingReceipt({
      axes: "RIGHT_HANDED_X_LATERAL_Y_VERTICAL_Z_DEPTH",
      headHeightMeters: 0.31,
      interocularDistanceMeters: 0.074,
      neckSeamVertexCount: 80,
      originMeters: [-0.02, 0.41, 0.013],
      unitScaleMeters: 0.01,
    }, "ALREADY_APPROVED_QUAD"))).toEqual({ valid: true, errors: [] });
  });

  it("allows certified adaptive sweep samples while retaining all canonical gates", () => {
    const receipt = structuredClone(passingReceipt()) as unknown as Record<string, any>;
    receipt.targets.proofByName.jawOpen.sweep.adaptiveSamples.push(sweepSample(0.125));
    expect(validateHumanoidFacialFitReceipt(receipt)).toEqual({ valid: true, errors: [] });
  });

  it("rejects v1 with one explicit audit-only error and never auto-migrates it", () => {
    const v1 = { ...passingReceipt(), schema: HUMANOID_FACIAL_FIT_RECEIPT_V1_SCHEMA };
    expect(validateHumanoidFacialFitReceipt(v1)).toEqual({
      valid: false,
      errors: [HUMANOID_FACIAL_FIT_V1_AUDIT_ONLY_ERROR],
    });
  });

  it("rejects non-authoritative topology, transfer, and incomplete semantic fits", () => {
    const receipt = structuredClone(passingReceipt()) as unknown as Record<string, any>;
    receipt.topologyProvenance.authority = "TEMPLATE_TRANSFER";
    receipt.topologyProvenance.quadMode = "TRIANGULATED_COPY";
    receipt.topologyProvenance.acceptedSmartMeshSha256 = OTHER_HASH;
    receipt.topologyProvenance.templateTransferCount = 1;
    receipt.semanticFit.logicalTopologySha256 = OTHER_HASH;
    receipt.semanticFit.regions.pop();

    expect(errors(receipt)).toEqual(expect.arrayContaining([
      "receipt.topologyProvenance.authority must equal EXACT_APPROVED_TRIPO_QUAD_SMART_MESH",
      "receipt.topologyProvenance.quadMode must equal TRIPO_QUAD_FACE or ALREADY_APPROVED_QUAD",
      "receipt.topologyProvenance.acceptedSmartMeshSha256 must equal inputs.acceptedSmartMesh.sha256",
      "receipt.topologyProvenance.templateTransferCount must equal 0",
      "receipt.semanticFit.logicalTopologySha256 must equal topologyProvenance.logicalTopologySha256",
      "receipt.semanticFit.regions must contain exactly the required semantic regions in canonical order",
    ]));
  });

  it("rejects missing Rigify modules and any attempt to reuse the runtime armature", () => {
    const receipt = structuredClone(passingReceipt()) as unknown as Record<string, any>;
    receipt.authoringRig.runtimeArmaturePolicy = "MUTATE_RUNTIME_RIG";
    receipt.authoringRig.modules.splice(2, 1);
    receipt.authoringRig.modules[0].authoringOnly = false;
    receipt.authoringRig.modules[0].strippedBeforeExport = false;

    expect(errors(receipt)).toEqual(expect.arrayContaining([
      "receipt.authoringRig.runtimeArmaturePolicy must equal SEPARATE_AUTHORING_RIG",
      "receipt.authoringRig.modules must contain exactly face.skin_eye, face.skin_jaw, face.basic_tongue, skin.stretchy_chain in canonical order",
      "receipt.authoringRig.modules[0].authoringOnly must equal true",
      "receipt.authoringRig.modules[0].strippedBeforeExport must equal true",
    ]));
  });

  it("rejects incomplete proofByName, altered target hashes, uncertified sweeps, and swept mesh damage", () => {
    const receipt = structuredClone(passingReceipt()) as unknown as Record<string, any>;
    delete receipt.targets.proofByName.viseme_U;
    const blink = receipt.targets.proofByName.eyeBlinkLeft;
    blink.targetSha256 = OTHER_HASH;
    blink.sweep.canonicalWeights[1] = 0.2;
    blink.sweep.canonicalSamples[1].weight = 0.2;
    blink.sweep.canonicalSamples[3].gates.triangleFlipCount = 1;
    blink.sweep.uncertifiedIntervalCount = 1;

    expect(errors(receipt)).toEqual(expect.arrayContaining([
      "receipt.targets.proofByName must contain exactly all 66 standardized facial targets",
      "receipt.targets.proofByName.viseme_U must be an object",
      "receipt.targets.proofByName.eyeBlinkLeft.targetSha256 must match the standardized target-set hash",
      "receipt.targets.proofByName.eyeBlinkLeft.sweep.canonicalWeights must equal [0, 0.25, 0.5, 0.75, 1]",
      "receipt.targets.proofByName.eyeBlinkLeft.sweep.canonicalSamples[1].weight must equal 0.25",
      "receipt.targets.proofByName.eyeBlinkLeft.sweep.canonicalSamples[3].gates.triangleFlipCount must equal 0",
      "receipt.targets.proofByName.eyeBlinkLeft.sweep.uncertifiedIntervalCount must equal 0",
    ]));
  });

  it("rejects combination receipts that do not prove coexistence", () => {
    const receipt = structuredClone(passingReceipt()) as unknown as Record<string, any>;
    receipt.criticalCombinationProof.proofByName.bilateralBlink.targetWeights = {
      eyeBlinkLeft: 1,
      eyeWideLeft: 0.5,
    };
    receipt.criticalCombinationProof.proofByName.jawWithSpeech.targetWeights = {
      jawOpen: 1,
      mouthClose: 0.5,
    };
    receipt.criticalCombinationProof.proofByName.blinkGazeSpeech.targetWeights = {
      eyeBlinkLeft: 0.5,
      viseme_E: 0.75,
    };

    expect(errors(receipt)).toEqual(expect.arrayContaining([
      "receipt.criticalCombinationProof.proofByName must prove bilateral blink coexistence",
      "receipt.criticalCombinationProof.proofByName must prove jawOpen with a speech viseme",
      "receipt.criticalCombinationProof.proofByName must prove blink, gaze, and speech coexistence",
    ]));
  });

  it("rejects missing oral anatomy and neutral structural damage", () => {
    const receipt = structuredClone(passingReceipt()) as unknown as Record<string, any>;
    delete receipt.oralAnatomy.components.tongue;
    receipt.oralAnatomy.mouthCavityDepthMeters = 0.001;
    receipt.oralAnatomy.jawOpenCentralGapIncreaseMeters = 0.001;
    receipt.oralAnatomy.maximumInterpenetrationMeters = 0.0002;
    receipt.neutralStructuralProof.topologySha256 = OTHER_HASH;
    receipt.neutralStructuralProof.newNonadjacentSelfOverlapCount = 1;

    expect(errors(receipt)).toEqual(expect.arrayContaining([
      "receipt.oralAnatomy.components must contain exactly mouthCavity, upperTeeth, lowerTeeth, and tongue",
      "receipt.oralAnatomy.mouthCavityDepthMeters must be at least 0.003",
      "receipt.oralAnatomy.jawOpenCentralGapIncreaseMeters must be at least 0.002",
      "receipt.oralAnatomy.maximumInterpenetrationMeters must equal 0",
      "receipt.neutralStructuralProof.topologySha256 must equal basis.topologySha256",
      "receipt.neutralStructuralProof.newNonadjacentSelfOverlapCount must equal 0",
    ]));
  });

  it("rejects weak fresh-import comparisons and non-real runtime surface claims", () => {
    const receipt = structuredClone(passingReceipt()) as unknown as Record<string, any>;
    receipt.freshImport.authoringRigObjectCount = 1;
    receipt.freshImport.basis.uvSha256 = OTHER_HASH;
    receipt.freshImport.targets.targetSha256ByName.jawOpen = OTHER_HASH;
    receipt.runtimeResolution.surfaces.dialogue.capabilityStatus = "PARTIAL";
    receipt.runtimeResolution.surfaces.dialogue.probe.executionMode = "SYNTHETIC_UNIT_TEST";
    receipt.runtimeResolution.surfaces.dialogue.probe.loadedOutputSha256 = OTHER_HASH;
    receipt.runtimeResolution.surfaces.dialogue.probe.missingMorphNames = ["jawOpen"];
    receipt.runtimeResolution.surfaces.dialogue.render.renderSha256 = "not-a-hash";
    receipt.runtimeResolution.surfaces.dialogue.render.nonBackgroundPixelCount = 0;

    expect(errors(receipt)).toEqual(expect.arrayContaining([
      "receipt.freshImport.authoringRigObjectCount must equal 0",
      "receipt.freshImport.basis.uvSha256 must equal basis.uvSha256",
      "receipt.freshImport.targets.targetSha256ByName.jawOpen must match the authored target hash",
      "receipt.runtimeResolution.surfaces.dialogue.capabilityStatus must equal READY",
      "receipt.runtimeResolution.surfaces.dialogue.probe.executionMode must equal REAL_THREE_WEBGL_RUNTIME",
      "receipt.runtimeResolution.surfaces.dialogue.probe.loadedOutputSha256 must equal output.sha256",
      "receipt.runtimeResolution.surfaces.dialogue.probe.missingMorphNames must be empty",
      "receipt.runtimeResolution.surfaces.dialogue.render.renderSha256 must be an uppercase SHA-256",
      "receipt.runtimeResolution.surfaces.dialogue.render.nonBackgroundPixelCount must be greater than zero",
    ]));
  });

  it("rejects obsolete analytic registration fields even on a nominal v2 receipt", () => {
    const receipt = structuredClone(passingReceipt()) as unknown as Record<string, any>;
    receipt.registration = { method: "ANALYTIC_POLYHARMONIC_R3" };
    receipt.derivativeProof = { analyticMethod: "ANALYTIC_POLYHARMONIC_R3" };
    expect(errors(receipt)).toEqual(expect.arrayContaining([
      "receipt.registration is obsolete in v2 and must not be used for promotion",
      "receipt.derivativeProof is obsolete in v2 and must not be used for promotion",
    ]));
  });
});
