import { describe, expect, it } from "vitest";
import {
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
