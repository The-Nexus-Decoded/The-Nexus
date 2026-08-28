import { describe, expect, it } from "vitest";
import ledgerJson from "../docs/3d-ai-studio/tripo-human-pilot-ledger.json";
import schemaJson from "../docs/3d-ai-studio/tripo-human-pilot-ledger.schema.json";

const BODY_IDS = [
  "human-masculine-athletic-muscular",
  "human-feminine-athletic-muscular",
  "human-masculine-slim",
  "human-masculine-medium-natural",
  "human-masculine-thick-large-framed",
  "human-feminine-slim",
  "human-feminine-medium-natural",
  "human-feminine-thick-large-framed",
] as const;

const PILOT_IDS = [
  "human-masculine-athletic-muscular",
  "human-feminine-athletic-muscular",
] as const;

const RECORDING_CHECKLIST_KEYS = [
  "candidate-source-and-provider-label",
  "model-settings-and-pose-contract",
  "live-cost-and-owner-approval",
  "single-task-submission-and-task-id",
  "untouched-download-and-hash",
  "t-pose-rig-calibration",
  "same-rig-a-pose-derivation",
  "normal-and-slow-speed-deformation-and-fit-review",
] as const;

const CANDIDATE_SLOTS = [
  "TRIPO_NANO_BANANA",
  "TRIPO_NANO_BANANA_PRO",
  "TRIPO_GPT_IMAGE_2_A",
  "TRIPO_GPT_IMAGE_2_B",
] as const;

type CandidateSlot = (typeof CANDIDATE_SLOTS)[number];
type PilotId = (typeof PILOT_IDS)[number];

interface SourceCandidate {
  slotId: CandidateSlot;
  provider: string;
  modelSlot: string;
  status: string;
  artifactPath: string | null;
  sha256: string | null;
  selected: boolean;
  ownerVerdict: string;
}

interface BodyEntry {
  canonicalBodyId: string;
  ancestry: string;
  isPilot: boolean;
  pilotSequence: number | null;
  executionGate: string;
  sourceBakeoff: {
    lockedBriefId: string;
    primarySourcePose: string;
    independentAPoseImageMaySeed3d: boolean;
    selectedCandidateSlot: CandidateSlot | null;
    ownerSelectionState: string;
    candidates: Record<CandidateSlot, SourceCandidate>;
  };
  canonicalMesh: {
    canonicalMeshId: string;
    canonicalMeshCount: number;
    sourcePose: string;
    sameMeshRequiredForBothPoseArtifacts: boolean;
    independentAPoseBodyGenerationAllowed: boolean;
    status: string;
  };
  tripoSmartMesh: {
    required: boolean;
    liveMode: string;
    observedProviderModel: string;
    capabilityContract: string;
    enabledAtSubmission: boolean;
    topologyType: string;
    targetQuadFaces: number;
    acceptedQuadFaceRange: { minimum: number; maximum: number };
    topologyBeforePbrAndRig: boolean;
    manualHeroLoopReviewRequired: boolean;
    status: string;
  };
  submissionGate: {
    ownerPaidOperationApprovalState: string;
    ownerPaidOperationApproved: boolean;
    submitApprovalState: string;
    submitApproved: boolean;
    automaticPaidRetries: boolean;
    taskId: string | null;
    chargedCredits: number | null;
    status: string;
  };
  poseArtifacts: {
    requiredArtifactCount: number;
    derivationContract: string;
    tPose: {
      artifactRole: string;
      normalizedPose: string;
      status: string;
    };
    aPose: {
      artifactRole: string;
      normalizedPose: string;
      productionMethod: string;
      derivedFromTPoseRig: boolean;
      sameCanonicalMeshRequired: boolean;
      sameSkeletonRequired: boolean;
      independentGenerationAllowed: boolean;
      status: string;
    };
    sameCanonicalMeshVerified: boolean;
    sameSkeletonVerified: boolean;
  };
}

interface PilotLedger {
  $schema: string;
  schemaVersion: number;
  ledgerId: string;
  issue: number;
  scope: {
    ancestry: string;
    canonicalBodyCount: number;
    requiredPoseArtifactCount: number;
    poseArtifactsPerBody: number;
    firstPilots: string[];
    remainingBodiesGate: string;
  };
  studioPreflight: {
    lane: string;
    recordedFromVisibleStudioUi: boolean;
    generationMode: string;
    observedProviderModel: string;
    balanceCredits: number;
    displayedBaseCostCredits: number;
    displayedCurrentTrialCostCredits: number;
    trialLabel: string;
    status: string;
    doesNotAuthorizeSubmission: boolean;
    submissionApprovalState: string;
    submitApproved: boolean;
  };
  operationSafety: Record<string, boolean | string>;
  evidence: {
    visibleRecording: {
      required: boolean;
      overallStatus: string;
      storagePolicy: string;
      pilotTakes: Record<
        PilotId,
        {
          status: string;
          externalVideoPath: string | null;
          sha256: string | null;
          externalReceiptPath: string | null;
          receiptSha256: string | null;
          secretsVisible: boolean;
          captureChecklist: Record<string, string>;
        }
      >;
    };
  };
  bodies: BodyEntry[];
}

interface PilotLedgerSchema {
  $schema: string;
  properties: {
    bodies: {
      items: Array<{
        allOf: [
          { $ref: string },
          { properties: { canonicalBodyId: { const: string } } },
        ];
      }>;
    };
  };
  definitions: {
    operationSafety: {
      required: string[];
      properties: Record<string, { const: unknown }>;
    };
    visibleRecording: {
      required: string[];
      properties: {
        pilotTakes: {
          required: string[];
        };
      };
    };
    evidenceStatus: { enum: string[] };
    pilotRecordingTake: { required: string[] };
    recordingCaptureChecklist: { required: string[] };
    sourceCandidates: { required: string[] };
    sourceCandidate: {
      properties: {
        provider: { const: string };
        modelSlot: { enum: string[] };
      };
    };
  };
}

const ledger = ledgerJson as PilotLedger;
const schema = schemaJson as unknown as PilotLedgerSchema;

describe("SoulDrifter issue #487 Tripo Human pilot ledger", () => {
  it("locks the exact eight-body Human matrix and two ordered pilots", () => {
    expect(ledger.$schema).toBe("./tripo-human-pilot-ledger.schema.json");
    expect(ledger.schemaVersion).toBe(1);
    expect(ledger.ledgerId).toBe("souldrifter-issue-487-human-foundation-v1");
    expect(ledger.issue).toBe(487);
    expect(ledger.scope).toMatchObject({
      ancestry: "HUMAN",
      canonicalBodyCount: 8,
      requiredPoseArtifactCount: 16,
      poseArtifactsPerBody: 2,
      firstPilots: BODY_IDS.slice(0, 2),
      remainingBodiesGate: "BLOCKED_BY_BOTH_PILOTS",
    });

    const ids = ledger.bodies.map(({ canonicalBodyId }) => canonicalBodyId);
    expect(ids).toEqual(BODY_IDS);
    expect(new Set(ids).size).toBe(8);
    expect(ledger.bodies.every(({ ancestry }) => ancestry === "HUMAN")).toBe(true);
    expect(ids.some((id) => /halfling|drakkin/i.test(id))).toBe(false);
    expect(
      ledger.bodies.filter(({ isPilot }) => isPilot).map(({ pilotSequence }) => pilotSequence),
    ).toEqual([1, 2]);
    expect(
      ledger.bodies.slice(2).every(({ executionGate }) => executionGate === "BLOCKED_BY_BOTH_PILOTS"),
    ).toBe(true);
  });

  it("keeps every source candidate inside the visible Tripo Studio lane", () => {
    const expectedModels: Record<CandidateSlot, string> = {
      TRIPO_NANO_BANANA: "NANO_BANANA",
      TRIPO_NANO_BANANA_PRO: "NANO_BANANA_PRO",
      TRIPO_GPT_IMAGE_2_A: "GPT_IMAGE_2_A",
      TRIPO_GPT_IMAGE_2_B: "GPT_IMAGE_2_B",
    };

    for (const body of ledger.bodies) {
      expect(body.sourceBakeoff.lockedBriefId).toBe(
        `issue-487-${body.canonicalBodyId}-strict-t-v1`,
      );
      expect(body.sourceBakeoff.primarySourcePose).toBe("STRICT_T_POSE");
      expect(body.sourceBakeoff.independentAPoseImageMaySeed3d).toBe(false);
      expect(body.sourceBakeoff.selectedCandidateSlot).toBeNull();
      expect(body.sourceBakeoff.ownerSelectionState).toBe("NOT_REQUESTED");
      expect(Object.keys(body.sourceBakeoff.candidates)).toEqual(CANDIDATE_SLOTS);

      for (const slot of CANDIDATE_SLOTS) {
        expect(body.sourceBakeoff.candidates[slot]).toMatchObject({
          slotId: slot,
          provider: "TRIPO_STUDIO",
          modelSlot: expectedModels[slot],
          status: "PENDING",
          artifactPath: null,
          sha256: null,
          selected: false,
          ownerVerdict: "NOT_REQUESTED",
        });
      }
    }
  });

  it("requires Smart Mesh native quads and same-mesh T/A artifacts", () => {
    const canonicalMeshIds = ledger.bodies.map(
      ({ canonicalMesh }) => canonicalMesh.canonicalMeshId,
    );
    expect(new Set(canonicalMeshIds).size).toBe(8);
    expect(
      ledger.bodies.reduce(
        (artifactCount, body) => artifactCount + body.poseArtifacts.requiredArtifactCount,
        0,
      ),
    ).toBe(16);

    for (const body of ledger.bodies) {
      expect(body.canonicalMesh).toMatchObject({
        canonicalMeshCount: 1,
        sourcePose: "STRICT_T_POSE",
        sameMeshRequiredForBothPoseArtifacts: true,
        independentAPoseBodyGenerationAllowed: false,
        status: "PENDING",
      });
      expect(body.tripoSmartMesh).toMatchObject({
        required: true,
        liveMode: "SMART_MESH",
        observedProviderModel: "P2.0 - Preview",
        capabilityContract: "NATIVE_QUAD_GENERATION",
        enabledAtSubmission: false,
        topologyType: "QUAD_FACE",
        targetQuadFaces: 8000,
        acceptedQuadFaceRange: { minimum: 6000, maximum: 9000 },
        topologyBeforePbrAndRig: true,
        manualHeroLoopReviewRequired: true,
        status: "PENDING",
      });
      expect(body.poseArtifacts.tPose).toMatchObject({
        artifactRole: "CANONICAL_RIG_CALIBRATION_SOURCE",
        normalizedPose: "STRICT_T_POSE",
        status: "PENDING",
      });
      expect(body.poseArtifacts.aPose).toMatchObject({
        artifactRole: "PRODUCTION_DEFORMATION_AND_FIT_POSE",
        normalizedPose: "A_POSE",
        productionMethod: "DERIVED_FROM_ACCEPTED_T_POSE_RIG",
        derivedFromTPoseRig: false,
        sameCanonicalMeshRequired: true,
        sameSkeletonRequired: true,
        independentGenerationAllowed: false,
        status: "PENDING",
      });
      expect(body.poseArtifacts.derivationContract).toBe(
        "STRICT_T_SOURCE_PLUS_SAME_MESH_A_DEFORMATION",
      );
      expect(body.poseArtifacts.sameCanonicalMeshVerified).toBe(false);
      expect(body.poseArtifacts.sameSkeletonVerified).toBe(false);
    }
  });

  it("records the provisional live preflight without authorizing any operation", () => {
    expect(ledger.studioPreflight).toEqual({
      lane: "TRIPO_STUDIO_IN_APP_BROWSER",
      observedAt: "2026-08-28",
      recordedFromVisibleStudioUi: true,
      generationMode: "SMART_MESH",
      observedProviderModel: "P2.0 - Preview",
      balanceCredits: 25115,
      displayedBaseCostCredits: 100,
      displayedCurrentTrialCostCredits: 0,
      trialLabel: "Trial x1",
      status: "PROVISIONAL_PRE_SUBMISSION_UI_OBSERVATION",
      doesNotAuthorizeSubmission: true,
      submissionApprovalState: "NOT_REQUESTED",
      submitApproved: false,
    });
    expect(ledger.operationSafety).toEqual({
      generationSubmitted: false,
      batchGenerationPerformed: false,
      sourceUploaded: false,
      creditsSpent: false,
      automaticPaidRetries: false,
      paidOperationApprovalState: "NOT_REQUESTED",
      paidOperationApproved: false,
      mergePerformed: false,
      deployPerformed: false,
      pr460Modified: false,
    });

    for (const body of ledger.bodies) {
      expect(body.submissionGate).toMatchObject({
        ownerPaidOperationApprovalState: "NOT_REQUESTED",
        ownerPaidOperationApproved: false,
        submitApprovalState: "NOT_REQUESTED",
        submitApproved: false,
        automaticPaidRetries: false,
        taskId: null,
        chargedCredits: null,
        status: "NOT_SUBMITTED",
      });
    }
  });

  it("requires privacy-safe visible recording evidence and schema parity", () => {
    const recording = ledger.evidence.visibleRecording;
    expect(recording).toMatchObject({
      required: true,
      overallStatus: "PENDING",
      storagePolicy: "EXTERNAL_VIDEO_HASH_IN_GIT_ONLY",
    });
    expect(Object.keys(recording.pilotTakes)).toEqual(PILOT_IDS);

    for (const pilotId of PILOT_IDS) {
      const take = recording.pilotTakes[pilotId];
      expect(take).toMatchObject({
        status: "PENDING",
        externalVideoPath: null,
        sha256: null,
        externalReceiptPath: null,
        receiptSha256: null,
        secretsVisible: false,
      });
      expect(Object.keys(take.captureChecklist)).toEqual(RECORDING_CHECKLIST_KEYS);
      expect(Object.values(take.captureChecklist)).toEqual(
        Array.from({ length: 8 }, () => "PENDING"),
      );
    }

    const schemaBodyIds = schema.properties.bodies.items.map(
      ({ allOf }) => allOf[1].properties.canonicalBodyId.const,
    );
    expect(schemaBodyIds).toEqual(BODY_IDS);
    expect(schema.definitions.sourceCandidates.required).toEqual(CANDIDATE_SLOTS);
    expect(schema.definitions.sourceCandidate.properties.provider.const).toBe("TRIPO_STUDIO");
    expect(schema.definitions.sourceCandidate.properties.modelSlot.enum).toEqual([
      "NANO_BANANA",
      "NANO_BANANA_PRO",
      "GPT_IMAGE_2_A",
      "GPT_IMAGE_2_B",
    ]);
    expect(schema.$schema).toBe("http://json-schema.org/draft-07/schema#");
    expect(schema.definitions.operationSafety.required).toContain(
      "batchGenerationPerformed",
    );
    expect(
      schema.definitions.operationSafety.properties.batchGenerationPerformed,
    ).toEqual({ const: false });
    expect(schema.definitions.visibleRecording.required).toEqual([
      "required",
      "overallStatus",
      "storagePolicy",
      "pilotTakes",
    ]);
    expect(
      schema.definitions.visibleRecording.properties.pilotTakes.required,
    ).toEqual(PILOT_IDS);
    expect(schema.definitions.evidenceStatus.enum).toEqual([
      "PENDING",
      "IN_PROGRESS",
      "PASS",
      "REJECTED",
      "INCOMPLETE",
    ]);
    expect(schema.definitions.pilotRecordingTake.required).toEqual([
      "status",
      "externalVideoPath",
      "sha256",
      "externalReceiptPath",
      "receiptSha256",
      "secretsVisible",
      "captureChecklist",
    ]);
    expect(schema.definitions.recordingCaptureChecklist.required).toEqual(
      RECORDING_CHECKLIST_KEYS,
    );
  });
});
