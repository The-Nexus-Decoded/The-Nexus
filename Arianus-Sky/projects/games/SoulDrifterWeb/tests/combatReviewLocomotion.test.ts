import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { measureReviewLocomotion, reviewLocomotionActions, reviewLocomotionSourceToken } from "../src/review/weapon-lab/combat-review-locomotion";
import { createMobReviewActor } from "../src/review/weapon-lab/mob-review-actor";
import { MOB_CATALOG } from "../src/review/weapon-lab/mobs-stage";
// @ts-expect-error Production JS actor factory; texture decoding alone is stubbed below.
import { createHumanReviewActorFactory } from "../src/review/weapon-lab/human-review-actor.js";
// @ts-expect-error Existing shared catalog is the loadout authority.
import { LOADOUTS } from "../src/review/weapon-lab/human-review-catalog.js";

const importHost = <T>(name: string): Promise<T> => import(/* @vite-ignore */ name);
const { readFileSync } = await importHost<{ readFileSync(path: URL): Uint8Array }>("node:fs");
const { webcrypto } = await importHost<{ webcrypto: Crypto }>("node:crypto");
const disposables = new Set<{ dispose(): void }>();
afterEach(() => { for (const value of disposables) value.dispose(); disposables.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

// CPU source/rig fixture only; never shown as a character or substituted for art.
function fixture(travel = 2, articulation = true) {
  const root = new THREE.Group(), model = new THREE.Group(); root.add(model);
  const hips = new THREE.Bone(); hips.name = "mixamorigHips"; model.add(hips);
  const bones = [hips];
  for (const side of ["Left", "Right"]) {
    let parent = hips;
    for (const suffix of ["UpLeg", "Leg", "Foot"]) {
      const bone = new THREE.Bone(); bone.name = `mixamorig${side}${suffix}`;
      bone.position.y = -0.2; parent.add(bone); bones.push(bone); parent = bone;
    }
  }
  const vertices = bones.flatMap((_bone, index) => [index * 0.02, 0, 0, index * 0.02 + 0.01, 0, 0, index * 0.02, 0.01, 0]);
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(Array.from({ length: bones.length * 3 }, (_unused, index) => index));
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(bones.flatMap((_bone, index) => Array.from({ length: 3 }, () => [index, 0, 0, 0]).flat()), 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(bones.flatMap(() => Array.from({ length: 3 }, () => [1, 0, 0, 0]).flat()), 4));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial()); model.add(mesh);
  const skeleton = new THREE.Skeleton(bones); mesh.bind(skeleton);
  const clip = new THREE.AnimationClip("walk", 1, [new THREE.NumberKeyframeTrack("fixture", [0, 1], [0, travel])]);
  const actor = { instanceId: "fixture", definitionId: "human-foundation-pilot", root, model, clips: new Map([["walk", clip]]),
    actions: () => ["walk", "idle"].map((id) => ({ id, label: id, clipName: id, durationSeconds: 1,
      semantic: id === "walk" ? "walk" as const : "idle" as const, rootPolicy: "authored-displacement" as const, approvalStatus: "source" as const })),
    snapshot: () => ({ mode: "equipment", loadoutId: "bow" }),
    sample: vi.fn((id: string, time: number) => {
      hips.position.set(0, 1, id === "walk" ? time * travel : 0);
      bones.slice(1).forEach((bone, index) => bone.rotation.set(id === "walk" && articulation ? Math.sin(time * Math.PI * 2) * 0.3 * (index % 2 ? -1 : 1) : 0, 0, 0));
      root.updateWorldMatrix(true, true);
    }), reset() {}, dispose() { geometry.dispose(); mesh.material.dispose(); skeleton.dispose(); },
  };
  disposables.add(actor); actor.sample("idle", 0);
  return { actor, hips, bones, mesh, clip, restore: vi.fn(() => actor.sample("idle", 0)) };
}

describe("measured source locomotion capabilities", () => {
  it("samples exact forward stride and independent legs without changing placement or inventing foot support", async () => {
    const { actor, hips, restore } = fixture(); actor.root.position.set(4, 0, -3); actor.root.rotation.y = 1.1; actor.root.scale.setScalar(1.5);
    const placement = actor.root.position.toArray();
    const result = await measureReviewLocomotion(actor, "walk", { restore });
    expect(reviewLocomotionActions(actor).map((entry) => entry.id)).toEqual(["walk"]);
    expect(result.status).toBe("authored-forward"); expect(result.cycleDisplacement[2]).toBeCloseTo(3);
    expect(result.canRepeatAuthoredTravel).toBe(true); expect(result.supportStatus).toBe("unmeasured");
    expect(result.limbs).toHaveLength(2); expect(result.limbs.every((limb) => limb.rotationSpansRadians.every((angle) => angle > 0.29))).toBe(true);
    expect(result.limbs[0]!.distalSkinInfluence).toEqual({ minimumWeight: 0.05, vertexCount: 3, maxWeight: 1, totalWeight: 3 });
    expect(result.loopPositionResidualMeters).toBeLessThan(1e-6); expect(result.loopRotationResidualRadians).toBeLessThan(1e-6);
    expect(actor.root.position.toArray()).toEqual(placement); expect(hips.position.z).toBe(0);
    expect(restore.mock.calls.length).toBeGreaterThan(1); expect(Object.isFrozen(result.samples[0]!.anchor)).toBe(true);
    expect(Object.isFrozen(result.limbs[0]!.rotationSpansRadians)).toBe(true);
  });

  it("refuses implicit reverse playback, in-place speed guesses and rigid root-only gait", async () => {
    for (const [travel, articulated, status, reason] of [[-2, true, "authored-backward", /not silently reversed/],
      [0, true, "in-place", /weighted foot-support/], [2, false, "authored-forward", /root travel alone/]] as const) {
      const { actor, restore } = fixture(travel, articulated), result = await measureReviewLocomotion(actor, "walk", { restore });
      expect(result.status).toBe(status); expect(result.canRepeatAuthoredTravel).toBe(false); expect(result.unavailableReason).toMatch(reason);
    }
  });

  it("fails closed on missing skin, incomplete chains, unbound rig, invalid actions and nonuniform scale", async () => {
    const first = fixture(); first.mesh.visible = false;
    expect((await measureReviewLocomotion(first.actor, "walk", first)).status).toBe("unavailable");
    const second = fixture(); second.bones[2]!.name = "wrong-leg";
    expect((await measureReviewLocomotion(second.actor, "walk", second)).status).toBe("unavailable");
    const third = fixture(); third.actor.definitionId = "unknown";
    expect((await measureReviewLocomotion(third.actor, "walk", third)).status).toBe("unavailable");
    const last = fixture();
    expect((await measureReviewLocomotion(last.actor, "idle", last)).status).toBe("unavailable");
    last.actor.root.scale.set(1, 2, 1);
    expect((await measureReviewLocomotion(last.actor, "walk", last)).unavailableReason).toMatch(/uniform/);
    expect(last.restore).toHaveBeenCalled();
    last.actor.root.scale.setScalar(1); last.actor.root.rotation.x = 0.3;
    expect((await measureReviewLocomotion(last.actor, "walk", last)).unavailableReason).toMatch(/upright/);
    await expect(measureReviewLocomotion(last.actor, "walk", { restore: last.restore, samplesPerSecond: 1 })).rejects.toThrow(/8–120/);
  });

  it("retains a deforming unweighted parent but refuses an unweighted terminal foot", async () => {
    for (const [boneIndex, expected] of [[1, "authored-forward"], [3, "unavailable"]] as const) {
      const value = fixture(), indices = value.mesh.geometry.getAttribute("skinIndex");
      for (let vertex = 0; vertex < indices.count; vertex++) if (indices.getX(vertex) === boneIndex) indices.setX(vertex, 2);
      expect((await measureReviewLocomotion(value.actor, "walk", value)).status).toBe(expected);
    }
  });

  it("refuses epsilon distal weights and a single meaningful vertex as a functional foot", async () => {
    for (const meaningfulCount of [0, 1, 2]) {
      const value = fixture(), indices = value.mesh.geometry.getAttribute("skinIndex"), weights = value.mesh.geometry.getAttribute("skinWeight");
      let distalVertex = 0;
      for (let vertex = 0; vertex < indices.count; vertex++) if (indices.getX(vertex) === 3) {
        const weight = distalVertex++ < meaningfulCount ? 1 : 1e-12;
        weights.setXY(vertex, weight, 1 - weight); indices.setY(vertex, 2);
      }
      const result = await measureReviewLocomotion(value.actor, "walk", value);
      expect(result.status).toBe("unavailable"); expect(result.canRepeatAuthoredTravel).toBe(false);
      expect(result.unavailableReason).toMatch(/three rendered vertices of 0.05 distal weight/);
      expect(value.actor.sample).toHaveBeenCalledTimes(1);
    }
  });

  it("detects exact source-track edits and placement changes while yielding, restoring the caller's newest pose", async () => {
    for (const mutation of ["track", "placement", "abort"] as const) {
      const { actor, clip } = fixture(), abort = new AbortController(); let newestTime = 0;
      const before = reviewLocomotionSourceToken(actor, "walk");
      const request = measureReviewLocomotion(actor, "walk", { restore: () => actor.sample("walk", newestTime), signal: abort.signal });
      newestTime = 0.37;
      if (mutation === "track") clip.tracks[0]!.values[1] = 9;
      else if (mutation === "placement") actor.root.position.x = 3; else abort.abort();
      await expect(request).rejects.toMatchObject({ name: "AbortError" });
      expect(actor.sample).toHaveBeenLastCalledWith("walk", 0.37);
      if (mutation !== "abort") expect(reviewLocomotionSourceToken(actor, "walk")).not.toBe(before);
    }
  });

  it("reports source cycle discontinuities instead of promising seamless accumulated motion", async () => {
    const { actor, bones, restore } = fixture(); const sample = actor.sample.getMockImplementation()!;
    actor.sample.mockImplementation((id, time) => { sample(id, time); if (id === "walk") bones[1]!.rotation.x += time * 0.3; });
    const result = await measureReviewLocomotion(actor, "walk", { restore });
    expect(result.status).toBe("authored-forward"); expect(result.canRepeatAuthoredTravel).toBe(false);
    expect(result.loopRotationResidualRadians).toBeCloseTo(0.3); expect(result.unavailableReason).toMatch(/pose discontinuity/);
  });

  it("measures all ten actual human carry catalogs with untouched public source clips and exact pose restoration", async () => {
    const decode = async () => new THREE.Texture();
    const factory = createHumanReviewActorFactory({ loader: { loadAsync: async (url: string) => {
      const bytes = Uint8Array.from(readFileSync(new URL(`../public/${url.replace(/^\.\//, "")}`, import.meta.url)));
      const loader = new GLTFLoader(); loader.register(() => ({ name: "TEST_IMAGE_DECODE_ONLY", loadTexture: decode }));
      loader.register(() => ({ name: "EXT_texture_webp", loadTexture: decode })); return loader.parseAsync(bytes.buffer, "");
    } }, textureLoader: { loadAsync: decode } }); disposables.add(factory);
    for (const loadoutId of Object.keys(LOADOUTS)) {
      const actor = await factory.create({ instanceId: `locomotion-${loadoutId}`, loadoutId }); disposables.add(actor);
      const actions = reviewLocomotionActions(actor), walk = actions.find((entry) => entry.semantic === "walk")!;
      const ready = actor.actions().find((entry: { semantic: string }) => entry.semantic === "idle")!;
      actor.sample(ready.id, 0.2); const pose = [...actor.bones.values()].map((bone: THREE.Bone) => bone.matrixWorld.toArray());
      const before = reviewLocomotionSourceToken(actor, walk.id);
      const result = await measureReviewLocomotion(actor, walk.id, { restore: () => actor.sample(ready.id, 0.2) });
      expect(result.status, loadoutId).toBe("authored-forward"); expect(result.cycleDisplacement[2], loadoutId).toBeGreaterThan(1.5);
      expect(result.limbs).toHaveLength(2); expect(result.supportStatus).toBe("unmeasured");
      expect([...actor.bones.values()].map((bone: THREE.Bone) => bone.matrixWorld.toArray())).toEqual(pose);
      expect(reviewLocomotionSourceToken(actor, walk.id) === before, `${loadoutId}: source token preserved`).toBe(true);
      if (loadoutId === "longswordTwoHand") {
        const run = actions.find((entry) => entry.semantic === "run")!;
        const backward = await measureReviewLocomotion(actor, run.id, { restore: () => actor.sample(ready.id, 0.2) });
        expect(backward.status).toBe("authored-backward"); expect(backward.cycleDisplacement[2]).toBeLessThan(-2);
        expect(backward.canRepeatAuthoredTravel).toBe(false);
      }
      actor.dispose(); disposables.delete(actor);
    }
  }, 30000);

  it("samples each actual creature rig independently and never invents transport for its in-place gait", async () => {
    vi.stubGlobal("crypto", webcrypto); vi.stubGlobal("document", { baseURI: "http://review.test/weapon-lab.html" });
    vi.stubGlobal("fetch", async (url: string) => new Response(Uint8Array.from(readFileSync(new URL(`../public${new URL(url, "http://review.test").pathname}`, import.meta.url))).buffer));
    const parse = GLTFLoader.prototype.parseAsync;
    vi.spyOn(GLTFLoader.prototype, "parseAsync").mockImplementation(function (this: GLTFLoader, data, path) {
      const decode = async () => new THREE.Texture(); this.register(() => ({ name: "EXT_texture_webp", loadTexture: decode }));
      this.register(() => ({ name: "TEST_IMAGE_DECODE_ONLY", loadTexture: decode })); return parse.call(this, data, path);
    });
    for (const definition of MOB_CATALOG) {
      const actor = await createMobReviewActor({ instanceId: `locomotion-${definition.id}`, definitionId: definition.id }); disposables.add(actor);
      const ready = actor.actions().find((entry) => entry.semantic === "idle")!;
      for (const action of reviewLocomotionActions(actor)) {
        const result = await measureReviewLocomotion(actor, action.id, { restore: () => actor.sample(ready.id, 0) });
        expect(result.status, `${definition.id}/${action.id}: ${result.unavailableReason}`).toBe("in-place");
        expect(result.canRepeatAuthoredTravel).toBe(false); expect(result.supportStatus).toBe("unmeasured");
        expect(result.unavailableReason).toMatch(/weighted foot-support/);
        expect(result.limbs).toHaveLength(definition.family === "breachling" ? 4 : 2);
      }
      expect(actor.snapshot()!.currentClip).toBe(ready.id); actor.dispose(); disposables.delete(actor);
    }
  }, 30000);
});
