import { describe, expect, it } from "vitest";
import * as THREE from "three";

import {
  BREACH_V2_CAMERA_RESET_LABEL,
  BREACH_V2_ISOMETRIC_MAX_DISTANCE,
  BREACH_V2_ISOMETRIC_MIN_DISTANCE,
  BREACH_V2_MOBILE_ISOMETRIC_MIN_DISTANCE,
  BREACH_V2_MOBILE_THIRD_PERSON_MIN_DISTANCE,
  BREACH_V2_MOBILE_MAX_INSPECTION_ZOOM,
  BREACH_V2_MOBILE_ZOOM_STEP,
  BREACH_V2_TOUCH_ROTATE_THRESHOLD,
  isBreachV2InPlaceCameraTransition,
  resolveBreachV2CameraLookAhead,
  resolveBreachV2CameraStep,
  resolveBreachV2CameraTargetHeight,
  resolveBreachV2InspectionMinimumDistance,
  resolveBreachV2InspectionZoomStep,
  resolveBreachV2IsometricCameraProfile,
  resolveBreachV2PinchDistance,
  resolveBreachV2PinchInspectionZoom,
  resolveBreachV2PinchMagnification,
  resolveBreachV2TouchPitch,
  resolveBreachV2TouchYaw,
  shouldDockBreachV2PerformanceDetails,
  shouldRequireBreachV2Landscape,
  transitionBreachV2CameraModeState,
} from "../src/game/dungeons/breach-v2-mobile-controls";
import {
  BREACH_V2_CAMERA_SWITCH_SESSION_KEY,
  consumeBreachV2CameraSwitchPosition,
  saveBreachV2CameraSwitchPosition,
} from "../src/game/dungeons/breach-v2-startup-safety";
import { resolveBreachV2LegacyLandmarkRoomId } from "../src/game/dungeons/breach-v2-dev-panel";
import {
  createBreachV2ResourceDisposalRegistry,
  disposeBreachV2ObjectResources,
} from "../src/game/dungeons/breach-v2-breachlings";
import {
  applyBreachV2InspectionFocus,
  createBreachV2PreviewDisposer,
  disposeBreachV2SceneResources,
  resolveBreachV2PreviewCameraMode,
  resolveBreachV2ReviewActorSelection,
} from "../src/game/dungeons/breach-v2-preview";
import {
  findBreachV2RoomAt,
  resolveBreachV2FogState,
} from "../src/game/dungeons/breach-v2-fog-of-war";

describe("BREACH-V2 mobile camera pinch", () => {
  it("zooms out when two fingers move closer together", () => {
    expect(resolveBreachV2PinchDistance(14.5, 160, 80)).toBe(29);
  });

  it("zooms in when two fingers move farther apart", () => {
    expect(resolveBreachV2PinchDistance(14.5, 80, 160)).toBe(7.25);
  });

  it("keeps a stationary pinch stable and clamps the playable camera range", () => {
    expect(resolveBreachV2PinchDistance(14.5, 120, 120)).toBe(14.5);
    expect(resolveBreachV2PinchDistance(35, 160, 40)).toBe(BREACH_V2_ISOMETRIC_MAX_DISTANCE);
    expect(resolveBreachV2PinchDistance(7, 40, 160)).toBe(BREACH_V2_ISOMETRIC_MIN_DISTANCE);
    expect(resolveBreachV2PinchDistance(
      3,
      40,
      160,
      BREACH_V2_MOBILE_ISOMETRIC_MIN_DISTANCE,
    )).toBe(BREACH_V2_MOBILE_ISOMETRIC_MIN_DISTANCE);
  });

  it("reverses cleanly after close inspection reaches the physical distance clamp", () => {
    const close = resolveBreachV2PinchInspectionZoom(
      3,
      1,
      100,
      400,
      BREACH_V2_MOBILE_ISOMETRIC_MIN_DISTANCE,
      BREACH_V2_ISOMETRIC_MAX_DISTANCE,
    );
    expect(close.distance).toBe(BREACH_V2_MOBILE_ISOMETRIC_MIN_DISTANCE);
    expect(close.magnification).toBeCloseTo(3.6667, 3);
    expect(resolveBreachV2PinchInspectionZoom(
      3,
      1,
      100,
      100,
      BREACH_V2_MOBILE_ISOMETRIC_MIN_DISTANCE,
      BREACH_V2_ISOMETRIC_MAX_DISTANCE,
    )).toEqual({ distance: 3, magnification: 1 });
  });

  it("supports eye-detail magnification and unwinds it before increasing camera distance", () => {
    const maximumClose = resolveBreachV2InspectionZoomStep(
      BREACH_V2_MOBILE_ISOMETRIC_MIN_DISTANCE,
      1,
      -BREACH_V2_MOBILE_ZOOM_STEP * 12,
      BREACH_V2_MOBILE_ISOMETRIC_MIN_DISTANCE,
      BREACH_V2_ISOMETRIC_MAX_DISTANCE,
    );
    expect(maximumClose.distance).toBe(BREACH_V2_MOBILE_ISOMETRIC_MIN_DISTANCE);
    expect(maximumClose.magnification).toBe(BREACH_V2_MOBILE_MAX_INSPECTION_ZOOM);
    const unwind = resolveBreachV2InspectionZoomStep(
      maximumClose.distance,
      maximumClose.magnification,
      BREACH_V2_MOBILE_ZOOM_STEP,
      BREACH_V2_MOBILE_ISOMETRIC_MIN_DISTANCE,
      BREACH_V2_ISOMETRIC_MAX_DISTANCE,
    );
    expect(unwind.magnification).toBeCloseTo(45.2548, 3);
    const restored = resolveBreachV2InspectionZoomStep(
      maximumClose.distance,
      maximumClose.magnification,
      BREACH_V2_MOBILE_ZOOM_STEP * 12,
      BREACH_V2_MOBILE_ISOMETRIC_MIN_DISTANCE,
      BREACH_V2_ISOMETRIC_MAX_DISTANCE,
    );
    expect(restored).toEqual({
      distance: BREACH_V2_MOBILE_ISOMETRIC_MIN_DISTANCE,
      magnification: 1,
    });
    expect(resolveBreachV2PinchMagnification(1, 100, 6_400))
      .toBe(BREACH_V2_MOBILE_MAX_INSPECTION_ZOOM);
  });
});

describe("BREACH-V2 mobile camera buttons and orientation", () => {
  it("exposes an explicit camera reset label", () => {
    expect(BREACH_V2_CAMERA_RESET_LABEL).toBe("Camera Reset");
  });
  it("uses a more top-down, centered isometric profile on compact landscape touch screens", () => {
    const mobile = resolveBreachV2IsometricCameraProfile({
      coarsePointer: true,
      viewportWidth: 844,
      viewportHeight: 390,
    });
    expect(mobile.compactLandscape).toBe(true);
    expect(mobile.closeInspection).toBe(true);
    expect(mobile.defaultPitch * 180 / Math.PI).toBeCloseTo(45);
    expect(mobile.minimumPitch * 180 / Math.PI).toBeCloseTo(18);
    expect(mobile.minimumDistance).toBe(BREACH_V2_MOBILE_ISOMETRIC_MIN_DISTANCE);
    expect(mobile.lookAhead).toBe(2.25);

    const tablet = resolveBreachV2IsometricCameraProfile({
      coarsePointer: true,
      viewportWidth: 1024,
      viewportHeight: 768,
    });
    expect(tablet.compactLandscape).toBe(false);
    expect(tablet.closeInspection).toBe(true);
    expect(tablet.minimumDistance).toBe(BREACH_V2_MOBILE_ISOMETRIC_MIN_DISTANCE);

    const desktop = resolveBreachV2IsometricCameraProfile({
      coarsePointer: false,
      viewportWidth: 1440,
      viewportHeight: 900,
    });
    expect(desktop.compactLandscape).toBe(false);
    expect(desktop.closeInspection).toBe(false);
    expect(desktop.defaultPitch * 180 / Math.PI).toBeCloseTo(30);
    expect(desktop.minimumPitch * 180 / Math.PI).toBeCloseTo(8);
    expect(desktop.minimumDistance).toBe(BREACH_V2_ISOMETRIC_MIN_DISTANCE);
    expect(desktop.lookAhead).toBe(4.25);
  });

  it("uses equal zoom steps and respects camera limits", () => {
    expect(resolveBreachV2CameraStep(14.5, -BREACH_V2_MOBILE_ZOOM_STEP)).toBe(13);
    expect(resolveBreachV2CameraStep(14.5, BREACH_V2_MOBILE_ZOOM_STEP)).toBe(16);
    expect(resolveBreachV2CameraStep(
      3,
      -BREACH_V2_MOBILE_ZOOM_STEP,
      BREACH_V2_MOBILE_ISOMETRIC_MIN_DISTANCE,
    )).toBe(BREACH_V2_MOBILE_ISOMETRIC_MIN_DISTANCE);
    expect(resolveBreachV2CameraStep(35, BREACH_V2_MOBILE_ZOOM_STEP)).toBe(BREACH_V2_ISOMETRIC_MAX_DISTANCE);
  });

  it("requires landscape only for portrait coarse-pointer devices", () => {
    expect(shouldRequireBreachV2Landscape(true, 390, 844)).toBe(true);
    expect(shouldRequireBreachV2Landscape(true, 844, 390)).toBe(false);
    expect(shouldRequireBreachV2Landscape(false, 390, 844)).toBe(false);
  });

  it("docks performance diagnostics away from the playfield on phone and narrow layouts", () => {
    expect(shouldDockBreachV2PerformanceDetails(true, 844)).toBe(true);
    expect(shouldDockBreachV2PerformanceDetails(false, 640)).toBe(true);
    expect(shouldDockBreachV2PerformanceDetails(false, 1280)).toBe(false);
  });

  it("rotates yaw only after the deliberate touch-drag threshold", () => {
    expect(BREACH_V2_TOUCH_ROTATE_THRESHOLD).toBe(12);
    expect(resolveBreachV2TouchYaw(Math.PI / 4, 40)).toBeCloseTo(Math.PI / 4 - 0.3);
    expect(resolveBreachV2TouchYaw(Math.PI / 4, -40)).toBeCloseTo(Math.PI / 4 + 0.3);
  });

  it("allows a deliberate low inspection angle without collapsing on a short drag", () => {
    const minimumPitch = Math.PI / 10;
    const maximumPitch = Math.PI * 58 / 180;
    expect(resolveBreachV2TouchPitch(
      Math.PI / 4,
      -40,
      minimumPitch,
      maximumPitch,
    ) * 180 / Math.PI).toBeCloseTo(40.42, 1);
    expect(resolveBreachV2TouchPitch(
      Math.PI / 4,
      -400,
      minimumPitch,
      maximumPitch,
    )).toBeCloseTo(minimumPitch);
    expect(resolveBreachV2TouchPitch(
      0,
      1000,
      -Math.PI / 3,
      Math.PI / 3,
    )).toBeCloseTo(Math.PI / 3);
  });

  it("uses mobile-only close inspection distances while preserving desktop limits", () => {
    expect(resolveBreachV2InspectionMinimumDistance({ coarsePointer: true, isometric: true }))
      .toBe(BREACH_V2_MOBILE_ISOMETRIC_MIN_DISTANCE);
    expect(resolveBreachV2InspectionMinimumDistance({ coarsePointer: true, isometric: false }))
      .toBe(BREACH_V2_MOBILE_THIRD_PERSON_MIN_DISTANCE);
    expect(resolveBreachV2InspectionMinimumDistance({ coarsePointer: false, isometric: true }))
      .toBe(BREACH_V2_ISOMETRIC_MIN_DISTANCE);
    expect(resolveBreachV2InspectionMinimumDistance({ coarsePointer: false, isometric: false }))
      .toBe(2.4);
  });

  it("lowers and recenters close-range framing without crossing the subject", () => {
    expect(resolveBreachV2CameraTargetHeight({
      distance: BREACH_V2_MOBILE_ISOMETRIC_MIN_DISTANCE,
      actorHeight: 1.69,
    })).toBeCloseTo(0.845);
    expect(resolveBreachV2CameraTargetHeight({ distance: BREACH_V2_ISOMETRIC_MIN_DISTANCE }))
      .toBeCloseTo(1.4);
    expect(resolveBreachV2CameraLookAhead(2.25, 1.5)).toBeCloseTo(0.9);
    expect(resolveBreachV2CameraLookAhead(2.25, 10)).toBeCloseTo(2.25);
  });
});

describe("BREACH-V2 camera mode position continuity", () => {
  it("keeps every gameplay-camera transition in place and reloads overview only", () => {
    for (const current of ["isometric", "walk", "firstperson"]) {
      for (const next of ["isometric", "walk", "firstperson"]) {
        expect(isBreachV2InPlaceCameraTransition(current, next)).toBe(true);
      }
      expect(isBreachV2InPlaceCameraTransition(current, "overview")).toBe(false);
    }
    expect(isBreachV2InPlaceCameraTransition("overview", "isometric")).toBe(false);
  });

  it("restores each gameplay mode's complete pose without changing runtime identity", () => {
    const states = new Map();
    const scene = {};
    const renderer = {};
    const player = { x: 72.25, y: 0.3, z: 41.75 };
    const isometricState = { yaw: 1.1, pitch: 0.72, distance: 6.5, zoom: 16 };
    const firstPersonState = transitionBreachV2CameraModeState({
      states,
      currentMode: "isometric",
      nextMode: "firstperson",
      currentState: isometricState,
      defaultNextState: { yaw: 0.08, pitch: 0.24, distance: 0, zoom: 1 },
    });
    expect(firstPersonState).toEqual({ yaw: 0.08, pitch: 0.24, distance: 0, zoom: 1 });

    const restoredIsometric = transitionBreachV2CameraModeState({
      states,
      currentMode: "firstperson",
      nextMode: "isometric",
      currentState: { yaw: -0.4, pitch: -0.15, distance: 0, zoom: 4 },
      defaultNextState: { yaw: 0.2, pitch: 0.5, distance: 18.5, zoom: 1 },
    });
    expect(restoredIsometric).toEqual(isometricState);
    expect(player).toEqual({ x: 72.25, y: 0.3, z: 41.75 });
    expect(scene).toBe(scene);
    expect(renderer).toBe(renderer);
  });

  const createStorage = () => {
    const entries = new Map<string, string>();
    return {
      entries,
      storage: {
        getItem: (key: string) => entries.get(key) ?? null,
        setItem: (key: string, value: string) => { entries.set(key, value); },
        removeItem: (key: string) => { entries.delete(key); },
      },
    };
  };

  it("restores the exact player position once when only the camera mode reloads", () => {
    const { entries, storage } = createStorage();
    expect(saveBreachV2CameraSwitchPosition(storage, {
      seed: 4182,
      path: "oathbreaker",
      x: 72.25,
      z: 41.75,
    })).toBe(true);
    expect(entries.has(BREACH_V2_CAMERA_SWITCH_SESSION_KEY)).toBe(true);
    expect(consumeBreachV2CameraSwitchPosition(storage, {
      seed: 4182,
      path: "oathbreaker",
    })).toEqual({ x: 72.25, z: 41.75 });
    expect(consumeBreachV2CameraSwitchPosition(storage, {
      seed: 4182,
      path: "oathbreaker",
    })).toBeNull();
  });

  it("rejects a saved position from a different route", () => {
    const { storage } = createStorage();
    saveBreachV2CameraSwitchPosition(storage, {
      seed: 4182,
      path: "wayfarer",
      x: 20,
      z: 12,
    });
    expect(consumeBreachV2CameraSwitchPosition(storage, {
      seed: 4182,
      path: "oathbreaker",
    })).toBeNull();
  });
});

describe("BREACH-V2 contextual animation actor selection", () => {
  const nestedChild = (root: THREE.Object3D): THREE.Object3D => {
    const middle = new THREE.Group();
    const child = new THREE.Object3D();
    root.add(middle);
    middle.add(child);
    return child;
  };

  it("resolves the exact Human, Breachling, and Warden identity through nested meshes", () => {
    const human = new THREE.Group();
    human.userData.actorRole = "player";
    human.userData.actorId = "male-v2";
    expect(resolveBreachV2ReviewActorSelection(nestedChild(human))).toEqual({
      kind: "human",
      actorId: "male-v2",
    });

    const creature = new THREE.Group();
    creature.userData.spatialOwnerId = "breachling:E-04:2";
    expect(resolveBreachV2ReviewActorSelection(nestedChild(creature))).toEqual({
      kind: "creature",
      actorId: "breachling:E-04:2",
    });

    const warden = new THREE.Group();
    warden.userData.spatialOwnerId = "cinderbound-warden:oathbreaker";
    expect(resolveBreachV2ReviewActorSelection(nestedChild(warden))).toEqual({
      kind: "warden",
      actorId: "cinderbound-warden:oathbreaker",
    });
    expect(resolveBreachV2ReviewActorSelection(new THREE.Object3D())).toBeNull();
  });

  it("centers inspection on the selected hit point and clears back to player framing", () => {
    const target = new THREE.Vector3(5, 1.4, 8);
    const position = new THREE.Vector3(11, 7, 14);
    const originalOffset = position.clone().sub(target);
    const actorHit = new THREE.Vector3(21, 2.6, 34);

    applyBreachV2InspectionFocus(target, position, actorHit);
    expect(target).toEqual(actorHit);
    expect(position.clone().sub(target)).toEqual(originalOffset);

    const playerTarget = new THREE.Vector3(6, 1.4, 9);
    const playerPosition = new THREE.Vector3(12, 7, 15);
    applyBreachV2InspectionFocus(playerTarget, playerPosition, null);
    expect(playerTarget).toEqual(new THREE.Vector3(6, 1.4, 9));
    expect(playerPosition).toEqual(new THREE.Vector3(12, 7, 15));
  });
});

describe("BREACH-V2 room discovery fog", () => {
  const rooms = [
    { id: "vestibule", x: 0, z: 0, w: 10, h: 10 },
    { id: "gallery", x: 10, z: 0, w: 10, h: 10 },
    { id: "vault", x: 20, z: 0, w: 10, h: 10 },
  ];
  const edges = [
    { edgeId: "a", sourceNode: "vestibule", destinationNode: "gallery", connectionType: "CORRIDOR", requiredForProgression: true },
    { edgeId: "b", sourceNode: "gallery", destinationNode: "vault", connectionType: "CORRIDOR", requiredForProgression: true },
  ] as const;

  it("locates the player's containing room", () => {
    expect(findBreachV2RoomAt(rooms, 5, 5)).toBe("vestibule");
    expect(findBreachV2RoomAt(rooms, 15, 5)).toBe("gallery");
    expect(findBreachV2RoomAt(rooms, 35, 5)).toBeNull();
  });

  it("keeps the current room clear while staging discovered, adjacent, and hidden rooms", () => {
    const discovered = new Set(["vestibule", "gallery"]);
    expect(resolveBreachV2FogState("gallery", "gallery", discovered, edges)).toBe("current");
    expect(resolveBreachV2FogState("vestibule", "gallery", discovered, edges)).toBe("discovered");
    expect(resolveBreachV2FogState("vault", "gallery", discovered, edges)).toBe("adjacent");
    expect(resolveBreachV2FogState("vault", "vestibule", new Set(["vestibule"]), edges)).toBe("hidden");
  });
});

describe("BREACH-V2 preview landmark navigation", () => {
  const rooms = [
    { id: "vestibule", fixed: true, kind: "start" },
    { id: "threshold-plaza", fixed: true, kind: "plaza" },
    { id: "route-room-1", fixed: false, kind: "gallery" },
    { id: "ashen-lock", fixed: true, kind: "boss" },
    { id: "exit-connector", fixed: true, kind: "exit" },
  ];

  it("turns old fixed-camera destinations into player room entries", () => {
    expect(resolveBreachV2LegacyLandmarkRoomId("vestibule", rooms)).toBe("vestibule");
    expect(resolveBreachV2LegacyLandmarkRoomId("plaza", rooms)).toBe("threshold-plaza");
    expect(resolveBreachV2LegacyLandmarkRoomId("gallery", rooms)).toBe("route-room-1");
    expect(resolveBreachV2LegacyLandmarkRoomId("boss", rooms)).toBe("ashen-lock");
    expect(resolveBreachV2LegacyLandmarkRoomId("exit", rooms)).toBe("exit-connector");
    expect(resolveBreachV2LegacyLandmarkRoomId("isometric", rooms)).toBeNull();
    expect(resolveBreachV2LegacyLandmarkRoomId("overview", rooms)).toBeNull();
  });

  it("reports the same canonical camera mode before and after transitions", () => {
    expect(resolveBreachV2PreviewCameraMode("isometric", null)).toBe("isometric");
    expect(resolveBreachV2PreviewCameraMode("walk", null)).toBe("walk");
    expect(resolveBreachV2PreviewCameraMode("firstperson", null)).toBe("firstperson");
    expect(resolveBreachV2PreviewCameraMode("overview", null)).toBe("overview");
    expect(resolveBreachV2PreviewCameraMode("boss", "ashen-lock")).toBe("isometric");
    expect(resolveBreachV2PreviewCameraMode("unknown", null)).toBe("isometric");
  });
});

describe("BREACH-V2 preview lifecycle", () => {
  it("disposes an old preview once before a same-document restart installs new input", () => {
    const input = new EventTarget();
    const oldInput = { calls: 0 };
    const newInput = { calls: 0 };
    const destroyed = { ui: 0, controls: 0, renderer: 0, canvas: 0 };
    const handleOldInput = () => { oldInput.calls += 1; };
    input.addEventListener("keydown", handleOldInput);
    const disposeOldPreview = createBreachV2PreviewDisposer([
      () => input.removeEventListener("keydown", handleOldInput),
      () => { destroyed.ui += 1; },
      () => { destroyed.controls += 1; },
      () => { destroyed.canvas += 1; },
      () => { destroyed.renderer += 1; },
    ]);

    input.dispatchEvent(new Event("keydown"));
    disposeOldPreview();
    disposeOldPreview();
    const handleNewInput = () => { newInput.calls += 1; };
    input.addEventListener("keydown", handleNewInput);
    input.dispatchEvent(new Event("keydown"));

    expect(oldInput.calls).toBe(1);
    expect(newInput.calls).toBe(1);
    expect(destroyed).toEqual({ ui: 1, controls: 1, renderer: 1, canvas: 1 });
    input.removeEventListener("keydown", handleNewInput);
  });

  it("continues cleanup after one controller fails", () => {
    const completed: string[] = [];
    const errors: unknown[] = [];
    const dispose = createBreachV2PreviewDisposer([
      () => { completed.push("input"); },
      () => { throw new Error("controller teardown failed"); },
      () => { completed.push("renderer"); },
    ], (error) => { errors.push(error); });

    dispose();

    expect(completed).toEqual(["input", "renderer"]);
    expect(errors).toHaveLength(1);
  });

  it("releases unique scene geometry, materials, and textures before clearing the scene", () => {
    const scene = new THREE.Scene();
    const texture = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    scene.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
    const disposed = { texture: 0, material: 0, geometry: 0 };
    texture.addEventListener("dispose", () => { disposed.texture += 1; });
    material.addEventListener("dispose", () => { disposed.material += 1; });
    geometry.addEventListener("dispose", () => { disposed.geometry += 1; });

    const counts = disposeBreachV2SceneResources(scene);

    expect(counts).toEqual({ geometries: 1, materials: 1, textures: 1 });
    expect(disposed).toEqual({ texture: 1, material: 1, geometry: 1 });
    expect(scene.children).toHaveLength(0);
  });

  it("disposes shared runtime and environment GPU resources exactly once across teardown owners", () => {
    const scene = new THREE.Scene();
    const registry = createBreachV2ResourceDisposalRegistry();
    const texture = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const runtimeRoot = new THREE.Group();
    runtimeRoot.add(new THREE.Mesh(geometry, material));
    const environmentRoot = new THREE.Group();
    environmentRoot.add(new THREE.Mesh(geometry, material));
    scene.add(runtimeRoot, environmentRoot);
    const disposed = { texture: 0, material: 0, geometry: 0 };
    texture.addEventListener("dispose", () => { disposed.texture += 1; });
    material.addEventListener("dispose", () => { disposed.material += 1; });
    geometry.addEventListener("dispose", () => { disposed.geometry += 1; });

    runtimeRoot.removeFromParent();
    expect(disposeBreachV2ObjectResources(runtimeRoot, registry))
      .toEqual({ geometries: 1, materials: 1, textures: 1 });
    expect(disposeBreachV2SceneResources(scene, registry))
      .toEqual({ geometries: 0, materials: 0, textures: 0 });

    expect(disposed).toEqual({ texture: 1, material: 1, geometry: 1 });
    expect(scene.children).toHaveLength(0);
  });
});
