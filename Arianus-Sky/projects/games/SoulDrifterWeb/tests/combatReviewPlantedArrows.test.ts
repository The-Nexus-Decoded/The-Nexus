import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error Existing JS actor factory is exercised with real source assets.
import { createHumanReviewActorFactory } from "../src/review/weapon-lab/human-review-actor.js";
// @ts-expect-error Shared JS catalog; no duplicate emission constants in production.
import { BOW_RELEASE_NAME } from "../src/review/weapon-lab/human-review-catalog.js";
import { createMobReviewActor } from "../src/review/weapon-lab/mob-review-actor";
import { createReviewProjectiles, reviewProjectileBinding,
  sampleReviewProjectileFlight } from "../src/review/weapon-lab/combat-review-projectiles";
import { MOB_CATALOG } from "../src/review/weapon-lab/mobs-stage";
import { ReviewContactSurface } from "../src/review/weapon-lab/combat-review-contact";
import {
  createReviewPlantedArrows, measureReviewArrow, reviewArrowPenetrationMeters,
  reviewPlantedArrowDwellSeconds, reviewPlantedArrowsFor, reviewStruckBone,
  REVIEW_PLANTED_ARROW_CAP, REVIEW_PLANTED_ARROW_FADE_FRACTION, REVIEW_PLANTED_ARROW_MAX_DWELL_SECONDS,
  type ReviewPlantedArrows,
} from "../src/review/weapon-lab/combat-review-planted-arrows";
import type { ReviewAction, ReviewActorAdapter, ReviewEvent } from "../src/review/weapon-lab/combat-review-types";

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

const quivers = new Set<ReviewPlantedArrows>();
const actors = new Set<ReviewActorAdapter>();
afterEach(() => {
  for (const quiver of quivers) quiver.dispose();
  quivers.clear();
  for (const actor of actors) actor.dispose();
  actors.clear();
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
afterAll(() => factory.dispose());

/**
 * A shaft and a broadhead on the shipped +Y flight axis, with exact numbers:
 * 0.94 m tip to nock, 0.02 m widest radius, so the derived burial depth is one
 * arrow width — 0.04 m — and the midpoint clamp is 0.47 m.
 */
function arrowVisual(name: string): THREE.Group {
  const group = new THREE.Group(); group.name = name;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.86, 8),
    new THREE.MeshStandardMaterial({ color: 0x8b6b3f }));
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 8),
    new THREE.MeshStandardMaterial({ color: 0xb9c0c6 }));
  head.position.y = 0.47;
  group.add(shaft, head);
  return group;
}

interface Fixture {
  actor: ReviewActorAdapter;
  bone: THREE.Bone;
  mesh: THREE.Mesh;
  event: ReviewEvent;
  contact: { point: THREE.Vector3; normal: THREE.Vector3 };
}

/** One weighted triangle on one named bone, plus whatever rig damage a case needs. */
function fixture(options: {
  skinned?: boolean; boneCount?: number; reactions?: readonly number[];
} = {}): Fixture {
  const { skinned = true, boneCount = 1, reactions = [] } = options;
  const root = new THREE.Group(), model = new THREE.Group();
  root.add(model);
  const bones = Array.from({ length: boneCount }, (_, index) => {
    const bone = new THREE.Bone(); bone.name = `fixture-spine-${index}`; model.add(bone); return bone;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 0, 1, 0], 3));
  geometry.setIndex([0, 1, 2]);
  if (skinned) {
    geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(new Uint16Array(12), 4));
    geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
  }
  const mesh: THREE.Mesh = skinned
    ? new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial())
    : new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  mesh.name = "weighted-target"; model.add(mesh); root.updateMatrixWorld(true);
  if (skinned && bones.length) (mesh as unknown as THREE.SkinnedMesh).bind(new THREE.Skeleton(bones));
  const actions: ReviewAction[] = [{ id: "idle", clipName: "idle", label: "Idle", durationSeconds: 1,
    semantic: "idle", approvalStatus: "source", rootPolicy: "in-place" },
    ...reactions.map((durationSeconds, index): ReviewAction => ({ id: `react-${index}`, clipName: `react-${index}`,
      label: `React ${index}`, durationSeconds, semantic: "reaction", approvalStatus: "source", rootPolicy: "in-place" }))];
  const actor: ReviewActorAdapter = { instanceId: "target", definitionId: "fixture", root, model,
    actions: () => actions,
    sample: (_id, time) => { for (const bone of bones) { bone.position.z = time; bone.rotation.y = time * 0.3; } root.updateMatrixWorld(true); },
    reset: () => {}, dispose: () => {},
  };
  const surface = new ReviewContactSurface(model); surface.update();
  const contact = surface.closest(new THREE.Vector3(0, 0, 0.01), 0.02)!; surface.dispose();
  const event: ReviewEvent = { id: "measured", actorId: "attacker", targetId: actor.instanceId,
    projectileId: "arrow-1", kind: "contact", result: "hit", timeSeconds: 0.5,
    position: contact.point.toArray(), normal: contact.normal.toArray(), surfaceAnchor: contact.surfaceAnchor,
    evidence: contact.evidence };
  return { actor, bone: bones[0]!, mesh, event, contact };
}

const FLIGHT_SECONDS = 0.8;
const DIRECTION = new THREE.Vector3(0, 0, -1);
const FLIGHT_QUATERNION = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), DIRECTION);

function plant(quiver: ReviewPlantedArrows, value: Fixture, id: string, visual = arrowVisual(id)) {
  return quiver.plant({ id, visual, event: { ...value.event, projectileId: id },
    contactPosition: value.contact.point.clone(), flightQuaternion: FLIGHT_QUATERNION.clone(),
    flightDirection: DIRECTION.clone(), flightSeconds: FLIGHT_SECONDS });
}

function own(quiver: ReviewPlantedArrows): ReviewPlantedArrows { quivers.add(quiver); return quiver; }

describe("Arrows planted in the body they struck", () => {
  it("derives the burial depth from the arrow's own geometry and the measured normal", () => {
    const metrics = measureReviewArrow(arrowVisual("measure"));
    expect(metrics.lengthMeters).toBeCloseTo(0.94, 6);
    expect(metrics.maxRadiusMeters).toBeCloseTo(0.02, 6);
    expect(metrics.headBuryMeters).toBeCloseTo(0.04, 6);
    expect(metrics.maxTravelMeters).toBeCloseTo(0.47, 6);
    expect(metrics.evidence).toContain("0.9400 m long");
    // Square on: exactly one arrow width of travel buries the head.
    const normal = new THREE.Vector3(0, 0, 1);
    expect(reviewArrowPenetrationMeters(metrics, DIRECTION, normal)).toBeCloseTo(0.04, 7);
    // Oblique: the same perpendicular depth costs 1/cos more travel along the shaft.
    for (const degrees of [30, 60, 75]) {
      const radians = THREE.MathUtils.degToRad(degrees);
      const oblique = new THREE.Vector3(Math.sin(radians), 0, -Math.cos(radians));
      const travel = reviewArrowPenetrationMeters(metrics, oblique, normal);
      expect(travel).toBeCloseTo(0.04 / Math.cos(radians), 7);
      expect(travel * Math.cos(radians)).toBeCloseTo(metrics.headBuryMeters, 10);
    }
    // Grazing: the travel stops at the arrow's own midpoint rather than running away.
    const grazing = new THREE.Vector3(0.999, 0, -Math.sqrt(1 - 0.999 * 0.999));
    expect(reviewArrowPenetrationMeters(metrics, grazing, normal)).toBeCloseTo(metrics.maxTravelMeters, 10);
    expect(reviewArrowPenetrationMeters(metrics, new THREE.Vector3(), normal)).toBe(metrics.maxTravelMeters);
    // A scaled-up prop plants proportionally deeper. Nothing is a fixed constant.
    const doubled = arrowVisual("doubled"); doubled.scale.setScalar(2); doubled.updateMatrixWorld(true);
    expect(measureReviewArrow(doubled).headBuryMeters).toBeCloseTo(0.08, 6);
  });

  it("plants on the struck bone, sunk along the flight line, and rides that bone", () => {
    const value = fixture();
    const quiver = own(createReviewPlantedArrows(value.actor));
    const visual = arrowVisual("arrow-1");
    const scene = new THREE.Group(); scene.add(visual); scene.updateMatrixWorld(true);
    const handle = plant(quiver, value, "arrow-1", visual);
    expect(handle.boneDegraded).toBe(false);
    expect(handle.boneName).toBe("fixture-spine-0");
    expect(handle.penetrationMeters).toBeCloseTo(0.04, 7);

    quiver.update(value.event.timeSeconds);
    expect(handle.state(value.event.timeSeconds)).toBe("planted");
    expect(visual.parent).toBe(value.bone);
    // Tip buried, nock out: the arrow origin sits one arrow width past the
    // measured contact point, down the direction it was travelling.
    const world = visual.getWorldPosition(new THREE.Vector3());
    expect(world.distanceTo(value.contact.point.clone().addScaledVector(DIRECTION, 0.04))).toBeLessThan(1e-9);
    expect(visual.getWorldQuaternion(new THREE.Quaternion()).angleTo(FLIGHT_QUATERNION)).toBeLessThan(1e-6);
    expect(visual.getWorldScale(new THREE.Vector3()).distanceTo(new THREE.Vector3(1, 1, 1))).toBeLessThan(1e-9);

    // Ride it: move the bone the rig actually drives and resample.
    value.actor.sample("idle", 0.9);
    const boneBefore = value.bone.getWorldPosition(new THREE.Vector3());
    quiver.update(value.event.timeSeconds + 0.1);
    const moved = visual.getWorldPosition(new THREE.Vector3());
    expect(moved.distanceTo(world)).toBeGreaterThan(0.5);
    expect(visual.parent).toBe(value.bone);
    // Still exactly one arrow width behind the deformed surface point. The
    // planted arrow now hangs off the rig, so measure the skin, not the arrow.
    const surface = new ReviewContactSurface(value.actor.model,
      (mesh) => (mesh as THREE.SkinnedMesh).isSkinnedMesh); surface.update();
    const current = surface.closest(moved, 1)!; surface.dispose();
    expect(moved.distanceTo(current.point)).toBeCloseTo(0.04, 6);
    expect(boneBefore.distanceTo(value.bone.getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-9);

    // Scrubbing back before the contact hands the arrow to its owner untouched.
    quiver.update(value.event.timeSeconds - 0.01);
    expect(handle.state(value.event.timeSeconds - 0.01)).toBe("pending");
    expect(visual.parent).toBe(scene);
  });

  it("caps the body at one volley and retires the oldest plant first", () => {
    const value = fixture();
    const quiver = own(createReviewPlantedArrows(value.actor));
    expect(quiver.cap).toBe(REVIEW_PLANTED_ARROW_CAP);
    const owners = Array.from({ length: REVIEW_PLANTED_ARROW_CAP + 2 }, () => new THREE.Group());
    const visuals = owners.map((owner, index) => {
      const visual = arrowVisual(`rapid-${index}`); owner.add(visual); owner.updateMatrixWorld(true); return visual;
    });
    const handles = visuals.map((visual, index) => plant(quiver, value, `rapid-${index}`, visual));
    expect(quiver.arrows).toHaveLength(REVIEW_PLANTED_ARROW_CAP);
    expect(quiver.arrows.map((arrow) => arrow.id)).toEqual(["rapid-2", "rapid-3", "rapid-4"]);
    expect(handles.slice(0, 2).map((handle) => handle.state(value.event.timeSeconds))).toEqual(["retired", "retired"]);
    // The retired arrows went home: original parent, original transform, no leak.
    visuals.slice(0, 2).forEach((visual, index) => {
      expect(visual.parent).toBe(owners[index]);
      expect(visual.position.lengthSq()).toBe(0);
    });
    quiver.update(value.event.timeSeconds);
    visuals.slice(2).forEach((visual) => expect(visual.parent).toBe(value.bone));
    visuals.slice(0, 2).forEach((visual) => expect(visual.parent).not.toBe(value.bone));

    // Re-planting an arrow that is already in this body replaces its own plant
    // rather than stacking, and it still remembers who lent it.
    const again = plant(quiver, value, "rapid-4", visuals[4]!);
    expect(quiver.arrows).toHaveLength(REVIEW_PLANTED_ARROW_CAP);
    expect(quiver.arrows.map((arrow) => arrow.id)).toEqual(["rapid-2", "rapid-3", "rapid-4"]);
    expect(handles[4]!.state(value.event.timeSeconds)).toBe("retired");
    quiver.retire(again);
    expect(visuals[4]!.parent).toBe(owners[4]);
    expect(visuals[4]!.position.lengthSq()).toBe(0);
  });

  it("holds for a measured dwell, fades out and then is gone", () => {
    const value = fixture({ reactions: [1.4, 2.2] });
    // The rig's quickest hit reaction, floored at the flight it just made.
    expect(reviewPlantedArrowDwellSeconds(value.actor, FLIGHT_SECONDS)).toBeCloseTo(1.4, 10);
    expect(reviewPlantedArrowDwellSeconds(value.actor, 2)).toBeCloseTo(2, 10);
    expect(reviewPlantedArrowDwellSeconds(value.actor, 9)).toBe(REVIEW_PLANTED_ARROW_MAX_DWELL_SECONDS);
    expect(reviewPlantedArrowDwellSeconds(fixture().actor, FLIGHT_SECONDS)).toBeCloseTo(FLIGHT_SECONDS, 10);
    expect(() => reviewPlantedArrowDwellSeconds(value.actor, 0)).toThrow(/real flight window/);

    const quiver = own(createReviewPlantedArrows(value.actor));
    const visual = arrowVisual("dwell");
    const handle = plant(quiver, value, "dwell", visual);
    expect(handle.dwellSeconds).toBeCloseTo(1.4, 10);
    expect(handle.fadeSeconds).toBeCloseTo(1.4 * REVIEW_PLANTED_ARROW_FADE_FRACTION, 10);
    const start = handle.plantedAtSeconds;
    const opacity = () => ((visual.children[0] as THREE.Mesh).material as THREE.Material).opacity;

    quiver.update(start + 0.2);
    expect(handle.state(start + 0.2)).toBe("planted");
    expect(visual.visible).toBe(true); expect(opacity()).toBeCloseTo(1, 10);

    quiver.update(start + handle.dwellSeconds + handle.fadeSeconds / 2);
    expect(handle.state(start + handle.dwellSeconds + handle.fadeSeconds / 2)).toBe("fading");
    expect(visual.visible).toBe(true); expect(opacity()).toBeCloseTo(0.5, 6);

    const gone = start + handle.dwellSeconds + handle.fadeSeconds + 1e-6;
    quiver.update(gone);
    expect(handle.state(gone)).toBe("expired");
    expect(visual.visible).toBe(false);
    // Scrubbing back inside the dwell brings it back rather than losing it.
    quiver.update(start + 0.2);
    expect(visual.visible).toBe(true);
  });

  it("hands everything back on disposal and disposes only what it made", () => {
    const value = fixture();
    const quiver = createReviewPlantedArrows(value.actor);
    const visual = arrowVisual("disposal");
    const owner = new THREE.Group(); owner.add(visual);
    visual.position.set(0.3, 1.2, -0.4); visual.scale.setScalar(1); visual.visible = true;
    owner.updateMatrixWorld(true);
    const meshes = visual.children as THREE.Mesh[];
    const original = meshes.map((mesh) => mesh.material as THREE.Material);
    const originalDispose = original.map((material) => vi.spyOn(material, "dispose"));
    const handle = plant(quiver, value, "disposal", visual);
    const clones = meshes.map((mesh) => mesh.material as THREE.Material);
    clones.forEach((clone, index) => expect(clone).not.toBe(original[index]));
    clones.forEach((clone) => expect(clone.transparent).toBe(true));
    const cloneDispose = clones.map((clone) => vi.spyOn(clone, "dispose"));
    quiver.update(handle.plantedAtSeconds);
    expect(visual.parent).toBe(value.bone);

    quiver.dispose();
    expect(handle.state(handle.plantedAtSeconds)).toBe("retired");
    expect(visual.parent).toBe(owner);
    expect(visual.position.toArray()).toEqual([0.3, 1.2, -0.4]);
    expect(visual.visible).toBe(true);
    meshes.forEach((mesh, index) => expect(mesh.material).toBe(original[index]));
    cloneDispose.forEach((spy) => expect(spy).toHaveBeenCalled());
    originalDispose.forEach((spy) => expect(spy).not.toHaveBeenCalled());
    quiver.dispose();
    expect(() => quiver.update(1)).toThrow(/disposed/);
    // The per-target registry does not hand back a disposed quiver.
    const fresh = own(reviewPlantedArrowsFor(value.actor));
    expect(fresh).not.toBe(quiver);
    expect(reviewPlantedArrowsFor(value.actor)).toBe(fresh);
  });

  it("degrades to the model root when the rig cannot name the struck bone", () => {
    // The reachable live case: a body part with no rig weights on it at all.
    const unskinned = fixture({ skinned: false });
    const struck = reviewStruckBone(unskinned.actor, unskinned.event.surfaceAnchor!);
    expect(struck.degraded).toBe(true);
    expect(struck.object).toBe(unskinned.actor.model);
    expect(struck.boneName).toBeNull();
    const quiver = own(createReviewPlantedArrows(unskinned.actor));
    const visual = arrowVisual("degraded");
    const handle = plant(quiver, unskinned, "degraded", visual);
    expect(handle.boneDegraded).toBe(true);
    expect(handle.boneName).toBeNull();
    expect(() => quiver.update(handle.plantedAtSeconds)).not.toThrow();
    expect(visual.parent).toBe(unskinned.actor.model);
    expect(visual.getWorldPosition(new THREE.Vector3())
      .distanceTo(unskinned.contact.point.clone().addScaledVector(DIRECTION, 0.04))).toBeLessThan(1e-9);

    // Rigs that answer with a bone this skeleton does not have, one way each.
    for (const [label, damage] of [
      ["skeleton emptied out", (value: Fixture) => { (value.mesh as unknown as THREE.SkinnedMesh).skeleton.bones = []; }],
      ["weight points past the last bone", (value: Fixture) => {
        value.mesh.geometry.setAttribute("skinIndex",
          new THREE.Uint16BufferAttribute(new Uint16Array([7, 0, 0, 0, 7, 0, 0, 0, 7, 0, 0, 0]), 4));
      }],
      ["all weights zero", (value: Fixture) => {
        value.mesh.geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(new Float32Array(12), 4));
      }],
      ["struck mesh gone from the model", (value: Fixture) => { value.mesh.removeFromParent(); }],
    ] as const) {
      const value = fixture();
      damage(value);
      const degraded = reviewStruckBone(value.actor, value.event.surfaceAnchor!);
      expect(degraded.degraded, label).toBe(true);
      expect(degraded.object, label).toBe(value.actor.model);
      expect(degraded.boneName, label).toBeNull();
      expect(degraded.evidence, label).toContain("model root");
    }
  });

  it("plants the real emitted arrow through the shipped projectile path", async () => {
    const archer = await factory.create({ instanceId: "planted-archer", loadoutId: "bow" });
    actors.add(archer);
    archer.updateSettings({ arrowCount: 1 });
    archer.root.position.set(0, 0, 0); archer.root.rotation.y = 0;
    const victim = await factory.create({ instanceId: "planted-victim", loadoutId: "longswordTwoHand" });
    actors.add(victim);
    victim.root.position.set(0, 0, 2.6); victim.root.rotation.y = Math.PI;
    const idle = victim.actions().find((action: ReviewAction) => action.semantic === "idle")!;
    victim.sample(idle.id, 0);
    const binding = reviewProjectileBinding(archer, BOW_RELEASE_NAME)!;
    archer.sample(BOW_RELEASE_NAME, binding.releaseSeconds);
    const scout = createReviewProjectiles(archer, BOW_RELEASE_NAME, binding);
    const flight = scout.flights[0]!;
    scout.dispose();

    // Find where this fixed flight actually crosses the posed victim's skin, the
    // same swept crossing the contact resolver confirms.
    const surface = new ReviewContactSurface(victim.model, (mesh) => (mesh as THREE.SkinnedMesh).isSkinnedMesh);
    surface.update();
    const span = flight.endSeconds - flight.releaseSeconds;
    let hit: { time: number; contact: ReturnType<ReviewContactSurface["segment"]> } | null = null;
    let previous = sampleReviewProjectileFlight(flight, flight.releaseSeconds).clone();
    for (let step = 1; step <= 240 && !hit; step += 1) {
      const time = flight.releaseSeconds + span * (step / 240);
      const point = sampleReviewProjectileFlight(flight, time).clone();
      const contact = surface.segment(previous, point);
      if (contact?.surfaceAnchor) hit = { time, contact };
      previous = point;
    }
    surface.dispose();
    expect(hit).toBeTruthy();
    const measured: ReviewEvent = { id: "measured-contact", kind: "contact", result: "hit",
      actorId: archer.instanceId, targetId: victim.instanceId, projectileId: flight.id,
      timeSeconds: hit!.time, position: hit!.contact!.point.toArray(), normal: hit!.contact!.normal.toArray(),
      surfaceAnchor: hit!.contact!.surfaceAnchor, evidence: hit!.contact!.evidence };

    archer.sample(BOW_RELEASE_NAME, binding.releaseSeconds);
    const set = createReviewProjectiles(archer, BOW_RELEASE_NAME, binding,
      { target: victim, impacts: [measured] });
    const visual = archer.projectile.visuals[0] as THREE.Object3D;
    const homeParent = visual.parent!;
    try {
      const quiver = own(reviewPlantedArrowsFor(victim));
      expect(quiver.arrows).toHaveLength(1);
      const handle = quiver.arrows[0]!;
      expect(handle.boneDegraded).toBe(false);
      // The shipped 0.94 m arrow prop, measured through the shipped emitter.
      expect(handle.metrics.lengthMeters).toBeCloseTo(0.94, 3);
      expect(handle.penetrationMeters).toBeGreaterThanOrEqual(handle.metrics.headBuryMeters - 1e-9);
      expect(handle.penetrationMeters).toBeLessThanOrEqual(handle.metrics.maxTravelMeters + 1e-9);
      expect(handle.dwellSeconds).toBeCloseTo(reviewPlantedArrowDwellSeconds(victim, span), 10);

      // Before the contact the arrow is still the archer's, in flight.
      set.update(flight.releaseSeconds + (hit!.time - flight.releaseSeconds) / 2);
      expect(visual.parent).toBe(homeParent);
      // At the contact it is in the victim, on one of the victim's own bones.
      set.update(hit!.time);
      const bone = visual.parent!;
      expect(bone.name).toBe(handle.boneName);
      let inVictim = false;
      for (let node: THREE.Object3D | null = bone; node; node = node.parent) if (node === victim.root) inVictim = true;
      expect(inVictim).toBe(true);
      expect(visual.visible).toBe(true);
      // Sunk down its own flight line by exactly the derived depth, past the
      // point on the skin the sweep confirmed it crossed.
      const struck = new THREE.Vector3().fromArray([...measured.position!]);
      const direction = new THREE.Vector3().fromArray([...flight.direction]);
      const sunk = sampleReviewProjectileFlight(flight, hit!.time).addScaledVector(direction, handle.penetrationMeters);
      const planted = visual.getWorldPosition(new THREE.Vector3());
      expect(planted.distanceTo(sunk)).toBeLessThan(1e-6);
      expect(planted.clone().sub(struck).dot(direction)).toBeGreaterThan(handle.penetrationMeters);
      // A second later it is still on that bone and still past the skin.
      victim.sample(idle.id, 1);
      set.update(hit!.time + Math.min(1, handle.dwellSeconds * 0.9));
      expect(visual.parent).toBe(bone);
      expect(visual.visible).toBe(true);
      // Past the dwell and the fade it is gone.
      set.update(hit!.time + handle.dwellSeconds + handle.fadeSeconds + 1e-3);
      expect(visual.visible).toBe(false);
    } finally { set.dispose(); }
    expect(visual.parent).toBe(homeParent);
  }, 40_000);

  it.each(["breachling-base", "breachling-ravager-4v", "warden-wayfarer", "warden-oathbreaker"])(
    "plants in the real %s rig on a bone that rig actually owns", async (definitionId) => {
      const definition = MOB_CATALOG.find((entry) => entry.id === definitionId)!;
      expect(definition).toBeTruthy();
      const bytes = Uint8Array.from(readFileSync(new URL(`../public${definition.url}`, import.meta.url)));
      vi.stubGlobal("document", { baseURI: "http://test.invalid/weapon-lab.html" });
      vi.stubGlobal("crypto", webcrypto);
      vi.stubGlobal("fetch", async () => new Response(bytes));
      const parse = GLTFLoader.prototype.parseAsync;
      vi.spyOn(GLTFLoader.prototype, "parseAsync").mockImplementation(function (this: GLTFLoader, data, path) {
        this.register(decodeOnly); return parse.call(this, data, path);
      });
      const actor = await createMobReviewActor({ instanceId: `plant-${definitionId}`, definitionId: definition.id });
      actors.add(actor);
      const idle = actor.actions().find((action) => action.semantic === "idle" && !action.unavailableReason)!;
      actor.sample(idle.id, 0);
      const surface = new ReviewContactSurface(actor.model, (mesh) => (mesh as THREE.SkinnedMesh).isSkinnedMesh);
      surface.update();
      const bounds = surface.bounds();
      const centre = bounds.getCenter(new THREE.Vector3());
      // Shoot the body's own centre of mass from the front, square on.
      const contact = surface.segment(new THREE.Vector3(centre.x, centre.y, bounds.max.z + 2),
        new THREE.Vector3(centre.x, centre.y, bounds.min.z - 2))!;
      expect(contact?.surfaceAnchor).toBeTruthy();
      surface.dispose();
      const event: ReviewEvent = { id: `real-${definitionId}`, actorId: "archer", targetId: actor.instanceId,
        projectileId: "arrow-1", kind: "contact", result: "hit", timeSeconds: 0.4,
        position: contact.point.toArray(), normal: contact.normal.toArray(),
        surfaceAnchor: contact.surfaceAnchor, evidence: contact.evidence };
      const direction = new THREE.Vector3(0, 0, -1);
      const quiver = own(createReviewPlantedArrows(actor));
      const visual = arrowVisual(`real-${definitionId}`);
      const scene = new THREE.Group(); scene.add(visual); scene.updateMatrixWorld(true);
      const handle = quiver.plant({ id: "arrow-1", visual, event, contactPosition: contact.point.clone(),
        flightQuaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction),
        flightDirection: direction, flightSeconds: FLIGHT_SECONDS });
      expect(handle.boneDegraded).toBe(false);
      expect(handle.boneName).toBeTruthy();
      // The named bone is a real bone of this rig, found by weight and not by name.
      const bones = new Set<string>();
      actor.model.traverse((node) => { if ((node as THREE.Bone).isBone) bones.add(node.name); });
      expect(bones.has(handle.boneName!)).toBe(true);
      expect(handle.penetrationMeters).toBeGreaterThanOrEqual(handle.metrics.headBuryMeters - 1e-9);
      expect(handle.penetrationMeters).toBeLessThanOrEqual(handle.metrics.maxTravelMeters + 1e-9);
      quiver.update(handle.plantedAtSeconds);
      const planted = visual.getWorldPosition(new THREE.Vector3());
      expect(visual.parent!.name).toBe(handle.boneName);
      expect(visual.visible).toBe(true);
      // Ride the animation: find a pose this rig actually moves the struck bone
      // into, then the arrow has to have gone with it.
      const bone = visual.parent!;
      const boneAt = () => bone.getWorldPosition(new THREE.Vector3());
      const boneStart = boneAt();
      let posed = false;
      for (const candidate of actor.actions().filter((action) => !action.unavailableReason)) {
        for (const phase of [0.25, 0.5, 0.75]) {
          actor.sample(candidate.id, candidate.durationSeconds * phase);
          if (boneAt().distanceTo(boneStart) > 1e-3) { posed = true; break; }
        }
        if (posed) break;
      }
      expect(posed).toBe(true);
      quiver.update(handle.plantedAtSeconds + 0.05);
      const rode = visual.getWorldPosition(new THREE.Vector3());
      expect(rode.distanceTo(planted)).toBeGreaterThan(1e-4);
      expect(visual.parent).toBe(bone);
      expect(visual.parent!.name).toBe(handle.boneName);
      // Still buried in the same skin, not floating: no further from the
      // deformed surface than the depth it was planted at.
      const after = new ReviewContactSurface(actor.model, (mesh) => (mesh as THREE.SkinnedMesh).isSkinnedMesh);
      after.update();
      const nearest = after.closest(rode, handle.metrics.lengthMeters)!;
      after.dispose();
      expect(nearest).toBeTruthy();
      expect(nearest.distance).toBeLessThan(handle.penetrationMeters + 1e-3);
    }, 40_000);
});
