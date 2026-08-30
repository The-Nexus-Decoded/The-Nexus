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
  createBreachV2WardenRuntime,
  inspectCinderboundWardenMaterialReadiness,
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
      "BladeSweep", "CinderSweep", "PalmFire", "AshCall", "DeathCollapse",
    ]));
    expect(CINDERBOUND_BREAKOFF_STAGES.map((stage) => stage.damageFraction)).toEqual([0.3, 0.6, 0.9]);
    expect(filterWardenActions(CINDERBOUND_WARDEN_ACTIONS, "palm fire")).toEqual(["PalmFire"]);
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
