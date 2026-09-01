import * as THREE from "three";
import type { CombatReviewSnapshot, CombatSlot } from "./combat-review-controller";
import { createReviewMeshProbe, measureReviewProbeContact, type ReviewMeshProbe } from "./combat-review-probes";
import type { ReviewActorAdapter } from "./combat-review-types";
import type { ReviewPropInstance } from "./review-prop-factory";

export const REVIEW_PROP_CONTACT_TOLERANCE_METERS = 0.008;

export interface ReviewPropInteractionFrame {
  readonly actorId: string;
  readonly actionId: string;
  readonly slot: CombatSlot;
  readonly timeSeconds: number;
  readonly phase: number;
  readonly phaseLabel: "before hasp" | "hasp rotation" | "between joints" | "lid rotation" | "approach"
    | "handle reach" | "leaf rotation" | "open hold" | "initial grip" | "alternating climb" | "settle";
  readonly contactParts: "hands" | "hands-feet";
  readonly joints: Readonly<Record<string, number>>;
}

export interface ReviewPropInteractionDiagnostic {
  readonly state: "contact" | "clear" | "unavailable";
  readonly label: string;
  readonly contactClearanceMeters: number | null;
  readonly rootClearanceMeters: number | null;
  readonly facingErrorDegrees: number | null;
  readonly evidence: string | null;
}

const handProbes = new WeakMap<ReviewActorAdapter, ReviewMeshProbe>();
const climbProbes = new WeakMap<ReviewActorAdapter, ReviewMeshProbe>();
const smoothstep = (phase: number, start: number, end: number): number => {
  const value = Math.max(0, Math.min(1, (phase - start) / (end - start)));
  return value * value * (3 - 2 * value);
};
const unavailable = (reason: string): ReviewPropInteractionDiagnostic => ({ state: "unavailable",
  label: `Interaction diagnostic UNAVAILABLE — ${reason} No actor contact, gameplay, damage, climbing or destruction approval is inferred.`,
  contactClearanceMeters: null, rootClearanceMeters: null, facingErrorDegrees: null, evidence: null });
const fixed = (value: number, digits = 3) => Number(value.toFixed(digits));
const terminalBoneNames = (root: THREE.Object3D, suffixes: readonly string[]): readonly string[] => {
  const names: string[] = [];
  root.traverse((object) => {
    if (!(object as THREE.Bone).isBone) return;
    const normalized = object.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (suffixes.some((suffix) => normalized.endsWith(suffix))) names.push(object.name);
  });
  return Object.freeze(names);
};
const reviewContactProbe = (actor: ReviewActorAdapter, parts: ReviewPropInteractionFrame["contactParts"]): ReviewMeshProbe => {
  const cache = parts === "hands-feet" ? climbProbes : handProbes;
  let probe = cache.get(actor);
  if (!probe) {
    // Bind the actual terminal hand bones without assuming a rig prefix such as
    // Mixamo's `mixamorig`, while excluding all descendant finger joints.
    const suffixes = parts === "hands-feet" ? ["lefthand", "righthand", "leftfoot", "rightfoot"] : ["lefthand", "righthand"];
    probe = createReviewMeshProbe(actor.model, { bones: terminalBoneNames(actor.model, suffixes), minimumWeight: .25,
      maximumVertices: parts === "hands-feet" ? 128 : 96 });
    cache.set(actor, probe);
  }
  return probe;
};
const matchesInteraction = (propKind: string, actionId: string): boolean => propKind === "chest"
  ? actionId.endsWith("OpenChestLid")
  : propKind === "door" ? actionId.endsWith("OpenDoorInward") || actionId.endsWith("OpenDoorOutward")
    : propKind === "tree" && actionId.endsWith("ClimbRopeHandsFeet");

/** Source-timed prop pose on the controller's shared clock. It is not hand IK,
 * collision response or gameplay state. The actor ID is taken from the same
 * actor-frame ordering that the controller samples, never from a second timer.
 */
export function reviewPropInteractionFrame(propKind: string, snapshot: CombatReviewSnapshot): ReviewPropInteractionFrame | null {
  if (!snapshot.active || !snapshot.ready || !snapshot.frame) return null;
  const slotIndex = snapshot.slots.findIndex((entry) => entry.definitionId === "human:environment"
    && matchesInteraction(propKind, entry.selected.action));
  if (slotIndex < 0) return null;
  const slot = snapshot.slots[slotIndex]!;
  const action = slot.actions.find((entry) => entry.id === slot.selected.action);
  const actorId = snapshot.frame.actors[slotIndex]?.actorId;
  if (!action || action.durationSeconds <= 0 || !actorId) return null;
  const timeSeconds = Math.min(snapshot.frame.timeSeconds, action.durationSeconds);
  const phase = Math.max(0, Math.min(1, timeSeconds / action.durationSeconds));
  if (propKind === "tree") {
    const phaseLabel = phase < .18 ? "initial grip" : phase < .82 ? "alternating climb" : "settle";
    return { actorId, actionId: action.id, slot: slot.slot, timeSeconds, phase, phaseLabel,
      contactParts: "hands-feet", joints: Object.freeze({}) };
  }
  if (propKind === "door") {
    const phaseLabel = phase < .22 ? "approach" : phase < .42 ? "handle reach" : phase < .74 ? "leaf rotation" : "open hold";
    const direction = action.id.endsWith("OpenDoorOutward") ? -1 : 1;
    return { actorId, actionId: action.id, slot: slot.slot, timeSeconds, phase, phaseLabel, contactParts: "hands",
      joints: Object.freeze({ leaf: direction * 110 * smoothstep(phase, .42, .74) }) };
  }
  const phaseLabel = phase < .19 ? "before hasp" : phase < .28 ? "hasp rotation" : phase < .32
    ? "between joints" : phase < .66 ? "lid rotation" : "open hold";
  return { actorId, actionId: action.id, slot: slot.slot, timeSeconds, phase, phaseLabel, contactParts: "hands",
    joints: Object.freeze({ hasp: 60 * smoothstep(phase, .19, .28), lid: 105 * smoothstep(phase, .32, .66) }) };
}

/** Bind the source-topology hand selection when the controller first emits the
 * interaction sequence (normally time zero), independent of later prop spawn.
 */
export function prepareReviewPropInteractionActor(actor: ReviewActorAdapter,
  parts: ReviewPropInteractionFrame["contactParts"] = "hands"): string | null {
  try { return reviewContactProbe(actor, parts).unavailableReason ?? null; }
  catch (error) { return error instanceof Error ? error.message : String(error); }
}

/** Current-pose diagnostic only. It reuses the shared rendered hand probes and
 * deformed prop triangles, and deliberately does not turn proximity into an
 * interaction event, damage result or continuous-contact certificate.
 */
export function measureReviewPropInteraction(prop: ReviewPropInstance, actor: ReviewActorAdapter | null,
  frame: ReviewPropInteractionFrame | null): ReviewPropInteractionDiagnostic {
  if (!frame) return unavailable(`Select Human · Environmental interactions and a source ${prop.definition.kind === "door"
    ? "Open door inward/outward" : prop.definition.kind === "tree" ? "Climb rope hands/feet" : "Open chest lid"} action.`);
  if (!actor || actor.instanceId !== frame.actorId) return unavailable(`Actor ${frame.slot.toUpperCase()} is not available for this shared-clock sample.`);
  try {
    const probe = reviewContactProbe(actor, frame.contactParts);
    if (probe.unavailableReason) return unavailable(probe.unavailableReason);
    const surface = prop.contactSurface, surfaceState = surface.update();
    if (!surfaceState.meshes || surfaceState.unsupportedMeshIds.length) {
      return unavailable("The selected prop does not expose a complete supported triangle surface.");
    }
    const points = probe.sample();
    if (!points.length) return unavailable("The current actor pose has no visible rendered hand-skin probes.");
    const contact = measureReviewProbeContact([], points, surface, REVIEW_PROP_CONTACT_TOLERANCE_METERS);
    if (contact && !contact.contact.surfaceAnchor) return unavailable("The nearest triangle has no stable surface anchor.");
    let nearest = Infinity;
    for (const point of points) nearest = Math.min(nearest, surface.closest(point.position)?.distance ?? Infinity);
    if (!Number.isFinite(nearest)) return unavailable("No solid prop triangle could be measured from the rendered hands.");
    const actorRoot = actor.root.getWorldPosition(new THREE.Vector3());
    const rootClearance = surface.closest(actorRoot)?.distance ?? null;
    const target = prop.bounds().getCenter(new THREE.Vector3()).sub(actorRoot); target.y = 0;
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(actor.root.getWorldQuaternion(new THREE.Quaternion())); forward.y = 0;
    const facingError = target.lengthSq() > 1e-12 && forward.lengthSq() > 1e-12
      ? THREE.MathUtils.radToDeg(forward.angleTo(target)) : null;
    const state = contact ? "contact" : "clear";
    const contactLabel = contact ? `CONTACT SAMPLE ≤ ${REVIEW_PROP_CONTACT_TOLERANCE_METERS * 1000} mm`
      : `NO CONTACT at ${REVIEW_PROP_CONTACT_TOLERANCE_METERS * 1000} mm tolerance`;
    const skinLabel = frame.contactParts === "hands-feet" ? "rendered hand/foot skin" : "rendered hand skin";
    const rootLabel = rootClearance == null ? "root-to-solid unavailable" : `root-to-solid ${fixed(rootClearance)} m`;
    const facingLabel = facingError == null ? "facing unavailable" : `facing error ${fixed(facingError, 1)}°`;
    return { state, contactClearanceMeters: nearest, rootClearanceMeters: rootClearance,
      facingErrorDegrees: facingError, evidence: contact?.contact.evidence ?? null,
      label: `${contactLabel} · Actor ${frame.slot.toUpperCase()} → ${prop.instanceId} · shared time ${fixed(frame.timeSeconds)} s (${fixed(frame.phase * 100, 1)}%, ${frame.phaseLabel}) · nearest ${skinLabel} ${fixed(nearest * 1000, 1)} mm · ${rootLabel} · ${facingLabel}. Single-pose deformed-triangle evidence only; no continuous contact, gameplay, damage, climbing or destruction approval.` };
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : String(error));
  }
}
