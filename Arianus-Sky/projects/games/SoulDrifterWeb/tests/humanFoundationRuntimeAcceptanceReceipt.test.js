import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { HUMAN_FOUNDATION_RUNTIME_REVIEW_QUEUE } from "../src/game/humanFoundationRuntimeReviewQueue";
import { validatePilotAnimationCatalog } from "../src/game/pilotAnimationCatalog";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const receipt = JSON.parse(readFileSync(
  resolve(projectRoot, "docs/ISSUE-487-HUMAN-PROVIDER-RUNTIME-ACCEPTANCE.json"),
  "utf8",
));
const catalog = validatePilotAnimationCatalog(JSON.parse(readFileSync(
  resolve(projectRoot, "public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-catalog.json"),
  "utf8",
)));

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

describe("issue #487 Human provider BREACH V2 runtime acceptance receipt", () => {
  it("binds the runtime PASS to the exact reviewed queue, pack bytes, and catalog fingerprints", () => {
    expect(receipt).toMatchObject({
      schemaVersion: 1,
      issue: 487,
      status: "PASS_RUNTIME_SMOKE",
      runtimeIntegration: {
        commit: "6a469d31e004a2f961226c8c678c6fb7677f8a5b",
        exactReviewedPack: { id: "pro-longbow-01", boneCount: 65 },
      },
    });
    expect(receipt.clips.map((entry) => entry.clipName)).toEqual(
      HUMAN_FOUNDATION_RUNTIME_REVIEW_QUEUE.map((entry) => entry.clipName),
    );

    const pack = catalog.packs.find((entry) => entry.id === receipt.runtimeIntegration.exactReviewedPack.id);
    expect(pack).toMatchObject({
      url: receipt.runtimeIntegration.exactReviewedPack.url,
      sha256: receipt.runtimeIntegration.exactReviewedPack.sha256,
      bytes: receipt.runtimeIntegration.exactReviewedPack.bytes,
    });
    const packBytes = readFileSync(resolve(projectRoot, "public", pack.url.replace(/^\//, "")));
    expect(packBytes.length).toBe(pack.bytes);
    expect(sha256(packBytes)).toBe(pack.sha256);

    for (const [index, queued] of HUMAN_FOUNDATION_RUNTIME_REVIEW_QUEUE.entries()) {
      const accepted = receipt.clips[index];
      const catalogClip = catalog.clips.find((entry) => entry.name === queued.clipName);
      expect(accepted).toMatchObject({
        semanticId: queued.semanticId,
        clipName: queued.clipName,
        catalogFingerprint: queued.catalogFingerprint,
        floorCorrectionMeters: 0.005,
        status: "PASS",
      });
      expect(catalogClip).toMatchObject({
        packId: queued.packId,
        fingerprint: queued.catalogFingerprint,
      });
    }
  });

  it("records floor-safe samples, browser isolation, and the later context loss without false attribution", () => {
    expect(receipt.browserGate).toMatchObject({
      environment: "BREACH_V2",
      browserPolicy: "EXISTING_CODEX_IN_APP_TAB_ONLY",
      newWindowOpened: false,
      newTabOpened: false,
      floorToleranceMeters: 0.01,
      consoleWarningsDuringCleanGate: 0,
      consoleErrorsDuringCleanGate: 0,
      clipSwitchReset: "PASS",
    });
    for (const accepted of receipt.clips) {
      expect(accepted.sampledLowerBoundMeters.min).toBeGreaterThanOrEqual(-receipt.browserGate.floorToleranceMeters);
      expect(accepted.sampledLowerBoundMeters.max).toBeGreaterThanOrEqual(accepted.sampledLowerBoundMeters.min);
    }
    expect(receipt.clips.find((entry) => entry.clipName === "ProLongbow__FallALoop")
      .sampledLowerBoundMeters.min).toBeGreaterThan(0);
    expect(receipt.clips.find((entry) => entry.clipName === "ProLongbow__StandingBlock")
      .sampledLowerBoundMeters).toEqual({ min: -0.004, max: -0.004 });
    expect(receipt.postGateBrowserIncident).toMatchObject({
      occurredAfterAcceptanceSampling: true,
      signal: "GL_CONTEXT_LOST",
      attribution: "UNATTRIBUTED_NOT_CLIP_SPECIFIC",
      acceptanceImpact: "NONE",
      recovery: {
        failedPageReleasedTo: "about:blank",
        sameTabReplacementOpened: true,
        replacementConsoleWarnings: 0,
        replacementConsoleErrors: 0,
      },
    });
    expect(receipt.exclusions).toEqual({
      authoredQuarantineCandidatesInstalled: false,
      rejectedCandidatesInstalled: false,
      coverageLedgerUpdate: "DEFERRED_TO_PIPELINE_RULES_LANE",
    });
  });
});
