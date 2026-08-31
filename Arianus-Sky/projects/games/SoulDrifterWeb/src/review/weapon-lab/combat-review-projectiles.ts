import * as THREE from "three";
// @ts-expect-error Existing shared JS catalog is verified by the real-asset factory suite.
import { BOW_PROJECTILE_MOTION } from "./human-review-catalog.js";
import { createReviewMeshProbe, type ReviewMeshProbe } from "./combat-review-probes";
import { reviewRenderedVertexIndices, sampleReviewMeshVertices } from "./combat-review-contact";
import { createReviewImpactAttachment, type ReviewImpactAttachment } from "./combat-review-impact-anchor";
import type { ReviewActorAdapter, ReviewEvent, ReviewProjectileFlight } from "./combat-review-types";

export const REVIEWED_BASE_SHA = "1ddbd4e5ac46e9c3b53379d94e27038d1fbfb8faf9b575b5947cf835bed43217";
export const SPIT_PROJECTILE_MOTION = Object.freeze({ releaseSeconds: 0.64, flightSeconds: 0.8, rangePlaneMeters: 5.25 });
export type ReviewProjectileEmitter = "bow" | "base-spit";
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

export function reviewActorSourceSha(actor: ReviewActorAdapter): string | undefined {
  return (actor as ReviewActorAdapter & { definition?: { sha256?: string } }).definition?.sha256;
}

/** Only the two real bow releases and the pinned base Spit have emission bindings. */
export function reviewProjectileBinding(actor: ReviewActorAdapter, actionId: string): ReviewProjectileBinding | null {
  const action = actor.actions().find((entry) => entry.id === actionId);
  if (!action || action.unavailableReason) return null;
  const release = (BOW_PROJECTILE_MOTION.releasePhaseByAction as Readonly<Record<string, number>>)[actionId];
  const human = actor as BowActor, state = human.snapshot?.();
  if (actor.definitionId === "human-foundation-pilot" && state?.loadoutId === "bow" && state.mode === "equipment"
    && release !== undefined) return { emitter: "bow", releaseSeconds: action.durationSeconds * release,
    endSeconds: action.durationSeconds, evidence: "Existing authored bow visual: normalized release " + release + "; 6 m flight / 0.65 m quadratic drop; actual equipped arrow geometry" };
  if (actor.definitionId === "breachling-base" && reviewActorSourceSha(actor) === REVIEWED_BASE_SHA && actionId === "SpitAttack") {
    return { emitter: "base-spit", releaseSeconds: SPIT_PROJECTILE_MOTION.releaseSeconds,
      endSeconds: SPIT_PROJECTILE_MOTION.releaseSeconds + SPIT_PROJECTILE_MOTION.flightSeconds,
      evidence: "Pinned continuous-v5 Spit release 0.64 s; newly authored review-only 0.80 s flight to original three-cell plane; fixed source-head aim, no target tracking" };
  }
  return null;
}

export function prepareReviewProjectileFlight(value: ReviewProjectileFlight): ReviewProjectileFlight {
  if (![value.id, value.actorId, value.actionId, value.evidence].every((entry) => typeof entry === "string" && entry.trim())
    || !["arrow", "poison-spit"].includes(value.visualKind)
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
  update(timeSeconds: number, impacts?: readonly ReviewEvent[], validateBorrowedEmission?: boolean): void;
  projectileIdForProbe(probeId: string): string | undefined;
  dispose(): void;
}
interface VisualFlight {
  flight: ReviewProjectileFlight; visual: THREE.Object3D; quaternion: THREE.Quaternion; probe: ReviewMeshProbe;
  impact?: ReviewEvent; impactSeconds?: number; attachment?: ReviewImpactAttachment; attachmentError?: string;
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
  } else if (binding?.emitter === "base-spit") {
    const mesh = actor.model.getObjectByName("Breachling_Mesh") as THREE.Mesh | undefined;
    const head = actor.model.getObjectByName("head");
    const eligible = mesh?.isMesh ? new Set(reviewRenderedVertexIndices(mesh)) : new Set<number>();
    if (mesh && head && [22577, 2004].every((id) => eligible.has(id))) {
      // Exact held-neutral head basis from pinned 1ddbd4 GLB, not a humanoid or variant assumption.
      const headQ = head.getWorldQuaternion(new THREE.Quaternion());
      const direction = new THREE.Vector3(0.09298344261520167, 0.9642988771254712, 0.24795516806381246).applyQuaternion(headQ).normalize();
      const right = new THREE.Vector3(-0.936329205897425, 2.5637924103150134e-7, 0.3511234041607836).applyQuaternion(headQ).normalize();
      const points = sampleReviewMeshVertices(mesh, [22577, 2004]);
      const origin = points[0]!.clone().lerp(points[1]!, 0.5), headPosition = head.getWorldPosition(new THREE.Vector3());
      origin.addScaledVector(right, -origin.clone().sub(headPosition).dot(right));
      const localOrigin = actor.root.worldToLocal(origin.clone());
      const forwardWorld = new THREE.Vector3(0, 0, 1).transformDirection(actor.root.matrixWorld);
      const scale = actor.root.getWorldScale(new THREE.Vector3());
      const projection = direction.dot(forwardWorld);
      if (projection > 0.1 && Math.max(scale.x, scale.y, scale.z) - Math.min(scale.x, scale.y, scale.z) < 1e-6) {
        const range = (SPIT_PROJECTILE_MOTION.rangePlaneMeters - localOrigin.z) * scale.z / projection;
        const description = flight(0, "poison-spit", origin, direction, range, 0);
        // Procedural wet-fluid VFX; the mouth aperture bounds its initial size.
        const geometry = new THREE.SphereGeometry(0.008, 12, 8);
        const material = new THREE.MeshPhysicalMaterial({ color: 0xa7cd42, roughness: 0.16, metalness: 0,
          transparent: true, opacity: 0.92, clearcoat: 1, clearcoatRoughness: 0.1 });
        const visual = new THREE.Mesh(geometry, material); visual.name = "review-poison-fluid"; visual.scale.set(0.85, 0.85, 1.6);
        visual.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction); root.add(visual);
        resources.push(geometry, material);
        add(description, visual, visual.quaternion.clone());
      } else reason = "Spit requires a forward-facing emission and uniform actor scale; not a miss.";
    } else reason = "Pinned visible mouth vertices or head are missing; not a miss.";
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
      row.attachment = createReviewImpactAttachment({ target: context.target, event: candidate,
        projectilePosition: sampleReviewProjectileFlight(row.flight, candidate.timeSeconds),
        projectileQuaternion: row.quaternion });
      row.impact = row.attachment.event;
    } catch (error) { row.attachmentError = error instanceof Error ? error.message : String(error); }
  }
  const flights = Object.freeze(rows.map((row) => row.flight));
  const probe: ReviewMeshProbe = { vertexCount: rows.reduce((sum, row) => sum + row.probe.vertexCount, 0),
    unavailableReason: rows.length ? undefined : reason,
    sample: () => disposed ? [] : rows.flatMap((row) => row.probe.sample().map((point) => ({ ...point, id: row.flight.id + "|" + point.id }))),
  };
  return { root, flights, probe,
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
      for (const row of rows) {
        const impact = context ? row.impact : impacts.filter((event) => event.kind === "contact" && event.result === "hit"
          && event.projectileId === row.flight.id && event.timeSeconds >= row.flight.releaseSeconds
          && event.timeSeconds <= timeSeconds).sort((a, b) => a.timeSeconds - b.timeSeconds)[0];
        const impacted = Boolean(impact && timeSeconds >= (context ? row.impactSeconds! : impact.timeSeconds));
        row.visual.visible = timeSeconds >= row.flight.releaseSeconds && (timeSeconds <= row.flight.endSeconds || impacted);
        if (impacted && row.attachmentError) {
          row.visual.visible = false;
          throw new Error(`Projectile attachment unavailable: ${row.attachmentError}`);
        }
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
      }
    },
    projectileIdForProbe: (id) => rows.find((row) => id.startsWith(row.flight.id + "|"))?.flight.id,
    dispose() { if (disposed) return; disposed = true; rows.forEach((row) => row.attachment?.dispose());
      root.removeFromParent(); root.clear(); resources.forEach((resource) => resource.dispose()); },
  };
}
