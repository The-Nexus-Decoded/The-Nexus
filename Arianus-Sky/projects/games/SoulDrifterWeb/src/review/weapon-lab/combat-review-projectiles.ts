import * as THREE from "three";
// @ts-expect-error Existing shared JS catalog is verified by the real-asset factory suite.
import { BOW_PROJECTILE_MOTION, LOADOUTS } from "./human-review-catalog.js";
import { createReviewMeshProbe, type ReviewMeshProbe } from "./combat-review-probes";
import { reviewRenderedVertexIndices, sampleReviewMeshVertices } from "./combat-review-contact";
import { createReviewImpactAttachment, type ReviewImpactAttachment } from "./combat-review-impact-anchor";
import { reviewPlantedArrowsFor, type ReviewPlantedArrow, type ReviewPlantedArrows } from "./combat-review-planted-arrows";
import type { ReviewActorAdapter, ReviewEvent, ReviewProjectileFlight } from "./combat-review-types";
import { composerPackForDefinition } from "./composer-pack-lookup";
import type { ComposerSpitMouth } from "./composer-mob-packs";
import { acidPoolScaleForGob, createBreachlingAcidContactOutline, createBreachlingAcidResources,
  createBreachlingAcidSplash, createBreachlingAcidStream, createBreachlingAcidPool,
  type BreachlingAcidContactOutline, type BreachlingAcidResources, type BreachlingAcidPool,
  type BreachlingAcidSplash, type BreachlingAcidStream } from "../../game/vfx/breachling-acid-vfx";
import { acidResponsePlan, createAcidVictimMark, type AcidResponsePlan,
  type AcidVictimMark } from "../../game/combat/acid-response";

export const REVIEWED_BASE_SHA = "1ddbd4e5ac46e9c3b53379d94e27038d1fbfb8faf9b575b5947cf835bed43217";
export const SPIT_PROJECTILE_MOTION = Object.freeze({ releaseSeconds: 0.64, flightSeconds: 0.8, rangePlaneMeters: 5.25 });
/** Standard gravity; the four-view acid arc is derived from it, never dialled by eye. */
export const SPIT_GRAVITY_METERS_PER_SECOND_SQUARED = 9.80665;
/**
 * Pinned held-neutral mouth of the legacy 1ddbd4 body, in the same shape a
 * four-view pack now measures for itself. probe-mouth.mjs reproduces this basis
 * from the legacy rig to 8 decimal places, which is what confirms the measured
 * four-view bases are constructed the same way.
 */
export const LEGACY_SPIT_MOUTH: ComposerSpitMouth = Object.freeze({
  meshName: "Breachling_Mesh",
  vertices: Object.freeze([22577, 2004]),
  directionHeadLocal: Object.freeze([0.09298344261520167, 0.9642988771254712, 0.24795516806381246]),
  rightHeadLocal: Object.freeze([-0.936329205897425, 2.5637924103150134e-7, 0.3511234041607836]),
  gapeMeters: 0.1612,
  evidence: "Pinned continuous-v5 mouth basis of the legacy 1ddbd4 body; 0.1612 m gape measured at the 0.45 s jaw-wide frame",
});

/** Read a frozen triple without copying it into a mutable array. */
function vectorFrom(values: readonly number[]): THREE.Vector3 {
  return new THREE.Vector3(values[0] ?? 0, values[1] ?? 0, values[2] ?? 0);
}

/** Deterministic per-instance seed so a review run lays the same gobs out every time. */
function reviewAcidSeed(instanceId: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < instanceId.length; index += 1) {
    hash ^= instanceId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
export const FIRE_WAND_RELEASE_PHASES = Object.freeze({
  ProMagic__Standing1HCastSpell01: 0.66,
  ProMagic__Standing1HMagicAttack01: 0.29,
  ProMagic__Standing1HMagicAttack02: 0.2,
} as const);
export type ReviewProjectileEmitter = "bow" | "base-spit" | "wand-fire";
export interface ReviewProjectileBinding {
  readonly emitter: ReviewProjectileEmitter;
  readonly releaseSeconds: number;
  readonly endSeconds: number;
  readonly evidence: string;
}
interface BowActor extends ReviewActorAdapter {
  snapshot?(): { loadoutId?: string; mode?: string; actionId?: string };
  projectile?: { visuals: THREE.Object3D[]; captured: boolean; startPosition: THREE.Vector3; direction: THREE.Vector3 } | null;
}
interface FireWandActor extends BowActor {
  primary?: {
    asset?: string;
    visual: THREE.Object3D;
    prepared?: { normalizedBounds?: THREE.Box3 };
  } | null;
}

export function reviewActorSourceSha(actor: ReviewActorAdapter): string | undefined {
  return (actor as ReviewActorAdapter & { definition?: { sha256?: string } }).definition?.sha256;
}

/** Explicit source-bound bow, fire-wand and pinned base-Spit review emissions. */
export function reviewProjectileBinding(actor: ReviewActorAdapter, actionId: string): ReviewProjectileBinding | null {
  const action = actor.actions().find((entry) => entry.id === actionId);
  if (!action || action.unavailableReason) return null;
  const release = (BOW_PROJECTILE_MOTION.releasePhaseByAction as Readonly<Record<string, number>>)[actionId];
  const human = actor as BowActor, state = human.snapshot?.();
  if (actor.definitionId === "human-foundation-pilot" && state?.loadoutId === "bow" && state.mode === "equipment"
    && release !== undefined) return { emitter: "bow", releaseSeconds: action.durationSeconds * release,
    endSeconds: action.durationSeconds, evidence: "Existing authored bow visual: normalized release " + release + "; 6 m flight / 0.65 m quadratic drop; actual equipped arrow geometry" };
  const wandRelease = FIRE_WAND_RELEASE_PHASES[actionId as keyof typeof FIRE_WAND_RELEASE_PHASES];
  if (actor.definitionId === "human-foundation-pilot" && state?.loadoutId === "rod" && state.mode === "equipment"
    && wandRelease !== undefined) return { emitter: "wand-fire", releaseSeconds: action.durationSeconds * wandRelease,
    endSeconds: action.durationSeconds, evidence: `Existing Tripo fire wand tip and source cast pose at normalized release ${wandRelease}; review-only fixed fire VFX, no target tracking` };
  const composerPack = composerPackForDefinition(actor.definitionId);
  if (composerPack?.spit && reviewActorSourceSha(actor) === composerPack.sha256 && actionId === "SpitAttack") {
    // The pack registers its own flight end (the clip is shorter than release + the
    // legacy 0.80 s flight); a longer window would fail clip validation unmeasured.
    const { releaseSeconds, endSeconds } = composerPack.spit;
    return { emitter: "base-spit", releaseSeconds, endSeconds,
      evidence: `${composerPack.revision} Spit release ${releaseSeconds.toFixed(3)} s at the jaw-wide frame; review-only ${(endSeconds - releaseSeconds).toFixed(2)} s flight to the three-cell plane; fixed head aim, no target tracking` };
  }
  if (actor.definitionId === "breachling-base" && reviewActorSourceSha(actor) === REVIEWED_BASE_SHA && actionId === "SpitAttack") {
    return { emitter: "base-spit", releaseSeconds: SPIT_PROJECTILE_MOTION.releaseSeconds,
      endSeconds: SPIT_PROJECTILE_MOTION.releaseSeconds + SPIT_PROJECTILE_MOTION.flightSeconds,
      evidence: "Pinned continuous-v5 Spit release 0.64 s; newly authored review-only 0.80 s flight to original three-cell plane; fixed source-head aim, no target tracking" };
  }
  return null;
}

export function prepareReviewProjectileFlight(value: ReviewProjectileFlight): ReviewProjectileFlight {
  if (![value.id, value.actorId, value.actionId, value.evidence].every((entry) => typeof entry === "string" && entry.trim())
    || !["arrow", "poison-spit", "fire-spell"].includes(value.visualKind)
    || ![value.releaseSeconds, value.endSeconds, value.rangeMeters, value.dropMeters].every(Number.isFinite)
    || value.releaseSeconds < 0 || value.endSeconds <= value.releaseSeconds || value.rangeMeters <= 0
    || value.rangeMeters > 40 || value.dropMeters < 0 || value.dropMeters > 10
    || value.origin.length !== 3 || value.direction.length !== 3
    || ![...value.origin, ...value.direction].every(Number.isFinite)
    || Math.abs(new THREE.Vector3().fromArray(value.direction).length() - 1) > 1e-6) throw new Error("Invalid fixed projectile flight.");
  return Object.freeze({ ...value, origin: Object.freeze([...value.origin]) as readonly [number, number, number],
    direction: Object.freeze([...value.direction]) as readonly [number, number, number] });
}

export function sampleReviewProjectileFlight(flight: ReviewProjectileFlight, seconds: number, target = new THREE.Vector3()): THREE.Vector3 {
  if (!Number.isFinite(seconds)) throw new Error("Projectile sample time must be finite.");
  const phase = THREE.MathUtils.clamp((seconds - flight.releaseSeconds) / (flight.endSeconds - flight.releaseSeconds), 0, 1);
  target.fromArray(flight.origin).addScaledVector(new THREE.Vector3().fromArray(flight.direction), phase * flight.rangeMeters);
  target.y -= phase * phase * flight.dropMeters;
  return target;
}

export interface ReviewProjectiles {
  readonly flights: readonly ReviewProjectileFlight[];
  /** Owned procedural VFX only. Bow meshes remain in their existing actor. */
  readonly root: THREE.Group;
  readonly probe: ReviewMeshProbe;
  /**
   * Acid response the measured contact asks of the victim, present only for a
   * four-view Breachling spit that actually connected. `playable` is false and
   * `blockedReason` names the missing Mixamo asset while no burn clip exists.
   */
  readonly acidResponse?: AcidResponsePlan;
  update(timeSeconds: number, impacts?: readonly ReviewEvent[], validateBorrowedEmission?: boolean): void;
  projectileIdForProbe(probeId: string): string | undefined;
  dispose(): void;
}
interface VisualFlight {
  flight: ReviewProjectileFlight; visual: THREE.Object3D; quaternion: THREE.Quaternion; probe: ReviewMeshProbe;
  impact?: ReviewEvent; impactSeconds?: number; attachment?: ReviewImpactAttachment; attachmentError?: string;
  /** An arrow that connected is handed to the struck body's quiver, which owns it from then on. */
  planted?: ReviewPlantedArrow;
}

/** Call after the shared clock samples the exact emission pose. No asset loader or actor copy. */
export function createReviewProjectiles(actor: ReviewActorAdapter, actionId: string,
  timing: { releaseSeconds: number; endSeconds: number }, context?: {
    target: ReviewActorAdapter;
    /** Immutable-at-construction measured events; later update arguments cannot redirect an attachment. */
    impacts: readonly ReviewEvent[];
  }): ReviewProjectiles {
  const binding = reviewProjectileBinding(actor, actionId), root = new THREE.Group();
  root.name = `review-projectiles:${actor.instanceId}`;
  const rows: VisualFlight[] = [], resources: Array<{ dispose(): void }> = [];
  // Four-view acid presentation. Built only on the `context` path; the headless
  // contact sweep never allocates a trail, splash or pool.
  const streams: { stream: BreachlingAcidStream; flight: ReviewProjectileFlight;
    outline?: BreachlingAcidContactOutline }[] = [];
  // The struck body's own quiver of planted arrows. Shared with any other set
  // that plants into the same target, which is what bounds a rapid-fire volley.
  let planted: ReviewPlantedArrows | undefined;
  let acidResources: BreachlingAcidResources | undefined;
  let acidSplash: BreachlingAcidSplash | undefined;
  let acidPool: BreachlingAcidPool | undefined;
  let acidMark: AcidVictimMark | undefined;
  let acidPlan: AcidResponsePlan | undefined;
  const borrowed = (actor as BowActor).projectile;
  const borrowedDirection = borrowed?.direction.clone();
  let reason = binding ? "No actual emitted projectile mesh is available; not a miss." : "No explicit projectile binding; not a miss.";
  let disposed = false;
  const flight = (index: number, visualKind: ReviewProjectileFlight["visualKind"], origin: THREE.Vector3,
    direction: THREE.Vector3, rangeMeters: number, dropMeters: number) => prepareReviewProjectileFlight({
    id: `${actor.instanceId}/${actionId}/projectile-${index + 1}`, actorId: actor.instanceId, actionId, visualKind,
    ...timing, origin: origin.toArray(), direction: direction.toArray(), rangeMeters, dropMeters, evidence: binding!.evidence,
  });
  const add = (description: ReviewProjectileFlight, visual: THREE.Object3D, quaternion = visual.getWorldQuaternion(new THREE.Quaternion())) => {
    const probe = createReviewMeshProbe(visual, { maximumVertices: 64 });
    if (probe.vertexCount) rows.push({ flight: description, visual, quaternion, probe });
  };
  if (binding?.emitter === "bow") {
    const bow = actor as BowActor, projectile = bow.projectile;
    if (projectile?.captured && bow.snapshot?.().actionId === actionId) {
      const visuals = projectile.visuals.filter((visual) => visual.visible);
      const spreads = (BOW_PROJECTILE_MOTION.spreadRadiansByCount as Readonly<Record<number, readonly number[]>>)[visuals.length];
      if (spreads) visuals.forEach((visual, index) => add(flight(index, "arrow", projectile.startPosition,
        projectile.direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spreads[index]!),
        BOW_PROJECTILE_MOTION.rangeMeters, BOW_PROJECTILE_MOTION.dropMeters), visual));
      if (rows.length !== visuals.length) { rows.length = 0; reason = "An emitted arrow has no eligible rendered geometry; not a miss."; }
    }
  } else if (binding?.emitter === "wand-fire") {
    const primary = (actor as FireWandActor).primary, bounds = primary?.prepared?.normalizedBounds;
    if (primary?.asset === "rod" && bounds && !bounds.isEmpty()) {
      const center = bounds.getCenter(new THREE.Vector3());
      const origin = primary.visual.localToWorld(new THREE.Vector3(center.x, bounds.max.y, center.z));
      const base = primary.visual.localToWorld(new THREE.Vector3(center.x, bounds.min.y, center.z));
      const direction = origin.clone().sub(base).normalize();
      const forward = new THREE.Vector3(0, 0, 1).transformDirection(actor.root.matrixWorld);
      if (direction.dot(forward) > 0.1) {
        const description = flight(0, "fire-spell", origin, direction, 6, 0.08);
        const visual = new THREE.Group(); visual.name = "review-fire-wand-projectile";
        const coreGeometry = new THREE.IcosahedronGeometry(0.075, 2);
        const coreMaterial = new THREE.MeshPhysicalMaterial({ color: 0xff7a20, emissive: 0xff2b00,
          emissiveIntensity: 3.5, roughness: 0.22, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.16 });
        const auraGeometry = new THREE.SphereGeometry(0.115, 16, 10);
        const auraMaterial = new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.28,
          blending: THREE.AdditiveBlending, depthWrite: false });
        const core = new THREE.Mesh(coreGeometry, coreMaterial); core.name = "review-fire-wand-core";
        const aura = new THREE.Mesh(auraGeometry, auraMaterial); aura.name = "review-fire-wand-aura";
        visual.add(core, aura); root.add(visual); resources.push(coreGeometry, coreMaterial, auraGeometry, auraMaterial);
        add(description, visual);
      } else reason = "The actual wand tip does not face forward at the registered release pose; not a miss.";
    } else reason = "The actual equipped fire wand or its fitted bounds are unavailable; not a miss.";
  } else if (binding?.emitter === "base-spit") {
    const mesh = actor.model.getObjectByName("Breachling_Mesh") as THREE.Mesh | undefined;
    const head = actor.model.getObjectByName("head");
    const eligible = mesh?.isMesh ? new Set(reviewRenderedVertexIndices(mesh)) : new Set<number>();
    const pack = composerPackForDefinition(actor.definitionId);
    // Legacy bodies keep their pinned 1ddbd4 basis byte for byte. Four-view bodies
    // use the mouth their own composer pack measured (measure-spit-mouth.mjs):
    // same construction, per-body numbers, so no basis is ever borrowed.
    const authored = pack?.body === "fourview" ? pack.spitMouth : LEGACY_SPIT_MOUTH;
    const flightSeconds = timing.endSeconds - timing.releaseSeconds;
    // Legacy rows stay on their pinned flat flight. The four-view acid falls under
    // real gravity over its own flight window: y drops 1/2 g t^2 at the end of it.
    const dropMeters = pack?.body === "fourview"
      ? 0.5 * SPIT_GRAVITY_METERS_PER_SECOND_SQUARED * flightSeconds * flightSeconds : 0;
    if (!authored) {
      reason = "This four-view pack carries no measured spit mouth; the pinned legacy mouth basis is not reused; not a miss.";
    } else if (mesh && head && authored.vertices.every((id) => eligible.has(id))) {
      const headQ = head.getWorldQuaternion(new THREE.Quaternion());
      const direction = vectorFrom(authored.directionHeadLocal).applyQuaternion(headQ).normalize();
      const right = vectorFrom(authored.rightHeadLocal).applyQuaternion(headQ).normalize();
      const points = sampleReviewMeshVertices(mesh, authored.vertices);
      const origin = points[0]!.clone().lerp(points[1]!, 0.5), headPosition = head.getWorldPosition(new THREE.Vector3());
      origin.addScaledVector(right, -origin.clone().sub(headPosition).dot(right));
      const localOrigin = actor.root.worldToLocal(origin.clone());
      const forwardWorld = new THREE.Vector3(0, 0, 1).transformDirection(actor.root.matrixWorld);
      const scale = actor.root.getWorldScale(new THREE.Vector3());
      const projection = direction.dot(forwardWorld);
      if (projection > 0.1 && Math.max(scale.x, scale.y, scale.z) - Math.min(scale.x, scale.y, scale.z) < 1e-6) {
        const range = (SPIT_PROJECTILE_MOTION.rangePlaneMeters - localOrigin.z) * scale.z / projection;
        const description = flight(0, "poison-spit", origin, direction, range, dropMeters);
        if (pack?.body === "fourview") {
          // Viscous acid stream: the measured aperture sizes the gob, the trail
          // rides the same arc, and the splash/pool are built by the caller-facing
          // presentation path only (see `context` below), never by the headless
          // contact sweep the resolver runs thousands of times.
          // `gapeMeters` was measured at the pack's own normalised height, so it is
          // already in world metres here and carries the body size on its own.
          acidResources ??= createBreachlingAcidResources();
          const stream = createBreachlingAcidStream({ resources: acidResources, scale: 1,
            gapeMeters: authored.gapeMeters, seed: reviewAcidSeed(actor.instanceId),
            name: `review-acid-spit:${actor.definitionId}`,
            // Strands that sag off the rope and let go land on the attacker's own
            // floor plane, the same plane the pool below is placed on.
            floorMeters: actor.root.getWorldPosition(new THREE.Vector3()).y,
            gravityMetersPerSecondSquared: SPIT_GRAVITY_METERS_PER_SECOND_SQUARED });
          const visual = stream.head;
          visual.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
          root.add(visual);
          const entry: { stream: BreachlingAcidStream; flight: ReviewProjectileFlight;
            outline?: BreachlingAcidContactOutline } = { stream, flight: description };
          streams.push(entry);
          resources.push(stream);
          // Trail and drips are presentation only; the headless sweep gets neither.
          if (context) { root.add(stream.root); root.add(stream.drips); }
          add(description, visual, visual.quaternion.clone());
          // What this tool is for is MEASURED CONTACT, and the rope it draws is
          // deliberately up to 2.1x the body that swept it (breachling-acid-vfx.ts):
          // on the 5.05 cm ravager gape a 32.1 mm rope wraps a 15.2 mm contact body
          // and the first trail gob buries it. So the swept body is drawn too, as
          // its own wireframe cage read through the goo — a reviewer sees both and
          // cannot mistake one for the other. A SIBLING of the head, added after the
          // probe above is built over the head alone, so it is outside every contact
          // body count; and built on the `context` path only, so the headless sweep
          // that produces the pinned matrix never sees it at all.
          if (context) {
            entry.outline = createBreachlingAcidContactOutline({ resources: acidResources,
              name: `review-acid-contact-body:${actor.definitionId}` });
            root.add(entry.outline.root);
            entry.outline.follow(visual);
            resources.push(entry.outline);
          }
        } else {
          // Procedural wet-fluid VFX; the mouth aperture bounds its initial size.
          const geometry = new THREE.SphereGeometry(0.008, 12, 8);
          const material = new THREE.MeshPhysicalMaterial({ color: 0xa7cd42, roughness: 0.16, metalness: 0,
            transparent: true, opacity: 0.92, clearcoat: 1, clearcoatRoughness: 0.1 });
          const visual = new THREE.Mesh(geometry, material); visual.name = "review-poison-fluid"; visual.scale.set(0.85, 0.85, 1.6);
          visual.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction); root.add(visual);
          resources.push(geometry, material);
          add(description, visual, visual.quaternion.clone());
        }
      } else reason = "Spit requires a forward-facing emission and uniform actor scale; not a miss.";
    } else reason = "Authored visible mouth vertices or head are missing; not a miss.";
  }
  if (context) for (const row of rows) {
    const hits = context.impacts.filter((event) => event.kind === "contact" && event.result === "hit"
      && event.projectileId === row.flight.id);
    if (!hits.length) continue;
    const candidate = hits[0]!;
    row.impact = structuredClone(candidate);
    const timeInFlight = Number.isFinite(candidate.timeSeconds) && candidate.timeSeconds >= row.flight.releaseSeconds
      && candidate.timeSeconds <= row.flight.endSeconds;
    // Invalid receipts become visible failures at release without perturbing
    // the authored pre-release projectile pose.
    row.impactSeconds = timeInFlight ? candidate.timeSeconds : row.flight.releaseSeconds;
    try {
      if (hits.length !== 1 || candidate.actorId !== row.flight.actorId || !timeInFlight) {
        throw new Error("Measured projectile impact is ambiguous or outside its fixed flight.");
      }
      if (row.flight.visualKind === "arrow") {
        // An arrow that connects is planted in the body, not stopped on its
        // surface: the quiver sinks it along its own flight line, parents it to
        // the bone that drives the struck skin and retires it after its dwell.
        planted ??= reviewPlantedArrowsFor(context.target);
        row.planted = planted.plant({ id: row.flight.id, visual: row.visual, event: candidate,
          contactPosition: sampleReviewProjectileFlight(row.flight, candidate.timeSeconds),
          flightQuaternion: row.quaternion, flightDirection: vectorFrom(row.flight.direction),
          flightSeconds: row.flight.endSeconds - row.flight.releaseSeconds });
        row.impact = row.planted.event;
      } else {
        row.attachment = createReviewImpactAttachment({ target: context.target, event: candidate,
          projectilePosition: sampleReviewProjectileFlight(row.flight, candidate.timeSeconds),
          projectileQuaternion: row.quaternion });
        row.impact = row.attachment.event;
      }
    } catch (error) { row.attachmentError = error instanceof Error ? error.message : String(error); }
  }
  // Where the acid lands: a splash at the measured impact, and a pool wherever
  // the arc first crosses the attacker's own floor plane inside the flight window.
  let acidSplashSeconds = Number.POSITIVE_INFINITY, acidPoolSeconds = Number.POSITIVE_INFINITY;
  if (context && streams.length) {
    const entry = streams[0]!, row = rows.find((candidate) => candidate.flight === entry.flight);
    acidResources ??= createBreachlingAcidResources();
    const span = entry.flight.endSeconds - entry.flight.releaseSeconds;
    if (row?.impact && row.impactSeconds !== undefined && !row.attachmentError) {
      acidSplashSeconds = row.impactSeconds;
      // What the victim owes for this hit. The clip half is blocked on a Mixamo
      // burn loop (acid-response.ts); the acid itself is built and rides the skin.
      // Response family, not loadout id: acid-response.ts binds clips per family
      // (human-review-catalog.js actionFamily), the same key reaction clips use.
      const victim = context.target as ReviewActorAdapter & { snapshot?(): { loadoutId?: string } };
      const loadoutId = victim.snapshot?.().loadoutId;
      const catalog = LOADOUTS as Readonly<Record<string, { actionFamily?: string }>>;
      const family = (loadoutId && catalog[loadoutId]?.actionFamily) || victim.definitionId;
      acidPlan = acidResponsePlan(family, row.impactSeconds);
      acidMark = createAcidVictimMark({ resources: acidResources, plan: acidPlan,
        headRadiusMeters: entry.stream.headRadiusMeters, seed: reviewAcidSeed(actor.instanceId + ":mark") });
      root.add(acidMark.root);
      const normal = row.impact.normal
        ? vectorFrom(row.impact.normal)
        : vectorFrom(entry.flight.direction).negate();
      acidSplash = createBreachlingAcidSplash({ resources: acidResources, scale: 1,
        headRadiusMeters: entry.stream.headRadiusMeters, normal, seed: reviewAcidSeed(actor.instanceId + ":splash") });
      acidSplash.root.position.copy(sampleReviewProjectileFlight(entry.flight, acidSplashSeconds));
      root.add(acidSplash.root);
    }
    const floorY = actor.root.getWorldPosition(new THREE.Vector3()).y;
    const point = new THREE.Vector3();
    for (let step = 1; step <= 96 && acidPoolSeconds === Number.POSITIVE_INFINITY; step += 1) {
      const seconds = entry.flight.releaseSeconds + span * (step / 96);
      if (seconds >= acidSplashSeconds) break;
      if (sampleReviewProjectileFlight(entry.flight, seconds, point).y <= floorY) {
        acidPoolSeconds = seconds;
        acidPool = createBreachlingAcidPool({ resources: acidResources,
          scale: acidPoolScaleForGob(entry.stream.headRadiusMeters),
          seed: reviewAcidSeed(actor.instanceId + ":pool") });
        acidPool.root.position.set(point.x, floorY, point.z);
        root.add(acidPool.root);
      }
    }
  }
  const flights = Object.freeze(rows.map((row) => row.flight));
  const probe: ReviewMeshProbe = { vertexCount: rows.reduce((sum, row) => sum + row.probe.vertexCount, 0),
    unavailableReason: rows.length ? undefined : reason,
    sample: () => disposed ? [] : rows.flatMap((row) => row.probe.sample().map((point) => ({ ...point, id: row.flight.id + "|" + point.id }))),
  };
  return { root, flights, probe, acidResponse: acidPlan,
    update(timeSeconds, impacts = [], validateBorrowedEmission = false) {
      if (disposed) throw new Error("Projectile review has been disposed.");
      if (!Number.isFinite(timeSeconds)) throw new Error("Projectile sample time must be finite.");
      if (validateBorrowedEmission && binding?.emitter === "bow" && rows.length) {
        const current = (actor as BowActor).projectile;
        const valid = current === borrowed && current?.captured && current.visuals.filter((visual) => visual.visible).length === rows.length
          && current.startPosition.distanceTo(new THREE.Vector3().fromArray(rows[0]!.flight.origin)) < 1e-8
          && current.direction.distanceTo(borrowedDirection!) < 1e-8;
        if (!valid) throw new DOMException("Borrowed arrow emission changed during contact sampling", "AbortError");
      }
      // Planted arrows first: an arrow whose contact has not been reached yet is
      // handed back to its original parent here, before the fixed flight below
      // writes local coordinates into it.
      planted?.update(timeSeconds);
      for (const row of rows) {
        const impact = context ? row.impact : impacts.filter((event) => event.kind === "contact" && event.result === "hit"
          && event.projectileId === row.flight.id && event.timeSeconds >= row.flight.releaseSeconds
          && event.timeSeconds <= timeSeconds).sort((a, b) => a.timeSeconds - b.timeSeconds)[0];
        const impacted = Boolean(impact && timeSeconds >= (context ? row.impactSeconds! : impact.timeSeconds));
        if (impacted && row.attachmentError) {
          row.visual.visible = false;
          throw new Error(`Projectile attachment unavailable: ${row.attachmentError}`);
        }
        if (row.planted && timeSeconds >= row.planted.plantedAtSeconds) {
          // From the measured contact onward the struck body's quiver owns this
          // arrow: its parent bone, its sunk pose, its dwell, its fade and
          // whether it is still on the body at all. One the cap already retired
          // stays gone rather than reappearing in flight.
          if (row.planted.state(timeSeconds) === "retired") row.visual.visible = false;
          continue;
        }
        row.visual.visible = timeSeconds >= row.flight.releaseSeconds && (timeSeconds <= row.flight.endSeconds || impacted);
        let world = sampleReviewProjectileFlight(row.flight, impacted ? impact!.timeSeconds : timeSeconds);
        let worldQuaternion = row.quaternion;
        if (impacted && row.attachment) {
          try {
            const pose = row.attachment.sample(); world = pose.position; worldQuaternion = pose.quaternion;
          } catch (error) { row.visual.visible = false; throw error; }
        }
        row.visual.position.copy(row.visual.parent ? row.visual.parent.worldToLocal(world.clone()) : world);
        const parentQ = row.visual.parent?.getWorldQuaternion(new THREE.Quaternion()).invert() ?? new THREE.Quaternion();
        row.visual.quaternion.copy(parentQ.multiply(worldQuaternion)); row.visual.updateMatrixWorld(true);
        // Covered in acid: the coating sits on the anchored impact point, so it
        // rides the victim's deformed skin rather than floating in world space.
        if (acidMark && impacted) {
          acidMark.root.position.copy(acidMark.root.parent ? acidMark.root.parent.worldToLocal(world.clone()) : world);
          acidMark.root.quaternion.copy(parentQ.clone().multiply(worldQuaternion));
        }
        // The acid trail rides the same sampled arc one step behind the head and
        // stops dead at the impact, where the splash takes over.
        // Presentation only: the headless contact sweep resamples this up to
        // 3600 times per resolution and never renders the trail.
        const entry = context ? streams.find((candidate) => candidate.flight === row.flight) : undefined;
        if (entry) {
          // The contact-body cage rides the head, before and after the measured
          // contact, so the swept body stays legible where the goo covers it.
          entry.outline?.follow(row.visual as THREE.Mesh);
          const span = row.flight.endSeconds - row.flight.releaseSeconds;
          const headTime = impacted ? row.impactSeconds ?? impact!.timeSeconds : timeSeconds;
          entry.stream.setVisible(row.visual.visible && !impacted);
          if (row.visual.visible && !impacted) {
            entry.stream.setTrail(Math.max(0, Math.min(1, (headTime - row.flight.releaseSeconds) / span)),
              (u) => sampleReviewProjectileFlight(row.flight, row.flight.releaseSeconds + u * span),
              Math.max(0, headTime - row.flight.releaseSeconds));
          }
        }
      }
      if (acidSplash) {
        const elapsed = timeSeconds - acidSplashSeconds;
        acidSplash.root.visible = elapsed >= 0;
        if (elapsed >= 0) acidSplash.update(elapsed);
      }
      if (acidPool) {
        const elapsed = timeSeconds - acidPoolSeconds;
        acidPool.root.visible = elapsed >= 0;
        if (elapsed >= 0) acidPool.update(elapsed);
      }
      acidMark?.update(timeSeconds);
    },
    projectileIdForProbe: (id) => rows.find((row) => id.startsWith(row.flight.id + "|"))?.flight.id,
    dispose() { if (disposed) return; disposed = true;
      rows.forEach((row) => { row.attachment?.dispose(); if (row.planted) planted?.retire(row.planted); });
      acidSplash?.dispose(); acidPool?.dispose(); acidMark?.dispose();
      root.removeFromParent(); root.clear(); resources.forEach((resource) => resource.dispose());
      acidResources?.dispose(); },
  };
}
