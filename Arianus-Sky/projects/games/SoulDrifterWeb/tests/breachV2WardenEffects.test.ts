import * as THREE from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";

import {
  CINDERBOUND_WARDEN_EFFECT_TIMELINES,
  cinderboundWardenEffectSeconds,
  isCinderboundWardenEffectClip,
  type CinderboundWardenEffectEvent,
} from "../src/game/dungeons/breach-v2-warden-effects";
import {
  CINDERBOUND_WARDEN_ACTIONS,
  createBreachV2WardenRuntime,
  type CinderboundWardenKind,
} from "../src/game/dungeons/breach-v2-wardens";
import { buildBreachV2Layout } from "../src/game/dungeons/breach-v2-layout";
import { DUNGEON_PROP_ASSETS } from "../src/game/environment/DungeonPropCatalog";

/** Runtime clip lengths of the shipped Wayfarer export (seconds). */
const CLIP_SECONDS: Readonly<Record<string, number>> = {
  PalmFire: 3,
  CinderSweep: 2.8,
  AshCall: 3.6,
  SoulTax: 4,
  FurnaceShutdown: 4,
};

function wardenSource(): GLTF {
  const scene = new THREE.Group();
  const map = new THREE.Texture();
  map.image = { width: 8, height: 8 };
  const material = new THREE.MeshStandardMaterial({ map });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.5, 1.2), material);
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
  const node = (name: string, x: number, y: number, z: number): THREE.Group => {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(x, y, z);
    return group;
  };
  const chestBone = new THREE.Bone();
  chestBone.name = "chest_bone";
  chestBone.position.set(0, 2.6, 0);
  scene.add(
    body, shoulder, forearms, thighs, chestBone,
    node("hand_L", 1.3, 1.9, 0.3), node("lower_arm_L", 0.9, 1.9, 0.2),
    node("hand_R", -1.3, 1.9, 0.3), node("lower_arm_R", -0.9, 1.9, 0.2),
    node("chest", 0, 2.4, 0),
  );
  return {
    scene,
    scenes: [scene],
    animations: CINDERBOUND_WARDEN_ACTIONS.map((name) => new THREE.AnimationClip(name, CLIP_SECONDS[name] ?? 1, [])),
    cameras: [],
    asset: {},
    parser: {} as GLTF["parser"],
    userData: {},
  };
}

async function stage(kind: CinderboundWardenKind) {
  // A generous flat review room (as Motion Forge stages it) so far targets stay
  // inside the boss room instead of unloading the actor.
  const source = buildBreachV2Layout(4182, kind, DUNGEON_PROP_ASSETS);
  const room = { ...source.rooms[0]!, id: "effects-lab", x: -20, z: -20, w: 40, h: 40, floorElevation: 0, endElevation: 0 };
  const layout = { ...source, rooms: [room], placements: [], enemies: [], boss: { ...source.boss, x: 0, z: 0, elevation: 0 } };
  const placement = {
    id: `cinderbound-warden:${kind}`, kind, roomId: room.id,
    x: 0, z: 0, floorElevation: 0, yaw: 0,
  };
  const scene = new THREE.Scene();
  const runtime = createBreachV2WardenRuntime(scene, layout, { loadAsync: async () => wardenSource() }, kind, undefined, undefined, {
    reviewPlacement: placement,
  });
  const events: CinderboundWardenEffectEvent[] = [];
  runtime.setEffectListener((event) => events.push(event));
  await runtime.warmAt(placement.x, placement.z);
  for (let frame = 0; frame < 3; frame += 1) runtime.update(placement.x, placement.z, 0);
  return { runtime, placement, scene, events, id: placement.id };
}

function status(runtime: Awaited<ReturnType<typeof stage>>["runtime"]) {
  return runtime.snapshots()[0]!.activeEffects;
}

describe("Cinderbound Warden attack effects", () => {
  it("derives every effect window from the attack-plan phase frames and rescales it to the runtime clip", () => {
    const palm = cinderboundWardenEffectSeconds("PalmFire", CLIP_SECONDS.PalmFire!);
    expect(palm.telegraph[0]).toBeCloseTo((24 / 90) * 3, 6);
    expect(palm.active[0]).toBeCloseTo((52 / 90) * 3, 6);
    expect(palm.impact).toBeCloseTo((52 / 90) * 3, 6);
    expect(palm.active[1]).toBeCloseTo((78 / 90) * 3, 6);
    expect(palm.recovery[1]).toBeCloseTo(3, 6);
    // The Greater Warden export ships CinderSweep at 70 frames instead of the
    // spec's 84: the impact stays on the next-square-contact phase of that clip.
    expect(cinderboundWardenEffectSeconds("CinderSweep", 70 / 30).impact).toBeCloseTo((48 / 84) * (70 / 30), 6);
    expect(CINDERBOUND_WARDEN_EFFECT_TIMELINES.CinderSweep.impactFrame).toBe(48);
    expect(CINDERBOUND_WARDEN_EFFECT_TIMELINES.AshCall.telegraph.from).toBe("vent-open");
    expect(CINDERBOUND_WARDEN_EFFECT_TIMELINES.AshCall.active.from).toBe("ash-expulsion");
    expect(CINDERBOUND_WARDEN_EFFECT_TIMELINES.SoulTax.impactFrame).toBe(88);
    expect(CINDERBOUND_WARDEN_EFFECT_TIMELINES.FurnaceShutdown.active.until).toBe("reignite");
    // Never the old fixed 0.48 fraction for every clip.
    const fractions = Object.values(CINDERBOUND_WARDEN_EFFECT_TIMELINES).map((timeline) => timeline.impactFrame / timeline.specFrames);
    expect(new Set(fractions.map((fraction) => fraction.toFixed(3))).size).toBeGreaterThan(1);
    // (BladeSweep contacts at plan frame 31 of 60, which happens to sit near 0.48; the guard is
    // that the fractions are not one blanket value, not that every clip avoids that number)
    expect(fractions.filter((fraction) => Math.abs(fraction - 0.48) <= 0.05).length).toBeLessThanOrEqual(1);
    expect(CINDERBOUND_WARDEN_EFFECT_TIMELINES.BladeSweep.impactFrame).toBe(31);
    expect(CINDERBOUND_WARDEN_EFFECT_TIMELINES.BladeSweep.recovery.until).toBe("guard-return");
    expect(isCinderboundWardenEffectClip("PalmFire")).toBe(true);
    expect(isCinderboundWardenEffectClip("BladeSweep")).toBe(true);
    expect(isCinderboundWardenEffectClip("HeavyWalk")).toBe(false);
    expect(() => cinderboundWardenEffectSeconds("PalmFire", 0)).toThrow();
  });

  it("fires a solid beam from the left palm to the target on the fire-release frame and locks its aim during the hold", async () => {
    const { runtime, placement, scene, events, id } = await stage("wayfarer");
    const target = { x: placement.x + 1.5, z: placement.z + 3 };
    runtime.play("PalmFire", { immediate: true });
    runtime.update(target.x, target.z, 1);
    expect(status(runtime)).toEqual([expect.objectContaining({ effect: "palm-fire", clip: "PalmFire", phase: "telegraph" })]);
    expect(events.map((event) => event.phase)).toEqual(["telegraph"]);
    const beam = scene.getObjectByName(`${id}:palm-fire`)!;
    expect(beam).toBeTruthy();
    expect(beam.getObjectByName(`${id}:palm-fire:core`)?.visible).toBe(false);
    expect(beam.getObjectByName(`${id}:palm-fire:palm-glow`)?.visible).toBe(true);
    expect(beam.getObjectByName(`${id}:palm-fire:aim-thread`)?.visible).toBe(true);

    runtime.update(target.x, target.z, 0.8);
    const active = status(runtime)[0]!;
    expect(active).toMatchObject({ effect: "palm-fire", phase: "active" });
    const hand = runtime.reviewActor()!.model.getObjectByName("hand_L")!;
    const handWorld = hand.getWorldPosition(new THREE.Vector3());
    expect(new THREE.Vector3().fromArray(active.origin).distanceTo(handWorld)).toBeLessThan(1e-6);
    expect(active.end[0]).toBeCloseTo(target.x, 6);
    expect(active.end[1]).toBeCloseTo(placement.floorElevation + 0.85, 6);
    expect(active.end[2]).toBeCloseTo(target.z, 6);
    expect(beam.getObjectByName(`${id}:palm-fire:core`)?.visible).toBe(true);
    expect(beam.getObjectByName(`${id}:palm-fire:sheath`)?.visible).toBe(true);
    expect(beam.getObjectByName(`${id}:palm-fire:heat-haze`)?.visible).toBe(true);
    expect(beam.getObjectByName(`${id}:palm-fire:embers`)?.visible).toBe(true);
    expect(beam.getObjectByName(`${id}:palm-fire:impact-flare`)?.visible).toBe(true);
    const core = beam.getObjectByName(`${id}:palm-fire:core`) as THREE.Mesh;
    expect(core.position.distanceTo(handWorld.clone().add(new THREE.Vector3().fromArray(active.end)).multiplyScalar(0.5))).toBeLessThan(1e-6);
    expect(core.scale.y).toBeCloseTo(handWorld.distanceTo(new THREE.Vector3().fromArray(active.end)), 6);
    expect(events.map((event) => event.phase)).toEqual(["telegraph", "active", "impact"]);
    expect(events[2]).toMatchObject({ effect: "palm-fire", hit: true });

    // The aim is locked at release so the sustained beam can be side-stepped.
    runtime.update(target.x + 3, target.z, 0.3);
    expect(status(runtime)[0]!.end).toEqual(active.end);
    runtime.update(target.x + 3, target.z, 0.6);
    expect(status(runtime)[0]).toMatchObject({ effect: "palm-fire", phase: "recovery" });
    expect(beam.getObjectByName(`${id}:palm-fire:core`)?.visible).toBe(false);
    expect(events.map((event) => event.phase)).toEqual(["telegraph", "active", "impact", "end"]);
    runtime.dispose();
  });

  it("shows the frame's effect when scrubbed without raising gameplay events", async () => {
    const { runtime, placement, scene, events, id } = await stage("wayfarer");
    runtime.pose("PalmFire", 0.7);
    runtime.update(placement.x, placement.z + 4, 0);
    expect(status(runtime)).toEqual([expect.objectContaining({ effect: "palm-fire", phase: "active" })]);
    expect(scene.getObjectByName(`${id}:palm-fire:core`)?.visible).toBe(true);
    expect(events).toEqual([]);
    runtime.pose("PalmFire", 0.1);
    runtime.update(placement.x, placement.z + 4, 0);
    expect(scene.getObjectByName(`${id}:palm-fire`)?.visible).toBe(false);
    runtime.dispose();
  });

  it("sweeps a fire wave with the blade, hits only the forward arc, and leaves a fading scorch", async () => {
    const { runtime, placement, scene, events, id } = await stage("wayfarer");
    runtime.play("CinderSweep", { immediate: true });
    runtime.update(placement.x, placement.z + 2, 1.7);
    expect(status(runtime)).toEqual([expect.objectContaining({ effect: "cinder-sweep", phase: "active" })]);
    const sweep = scene.getObjectByName(`${id}:cinder-sweep`)!;
    expect(sweep.getObjectByName(`${id}:cinder-sweep:wave`)?.visible).toBe(true);
    expect(sweep.getObjectByName(`${id}:cinder-sweep:blade-glow`)?.visible).toBe(true);
    expect(sweep.getObjectByName(`${id}:cinder-sweep:scorch`)?.visible).toBe(true);
    expect(events.find((event) => event.phase === "impact")).toMatchObject({ effect: "cinder-sweep", hit: true });

    events.length = 0;
    runtime.play("CinderSweep", { immediate: true });
    runtime.update(placement.x, placement.z - 2, 1.7);
    expect(events.find((event) => event.phase === "impact")).toMatchObject({ effect: "cinder-sweep", hit: false });

    runtime.play("CombatIdle", { immediate: true });
    runtime.update(placement.x, placement.z, 0.5);
    expect(status(runtime)).toEqual([expect.objectContaining({ effect: "cinder-sweep", lingering: true, phase: "recovery" })]);
    expect(sweep.getObjectByName(`${id}:cinder-sweep:wave`)?.visible).toBe(false);
    expect(sweep.getObjectByName(`${id}:cinder-sweep:scorch`)?.visible).toBe(true);
    runtime.update(placement.x, placement.z, 2.5);
    expect(status(runtime)).toEqual([]);
    expect(sweep.visible).toBe(false);
    runtime.dispose();
  });

  it("clears the sweep scorch after a Motion Forge scrub past impact and a switch to another action", async () => {
    // Motion Forge setAction = play + pose(0); scrubbing = pose(t); paused between.
    const { runtime, placement, scene, id } = await stage("wayfarer");
    runtime.play("CinderSweep", { immediate: true });
    runtime.pose("CinderSweep", 0);
    runtime.update(placement.x, placement.z + 4.5, 0.05);
    runtime.pose("CinderSweep", 0.9);
    runtime.update(placement.x, placement.z + 4.5, 0.05);
    const sweep = scene.getObjectByName(`${id}:cinder-sweep`)!;
    expect(sweep.getObjectByName(`${id}:cinder-sweep:scorch`)?.visible).toBe(true);
    runtime.play("Idle", { immediate: true });
    runtime.pose("Idle", 0);
    runtime.pause(true);
    for (let frame = 0; frame < 120; frame += 1) runtime.update(placement.x, placement.z + 4.5, 0.05);
    expect(status(runtime)).toEqual([]);
    expect(sweep.visible).toBe(false);
    runtime.dispose();
  });

  it("telegraphs the ash ring before the burst and hits only inside the burst radius", async () => {
    const { runtime, placement, scene, events, id } = await stage("wayfarer");
    runtime.play("AshCall", { immediate: true });
    runtime.update(placement.x, placement.z + 2, 1.5);
    expect(status(runtime)).toEqual([expect.objectContaining({ effect: "ash-call", phase: "telegraph" })]);
    const ring = scene.getObjectByName(`${id}:ash-call`)!;
    expect(ring.getObjectByName(`${id}:ash-call:telegraph-ring`)?.visible).toBe(true);
    expect(ring.getObjectByName(`${id}:ash-call:burst-ring`)?.visible).toBe(false);
    runtime.update(placement.x, placement.z + 2, 0.7);
    expect(status(runtime)).toEqual([expect.objectContaining({ effect: "ash-call", phase: "active" })]);
    expect(ring.getObjectByName(`${id}:ash-call:burst-ring`)?.visible).toBe(true);
    expect(ring.getObjectByName(`${id}:ash-call:ash`)?.visible).toBe(true);
    expect(events.find((event) => event.phase === "impact")).toMatchObject({ effect: "ash-call", hit: true });

    events.length = 0;
    runtime.play("AshCall", { immediate: true });
    runtime.update(placement.x, placement.z + 12, 2.2);
    expect(events.find((event) => event.phase === "impact")).toMatchObject({ effect: "ash-call", hit: false });
    runtime.dispose();
  });

  it("siphons with Soul Tax and gutters the furnace during the shutdown vulnerability", async () => {
    const { runtime, placement, scene, id } = await stage("wayfarer");
    runtime.play("SoulTax", { immediate: true });
    runtime.update(placement.x, placement.z + 3, 2);
    expect(status(runtime)).toEqual([expect.objectContaining({ effect: "soul-tax", phase: "active" })]);
    const siphon = scene.getObjectByName(`${id}:soul-tax`)!;
    expect(siphon.getObjectByName(`${id}:soul-tax:soul-motes`)?.visible).toBe(true);
    expect(siphon.getObjectByName(`${id}:soul-tax:slow-ring`)?.visible).toBe(true);
    const hand = runtime.reviewActor()!.model.getObjectByName("hand_L")!.getWorldPosition(new THREE.Vector3());
    expect(new THREE.Vector3().fromArray(status(runtime)[0]!.origin).distanceTo(hand)).toBeLessThan(1e-6);

    runtime.play("Idle", { immediate: true });
    runtime.update(placement.x, placement.z, 0.4);
    const light = scene.getObjectByName(`${id}:furnace-light`) as THREE.PointLight;
    const poweredIntensity = light.intensity;
    runtime.play("FurnaceShutdown", { immediate: true });
    runtime.update(placement.x, placement.z, 2);
    expect(status(runtime)).toEqual([expect.objectContaining({ effect: "furnace-shutdown", phase: "active" })]);
    expect(light.intensity).toBeLessThan(poweredIntensity * 0.5);
    const furnace = scene.getObjectByName(`${id}:furnace-shutdown`)!;
    expect(furnace.getObjectByName(`${id}:furnace-shutdown:valves-glow`)?.visible).toBe(true);
    expect(furnace.getObjectByName(`${id}:furnace-shutdown:vulnerability-ring`)?.visible).toBe(true);
    runtime.dispose();
  });

  it("scales the effects to the Greater Warden's 3.9 m body", async () => {
    const { runtime, placement, scene, id } = await stage("oathbreaker");
    runtime.play("AshCall", { immediate: true });
    runtime.update(placement.x, placement.z, 1.5);
    const ring = scene.getObjectByName(`${id}:ash-call:telegraph-ring`)!;
    expect(ring.scale.x).toBeCloseTo(3.4 * (3.9 / 3.6), 6);
    runtime.dispose();
  });

  it("turns a torn-off shell into ember debris with a scorch where it lands and an exposed ember core on the body", async () => {
    const { runtime, placement, scene, id } = await stage("wayfarer");
    runtime.setDamageFraction(0.31);
    expect(runtime.snapshots()[0]!.detachedStages).toEqual([30]);
    expect(runtime.snapshots()[0]!.breakoff).toEqual([{ stage: 30, settled: false, scorchMark: false, exposedCore: true }]);
    expect(scene.getObjectByName(`${id}:breakoff-30:embers`)).toBeTruthy();
    const core = scene.getObjectByName(`${id}:breakoff-30:exposed-core`)!;
    expect(core.parent).toBeInstanceOf(THREE.Bone);
    expect(core.parent?.name).toBe("chest_bone");
    expect(scene.getObjectByName("Breakoff_30_Shoulders")?.visible).toBe(false);

    for (let frame = 0; frame < 240; frame += 1) runtime.update(placement.x, placement.z, 1 / 30);
    expect(runtime.snapshots()[0]!.breakoff).toEqual([{ stage: 30, settled: true, scorchMark: true, exposedCore: true }]);
    const scorch = scene.getObjectByName(`${id}:breakoff-30:scorch`)!;
    expect(scorch).toBeTruthy();
    const debris = scene.children.find((child) => child.userData.damageStage === 30)!;
    expect(scorch.position.x).toBeCloseTo(debris.position.x, 6);
    expect(scorch.position.z).toBeCloseTo(debris.position.z, 6);
    expect(scene.getObjectByName(`${id}:breakoff-30:embers`)).toBeUndefined();

    runtime.setDamageFraction(0.95);
    expect(runtime.snapshots()[0]!.detachedStages).toEqual([30, 60, 90]);
    expect(runtime.snapshots()[0]!.breakoff.map((entry) => entry.stage)).toEqual([30, 60, 90]);
    runtime.setDamageFraction(0);
    expect(runtime.snapshots()[0]!.breakoff).toEqual([]);
    expect(scene.children.some((child) => child.name.includes(":breakoff-"))).toBe(false);
    expect(scene.getObjectByName(`${id}:breakoff-30:exposed-core`)).toBeUndefined();
    expect(scene.getObjectByName("Breakoff_30_Shoulders")?.visible).toBe(true);
    runtime.dispose();
  });

  it("disposes every effect material, texture and geometry with the actor", async () => {
    const { runtime, placement, scene, id } = await stage("wayfarer");
    runtime.play("PalmFire", { immediate: true });
    runtime.update(placement.x, placement.z + 3, 2);
    runtime.setDamageFraction(0.61);
    const core = scene.getObjectByName(`${id}:palm-fire:core`) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    const glow = scene.getObjectByName(`${id}:palm-fire:palm-glow`) as THREE.Sprite;
    const embers = scene.getObjectByName(`${id}:palm-fire:embers`) as THREE.Points;
    const counts = { material: 0, texture: 0, geometry: 0, cylinder: 0 };
    core.material.addEventListener("dispose", () => { counts.material += 1; });
    glow.material.map!.addEventListener("dispose", () => { counts.texture += 1; });
    embers.geometry.addEventListener("dispose", () => { counts.geometry += 1; });
    core.geometry.addEventListener("dispose", () => { counts.cylinder += 1; });
    runtime.dispose();
    runtime.dispose();
    expect(counts).toEqual({ material: 1, texture: 1, geometry: 1, cylinder: 1 });
    expect(scene.children).toHaveLength(0);
  });
});
