import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBreachV2AnimationPilot } from "../src/game/dungeons/breach-v2-animation-pilot";

function bodyScene(): THREE.Group {
  const model = new THREE.Group();
  const armature = new THREE.Group();
  const hips = new THREE.Bone();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshBasicMaterial());
  armature.name = "HumanFoundation_Armature";
  hips.name = "mixamorigHips";
  hips.position.y = -2;
  body.name = "HumanFoundation_BodyMesh";
  body.position.y = 1;
  hips.add(body);
  armature.add(hips);
  model.add(armature);
  return model;
}

function clip(name: string, airborne = false): THREE.AnimationClip {
  return new THREE.AnimationClip(name, 1, [
    new THREE.VectorKeyframeTrack(
      "mixamorigHips.position",
      [0, 0.5, 1],
      airborne
        ? [0, 0, 0, 0, 1.25, 0, 0, 0, 0]
        : [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ),
  ]);
}

function animationLibrary(): readonly THREE.AnimationClip[] {
  return [
    clip("MaleLocomotion__Idle"),
    clip("BasicLocomotion__Jump", true),
    ...Array.from({ length: 398 }, (_, index) => clip(`Coverage__${index.toString().padStart(3, "0")}`)),
  ];
}

function approvedClipNameForUrl(url: string): string | null {
  if (url.includes("authored-lockpick")) return "AuthoredUtility__Lockpick";
  if (url.includes("authored-spell-impact-knockback-fall")) {
    return "AuthoredReaction__SpellImpactKnockbackAndFall";
  }
  if (url.includes("authored-npc-listen")) return "AuthoredUtility__NpcListen";
  if (url.includes("authored-farewell")) return "AuthoredUtility__Farewell";
  return null;
}

const importNodeModule = (specifier: string) => import(specifier);
const nodeProcess = (globalThis as typeof globalThis & { process: { cwd: () => string } }).process;

async function loadRealGlb(path: string): Promise<GLTF> {
  const [{ readFile }, { default: nodePath }] = await Promise.all([
    importNodeModule("node:fs/promises"),
    importNodeModule("node:path"),
  ]);
  const bytes = await readFile(nodePath.resolve(nodeProcess.cwd(), path));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new GLTFLoader().parseAsync(buffer, "");
}

describe("Breach V2 Human animation pilot grounding", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps one calibrated pivot through grounded rest, bone-driven jump, landing, replay, and clip switches", async () => {
    vi.stubGlobal("window", {});
    const body = bodyScene();
    const animations = animationLibrary();
    const loader = {
      loadAsync: vi.fn(async (url: string) => {
        if (url.includes("runtime-4k")) return { scene: body, animations: [] };
        const approvedClipName = approvedClipNameForUrl(url);
        if (approvedClipName) return { scene: new THREE.Group(), animations: [clip(approvedClipName)] };
        return { scene: new THREE.Group(), animations };
      }),
    } as unknown as GLTFLoader;

    const pilot = await createBreachV2AnimationPilot(loader);
    const bridge = window.__SOULDRIFTER_PILOT_REVIEW__!;
    const pivot = pilot.root.getObjectByName("issue-487-human-pilot-grounding-pivot")!;
    const fixedPivotY = pivot.position.y;

    const rest = bridge.snapshot().grounding!;
    expect(rest.pass).toBe(true);
    expect(rest.clearanceMeters).toBeCloseTo(0, 9);
    expect(rest.appliedGroundingOffsetMeters).toBe(fixedPivotY);

    bridge.playReview("BasicLocomotion__Jump", false);
    pilot.update(0.5);
    const apex = bridge.snapshot().grounding!;
    expect(apex.currentRootY).toBeCloseTo(apex.targetRootRestY, 9);
    expect(apex.authoredRootDeltaY).toBeCloseTo(0, 9);
    expect(apex.airborneClearanceAllowed).toBe(true);
    expect(apex.clearanceMeters).toBeGreaterThan(1);
    expect(apex.pass).toBe(true);
    expect(pivot.position.y).toBe(fixedPivotY);

    pilot.update(0.5);
    const landing = bridge.snapshot().grounding!;
    expect(landing.clearanceMeters).toBeCloseTo(0, 9);
    expect(landing.pass).toBe(true);
    expect(pivot.position.y).toBe(fixedPivotY);

    for (let replay = 0; replay < 25; replay += 1) {
      bridge.playReview("MaleLocomotion__Idle", true);
      pilot.update(0.25);
      expect(bridge.snapshot().grounding!.clearanceMeters).toBeCloseTo(0, 9);
      expect(pivot.position.y).toBe(fixedPivotY);

      bridge.playReview("BasicLocomotion__Jump", false);
      pilot.update(0.5);
      expect(bridge.snapshot().grounding!.clearanceMeters).toBeGreaterThan(1);
      expect(pivot.position.y).toBe(fixedPivotY);
    }

    pilot.dispose();
    body.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else object.material.dispose();
    });
  });

  it("proves fixed-pivot grounding against the real zero-action body and 400-clip library", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("self", globalThis);
    const textureWarning = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const [body, library, lockpick, spellImpact, npcListen, farewell] = await Promise.all([
      loadRealGlb("public/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb"),
      loadRealGlb("public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb"),
      loadRealGlb("public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-lockpick.glb"),
      loadRealGlb("public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-spell-impact-knockback-fall.glb"),
      loadRealGlb("public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-npc-listen.glb"),
      loadRealGlb("public/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-authored-farewell.glb"),
    ]);
    textureWarning.mockRestore();

    expect(library.animations).toHaveLength(400);
    expect(library.animations.filter((candidate) => (
      candidate.tracks.some((track) => track.name === "mixamorigHips.position")
    ))).toHaveLength(400);
    expect(library.animations.filter((candidate) => (
      candidate.tracks.some((track) => /Armature\.position$/i.test(track.name))
    ))).toHaveLength(0);

    const maleJump = library.animations.find((candidate) => candidate.name === "MaleLocomotion__Jump")!;
    const basicJump = library.animations.find((candidate) => candidate.name === "BasicLocomotion__Jump")!;
    expect(basicJump.duration).toBe(maleJump.duration);
    expect(basicJump.tracks.map((track) => ({
      name: track.name,
      times: Array.from(track.times),
      values: Array.from(track.values),
    }))).toEqual(maleJump.tracks.map((track) => ({
      name: track.name,
      times: Array.from(track.times),
      values: Array.from(track.values),
    })));

    const approvedLibraries = new Map<string, GLTF>([
      ["AuthoredUtility__Lockpick", lockpick],
      ["AuthoredReaction__SpellImpactKnockbackAndFall", spellImpact],
      ["AuthoredUtility__NpcListen", npcListen],
      ["AuthoredUtility__Farewell", farewell],
    ]);
    const loader = {
      loadAsync: vi.fn(async (url: string) => {
        if (url.includes("runtime-4k")) return body;
        const approvedClipName = approvedClipNameForUrl(url);
        return approvedClipName ? approvedLibraries.get(approvedClipName)! : library;
      }),
    } as unknown as GLTFLoader;
    const pilot = await createBreachV2AnimationPilot(loader);
    const bridge = window.__SOULDRIFTER_PILOT_REVIEW__!;
    expect(bridge.reviewAnimations()).toContain("AuthoredUtility__Lockpick");
    const pivot = pilot.root.getObjectByName("issue-487-human-pilot-grounding-pivot")!;
    const fixedPivotY = pivot.position.y;
    const sample = (name: string, timeSeconds: number) => {
      bridge.playReview(name, false);
      pilot.update(timeSeconds);
      expect(pivot.position.y).toBe(fixedPivotY);
      return bridge.snapshot().grounding!;
    };

    const idle = sample("MaleLocomotion__Idle", 0);
    expect(Math.abs(idle.clearanceMeters)).toBeLessThanOrEqual(0.01);
    const maleStart = sample("MaleLocomotion__Jump", 0);
    const maleApex = sample("MaleLocomotion__Jump", maleJump.duration / 2);
    const maleLanding = sample("MaleLocomotion__Jump", maleJump.duration);
    const basicStart = sample("BasicLocomotion__Jump", 0);
    const basicApex = sample("BasicLocomotion__Jump", basicJump.duration / 2);
    const basicLanding = sample("BasicLocomotion__Jump", basicJump.duration);
    const lockpickClip = lockpick.animations.find((candidate) => candidate.name === "AuthoredUtility__Lockpick")!;
    const lockpickStart = sample("AuthoredUtility__Lockpick", 0);
    const lockpickMidpoint = sample("AuthoredUtility__Lockpick", lockpickClip.duration / 2);
    const lockpickEnd = sample("AuthoredUtility__Lockpick", lockpickClip.duration);

    expect(Math.abs(maleStart.clearanceMeters)).toBeLessThanOrEqual(0.01);
    expect(maleApex.clearanceMeters).toBeGreaterThan(0.25);
    expect(Math.abs(maleLanding.clearanceMeters)).toBeLessThanOrEqual(0.01);
    expect(basicStart.clearanceMeters).toBeCloseTo(maleStart.clearanceMeters, 9);
    expect(basicApex.clearanceMeters).toBeCloseTo(maleApex.clearanceMeters, 9);
    expect(basicLanding.clearanceMeters).toBeCloseTo(maleLanding.clearanceMeters, 9);
    expect(Math.abs(lockpickStart.clearanceMeters)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(lockpickMidpoint.clearanceMeters)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(lockpickEnd.clearanceMeters)).toBeLessThanOrEqual(0.01);

    pilot.dispose();
    body.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else object.material.dispose();
    });
  });
});
