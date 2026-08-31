import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveReviewContact } from "../src/review/weapon-lab/combat-review-contact-resolver";
import { createReviewStrikeProbe, reviewContactProfile, validateReviewContactProfile,
  type ReviewContactProfile } from "../src/review/weapon-lab/combat-review-contact-profiles";
import { prepareReviewSequence } from "../src/review/weapon-lab/combat-review-timeline";
import { createMobReviewActor } from "../src/review/weapon-lab/mob-review-actor";
import { MOB_CATALOG } from "../src/review/weapon-lab/mobs-stage";
import type { ReviewAction, ReviewSequence } from "../src/review/weapon-lab/combat-review-types";

const importHost = <T>(name: string): Promise<T> => import(/* @vite-ignore */ name);
const { readFileSync } = await importHost<{ readFileSync(path: URL): Uint8Array }>("node:fs");
const { webcrypto } = await importHost<{ webcrypto: Crypto }>("node:crypto");

function fixture(instanceId: string, movement: (time: number) => number = () => 0) {
  const root = new THREE.Group(), model = new THREE.Group(), bone = new THREE.Bone();
  bone.name = "strike"; root.add(model); model.add(bone);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 0, 1, 0, 0, 0, 99], 3));
  geometry.setIndex([0, 1, 2]);
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(new Uint16Array(16), 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
  mesh.name = "skin"; model.add(mesh); root.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton([bone]));
  const actions: ReviewAction[] = ["strike", "idle", "cast"].map((id) => ({ id, clipName: id, label: id,
    durationSeconds: 1, semantic: id === "strike" ? "attack" : id === "cast" ? "cast" : "idle",
    approvalStatus: "source", rootPolicy: "authored-displacement" }));
  const actor = { instanceId, definitionId: "test-rig", root, model, actions: () => actions,
    sample: vi.fn((_id: string, time: number) => { bone.position.z = movement(time); root.updateMatrixWorld(true); }),
    reset: vi.fn(), dispose: () => { geometry.dispose(); mesh.material.dispose(); } };
  return { actor, mesh, bone };
}
function sequence(attacker: ReturnType<typeof fixture>, target: ReturnType<typeof fixture>): ReviewSequence {
  return prepareReviewSequence({ id: "surface-test", actorIds: [attacker.actor.instanceId, target.actor.instanceId],
    durationSeconds: 1, events: [], tracks: [
      { id: "attack", actorId: attacker.actor.instanceId, actionId: "strike", startSeconds: 0, durationSeconds: 1, clipDurationSeconds: 1 },
      { id: "target", actorId: target.actor.instanceId, actionId: "idle", startSeconds: 0, durationSeconds: 1, clipDurationSeconds: 1 },
    ] });
}
const profile = (): ReviewContactProfile => ({ id: "explicit-strike", actionId: "strike", startSeconds: 0.2,
  endSeconds: 0.8, surface: { kind: "indexed", meshName: "skin", vertices: [2] }, evidence: "Fixture authored active interval" });
function setup(targetMovement?: (time: number) => number) {
  const attacker = fixture("attacker", (time) => time * 2), target = fixture("target", targetMovement);
  target.actor.root.position.z = 1; target.actor.root.updateMatrixWorld(true);
  return { attacker, target, sequence: sequence(attacker, target), profile: profile() };
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("explicit active-window surface resolution", () => {
  it("emits one spatially confirmed event on actual weighted skin and restores the live pose", async () => {
    const input = setup();
    const restore = vi.fn(() => { input.attacker.actor.sample("idle", 0); input.target.actor.sample("idle", 0); });
    const original = Array.from(input.attacker.mesh.geometry.getAttribute("position").array);
    const result = await resolveReviewContact({ ...input, toleranceMeters: 0.001, restore });
    expect(result.status).toBe("contact"); expect(result.sequenceId).toBe(input.sequence.id);
    expect(result.event).toMatchObject({ kind: "contact", result: "hit", actorId: "attacker", targetId: "target" });
    expect(result.event!.timeSeconds).toBeCloseTo(0.5, 5);
    expect(result.event!.position).toEqual([0, 1, 1]); expect(result.event!.evidence).toContain("deformed-triangle:");
    expect(result.event!.evidence).toContain(`probe:${input.attacker.mesh.uuid}:2`);
    expect(restore).toHaveBeenCalled(); expect(input.attacker.bone.position.z).toBe(0);
    expect(Array.from(input.attacker.mesh.geometry.getAttribute("position").array)).toEqual(original);
  });

  it("never treats approach, recovery, idle overlap or an unbound ranged action as an attack hit", async () => {
    const input = setup();
    expect((await resolveReviewContact({ ...input, profile: { ...input.profile, startSeconds: 0.1, endSeconds: 0.2 } })).status).toBe("miss");
    expect((await resolveReviewContact({ ...input, profile: null })).status).toBe("unavailable");
    await expect(resolveReviewContact({ ...input, profile: { ...input.profile, actionId: "idle" } })).rejects.toThrow(/melee/);
    await expect(resolveReviewContact({ ...input, profile: { ...input.profile, actionId: "cast" } })).rejects.toThrow(/melee/);
  });

  it("re-samples both moving actors before accepting a sweep against the end-frame target", async () => {
    // At 30 Hz the striker sweeps across the target's end-frame position, but
    // their real surfaces remain 20 mm apart at every synchronized sample.
    const input = setup((time) => time * 2 - 0.02);
    input.target.actor.root.position.z = 0;
    const result = await resolveReviewContact({ ...input, sampleRate: 30, toleranceMeters: 0.001 });
    expect(result.status).toBe("miss"); expect(result.event).toBeUndefined();
    expect(result.samples).toBeGreaterThan(19); // rejected candidate-time confirmations really ran
  });

  it("labels absent, orphaned, hidden and unsupported surfaces unavailable rather than missed", async () => {
    const input = setup();
    const orphan = { ...input.profile, surface: { kind: "indexed" as const, meshName: "skin", vertices: [3] } };
    expect((await resolveReviewContact({ ...input, profile: orphan })).status).toBe("unavailable");
    input.attacker.mesh.visible = false;
    expect((await resolveReviewContact(input)).status).toBe("unavailable");
    input.attacker.mesh.visible = true; input.target.mesh.visible = false;
    expect((await resolveReviewContact(input)).status).toBe("unavailable");
    const absentBone = createReviewStrikeProbe(input.attacker.actor, { ...input.profile, surface: { kind: "bones", names: ["wrong-rig-bone"] } });
    expect(absentBone.vertexCount).toBe(0);
    expect(createReviewStrikeProbe(input.attacker.actor, { ...input.profile, surface: { kind: "weapon", role: "primary" } }).vertexCount).toBe(0);
    expect(createReviewStrikeProbe(input.attacker.actor, { ...input.profile, surface: { kind: "bones", names: ["strike"] } }).vertexCount).toBe(3);
  });

  it("cancels after a cooperative yield and restores the latest live state", async () => {
    const input = setup(); input.target.actor.root.position.z = 8;
    const abort = new AbortController();
    const restore = vi.fn(() => { input.attacker.actor.sample("idle", 0.12); abort.abort(); });
    await expect(resolveReviewContact({ ...input, signal: abort.signal, restore })).rejects.toMatchObject({ name: "AbortError" });
    expect(restore.mock.calls.length).toBeGreaterThanOrEqual(2); expect(input.attacker.bone.position.z).toBeCloseTo(0.24);
  });

  it("invalidates a scan when source geometry or actor placement changes during a yield", async () => {
    for (const mutate of [
      (input: ReturnType<typeof setup>) => { input.target.mesh.geometry.getAttribute("position").needsUpdate = true; },
      (input: ReturnType<typeof setup>) => { input.target.mesh.geometry.setAttribute("position", input.target.mesh.geometry.getAttribute("position").clone()); },
      (input: ReturnType<typeof setup>) => { input.target.actor.root.position.x += 0.2; },
    ]) {
      const input = setup(); input.target.actor.root.position.z = 8;
      await expect(resolveReviewContact({ ...input, restore: () => mutate(input) })).rejects.toMatchObject({ name: "AbortError" });
    }
  });

  it("owns an immutable sequence snapshot even when a direct caller edits its tracks during a yield", async () => {
    const input = setup(); input.target.actor.root.position.z = 8;
    const mutable = structuredClone(input.sequence);
    const result = await resolveReviewContact({ ...input, sequence: mutable, restore: () => {
      (mutable.tracks[0] as { actionId: string }).actionId = "idle";
    } });
    expect(result.status).toBe("miss");
    expect(input.attacker.actor.sample.mock.calls.every(([actionId]) => actionId === "strike")).toBe(true);
  });

  it("rejects invalid or wrong-source intervals and never scans a partial looping attack", async () => {
    const input = setup();
    for (const patch of [{ startSeconds: NaN }, { endSeconds: 2 }, { startSeconds: 0.9 }, { assetSha256: "wrong" }, { definitionId: "other" }]) {
      expect(() => validateReviewContactProfile(input.attacker.actor, { ...input.profile, ...patch })).toThrow();
    }
    const looping = { ...input.sequence, tracks: input.sequence.tracks.map((track, index) => index ? track : { ...track, loop: true }) };
    expect((await resolveReviewContact({ ...input, sequence: looping })).status).toBe("unavailable");
    const partial = { ...input.sequence, tracks: input.sequence.tracks.map((track, index) => index ? track : { ...track, durationSeconds: 0.5 }) };
    expect((await resolveReviewContact({ ...input, sequence: partial })).status).toBe("unavailable");
    await expect(resolveReviewContact({ ...input, sampleRate: 0 })).rejects.toThrow(/resolution/);
  });
});

it("binds the four frozen base profiles to actual indexed installed GLB skin, without source substitutions", async () => {
  const definition = MOB_CATALOG.find((entry) => entry.id === "breachling-base")!;
  const bytes = Uint8Array.from(readFileSync(new URL(`../public${definition.url}`, import.meta.url)));
  const original = Array.from(new Uint8Array(await webcrypto.subtle.digest("SHA-256", bytes)));
  vi.stubGlobal("document", { baseURI: "http://localhost:5179/weapon-lab.html" }); vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("fetch", async () => new Response(bytes));
  const parse = GLTFLoader.prototype.parseAsync;
  vi.spyOn(GLTFLoader.prototype, "parseAsync").mockImplementation(function (this: GLTFLoader, data, path) {
    this.register(() => ({ name: "TEST_IMAGE_DECODE_ONLY", loadTexture: async () => {
      const texture = new THREE.Texture(); texture.image = { width: 1, height: 1 }; return texture;
    } }));
    return parse.call(this, data, path);
  });
  const actor = await createMobReviewActor({ instanceId: "exact-base-probes", definitionId: definition.id });
  try {
    for (const [id, ids] of Object.entries({ BiteAttack: [22577], ClawAttack: [389], LungeAttack: [14545, 3], TailWhip: [36325] })) {
      const binding = reviewContactProfile(actor, id)!; expect(binding).not.toBeNull();
      expect(binding.surface).toMatchObject({ kind: "indexed", vertices: ids });
      actor.sample(id, binding.startSeconds); const probe = createReviewStrikeProbe(actor, binding);
      expect(probe.vertexCount).toBe(ids.length); const start = probe.sample();
      actor.sample(id, binding.endSeconds); const end = probe.sample();
      expect(end).toHaveLength(ids.length); expect(end.every((point) => point.position.toArray().every(Number.isFinite))).toBe(true);
      expect(end.some((point, index) => point.position.distanceTo(start[index]!.position) > 0.001)).toBe(true);
    }
    for (const id of ["SpitAttack", "Idle", "Run", "Death"]) expect(reviewContactProfile(actor, id)).toBeNull();
    expect(reviewContactProfile({ ...actor, definitionId: "breachling-stalker" }, "BiteAttack")).toBeNull();
    expect(reviewContactProfile({ ...actor, definition: { sha256: "wrong" } } as typeof actor, "BiteAttack")).toBeNull();
    expect(Array.from(new Uint8Array(await webcrypto.subtle.digest("SHA-256", bytes)))).toEqual(original);
  } finally { actor.dispose(); }
}, 30_000);
