import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  animationFingerprint,
  parseGlb,
} from "../scripts/build-human-animation-review-packs.mjs";
import { HUMAN_FOUNDATION_APPROVED_ANIMATIONS } from "../src/game/humanFoundationApprovedAnimations";
import {
  PILOT_ANIMATION_SOURCE_SHA256,
  PilotAnimationCatalogLoader,
  validatePilotAnimationCatalog,
} from "../src/game/pilotAnimationCatalog";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = join(projectRoot, "public", "assets", "3d", "animations", "human-foundation-pilot");
const sourcePath = join(assetRoot, "human-foundation-pilot-animation-library.glb");
const catalogPath = join(assetRoot, "human-foundation-pilot-animation-catalog.json");
const builderPath = join(projectRoot, "scripts", "build-human-animation-review-packs.mjs");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function localAssetPath(url) {
  return resolve(projectRoot, "public", url.replace(/^\/assets\//, "assets/"));
}

function arrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function loadCatalog() {
  return validatePilotAnimationCatalog(JSON.parse(readFileSync(catalogPath, "utf8")));
}

describe("issue #487 lazy Human animation review catalog", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fails closed on source drift and catalogs every canonical and approved clip exactly once", () => {
    const sourceBytes = readFileSync(sourcePath);
    const catalog = loadCatalog();
    expect(sha256(sourceBytes)).toBe(PILOT_ANIMATION_SOURCE_SHA256);
    expect(catalog.source).toMatchObject({
      sha256: PILOT_ANIMATION_SOURCE_SHA256,
      bytes: sourceBytes.length,
      clipCount: 400,
    });
    expect(catalog.canonicalClipCount).toBe(400);
    expect(catalog.reviewClipCount).toBe(400 + HUMAN_FOUNDATION_APPROVED_ANIMATIONS.length);
    expect(new Set(catalog.clips.map((clip) => clip.name)).size).toBe(400);

    const approvedCatalog = catalog.standaloneApprovedClips.map((clip) => ({
      name: clip.name,
      sourceClipName: clip.sourceClipName,
      url: clip.url,
      sha256: clip.sha256,
      reviewStatus: clip.reviewStatus,
    }));
    const approvedRegistry = HUMAN_FOUNDATION_APPROVED_ANIMATIONS.map((spec) => ({
      name: spec.semanticClipName,
      sourceClipName: spec.sourceClipName,
      url: spec.url,
      sha256: spec.sourceSha256,
      reviewStatus: spec.reviewStatus,
    }));
    expect(approvedCatalog).toEqual(approvedRegistry);
    for (const clip of catalog.standaloneApprovedClips) {
      const bytes = readFileSync(localAssetPath(clip.url));
      expect(bytes.length).toBe(clip.bytes);
      expect(sha256(bytes)).toBe(clip.sha256);
    }

    expect(catalog.builder).toEqual({
      path: "scripts/build-human-animation-review-packs.mjs",
      sha256: sha256(readFileSync(builderPath)),
    });
    const drifted = structuredClone(catalog);
    drifted.source.sha256 = "A".repeat(64);
    expect(() => validatePilotAnimationCatalog(drifted)).toThrow("source.sha256");
  });

  it("preserves every animation channel and exact accessor payload while enforcing pack limits", () => {
    const source = parseGlb(readFileSync(sourcePath), sourcePath);
    const sourceAnimations = new Map(source.json.animations.map((animation) => [animation.name, animation]));
    const catalog = loadCatalog();
    const catalogClips = new Map(catalog.clips.map((clip) => [clip.name, clip]));
    const packedNames = [];

    for (const pack of catalog.packs) {
      const bytes = readFileSync(localAssetPath(pack.url));
      expect(bytes.length, `${pack.id} byte receipt`).toBe(pack.bytes);
      expect(bytes.length, `${pack.id} size limit`).toBeLessThanOrEqual(catalog.packPolicy.maxBytes);
      expect(sha256(bytes), `${pack.id} hash receipt`).toBe(pack.sha256);
      expect(pack.clipCount, `${pack.id} clip limit`).toBeLessThanOrEqual(catalog.packPolicy.maxClipCount);

      const parsed = parseGlb(bytes, pack.id);
      expect(parsed.json.meshes ?? [], `${pack.id} must stay motion-only`).toEqual([]);
      expect(parsed.json.cameras ?? [], `${pack.id} must not contain cameras`).toEqual([]);
      expect(parsed.json.lights ?? [], `${pack.id} must not contain lights`).toEqual([]);
      expect(parsed.json.animations.map((animation) => animation.name)).toEqual(pack.clipNames);
      expect(parsed.json.skins).toHaveLength(1);
      expect(parsed.json.skins[0].joints).toHaveLength(65);

      for (const animation of parsed.json.animations) {
        const sourceAnimation = sourceAnimations.get(animation.name);
        const catalogClip = catalogClips.get(animation.name);
        expect(sourceAnimation, `${animation.name} source`).toBeDefined();
        expect(catalogClip, `${animation.name} catalog`).toBeDefined();
        const packedFingerprint = animationFingerprint(parsed, animation);
        expect(packedFingerprint, `${animation.name} exact accessor bytes`)
          .toBe(animationFingerprint(source, sourceAnimation));
        expect(packedFingerprint, `${animation.name} catalog fingerprint`).toBe(catalogClip.fingerprint);
        packedNames.push(animation.name);
      }
    }

    expect(packedNames).toHaveLength(400);
    expect(new Set(packedNames).size).toBe(400);
    expect([...packedNames].sort()).toEqual([...sourceAnimations.keys()].sort());
  });

  it("fresh-imports every shard on the accepted 65-bone hierarchy", async () => {
    vi.stubGlobal("self", globalThis);
    const catalog = loadCatalog();
    const loader = new GLTFLoader();
    let importedClips = 0;
    for (const pack of catalog.packs) {
      const bytes = readFileSync(localAssetPath(pack.url));
      const gltf = await loader.parseAsync(arrayBuffer(bytes), "");
      expect(gltf.animations.map((clip) => clip.name)).toEqual(pack.clipNames);
      let boneCount = 0;
      gltf.scene.traverse((object) => {
        if (object instanceof THREE.Bone) boneCount += 1;
      });
      expect(boneCount, `${pack.id} bone count`).toBe(65);
      importedClips += gltf.animations.length;
    }
    expect(importedClips).toBe(400);
  });

  it("discovers all review names from metadata and keeps only two loaded assets resident", async () => {
    const catalog = loadCatalog();
    const packByUrl = new Map(catalog.packs.map((pack) => [pack.url, pack]));
    const standaloneByUrl = new Map(catalog.standaloneApprovedClips.map((clip) => [clip.url, clip]));
    const fakeLoader = {
      loadAsync: vi.fn(async (url) => {
        const pack = packByUrl.get(url);
        if (pack) return { animations: pack.clipNames.map((name) => new THREE.AnimationClip(name, 1, [])) };
        const standalone = standaloneByUrl.get(url);
        if (standalone) {
          return { animations: [new THREE.AnimationClip(standalone.sourceClipName, 1, [])] };
        }
        throw new Error(`Unexpected URL ${url}`);
      }),
    };
    const loader = new PilotAnimationCatalogLoader(catalog, fakeLoader, 2);
    const expectedReviewNames = [
      ...catalog.clips.map((clip) => clip.name),
      ...catalog.standaloneApprovedClips.map((clip) => clip.name),
    ].sort();
    expect(loader.reviewAnimations()).toEqual(expectedReviewNames);
    expect(loader.residency()).toMatchObject({ residentAssetIds: [], residentClipCount: 0 });

    const firstThreePacks = catalog.packs.slice(0, 3);
    const firstPair = firstThreePacks[0].clipNames.slice(0, 2);
    const [first, second] = await Promise.all(firstPair.map((name) => loader.loadClip(name)));
    expect([first.name, second.name]).toEqual(firstPair);
    expect(fakeLoader.loadAsync).toHaveBeenCalledTimes(1);
    await loader.loadClip(firstThreePacks[1].clipNames[0]);
    await loader.loadClip(firstThreePacks[2].clipNames[0]);
    expect(loader.residency().residentAssetIds).toEqual([firstThreePacks[1].id, firstThreePacks[2].id]);
    expect(loader.residency().residentClipCount).toBe(
      firstThreePacks[1].clipCount + firstThreePacks[2].clipCount,
    );

    await loader.loadClip(firstThreePacks[0].clipNames[0]);
    expect(fakeLoader.loadAsync).toHaveBeenCalledTimes(4);
    expect(loader.residency().residentAssetIds).toEqual([firstThreePacks[2].id, firstThreePacks[0].id]);
    const approved = catalog.standaloneApprovedClips[0];
    expect((await loader.loadClip(approved.name)).name).toBe(approved.name);
    expect(loader.residency().residentAssetIds).toEqual([firstThreePacks[0].id, `standalone:${approved.name}`]);
    expect(loader.residency().residentClipCount).toBe(firstThreePacks[0].clipCount + 1);
  });
});
