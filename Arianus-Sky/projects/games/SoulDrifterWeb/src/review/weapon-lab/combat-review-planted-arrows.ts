import * as THREE from "three";
import { createReviewImpactAttachment, type ReviewImpactAttachment } from "./combat-review-impact-anchor";
import type { ReviewActorAdapter, ReviewEvent, ReviewSurfaceAnchor } from "./combat-review-types";

/**
 * An arrow that connects is planted in the body it struck: parented to the bone
 * that actually drives the struck skin, sunk along its own flight line so the
 * head is buried and the shaft protrudes, riding the animation for a short
 * bounded dwell and then fading out.
 *
 * Nothing here is permanent and nothing accumulates. The per-target quiver caps
 * how many arrows a body can carry at once and retires the oldest first, so a
 * multishot volley followed by another volley never turns a body into a
 * pincushion.
 *
 * Every distance is measured: the burial depth comes from the arrow prop's own
 * geometry and the measured surface normal at the contact, never from a dialled
 * constant. The bone comes from the rig's own skin weights at the measured
 * triangle, never from a bone name, so the same code plants in the human target,
 * the Breachlings and the Wardens without knowing any of their skeletons. A rig
 * that carries no usable weights degrades to the actor's model root instead of
 * throwing.
 */

/**
 * The largest volley the shipped bow can emit is three arrows
 * (human-review-catalog.js BOW_PROJECTILE_MOTION.spreadRadiansByCount tops out
 * at 3), so a body may carry exactly one complete volley and never more. The
 * fourth arrival retires the oldest plant.
 */
export const REVIEW_PLANTED_ARROW_CAP = 3;

/**
 * Hard ceiling on the dwell. The review lab's attack sequences run roughly one
 * to two seconds; past three the next exchange has already begun and arrows from
 * two volleys are on the body at once, which is the pincushion the dwell exists
 * to prevent.
 */
export const REVIEW_PLANTED_ARROW_MAX_DWELL_SECONDS = 3;

/**
 * The arrow leaves over the last quarter of its life. Long enough to read as a
 * dissolve rather than a pop at any dwell the clamp above allows, short enough
 * that the arrow is unambiguous for the great majority of the time it is there.
 */
export const REVIEW_PLANTED_ARROW_FADE_FRACTION = 0.25;

/**
 * The shipped arrow prop is modelled along its own +Y and the emitter fires it
 * that way (human-review-actor.js ARROW_FLIGHT_AXIS), so the leading end of a
 * planted arrow is +Y in the visual's own frame. Measurements below use that
 * axis rather than a world axis, so they survive any placement of the shooter.
 */
const ARROW_FLIGHT_AXIS_LOCAL = Object.freeze(new THREE.Vector3(0, 1, 0));

export interface ReviewArrowMetrics {
  /** Tip-to-nock extent along the flight axis, in world metres at its current scale. */
  readonly lengthMeters: number;
  /** Widest cross-section the prop has about that axis. */
  readonly maxRadiusMeters: number;
  /** Depth that buries the widest leading cross-section: one full arrow width. */
  readonly headBuryMeters: number;
  /** An arrow past its own midpoint stops reading as an arrow in a body. */
  readonly maxTravelMeters: number;
  readonly vertexCount: number;
  readonly evidence: string;
}

/** Measure the actual emitted arrow, at its actual world scale. No prop catalogue lookup. */
export function measureReviewArrow(visual: THREE.Object3D): ReviewArrowMetrics {
  visual.updateWorldMatrix(true, true);
  const axis = ARROW_FLIGHT_AXIS_LOCAL.clone()
    .applyQuaternion(visual.getWorldQuaternion(new THREE.Quaternion())).normalize();
  const meshes: THREE.Mesh[] = [];
  visual.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh && mesh.visible && mesh.geometry?.getAttribute("position")) meshes.push(mesh);
  });
  // The centre line is the middle of the prop's own cross-section box, not the
  // mean of its vertices: a UV seam duplicates a whole column of vertices and
  // would drag a vertex mean off the shaft, inflating the measured width.
  const across = new THREE.Vector3(1, 0, 0).cross(axis);
  const right = (across.lengthSq() > 1e-8 ? across : new THREE.Vector3(0, 0, 1).cross(axis)).normalize();
  const up = axis.clone().cross(right).normalize();
  const vertex = new THREE.Vector3(), offset = new THREE.Vector3();
  const span = { along: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
    right: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
    up: [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY] };
  let vertexCount = 0;
  const origin = new THREE.Vector3();
  for (const mesh of meshes) {
    const count = mesh.geometry.getAttribute("position").count;
    for (let index = 0; index < count; index += 1) {
      offset.copy(mesh.getVertexPosition(index, vertex).applyMatrix4(mesh.matrixWorld));
      if (!vertexCount) origin.copy(offset);
      offset.sub(origin);
      for (const [key, basis] of [["along", axis], ["right", right], ["up", up]] as const) {
        const value = offset.dot(basis);
        span[key][0] = Math.min(span[key][0]!, value); span[key][1] = Math.max(span[key][1]!, value);
      }
      vertexCount += 1;
    }
  }
  if (!vertexCount) throw new Error("Emitted arrow has no measurable rendered geometry.");
  const centre = origin.clone()
    .addScaledVector(right, (span.right[0]! + span.right[1]!) / 2)
    .addScaledVector(up, (span.up[0]! + span.up[1]!) / 2);
  let maxRadius = 0;
  for (const mesh of meshes) {
    const count = mesh.geometry.getAttribute("position").count;
    for (let index = 0; index < count; index += 1) {
      offset.copy(mesh.getVertexPosition(index, vertex).applyMatrix4(mesh.matrixWorld)).sub(centre);
      maxRadius = Math.max(maxRadius, offset.addScaledVector(axis, -offset.dot(axis)).length());
    }
  }
  const lengthMeters = span.along[1]! - span.along[0]!;
  const headBuryMeters = 2 * maxRadius;
  const maxTravelMeters = Math.max(headBuryMeters, lengthMeters / 2);
  return Object.freeze({ lengthMeters, maxRadiusMeters: maxRadius, headBuryMeters, maxTravelMeters, vertexCount,
    evidence: `arrow ${lengthMeters.toFixed(4)} m long, widest cross-section ${(2 * maxRadius).toFixed(4)} m,`
      + ` measured over ${vertexCount} rendered vertices about its own +Y flight axis` });
}

/**
 * How far the arrow keeps travelling after the measured contact.
 *
 * It has to bury its widest leading cross-section, `headBuryMeters`, measured
 * perpendicular to the struck surface. A shot that arrives obliquely has to
 * travel further along its own shaft to sink the same perpendicular depth, which
 * is the 1/cos of the angle between the flight line and the measured surface
 * normal. A grazing shot would ask for an unbounded slide, so the travel stops
 * at the arrow's own midpoint: past that the protruding stub is shorter than the
 * buried part and it stops reading as an arrow standing in a body.
 */
export function reviewArrowPenetrationMeters(metrics: ReviewArrowMetrics,
  flightDirection: THREE.Vector3, surfaceNormal: THREE.Vector3): number {
  const direction = flightDirection.clone(), normal = surfaceNormal.clone();
  if (direction.lengthSq() <= 1e-12 || normal.lengthSq() <= 1e-12) return metrics.maxTravelMeters;
  const cosine = Math.abs(direction.normalize().dot(normal.normalize()));
  if (!Number.isFinite(cosine) || cosine <= 0) return metrics.maxTravelMeters;
  return Math.min(metrics.headBuryMeters / cosine, metrics.maxTravelMeters);
}

/**
 * How long the arrow stays. It has to outlive the quickest hit reaction the
 * struck rig actually owns, so the arrow is seen riding a whole reaction rather
 * than a fragment of one, and it is never briefer than the flight it just made:
 * an arrow that is in the air longer than it is in the body reads as a miss.
 * The ceiling above stops it running into the next exchange.
 */
export function reviewPlantedArrowDwellSeconds(target: ReviewActorAdapter, flightSeconds: number): number {
  if (!Number.isFinite(flightSeconds) || flightSeconds <= 0) throw new Error("Planted arrow dwell needs the real flight window.");
  const reactions = target.actions()
    .filter((action) => action.semantic === "reaction" && !action.unavailableReason
      && Number.isFinite(action.durationSeconds) && action.durationSeconds > 0)
    .map((action) => action.durationSeconds);
  const quickest = reactions.length ? Math.min(...reactions) : flightSeconds;
  return Math.min(REVIEW_PLANTED_ARROW_MAX_DWELL_SECONDS, Math.max(flightSeconds, quickest));
}

export interface ReviewStruckBone {
  /** What the arrow is parented to. A rig bone when one drives the struck skin. */
  readonly object: THREE.Object3D;
  readonly boneName: string | null;
  /** True when no rig bone could be read and the model root carries the arrow. */
  readonly degraded: boolean;
  readonly weight: number;
  readonly evidence: string;
}

/**
 * The bone the struck triangle actually hangs off, read from the rig's own skin
 * weights at the measured vertices. No bone-name table: the human target, the
 * Breachlings and the Wardens all name their bones differently and none of those
 * names appear here. Anything the rig cannot answer - an unskinned mesh, missing
 * skin attributes, a weight pointing past the end of the skeleton - falls back
 * to the actor's model root, which still carries the body's placement.
 */
export function reviewStruckBone(target: ReviewActorAdapter, anchor: ReviewSurfaceAnchor): ReviewStruckBone {
  const degraded = (evidence: string): ReviewStruckBone =>
    ({ object: target.model, boneName: null, degraded: true, weight: 0, evidence });
  const mesh = target.model.getObjectByProperty("uuid", anchor.meshId) as THREE.SkinnedMesh | undefined;
  if (!mesh?.isMesh) return degraded("Struck mesh is no longer in the target model; planted on the model root.");
  const bones = mesh.isSkinnedMesh ? mesh.skeleton?.bones : undefined;
  const skinIndex = mesh.geometry.getAttribute("skinIndex");
  const skinWeight = mesh.geometry.getAttribute("skinWeight");
  if (!bones?.length || !skinIndex || !skinWeight) {
    return degraded("Struck mesh carries no rig skin weights; planted on the model root.");
  }
  const totals = new Map<number, number>();
  for (const [corner, vertex] of anchor.vertexIndices.entries()) {
    if (vertex >= skinIndex.count || vertex >= skinWeight.count) continue;
    const share = Math.max(0, anchor.barycentric[corner] ?? 0);
    for (let slot = 0; slot < Math.min(4, skinIndex.itemSize, skinWeight.itemSize); slot += 1) {
      const bone = skinIndex.getComponent(vertex, slot);
      const weight = skinWeight.getComponent(vertex, slot) * share;
      if (!Number.isInteger(bone) || bone < 0 || !Number.isFinite(weight) || weight <= 0) continue;
      totals.set(bone, (totals.get(bone) ?? 0) + weight);
    }
  }
  let best = -1, bestWeight = 0;
  for (const [bone, weight] of totals) if (weight > bestWeight) { best = bone; bestWeight = weight; }
  const bone = best >= 0 ? bones[best] : undefined;
  if (!bone) return degraded("No rig bone drives the struck triangle; planted on the model root.");
  return { object: bone, boneName: bone.name || null, degraded: false, weight: bestWeight,
    evidence: `struck skin is driven by rig bone ${bone.name || `#${best}`} at weight ${bestWeight.toFixed(4)}` };
}

export type ReviewPlantedArrowState = "pending" | "planted" | "fading" | "expired" | "retired";

export interface ReviewPlantedArrow {
  readonly id: string;
  readonly boneName: string | null;
  /** True when the rig could not name a bone and the model root carries the arrow. */
  readonly boneDegraded: boolean;
  readonly boneEvidence: string;
  readonly metrics: ReviewArrowMetrics;
  readonly penetrationMeters: number;
  readonly plantedAtSeconds: number;
  readonly dwellSeconds: number;
  readonly fadeSeconds: number;
  /** Private immutable copy of the measured contact, exactly as the anchor owns it. */
  readonly event: ReviewEvent;
  state(timeSeconds: number): ReviewPlantedArrowState;
}

export interface ReviewPlantArrowOptions {
  readonly id: string;
  /** The actual emitted arrow. Borrowed: never disposed, always handed back. */
  readonly visual: THREE.Object3D;
  /** Where the fixed flight put the arrow at the confirmed contact time. */
  readonly contactPosition: THREE.Vector3;
  /** World orientation of the arrow on that flight, kept through the plant. */
  readonly flightQuaternion: THREE.Quaternion;
  readonly flightDirection: THREE.Vector3;
  readonly flightSeconds: number;
  readonly event: ReviewEvent;
}

export interface ReviewPlantedArrows {
  readonly target: ReviewActorAdapter;
  readonly cap: number;
  readonly arrows: readonly ReviewPlantedArrow[];
  plant(options: ReviewPlantArrowOptions): ReviewPlantedArrow;
  update(timeSeconds: number): void;
  retire(arrow: ReviewPlantedArrow): void;
  dispose(): void;
}

interface MaterialSwap {
  readonly mesh: THREE.Mesh;
  readonly original: THREE.Material | THREE.Material[];
  readonly clones: readonly THREE.Material[];
  readonly baseOpacity: readonly number[];
}

interface Entry {
  readonly handle: ReviewPlantedArrow;
  readonly visual: THREE.Object3D;
  readonly attachment: ReviewImpactAttachment;
  readonly bone: THREE.Object3D;
  readonly plantWorldScale: THREE.Vector3;
  readonly swaps: readonly MaterialSwap[];
  readonly parentBefore: THREE.Object3D | null;
  readonly positionBefore: THREE.Vector3;
  readonly quaternionBefore: THREE.Quaternion;
  readonly scaleBefore: THREE.Vector3;
  readonly visibleBefore: boolean;
  attached: boolean;
  retired: boolean;
}

function swapMaterials(visual: THREE.Object3D): MaterialSwap[] {
  const swaps: MaterialSwap[] = [];
  visual.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    // The emitted arrow shares its materials with the nocked hand arrow and the
    // quiver bundle. Fading has to happen on owned copies or every other arrow
    // on the archer fades with it.
    const original = mesh.material;
    const source = Array.isArray(original) ? original : [original];
    const clones = source.map((material) => {
      const clone = material.clone();
      clone.transparent = true;
      return clone;
    });
    mesh.material = Array.isArray(original) ? clones : clones[0]!;
    swaps.push({ mesh, original, clones, baseOpacity: source.map((material) => material.opacity) });
  });
  return swaps;
}

function setPlantOpacity(swaps: readonly MaterialSwap[], factor: number): void {
  for (const swap of swaps) {
    swap.clones.forEach((clone, index) => { clone.opacity = (swap.baseOpacity[index] ?? 1) * factor; });
  }
}

function restoreMaterials(swaps: readonly MaterialSwap[]): void {
  for (const swap of swaps) {
    swap.mesh.material = swap.original;
    for (const clone of swap.clones) clone.dispose();
  }
}

/**
 * One body's planted arrows. Created per target and shared by every projectile
 * set that plants into it, which is what makes the cap mean anything across
 * successive volleys.
 */
export function createReviewPlantedArrows(target: ReviewActorAdapter,
  options: { cap?: number } = {}): ReviewPlantedArrows {
  const cap = options.cap ?? REVIEW_PLANTED_ARROW_CAP;
  if (!Number.isInteger(cap) || cap < 1) throw new Error("Planted arrow cap must be a positive integer.");
  const entries: Entry[] = [];
  let disposed = false;
  const scratchScale = new THREE.Vector3(), scratchQuaternion = new THREE.Quaternion();
  const inverse = new THREE.Matrix4();

  const detach = (entry: Entry): void => {
    if (!entry.attached) return;
    entry.attached = false;
    entry.visual.removeFromParent();
    entry.parentBefore?.add(entry.visual);
    entry.visual.position.copy(entry.positionBefore);
    entry.visual.quaternion.copy(entry.quaternionBefore);
    entry.visual.scale.copy(entry.scaleBefore);
    setPlantOpacity(entry.swaps, 1);
    entry.visual.updateMatrixWorld(true);
  };

  const retireEntry = (entry: Entry): void => {
    if (entry.retired) return;
    detach(entry);
    entry.retired = true;
    restoreMaterials(entry.swaps);
    entry.attachment.dispose();
    entry.visual.visible = entry.visibleBefore;
    const index = entries.indexOf(entry);
    if (index >= 0) entries.splice(index, 1);
  };

  const quiver: ReviewPlantedArrows = {
    target,
    cap,
    get arrows() { return Object.freeze(entries.map((entry) => entry.handle)); },
    plant(request) {
      if (disposed) throw new Error("Planted arrow quiver has been disposed.");
      if (!request.id.trim()) throw new Error("A planted arrow needs its projectile id.");
      // Re-planting the same arrow, or the same projectile, replaces the older
      // plant first. Recording "where it came from" while it is still parented
      // to a bone would hand it back to the bone instead of to its owner.
      for (const existing of entries.filter((row) => row.visual === request.visual || row.handle.id === request.id)) {
        retireEntry(existing);
      }
      const metrics = measureReviewArrow(request.visual);
      const direction = request.flightDirection.clone();
      // A contact with no measured normal cannot be oblique to anything, so the
      // arrow buries straight down its own line.
      const normal = request.event.normal ? new THREE.Vector3().fromArray([...request.event.normal]) : direction.clone().negate();
      const penetrationMeters = reviewArrowPenetrationMeters(metrics, direction, normal);
      // The plant is baked into the surface attachment itself, so the sunk pose
      // is what rides the deformed skin rather than a per-frame nudge on top.
      const attachment = createReviewImpactAttachment({ target, event: request.event,
        projectilePosition: request.contactPosition.clone()
          .addScaledVector(direction.clone().normalize(), penetrationMeters),
        projectileQuaternion: request.flightQuaternion });
      let struck: ReviewStruckBone;
      try {
        struck = reviewStruckBone(target, attachment.event.surfaceAnchor!);
      } catch (error) { attachment.dispose(); throw error; }
      const dwellSeconds = reviewPlantedArrowDwellSeconds(target, request.flightSeconds);
      const fadeSeconds = dwellSeconds * REVIEW_PLANTED_ARROW_FADE_FRACTION;
      const plantedAtSeconds = request.event.timeSeconds;
      const handle: ReviewPlantedArrow = {
        id: request.id, boneName: struck.boneName, boneDegraded: struck.degraded,
        boneEvidence: struck.evidence, metrics, penetrationMeters,
        plantedAtSeconds, dwellSeconds, fadeSeconds, event: attachment.event,
        state(timeSeconds) {
          const entry = entries.find((row) => row.handle === handle);
          if (!entry || entry.retired) return "retired";
          const elapsed = timeSeconds - plantedAtSeconds;
          if (elapsed < 0) return "pending";
          if (elapsed < dwellSeconds) return "planted";
          if (elapsed < dwellSeconds + fadeSeconds) return "fading";
          return "expired";
        },
      };
      request.visual.updateWorldMatrix(true, false);
      entries.push({ handle, visual: request.visual, attachment, bone: struck.object,
        plantWorldScale: request.visual.getWorldScale(new THREE.Vector3()), swaps: swapMaterials(request.visual),
        parentBefore: request.visual.parent, positionBefore: request.visual.position.clone(),
        quaternionBefore: request.visual.quaternion.clone(), scaleBefore: request.visual.scale.clone(),
        visibleBefore: request.visual.visible, attached: false, retired: false });
      // Oldest first: the body shows the newest volley, never an accumulation.
      while (entries.length > cap) retireEntry(entries[0]!);
      return handle;
    },
    update(timeSeconds) {
      if (disposed) throw new Error("Planted arrow quiver has been disposed.");
      if (!Number.isFinite(timeSeconds)) throw new Error("Planted arrow sample time must be finite.");
      for (const entry of [...entries]) {
        const state = entry.handle.state(timeSeconds);
        if (state === "pending" || state === "retired") { detach(entry); continue; }
        if (state === "expired") {
          // Kept, not retired: a review scrub back before the dwell has to be
          // able to show the arrow in the body again.
          if (entry.attached) entry.visual.visible = false;
          continue;
        }
        const pose = entry.attachment.sample();
        if (!entry.attached) { entry.attached = true; entry.bone.add(entry.visual); }
        entry.bone.updateWorldMatrix(true, false);
        entry.visual.position.copy(pose.position).applyMatrix4(inverse.copy(entry.bone.matrixWorld).invert());
        entry.visual.quaternion.copy(entry.bone.getWorldQuaternion(scratchQuaternion).invert()).multiply(pose.quaternion);
        // The arrow keeps the size it flew at, whatever the struck rig is scaled to.
        entry.bone.getWorldScale(scratchScale);
        entry.visual.scale.set(entry.plantWorldScale.x / (scratchScale.x || 1),
          entry.plantWorldScale.y / (scratchScale.y || 1), entry.plantWorldScale.z / (scratchScale.z || 1));
        entry.visual.visible = true;
        const elapsed = timeSeconds - entry.handle.plantedAtSeconds;
        setPlantOpacity(entry.swaps, state === "fading" && entry.handle.fadeSeconds > 0
          ? Math.max(0, 1 - (elapsed - entry.handle.dwellSeconds) / entry.handle.fadeSeconds) : 1);
        entry.visual.updateMatrixWorld(true);
      }
    },
    retire(arrow) {
      const entry = entries.find((row) => row.handle === arrow);
      if (entry) retireEntry(entry);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const entry of [...entries]) retireEntry(entry);
      if (registry.get(target) === quiver) registry.delete(target);
    },
  };
  return quiver;
}

const registry = new WeakMap<ReviewActorAdapter, ReviewPlantedArrows>();

/** The one quiver a body carries, so the cap holds across separate volleys. */
export function reviewPlantedArrowsFor(target: ReviewActorAdapter): ReviewPlantedArrows {
  let quiver = registry.get(target);
  if (!quiver) { quiver = createReviewPlantedArrows(target); registry.set(target, quiver); }
  return quiver;
}
