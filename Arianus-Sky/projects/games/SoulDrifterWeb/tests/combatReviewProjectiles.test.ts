import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error Existing JS actor factory is exercised with real source assets.
import { createHumanReviewActorFactory } from "../src/review/weapon-lab/human-review-actor.js";
// @ts-expect-error Shared JS catalog; no duplicate emission constants in production.
import { BOW_RELEASE_NAME, BOW_TRIPLE_SHOT_NAME } from "../src/review/weapon-lab/human-review-catalog.js";
import { createMobReviewActor } from "../src/review/weapon-lab/mob-review-actor";
import { MOB_CATALOG } from "../src/review/weapon-lab/mobs-stage";
import { ReviewContactSurface, reviewRenderedVertexIndices, sampleReviewMeshVertices } from "../src/review/weapon-lab/combat-review-contact";
import { reviewContactProfile, reviewContactSourceToken } from "../src/review/weapon-lab/combat-review-contact-profiles";
import { resolveReviewContact } from "../src/review/weapon-lab/combat-review-contact-resolver";
import { createReviewProjectiles, prepareReviewProjectileFlight, reviewProjectileBinding,
  sampleReviewProjectileFlight, FIRE_WAND_RELEASE_PHASES,
  type ReviewProjectiles } from "../src/review/weapon-lab/combat-review-projectiles";
import type { ReviewActorAdapter, ReviewEvent, ReviewProjectileFlight } from "../src/review/weapon-lab/combat-review-types";

const importHost = <T>(name: string): Promise<T> => import(/* @vite-ignore */ name);
const { readFileSync } = await importHost<{ readFileSync(path: URL): Uint8Array }>("node:fs");
const { webcrypto } = await importHost<{ webcrypto: Crypto }>("node:crypto");
const decodeOnly = () => ({ name: "TEST_IMAGE_DECODE_ONLY", loadTexture: async () => new THREE.Texture() });
const factory = createHumanReviewActorFactory({ loader: { loadAsync: async (url: string) => {
  const bytes = Uint8Array.from(readFileSync(new URL(`../public/${url.replace(/^\.\//, "")}`, import.meta.url)));
  const loader = new GLTFLoader(); loader.register(decodeOnly);
  loader.register(() => ({ ...decodeOnly(), name: "EXT_texture_webp" }));
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
} }, textureLoader: { loadAsync: async () => new THREE.Texture() } });
const actors = new Set<ReviewActorAdapter>(), sets = new Set<ReviewProjectiles>();
let serial = 0;
afterEach(() => { for (const set of sets) set.dispose(); sets.clear(); for (const actor of actors) actor.dispose(); actors.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
afterAll(() => factory.dispose());
async function bow(count = 3, actionId = BOW_TRIPLE_SHOT_NAME) {
  const actor = await factory.create({ instanceId: `bow-flight-${++serial}`, loadoutId: "bow" }); actors.add(actor);
  actor.updateSettings({ arrowCount: count });
  actor.root.position.set(2.7, 0.4, -1.2); actor.root.rotation.y = 0.73;
  const binding = reviewProjectileBinding(actor, actionId)!; actor.sample(actionId, binding.releaseSeconds);
  return { actor, actionId, binding };
}
function projectiles(actor: ReviewActorAdapter, actionId: string) {
  const binding = reviewProjectileBinding(actor, actionId)!;
  const set = createReviewProjectiles(actor, actionId, { releaseSeconds: binding.releaseSeconds, endSeconds: binding.endSeconds });
  sets.add(set); return set;
}
const flight = (): ReviewProjectileFlight => ({ id: "one", actorId: "actor", actionId: "shot", visualKind: "arrow",
  releaseSeconds: 0.3, endSeconds: 1, origin: [0, 1, 0], direction: [0, 0, 1], rangeMeters: 6, dropMeters: 0.65, evidence: "explicit test flight" });

describe("fixed review projectile paths and actual emitted visuals", () => {
  it("validates and owns immutable flight inputs, with finite absolute sampling", () => {
    const input = flight(), fixed = prepareReviewProjectileFlight(input);
    expect(Object.isFrozen(fixed)).toBe(true); expect(Object.isFrozen(fixed.origin)).toBe(true);
    expect(fixed.origin).not.toBe(input.origin);
    expect(sampleReviewProjectileFlight(fixed, 1).toArray()).toEqual([0, 0.35, 6]);
    expect(sampleReviewProjectileFlight(fixed, 0).toArray()).toEqual([0, 1, 0]);
    for (const patch of [{ direction: [0, 0, 2] }, { rangeMeters: -1 }, { endSeconds: 0.3 }, { dropMeters: NaN }, { id: "" }]) {
      expect(() => prepareReviewProjectileFlight({ ...input, ...patch } as ReviewProjectileFlight)).toThrow(/Invalid/);
    }
    expect(() => sampleReviewProjectileFlight(fixed, NaN)).toThrow(/finite/);
  });

  it.each([BOW_RELEASE_NAME, BOW_TRIPLE_SHOT_NAME])("reuses %s actual owned arrow meshes and the exact solo path", async (actionId) => {
    for (const count of [1, 2, 3]) {
      const { actor, binding } = await bow(count, actionId), set = projectiles(actor, actionId);
      expect(set.flights).toHaveLength(actionId === BOW_RELEASE_NAME ? 1 : count);
      expect(set.root.children).toHaveLength(0); expect(set.probe.vertexCount).toBeGreaterThan(0);
      const before = actor.projectile.visuals.map((visual: THREE.Object3D) => visual);
      for (const time of [binding.endSeconds, binding.releaseSeconds, binding.releaseSeconds + 0.08, binding.endSeconds - 0.03]) {
        actor.sample(actionId, time);
        const native = before.map((visual: THREE.Object3D) => visual.matrixWorld.clone());
        set.update(time);
        before.forEach((visual: THREE.Object3D, index: number) => expect(Math.max(...visual.matrixWorld.elements
          .map((value, axis) => Math.abs(value - native[index].elements[axis])))).toBeLessThan(1e-10));
        expect(set.probe.sample()).toHaveLength(set.probe.vertexCount);
      }
      expect(actor.projectile.visuals).toEqual(before);
    }
  }, 30_000);

  it("stops only the confirmed arrow, rewinds exactly, and never disposes borrowed geometry", async () => {
    const { actor, actionId, binding } = await bow(), set = projectiles(actor, actionId);
    const contactTime = (binding.releaseSeconds + binding.endSeconds) / 2;
    const impact: ReviewEvent = { id: "measured", kind: "contact", result: "hit", actorId: actor.instanceId,
      timeSeconds: contactTime, projectileId: set.flights[1]!.id, evidence: "test measured geometry" };
    const meshes: THREE.Mesh[] = [];
    actor.projectile.visuals[0].traverse((node: THREE.Object3D) => { if ((node as THREE.Mesh).isMesh) meshes.push(node as THREE.Mesh); });
    const dispose = vi.spyOn(meshes[0]!.geometry, "dispose");
    set.update(binding.endSeconds, [impact]);
    set.flights.forEach((description, index) => {
      const expected = sampleReviewProjectileFlight(description, index === 1 ? contactTime : binding.endSeconds);
      expect(actor.projectile.visuals[index].getWorldPosition(new THREE.Vector3()).distanceTo(expected)).toBeLessThan(1e-10);
    });
    set.update(binding.releaseSeconds, [impact]);
    set.flights.forEach((description, index) => expect(actor.projectile.visuals[index].getWorldPosition(new THREE.Vector3()).toArray())
      .toEqual(expect.arrayContaining(description.origin.map((value) => expect.closeTo(value, 10)))));
    set.update(binding.releaseSeconds - 0.001); expect(set.probe.sample()).toEqual([]);
    set.dispose(); expect(dispose).not.toHaveBeenCalled(); expect(actor.projectile.visuals[0].parent).toBe(actor.root);
  });

  it("keeps zero ammo and raw catalog unavailable, and binds only the three actual fire-wand casts", async () => {
    const { actor, actionId } = await bow(0), set = projectiles(actor, actionId);
    expect(set.flights).toEqual([]); expect(set.probe.unavailableReason).toContain("not a miss");
    expect(reviewProjectileBinding(actor, "ProLongbow__StandingAimRecoil")).toBeNull();
    await actor.setLoadout("bow", { mode: "catalog" }); expect(reviewProjectileBinding(actor, actionId)).toBeNull();
    await actor.setLoadout("rod");
    for (const [castId, phase] of Object.entries(FIRE_WAND_RELEASE_PHASES)) {
      const binding = reviewProjectileBinding(actor, castId)!;
      expect(binding).toMatchObject({ emitter: "wand-fire",
        endSeconds: actor.actions().find((row: { id: string; durationSeconds: number }) => row.id === castId)!.durationSeconds });
      expect(binding.releaseSeconds / binding.endSeconds).toBeCloseTo(phase, 10);
      actor.sample(castId, binding.releaseSeconds);
      const fire = projectiles(actor, castId), emitted = fire.flights[0]!;
      expect(emitted.visualKind).toBe("fire-spell"); expect(emitted.evidence).toContain("no target tracking");
      expect(fire.root.getObjectByName("review-fire-wand-core")).toBeInstanceOf(THREE.Mesh);
      expect(fire.root.getObjectByName("review-fire-wand-aura")).toBeInstanceOf(THREE.Mesh);
      expect(fire.probe.vertexCount).toBeGreaterThan(0);
      const start = new THREE.Vector3().fromArray(emitted.origin), end = sampleReviewProjectileFlight(emitted, binding.endSeconds);
      expect(end.distanceTo(start)).toBeGreaterThan(5.9);
    }
    expect(reviewProjectileBinding(actor, "ProMagic__StandingIdle")).toBeNull();
    await actor.setLoadout("rod", { mode: "catalog" });
    expect(reviewProjectileBinding(actor, "ProMagic__Standing1HCastSpell01")).toBeNull();
  }, 30_000);

  it.each([BOW_RELEASE_NAME, BOW_TRIPLE_SHOT_NAME])("scans real %s without mistaking a rebuilt harness for changed source geometry", async (actionId) => {
    const { actor, binding } = await bow(3, actionId), duration = binding.endSeconds;
    actor.root.position.set(0, 0, 0); actor.root.rotation.y = 0; actor.sample(actionId, 0);
    const token = reviewContactSourceToken(actor);
    const target = await factory.create({ instanceId: `target-${++serial}`, loadoutId: "longswordTwoHand" }); actors.add(target);
    target.root.position.z = 8; target.root.rotation.y = Math.PI;
    const idle = target.actions().find((action: { semantic: string }) => action.semantic === "idle");
    const result = await resolveReviewContact({ attacker: { actor }, target: { actor: target },
      profile: reviewContactProfile(actor, actionId, { projectiles: true }),
      sequence: { id: "real-bow-scan", durationSeconds: duration, actorIds: [actor.instanceId, target.instanceId], events: [], tracks: [
        { id: "shot", actorId: actor.instanceId, actionId, startSeconds: 0, durationSeconds: duration, clipDurationSeconds: duration },
        { id: "ready", actorId: target.instanceId, actionId: idle.id, startSeconds: 0, durationSeconds: duration, clipDurationSeconds: idle.durationSeconds, loop: true },
      ] }, restore: () => { actor.sample(actionId, 0); target.sample(idle.id, 0); },
    });
    expect(result.status).toBe("miss"); expect(result.flights).toHaveLength(actionId === BOW_RELEASE_NAME ? 1 : 3);
    expect(reviewContactSourceToken(actor)).toBe(token);
  }, 30_000);

  it("uses pinned indexed Spit mouth geometry, fixed head aim and the original three-cell plane", async () => {
    const definition = MOB_CATALOG.find((entry) => entry.id === "breachling-base")!;
    const bytes = Uint8Array.from(readFileSync(new URL(`../public${definition.url}`, import.meta.url)));
    vi.stubGlobal("document", { baseURI: "http://test.invalid/weapon-lab.html" }); vi.stubGlobal("crypto", webcrypto);
    vi.stubGlobal("fetch", async () => new Response(bytes));
    const parse = GLTFLoader.prototype.parseAsync;
    vi.spyOn(GLTFLoader.prototype, "parseAsync").mockImplementation(function (this: GLTFLoader, data, path) {
      this.register(decodeOnly); return parse.call(this, data, path);
    });
    const actor = await createMobReviewActor({ instanceId: "spit-source", definitionId: definition.id }); actors.add(actor);
    const binding = reviewProjectileBinding(actor, "SpitAttack")!;
    // the pack registers release and flight end inside its 1.2 s clip; release + the legacy 0.80 s flight would overrun it
    expect(binding.releaseSeconds).toBe(0.45); expect(binding.endSeconds).toBe(1.2);
    expect(binding.endSeconds).toBeLessThanOrEqual(actor.actions().find((entry) => entry.id === "SpitAttack")!.durationSeconds);
    actor.sample("SpitAttack", binding.releaseSeconds);
    const set = projectiles(actor, "SpitAttack"), description = set.flights[0]!;
    expect(set.flights).toHaveLength(1); expect(description.evidence).toContain("review-only");
    // composer-v95 Spit: the fixed head aim at the 0.45 s release frame sits 15 degrees above the horizon
    expect(description.direction).toEqual([expect.closeTo(0, 5), expect.closeTo(Math.sin(15 * Math.PI / 180), 5), expect.closeTo(Math.cos(15 * Math.PI / 180), 5)]);
    expect(actor.root.worldToLocal(sampleReviewProjectileFlight(description, binding.endSeconds)).z).toBeCloseTo(5.25, 7);
    set.update(binding.releaseSeconds); expect(set.probe.sample()).toHaveLength(set.probe.vertexCount);
    const surface = new ReviewContactSurface(actor.model); surface.update();
    const direction = new THREE.Vector3().fromArray(description.direction);
    const emitter = new THREE.Vector3().fromArray(description.origin);
    expect(surface.segment(emitter, emitter.clone().addScaledVector(direction, 0.2))).toBeNull();
    const fluid = set.root.children[0]! as THREE.Mesh;
    for (const point of sampleReviewMeshVertices(fluid, reviewRenderedVertexIndices(fluid))) {
      expect(surface.segment(point, point.clone().addScaledVector(direction, 0.2))).toBeNull();
    }
    surface.dispose();
    const original = sampleReviewProjectileFlight(description, 1).clone();
    actor.sample("SpitAttack", 1.2); set.update(1);
    expect(set.root.children[0]!.getWorldPosition(new THREE.Vector3()).distanceTo(original)).toBeLessThan(1e-10);
    actor.root.position.set(2, 0.3, -1); actor.root.rotation.y = 0.7; actor.sample("SpitAttack", binding.releaseSeconds);
    const rotated = projectiles(actor, "SpitAttack").flights[0]!;
    expect(new THREE.Vector3().fromArray(description.origin).applyMatrix4(actor.root.matrixWorld)
      .distanceTo(new THREE.Vector3().fromArray(rotated.origin))).toBeLessThan(1e-6);
    expect(actor.root.worldToLocal(sampleReviewProjectileFlight(rotated, binding.endSeconds)).z).toBeCloseTo(5.25, 7);
    expect(reviewProjectileBinding({ ...actor, definitionId: "breachling-stalker" }, "SpitAttack")).toBeNull();
  }, 30_000);
});
