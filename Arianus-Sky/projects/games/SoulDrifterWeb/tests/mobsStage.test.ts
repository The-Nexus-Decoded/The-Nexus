import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BREACHLING_RUNTIME_ASSETS } from "../src/game/dungeons/breach-v2-breachlings";
import { CINDERBOUND_WARDEN_ACTIONS, CINDERBOUND_WARDEN_ASSETS } from "../src/game/dungeons/breach-v2-wardens";
import { MOB_CATALOG, MobsStage, mobCalibrationKey, type MobDefinition } from "../src/review/weapon-lab/mobs-stage";
import { REVIEWED_BASE_MOB_RECEIPT, REVIEWED_BASE_MOB_URL, REVIEWED_MOB_RECEIPTS,
  prepareReviewedMobReceipts, reviewedMobNote, type ReviewedMobReceipt } from "../src/review/weapon-lab/reviewed-mob-receipt";
import { createMobReviewActor, type MobReviewActor } from "../src/review/weapon-lab/mob-review-actor";
import { createReviewMeshProbe } from "../src/review/weapon-lab/combat-review-probes";
import { sampleReviewPoses, measureReviewMotionBounds } from "../src/review/weapon-lab/combat-review-posing";

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
const reviewActors = new Set<MobReviewActor>();
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
    for (const value of reviewActors) value.dispose();
  } finally {
    stages.clear();
    reviewActors.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});

describe("Independent creatures on the shared combat clock", () => {
  async function actor(definitionId: string, instanceId = definitionId) {
    const value = await createMobReviewActor({ definitionId, instanceId });
    reviewActors.add(value);
    return value;
  }
  function pose(value: MobReviewActor) {
    value.root.updateWorldMatrix(true, true);
    const result: number[] = [];
    value.model.traverse((object) => {
      if (object instanceof THREE.Bone) result.push(...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray());
    });
    return result;
  }

  it.each(MOB_CATALOG.map((entry) => entry.id))("samples every actual %s action deterministically", async (id) => {
    const value = await actor(id);
    expect(value.checksumVerified).toBe(true);
    expect(value.actions().length).toBeGreaterThan(10);
    expect(value.actions().some((action) => action.semantic === "death")).toBe(true);
    expect(value.actions().some((action) => action.semantic === "reaction")).toBe(true);
    for (const action of value.actions()) {
      value.sample(action.id, action.durationSeconds * 0.37);
      const expected = pose(value);
      value.sample(action.id, action.durationSeconds * 0.91);
      value.sample(action.id, action.durationSeconds * 0.37);
      expect(pose(value), action.id).toEqual(expected);
      expect(value.snapshot()!.paused).toBe(true);
      expect(value.snapshot()!.normalizedTime).toBeCloseTo(0.37, 6);
      expect(action.approvalStatus).not.toBe("runtime-approved");
    }
    value.reset();
    expect(value.snapshot()!.timeSeconds).toBe(0);
    expect(() => value.sample("made-up-move", 0)).toThrow(/does not provide/);
    expect(() => value.sample(value.actions()[0]!.id, NaN)).toThrow(/finite/);
    expect(value.socketWorld("human-pinky", new THREE.Vector3())).toBe(false);
  }, 30_000);

  it.each(["breachling-base", "warden-wayfarer"])("isolates same-model %s pairs, calibration, transforms and disposal", async (id) => {
    const first = await actor(id, "attacker");
    const second = await actor(id, "defender");
    const scene = new THREE.Scene();
    scene.add(first.root, second.root);
    const action = first.actions().find((entry) => entry.semantic === "attack")!;
    first.sample(action.id, action.durationSeconds * 0.37);
    second.sample(action.id, action.durationSeconds * 0.37);
    expect(pose(first)).toEqual(pose(second));
    const secondPose = pose(second);
    const control = first.controls[0]!;
    first.setControl(control.id, 5);
    first.sample(action.id, action.durationSeconds * 0.37);
    expect(pose(second)).toEqual(secondPose);
    expect(first.calibration().controls[control.id]).toBe(5);
    expect(second.calibration().controls[control.id]).toBe(0);
    first.clearCalibration();
    first.sample(action.id, action.durationSeconds * 0.37);
    expect(pose(first)).toEqual(secondPose);
    const socket = first.controls[0]!.bone;
    const before = new THREE.Vector3();
    expect(first.socketWorld(socket, before)).toBe(true);
    first.root.position.set(4, 0, 3);
    first.root.rotation.y = 0.85;
    first.sample(action.id, action.durationSeconds * 0.37);
    const moved = new THREE.Vector3();
    first.socketWorld(socket, moved);
    expect(moved.distanceTo(before.applyMatrix4(first.root.matrixWorld))).toBeLessThan(1e-6);
    expect(pose(second)).toEqual(secondPose);
    first.dispose(); first.dispose();
    expect(scene.children).toEqual([second.root]);
    second.sample(action.id, action.durationSeconds * 0.37);
    expect(pose(second)).toEqual(secondPose);
    expect(() => first.sample(action.id, 0)).toThrow(/disposed/);
  }, 30_000);

  it.each([
    { id: "breachling-base", action: "LungeAttack", bones: ["front_hand.R", "front_hand.L"] },
    { id: "warden-wayfarer", action: "BladeSweep", bones: ["lower_arm_R"] },
  ])("uses real $id contact parts and deterministic blend/swept framing", async ({ id, action, bones }) => {
    const value = await actor(id);
    const clip = value.actions().find((entry) => entry.id === action)!;
    const probe = createReviewMeshProbe(value.model, { bones, maximumVertices: 24 });
    expect(probe.vertexCount).toBe(24);
    expect(probe.unavailableReason).toBeUndefined();
    const samples = [{ actionId: "CombatIdle", timeSeconds: 0.1, weight: 0.4 },
      { actionId: action, timeSeconds: clip.durationSeconds * 0.5, weight: 0.6 }];
    sampleReviewPoses(value, samples);
    const first = pose(value);
    const points = probe.sample().map((point) => point.position.clone());
    expect(points.every((point) => [point.x, point.y, point.z].every(Number.isFinite))).toBe(true);
    value.sample(action, clip.durationSeconds);
    sampleReviewPoses(value, samples);
    expect(pose(value)).toEqual(first);
    const bounds = await measureReviewMotionBounds(value, [0, 0.25, 0.5, 0.75, 1].map((time) => [
      { actionId: action, timeSeconds: time * clip.durationSeconds, weight: 1 },
    ]), { restore: samples });
    expect(bounds.isEmpty()).toBe(false);
    expect(bounds.getSize(new THREE.Vector3()).length()).toBeGreaterThan(1);
    expect(pose(value)).toEqual(first);
    if (id === "warden-wayfarer") expect(createReviewMeshProbe(value.model, { bones: ["hand_R"] }).vertexCount).toBe(0);
  }, 30_000);

  it("cancels late creature creation without returning a hidden live actor", async () => {
    const pending = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn(() => pending.promise));
    const abort = new AbortController();
    const result = createMobReviewActor({ instanceId: "cancelled", definitionId: "breachling-base", signal: abort.signal });
    const assertion = expect(result).rejects.toThrow(/cancelled/);
    abort.abort();
    pending.resolve(responseFor(MOB_CATALOG[0]!));
    await assertion;
    await expect(createMobReviewActor({ instanceId: "", definitionId: "breachling-base" })).rejects.toThrow(/instance ID/);
  });
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
        expect(definition.family).toBe("breachling");
        expect(definition.reviewedMotion).toBe(REVIEWED_MOB_RECEIPTS[definition.variant as keyof typeof BREACHLING_RUNTIME_ASSETS]);
        expect(definition.label).toContain(`${catalog.label} · revised `);
        expect(definition.url).toBe(definition.reviewedMotion.url);
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
    expect(actor.model.name).toBe(`${definition.reviewedMotion
      ? BREACHLING_RUNTIME_ASSETS[definition.variant as keyof typeof BREACHLING_RUNTIME_ASSETS].label : definition.label} model`);
    if (definition.reviewedMotion) expect(actor.model.scale.toArray()).toEqual([
      expect.closeTo(definition.reviewedMotion.runtimeScale, 6), expect.closeTo(definition.reviewedMotion.runtimeScale, 6),
      expect.closeTo(definition.reviewedMotion.runtimeScale, 6),
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

  it("distinguishes neutral holds, revised motion and untouched source clips, and hides revised solo-stage spit projectiles", async () => {
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
    expect(value.actionLabel("Idle")).toContain("approved neutral hold");
    expect(value.actionLabel("CombatIdle")).toContain("approved neutral hold");
    expect(value.actionLabel("LungeAttack")).toContain("revised motion");
    expect(value.actionLabel("Walk")).toContain("source · not revised");
    expect(value.actionLabel("RecieveHit")).toContain("source · not revised");
    expect(value.actionLabel("SpitAttack")).toContain("revised motion · projectile pending");
    value.setAction("SpitAttack");
    value.pose(0.5);
    value.update(0);
    expect(scene.getObjectByName("studio:breachling-oathbound:poison-spit")?.visible).toBe(false);
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

describe("Per-variant review-only receipt intake", () => {
  type Variant = keyof typeof BREACHLING_RUNTIME_ASSETS;
  // Test-only replay of each current review GLB through an override receipt. It
  // is NOT a newly approved motion asset and no public file/catalog is written.
  async function withReceipt(variant: Variant, patch: Partial<ReviewedMobReceipt>, run: (context: {
    receipt: ReviewedMobReceipt; source: MobDefinition; stageModule: typeof import("../src/review/weapon-lab/mobs-stage");
  }) => Promise<void>) {
    const source = MOB_CATALOG.find((entry) => entry.id === `breachling-${variant}`)!;
    const baseline = stage().stage; await baseline.select(source.id);
    const runtimeScale = baseline.actor()!.model.scale.x; baseline.dispose();
    const receipt: ReviewedMobReceipt = { variant, url: `/assets/weapon-lab/mobs/breachling-${variant}-intake-test.glb`,
      runtimeSourceSha256: REVIEWED_MOB_RECEIPTS[variant]?.runtimeSourceSha256 ?? source.sha256,
      bytes: source.bytes, sha256: source.sha256, runtimeScale,
      actions: ["ClawAttack", "LungeAttack"], neutralHolds: [], ...patch };
    const registry = prepareReviewedMobReceipts({ ...REVIEWED_MOB_RECEIPTS, [variant]: receipt });
    vi.resetModules();
    vi.doMock("../src/review/weapon-lab/reviewed-mob-receipt", async (original) => ({
      ...await original<typeof import("../src/review/weapon-lab/reviewed-mob-receipt")>(), REVIEWED_MOB_RECEIPTS: registry,
    }));
    vi.stubGlobal("fetch", vi.fn(async () => responseFor(source)));
    try { await run({ receipt, source, stageModule: await import("../src/review/weapon-lab/mobs-stage") }); }
    finally { vi.doUnmock("../src/review/weapon-lab/reviewed-mob-receipt"); vi.resetModules(); }
  }

  it("retains only the exact installed review intakes and rejects variant/url/hash/schema mismatches", () => {
    expect(Object.keys(REVIEWED_MOB_RECEIPTS)).toEqual(["base", "oathbound"]);
    expect(REVIEWED_MOB_RECEIPTS.base).toBe(REVIEWED_BASE_MOB_RECEIPT);
    expect(REVIEWED_BASE_MOB_RECEIPT).toMatchObject({ url: REVIEWED_BASE_MOB_URL, bytes: 8823468,
      sha256: "1ddbd4e5ac46e9c3b53379d94e27038d1fbfb8faf9b575b5947cf835bed43217", neutralHolds: ["Idle", "CombatIdle"] });
    expect(REVIEWED_MOB_RECEIPTS.oathbound).toMatchObject({
      url: "/assets/weapon-lab/mobs/breachling-oathbound-approved-lunge-spit-v1.glb",
      runtimeSourceSha256: "077e130cd8a9fa0a755aed1c1efe1f268f8ef08470762adead1b7bf0e2948939",
      bytes: 10818268,
      sha256: "32e4875b377bddb03cc4fb0fb20d0215c0174c549f4033d7ff3b3186b09b13b4",
      runtimeScale: 2.05656927752596,
      actions: ["LungeAttack", "SpitAttack"], neutralHolds: ["Idle", "CombatIdle"],
    });
    for (const patch of [
      { variant: "stalker" }, { url: BREACHLING_RUNTIME_ASSETS.base.url },
      { url: "/assets/weapon-lab/mobs/breachling-stalker-approved.glb" },
      { url: "/assets/weapon-lab/mobs/../breachling-base-approved.glb" },
      { url: "/assets/weapon-lab/mobs/breachling-base-approved.glb?other" },
      { sha256: "wrong" }, { runtimeSourceSha256: "wrong" }, { bytes: 0 }, { bytes: 1.5 }, { runtimeScale: NaN },
      { actions: [] , neutralHolds: [] }, { actions: ["ClawAttack", "ClawAttack"] },
      { actions: ["Idle"], neutralHolds: [] }, { actions: ["CombatIdle"], neutralHolds: [] },
      { actions: ["Idle"], neutralHolds: ["Idle"] },
      { neutralHolds: ["Walk"] },
    ]) expect(() => prepareReviewedMobReceipts({ base: { ...REVIEWED_BASE_MOB_RECEIPT, ...patch } as ReviewedMobReceipt })).toThrow(/Invalid reviewed/);
    expect(() => prepareReviewedMobReceipts({ boss: REVIEWED_BASE_MOB_RECEIPT } as never)).toThrow(/Invalid reviewed/);
    const input = { ...REVIEWED_BASE_MOB_RECEIPT, actions: ["ClawAttack"], neutralHolds: [] };
    const frozen = prepareReviewedMobReceipts({ base: input }); input.actions.push("SpitAttack");
    expect(frozen.base!.actions).toEqual(["ClawAttack"]); expect(Object.isFrozen(frozen.base!.actions)).toBe(true);
    expect(reviewedMobNote(frozen.base!)).toContain("Revised motions: ClawAttack. Approved neutral holds: none.");
    expect(reviewedMobNote(frozen.base!)).not.toContain("SpitAttack");
  });

  it.each(["stalker", "oathbound", "ravager"] as const)("routes a test-only %s receipt without changing its dungeon source or unrelated approvals", async (variant) => {
    const runtimeBefore = JSON.stringify(BREACHLING_RUNTIME_ASSETS);
    await withReceipt(variant, {}, async ({ receipt, source, stageModule }) => {
      const scene = new THREE.Scene(), value = new stageModule.MobsStage(scene); stages.add(value);
      expect(await value.select(source.id)).toBe(true);
      expect(String(vi.mocked(fetch).mock.calls[0]![0])).toBe(`http://localhost:5179${receipt.url}`);
      expect(value.definition!.runtimeUrl).toBe(BREACHLING_RUNTIME_ASSETS[variant].url);
      expect(value.draft().assetSha256).toBe(source.sha256); expect(value.checksumVerified).toBe(true);
      expect(value.actionLabel("ClawAttack")).toContain("revised motion");
      for (const name of ["Idle", "CombatIdle", "SpitAttack", "Death"]) expect(value.actionLabel(name)).toContain("source · not revised");
      value.setAction("SpitAttack"); value.pose(0.5); value.update(0);
      if (["oathbound", "ravager"].includes(variant)) {
        expect(scene.getObjectByName(`studio:${source.id}:poison-spit`)?.visible).toBe(true);
      }
      const { createMobReviewActor: create } = await import("../src/review/weapon-lab/mob-review-actor");
      const actor = await create({ instanceId: `receipt-test-${variant}`, definitionId: source.id }); reviewActors.add(actor);
      expect(actor.actions().filter((action) => action.approvalStatus === "continuous-reviewed").map((action) => action.id).sort())
        .toEqual(["ClawAttack", "LungeAttack"]);
      expect(actor.actions().find((action) => action.id === "Idle")!.approvalStatus).toBe("source");
      // @ts-expect-error Existing JS studio catalog; only its immutable definition note is read.
      const { COMBAT_REVIEW_DEFINITIONS } = await import("../src/review/weapon-lab/combat-review-studio.js");
      const note = COMBAT_REVIEW_DEFINITIONS.find((entry: { id: string }) => entry.id === source.id).note;
      expect(note).toContain("Revised motions: ClawAttack, LungeAttack. Approved neutral holds: none.");
      expect(note).not.toContain("five attacks"); expect(note).not.toContain("SpitAttack");
    });
    expect(JSON.stringify(BREACHLING_RUNTIME_ASSETS)).toBe(runtimeBefore);
  }, 30_000);

  it("fails closed on a valid-looking wrong SHA, byte count, runtime scale, missing clip or source lineage", async () => {
    for (const [patch, error] of [
      [{ sha256: "0".repeat(64) }, /SHA-256/], [{ bytes: 1 }, /asset changed/], [{ runtimeScale: 99 }, /runtime scale/],
      [{ actions: ["MissingClip"] }, /missing source clip/],
    ] as const) await withReceipt("oathbound", patch, async ({ source, stageModule }) => {
      const scene = new THREE.Scene(), value = new stageModule.MobsStage(scene); stages.add(value);
      await expect(value.select(source.id)).rejects.toThrow(error); expect(value.ready).toBe(false); expect(scene.children).toHaveLength(0);
    });
    await expect(withReceipt("oathbound", { runtimeSourceSha256: "0".repeat(64) }, async () => {})).rejects.toThrow(/source lineage/);
    await withReceipt("oathbound", {}, async ({ source, stageModule }) => {
      vi.stubGlobal("crypto", undefined); const value = new stageModule.MobsStage(new THREE.Scene()); stages.add(value);
      await expect(value.select(source.id)).rejects.toThrow(/require SHA-256/); expect(fetch).not.toHaveBeenCalled();
    });
  }, 30_000);
});
