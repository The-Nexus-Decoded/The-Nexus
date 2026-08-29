import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBreachV2AnimationPilot } from "../src/game/dungeons/breach-v2-animation-pilot";
import { HUMAN_FOUNDATION_RUNTIME_REVIEW_QUEUE } from "../src/game/humanFoundationRuntimeReviewQueue";
import {
  validatePilotAnimationCatalog,
  type PilotAnimationCatalog,
} from "../src/game/pilotAnimationCatalog";

function bodyScene(): THREE.Group {
  const model = new THREE.Group();
  const armature = new THREE.Group();
  const hips = new THREE.Bone();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial());
  armature.name = "HumanFoundation_Armature";
  hips.name = "mixamorigHips";
  hips.position.y = -2;
  body.name = "HumanFoundation_BodyMesh";
  body.position.y = 1;
  hips.add(body);
  armature.add(hips);
  model.add(armature);
  return model;
}

function clip(name: string, airborne = false): THREE.AnimationClip {
  return new THREE.AnimationClip(name, 1, [
    new THREE.VectorKeyframeTrack(
      "mixamorigHips.position",
      [0, 0.5, 1],
      airborne
        ? [0, 0, 0, 0, 1.25, 0, 0, 0, 0]
        : [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ),
  ]);
}

const importNodeModule = (specifier: string) => import(specifier);
const nodeProcess = (globalThis as typeof globalThis & { process: { cwd: () => string } }).process;

async function loadRealGlb(path: string): Promise<GLTF> {
  const [{ readFile }, { default: nodePath }] = await Promise.all([
    importNodeModule("node:fs/promises"),
    importNodeModule("node:path"),
  ]);
  const bytes = await readFile(nodePath.resolve(nodeProcess.cwd(), path));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new GLTFLoader().parseAsync(buffer, "");
}

async function loadTestCatalog(): Promise<PilotAnimationCatalog> {
  const [{ readFile }, { default: nodePath }] = await Promise.all([
    importNodeModule("node:fs/promises"),
    importNodeModule("node:path"),
  ]);
  const path = nodePath.resolve(
    nodeProcess.cwd(),
    "public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-catalog.json",
  );
  return validatePilotAnimationCatalog(JSON.parse(await readFile(path, "utf8")));
}

function stubCatalogRequest(catalog: PilotAnimationCatalog): void {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(catalog), {
    status: 200,
    headers: { "content-type": "application/json" },
  })));
}

function syntheticCatalogLoader(catalog: PilotAnimationCatalog, body: THREE.Group): GLTFLoader {
  const packs = new Map(catalog.packs.map((pack) => [pack.url, pack]));
  const standalone = new Map(catalog.standaloneApprovedClips.map((entry) => [entry.url, entry]));
  return {
    loadAsync: vi.fn(async (url: string) => {
      if (url.includes("runtime-4k")) return { scene: body, animations: [] };
      const pack = packs.get(url);
      if (pack) {
        return {
          scene: new THREE.Group(),
          animations: pack.clipNames.map((name) => clip(name, /jump|fall|dive|airborne/i.test(name))),
        };
      }
      const approved = standalone.get(url);
      if (approved) return { scene: new THREE.Group(), animations: [clip(approved.sourceClipName)] };
      throw new Error(`Unexpected pilot animation request ${url}`);
    }),
  } as unknown as GLTFLoader;
}

describe("Breach V2 Human animation pilot grounding", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps one calibrated pivot through grounded rest, bone-driven jump, landing, replay, and clip switches", async () => {
    vi.stubGlobal("window", {});
    const body = bodyScene();
    const catalog = await loadTestCatalog();
    stubCatalogRequest(catalog);
    const loader = syntheticCatalogLoader(catalog, body);

    const pilot = await createBreachV2AnimationPilot(loader);
    const bridge = window.__SOULDRIFTER_PILOT_REVIEW__!;
    expect(bridge.reviewAnimations()).toHaveLength(404);
    expect(bridge.reviewAnimations().slice(0, HUMAN_FOUNDATION_RUNTIME_REVIEW_QUEUE.length)).toEqual(
      HUMAN_FOUNDATION_RUNTIME_REVIEW_QUEUE.map((entry) => entry.clipName),
    );
    expect(bridge.reviewAnimations()).toContain("AuthoredReaction__SpellImpactKnockbackAndFall");
    expect((loader.loadAsync as ReturnType<typeof vi.fn>).mock.calls.flat())
      .not.toContain("/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb");
    const pivot = pilot.root.getObjectByName("issue-487-human-pilot-grounding-pivot")!;
    const fixedPivotY = pivot.position.y;

    const rest = bridge.snapshot().grounding!;
    expect(rest.pass).toBe(true);
    expect(rest.clearanceMeters).toBeCloseTo(0, 9);
    expect(rest.appliedGroundingOffsetMeters).toBe(fixedPivotY);

    await bridge.playReview("BasicLocomotion__Jump", false);
    pilot.update(0.5);
    const apex = bridge.snapshot().grounding!;
    expect(apex.currentRootY).toBeCloseTo(apex.targetRootRestY, 9);
    expect(apex.authoredRootDeltaY).toBeCloseTo(0, 9);
    expect(apex.airborneClearanceAllowed).toBe(true);
    expect(apex.clearanceMeters).toBeGreaterThan(1);
    expect(apex.pass).toBe(true);
    expect(pivot.position.y).toBe(fixedPivotY);

    pilot.update(0.5);
    const landing = bridge.snapshot().grounding!;
    expect(landing.clearanceMeters).toBeCloseTo(0, 9);
    expect(landing.pass).toBe(true);
    expect(pivot.position.y).toBe(fixedPivotY);

    for (let replay = 0; replay < 25; replay += 1) {
      await bridge.playReview("MaleLocomotion__Idle", true);
      pilot.update(0.25);
      expect(bridge.snapshot().grounding!.clearanceMeters).toBeCloseTo(0, 9);
      expect(pivot.position.y).toBe(fixedPivotY);

      await bridge.playReview("BasicLocomotion__Jump", false);
      pilot.update(0.5);
      expect(bridge.snapshot().grounding!.clearanceMeters).toBeGreaterThan(1);
      expect(pivot.position.y).toBe(fixedPivotY);
    }

    pilot.dispose();
    body.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else object.material.dispose();
    });
  });

  it("proves lazy fixed-pivot grounding against the real body, review packs, and approved standalone", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("self", globalThis);
    const textureWarning = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const [body, catalog] = await Promise.all([
      loadRealGlb("public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb"),
      loadTestCatalog(),
    ]);
    stubCatalogRequest(catalog);
    const assetCache = new Map<string, Promise<GLTF>>();
    const loadAsset = (url: string): Promise<GLTF> => {
      const cached = assetCache.get(url);
      if (cached) return cached;
      const loaded = loadRealGlb(`public${url}`);
      assetCache.set(url, loaded);
      return loaded;
    };
    const sourceClip = async (name: string): Promise<THREE.AnimationClip> => {
      const entry = catalog.clips.find((candidate) => candidate.name === name);
      if (!entry) throw new Error(`Missing real catalog clip ${name}`);
      const pack = catalog.packs.find((candidate) => candidate.id === entry.packId)!;
      const gltf = await loadAsset(pack.url);
      return gltf.animations.find((candidate) => candidate.name === name)!;
    };
    const [maleJump, basicJump] = await Promise.all([
      sourceClip("MaleLocomotion__Jump"),
      sourceClip("BasicLocomotion__Jump"),
    ]);
    expect(basicJump.duration).toBe(maleJump.duration);
    expect(basicJump.tracks.map((track) => ({
      name: track.name,
      times: Array.from(track.times),
      values: Array.from(track.values),
    }))).toEqual(maleJump.tracks.map((track) => ({
      name: track.name,
      times: Array.from(track.times),
      values: Array.from(track.values),
    })));

    const loader = {
      loadAsync: vi.fn(async (url: string) => {
        if (url.includes("runtime-4k")) return body;
        return loadAsset(url);
      }),
    } as unknown as GLTFLoader;
    const pilot = await createBreachV2AnimationPilot(loader);
    textureWarning.mockRestore();
    const bridge = window.__SOULDRIFTER_PILOT_REVIEW__!;
    expect(bridge.reviewAnimations()).toHaveLength(404);
    expect(bridge.reviewAnimations()).toContain("AuthoredUtility__Lockpick");
    expect((loader.loadAsync as ReturnType<typeof vi.fn>).mock.calls.flat().join("\n"))
      .not.toContain("human-foundation-pilot-animation-library.glb");
    const pivot = pilot.root.getObjectByName("issue-487-human-pilot-grounding-pivot")!;
    const fixedPivotY = pivot.position.y;
    const sample = async (name: string, timeSeconds: number) => {
      await bridge.playReview(name, false);
      pilot.update(timeSeconds);
      expect(pivot.position.y).toBe(fixedPivotY);
      return bridge.snapshot().grounding!;
    };

    const idle = await sample("MaleLocomotion__Idle", 0);
    expect(Math.abs(idle.clearanceMeters)).toBeLessThanOrEqual(0.01);
    const maleStart = await sample("MaleLocomotion__Jump", 0);
    const maleApex = await sample("MaleLocomotion__Jump", maleJump.duration / 2);
    const maleLanding = await sample("MaleLocomotion__Jump", maleJump.duration);
    const basicStart = await sample("BasicLocomotion__Jump", 0);
    const basicApex = await sample("BasicLocomotion__Jump", basicJump.duration / 2);
    const basicLanding = await sample("BasicLocomotion__Jump", basicJump.duration);
    const lockpickEntry = catalog.standaloneApprovedClips.find((entry) => entry.name === "AuthoredUtility__Lockpick")!;
    const lockpick = await loadAsset(lockpickEntry.url);
    const lockpickClip = lockpick.animations.find((candidate) => candidate.name === lockpickEntry.sourceClipName)!;
    const lockpickStart = await sample("AuthoredUtility__Lockpick", 0);
    const lockpickMidpoint = await sample("AuthoredUtility__Lockpick", lockpickClip.duration / 2);
    const lockpickEnd = await sample("AuthoredUtility__Lockpick", lockpickClip.duration);

    expect(Math.abs(maleStart.clearanceMeters)).toBeLessThanOrEqual(0.01);
    expect(maleApex.clearanceMeters).toBeGreaterThan(0.25);
    expect(Math.abs(maleLanding.clearanceMeters)).toBeLessThanOrEqual(0.01);
    expect(basicStart.clearanceMeters).toBeCloseTo(maleStart.clearanceMeters, 9);
    expect(basicApex.clearanceMeters).toBeCloseTo(maleApex.clearanceMeters, 9);
    expect(basicLanding.clearanceMeters).toBeCloseTo(maleLanding.clearanceMeters, 9);
    expect(Math.abs(lockpickStart.clearanceMeters)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(lockpickMidpoint.clearanceMeters)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(lockpickEnd.clearanceMeters)).toBeLessThanOrEqual(0.01);
    expect(bridge.reviewResidency().residentAssetIds.length).toBeLessThanOrEqual(2);
    expect(bridge.reviewResidency().residentBoundClipNames.length).toBeLessThanOrEqual(2);

    pilot.dispose();
    body.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else object.material.dispose();
    });
  });

  it("rejects stale async selections and evicts mixer clips beyond the two-clip boundary", async () => {
    vi.stubGlobal("window", {});
    const body = bodyScene();
    const catalog = await loadTestCatalog();
    stubCatalogRequest(catalog);
    const idleEntry = catalog.clips.find((entry) => entry.name === "MaleLocomotion__Idle")!;
    const candidatePacks = catalog.packs.filter((pack) => pack.id !== idleEntry.packId).slice(0, 3);
    const [slowPack, fastPack, thirdPack] = candidatePacks;
    const packs = new Map(catalog.packs.map((pack) => [pack.url, pack]));
    const standalone = new Map(catalog.standaloneApprovedClips.map((entry) => [entry.url, entry]));
    let delaySlowPack = false;
    let releaseSlowPack: (() => void) | undefined;
    const slowGate = new Promise<void>((resolve) => { releaseSlowPack = resolve; });
    const loader = {
      loadAsync: vi.fn(async (url: string) => {
        if (url.includes("runtime-4k")) return { scene: body, animations: [] };
        const pack = packs.get(url);
        if (pack) {
          if (delaySlowPack && pack.id === slowPack!.id) await slowGate;
          return {
            scene: new THREE.Group(),
            animations: pack.clipNames.map((name) => clip(name, /jump|fall|dive|airborne/i.test(name))),
          };
        }
        const approved = standalone.get(url);
        if (approved) return { scene: new THREE.Group(), animations: [clip(approved.sourceClipName)] };
        throw new Error(`Unexpected pilot animation request ${url}`);
      }),
    } as unknown as GLTFLoader;
    const uncacheClip = vi.spyOn(THREE.AnimationMixer.prototype, "uncacheClip");
    const pilot = await createBreachV2AnimationPilot(loader);
    const bridge = window.__SOULDRIFTER_PILOT_REVIEW__!;
    delaySlowPack = true;
    const slowName = slowPack!.clipNames[0]!;
    const fastName = fastPack!.clipNames[0]!;
    const thirdName = thirdPack!.clipNames[0]!;

    const staleSelection = bridge.playReview(slowName, false);
    const winningSelection = bridge.playReview(fastName, false);
    await winningSelection;
    expect(bridge.snapshot().playerAnimation).toBe(fastName);
    releaseSlowPack!();
    expect(await staleSelection).toBe(0);
    expect(bridge.snapshot().playerAnimation).toBe(fastName);

    await bridge.playReview(thirdName, false);
    expect(bridge.snapshot().playerAnimation).toBe(thirdName);
    expect(bridge.reviewResidency().residentAssetIds.length).toBeLessThanOrEqual(2);
    expect(bridge.reviewResidency().residentBoundClipNames.length).toBeLessThanOrEqual(2);
    expect(uncacheClip).toHaveBeenCalled();
    expect((loader.loadAsync as ReturnType<typeof vi.fn>).mock.calls.flat().join("\n"))
      .not.toContain("human-foundation-pilot-animation-library.glb");

    pilot.dispose();
    body.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else object.material.dispose();
    });
  });
});
