import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HUMAN_FOUNDATION_RUNTIME_REVIEW_QUEUE,
  resolveHumanFoundationRuntimeReviewQueue,
} from "../src/game/humanFoundationRuntimeReviewQueue";
import { validatePilotAnimationCatalog } from "../src/game/pilotAnimationCatalog";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = resolve(
  projectRoot,
  "public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-catalog.json",
);

function loadCatalog() {
  return validatePilotAnimationCatalog(JSON.parse(readFileSync(catalogPath, "utf8")));
}

function localAssetPath(url) {
  return resolve(projectRoot, "public", url.replace(/^\//, ""));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function arrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

describe("issue #487 Human provider runtime-review queue", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fails closed on catalog drift and resolves only the seven independently reviewed clips", () => {
    const catalog = loadCatalog();
    const expected = HUMAN_FOUNDATION_RUNTIME_REVIEW_QUEUE.map((entry) => entry.clipName);
    expect(resolveHumanFoundationRuntimeReviewQueue(catalog)).toEqual(expected);
    expect(expected).toEqual([
      "ProLongbow__FallALoop",
      "ProLongbow__FallALandToRunForward",
      "ProLongbow__StandingDodgeForward",
      "ProLongbow__StandingDodgeBackward",
      "ProLongbow__StandingDodgeLeft",
      "ProLongbow__StandingDodgeRight",
      "ProLongbow__StandingBlock",
    ]);
    expect(new Set(expected).size).toBe(7);
    expect(HUMAN_FOUNDATION_RUNTIME_REVIEW_QUEUE.every((entry) => (
      entry.packId === "pro-longbow-01" && entry.independentVisualReview === "PASS_PROVISIONAL"
    ))).toBe(true);

    const driftedFingerprint = structuredClone(catalog);
    driftedFingerprint.clips.find((entry) => entry.name === expected[0]).fingerprint = "A".repeat(64);
    expect(() => resolveHumanFoundationRuntimeReviewQueue(driftedFingerprint)).toThrow("fingerprint changed");

    const missingClip = structuredClone(catalog);
    missingClip.clips = missingClip.clips.filter((entry) => entry.name !== expected[0]);
    expect(() => resolveHumanFoundationRuntimeReviewQueue(missingClip)).toThrow("is missing");
  });

  it("proves the queued provider bytes, 65-bone hierarchy, and clip-track schema on fresh import", async () => {
    vi.stubGlobal("self", globalThis);
    const catalog = loadCatalog();
    const pack = catalog.packs.find((entry) => entry.id === "pro-longbow-01");
    expect(pack).toBeDefined();
    const bytes = readFileSync(localAssetPath(pack.url));
    expect(bytes.length).toBe(pack.bytes);
    expect(sha256(bytes)).toBe(pack.sha256);

    const gltf = await new GLTFLoader().parseAsync(arrayBuffer(bytes), "");
    const sceneNames = new Set();
    let boneCount = 0;
    gltf.scene.traverse((object) => {
      if (object.name) sceneNames.add(object.name);
      if (object instanceof THREE.Bone) boneCount += 1;
    });
    expect(boneCount).toBe(65);

    const imported = new Map(gltf.animations.map((clip) => [clip.name, clip]));
    for (const queued of HUMAN_FOUNDATION_RUNTIME_REVIEW_QUEUE) {
      const catalogClip = catalog.clips.find((clip) => clip.name === queued.clipName);
      expect(catalogClip).toMatchObject({
        packId: queued.packId,
        fingerprint: queued.catalogFingerprint,
      });
      const clip = imported.get(queued.clipName);
      expect(clip, `${queued.clipName} fresh import`).toBeDefined();
      expect(clip.tracks.length, `${queued.clipName} animation tracks`).toBeGreaterThan(0);
      for (const track of clip.tracks) {
        const nodeName = track.name.slice(0, track.name.lastIndexOf("."));
        expect(sceneNames.has(nodeName), `${queued.clipName} track target ${nodeName}`).toBe(true);
      }
    }
  });
});
