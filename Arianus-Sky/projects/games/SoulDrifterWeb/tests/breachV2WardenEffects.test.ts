import { CINDERBOUND_WARDEN_MUZZLE_STANDOFF_METERS } from "../src/game/vfx/cinderbound-warden-vfx";
import * as THREE from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";

import {
  CINDERBOUND_WARDEN_EFFECT_FPS,
  CINDERBOUND_WARDEN_EFFECT_TIMELINES,
  cinderboundWardenEffectSeconds,
  isCinderboundWardenEffectClip,
  CINDERBOUND_WARDEN_PALM_RIGS,
  type CinderboundWardenEffectEvent,
  type CinderboundWardenPalmKind,
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

/**
 * Where the beam is supposed to be born, derived the way the runtime derives it: the measured
 * emitter port and palm normal carried through hand_L's own world matrix. Asserting against
 * this rather than against the hand BONE is the point - the bone sits inside the shell and the
 * old code fired from it straight down the finger axis.
 */
function expectedMuzzle(
  runtime: Awaited<ReturnType<typeof stage>>["runtime"],
  kind: CinderboundWardenPalmKind,
): { port: THREE.Vector3; palmNormal: THREE.Vector3 } {
  const hand = runtime.reviewActor()!.model.getObjectByName("hand_L")!;
  hand.updateWorldMatrix(true, false);
  const rig = CINDERBOUND_WARDEN_PALM_RIGS[kind];
  return {
    port: new THREE.Vector3(...rig.portHandLocal).applyMatrix4(hand.matrixWorld),
    palmNormal: new THREE.Vector3(...rig.normalHandLocal).transformDirection(hand.matrixWorld).normalize(),
  };
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

  it("gives the shatter death real windows off its own clip length, not a fixed fraction", () => {
    const timeline = CINDERBOUND_WARDEN_EFFECT_TIMELINES.DeathShatter;
    expect(timeline).toMatchObject({
      effect: "death-shatter", specFrames: 96, impactFrame: 34, lingerSeconds: 0,
    });
    expect(timeline.telegraph).toEqual({ from: "core-overload", startFrame: 10, until: "seam-rupture", endFrame: 34 });
    expect(timeline.active).toEqual({ from: "seam-rupture", startFrame: 34, until: "shell-scatter", endFrame: 62 });
    expect(timeline.recovery).toEqual({ from: "shell-scatter", startFrame: 62, until: "ash-rest", endFrame: 96 });
    // 96 frames at 30 fps is the authored 3.2s clip.
    const authored = cinderboundWardenEffectSeconds("DeathShatter", 96 / CINDERBOUND_WARDEN_EFFECT_FPS);
    expect(authored.telegraph[0]).toBeCloseTo(10 / 30, 6);
    expect(authored.active[0]).toBeCloseTo(34 / 30, 6);
    // The shell lets go exactly on the phase frame, not at the window's middle.
    expect(authored.impact).toBeCloseTo(authored.active[0], 12);
    expect(authored.active[1]).toBeCloseTo(62 / 30, 6);
    expect(authored.recovery[1]).toBeCloseTo(96 / 30, 6);
    // A shorter export bursts on the same phase of the motion, rescaled.
    const short = cinderboundWardenEffectSeconds("DeathShatter", 2);
    expect(short.impact).toBeCloseTo((34 / 96) * 2, 6);
    expect(short.impact / 2).toBeCloseTo(authored.impact / (96 / 30), 12);
    expect(short.recovery[1]).toBeCloseTo(2, 6);
    // And it is its own phase, not the collapse's or a blanket 0.48 of the clip.
    expect(timeline.impactFrame / timeline.specFrames).toBeCloseTo(0.354166, 5);
    expect(isCinderboundWardenEffectClip("DeathShatter")).toBe(true);
    expect(isCinderboundWardenEffectClip("DeathCollapse")).toBe(false);
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
    // The beam is born at the emitter port on the palm, not at the hand bone buried in the
    // shell, and it leaves along the palm normal rather than down the fingers.
    const muzzle = expectedMuzzle(runtime, "wayfarer");
    const handWorld = muzzle.port;
    expect(new THREE.Vector3().fromArray(active.origin).distanceTo(muzzle.port)).toBeLessThan(1e-6);
    expect(muzzle.port.distanceTo(runtime.reviewActor()!.model.getObjectByName("hand_L")!.getWorldPosition(new THREE.Vector3()))).toBeGreaterThan(0.05);
    // and the muzzle FACES the palm normal: the port disc, its rim and the palm ring are all
    // square to the palm plate, which is what makes the aperture read as a bore in the hand.
    // (The bind-pose fact that the normal is perpendicular to the finger axis is a property of
    // the real rigs, measured by the composer probe and the clearance gate; this stage rig's
    // hand_L is a bare Group at an invented position, so it cannot show it.)
    const ring = beam.getObjectByName(`${id}:palm-fire:palm-ring`) as THREE.Mesh;
    const ringFacing = new THREE.Vector3(0, 0, 1).applyQuaternion(ring.quaternion);
    expect(ringFacing.dot(muzzle.palmNormal)).toBeGreaterThan(0.999);
    const bore = beam.getObjectByName(`${id}:palm-fire:port-bore`) as THREE.Mesh;
    const recess = beam.getObjectByName(`${id}:palm-fire:port-recess`) as THREE.Mesh;
    expect(new THREE.Vector3(0, 0, 1).applyQuaternion(bore.quaternion).dot(muzzle.palmNormal)).toBeGreaterThan(0.999);
    // the recess sits behind the port plane and the bore in front, so the hole never z-fights
    expect(recess.position.clone().sub(muzzle.port).dot(muzzle.palmNormal)).toBeLessThan(0);
    expect(bore.position.clone().sub(muzzle.port).dot(muzzle.palmNormal)).toBeGreaterThan(0);
    expect(active.end[0]).toBeCloseTo(target.x, 6);
    expect(active.end[1]).toBeCloseTo(placement.floorElevation + 0.85, 6);
    expect(active.end[2]).toBeCloseTo(target.z, 6);
    expect(beam.getObjectByName(`${id}:palm-fire:core`)?.visible).toBe(true);
    expect(beam.getObjectByName(`${id}:palm-fire:sheath`)?.visible).toBe(true);
    expect(beam.getObjectByName(`${id}:palm-fire:heat-haze`)?.visible).toBe(true);
    expect(beam.getObjectByName(`${id}:palm-fire:embers`)?.visible).toBe(true);
    expect(beam.getObjectByName(`${id}:palm-fire:impact-flare`)?.visible).toBe(true);
    const core = beam.getObjectByName(`${id}:palm-fire:core`) as THREE.Mesh;
    // The beam leaves in two spans: a straight length square out of the palm, then the
    // steering length to the target. Without that first span the far end would drag the
    // whole beam back across the fingers whenever the player is not where the clip aimed.
    const muzzleCore = beam.getObjectByName(`${id}:palm-fire:muzzle-core`) as THREE.Mesh;
    const endPoint = new THREE.Vector3().fromArray(active.end);
    const exit = handWorld.clone().addScaledVector(muzzle.palmNormal, CINDERBOUND_WARDEN_MUZZLE_STANDOFF_METERS);
    expect(muzzleCore.visible).toBe(true);
    // the first span starts at the port and runs along the palm normal, not toward the target
    expect(muzzleCore.position.distanceTo(handWorld.clone().add(exit).multiplyScalar(0.5))).toBeLessThan(1e-6);
    expect(muzzleCore.scale.y).toBeCloseTo(CINDERBOUND_WARDEN_MUZZLE_STANDOFF_METERS, 6);
    // the second span takes over exactly where the first ends, so there is no gap
    expect(core.position.distanceTo(exit.clone().add(endPoint).multiplyScalar(0.5))).toBeLessThan(1e-6);
    expect(core.scale.y).toBeCloseTo(exit.distanceTo(endPoint), 6);
    // and the exit really is square to the palm, whatever the target is doing
    const exitDirection = exit.clone().sub(handWorld).normalize();
    expect(exitDirection.dot(muzzle.palmNormal)).toBeGreaterThan(0.999);
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
    // SoulTax siphons through the same aperture PalmFire fires from, so it gets the same origin.
    const siphonMuzzle = expectedMuzzle(runtime, "wayfarer");
    expect(new THREE.Vector3().fromArray(status(runtime)[0]!.origin).distanceTo(siphonMuzzle.port)).toBeLessThan(1e-6);

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

  it("shows the palm port as a dark bore that charges through the telegraph and blows out into the beam", async () => {
    const { runtime, placement, scene, id } = await stage("wayfarer");
    const target = { x: placement.x, z: placement.z + 3 };
    runtime.play("PalmFire", { immediate: true });

    // Telegraph: the port is already showing. The recess is what makes it read as a HOLE, so it
    // has to subtract from the hand rather than glow on top of it - dark, opaque-ish and
    // normally blended. Additive blending here would paint a bright disc on the palm instead.
    runtime.update(target.x, target.z, 1);
    const recess = scene.getObjectByName(`${id}:palm-fire:port-recess`) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    const bore = scene.getObjectByName(`${id}:palm-fire:port-bore`) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    const rim = scene.getObjectByName(`${id}:palm-fire:port-rim`) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    const flare = scene.getObjectByName(`${id}:palm-fire:port-flare`) as THREE.Sprite;
    expect(recess.visible).toBe(true);
    expect(recess.material.blending).toBe(THREE.NormalBlending);
    expect(recess.material.color.getHex()).toBeLessThan(0x202020);
    expect(recess.material.opacity).toBeGreaterThan(0.5);
    expect(rim.visible).toBe(true);
    // the bore is still a pinprick and the flare is dark: the charge has not blown out yet
    const chargingBore = bore.scale.x;
    expect(bore.material.opacity).toBeLessThan(0.9);
    expect(flare.material.opacity).toBeLessThan(0.05);

    // Beam, sampled past the ramp at t = 2.2 s so the strength is at full: the bore is wider
    // and hotter than it was charging, and the flare is lit.
    runtime.update(target.x, target.z, 1.2);
    expect(bore.scale.x).toBeGreaterThan(chargingBore);
    expect(bore.material.opacity).toBeCloseTo(1, 3);
    expect(flare.material.opacity).toBeGreaterThan(0.5);
    expect(recess.visible).toBe(true);

    // Recovery: the whole port goes away with the effect rather than lingering on the hand.
    runtime.update(target.x, target.z, 0.6);
    expect(recess.visible).toBe(false);
    expect(bore.visible).toBe(false);
    expect(rim.visible).toBe(false);
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
