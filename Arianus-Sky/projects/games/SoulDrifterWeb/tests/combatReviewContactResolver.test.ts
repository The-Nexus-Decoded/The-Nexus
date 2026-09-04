import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveReviewContact } from "../src/review/weapon-lab/combat-review-contact-resolver";
import { createReviewStrikeProbe, reviewContactProfile, validateReviewContactProfile,
  type ReviewContactProfile } from "../src/review/weapon-lab/combat-review-contact-profiles";
import { prepareReviewSequence } from "../src/review/weapon-lab/combat-review-timeline";
import { createMobReviewActor } from "../src/review/weapon-lab/mob-review-actor";
import { MOB_CATALOG } from "../src/review/weapon-lab/mobs-stage";
import { COMPOSER_MOB_PACKS } from "../src/review/weapon-lab/composer-mob-packs";
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

function rangedSetup(targetMovement?: (time: number) => number) {
  const input = setup(targetMovement), actionId = "GapAuthored__BowReleaseFromNock";
  // Triangle is a deterministic CPU trajectory fixture; actual GLB arrow fidelity
  // and ownership are checked separately in combatReviewProjectiles.test.ts.
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute([-0.01, 0, 0, 0.01, 0, 0, 0, 0.01, 0], 3));
  geometry.setIndex([0, 1, 2]);
  const arrow = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()); input.attacker.actor.root.add(arrow);
  let ammo = true;
  const actor = Object.assign(input.attacker.actor, { definitionId: "human-foundation-pilot",
    snapshot: () => ({ loadoutId: "bow", mode: "equipment", actionId }),
    projectile: { visuals: [arrow], captured: false, startPosition: new THREE.Vector3(), direction: new THREE.Vector3(0, 0, 1) },
  });
  actor.actions = () => [{ id: actionId, clipName: actionId, label: "Bow release", durationSeconds: 1,
    semantic: "interaction", approvalStatus: "draft", rootPolicy: "authored-displacement" }];
  actor.sample.mockImplementation((_id, time) => { actor.projectile.captured = time >= 0.3 && ammo;
    arrow.visible = actor.projectile.captured; actor.root.updateMatrixWorld(true); });
  input.target.actor.root.position.z = 3;
  return { ...input, attacker: { ...input.attacker, actor }, arrow, setAmmo: (value: boolean) => { ammo = value; },
    sequence: { ...input.sequence, tracks: input.sequence.tracks.map((track, index) => index === 0 ? { ...track, actionId } : track) },
    profile: reviewContactProfile(actor, actionId, { projectiles: true })!,
  };
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
    expect(result.event!.surfaceAnchor).toMatchObject({ meshId: input.target.mesh.uuid, geometryId: input.target.mesh.geometry.uuid,
      triangleOffset: 0, vertexIndices: [0, 1, 2], barycentric: [0, 0, 1], worldTriangle: [[-1, -1, 1], [1, -1, 1], [0, 1, 1]] });
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

  it("captures the moving target's confirmed triangle before restoring a later live pose", async () => {
    const input = setup((time) => time * 0.5);
    const result = await resolveReviewContact({ ...input, toleranceMeters: 0.001,
      restore: () => input.target.actor.sample("idle", 0.9) });
    expect(result.status).toBe("contact");
    // This is the existing sampled 1 mm proximity contract, not analytical CCD.
    expect(Math.abs(1.5 * result.event!.timeSeconds - 1)).toBeLessThanOrEqual(0.001);
    const anchor = result.event!.surfaceAnchor!, confirmedZ = 1 + result.event!.timeSeconds * 0.5;
    expect(anchor.worldTriangle[0][2]).toBeCloseTo(confirmedZ, 6);
    expect(input.target.bone.position.z).toBeCloseTo(0.45);
    expect(Object.isFrozen(anchor.worldTriangle[0])).toBe(true);
    const prepared = prepareReviewSequence({ ...input.sequence, events: [result.event!] });
    expect(prepared.events[0]!.surfaceAnchor).toEqual(anchor);
    expect(Object.isFrozen(prepared.events[0]!.surfaceAnchor!.vertexIndices)).toBe(true);
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

describe("shared melee/ranged sampling loop", () => {
  it("measures emitted geometry and returns one identified hit plus an unmeasured release event", async () => {
    const input = rangedSetup(), original = Array.from(input.arrow.geometry.getAttribute("position").array);
    const result = await resolveReviewContact({ ...input, toleranceMeters: 0.001 });
    expect(result.status).toBe("contact"); expect(result.event!.timeSeconds).toBeCloseTo(0.65, 5);
    expect(result.flights).toHaveLength(1);
    expect(result.event).toMatchObject({ projectileId: result.flights![0]!.id, damageType: "physical" });
    expect(result.event!.surfaceAnchor).toMatchObject({ meshId: input.target.mesh.uuid, geometryId: input.target.mesh.geometry.uuid,
      triangleOffset: 0, vertexIndices: [0, 1, 2] });
    expect(result.releaseEvents).toMatchObject([{ kind: "release", result: "unmeasured", timeSeconds: 0.3,
      projectileId: result.event!.projectileId }]);
    expect(Array.from(input.arrow.geometry.getAttribute("position").array)).toEqual(original);
    expect(input.arrow.parent).toBe(input.attacker.actor.root);
    expect(reviewContactProfile(input.attacker.actor, input.profile.actionId)).toBeNull(); // activation remains explicit
  });

  it("uses the actual moving target at confirmation time, without homing or a release-time hit", async () => {
    const input = rangedSetup((time) => (time - 0.3) / 0.7 * 6 - 0.02);
    input.target.actor.root.position.z = 0;
    const result = await resolveReviewContact({ ...input, sampleRate: 30, toleranceMeters: 0.001 });
    expect(result.status).toBe("miss"); expect(result.event).toBeUndefined();
    expect(result.flights![0]!.direction).toEqual([0, 0, 1]); expect(result.releaseEvents).toHaveLength(1);
    expect(result.samples).toBeGreaterThan(22);
  });

  it("distinguishes empty emission from a miss and invalidates replaced arrow geometry or inventory", async () => {
    const empty = rangedSetup(); empty.setAmmo(false);
    expect((await resolveReviewContact(empty)).status).toBe("unavailable");
    for (const mutate of [
      (input: ReturnType<typeof rangedSetup>) => input.arrow.geometry.setAttribute("position", input.arrow.geometry.getAttribute("position").clone()),
      (input: ReturnType<typeof rangedSetup>) => input.setAmmo(false),
    ]) {
      const input = rangedSetup(); input.target.actor.root.position.z = 8;
      const restore = vi.fn(() => mutate(input));
      await expect(resolveReviewContact({ ...input, restore })).rejects.toMatchObject({ name: "AbortError" });
      expect(restore).toHaveBeenCalled();
    }
  });

  it("requires the exact bound release interval and preserves rate-adjusted event time", async () => {
    const input = rangedSetup();
    expect(() => validateReviewContactProfile(input.attacker.actor, { ...input.profile, startSeconds: 0.1 })).toThrow(/source-bound/);
    const fast = { ...input.sequence, tracks: input.sequence.tracks.map((track, index) => index === 0
      ? { ...track, durationSeconds: 0.5, rate: 2 } : track) };
    const result = await resolveReviewContact({ ...input, sequence: fast, toleranceMeters: 0.001 });
    expect(result.status).toBe("contact"); expect(result.event!.timeSeconds).toBeCloseTo(0.325, 5);
    expect(result.releaseEvents![0]!.timeSeconds).toBe(0.15);
  });
});

it("binds the registered base composer strike profiles to actual indexed installed GLB skin, without source substitutions", async () => {
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
    // strike tips come from the registered composer pack (reach-solved contact frames)
    const strikes = Object.fromEntries(Object.entries(COMPOSER_MOB_PACKS.base!.strikes).map(([id, strike]) => [id, [...strike.vertices]]));
    expect(Object.keys(strikes).sort()).toEqual(["BiteAttack", "ClawAttack", "LungeAttack", "TailWhip"]);
    for (const [id, ids] of Object.entries(strikes)) {
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

it("binds the registered Oathbound Lunge, Claw and Bite profiles to their actual installed indexed tips", async () => {
  const definition = MOB_CATALOG.find((entry) => entry.id === "breachling-oathbound")!;
  const bytes = Uint8Array.from(readFileSync(new URL(`../public${definition.url}`, import.meta.url)));
  vi.stubGlobal("document", { baseURI: "http://localhost:5179/weapon-lab.html" }); vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("fetch", async () => new Response(bytes));
  const parse = GLTFLoader.prototype.parseAsync;
  vi.spyOn(GLTFLoader.prototype, "parseAsync").mockImplementation(function (this: GLTFLoader, data, path) {
    this.register(() => ({ name: "TEST_IMAGE_DECODE_ONLY", loadTexture: async () => {
      const texture = new THREE.Texture(); texture.image = { width: 1, height: 1 }; return texture;
    } }));
    return parse.call(this, data, path);
  });
  const actor = await createMobReviewActor({ instanceId: "exact-oathbound-strike-probes", definitionId: definition.id });
  try {
    // the registered composer pack (reach-solved windows) or the frozen legacy intake
    const pack = COMPOSER_MOB_PACKS.oathbound;
    const expected = (action: string, legacy: { id: string; startSeconds: number; endSeconds: number; vertices: number[] }) => pack
      ? { id: `${pack.strikes[action]!.revision}:${action}`, startSeconds: pack.strikes[action]!.start, endSeconds: pack.strikes[action]!.end,
        definitionId: "breachling-oathbound", assetSha256: definition.sha256,
        surface: { kind: "indexed", meshName: "Breachling_Mesh", vertices: [...pack.strikes[action]!.vertices] } }
      : { ...legacy, definitionId: "breachling-oathbound", assetSha256: definition.sha256,
        surface: { kind: "indexed", meshName: "Breachling_Mesh", vertices: legacy.vertices } };
    const lunge = reviewContactProfile(actor, "LungeAttack")!;
    expect(lunge).toMatchObject(expected("LungeAttack", { id: "oathbound-lunge-v1:LungeAttack", startSeconds: 0.52, endSeconds: 0.66, vertices: [12002, 1] }));
    const claw = reviewContactProfile(actor, "ClawAttack")!;
    expect(claw).toMatchObject(expected("ClawAttack", { id: "oathbound-claw-v7:ClawAttack", startSeconds: 2.30, endSeconds: 2.67, vertices: [1] }));
    const bite = reviewContactProfile(actor, "BiteAttack")!;
    expect(bite).toMatchObject(expected("BiteAttack", { id: "oathbound-bite-v1:BiteAttack", startSeconds: 3.05, endSeconds: 3.36, vertices: [17599] }));
    for (const binding of [lunge, claw, bite]) {
      actor.sample(binding.actionId, binding.startSeconds); const probe = createReviewStrikeProbe(actor, binding), start = probe.sample();
      actor.sample(binding.actionId, binding.endSeconds); const end = probe.sample();
      expect(probe.vertexCount).toBe(binding.surface.kind === "indexed" ? binding.surface.vertices.length : 0);
      expect(end).toHaveLength(probe.vertexCount);
      expect(end.every((point, index) => point.position.distanceTo(start[index]!.position) > 0.001)).toBe(true);
    }
    // the ranged spit is never a melee strike; the composer pack adds a reach-solved tail whip
    expect(reviewContactProfile(actor, "SpitAttack")).toBeNull();
    if (pack) expect(reviewContactProfile(actor, "TailWhip")!.surface.kind).toBe("indexed"); else expect(reviewContactProfile(actor, "TailWhip")).toBeNull();
    expect(reviewContactProfile({ ...actor, definition: { sha256: "wrong" } } as typeof actor, "LungeAttack")).toBeNull();
  } finally { actor.dispose(); }
}, 30_000);
