import * as THREE from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { describe, expect, it, vi } from "vitest";

import { filterWardenActions } from "../src/game/dungeons/breach-v2-warden-review";
import {
  BREACHLING_UPPER_ACTIONS,
  buildBreachlingPlacements,
  createBreachV2BreachlingRuntime,
} from "../src/game/dungeons/breach-v2-breachlings";
import {
  CINDERBOUND_BREAKOFF_STAGES,
  CINDERBOUND_WARDEN_ACTIONS,
  CINDERBOUND_WARDEN_ASSETS,
  buildCinderboundWardenPlacement,
  cinderboundWardenActionNames,
  createBreachV2WardenRuntime,
  inspectCinderboundWardenMaterialReadiness,
  CINDERBOUND_WARDEN_SOURCE_YAW_CORRECTION,
  CINDERBOUND_WARDEN_BODY_NODES,
  CINDERBOUND_WARDEN_DEATH_CLIPS,
  CINDERBOUND_WARDEN_OPTIONAL_ACTIONS,
  cinderboundWardenClipSet,
  collectCinderboundWardenShatterChunks,
  dominantCinderboundWardenChunkBone,
  rotatedHalfHeight,
  type CinderboundWardenKind,
} from "../src/game/dungeons/breach-v2-wardens";
import { buildBreachV2Layout } from "../src/game/dungeons/breach-v2-layout";
import { DUNGEON_PROP_ASSETS } from "../src/game/environment/DungeonPropCatalog";
import {
  BREACH_V2_RUNTIME_DIAGNOSTICS_STORAGE_KEY,
  appendBreachV2RuntimeDiagnostic,
  readBreachV2RuntimeDiagnostics,
  type BreachV2RuntimeDiagnosticRecord,
} from "../src/game/dungeons/breach-v2-runtime-diagnostics";

function createDiagnosticStorage(initial?: string, failWrites = false) {
  const entries = new Map<string, string>();
  if (initial !== undefined) entries.set(BREACH_V2_RUNTIME_DIAGNOSTICS_STORAGE_KEY, initial);
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (failWrites) throw new Error("storage blocked");
      entries.set(key, value);
    },
  };
}

function diagnosticRecord(index: number): BreachV2RuntimeDiagnosticRecord {
  return {
    timestamp: `2026-08-30T01:00:0${index}.000Z`,
    sessionId: "test-session",
    event: `event-${index}`,
    data: { index },
  };
}

function source(): GLTF {
  const scene = new THREE.Group();
  const map = new THREE.Texture();
  map.image = { width: 8192, height: 8192 };
  const material = new THREE.MeshStandardMaterial({ map });
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 3.5, 1.2),
    material,
  );
  body.name = "Cinderbound_Warden_Body";
  body.position.y = 1.75;
  const shoulder = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.55, 1.25), material);
  shoulder.name = "Breakoff_30_Shoulders";
  shoulder.position.y = 2.8;
  const forearms = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.65, 0.65), material);
  forearms.name = "Breakoff_60_Forearms";
  forearms.position.y = 1.85;
  const thighs = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.75), material);
  thighs.name = "Breakoff_90_Thighs";
  thighs.position.y = 0.85;
  const hand = new THREE.Group();
  hand.name = "hand_L";
  hand.position.set(1.3, 1.9, 0.3);
  const animationProbe = new THREE.Group();
  animationProbe.name = "animation_probe";
  scene.add(body, shoulder, forearms, thighs, hand, animationProbe);
  return {
    scene,
    scenes: [scene],
    animations: CINDERBOUND_WARDEN_ACTIONS.map((name) => new THREE.AnimationClip(
      name,
      1,
      name === "BladeSweep"
        ? [new THREE.NumberKeyframeTrack("animation_probe.position[x]", [0, 1], [0, 2])]
        : [],
    )),
    cameras: [],
    asset: {},
    parser: {} as GLTF["parser"],
    userData: {},
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

function trackedSource(actionNames: readonly string[]): {
  source: GLTF;
  disposalCounts: { geometry: number; material: number; texture: number };
} {
  const gltf = source();
  gltf.animations = actionNames.map((name) => new THREE.AnimationClip(name, 1, []));
  const mesh = gltf.scene.getObjectByName("Cinderbound_Warden_Body") as THREE.Mesh;
  const geometry = mesh.geometry;
  const material = mesh.material as THREE.MeshStandardMaterial;
  const texture = material.map!;
  const disposalCounts = { geometry: 0, material: 0, texture: 0 };
  geometry.addEventListener("dispose", () => { disposalCounts.geometry += 1; });
  material.addEventListener("dispose", () => { disposalCounts.material += 1; });
  texture.addEventListener("dispose", () => { disposalCounts.texture += 1; });
  return { source: gltf, disposalCounts };
}

function skinnedSource(actionNames: readonly string[]): GLTF {
  const gltf = source();
  gltf.animations = actionNames.map((name) => new THREE.AnimationClip(name, 1, []));
  const original = gltf.scene.getObjectByName("Cinderbound_Warden_Body") as THREE.Mesh;
  const vertexCount = original.geometry.getAttribute("position").count;
  const skinIndices = new Uint16Array(vertexCount * 4);
  const skinWeights = new Float32Array(vertexCount * 4);
  for (let index = 0; index < vertexCount; index += 1) skinWeights[index * 4] = 1;
  original.geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  original.geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
  const bone = new THREE.Bone();
  bone.name = "root_bone";
  const body = new THREE.SkinnedMesh(original.geometry, original.material);
  body.name = original.name;
  body.position.copy(original.position);
  body.add(bone);
  body.bind(new THREE.Skeleton([bone]));
  original.removeFromParent();
  gltf.scene.add(body);
  return gltf;
}

/**
 * A fractured pack: the intact body kept whole beside hidden `Shatter_Chunk_NN`
 * pieces and the DeathShatter clip.
 *
 * Chunk 00 deliberately sits on the body axis, so it has no outward direction of
 * its own and whatever throws it comes from its dominant bone — that is what the
 * bone-bias measurement compares against the same pack built unskinned.
 */
function shatterSource(options: {
  kind?: CinderboundWardenKind;
  chunkCount?: number;
  skinned?: boolean;
  /** Which piece sits on the body axis (default 00). */
  axisIndex?: number;
  omitShatterClip?: boolean;
  gap?: boolean;
  unflagged?: boolean;
} = {}): GLTF {
  const { kind = "wayfarer", chunkCount = 6, skinned = true, axisIndex = 0 } = options;
  const gltf = source();
  const body = gltf.scene.getObjectByName("Cinderbound_Warden_Body") as THREE.Mesh;
  body.name = kind === "wayfarer" ? "Cinderbound_Warden_Body" : "Greater_Cinderbound_Warden_Body";
  const material = body.material as THREE.Material;
  const rootBone = new THREE.Bone();
  rootBone.name = "root_bone";
  rootBone.position.set(0, 1.6, 0);
  const armBone = new THREE.Bone();
  armBone.name = "upper_arm_R";
  armBone.position.set(1.8, 1.9, 0);
  gltf.scene.add(rootBone, armBone);
  gltf.scene.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton([rootBone, armBone]);
  for (let index = 0; index < chunkCount; index += 1) {
    const geometry = new THREE.BoxGeometry(0.42, 0.42, 0.42);
    const vertexCount = geometry.getAttribute("position").count;
    const skinIndices = new Uint16Array(vertexCount * 4);
    const skinWeights = new Float32Array(vertexCount * 4);
    for (let vertex = 0; vertex < vertexCount; vertex += 1) {
      skinIndices[vertex * 4] = 1; // every piece is weighted to the +X arm bone
      skinWeights[vertex * 4] = 1;
    }
    geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
    geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
    const chunk = skinned
      ? new THREE.SkinnedMesh(geometry, material)
      : new THREE.Mesh(geometry, material);
    const ordinal = options.gap && index === chunkCount - 1 ? index + 1 : index;
    chunk.name = `Shatter_Chunk_${String(ordinal).padStart(2, "0")}`;
    const angle = (index / chunkCount) * Math.PI * 2;
    const radius = index === axisIndex ? 0 : 0.62;
    chunk.position.set(Math.sin(angle) * radius, 0.75 + index * 0.32, Math.cos(angle) * radius);
    chunk.userData.shatterChunk = !(options.unflagged && index === 0);
    gltf.scene.add(chunk);
    if (chunk instanceof THREE.SkinnedMesh) {
      chunk.updateMatrixWorld(true);
      chunk.bind(skeleton);
    }
  }
  if (options.omitShatterClip) {
    gltf.animations = gltf.animations.filter((clip) => clip.name !== "DeathShatter");
  }
  return gltf;
}

function wardenStage(kind: CinderboundWardenKind, gltf: () => GLTF) {
  const layout = buildBreachV2Layout(4182, kind, DUNGEON_PROP_ASSETS);
  const room = layout.rooms[0]!;
  const placement = {
    ...buildCinderboundWardenPlacement(layout, kind),
    id: `shatter-warden:${kind}`, roomId: room.id,
    x: room.x + room.w / 2, z: room.z + room.h / 2,
    floorElevation: room.floorElevation, yaw: 0,
  };
  const scene = new THREE.Scene();
  const runtime = createBreachV2WardenRuntime(scene, layout, { loadAsync: async () => gltf() }, kind, undefined, undefined, {
    reviewPlacement: placement,
  });
  return { layout, placement, scene, runtime };
}

function shatterDebris(scene: THREE.Scene): THREE.Object3D[] {
  return scene.children.filter((child) => typeof child.userData.shatterChunkIndex === "number");
}

function trackCloneBoneTexture(root: THREE.Object3D): { count: () => number } {
  const body = root.getObjectByName("Cinderbound_Warden_Body");
  if (!(body instanceof THREE.SkinnedMesh)) throw new Error("Expected a cloned skinned body.");
  const texture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  let disposeCount = 0;
  texture.addEventListener("dispose", () => { disposeCount += 1; });
  body.skeleton.boneTexture = texture;
  return { count: () => disposeCount };
}

describe("BREACH-V2 Cinderbound Warden runtime", () => {
  it("stages a selected boss with deterministic speed, loop and terminal hold without changing gameplay defaults", async () => {
    const layout = buildBreachV2Layout(4182, "wayfarer", DUNGEON_PROP_ASSETS);
    const room = layout.rooms[0]!;
    const placement = {
      ...buildCinderboundWardenPlacement(layout, "wayfarer"),
      id: "review-warden", roomId: room.id, x: room.x + room.w / 2, z: room.z + room.h / 2,
      floorElevation: room.floorElevation, yaw: 0,
    };
    const runtime = createBreachV2WardenRuntime(new THREE.Scene(), layout, { loadAsync: async () => source() }, "wayfarer", undefined, undefined, {
      reviewPlacement: placement,
    });
    await runtime.warmAt(placement.x, placement.z);
    expect(runtime.reviewActor()?.root.name).toBe("review-warden");
    // the +X-facing source mesh is turned onto the +Z forward convention by the pivot,
    // so the boss faces its placement yaw instead of standing sideways to it
    const facingActor = runtime.reviewActor()!;
    expect(facingActor.model.parent!.rotation.y).toBeCloseTo(CINDERBOUND_WARDEN_SOURCE_YAW_CORRECTION, 8);
    facingActor.root.updateMatrixWorld(true);
    const meshForward = new THREE.Vector3(1, 0, 0).transformDirection(facingActor.model.matrixWorld);
    expect(meshForward.x).toBeCloseTo(0, 6);
    expect(meshForward.z).toBeCloseTo(1, 6);
    runtime.setReviewPlayback({ speed: 0.5, loop: true });
    runtime.play("BladeSweep", { immediate: true });
    runtime.update(placement.x, placement.z, 0.5);
    expect(runtime.snapshots()[0]).toMatchObject({
      currentClip: "BladeSweep", timeSeconds: 0.25, normalizedTime: 0.25,
      durationSeconds: 1, playbackSpeed: 0.5, reviewLoop: true, paused: false,
    });
    runtime.play("BladeSweep", { immediate: true });
    expect(runtime.snapshots()[0]?.timeSeconds).toBe(0);
    runtime.update(placement.x, placement.z, 2.2);
    expect(runtime.snapshots()[0]?.timeSeconds).toBeCloseTo(0.1);
    runtime.setReviewPlayback({ loop: false });
    runtime.play("BladeSweep", { immediate: true });
    runtime.update(placement.x, placement.z, 2.2);
    expect(runtime.snapshots()[0]).toMatchObject({ currentClip: "BladeSweep", timeSeconds: 1, paused: true });
    runtime.setReviewPlayback({ speed: 1, loop: null });
    runtime.play("BladeSweep", { immediate: true });
    runtime.update(placement.x, placement.z, 1.1);
    expect(runtime.snapshots()[0]?.currentClip).toBe("CombatIdle");
    runtime.dispose();
    expect(runtime.reviewActor()).toBeNull();
  });

  it("does not accumulate tracked or missing-track boss overlays and restores them on teardown", async () => {
    const layout = buildBreachV2Layout(4182, "oathbreaker", DUNGEON_PROP_ASSETS);
    const placement = buildCinderboundWardenPlacement(layout, "oathbreaker");
    const runtime = createBreachV2WardenRuntime(new THREE.Scene(), layout, { loadAsync: async () => source() }, "oathbreaker");
    await runtime.warmAt(placement.x, placement.z);
    const actor = runtime.reviewActor()!;
    const probe = actor.model.getObjectByName("animation_probe")!;
    const untracked = new THREE.Bone();
    actor.model.add(untracked);
    const basePosition = probe.position.clone();
    const baseRotation = untracked.quaternion.clone();
    const restore = vi.fn(() => {
      probe.position.copy(basePosition);
      untracked.quaternion.copy(baseRotation);
    });
    runtime.setReviewPoseHooks({
      restore,
      apply: () => {
        basePosition.copy(probe.position);
        baseRotation.copy(untracked.quaternion);
        probe.position.x += 0.3;
        untracked.rotateZ(0.2);
      },
    });
    for (let pass = 0; pass < 20; pass += 1) {
      runtime.pose("BladeSweep", 0.5);
      runtime.update(placement.x, placement.z, 0);
      expect(probe.position.x).toBeCloseTo(1.3);
      expect(untracked.rotation.z).toBeCloseTo(0.2);
    }
    runtime.pose("Idle", 0.5);
    for (let pass = 0; pass < 20; pass += 1) runtime.update(placement.x, placement.z, 0);
    expect(probe.position.x).toBeCloseTo(0.3);
    expect(untracked.rotation.z).toBeCloseTo(0.2);
    const beforeClear = restore.mock.calls.length;
    runtime.dispose();
    runtime.dispose();
    expect(restore).toHaveBeenCalledTimes(beforeClear + 1);
    expect(untracked.rotation.z).toBeCloseTo(0);
    expect(runtime.reviewActor()).toBeNull();
  });

  it("never bakes an active review overlay into the boss floor reference", async () => {
    const layout = buildBreachV2Layout(4182, "wayfarer", DUNGEON_PROP_ASSETS);
    const placement = buildCinderboundWardenPlacement(layout, "wayfarer");
    const runtime = createBreachV2WardenRuntime(new THREE.Scene(), layout, { loadAsync: async () => source() }, "wayfarer");
    await runtime.warmAt(placement.x, placement.z);
    runtime.pose("Idle", 0.5);
    for (let frame = 0; frame < 3; frame += 1) runtime.update(placement.x, placement.z, 0);
    const { model } = runtime.reviewActor()!;
    const pivot = model.parent!;
    const rawFloorReference = pivot.position.y;
    const rawPosition = model.position.clone();
    runtime.setReviewPoseHooks({
      restore: () => model.position.copy(rawPosition),
      apply: () => {
        rawPosition.copy(model.position);
        model.position.y += 0.4;
      },
    });
    runtime.pose("Idle", 0.5);
    for (let frame = 0; frame < 12; frame += 1) runtime.update(placement.x, placement.z, 0);
    expect(pivot.position.y).toBeCloseTo(rawFloorReference, 8);
    expect(model.position.y).toBeCloseTo(rawPosition.y + 0.4, 8);
    runtime.setReviewPoseHooks(null);
    expect(model.position.y).toBeCloseTo(rawPosition.y, 8);
    runtime.dispose();
  });

  it("disposes each Breachling clone skeleton once across room churn and repeated teardown", async () => {
    const layout = buildBreachV2Layout(4182, "oathbreaker", DUNGEON_PROP_ASSETS);
    const placement = buildBreachlingPlacements(layout, "oathbreaker")[0]!;
    const start = layout.landmarks.playerStart;
    const creatureSource = skinnedSource(BREACHLING_UPPER_ACTIONS);
    const scene = new THREE.Scene();
    const runtime = createBreachV2BreachlingRuntime(
      scene,
      layout,
      { loadAsync: vi.fn(async () => creatureSource) },
      "oathbreaker",
    );

    await runtime.warmAt(placement.x, placement.z);
    const first = trackCloneBoneTexture(scene.getObjectByName(placement.id)!);
    await runtime.warmAt(start.x, start.z);
    expect(first.count()).toBe(1);

    await runtime.warmAt(placement.x, placement.z);
    const second = trackCloneBoneTexture(scene.getObjectByName(placement.id)!);
    await runtime.warmAt(start.x, start.z);
    runtime.dispose();
    runtime.dispose();

    expect(first.count()).toBe(1);
    expect(second.count()).toBe(1);
    expect(scene.children).toHaveLength(0);
  });

  it("disposes each Warden clone skeleton once across room churn and repeated teardown", async () => {
    const layout = buildBreachV2Layout(4182, "oathbreaker", DUNGEON_PROP_ASSETS);
    const placement = buildCinderboundWardenPlacement(layout, "oathbreaker");
    const start = layout.landmarks.playerStart;
    const wardenSource = skinnedSource(CINDERBOUND_WARDEN_ACTIONS);
    const scene = new THREE.Scene();
    const runtime = createBreachV2WardenRuntime(
      scene,
      layout,
      { loadAsync: vi.fn(async () => wardenSource) },
      "oathbreaker",
    );

    await runtime.warmAt(placement.x, placement.z);
    const first = trackCloneBoneTexture(scene.getObjectByName(placement.id)!);
    await runtime.warmAt(start.x, start.z);
    expect(first.count()).toBe(1);

    await runtime.warmAt(placement.x, placement.z);
    const second = trackCloneBoneTexture(scene.getObjectByName(placement.id)!);
    await runtime.warmAt(start.x, start.z);
    runtime.dispose();
    runtime.dispose();

    expect(first.count()).toBe(1);
    expect(second.count()).toBe(1);
    expect(scene.children).toHaveLength(0);
  });

  it("does not create Breachlings when a deferred source resolves after disposal", async () => {
    const layout = buildBreachV2Layout(4182, "oathbreaker", DUNGEON_PROP_ASSETS);
    const placement = buildBreachlingPlacements(layout, "oathbreaker")[0]!;
    const pending = deferred<GLTF>();
    const loadAsync = vi.fn(() => pending.promise);
    const scene = new THREE.Scene();
    const runtime = createBreachV2BreachlingRuntime(scene, layout, { loadAsync }, "oathbreaker");
    const activation = runtime.warmAt(placement.x, placement.z);
    await vi.waitFor(() => expect(loadAsync).toHaveBeenCalled());

    runtime.dispose();
    const tracked = trackedSource(BREACHLING_UPPER_ACTIONS);
    pending.resolve(tracked.source);
    await activation;
    await runtime.warmAt(placement.x, placement.z);
    runtime.update(placement.x, placement.z, 1 / 60);
    runtime.dispose();

    expect(runtime.snapshots()).toEqual([]);
    expect(scene.children).toHaveLength(0);
    expect(loadAsync).toHaveBeenCalledTimes(1);
    expect(tracked.disposalCounts).toEqual({ geometry: 1, material: 1, texture: 1 });
  });

  it("does not create a Warden when its deferred source resolves after disposal", async () => {
    const layout = buildBreachV2Layout(4182, "oathbreaker", DUNGEON_PROP_ASSETS);
    const placement = buildCinderboundWardenPlacement(layout, "oathbreaker");
    const pending = deferred<GLTF>();
    const loadAsync = vi.fn(() => pending.promise);
    const scene = new THREE.Scene();
    const runtime = createBreachV2WardenRuntime(scene, layout, { loadAsync }, "oathbreaker");
    const activation = runtime.warmAt(placement.x, placement.z);
    await vi.waitFor(() => expect(loadAsync).toHaveBeenCalled());

    runtime.dispose();
    const tracked = trackedSource(CINDERBOUND_WARDEN_ACTIONS);
    pending.resolve(tracked.source);
    await activation;
    await runtime.warmAt(placement.x, placement.z);
    runtime.update(placement.x, placement.z, 1 / 60);
    runtime.dispose();

    expect(runtime.snapshots()).toEqual([]);
    expect(scene.children).toHaveLength(0);
    expect(loadAsync).toHaveBeenCalledTimes(1);
    expect(tracked.disposalCounts).toEqual({ geometry: 1, material: 1, texture: 1 });
  });

  it("keeps a bounded persistent diagnostic ring and recovers malformed storage", () => {
    const storage = createDiagnosticStorage();
    for (let index = 0; index < 5; index += 1) {
      appendBreachV2RuntimeDiagnostic(storage, diagnosticRecord(index), 3);
    }
    expect(readBreachV2RuntimeDiagnostics(storage).map((entry) => entry.event))
      .toEqual(["event-2", "event-3", "event-4"]);

    const malformed = createDiagnosticStorage("not-json");
    expect(readBreachV2RuntimeDiagnostics(malformed)).toEqual([]);
    appendBreachV2RuntimeDiagnostic(malformed, diagnosticRecord(1));
    expect(readBreachV2RuntimeDiagnostics(malformed)).toEqual([diagnosticRecord(1)]);

    const blocked = createDiagnosticStorage(undefined, true);
    let inMemory: BreachV2RuntimeDiagnosticRecord[] = [];
    for (let index = 0; index < 5; index += 1) {
      inMemory = appendBreachV2RuntimeDiagnostic(blocked, diagnosticRecord(index), 3, inMemory);
    }
    expect(inMemory.map((entry) => entry.event)).toEqual(["event-2", "event-3", "event-4"]);
    expect(readBreachV2RuntimeDiagnostics(blocked)).toEqual([]);
  });

  it("audits every renderable material slot and counts a shared decoded map once", () => {
    const readyImage = { width: 8192, height: 8192 };
    const sharedMap = new THREE.Texture();
    sharedMap.image = readyImage;
    const valid = new THREE.Group();
    valid.add(
      new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: sharedMap })),
      new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: sharedMap })),
    );
    expect(inspectCinderboundWardenMaterialReadiness(valid)).toEqual(expect.objectContaining({
      ready: true,
      materialCount: 2,
      standardMaterialCount: 2,
      mappedMaterialCount: 2,
      readyMapCount: 2,
      estimatedDecodedRgbaBytes: 268435456,
    }));

    const missing = new THREE.Group();
    missing.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
    expect(inspectCinderboundWardenMaterialReadiness(missing)).toEqual(expect.objectContaining({
      ready: false,
      missingMapMaterials: expect.arrayContaining([expect.any(String)]),
    }));

    const pendingMap = new THREE.Texture();
    const pending = new THREE.Group();
    pending.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: pendingMap })));
    expect(inspectCinderboundWardenMaterialReadiness(pending)).toEqual(expect.objectContaining({
      ready: false,
      unreadyMapMaterials: expect.arrayContaining([expect.any(String)]),
    }));

    const unsupported = new THREE.Group();
    unsupported.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ map: sharedMap })));
    expect(inspectCinderboundWardenMaterialReadiness(unsupported)).toEqual(expect.objectContaining({
      ready: false,
      unsupportedMaterialTypes: ["MeshBasicMaterial"],
    }));
  });

  it("preserves the two selected source identities, local actions, and damage stages", () => {
    expect(CINDERBOUND_WARDEN_ASSETS.wayfarer.tripoModelId).toBe("c609af31-3f47-450b-be5e-664d78ad36af");
    expect(CINDERBOUND_WARDEN_ASSETS.oathbreaker.tripoModelId).toBe("248467bb-1824-46d1-9d2a-5d8a1d3147cf");
    expect(CINDERBOUND_WARDEN_ASSETS.wayfarer.targetHeightMeters).toBe(3.6);
    expect(CINDERBOUND_WARDEN_ASSETS.oathbreaker.targetHeightMeters).toBe(3.9);
    expect(CINDERBOUND_WARDEN_ACTIONS).toEqual(expect.arrayContaining([
      "BladeSweep", "CinderSweep", "PalmFire", "AshCall", "SoulTax", "FurnaceShutdown", "DeathCollapse",
    ]));
    expect(cinderboundWardenActionNames("wayfarer")).toHaveLength(15);
    expect(cinderboundWardenActionNames("oathbreaker")).toHaveLength(13);
    expect(cinderboundWardenActionNames("oathbreaker"))
      .not.toEqual(expect.arrayContaining(["SoulTax", "FurnaceShutdown"]));
    expect(CINDERBOUND_BREAKOFF_STAGES.map((stage) => stage.damageFraction)).toEqual([0.3, 0.6, 0.9]);
    expect(filterWardenActions(CINDERBOUND_WARDEN_ACTIONS, "palm fire")).toEqual(["PalmFire"]);
    expect(filterWardenActions(CINDERBOUND_WARDEN_ACTIONS, "soul tax")).toEqual(["SoulTax"]);
    expect(filterWardenActions(CINDERBOUND_WARDEN_ACTIONS, "shutdown")).toEqual(["FurnaceShutdown"]);
  });

  it("records a caught room-activation failure instead of leaving it only in the console", async () => {
    const layout = buildBreachV2Layout(4182, "oathbreaker", DUNGEON_PROP_ASSETS);
    const placement = buildCinderboundWardenPlacement(layout, "oathbreaker");
    const diagnosticEvents: { event: string; data?: Record<string, unknown> }[] = [];
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const runtime = createBreachV2WardenRuntime(
      new THREE.Scene(),
      layout,
      { loadAsync: vi.fn(async () => { throw new Error("texture upload failed"); }) },
      "oathbreaker",
      { record: (event, data) => diagnosticEvents.push({ event, data }) },
    );

    runtime.update(placement.x, placement.z, 1 / 60);
    await vi.waitFor(() => {
      expect(diagnosticEvents).toContainEqual(expect.objectContaining({
        event: "warden-runtime-activation-failure",
        data: expect.objectContaining({ error: expect.stringContaining("texture upload failed") }),
      }));
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
    runtime.dispose();
  });

  it("loads only in the boss room, fires from the palm, and drops staged sections", async () => {
    const layout = buildBreachV2Layout(4182, "oathbreaker", DUNGEON_PROP_ASSETS);
    const placement = buildCinderboundWardenPlacement(layout, "oathbreaker");
    const start = layout.landmarks.playerStart;
    const loadAsync = vi.fn(async () => source());
    const diagnosticEvents: { event: string; data?: Record<string, unknown> }[] = [];
    const scene = new THREE.Scene();
    const runtime = createBreachV2WardenRuntime(scene, layout, { loadAsync }, "oathbreaker", {
      record: (event, data) => diagnosticEvents.push({ event, data }),
    });

    await runtime.warmAt(start.x, start.z);
    expect(runtime.snapshots()).toEqual([]);
    expect(loadAsync).not.toHaveBeenCalled();

    await runtime.warmAt(placement.x, placement.z);
    expect(loadAsync).toHaveBeenCalledTimes(1);
    expect(runtime.snapshots()).toHaveLength(1);
    expect(runtime.snapshots()[0]?.roomId).toBe(placement.roomId);
    const wardenMaterial = (scene.getObjectByName("Cinderbound_Warden_Body") as THREE.Mesh)
      .material as THREE.MeshStandardMaterial;
    expect(wardenMaterial).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(wardenMaterial.color.getHex()).toBe(0xffffff);
    expect(wardenMaterial.metalness).toBe(0.48);
    expect(wardenMaterial.emissive.getHex()).toBe(0x201815);
    expect(wardenMaterial.userData.cinderboundPresentation).toBe("dark-iron-ember-v2");
    expect(inspectCinderboundWardenMaterialReadiness(scene).ready).toBe(true);
    expect(diagnosticEvents).toContainEqual(expect.objectContaining({
      event: "warden-material-readiness",
      data: expect.objectContaining({
        ready: true,
        maxTextureDimension: 8192,
        estimatedDecodedRgbaBytes: 268435456,
      }),
    }));
    expect(scene.getObjectByName(`${placement.id}:furnace-light`)).toBeInstanceOf(THREE.PointLight);
    for (let index = 0; index < 3; index += 1) runtime.update(placement.x, placement.z, 1 / 60);
    expect(runtime.snapshots()[0]?.groundingStatus).toBe("calibrated-live-pose");
    expect(Math.abs(runtime.snapshots()[0]?.groundingClearanceMeters ?? 1)).toBeLessThan(0.002);

    runtime.pose("BladeSweep", 0.5);
    expect(runtime.snapshots()[0]?.currentClip).toBe("BladeSweep");
    expect(runtime.snapshots()[0]?.groundingStatus).toBe("pending");
    expect(scene.getObjectByName(placement.id)?.getObjectByName("animation_probe")?.position.x).toBeCloseTo(1);

    runtime.setDamageFraction(0.61);
    expect(runtime.snapshots()[0]?.detachedStages).toEqual([30, 60]);
    expect(scene.children.filter((child) => child.userData.damageStage).map((child) => child.userData.damageStage).sort()).toEqual([30, 60]);

    runtime.play("PalmFire");
    runtime.update(placement.x - 2, placement.z + 1, 0.6);
    expect(scene.getObjectByName("cinderbound-warden:oathbreaker:palm-fire")).toBeTruthy();

    runtime.setDamageFraction(1);
    expect(runtime.snapshots()[0]?.currentClip).toBe("DeathCollapse");
    expect(runtime.snapshots()[0]?.detachedStages).toEqual([30, 60, 90]);
    for (let index = 0; index < 6; index += 1) runtime.update(placement.x, placement.z, 1 / 60);
    expect(Math.abs(runtime.snapshots()[0]?.groundingClearanceMeters ?? 1)).toBeLessThan(0.002);
    runtime.setDamageFraction(0);
    expect(runtime.snapshots()[0]?.healthPercent).toBe(100);
    expect(runtime.snapshots()[0]?.detachedStages).toEqual([]);
    runtime.dispose();
  });
});

describe("Cinderbound Warden shatter death", () => {
  it("keeps both deaths in the clip set and marks only the shatter optional", () => {
    expect(CINDERBOUND_WARDEN_ACTIONS).toEqual(expect.arrayContaining(["DeathCollapse", "DeathShatter"]));
    expect(CINDERBOUND_WARDEN_DEATH_CLIPS).toEqual(["DeathCollapse", "DeathShatter"]);
    expect(CINDERBOUND_WARDEN_OPTIONAL_ACTIONS).toEqual(["DeathShatter"]);
    // Required stays what every shipped pack authors; the clip set is the longer list.
    expect(cinderboundWardenActionNames("wayfarer")).not.toContain("DeathShatter");
    expect(cinderboundWardenActionNames("wayfarer")).toContain("DeathCollapse");
    expect(cinderboundWardenClipSet("wayfarer")).toHaveLength(16);
    expect(cinderboundWardenClipSet("oathbreaker")).toHaveLength(14);
    for (const kind of ["wayfarer", "oathbreaker"] as CinderboundWardenKind[]) {
      expect(cinderboundWardenClipSet(kind)).toEqual(expect.arrayContaining(["DeathCollapse", "DeathShatter"]));
    }
    expect(CINDERBOUND_WARDEN_BODY_NODES).toEqual({
      wayfarer: "Cinderbound_Warden_Body", oathbreaker: "Greater_Cinderbound_Warden_Body",
    });
  });

  it("falls back to DeathCollapse on the bodies installed today", async () => {
    // source() is the shape of the shipped packs: breakoff shells, no fractured chunks.
    const { placement, scene, runtime } = wardenStage("wayfarer", () => source());
    await runtime.warmAt(placement.x, placement.z);
    expect(collectCinderboundWardenShatterChunks(scene.getObjectByName(placement.id)!, "test")).toEqual([]);
    expect(runtime.snapshots()[0]!.shatter).toEqual({
      available: false, chunkCount: 0, active: false,
      releasedChunks: 0, settledChunks: 0, scorchMarks: 0, furnaceBlownOut: false,
    });
    // The shatter is not offered at all, and asking for it lands on the collapse.
    expect(runtime.snapshots()[0]!.actionNames).not.toContain("DeathShatter");
    expect(runtime.snapshots()[0]!.actionNames).toContain("DeathCollapse");
    expect(runtime.play("DeathShatter", { immediate: true })).toBe(1);
    expect(runtime.snapshots()[0]!.currentClip).toBe("DeathCollapse");
    runtime.pose("DeathShatter", 0.9);
    expect(runtime.snapshots()[0]!.currentClip).toBe("DeathCollapse");
    runtime.setDamageFraction(1, "DeathShatter");
    expect(runtime.snapshots()[0]!.currentClip).toBe("DeathCollapse");
    for (let frame = 0; frame < 120; frame += 1) runtime.update(placement.x, placement.z, 1 / 60);
    expect(runtime.snapshots()[0]!.shatter.active).toBe(false);
    expect(shatterDebris(scene)).toHaveLength(0);
    expect(scene.getObjectByName(`${placement.id}:furnace-light`)!.visible).toBe(true);
    runtime.dispose();
  });

  it("rejects a fractured pack that breaks the chunk contract", async () => {
    const cases: [string, RegExp][] = [
      ["omitShatterClip", /ships 4 shatter chunks but no DeathShatter clip/],
      ["gap", /not contiguous from 00: Shatter_Chunk_03 is missing/],
      ["unflagged", /missing extras\.shatterChunk: Shatter_Chunk_00/],
    ];
    for (const [flag, message] of cases) {
      const { placement, runtime } = wardenStage("wayfarer", () => shatterSource({ chunkCount: 4, [flag]: true }));
      await expect(runtime.warmAt(placement.x, placement.z)).rejects.toThrow(message);
      runtime.dispose();
    }
    // A pack whose chunk names are not the zero-padded contract is an error too.
    const { placement, runtime } = wardenStage("wayfarer", () => {
      const gltf = shatterSource({ chunkCount: 2 });
      gltf.scene.getObjectByName("Shatter_Chunk_01")!.name = "Shatter_Chunk_1";
      return gltf;
    });
    await expect(runtime.warmAt(placement.x, placement.z)).rejects.toThrow(/malformed shatter chunk nodes: Shatter_Chunk_1/);
    runtime.dispose();
  });

  it("swaps the body for its chunks on the shatter frame, settles them on the floor and blows the furnace out", async () => {
    const { placement, scene, runtime } = wardenStage("oathbreaker", () => shatterSource({ kind: "oathbreaker", chunkCount: 6 }));
    const events: { clip: string; phase: string; hit: boolean }[] = [];
    runtime.setEffectListener((event) => events.push({ clip: event.clip, phase: event.phase, hit: event.hit }));
    await runtime.warmAt(placement.x, placement.z);
    const model = runtime.reviewActor()!.model;
    const body = model.getObjectByName("Greater_Cinderbound_Warden_Body")!;
    const chunkNodes = collectCinderboundWardenShatterChunks(model, "test");
    expect(chunkNodes).toHaveLength(6);
    // Ships hidden: the runtime is what reveals them.
    expect(chunkNodes.every((chunk) => chunk.visible === false)).toBe(true);
    expect(dominantCinderboundWardenChunkBone(chunkNodes[0]!)?.name).toBe("upper_arm_R");
    expect(runtime.snapshots()[0]!.shatter).toMatchObject({ available: true, chunkCount: 6, active: false });

    runtime.play("DeathShatter", { immediate: true });
    expect(runtime.snapshots()[0]!.currentClip).toBe("DeathShatter");
    // Shatter frame 34 of the 96-frame spec, on a 1s runtime clip.
    const shatterSeconds = (34 / 96) * 1;
    for (let frame = 0; frame < 20; frame += 1) runtime.update(placement.x, placement.z, 1 / 60);
    expect(20 / 60).toBeLessThan(shatterSeconds);
    expect(runtime.snapshots()[0]!.shatter.active).toBe(false);
    expect(body.visible).toBe(true);

    for (let frame = 0; frame < 3; frame += 1) runtime.update(placement.x, placement.z, 1 / 60);
    expect(23 / 60).toBeGreaterThan(shatterSeconds);
    const broken = runtime.snapshots()[0]!.shatter;
    expect(broken).toMatchObject({ active: true, releasedChunks: 6, furnaceBlownOut: true });
    expect(body.visible).toBe(false);
    expect(shatterDebris(scene)).toHaveLength(6);
    expect(scene.getObjectByName(`${placement.id}:shatter:embers`)).toBeTruthy();
    expect(scene.getObjectByName(`${placement.id}:furnace-light`)).toMatchObject({ visible: false, intensity: 0 });
    expect(events.map((event) => event.phase)).toEqual(["telegraph", "active", "impact"]);
    expect(events.every((event) => event.clip === "DeathShatter" && !event.hit)).toBe(true);
    expect(runtime.snapshots()[0]!.activeEffects[0]).toMatchObject({ effect: "death-shatter", clip: "DeathShatter" });

    const start = shatterDebris(scene).map((piece) => piece.position.clone());
    for (let frame = 0; frame < 240; frame += 1) runtime.update(placement.x, placement.z, 1 / 60);
    const settled = runtime.snapshots()[0]!.shatter;
    expect(settled).toMatchObject({ settledChunks: 6, scorchMarks: 6 });
    const pieces = shatterDebris(scene);
    const bodyCenter = new THREE.Vector3(placement.x, 0, placement.z);
    for (const [index, piece] of pieces.entries()) {
      // Nothing sinks: the lowest corner of every tumbled piece is on or above the floor.
      const bounds = new THREE.Box3().setFromObject(piece, true);
      expect(bounds.min.y, piece.name).toBeGreaterThanOrEqual(placement.floorElevation - 1e-6);
      expect(bounds.min.y, piece.name).toBeLessThan(placement.floorElevation + 0.6);
      if (index === 0) continue; // the axis piece has no outward direction of its own
      const before = start[index]!;
      const after = piece.position;
      expect(Math.hypot(after.x - bodyCenter.x, after.z - bodyCenter.z), piece.name)
        .toBeGreaterThan(Math.hypot(before.x - bodyCenter.x, before.z - bodyCenter.z));
    }
    runtime.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it("throws the axis piece along its dominant bone", async () => {
    const land = async (skinned: boolean) => {
      // Piece 01 of four sits on the body axis, and its fan fallback runs square
      // across the arm, so any reach along the arm is the bone bias and nothing else.
      const { placement, scene, runtime } = wardenStage("wayfarer", () => shatterSource({ chunkCount: 4, axisIndex: 1, skinned }));
      await runtime.warmAt(placement.x, placement.z);
      const arm = runtime.reviewActor()!.model.getObjectByName("upper_arm_R")!;
      const armWorld = arm.getWorldPosition(new THREE.Vector3());
      runtime.play("DeathShatter", { immediate: true });
      for (let frame = 0; frame < 300; frame += 1) runtime.update(placement.x, placement.z, 1 / 60);
      const axis = shatterDebris(scene).find((piece) => piece.userData.shatterChunkIndex === 1)!;
      const armDirection = new THREE.Vector3(armWorld.x - placement.x, 0, armWorld.z - placement.z).normalize();
      const displacement = new THREE.Vector3(axis.position.x - placement.x, 0, axis.position.z - placement.z);
      const reach = displacement.dot(armDirection);
      runtime.dispose();
      return reach;
    };
    // Same geometry, same seed: the only difference is the bone weight.
    const skinnedReach = await land(true);
    const unskinnedReach = await land(false);
    // Measured: 0.00 m of arm reach without a bone, 0.74 m with one.
    expect(unskinnedReach).toBeCloseTo(0, 6);
    expect(skinnedReach).toBeGreaterThan(0.6);
    expect(skinnedReach).toBeLessThan(0.9);
  });

  it("leaves nothing behind when a death is replayed, interrupted or swapped for the other", async () => {
    const { placement, scene, runtime } = wardenStage("wayfarer", () => shatterSource({ chunkCount: 5 }));
    await runtime.warmAt(placement.x, placement.z);
    const body = runtime.reviewActor()!.model.getObjectByName("Cinderbound_Warden_Body")!;
    const shatterFully = () => {
      runtime.play("DeathShatter", { immediate: true });
      for (let frame = 0; frame < 200; frame += 1) runtime.update(placement.x, placement.z, 1 / 60);
    };
    shatterFully();
    expect(runtime.snapshots()[0]!.shatter).toMatchObject({ active: true, releasedChunks: 5, settledChunks: 5 });
    // Every piece's geometry is disposed when the body is put back together.
    const disposals = { count: 0 };
    shatterDebris(scene).forEach((piece) => piece.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.addEventListener("dispose", () => { disposals.count += 1; });
    }));

    runtime.play("DeathCollapse", { immediate: true });
    expect(disposals.count).toBe(5);
    expect(runtime.snapshots()[0]!.shatter).toMatchObject({ active: false, releasedChunks: 0, settledChunks: 0, scorchMarks: 0 });
    expect(shatterDebris(scene)).toHaveLength(0);
    expect(scene.getObjectByName(`${placement.id}:shatter:embers`)).toBeUndefined();
    expect(body.visible).toBe(true);
    for (let frame = 0; frame < 12; frame += 1) runtime.update(placement.x, placement.z, 1 / 60);
    expect(scene.getObjectByName(`${placement.id}:furnace-light`)!.visible).toBe(true);
    expect((scene.getObjectByName(`${placement.id}:furnace-light`) as THREE.PointLight).intensity).toBeGreaterThan(0);
    // The collapse's corpse correction does not carry into the next death.
    const corpsePivot = runtime.reviewActor()!.model.parent!.position.y;

    shatterFully();
    expect(runtime.snapshots()[0]!.shatter).toMatchObject({ active: true, releasedChunks: 5 });
    // Replaying the shatter starts whole again rather than stacking a second set.
    shatterFully();
    expect(shatterDebris(scene)).toHaveLength(5);
    expect(runtime.snapshots()[0]!.shatter.releasedChunks).toBe(5);

    // Interrupted mid-flight by an ordinary clip.
    runtime.play("DeathShatter", { immediate: true });
    for (let frame = 0; frame < 25; frame += 1) runtime.update(placement.x, placement.z, 1 / 60);
    expect(runtime.snapshots()[0]!.shatter.active).toBe(true);
    expect(scene.getObjectByName(`${placement.id}:shatter:embers`)).toBeTruthy();
    runtime.play("CombatIdle");
    expect(runtime.snapshots()[0]!.shatter).toMatchObject({ active: false, releasedChunks: 0 });
    expect(shatterDebris(scene)).toHaveLength(0);
    expect(scene.getObjectByName(`${placement.id}:shatter:embers`)).toBeUndefined();
    expect(body.visible).toBe(true);
    for (let frame = 0; frame < 12; frame += 1) runtime.update(placement.x, placement.z, 1 / 60);
    expect(runtime.reviewActor()!.model.parent!.position.y).toBeCloseTo(corpsePivot, 6);

    // A scrubbed frame either side of the shatter shows the matching body.
    runtime.pose("DeathShatter", 0.1);
    expect(runtime.snapshots()[0]!.shatter.active).toBe(false);
    expect(body.visible).toBe(true);
    runtime.pose("DeathShatter", 0.9);
    expect(runtime.snapshots()[0]!.shatter.active).toBe(true);

    // Torn down mid-burst, with the pieces in the air and the embers still alive.
    expect(scene.getObjectByName(`${placement.id}:shatter:embers`)).toBeTruthy();
    runtime.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it("clamps a tumbling piece against its rotated half height", () => {
    const half = new THREE.Vector3(0.5, 0.1, 0.5);
    expect(rotatedHalfHeight(new THREE.Euler(0, 0, 0), half)).toBeCloseTo(0.1, 9);
    // On its corner the same slab needs more than five times the clearance.
    expect(rotatedHalfHeight(new THREE.Euler(0, 0, Math.PI / 2), half)).toBeCloseTo(0.5, 9);
    expect(rotatedHalfHeight(new THREE.Euler(Math.PI / 4, 0, Math.PI / 4), half)).toBeGreaterThan(0.4);
  });
});
