import { describe, expect, it } from "vitest";

import {
  BREACH_V2_ISOMETRIC_MAX_DISTANCE,
  BREACH_V2_ISOMETRIC_MIN_DISTANCE,
  BREACH_V2_MOBILE_ZOOM_STEP,
  BREACH_V2_TOUCH_ROTATE_THRESHOLD,
  resolveBreachV2CameraStep,
  resolveBreachV2IsometricCameraProfile,
  resolveBreachV2PinchDistance,
  resolveBreachV2TouchYaw,
  shouldDockBreachV2PerformanceDetails,
  shouldRequireBreachV2Landscape,
} from "../src/game/dungeons/breach-v2-mobile-controls";
import { resolveBreachV2LegacyLandmarkRoomId } from "../src/game/dungeons/breach-v2-dev-panel";
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
  });
});

describe("BREACH-V2 mobile camera buttons and orientation", () => {
  it("uses a more top-down, centered isometric profile on compact landscape touch screens", () => {
    const mobile = resolveBreachV2IsometricCameraProfile({
      coarsePointer: true,
      viewportWidth: 844,
      viewportHeight: 390,
    });
    expect(mobile.compactLandscape).toBe(true);
    expect(mobile.defaultPitch * 180 / Math.PI).toBeCloseTo(45);
    expect(mobile.minimumPitch * 180 / Math.PI).toBeCloseTo(36);
    expect(mobile.lookAhead).toBe(2.25);

    const desktop = resolveBreachV2IsometricCameraProfile({
      coarsePointer: false,
      viewportWidth: 1440,
      viewportHeight: 900,
    });
    expect(desktop.compactLandscape).toBe(false);
    expect(desktop.defaultPitch * 180 / Math.PI).toBeCloseTo(30);
    expect(desktop.minimumPitch * 180 / Math.PI).toBeCloseTo(8);
    expect(desktop.lookAhead).toBe(4.25);
  });

  it("uses equal zoom steps and respects camera limits", () => {
    expect(resolveBreachV2CameraStep(14.5, -BREACH_V2_MOBILE_ZOOM_STEP)).toBe(11);
    expect(resolveBreachV2CameraStep(14.5, BREACH_V2_MOBILE_ZOOM_STEP)).toBe(18);
    expect(resolveBreachV2CameraStep(7, -BREACH_V2_MOBILE_ZOOM_STEP)).toBe(BREACH_V2_ISOMETRIC_MIN_DISTANCE);
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
});
