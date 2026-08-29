import * as THREE from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { describe, expect, it, vi } from "vitest";

import { filterWardenActions } from "../src/game/dungeons/breach-v2-warden-review";
import {
  CINDERBOUND_BREAKOFF_STAGES,
  CINDERBOUND_WARDEN_ACTIONS,
  CINDERBOUND_WARDEN_ASSETS,
  buildCinderboundWardenPlacement,
  createBreachV2WardenRuntime,
} from "../src/game/dungeons/breach-v2-wardens";
import { buildBreachV2Layout } from "../src/game/dungeons/breach-v2-layout";
import { DUNGEON_PROP_ASSETS } from "../src/game/environment/DungeonPropCatalog";

function source(): GLTF {
  const scene = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.5, 1.2), new THREE.MeshStandardMaterial());
  body.name = "Cinderbound_Warden_Body";
  body.position.y = 1.75;
  const shoulder = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.55, 1.25), new THREE.MeshBasicMaterial());
  shoulder.name = "Breakoff_30_Shoulders";
  shoulder.position.y = 2.8;
  const forearms = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.65, 0.65), new THREE.MeshBasicMaterial());
  forearms.name = "Breakoff_60_Forearms";
  forearms.position.y = 1.85;
  const thighs = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.75), new THREE.MeshBasicMaterial());
  thighs.name = "Breakoff_90_Thighs";
  thighs.position.y = 0.85;
  const hand = new THREE.Group();
  hand.name = "hand_L";
  hand.position.set(1.3, 1.9, 0.3);
  scene.add(body, shoulder, forearms, thighs, hand);
  return {
    scene,
    scenes: [scene],
    animations: CINDERBOUND_WARDEN_ACTIONS.map((name) => new THREE.AnimationClip(name, 1, [])),
    cameras: [],
    asset: {},
    parser: {} as GLTF["parser"],
    userData: {},
  };
}

describe("BREACH-V2 Cinderbound Warden runtime", () => {
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

  it("loads only in the boss room, fires from the palm, and drops staged sections", async () => {
    const layout = buildBreachV2Layout(4182, "oathbreaker", DUNGEON_PROP_ASSETS);
    const placement = buildCinderboundWardenPlacement(layout, "oathbreaker");
    const start = layout.landmarks.playerStart;
    const loadAsync = vi.fn(async () => source());
    const scene = new THREE.Scene();
    const runtime = createBreachV2WardenRuntime(scene, layout, { loadAsync }, "oathbreaker");

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
    expect(scene.getObjectByName(`${placement.id}:furnace-light`)).toBeInstanceOf(THREE.PointLight);
    for (let index = 0; index < 3; index += 1) runtime.update(placement.x, placement.z, 1 / 60);
    expect(runtime.snapshots()[0]?.groundingStatus).toBe("calibrated-live-pose");
    expect(Math.abs(runtime.snapshots()[0]?.groundingClearanceMeters ?? 1)).toBeLessThan(0.002);

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
