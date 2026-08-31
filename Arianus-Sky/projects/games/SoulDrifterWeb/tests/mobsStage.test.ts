import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BREACHLING_RUNTIME_ASSETS } from "../src/game/dungeons/breach-v2-breachlings";
import { CINDERBOUND_WARDEN_ACTIONS, CINDERBOUND_WARDEN_ASSETS } from "../src/game/dungeons/breach-v2-wardens";
import { MOB_CATALOG, MobsStage, mobCalibrationKey, type MobDefinition } from "../src/review/weapon-lab/mobs-stage";
import { REVIEWED_BASE_MOB_RECEIPT, REVIEWED_BASE_MOB_URL } from "../src/review/weapon-lab/reviewed-mob-receipt";

// This browser project deliberately does not include ambient Node types.
// Keep the narrow CPU-test host contract local, as the topology tests do.
const importNodeModule = <T>(specifier: string): Promise<T> => import(/* @vite-ignore */ specifier);
const { readFileSync } = await importNodeModule<{ readFileSync(path: URL): Uint8Array }>("node:fs");
const { createHash, webcrypto } = await importNodeModule<{
  createHash(algorithm: string): { update(bytes: Uint8Array): { digest(encoding: "hex"): string } };
  webcrypto: Crypto;
}>("node:crypto");

const nativeParseAsync = GLTFLoader.prototype.parseAsync;
const stages = new Set<MobsStage>();
const installedBytes = new Map<string, Uint8Array<ArrayBuffer>>();

function bytesFor(definition: MobDefinition): Uint8Array<ArrayBuffer> {
  let bytes = installedBytes.get(definition.id);
  if (!bytes) {
    bytes = Uint8Array.from(readFileSync(new URL(`../public${definition.url}`, import.meta.url)));
    installedBytes.set(definition.id, bytes);
  }
  return bytes;
}

function glbHeader(definition: MobDefinition) {
  const bytes = bytesFor(definition);
  const view = new DataView(bytes.buffer);
  expect(view.getUint32(0, true)).toBe(0x46546c67);
  expect(view.getUint32(4, true)).toBe(2);
  expect(view.getUint32(8, true)).toBe(bytes.byteLength);
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + view.getUint32(12, true)))) as {
    animations: Array<{ name: string }>;
    skins: Array<{ joints: number[] }>;
    meshes: unknown[];
  };
}

function responseFor(definition: MobDefinition): Response {
  return new Response(bytesFor(definition), { status: 200, headers: { "content-type": "model/gltf-binary" } });
}

function installedFetch(input: RequestInfo | URL): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const definition = MOB_CATALOG.find((candidate) => url.pathname.endsWith(candidate.url));
  if (!definition) return Promise.reject(new Error(`Unexpected test fetch ${url}`));
  return Promise.resolve(responseFor(definition));
}

function stage() {
  const scene = new THREE.Scene();
  const value = new MobsStage(scene);
  stages.add(value);
  return { stage: value, scene };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.stubGlobal("document", { baseURI: "http://localhost:5179/weapon-lab.html" });
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("fetch", vi.fn(installedFetch));
  // Parse the exact pinned GLB, including mesh/weights/rig/clips/materials.
  // Only image decoding is replaced for Node CPU tests; this is not visual QA.
  vi.spyOn(GLTFLoader.prototype, "parseAsync").mockImplementation(function (this: GLTFLoader, data, path) {
    this.register(() => ({
      name: "TEST_CPU_TEXTURE_DECODE_ONLY",
      loadTexture: async () => {
        const texture = new THREE.Texture();
        texture.image = { width: 1, height: 1 };
        return texture;
      },
    }));
    return nativeParseAsync.call(this, data, path);
  });
});

afterEach(() => {
  try {
    for (const value of stages) value.dispose();
  } finally {
    stages.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});

describe("Mobs stage exact installed asset contract", () => {
  it("pins all four current Breachlings and both Wardens to real source bytes and runtime catalogs", () => {
    expect(MOB_CATALOG.map((definition) => definition.id)).toEqual([
      "breachling-base", "breachling-stalker", "breachling-oathbound", "breachling-ravager",
      "warden-wayfarer", "warden-oathbreaker",
    ]);
    for (const definition of MOB_CATALOG) {
      const bytes = bytesFor(definition);
      expect(bytes.byteLength, definition.id).toBe(definition.bytes);
      expect(createHash("sha256").update(bytes).digest("hex"), definition.id).toBe(definition.sha256);
      const catalog = definition.family === "breachling"
        ? BREACHLING_RUNTIME_ASSETS[definition.variant as keyof typeof BREACHLING_RUNTIME_ASSETS]
        : CINDERBOUND_WARDEN_ASSETS[definition.variant as keyof typeof CINDERBOUND_WARDEN_ASSETS];
      expect(definition).toMatchObject({ runtimeUrl: catalog.url, targetHeightMeters: catalog.targetHeightMeters });
      if (definition.reviewedMotion) {
        expect(definition.id).toBe("breachling-base");
        expect(definition.label).toBe("Base Breachling · revised attacks");
        expect(definition.url).toBe(REVIEWED_BASE_MOB_URL);
      } else expect(definition).toMatchObject({ label: catalog.label, url: catalog.url });
      const header = glbHeader(definition);
      expect(header.skins).toHaveLength(1);
      expect(header.skins[0]?.joints).toHaveLength(definition.family === "breachling" ? 24 : 18);
      expect(header.meshes).toHaveLength(definition.family === "breachling" ? 1 : 4);
      expect(header.animations).toHaveLength(definition.family === "breachling" ? 12 : 13);
    }
  });

  it.each(MOB_CATALOG)("loads $id through its actual shared controller and weighted GLB", async (definition) => {
    const { stage: value, scene } = stage();
    expect(await value.select(definition.id)).toBe(true);
    expect(value.ready).toBe(true);
    expect(value.checksumVerified).toBe(true);
    const actor = value.actor()!;
    expect(actor.root.name).toBe(`studio:${definition.id}`);
    expect(actor.model.name).toBe(`${definition.reviewedMotion ? BREACHLING_RUNTIME_ASSETS.base.label : definition.label} model`);
    if (definition.reviewedMotion) expect(actor.model.scale.toArray()).toEqual([
      expect.closeTo(1.7714769640700978, 6), expect.closeTo(1.7714769640700978, 6), expect.closeTo(1.7714769640700978, 6),
    ]);
    expect(actor.root.userData.spatialOwnerId).toBe(`studio:${definition.id}`);
    expect(actor.root.userData[definition.family === "breachling" ? "creatureTier" : "wardenKind"]).toBe(definition.variant);
    expect(value.actions()).toEqual(glbHeader(definition).animations.map((clip) => clip.name)
      .filter((name) => name !== "SwordSlashOutward").sort());
    expect(value.snapshot()).toMatchObject({ currentClip: "CombatIdle", playbackSpeed: 0.6, reviewLoop: true });
    const audit = value.overlay!.audit();
    expect(audit.bones).toHaveLength(definition.family === "breachling" ? 24 : 18);
    expect(audit.skinnedMeshCount).toBe(definition.family === "breachling" ? 1 : 4);
    if (definition.family === "breachling") {
      expect(actor.model.getObjectByName("front_handR")).toBeInstanceOf(THREE.Bone);
      expect(audit.availableControls).toEqual(expect.arrayContaining(["rightPawPitch", "leftPawPitch", "jawOpen", "tail5Sweep"]));
      expect(value.actionLabel("LungeAttack")).toContain("inspection only");
      expect(value.actionLabel("SpitAttack").includes("inspection only")).toBe(["base", "stalker"].includes(definition.variant));
      expect(value.actionLabel("RecieveHit")).toBe(definition.reviewedMotion ? "Receive hit · source · not revised" : "Receive hit");
    } else {
      expect(value.actions()).toEqual([...CINDERBOUND_WARDEN_ACTIONS].sort());
      expect(audit.availableControls).toContain("rightBladeAngle");
      expect(audit.availableControls).not.toContain("rightHandPitch");
      expect(audit.bones.find((bone) => bone.name === "hand_R")?.directWeightedVertices).toBe(0);
    }
    value.setAction(definition.family === "breachling" ? "Walk" : "HeavyWalk");
    value.pose(0.25);
    const firstPose = new Map<string, THREE.Vector3>();
    actor.model.traverse((object) => {
      if (object instanceof THREE.Bone) firstPose.set(object.name, object.getWorldPosition(new THREE.Vector3()));
    });
    value.pose(0.75);
    expect(value.snapshot()?.normalizedTime).toBeCloseTo(0.75, 7);
    const jointTravel = [...firstPose].map(([name, position]) => (
      actor.model.getObjectByName(name)!.getWorldPosition(new THREE.Vector3()).distanceTo(position)
    ));
    expect(Math.max(...jointTravel), `${definition.id} actual gait joint motion`).toBeGreaterThan(0.001);
    value.showSkeleton(true);
    expect(scene.getObjectByName("Actual weighted rig diagnostics")).toBeInstanceOf(THREE.SkeletonHelper);
    value.showSkeleton(false);
    expect(scene.getObjectByName("Actual weighted rig diagnostics")?.visible).toBe(false);
    value.dispose();
    expect(scene.children).toHaveLength(0);
    expect(value.actor()).toBeNull();
  }, 20_000);
});

describe("Mobs stage live sampling and draft isolation", () => {
  it("samples the actual pose, changes animation speed, holds a paused phase, and applies/reset a real paw joint", async () => {
    const { stage: value } = stage();
    await value.select("breachling-base");
    value.setAction("Walk");
    value.setPlayback(0.5, true);
    value.setPlaying(true);
    value.restart();
    value.update(0.4);
    expect(value.snapshot()?.timeSeconds).toBeCloseTo(0.2, 7);
    value.pose(0.35);
    const paw = value.actor()!.model.getObjectByName("front_handR")!;
    const reference = paw.quaternion.clone();
    const referenceWorldPosition = paw.getWorldPosition(new THREE.Vector3());
    const phase = value.snapshot()!.normalizedTime;
    value.update(0.5);
    expect(value.snapshot()?.paused).toBe(true);
    expect(value.snapshot()?.normalizedTime).toBeCloseTo(phase, 7);
    expect(paw.quaternion.angleTo(reference)).toBeLessThan(1e-7);
    value.setControl("rightPawPitch", 12);
    expect(paw.quaternion.angleTo(reference)).toBeCloseTo(THREE.MathUtils.degToRad(12), 5);
    for (let pass = 0; pass < 20; pass += 1) value.update(0);
    expect(paw.quaternion.angleTo(reference)).toBeCloseTo(THREE.MathUtils.degToRad(12), 5);
    expect(Number.isFinite(value.measureContact()?.minimumSurfaceMeters)).toBe(true);
    value.resetPose();
    expect(paw.quaternion.angleTo(reference)).toBeLessThan(1e-7);
    value.pose(0.7);
    // This authored walk holds the paw's local angle while the upper/lower
    // chain moves it; assert its real world path, not an invented wrist curl.
    expect(paw.getWorldPosition(new THREE.Vector3()).distanceTo(referenceWorldPosition)).toBeGreaterThan(0.001);
  }, 20_000);

  it("keeps drafts keyed by exact asset and clip, validates imports atomically, and restores them after switching models", async () => {
    const { stage: value } = stage();
    await value.select("breachling-base");
    value.setAction("ClawAttack");
    value.setControl("rightPawPitch", 11);
    const clawDraft = value.draft();
    expect(clawDraft.calibrationKey).toBe(mobCalibrationKey(value.definition!, "ClawAttack"));
    value.setAction("BiteAttack");
    expect(value.overlay!.values().rightPawPitch).toBe(0);
    value.setControl("jawOpen", 9);
    expect(() => value.importDraft(clawDraft)).toThrow("exact model revision and selected action");
    value.setAction("ClawAttack");
    expect(value.overlay!.values().rightPawPitch).toBe(11);
    expect(value.overlay!.values().jawOpen).toBe(0);
    const beforeInvalid = value.overlay!.values();
    for (const draft of [
      { ...clawDraft, assetSha256: "wrong-hash" },
      { ...clawDraft, assetId: "breachling-stalker" },
      { ...clawDraft, controls: { rightPawPitch: 20, inventedFinger: 8 } },
      { ...clawDraft, controls: { rightPawPitch: Number.NaN } },
    ]) {
      expect(() => value.importDraft(draft)).toThrow();
      expect(value.overlay!.values()).toEqual(beforeInvalid);
    }
    value.resetPose();
    value.importDraft(clawDraft);
    expect(value.overlay!.values().rightPawPitch).toBe(11);
    await value.select("breachling-stalker");
    value.setAction("ClawAttack");
    expect(value.overlay!.values().rightPawPitch).toBe(0);
    value.setControl("rightPawPitch", -7);
    await value.select("breachling-base");
    value.setAction("ClawAttack");
    expect(value.overlay!.values().rightPawPitch).toBe(11);
    value.resetPose();
    value.setAction("BiteAttack");
    expect(value.overlay!.values().jawOpen).toBe(9);
    value.setAction("ClawAttack");
    expect(value.overlay!.values().rightPawPitch).toBe(0);
  }, 20_000);

  it("preserves an Idle draft when an existing asset is reloaded before selecting another action", async () => {
    const { stage: value } = stage();
    await value.select("breachling-base");
    value.setAction("Idle");
    value.setControl("jawOpen", 8);
    await value.select("breachling-stalker");
    await value.select("breachling-base");
    value.setAction("Idle");
    expect(value.overlay!.values().jawOpen).toBe(8);
  }, 20_000);
});

describe("Mobs stage asynchronous lifecycle and intake failure", () => {
  it("ignores a late first fetch after a faster selection without resurrecting or leaking its actor", async () => {
    const pending = deferred<Response>();
    let firstSignal: AbortSignal | null | undefined;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, options?: RequestInit) => {
      if (String(input).endsWith(MOB_CATALOG[0]!.url)) {
        firstSignal = options?.signal;
        return pending.promise;
      }
      return installedFetch(input);
    }));
    const { stage: value, scene } = stage();
    const first = value.select("breachling-base");
    await vi.waitFor(() => expect(firstSignal).toBeTruthy());
    const second = value.select("breachling-stalker");
    expect(await second).toBe(true);
    expect(firstSignal?.aborted).toBe(true);
    pending.resolve(responseFor(MOB_CATALOG[0]!));
    expect(await first).toBe(false);
    expect(value.definition?.id).toBe("breachling-stalker");
    expect(value.actor()?.root.name).toBe("studio:breachling-stalker");
    expect(scene.getObjectByName("studio:breachling-base")).toBeUndefined();
    expect(scene.children).toHaveLength(1);
  }, 20_000);

  it("can dispose while a boss fetch is pending and never create its late model", async () => {
    const pending = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn(() => pending.promise));
    const { stage: value, scene } = stage();
    const selection = value.select("warden-wayfarer");
    expect(() => value.dispose()).not.toThrow();
    pending.resolve(responseFor(MOB_CATALOG[4]!));
    expect(await selection).toBe(false);
    expect(value.ready).toBe(false);
    expect(value.actor()).toBeNull();
    expect(scene.children).toHaveLength(0);
  }, 20_000);

  it("preserves meaningful network and exact-SHA intake errors and cleans failed selections", async () => {
    const { stage: value, scene } = stage();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 503 })));
    await expect(value.select("breachling-base")).rejects.toThrow("HTTP 503");
    expect(scene.children).toHaveLength(0);
    const changed = bytesFor(MOB_CATALOG[0]!).slice();
    changed[changed.length - 1] = changed[changed.length - 1]! ^ 1;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(changed)));
    await expect(value.select("breachling-base")).rejects.toThrow("SHA-256");
    expect(scene.children).toHaveLength(0);
    expect(value.ready).toBe(false);
  });
});

describe("Motion Studio base intake remains separate from the dungeon", () => {
  it("keeps the canonical dungeon source URL and original GLB bytes unchanged", () => {
    const canonical = BREACHLING_RUNTIME_ASSETS.base;
    expect(canonical.url).toBe("/assets/3d/characters/breachlings/breachling-base.glb");
    expect(canonical.label).toBe("Base Breachling");
    const bytes = readFileSync(new URL(`../public${canonical.url}`, import.meta.url));
    expect(bytes.byteLength).toBe(6429716);
    expect(createHash("sha256").update(bytes).digest("hex"))
      .toBe("00921227fb9a2c3049363c1a8bda35bb8acf20a73811e3ad86c6256bd91b0cc7");
    expect(MOB_CATALOG[0]!.runtimeUrl).toBe(canonical.url);
  });

  // These exercise the exact public GLB authorized for isolated review.
  it("fetches only the reviewed base URL and fails closed without SHA-256", async () => {
    const { stage: value, scene } = stage();
    await value.select("breachling-base");
    expect(vi.mocked(fetch).mock.calls).toHaveLength(1);
    expect(String(vi.mocked(fetch).mock.calls[0]![0])).toBe(`http://localhost:5179${REVIEWED_BASE_MOB_URL}`);
    expect(value.draft().assetSha256).toBe(REVIEWED_BASE_MOB_RECEIPT!.sha256);
    vi.mocked(fetch).mockClear();
    vi.stubGlobal("crypto", undefined);
    await expect(value.select("breachling-base")).rejects.toThrow("require SHA-256");
    expect(fetch).not.toHaveBeenCalled();
    expect(scene.children).toHaveLength(0);
    // Legacy variants retain their pre-existing insecure-context behavior.
    await expect(value.select("breachling-stalker")).resolves.toBe(true);
    expect(value.checksumVerified).toBe(false);
  }, 20_000);

  it("distinguishes neutral holds, revised motion and untouched source clips, and hides only the revised solo-stage spit projectile", async () => {
    const { stage: value, scene } = stage();
    await value.select("breachling-base");
    expect(value.actionLabel("Idle")).toContain("approved neutral hold");
    expect(value.actionLabel("CombatIdle")).toContain("approved neutral hold");
    expect(value.actionLabel("SpitAttack")).toContain("projectile pending");
    for (const clip of ["Walk", "Run", "Death", "RecieveHit"]) {
      expect(value.actionLabel(clip)).toContain("source · not revised");
    }
    expect(value.actions()).not.toContain("SwordSlashOutward");
    value.setAction("SpitAttack");
    value.pose(0.5);
    value.update(0);
    const projectile = scene.getObjectByName("studio:breachling-base:poison-spit");
    expect(projectile).toBeInstanceOf(THREE.Mesh);
    expect(projectile!.visible).toBe(false);
    value.update(1.5);
    expect(scene.getObjectByName(projectile!.name)).toBeUndefined();
    await value.select("breachling-oathbound");
    expect(value.actionLabel("Walk")).toBe("Walk");
    expect(value.actionLabel("RecieveHit")).toBe("Receive hit");
    value.setAction("SpitAttack");
    value.pose(0.5);
    value.update(0);
    expect(scene.getObjectByName("studio:breachling-oathbound:poison-spit")?.visible).toBe(true);
  }, 20_000);

  it.each([
    { name: "BiteAttack", chains: [["spine001", "spine002"], ["neck"], ["head"], ["jaw"]] },
    { name: "ClawAttack", chains: [["front_upperR"], ["front_lowerR"], ["front_handR"], ["pelvis", "spine001", "spine002"]] },
    { name: "LungeAttack", chains: [
      ["front_upperL"], ["front_lowerL"], ["front_handL"], ["front_upperR"], ["front_lowerR"], ["front_handR"],
      ["rear_thighL"], ["rear_shinL"], ["rear_thighR"], ["rear_shinR"],
    ] },
    { name: "TailWhip", chains: [["pelvis"], ["spine001", "spine002"], ["tail001"], ["tail002"], ["tail003"], ["tail004"], ["tail005"]] },
    { name: "SpitAttack", chains: [["spine001", "spine002"], ["neck"], ["head"], ["jaw"]] },
  ])("plays actual revised $name joint chains, scrubs, pauses, and repeats without root accumulation", async ({ name, chains }) => {
    const { stage: value } = stage();
    await value.select("breachling-base");
    expect(REVIEWED_BASE_MOB_RECEIPT!.actions).toContain(name);
    expect(value.actionLabel(name)).toContain("revised motion");
    value.setPlayback(1, false);
    value.setAction(name);
    const model = value.actor()!.model;
    const bones = new Map<string, THREE.Bone>();
    model.traverse((object) => { if (object instanceof THREE.Bone) bones.set(object.name, object); });
    const initial = new Map([...bones].map(([key, bone]) => [key, {
      position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone(),
    }]));
    // Float32 GLB quaternions can be microscopically non-unit even at identical
    // keys. Compare orientation, not that harmless serialization norm error.
    const rotationDifference = (a: THREE.Quaternion, b: THREE.Quaternion) => a.clone().normalize().angleTo(b.clone().normalize());
    const variation = new Map([...bones.keys()].map((key) => [key, 0]));
    let maximumVisibleFloorGap = -Infinity;
    for (let sample = 1; sample <= 40; sample += 1) {
      value.pose(sample / 40);
      for (const [key, bone] of bones) {
        const first = initial.get(key)!;
        variation.set(key, Math.max(variation.get(key)!, rotationDifference(bone.quaternion, first.quaternion)));
        if (key !== "root") expect(bone.position.distanceTo(first.position), `${name}/${key} has no bone stretching`).toBeLessThan(1e-6);
        expect(bone.scale.distanceTo(first.scale), `${name}/${key} has no animated scale`).toBeLessThan(1e-6);
      }
      if (name === "LungeAttack") maximumVisibleFloorGap = Math.max(maximumVisibleFloorGap, value.measureContact()!.minimumSurfaceMeters);
    }
    for (const chain of chains) {
      expect(Math.max(...chain.map((key) => variation.get(key) ?? 0)), `${name}/${chain.join("+")} articulates locally`).toBeGreaterThan(0.001);
    }
    if (name === "LungeAttack") expect(maximumVisibleFloorGap).toBeGreaterThan(0.3);
    for (const [key, bone] of bones) {
      expect(bone.position.distanceTo(initial.get(key)!.position), `${name}/${key} returns to approved neutral`).toBeLessThan(1e-6);
      expect(rotationDifference(bone.quaternion, initial.get(key)!.quaternion)).toBeLessThan(1e-5);
    }
    const duration = value.snapshot()!.durationSeconds;
    value.setPlayback(1, true);
    value.setPlaying(true);
    value.restart();
    value.update(duration * 2.37);
    expect(value.snapshot()!.normalizedTime).toBeCloseTo(0.37, 6);
    const looped = new Map([...bones].map(([key, bone]) => [key, {
      position: bone.position.clone(), quaternion: bone.quaternion.clone(),
    }]));
    value.pose(0.37);
    value.update(duration);
    expect(value.snapshot()!.paused).toBe(true);
    expect(value.snapshot()!.normalizedTime).toBeCloseTo(0.37, 6);
    for (const [key, bone] of bones) {
      expect(bone.position.distanceTo(looped.get(key)!.position), `${name}/${key} repeat matches direct sampling`).toBeLessThan(1e-6);
      expect(rotationDifference(bone.quaternion, looped.get(key)!.quaternion)).toBeLessThan(1e-5);
    }
  }, 20_000);
});
