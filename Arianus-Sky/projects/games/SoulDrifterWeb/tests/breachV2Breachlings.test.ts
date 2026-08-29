import * as THREE from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { describe, expect, it, vi } from "vitest";

import {
  BREACHLING_RUNTIME_ASSETS,
  BREACHLING_UPPER_ACTIONS,
  breachlingActionNames,
  buildBreachlingPlacements,
  createBreachV2BreachlingRuntime,
} from "../src/game/dungeons/breach-v2-breachlings";
import { filterBreachlingActions } from "../src/game/dungeons/breach-v2-creature-review";
import { buildBreachV2Layout } from "../src/game/dungeons/breach-v2-layout";
import { DUNGEON_PROP_ASSETS } from "../src/game/environment/DungeonPropCatalog";

function source(): GLTF {
  const scene = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), new THREE.MeshBasicMaterial());
  body.position.y = 0.5;
  const jaw = new THREE.Group();
  jaw.name = "jaw";
  jaw.position.set(0, 0.8, 0.7);
  scene.add(body, jaw);
  return {
    scene,
    scenes: [scene],
    animations: BREACHLING_UPPER_ACTIONS.map((name) => new THREE.AnimationClip(name, 1, [])),
    cameras: [],
    asset: {},
    parser: {} as GLTF["parser"],
    userData: {},
  };
}

describe("BREACH-V2 Breachling runtime", () => {
  it("keeps the approved density, progression, scale, and action contracts", () => {
    const wayfarer = buildBreachV2Layout(4182, "wayfarer", DUNGEON_PROP_ASSETS);
    const oathbreaker = buildBreachV2Layout(4182, "oathbreaker", DUNGEON_PROP_ASSETS);
    const wayfarerRooms = wayfarer.rooms.filter((room) => !room.fixed);
    const oathbreakerRooms = oathbreaker.rooms.filter((room) => !room.fixed);
    expect(buildBreachlingPlacements(wayfarer, "wayfarer")).toHaveLength(wayfarerRooms.length * 2);
    const placements = buildBreachlingPlacements(oathbreaker, "oathbreaker");
    expect(placements).toHaveLength(oathbreakerRooms.length * 3);
    expect(placements.slice(0, 3).every((placement) => placement.tier === "base")).toBe(true);
    expect(placements.slice(-3).some((placement) => placement.tier === "ravager")).toBe(true);
    expect(Object.values(BREACHLING_RUNTIME_ASSETS).map((asset) => asset.targetHeightMeters)).toEqual([
      1.025, 1.075, 1.2, 1.325,
    ]);
    expect(breachlingActionNames("base")).not.toContain("SpitAttack");
    expect(breachlingActionNames("ravager")).toContain("SpitAttack");
    expect(filterBreachlingActions(BREACHLING_UPPER_ACTIONS, "tail whip")).toEqual(["TailWhip"]);
  });

  it("loads only the active combat room and emits upper-tier poison from SpitAttack", async () => {
    const layout = buildBreachV2Layout(4182, "oathbreaker", DUNGEON_PROP_ASSETS);
    const placements = buildBreachlingPlacements(layout, "oathbreaker");
    const upperPlacement = placements.find((placement) => placement.tier === "oathbound" || placement.tier === "ravager")!;
    const room = layout.rooms.find((candidate) => candidate.id === upperPlacement.roomId)!;
    const loadAsync = vi.fn(async () => source());
    const scene = new THREE.Scene();
    const runtime = createBreachV2BreachlingRuntime(scene, layout, { loadAsync }, "oathbreaker");
    await runtime.warmAt(room.x + room.w / 2, room.z + room.h / 2);
    expect(runtime.snapshots()).toHaveLength(3);
    expect(loadAsync.mock.calls.length).toBeGreaterThan(0);
    expect(loadAsync.mock.calls.length).toBeLessThan(4);
    runtime.update(room.x + room.w / 2, room.z + room.h / 2, 1 / 60);
    runtime.update(room.x + room.w / 2, room.z + room.h / 2, 1 / 60);
    runtime.update(room.x + room.w / 2, room.z + room.h / 2, 1 / 60);
    expect(runtime.snapshots().every((actor) => actor.groundingStatus === "calibrated-live-pose")).toBe(true);
    expect(runtime.snapshots().every((actor) => Math.abs(actor.groundingClearanceMeters ?? 1) < 0.002)).toBe(true);
    const upperActor = runtime.snapshots().find((actor) => actor.actionNames.includes("SpitAttack"))!;
    runtime.play(upperActor.id, "SpitAttack");
    runtime.update(room.x + room.w / 2, room.z + room.h / 2, 0.6);
    expect(scene.getObjectByName(`${upperActor.id}:poison-spit`)).toBeTruthy();
    runtime.dispose();
  });
});
