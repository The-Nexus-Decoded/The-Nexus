import { describe, expect, it } from "vitest";
import {
  HARVEST_INTERACTION_CONTRACTS,
  ONE_SHOT_BOUNDARY_POSE_CONTRACT,
  REQUIRED_TECHNICAL_CHECKS,
  REQUIRED_VISUAL_CHECKS,
  validateCandidateReceipt,
} from "../scripts/validate-human-animation-candidate.mjs";

const hash = "A".repeat(64);

function passingReceipt() {
  return {
    schemaVersion: 1,
    issue: 487,
    candidate: {
      id: "interaction-lift-v1",
      semanticId: "interaction.lift-carry-place",
      clipName: "AuthoredUtility__Lift",
      version: 1,
      authorId: "animation-gap-lane",
      authoringLane: "BLENDER",
      playIntent: "ONE_SHOT",
    },
    candidateArtifact: {
      path: "H:/CodexData/souldrifter-toolchain/evidence/487/animation-candidates/lift-v1.glb",
      bytes: 123,
      sha256: hash,
      stagingOnly: true,
    },
    sourceRestRig: {
      path: "public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb",
      bytes: 2_404_872,
      sha256: hash,
      importedActionCount: 0,
      boneCount: 65,
      rootBone: "mixamorig:Hips",
    },
    provenance: {
      route: "ORIGINAL_TIER_3",
      authoredFromZeroActionRestRig: true,
      sourceAnimationsSampled: false,
      forbiddenOperationsUsed: [],
      realPersonReferences: [{
        url: "https://example.com/lift",
        publisher: "Reference publisher",
        retrievedAt: "2026-08-28",
        timeRange: "00:10-00:30",
        mechanics: {
          stance: "Stable base around the load.",
          weightTransfer: "Hips descend and legs drive upward.",
          footwork: "Feet remain planted.",
          hipsShoulders: "Spine stays braced as hips extend.",
          handsGripContacts: "Both hands support opposite crate sides.",
          anticipation: "Actor squares up before descending.",
          cadence: "Slow deliberate lift.",
          followThroughRecovery: "Load settles against the torso before recovery.",
        },
      }],
    },
    technicalReview: {
      status: "PASS",
      checks: Object.fromEntries(REQUIRED_TECHNICAL_CHECKS.map((key) => [key, "PASS"])),
      evidence: {
        boundaryPose: {
          method: ONE_SHOT_BOUNDARY_POSE_CONTRACT.method,
          naturalGameplayStanceRequired: true,
          declaredStartPose: "NATURAL_LIFT_READY",
          declaredEndPose: "NATURAL_LIFT_RECOVERY",
          startFrame: 1,
          endFrame: 84,
          sourceBindPoseSampleSha256: "B".repeat(64),
          declaredStartPoseSampleSha256: "C".repeat(64),
          declaredEndPoseSampleSha256: "D".repeat(64),
          startPoseSampleSha256: "E".repeat(64),
          endPoseSampleSha256: "F".repeat(64),
          sampledUpperBodyBoneCount: 12,
          maximumDeclaredPoseRmsErrorDegrees: 5,
          startPoseRmsAngularErrorToDeclaredDegrees: 0.8,
          endPoseRmsAngularErrorToDeclaredDegrees: 1.1,
          minimumBindPoseRmsSeparationDegrees: 12,
          startPoseRmsAngularDistanceFromBindDegrees: 31,
          endPoseRmsAngularDistanceFromBindDegrees: 28,
          maximumArmsWideScore: 0.35,
          startArmsWideScore: 0.08,
          endArmsWideScore: 0.1,
          bindOrTPoseAtBoundary: false,
        },
      },
    },
    playbackEvidence: {
      normalSpeed: {
        path: "H:/CodexData/souldrifter-toolchain/evidence/487/animation-candidates/lift-v1.mp4",
        bytes: 456,
        sha256: hash,
        width: 1280,
        height: 960,
        fps: 30,
        frameCount: 84,
        durationSeconds: 2.8,
        playbackRate: 1,
        fullDecodePassed: true,
      },
    },
    independentVisualReview: {
      status: "PASS",
      reviewerId: "root-coordinator",
      reviewerRole: "INDEPENDENT_COORDINATOR",
      watchedEntireNormalSpeed: true,
      playbackSha256: hash,
      checklist: Object.fromEntries(REQUIRED_VISUAL_CHECKS.map((key) => [key, "PASS"])),
      blockingFindings: [],
    },
    ownerReview: { status: "NOT_PRESENTED" },
    promotion: { status: "OWNER_REVIEW_READY", runtimeInstalled: false },
  };
}

function validate(receipt, gate = "owner-review") {
  return validateCandidateReceipt(receipt, {
    gate,
    verifyFiles: false,
    verifyMedia: false,
  }).errors;
}

function harvestInteractionContext(semanticId) {
  const contract = HARVEST_INTERACTION_CONTRACTS[semanticId];
  return {
    actionVariant: contract.actionVariant,
    requiredMotionBeats: [...contract.requiredMotionBeats],
    bucketProp: {
      propId: "HARVEST_BUCKET",
      binding: "RUNTIME_BOUND",
      placement: "GROUND_PLACED",
      bakedIntoAnimationArtifact: false,
      floating: false,
    },
    fruitBinding: "RUNTIME_BOUND_ITEM",
    fruitBakedIntoAnimationArtifact: false,
    previewIncludesGroundedBucket: true,
    collisionChecks: {
      handFruit: "PASS",
      handBucket: "PASS",
      fruitBucket: "PASS",
    },
  };
}

function quarantinedReceipt() {
  const receipt = passingReceipt();
  receipt.technicalReview.status = "REWORK";
  receipt.technicalReview.checks.semantic = "REWORK";
  receipt.independentVisualReview = {
    status: "REWORK",
    reviewerId: "root-coordinator-pending",
    reviewerRole: "INDEPENDENT_COORDINATOR",
    watchedEntireNormalSpeed: false,
    playbackSha256: hash,
    checklist: Object.fromEntries(REQUIRED_VISUAL_CHECKS.map((key) => [key, "REWORK"])),
    blockingFindings: ["Independent continuous review is pending."],
  };
  receipt.promotion = { status: "QUARANTINED", runtimeInstalled: false };
  return receipt;
}

describe("issue #487 animation candidate gate", () => {
  it("accepts a complete authoring handoff only in quarantine state", () => {
    expect(validate(quarantinedReceipt(), "quarantine")).toEqual([]);
  });

  it("rejects an authoring handoff that claims independent visual PASS", () => {
    const receipt = quarantinedReceipt();
    receipt.independentVisualReview.status = "PASS";
    expect(validate(receipt, "quarantine")).toContain(
      "independentVisualReview.status must equal REWORK at quarantine",
    );
  });

  it("accepts a complete independently reviewed original candidate receipt", () => {
    expect(validate(passingReceipt())).toEqual([]);
  });

  it("requires numeric natural-stance boundary evidence for one-shot clips", () => {
    const receipt = passingReceipt();
    delete receipt.technicalReview.evidence.boundaryPose;
    expect(validate(receipt)).toContain(
      "technicalReview.evidence.boundaryPose must be an object for ONE_SHOT candidates",
    );
  });

  it("rejects one-shot boundaries that numerically collapse toward bind or T-pose", () => {
    const receipt = passingReceipt();
    const boundary = receipt.technicalReview.evidence.boundaryPose;
    boundary.declaredEndPose = "SOURCE_BIND_POSE";
    boundary.endPoseRmsAngularDistanceFromBindDegrees = 2;
    boundary.endArmsWideScore = 0.92;
    boundary.bindOrTPoseAtBoundary = true;
    expect(validate(receipt)).toEqual(expect.arrayContaining([
      "technicalReview.evidence.boundaryPose.declaredEndPose must name a natural gameplay stance, not a bind or T-pose",
      "technicalReview.evidence.boundaryPose.endPoseRmsAngularDistanceFromBindDegrees must be at least minimumBindPoseRmsSeparationDegrees",
      "technicalReview.evidence.boundaryPose.endArmsWideScore must be between 0 and maximumArmsWideScore",
      "technicalReview.evidence.boundaryPose.bindOrTPoseAtBoundary must equal false",
    ]));
  });

  it("does not require one-shot stance boundaries for a declared loop", () => {
    const receipt = passingReceipt();
    receipt.candidate.playIntent = "LOOP";
    delete receipt.technicalReview.evidence.boundaryPose;
    expect(validate(receipt)).toEqual([]);
  });

  it("retires generic harvest in favor of distinct tree and plant semantics", () => {
    const receipt = passingReceipt();
    receipt.candidate.semanticId = "interaction.harvest";
    expect(validate(receipt)).toContain(
      "candidate.semanticId interaction.harvest is retired; use interaction.harvest.tree or interaction.harvest.plant",
    );
  });

  it.each([
    "interaction.harvest.tree",
    "interaction.harvest.plant",
  ])("requires the grounded runtime bucket and collision-safe beat contract for %s", (semanticId) => {
    const receipt = passingReceipt();
    receipt.candidate.semanticId = semanticId;
    expect(validate(receipt)).toContain(
      `technicalReview.evidence.interactionContext must be an object for ${semanticId}`,
    );

    receipt.technicalReview.evidence.interactionContext = harvestInteractionContext(semanticId);
    expect(validate(receipt)).toEqual([]);

    receipt.technicalReview.evidence.interactionContext.bucketProp.floating = true;
    receipt.technicalReview.evidence.interactionContext.collisionChecks.fruitBucket = "REWORK";
    expect(validate(receipt)).toEqual(expect.arrayContaining([
      "technicalReview.evidence.interactionContext.bucketProp.floating must equal false",
      "technicalReview.evidence.interactionContext.collisionChecks.fruitBucket must equal PASS",
    ]));
  });

  it("rejects candidates staged in the shipping asset tree", () => {
    const receipt = passingReceipt();
    receipt.candidateArtifact.path = "public/assets/3d/animations/human-foundation-pilot/lift.glb";
    expect(validate(receipt)).toContain(
      "candidateArtifact must be staged outside public/assets before owner approval",
    );
  });

  it("uses the canonical repository-relative rest-rig path", () => {
    const receipt = passingReceipt();
    receipt.sourceRestRig.path = "Arianus-Sky/projects/games/SoulDrifterWeb/public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb";
    expect(validate(receipt)).toEqual([]);
  });

  it("rejects source-derived shortcuts for a missing semantic", () => {
    const receipt = passingReceipt();
    receipt.provenance.sourceAnimationsSampled = true;
    receipt.provenance.forbiddenOperationsUsed = ["CLIP_SPLICE"];
    expect(validate(receipt)).toEqual(expect.arrayContaining([
      "provenance.sourceAnimationsSampled must be false for ORIGINAL_TIER_3",
      "provenance.forbiddenOperationsUsed must be an empty array",
    ]));
  });

  it("rejects author self-approval and an incomplete full-motion checklist", () => {
    const receipt = passingReceipt();
    receipt.independentVisualReview.reviewerId = receipt.candidate.authorId;
    receipt.independentVisualReview.watchedEntireNormalSpeed = false;
    receipt.independentVisualReview.checklist.cadence = "REWORK";
    expect(validate(receipt)).toEqual(expect.arrayContaining([
      "independentVisualReview.reviewerId must differ from candidate.authorId",
      "independentVisualReview.watchedEntireNormalSpeed must be true",
      "independentVisualReview.checklist.cadence must equal PASS",
    ]));
  });

  it("requires an exact owner-approved artifact hash before runtime installation", () => {
    const receipt = passingReceipt();
    receipt.ownerReview = { status: "APPROVED", selectedCandidateSha256: "B".repeat(64) };
    receipt.promotion = { status: "OWNER_APPROVED", runtimeInstalled: false };
    expect(validate(receipt, "runtime-install")).toContain(
      "ownerReview.selectedCandidateSha256 must match candidateArtifact.sha256",
    );
  });

  it("requires real-person mechanics even when an exact provider preset exists", () => {
    const receipt = passingReceipt();
    receipt.provenance = {
      route: "EXACT_PROVIDER_PRESET",
      realPersonReferences: [],
      providerSource: {
        provider: "Mixamo",
        sourceName: "Exact Action",
        sourceUrl: "https://www.mixamo.com/",
        licenseNote: "Recorded provider terms receipt",
        sha256: hash,
      },
    };
    expect(validate(receipt)).toContain(
      "provenance.realPersonReferences must contain at least one reference",
    );
  });

  it("blocks shipping until exact installed bytes and all runtime checks pass", () => {
    const receipt = passingReceipt();
    receipt.ownerReview = { status: "APPROVED", selectedCandidateSha256: hash };
    receipt.promotion = {
      status: "RUNTIME_INSTALLED",
      runtimeInstalled: true,
      installedAsset: {
        path: "public/assets/3d/animations/human-foundation-pilot/lift.glb",
        bytes: 123,
        sha256: hash,
      },
    };
    receipt.runtimeVerification = {
      typecheck: "PASS",
      tests: "PASS",
      build: "PENDING",
      breachV2BrowserSmoke: "PENDING",
    };
    expect(validate(receipt, "shipping")).toEqual(expect.arrayContaining([
      "runtimeVerification.build must equal PASS",
      "runtimeVerification.breachV2BrowserSmoke must equal PASS",
    ]));
  });

  it("rejects an installed asset outside the app even if its path contains public/assets", () => {
    const receipt = passingReceipt();
    receipt.ownerReview = { status: "APPROVED", selectedCandidateSha256: hash };
    receipt.promotion = {
      status: "RUNTIME_INSTALLED",
      runtimeInstalled: true,
      installedAsset: {
        path: "H:/CodexData/temp/public/assets/lift.glb",
        bytes: 123,
        sha256: hash,
      },
    };
    receipt.runtimeVerification = {
      typecheck: "PASS",
      tests: "PASS",
      build: "PASS",
      breachV2BrowserSmoke: "PASS",
    };
    expect(validate(receipt, "shipping")).toContain(
      "promotion.installedAsset.path must be inside public/assets",
    );
  });
});
