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
  const animationProbe = new THREE.Group();
  animationProbe.name = "animation_probe";
  scene.add(body, jaw, animationProbe);
  return {
    scene,
    scenes: [scene],
    animations: BREACHLING_UPPER_ACTIONS.map((name) => new THREE.AnimationClip(
      name,
      1,
      name === "ClawAttack"
        ? [new THREE.NumberKeyframeTrack("animation_probe.position[x]", [0, 1], [0, 2])]
        : [],
    )),
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
    runtime.pose(upperActor.id, "ClawAttack", 0.5);
    expect(runtime.snapshots().find((actor) => actor.id === upperActor.id)?.currentClip).toBe("ClawAttack");
    expect(runtime.snapshots().find((actor) => actor.id === upperActor.id)?.groundingStatus).toBe("pending");
    expect(scene.getObjectByName(upperActor.id)?.getObjectByName("animation_probe")?.position.x).toBeCloseTo(1);
    runtime.play(upperActor.id, "SpitAttack");
    runtime.update(room.x + room.w / 2, room.z + room.h / 2, 0.6);
    expect(scene.getObjectByName(`${upperActor.id}:poison-spit`)).toBeTruthy();
    runtime.dispose();
  });

  it("stages one real tier and exposes speed, explicit loop, terminal hold, and deterministic restart", async () => {
    const layout = buildBreachV2Layout(4182, "wayfarer", DUNGEON_PROP_ASSETS);
    const placement = { ...buildBreachlingPlacements(layout, "wayfarer")[0]!, tier: "ravager" as const };
    const loadAsync = vi.fn(async () => source());
    const runtime = createBreachV2BreachlingRuntime(new THREE.Scene(), layout, { loadAsync }, "wayfarer", undefined, {
      reviewPlacements: [placement],
    });
    await runtime.warmAt(placement.x, placement.z);
    expect(runtime.snapshots()).toHaveLength(1);
    expect(loadAsync).toHaveBeenCalledWith(BREACHLING_RUNTIME_ASSETS.ravager.url);
    expect(runtime.reviewActor(placement.id)?.root.name).toBe(placement.id);
    expect(runtime.reviewActor("absent")).toBeNull();
    runtime.setReviewPlayback(placement.id, { speed: 0.5, loop: true });
    runtime.play(placement.id, "ClawAttack", { immediate: true });
    runtime.update(placement.x, placement.z, 0.5);
    expect(runtime.snapshots()[0]).toMatchObject({
      currentClip: "ClawAttack", timeSeconds: 0.25, normalizedTime: 0.25,
      durationSeconds: 1, playbackSpeed: 0.5, reviewLoop: true, paused: false,
    });
    runtime.play(placement.id, "ClawAttack", { immediate: true });
    expect(runtime.snapshots()[0]?.timeSeconds).toBe(0);
    runtime.update(placement.x, placement.z, 2.2);
    expect(runtime.snapshots()[0]?.timeSeconds).toBeCloseTo(0.1);
    runtime.setReviewPlayback(placement.id, { loop: false });
    runtime.play(placement.id, "ClawAttack", { immediate: true });
    runtime.update(placement.x, placement.z, 2.2);
    expect(runtime.snapshots()[0]).toMatchObject({ currentClip: "ClawAttack", timeSeconds: 1, paused: true });
    runtime.setReviewPlayback(placement.id, { loop: null, speed: 1 });
    runtime.play(placement.id, "ClawAttack", { immediate: true });
    runtime.update(placement.x, placement.z, 1.1);
    expect(runtime.snapshots()[0]?.currentClip).toBe("CombatIdle");
    runtime.setReviewPlayback(placement.id, { speed: 500 });
    expect(runtime.snapshots()[0]?.playbackSpeed).toBe(3);
    expect(() => runtime.setReviewPlayback(placement.id, { speed: Number.NaN })).toThrow("finite");
    runtime.dispose();
    expect(runtime.reviewActor(placement.id)).toBeNull();
  });

  it("restores overlays around tracked and untracked paused poses and removes them on room disposal", async () => {
    const layout = buildBreachV2Layout(4182, "wayfarer", DUNGEON_PROP_ASSETS);
    const placement = buildBreachlingPlacements(layout, "wayfarer")[0]!;
    const runtime = createBreachV2BreachlingRuntime(new THREE.Scene(), layout, { loadAsync: async () => source() }, "wayfarer");
    await runtime.warmAt(placement.x, placement.z);
    const actor = runtime.reviewActor(placement.id)!;
    const probe = actor.model.getObjectByName("animation_probe")!;
    const untracked = new THREE.Bone();
    actor.model.add(untracked);
    const basePosition = probe.position.clone();
    const baseRotation = untracked.quaternion.clone();
    const restore = vi.fn(() => {
      probe.position.copy(basePosition);
      untracked.quaternion.copy(baseRotation);
    });
    runtime.setReviewPoseHooks(placement.id, {
      restore,
      apply: () => {
        basePosition.copy(probe.position);
        baseRotation.copy(untracked.quaternion);
        probe.position.x += 0.3;
        untracked.rotateZ(0.2);
      },
    });
    for (let pass = 0; pass < 20; pass += 1) {
      runtime.pose(placement.id, "ClawAttack", 0.5);
      runtime.update(placement.x, placement.z, 0);
      expect(probe.position.x).toBeCloseTo(1.3);
      expect(untracked.rotation.z).toBeCloseTo(0.2);
    }
    // Idle deliberately lacks the probe track: the old overlay must not be
    // captured by a newly activated binding or added again to the missing track.
    runtime.pose(placement.id, "Idle", 0.5);
    for (let pass = 0; pass < 20; pass += 1) runtime.update(placement.x, placement.z, 0);
    expect(probe.position.x).toBeCloseTo(0.3);
    expect(untracked.rotation.z).toBeCloseTo(0.2);
    runtime.setReviewPoseHooks(placement.id, null);
    expect(probe.position.x).toBeCloseTo(0);
    expect(untracked.rotation.z).toBeCloseTo(0);
    runtime.setReviewPoseHooks(placement.id, { restore, apply: () => { untracked.rotateZ(0.2); } });
    const beforeClear = restore.mock.calls.length;
    const start = layout.landmarks.playerStart;
    await runtime.warmAt(start.x, start.z);
    expect(restore).toHaveBeenCalledTimes(beforeClear + 1);
    expect(untracked.rotation.z).toBeCloseTo(0);
    expect(runtime.reviewActor(placement.id)).toBeNull();
    runtime.dispose();
    runtime.dispose();
    expect(restore).toHaveBeenCalledTimes(beforeClear + 1);
  });
});
