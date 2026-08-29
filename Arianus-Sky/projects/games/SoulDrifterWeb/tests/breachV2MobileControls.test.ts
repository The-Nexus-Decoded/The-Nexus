// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BREACH_V2_ISOMETRIC_MAX_DISTANCE,
  BREACH_V2_ISOMETRIC_MIN_DISTANCE,
  BREACH_V2_MOBILE_ZOOM_STEP,
  BREACH_V2_TOUCH_ROTATE_THRESHOLD,
  resolveBreachV2CameraStep,
  resolveBreachV2PinchDistance,
  resolveBreachV2TouchYaw,
  setupBreachV2MobileMovementPad,
  setupBreachV2SettingsPanel,
  shouldDockBreachV2PerformanceDetails,
  shouldRequireBreachV2Landscape,
} from "../src/game/dungeons/breach-v2-mobile-controls";
import {
  resolveBreachV2LegacyLandmarkRoomId,
  setupBreachV2DevPanel,
} from "../src/game/dungeons/breach-v2-dev-panel";
import {
  findBreachV2RoomAt,
  resolveBreachV2FogState,
} from "../src/game/dungeons/breach-v2-fog-of-war";
import { createBreachV2RunController } from "../src/game/dungeons/breach-v2-gameplay";
import { setupBreachV2GameplayUi } from "../src/game/dungeons/breach-v2-gameplay-ui";
import type { BreachV2Layout } from "../src/game/dungeons/breach-v2-layout";

const TEST_LAYOUT = {
  rooms: [
    { id: "vestibule", name: "Realm-Lock Vestibule", fixed: true, kind: "start", x: 0, z: 0, w: 10, h: 10 },
  ],
  landmarks: {
    ilyra: { x: 1, z: 1 },
    memoryLoom: { x: 2, z: 1 },
    coffer: { x: 3, z: 1 },
    effigy: { x: 4, z: 1 },
    firstMemory: { x: 5, z: 1 },
    exitPoint: { x: 6, z: 1 },
  },
} as unknown as BreachV2Layout;

function setViewportWidth(width: number): void {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
}

function mountGameplay(container: HTMLElement) {
  const controller = createBreachV2RunController({
    seed: 4182,
    path: "wayfarer",
    chamberIds: [],
    rewardId: "test-reward",
    bossHp: 10,
  });
  return setupBreachV2GameplayUi({
    container,
    layout: TEST_LAYOUT,
    controller,
    getPlayerPosition: () => ({ x: 50, z: 50 }),
  });
}

function mountSettings(container: HTMLElement) {
  return setupBreachV2SettingsPanel({
    container,
    initialMode: "auto",
    initialEffectiveQuality: "standard",
    initialStatsVisible: false,
    onModeChange: () => undefined,
    onStatsVisibilityChange: () => undefined,
  });
}

beforeEach(() => {
  document.body.replaceChildren();
  window.history.replaceState({}, "", "/");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  });
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

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

describe("BREACH-V2 responsive control center DOM", () => {
  it("keeps gameplay controls behind Settings at every viewport width", () => {
    const desktopContainer = document.body.appendChild(document.createElement("main"));
    setViewportWidth(641);
    const desktop = mountGameplay(desktopContainer);
    const desktopPanel = desktopContainer.querySelector<HTMLElement>("[data-testid='breach-v2-gameplay-panel']");
    const desktopToggle = desktopContainer.querySelector<HTMLButtonElement>("[aria-controls='breach-v2-gameplay-controls-body']");
    expect(desktopPanel?.hidden).toBe(true);
    expect(desktopToggle?.getAttribute("aria-expanded")).toBe("false");
    desktop.destroy();

    const mobileContainer = document.body.appendChild(document.createElement("main"));
    setViewportWidth(640);
    const mobile = mountGameplay(mobileContainer);
    const mobilePanel = mobileContainer.querySelector<HTMLElement>("[data-testid='breach-v2-gameplay-panel']");
    const mobileToggle = mobileContainer.querySelector<HTMLButtonElement>("[aria-controls='breach-v2-gameplay-controls-body']");
    expect(mobilePanel?.hidden).toBe(true);
    expect(mobileToggle?.getAttribute("aria-expanded")).toBe("false");
    mobile.destroy();
  });

  it("does not auto-open gameplay controls when the viewport breakpoint changes", () => {
    const container = document.body.appendChild(document.createElement("main"));
    setViewportWidth(641);
    const gameplay = mountGameplay(container);
    const panel = container.querySelector<HTMLElement>("[data-testid='breach-v2-gameplay-panel']")!;

    setViewportWidth(640);
    window.dispatchEvent(new Event("resize"));
    expect(panel.hidden).toBe(true);

    setViewportWidth(641);
    window.dispatchEvent(new Event("resize"));
    expect(panel.hidden).toBe(true);
    gameplay.destroy();
  });

  it("moves focus from Settings to Combat and restores it on Escape", () => {
    const container = document.body.appendChild(document.createElement("main"));
    setViewportWidth(390);
    const gameplay = mountGameplay(container);
    const settings = mountSettings(container);
    const settingsTrigger = container.querySelector<HTMLButtonElement>("[data-testid='breach-v2-settings-toggle']")!;
    settingsTrigger.click();
    container.querySelector<HTMLButtonElement>("[data-testid='breach-v2-open-combat']")!.click();
    const combatClose = container.querySelector<HTMLButtonElement>("[aria-controls='breach-v2-gameplay-controls-body']")!;
    expect(document.activeElement).toBe(combatClose);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.activeElement).toBe(settingsTrigger);
    expect(container.querySelector<HTMLElement>("[data-testid='breach-v2-gameplay-panel']")?.hidden).toBe(true);
    settings.destroy();
    gameplay.destroy();
  });

  it("moves focus from Settings to Navigation and restores it on Escape", () => {
    const container = document.body.appendChild(document.createElement("main"));
    setViewportWidth(390);
    const navigation = setupBreachV2DevPanel({
      container,
      layout: TEST_LAYOUT,
      seed: 4182,
      path: "wayfarer",
      cam: "isometric",
      warp: () => true,
      setAllDoorsOpen: () => undefined,
      persistSpatialState: () => undefined,
      clearSpatialState: () => undefined,
    });
    const settings = mountSettings(container);
    const settingsTrigger = container.querySelector<HTMLButtonElement>("[data-testid='breach-v2-settings-toggle']")!;
    settingsTrigger.click();
    container.querySelector<HTMLButtonElement>("[data-testid='breach-v2-open-navigation']")!.click();
    const navigationToggle = container.querySelector<HTMLButtonElement>("[data-testid='breach-v2-dev-toggle']")!;
    expect(document.activeElement).toBe(navigationToggle);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.activeElement).toBe(settingsTrigger);
    expect(container.querySelector<HTMLElement>("[data-testid='breach-v2-dev-panel']")?.hidden).toBe(true);
    settings.destroy();
    navigation.destroy();
  });
});

describe("BREACH-V2 accessible mobile movement controls", () => {
  it("omits meaningless camera zoom controls in first-person mode", () => {
    const container = document.body.appendChild(document.createElement("main"));
    const pad = setupBreachV2MobileMovementPad({
      container,
      keys: new Set<string>(),
      enabled: true,
      cameraZoomEnabled: false,
      adjustCameraDistance: vi.fn(),
    });
    expect(container.querySelector("[data-testid='breach-v2-zoom-in']")).toBeNull();
    expect(container.querySelector("[data-testid='breach-v2-zoom-out']")).toBeNull();
    pad.destroy();
  });

  it("supports keyboard hold, switch click, and semantic camera zoom", () => {
    vi.useFakeTimers();
    const container = document.body.appendChild(document.createElement("main"));
    const keys = new Set<string>();
    const adjustCameraDistance = vi.fn();
    const pad = setupBreachV2MobileMovementPad({
      container,
      keys,
      enabled: true,
      adjustCameraDistance,
    });
    const forward = container.querySelector<HTMLButtonElement>("[aria-label='Move forward']")!;
    forward.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(keys.has("ArrowUp")).toBe(true);
    forward.dispatchEvent(new KeyboardEvent("keyup", { key: " ", bubbles: true }));
    expect(keys.has("ArrowUp")).toBe(false);

    forward.click(); // Browser-generated click following the keyboard activation is de-duplicated.
    expect(keys.has("ArrowUp")).toBe(false);
    forward.click(); // A subsequent switch activation receives its own short movement pulse.
    expect(keys.has("ArrowUp")).toBe(true);
    vi.advanceTimersByTime(121);
    expect(keys.has("ArrowUp")).toBe(false);

    container.querySelector<HTMLButtonElement>("[data-testid='breach-v2-zoom-in']")!.click();
    expect(adjustCameraDistance).toHaveBeenCalledWith(-BREACH_V2_MOBILE_ZOOM_STEP);
    pad.destroy();
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
