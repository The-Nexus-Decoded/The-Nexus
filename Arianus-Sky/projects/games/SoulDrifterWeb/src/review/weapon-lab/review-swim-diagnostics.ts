import * as THREE from "three";
import type { CombatReviewSnapshot, CombatSlot } from "./combat-review-controller";
import { reviewContactSourceToken } from "./combat-review-contact-profiles";
import { sampleReviewPoses } from "./combat-review-posing";
import { createReviewMeshProbe, type ReviewMeshProbe } from "./combat-review-probes";
import type { ReviewActorAdapter } from "./combat-review-types";

export const REVIEW_SWIM_ACTIONS = Object.freeze({
  GapAuthored__SwimRunDiveWaterEntry: Object.freeze({ role: "WATER ENTRY DRAFT", durationSeconds: 3.2, approval: "draft" }),
  Interactions__HumanMasculineAthleticMuscularSwimForwardLoop: Object.freeze({ role: "FORWARD LOOP SOURCE", durationSeconds: 4.566667, approval: "source" }),
  Interactions__HumanMasculineAthleticMuscularSwimIdleTread: Object.freeze({ role: "TREAD LOOP SOURCE", durationSeconds: 3.033333, approval: "source" }),
  Interactions__HumanMasculineAthleticMuscularSwimToEdge: Object.freeze({ role: "EDGE-APPROACH SOURCE", durationSeconds: 5.033333, approval: "source" }),
} as const);
type ReviewSwimActionId = keyof typeof REVIEW_SWIM_ACTIONS;
const VOLUME_HALF_WIDTH = 4;
const VOLUME_HALF_DEPTH = 4;
const VOLUME_BOTTOM_OFFSET = -0.9;
const WATERLINE_OFFSET = 1.15;
const probes = new WeakMap<ReviewActorAdapter, ReviewMeshProbe>();
const fixed = (value: number, digits = 3) => Number(value.toFixed(digits));
const abortError = () => new DOMException("Swim diagnostic cancelled or source changed", "AbortError");

export interface ReviewSwimFrame {
  readonly actorId: string;
  readonly slot: CombatSlot;
  readonly actionId: ReviewSwimActionId;
  readonly durationSeconds: number;
  readonly timeSeconds: number;
  readonly role: string;
  readonly approval: "source" | "draft";
}

export interface ReviewSwimPoseDiagnostic {
  readonly state: "outside" | "partial" | "inside" | "below-volume" | "unavailable";
  readonly label: string;
  readonly sampledInside: number;
  readonly sampledTotal: number;
  readonly hipsToWaterlineMeters: number | null;
  readonly startPlaneMeters: number | null;
  readonly endPlaneMeters: number | null;
  readonly sourceToken: string;
}

export interface ReviewSwimSurvey {
  readonly actorId: string;
  readonly actionId: ReviewSwimActionId;
  readonly sampleCount: number;
  readonly firstVolumeSeconds: number | null;
  readonly firstWaterlineSeconds: number | null;
  readonly firstEndPlaneSeconds: number | null;
  readonly reverseTravelMeters: number;
  readonly loopSeamResidualMeters: number;
  readonly maximumInside: number;
  readonly sampledTotal: number;
  readonly sourceToken: string;
}

export interface ReviewSwimVolume {
  readonly root: THREE.Group;
  recenter(actor: ReviewActorAdapter): void;
  bounds(target?: THREE.Box3): THREE.Box3;
  dispose(): void;
}

function profile(actionId: string) {
  return REVIEW_SWIM_ACTIONS[actionId as ReviewSwimActionId];
}

function actionSourceToken(actor: ReviewActorAdapter, actionId: string): string {
  const action = actor.actions().find((entry) => entry.id === actionId);
  return JSON.stringify([reviewContactSourceToken(actor), action?.id, action?.durationSeconds, action?.approvalStatus]);
}

function swimProbe(actor: ReviewActorAdapter): ReviewMeshProbe {
  let probe = probes.get(actor);
  if (!probe) { probe = createReviewMeshProbe(actor.model, { maximumVertices: 128 }); probes.set(actor, probe); }
  return probe;
}

function unavailable(reason: string): ReviewSwimPoseDiagnostic {
  return { state: "unavailable", sampledInside: 0, sampledTotal: 0, hipsToWaterlineMeters: null,
    startPlaneMeters: null, endPlaneMeters: null, sourceToken: "",
    label: `Swim diagnostic UNAVAILABLE — ${reason} No body percentage, buoyancy, collision, water physics, exit or gameplay approval is inferred.` };
}

function exactAction(actor: ReviewActorAdapter, actionId: string) {
  const expected = profile(actionId), action = actor.actions().find((entry) => entry.id === actionId);
  if (!expected || !action || action.unavailableReason || !Number.isFinite(action.durationSeconds)
    || Math.abs(action.durationSeconds - expected.durationSeconds) > 0.002) return null;
  return { expected, action };
}

function planes(actor: ReviewActorAdapter, volume: THREE.Box3, hips: THREE.Vector3) {
  const center = volume.getCenter(new THREE.Vector3()), half = volume.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(actor.root.getWorldQuaternion(new THREE.Quaternion()));
  forward.y = 0;
  if (forward.lengthSq() < 1e-10) return null;
  forward.normalize();
  const extent = Math.abs(forward.x) * half.x + Math.abs(forward.z) * half.z;
  const progress = hips.clone().sub(center).dot(forward);
  return { forward, progress, start: progress + extent, end: extent - progress };
}

/** One fixed, analytical AABB around the selected actor. It is deliberately a
 * wireframe/waterline diagnostic, not a water material, collider or buoyancy volume.
 */
export function createReviewSwimVolume(): ReviewSwimVolume {
  const root = new THREE.Group(); root.name = "diagnostic-swim-volume"; root.visible = false;
  const height = WATERLINE_OFFSET - VOLUME_BOTTOM_OFFSET;
  const boxGeometry = new THREE.BoxGeometry(VOLUME_HALF_WIDTH * 2, height, VOLUME_HALF_DEPTH * 2);
  const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x55d9ff, wireframe: true, transparent: true, opacity: 0.34 });
  const box = new THREE.Mesh(boxGeometry, boxMaterial); box.name = "diagnostic-swim-aabb";
  box.position.y = (WATERLINE_OFFSET + VOLUME_BOTTOM_OFFSET) / 2;
  const planeGeometry = new THREE.PlaneGeometry(VOLUME_HALF_WIDTH * 2, VOLUME_HALF_DEPTH * 2);
  const planeMaterial = new THREE.MeshBasicMaterial({ color: 0x49c9f2, transparent: true, opacity: 0.13,
    depthWrite: false, side: THREE.DoubleSide });
  const waterline = new THREE.Mesh(planeGeometry, planeMaterial); waterline.name = "diagnostic-waterline";
  waterline.rotation.x = -Math.PI / 2; waterline.position.y = WATERLINE_OFFSET; root.add(box, waterline);
  let disposed = false;
  return {
    root,
    recenter(actor) {
      if (disposed) throw new Error("Swim diagnostic volume was disposed.");
      const anchor = actor.root.getWorldPosition(new THREE.Vector3());
      if (![anchor.x, anchor.y, anchor.z].every(Number.isFinite)) throw new Error("Swim diagnostic actor placement is nonfinite.");
      root.position.copy(anchor); root.updateMatrixWorld(true);
    },
    bounds(target = new THREE.Box3()) {
      if (disposed) return target.makeEmpty();
      return target.set(
        new THREE.Vector3(root.position.x - VOLUME_HALF_WIDTH, root.position.y + VOLUME_BOTTOM_OFFSET, root.position.z - VOLUME_HALF_DEPTH),
        new THREE.Vector3(root.position.x + VOLUME_HALF_WIDTH, root.position.y + WATERLINE_OFFSET, root.position.z + VOLUME_HALF_DEPTH));
    },
    dispose() { if (!disposed) { disposed = true; root.removeFromParent(); boxGeometry.dispose(); boxMaterial.dispose(); planeGeometry.dispose(); planeMaterial.dispose(); } },
  };
}

export function reviewSwimFrame(snapshot: CombatReviewSnapshot): ReviewSwimFrame | null {
  if (!snapshot.active || !snapshot.ready || !snapshot.frame) return null;
  const slotIndex = snapshot.slots.findIndex((entry) => entry.definitionId === "human:environment" && profile(entry.selected.action));
  if (slotIndex < 0) return null;
  const slot = snapshot.slots[slotIndex]!, action = slot.actions.find((entry) => entry.id === slot.selected.action);
  const expected = profile(slot.selected.action), actorId = snapshot.frame.actors[slotIndex]?.actorId;
  if (!expected || !action || !actorId || Math.abs(action.durationSeconds - expected.durationSeconds) > 0.002) return null;
  return { actorId, slot: slot.slot, actionId: action.id as ReviewSwimActionId, durationSeconds: action.durationSeconds,
    timeSeconds: Math.min(snapshot.frame.timeSeconds, action.durationSeconds), role: expected.role, approval: expected.approval };
}

/** Current-pose sampled vertices only. Counts are never described as body percentage. */
export function measureReviewSwimPose(actor: ReviewActorAdapter | null, frame: ReviewSwimFrame | null,
  volume: ReviewSwimVolume): ReviewSwimPoseDiagnostic {
  if (!frame) return unavailable("Select Human · Environmental interactions and one of the four registered swim actions.");
  if (!actor || actor.instanceId !== frame.actorId) return unavailable(`Actor ${frame.slot.toUpperCase()} is not available for this shared-clock sample.`);
  const binding = exactAction(actor, frame.actionId);
  if (!binding) return unavailable("The selected action ID, duration or source availability does not match the pinned swim review profile.");
  const probe = swimProbe(actor);
  if (probe.unavailableReason) return unavailable(probe.unavailableReason);
  const points = probe.sample(), bounds = volume.bounds();
  if (!points.length || bounds.isEmpty()) return unavailable("No rendered actor vertices or finite diagnostic volume are available.");
  const hips = new THREE.Vector3();
  if (!actor.socketWorld?.("Hips", hips) || ![hips.x, hips.y, hips.z].every(Number.isFinite)) return unavailable("The exact Hips socket is unavailable.");
  const plane = planes(actor, bounds, hips);
  if (!plane) return unavailable("The actor has no finite horizontal forward axis.");
  const inside = points.filter((point) => bounds.containsPoint(point.position)).length;
  const state = hips.y < bounds.min.y ? "below-volume" : inside === 0 ? "outside" : inside === points.length ? "inside" : "partial";
  const hipsLine = hips.y - bounds.max.y;
  return { state, sampledInside: inside, sampledTotal: points.length, hipsToWaterlineMeters: hipsLine,
    startPlaneMeters: plane.start, endPlaneMeters: plane.end, sourceToken: actionSourceToken(actor, frame.actionId),
    label: `${frame.role} · ${state.toUpperCase()} · shared time ${fixed(frame.timeSeconds)} / ${fixed(frame.durationSeconds)} s · sampled vertices inside diagnostic volume ${inside}/${points.length} · Hips-to-waterline ${fixed(hipsLine)} m · start-plane ${fixed(plane.start)} m · end-plane ${fixed(plane.end)} m. Single-pose diagnostic only; no body percentage, buoyancy, collision, water physics, exit or gameplay approval.` };
}

/** Absolute 30 Hz source survey. Every yielded frame restores the caller's
 * latest shared-clock pose so authoring samples never become visible playback.
 */
export async function surveyReviewSwim(actor: ReviewActorAdapter, frame: ReviewSwimFrame,
  volume: ReviewSwimVolume, options: { restore: () => void; signal?: AbortSignal; samplesPerSecond?: number }): Promise<ReviewSwimSurvey> {
  if (typeof options?.restore !== "function") throw new Error("Swim survey requires a current-pose restore callback.");
  const rate = options.samplesPerSecond ?? 30;
  if (!Number.isFinite(rate) || rate < 8 || rate > 120) throw new Error("Swim sampling must be 8–120 Hz.");
  const binding = exactAction(actor, frame.actionId);
  if (!binding || actor.instanceId !== frame.actorId) throw new Error("Swim survey source does not match the selected actor/action.");
  const count = Math.ceil(binding.action.durationSeconds * rate), sourceToken = actionSourceToken(actor, frame.actionId);
  let firstVolume: number | null = null, firstWaterline: number | null = null, firstEnd: number | null = null;
  let previousLine: number | null = null, previousProgress: number | null = null, reverse = 0, maximumInside = 0;
  let firstHips: THREE.Vector3 | null = null, lastHips: THREE.Vector3 | null = null, sampledTotal = 0;
  try {
    for (let index = 0; index <= count; index++) {
      if (options.signal?.aborted) throw abortError();
      const time = binding.action.durationSeconds * index / count;
      sampleReviewPoses(actor, [{ actionId: frame.actionId, timeSeconds: time, weight: 1 }]);
      if (actionSourceToken(actor, frame.actionId) !== sourceToken) throw abortError();
      const sample = measureReviewSwimPose(actor, { ...frame, timeSeconds: time }, volume);
      if (sample.state === "unavailable" || sample.hipsToWaterlineMeters == null || sample.endPlaneMeters == null) {
        throw new Error(sample.label);
      }
      const hips = new THREE.Vector3(); actor.socketWorld!("Hips", hips);
      const plane = planes(actor, volume.bounds(), hips)!;
      firstHips ??= hips.clone(); lastHips = hips.clone(); sampledTotal = sample.sampledTotal;
      maximumInside = Math.max(maximumInside, sample.sampledInside);
      if (firstVolume == null && sample.sampledInside > 0) firstVolume = time;
      if (firstWaterline == null && (sample.hipsToWaterlineMeters === 0 || previousLine != null
        && previousLine * sample.hipsToWaterlineMeters < 0)) firstWaterline = time;
      if (firstEnd == null && sample.endPlaneMeters <= 0) firstEnd = time;
      if (previousProgress != null && plane.progress < previousProgress) reverse += previousProgress - plane.progress;
      previousProgress = plane.progress; previousLine = sample.hipsToWaterlineMeters;
      if (index % 8 === 7) { options.restore(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
    }
    return Object.freeze({ actorId: actor.instanceId, actionId: frame.actionId, sampleCount: count + 1,
      firstVolumeSeconds: firstVolume, firstWaterlineSeconds: firstWaterline, firstEndPlaneSeconds: firstEnd,
      reverseTravelMeters: fixed(reverse, 6), loopSeamResidualMeters: fixed(firstHips!.distanceTo(lastHips!), 6),
      maximumInside, sampledTotal, sourceToken });
  } finally { options.restore(); }
}
