import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  CINDERBOUND_WARDEN_SOURCE_YAW_CORRECTION,
  cinderboundWardenRootBone,
  createBreachV2WardenRuntime,
  measureCinderboundWardenTerminalYaw,
  type BreachV2WardenRuntime,
} from "../src/game/dungeons/breach-v2-wardens";
import { buildBreachV2Layout } from "../src/game/dungeons/breach-v2-layout";

// This browser project deliberately does not include ambient Node types.
// Keep the narrow CPU-test host contract local, as the other real-asset tests do.
const importNodeModule = <T>(specifier: string): Promise<T> => import(/* @vite-ignore */ specifier);
const { readFileSync } = await importNodeModule<{ readFileSync(path: URL): Uint8Array }>("node:fs");

/** The shipped dungeon body, and the rebuilt four-view pack under Motion Forge review. */
const SHIPPED_URL = "/assets/3d/creatures/cinderbound-wardens/cinderbound-warden.glb";
const REBUILT_URL = "/assets/weapon-lab/wardens/wayfarer-cinderbound-warden-fourview-v8.glb";

const bytes = new Map<string, Uint8Array<ArrayBuffer>>();

/**
 * Parse the exact pinned GLB — mesh, rig, weights and every authored clip.
 * Only image decoding is replaced for Node CPU tests; this is not visual QA.
 */
async function parseAsset(url: string): Promise<GLTF> {
  let source = bytes.get(url);
  if (!source) {
    source = Uint8Array.from(readFileSync(new URL(`../public${url}`, import.meta.url)));
    bytes.set(url, source);
  }
  const loader = new GLTFLoader();
  loader.register(() => ({
    name: "TEST_CPU_TEXTURE_DECODE_ONLY",
    loadTexture: async () => {
      const texture = new THREE.Texture();
      texture.image = { width: 1, height: 1 };
      return texture;
    },
  }));
  const copy = source.slice();
  return loader.parseAsync(copy.buffer, "");
}

function reviewLayout() {
  const source = buildBreachV2Layout(4182, "wayfarer");
  const room = source.rooms[0]!;
  return {
    ...source,
    rooms: [{ ...room, id: "motion-studio", x: -20, z: -20, w: 40, h: 40, floorElevation: 0, endElevation: 0 }],
    placements: [], enemies: [],
    boss: { ...source.boss, x: 0, z: 0, elevation: 0 },
  };
}

const runtimes = new Set<BreachV2WardenRuntime>();

/** A Warden staged exactly as the Motion Forge stages it: the lab origin, at yaw 0. */
async function stageWarden(url: string): Promise<{
  runtime: BreachV2WardenRuntime;
  scene: THREE.Scene;
  step(seconds?: number): void;
  bodyYawDegrees(): number;
  neutralPoseYawDegrees(): number;
  rootYawDegrees(): number;
  pivotYawOffsetDegrees(): number;
}> {
  const gltf = await parseAsset(url);
  const scene = new THREE.Scene();
  const runtime = createBreachV2WardenRuntime(
    scene, reviewLayout(), { loadAsync: async () => gltf }, "wayfarer", undefined, undefined,
    { reviewPlacement: { id: "studio:turns", kind: "wayfarer", roomId: "motion-studio", x: 0, z: 0, floorElevation: 0, yaw: 0 } },
  );
  runtimes.add(runtime);
  await runtime.warmAt(0, 0);
  const actor = runtime.reviewActor();
  if (!actor) throw new Error("The staged Warden did not build an actor.");
  const rootBone = cinderboundWardenRootBone(actor.model);
  if (!rootBone) throw new Error("The staged Warden has no root bone.");
  const worldQuaternion = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, "YXZ");
  // The heading the audience actually sees: root group, facing pivot and root bone
  // composed, read off the rig itself rather than off any one of the three.
  const bodyYawDegrees = (): number => {
    actor.root.updateMatrixWorld(true);
    rootBone.getWorldQuaternion(worldQuaternion);
    return THREE.MathUtils.radToDeg(euler.setFromQuaternion(worldQuaternion, "YXZ").y);
  };
  return {
    runtime, scene,
    step: (seconds = 1 / 60) => runtime.update(0, 0, seconds),
    bodyYawDegrees,
    // Every live clip carries its own root sway (this pack idles about 3.7 degrees off
    // centre), so headings are compared on one deterministic pose instead: Idle at t=0.
    neutralPoseYawDegrees: () => {
      runtime.pose("Idle", 0);
      return bodyYawDegrees();
    },
    rootYawDegrees: () => THREE.MathUtils.radToDeg(actor.root.rotation.y),
    pivotYawOffsetDegrees: () => THREE.MathUtils.radToDeg(
      (actor.root as unknown as { children: THREE.Object3D[] }).children
        .find((child) => child.type === "Group")!.rotation.y - CINDERBOUND_WARDEN_SOURCE_YAW_CORRECTION,
    ),
  };
}

/** Run the clip out and report the largest single-frame swing of the visible heading. */
function runToCompletion(
  stage: { step(seconds?: number): void; bodyYawDegrees(): number },
  seconds: number,
): { maxFrameJumpDegrees: number; samples: number[] } {
  const samples = [stage.bodyYawDegrees()];
  let maxFrameJumpDegrees = 0;
  const frames = Math.round(seconds * 60);
  for (let frame = 0; frame < frames; frame += 1) {
    stage.step();
    const yaw = stage.bodyYawDegrees();
    maxFrameJumpDegrees = Math.max(maxFrameJumpDegrees, Math.abs(yaw - samples[samples.length - 1]!));
    samples.push(yaw);
  }
  return { maxFrameJumpDegrees, samples };
}

afterEach(() => {
  for (const runtime of runtimes) runtime.dispose();
  runtimes.clear();
});

describe("Cinderbound Warden turn headings, measured on the real packs", () => {
  let shipped: GLTF;
  let rebuilt: GLTF;

  beforeAll(async () => {
    shipped = await parseAsset(SHIPPED_URL);
    rebuilt = await parseAsset(REBUILT_URL);
  }, 120_000);

  it("reads +90 and -90 degrees off the rebuilt pack and nothing off the shipped pack", () => {
    const headings = (gltf: GLTF): Record<string, number> => {
      const rootBone = cinderboundWardenRootBone(gltf.scene);
      expect(rootBone?.name).toBe("root");
      return Object.fromEntries(gltf.animations.map((clip) => [
        clip.name,
        THREE.MathUtils.radToDeg(measureCinderboundWardenTerminalYaw(clip, rootBone!.name)),
      ]));
    };
    const rebuiltHeadings = headings(rebuilt);
    expect(rebuiltHeadings.TurnLeft).toBeCloseTo(90, 4);
    expect(rebuiltHeadings.TurnRight).toBeCloseTo(-90, 4);
    // Only the two authored turns carry a heading; nothing else may hand one over.
    expect(Object.entries(rebuiltHeadings).filter(([, value]) => value !== 0).map(([name]) => name).sort())
      .toEqual(["TurnLeft", "TurnRight"]);

    // The shipped turns start and end on yaw 0, so they encode no heading at all
    // and this runtime must leave them exactly alone.
    const shippedHeadings = headings(shipped);
    expect(shippedHeadings.TurnLeft).toBe(0);
    expect(shippedHeadings.TurnRight).toBe(0);
    expect(Object.values(shippedHeadings).every((value) => value === 0)).toBe(true);
  });

  it("keeps the heading through the crossfade back to Idle without a single-frame snap", async () => {
    const stage = await stageWarden(REBUILT_URL);
    const neutral = stage.neutralPoseYawDegrees();
    expect(neutral).toBeCloseTo(-90.47, 1); // the source yaw correction plus the pack's Idle sway
    stage.runtime.play("TurnLeft", { immediate: true });
    // 1.333 s of turn plus the 0.32 s transition, with room to spare.
    const { maxFrameJumpDegrees, samples } = runToCompletion(stage, 2);
    expect(stage.runtime.snapshots()[0]!.currentClip).toBe("CombatIdle");
    // The turn's own fastest frame is about 1.9 degrees; a lost heading would show
    // up here as a ~90 degree snap on the frame the transition takes over.
    expect(maxFrameJumpDegrees).toBeLessThan(3);
    expect(samples).toHaveLength(121);
    // It really did turn: the same pose now reads a full 90 degrees further round.
    expect(stage.neutralPoseYawDegrees() - neutral).toBeCloseTo(90, 6);
    expect(stage.rootYawDegrees()).toBeCloseTo(90, 6);
    // The bones are back on neutral and the pivot is back on its source correction.
    expect(stage.pivotYawOffsetDegrees()).toBeCloseTo(0, 6);
    const snapshot = stage.runtime.snapshots()[0]!;
    expect(THREE.MathUtils.radToDeg(snapshot.facingYaw)).toBeCloseTo(90, 6);
    expect(snapshot.settlingTurnYaw).toBeCloseTo(0, 6);
  }, 120_000);

  it("replays the turn it just finished while the cancellation is still live", async () => {
    // Regression: the pivot stopped cancelling the finished turn's pose in the same
    // synchronous step that restarted the action, one frame before the bones moved off
    // it. Replaying the turn inside its 0.32 s settle window therefore threw the body
    // round by the whole 90 degrees on the spot. It has to be replayed while the
    // cancellation is live; once the settle has drained there is nothing to mistime.
    for (const immediate of [false, true]) {
      const stage = await stageWarden(REBUILT_URL);
      stage.runtime.play("TurnLeft", { immediate: true });
      runToCompletion(stage, 1.4);
      expect(stage.rootYawDegrees(), `immediate=${immediate}`).toBeCloseTo(90, 6);
      expect(Math.abs(stage.pivotYawOffsetDegrees()), `immediate=${immediate}`).toBeGreaterThan(1);
      const before = stage.bodyYawDegrees();

      stage.runtime.play("TurnLeft", immediate ? { immediate: true } : undefined);
      // Restarting a clip moves the pose by whatever separates the two first frames.
      // A released-too-early cancellation reads as the full 90 instead.
      expect(Math.abs(stage.bodyYawDegrees() - before), `immediate=${immediate}`).toBeLessThan(15);
      expect(stage.rootYawDegrees(), `immediate=${immediate}`).toBeCloseTo(90, 6);

      // and the replayed turn still lands its own heading on top of the first
      runToCompletion(stage, 2);
      expect(stage.rootYawDegrees(), `immediate=${immediate}`).toBeCloseTo(180, 6);
      expect(stage.pivotYawOffsetDegrees(), `immediate=${immediate}`).toBeCloseTo(0, 6);
    }
  }, 240_000);

  it("accumulates across repeated turns and unwinds when the turn reverses", async () => {
    const stage = await stageWarden(REBUILT_URL);
    const neutral = stage.neutralPoseYawDegrees();
    stage.runtime.play("TurnLeft", { immediate: true });
    const first = runToCompletion(stage, 2);
    expect(stage.rootYawDegrees()).toBeCloseTo(90, 6);
    expect(stage.neutralPoseYawDegrees() - neutral).toBeCloseTo(90, 6);

    stage.runtime.play("TurnLeft", { immediate: true });
    const second = runToCompletion(stage, 2);
    expect(stage.rootYawDegrees()).toBeCloseTo(180, 6);
    expect(stage.neutralPoseYawDegrees() - neutral).toBeCloseTo(180, 6);
    expect(Math.max(first.maxFrameJumpDegrees, second.maxFrameJumpDegrees)).toBeLessThan(3);

    stage.runtime.play("TurnRight", { immediate: true });
    runToCompletion(stage, 2);
    expect(stage.rootYawDegrees()).toBeCloseTo(90, 6);
    stage.runtime.play("TurnRight", { immediate: true });
    runToCompletion(stage, 2);
    expect(stage.rootYawDegrees()).toBeCloseTo(0, 6);
    expect(stage.pivotYawOffsetDegrees()).toBeCloseTo(0, 6);
  }, 120_000);

  it("hands over nothing when a turn is interrupted before it completes", async () => {
    const stage = await stageWarden(REBUILT_URL);
    const neutral = stage.neutralPoseYawDegrees();
    stage.runtime.play("TurnLeft", { immediate: true });
    runToCompletion(stage, 0.6);
    const partway = stage.bodyYawDegrees();
    // Half way round: the bones are carrying the turn, the root has taken nothing.
    expect(partway).toBeGreaterThan(-90);
    expect(partway).toBeLessThan(-20);
    expect(stage.rootYawDegrees()).toBe(0);

    stage.runtime.play("HitReact");
    runToCompletion(stage, 1.5);
    // An unfinished turn commits nothing: the boss ends up facing where it started.
    expect(stage.rootYawDegrees()).toBe(0);
    expect(stage.pivotYawOffsetDegrees()).toBeCloseTo(0, 6);
    expect(stage.neutralPoseYawDegrees() - neutral).toBeCloseTo(0, 6);
  }, 120_000);

  it("interrupts a turn that is still settling without losing or double-counting it", async () => {
    const stage = await stageWarden(REBUILT_URL);
    stage.runtime.play("TurnLeft", { immediate: true });
    // Stop 4 frames after the clip ends: the heading is committed and the transition
    // to CombatIdle is still crossfading, so the pivot is holding a live cancellation.
    runToCompletion(stage, 1.4);
    expect(stage.rootYawDegrees()).toBeCloseTo(90, 6);
    expect(Math.abs(stage.pivotYawOffsetDegrees())).toBeGreaterThan(1);
    const before = stage.bodyYawDegrees();

    stage.runtime.play("BladeSweep");
    // The heading survives the interruption and the visible pose does not jump.
    expect(Math.abs(stage.bodyYawDegrees() - before)).toBeLessThan(3);
    runToCompletion(stage, 1.5);
    expect(stage.rootYawDegrees()).toBeCloseTo(90, 6);
    expect(stage.pivotYawOffsetDegrees()).toBeCloseTo(0, 6);
  }, 120_000);

  it("shows a scrubbed turn from the clip alone and hands over no heading", async () => {
    const stage = await stageWarden(REBUILT_URL);
    stage.runtime.pose("TurnLeft", 0);
    expect(stage.bodyYawDegrees()).toBeCloseTo(-90, 2);
    expect(stage.rootYawDegrees()).toBe(0);

    stage.runtime.pose("TurnLeft", 0.5);
    const midway = stage.bodyYawDegrees();
    expect(midway).toBeGreaterThan(-90);
    expect(midway).toBeLessThan(-20);

    // Scrubbed to the end the clip itself already shows the finished turn; the root
    // must not add a second 90 degrees on top of it.
    stage.runtime.pose("TurnLeft", 1);
    expect(stage.bodyYawDegrees()).toBeCloseTo(0, 2);
    expect(stage.rootYawDegrees()).toBe(0);
    expect(stage.pivotYawOffsetDegrees()).toBeCloseTo(0, 6);

    // Scrubbing back down still tracks the clip and leaves the root alone.
    stage.runtime.pose("TurnLeft", 0);
    expect(stage.bodyYawDegrees()).toBeCloseTo(-90, 2);
    expect(stage.rootYawDegrees()).toBe(0);
  }, 120_000);

  it("leaves the shipped pack's headless turns exactly as they are today", async () => {
    const stage = await stageWarden(SHIPPED_URL);
    stage.runtime.play("TurnLeft", { immediate: true });
    const { maxFrameJumpDegrees } = runToCompletion(stage, 2);
    expect(stage.runtime.snapshots()[0]!.currentClip).toBe("CombatIdle");
    expect(maxFrameJumpDegrees).toBeLessThan(3);
    // Nothing was baked in, so nothing is handed over and nothing is cancelled.
    expect(stage.rootYawDegrees()).toBe(0);
    expect(stage.pivotYawOffsetDegrees()).toBe(0);
    expect(stage.bodyYawDegrees()).toBeCloseTo(-90, 2);
  }, 120_000);
});
