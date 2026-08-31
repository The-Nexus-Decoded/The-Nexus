import * as THREE from "three";
// @ts-expect-error Reuse the existing full-rig lookup, not a second name-normalization policy.
import { findBone } from "./human-review-actor.js";
import { MOB_CATALOG } from "./mobs-stage";
import { reviewContactSourceToken } from "./combat-review-contact-profiles";
import { reviewRenderedVertexIndices } from "./combat-review-contact";
import { sampleReviewPoses } from "./combat-review-posing";
import type { ReviewAction, ReviewActorAdapter, ReviewLocomotionCapability } from "./combat-review-types";

interface SourceActor extends ReviewActorAdapter {
  clips?: Map<string, THREE.AnimationClip>;
  snapshot?(): { loadoutId?: string; mode?: string };
  definition?: { sha256?: string };
  getCalibration?(): unknown;
  calibration?(): { controls?: unknown };
}
interface SkinInfluence { vertexCount: number; maxWeight: number; totalWeight: number }
interface Rig { anchor: THREE.Bone; limbs: { id: string; bones: THREE.Bone[]; distalSkinInfluence: SkinInfluence }[] }
const MINIMUM_DISTAL_WEIGHT = 0.05;
const MINIMUM_DISTAL_VERTICES = 3;
type Tuple = readonly [number, number, number];
const tuple = (value: THREE.Vector3): Tuple => Object.freeze(value.toArray()) as Tuple;
const abortError = () => new DOMException("Locomotion measurement cancelled or source changed", "AbortError");

/** The actor already applies the shared loadout/catalog capability policy. */
export function reviewLocomotionActions(actor: ReviewActorAdapter): readonly ReviewAction[] {
  return Object.freeze(actor.actions().filter((action) => action.semantic === "walk" || action.semantic === "run"));
}

/** Exact current clip values for humans; pinned source receipt for closed creature adapters.
 * This is an in-memory invalidation token, not a claimed asset SHA or approval receipt.
 */
export function reviewLocomotionSourceToken(actor: ReviewActorAdapter, actionId: string): string {
  const source = actor as SourceActor, clip = source.clips?.get(actionId), state = source.snapshot?.();
  const action = actor.actions().find((entry) => entry.id === actionId);
  return JSON.stringify([reviewContactSourceToken(actor), state?.loadoutId, state?.mode,
    action?.id, action?.durationSeconds, action?.semantic,
    clip?.tracks.map((track) => [track.name, track.getInterpolation(), Array.from(track.times), Array.from(track.values)])]);
}

function rigFor(actor: SourceActor): Rig | null {
  const bones = new Map<string, THREE.Bone>(), influences = new Map<THREE.Bone, SkinInfluence>();
  actor.model.traverse((node) => { if ((node as THREE.Bone).isBone) bones.set(node.name, node as THREE.Bone); });
  actor.model.traverse((node) => {
    const mesh = node as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    const indices = mesh.geometry.getAttribute("skinIndex"), weights = mesh.geometry.getAttribute("skinWeight");
    if (!indices || !weights) return;
    for (const vertex of reviewRenderedVertexIndices(mesh)) {
      const combined = new Map<THREE.Bone, number>();
      for (let axis = 0; axis < 4; axis++) {
        const bone = mesh.skeleton.bones[indices.getComponent(vertex, axis)], weight = weights.getComponent(vertex, axis);
        if (bone && Number.isFinite(weight) && weight > 0) combined.set(bone, (combined.get(bone) ?? 0) + weight);
      }
      for (const [bone, weight] of combined) {
        const influence = influences.get(bone) ?? { vertexCount: 0, maxWeight: 0, totalWeight: 0 };
        if (weight >= MINIMUM_DISTAL_WEIGHT) influence.vertexCount++;
        influence.maxWeight = Math.max(influence.maxWeight, weight); influence.totalWeight += weight;
        influences.set(bone, influence);
      }
    }
  });
  // An unweighted upper joint still deforms its weighted descendants. A leaf
  // foot with no rendered influence does not pass this structural rig gate.
  const weighted = [...influences].filter(([, influence]) => influence.vertexCount >= MINIMUM_DISTAL_VERTICES).map(([bone]) => bone);
  const deforming = new Set(weighted);
  for (const bone of weighted) for (let parent = bone.parent; parent; parent = parent.parent) {
    if ((parent as THREE.Bone).isBone) deforming.add(parent as THREE.Bone);
  }
  const human = actor.definitionId === "human-foundation-pilot";
  const definition = MOB_CATALOG.find((entry) => entry.id === actor.definitionId);
  if (!human && (!definition || actor.definition?.sha256 !== definition.sha256)) return null;
  if (human && actor.snapshot?.().mode !== "equipment") return null;
  // GLTFLoader sanitizes punctuation (front_upper.L becomes front_upperL).
  // The existing shared lookup handles that without guessing another rig chain.
  const lookup = (name: string): THREE.Bone | undefined => findBone(bones, name);
  const anchor = lookup(human ? "Hips" : "pelvis");
  const chains = human ? [
    ["left-leg", "LeftUpLeg", "LeftLeg", "LeftFoot"], ["right-leg", "RightUpLeg", "RightLeg", "RightFoot"],
  ] : definition!.family === "breachling" ? [
    ["front-left", "front_upper.L", "front_lower.L", "front_hand.L"], ["front-right", "front_upper.R", "front_lower.R", "front_hand.R"],
    ["rear-left", "rear_thigh.L", "rear_shin.L", "rear_foot.L"], ["rear-right", "rear_thigh.R", "rear_shin.R", "rear_foot.R"],
  ] : [
    ["left-leg", "thigh_L", "lower_leg_L", "foot_L"], ["right-leg", "thigh_R", "lower_leg_R", "foot_R"],
  ];
  const limbs = chains.map(([id, ...names]) => {
    const chain = names.map(lookup), distal = chain[chain.length - 1];
    return { id: id!, bones: chain, distalSkinInfluence: distal && influences.get(distal) };
  });
  if (!anchor || limbs.some((limb) => limb.bones.some((bone) => !bone || !deforming.has(bone))
    || !limb.distalSkinInfluence || limb.distalSkinInfluence.vertexCount < MINIMUM_DISTAL_VERTICES)) return null;
  return { anchor, limbs: limbs as Rig["limbs"] };
}

/**
 * Source sampling only. Never writes a placement, reverses a clip, estimates an
 * arbitrary speed, or turns in-place gait into root travel. The caller restores
 * its newest clock pose, including after cancellation; intermediate poses are
 * restored before every yield so they cannot flash in the live renderer.
 */
export async function measureReviewLocomotion(actor: ReviewActorAdapter, actionId: string, options: {
  restore: () => void;
  signal?: AbortSignal;
  settleConstraints?: () => void;
  samplesPerSecond?: number;
}): Promise<ReviewLocomotionCapability> {
  if (typeof options?.restore !== "function") throw new Error("Locomotion measurement requires a current-pose restore callback.");
  const rate = options.samplesPerSecond ?? 30;
  if (!Number.isFinite(rate) || rate < 8 || rate > 120) throw new Error("Locomotion sampling must be 8–120 Hz.");
  const action = actor.actions().find((entry) => entry.id === actionId);
  const base = { actorId: actor.instanceId, definitionId: actor.definitionId, actionId,
    durationSeconds: action?.durationSeconds ?? 0, supportStatus: "unmeasured" as const };
  const unavailable = (reason: string): ReviewLocomotionCapability => Object.freeze({ ...base, status: "unavailable",
    canRepeatAuthoredTravel: false, sourceToken: "", anchorName: null, cycleDisplacement: tuple(new THREE.Vector3()),
    samples: Object.freeze([]), limbs: Object.freeze([]), loopPositionResidualMeters: null, loopRotationResidualRadians: null,
    evidence: "No transport was inferred; source motion and weighted foot support require explicit measurement.", unavailableReason: reason });
  if (!action || !["walk", "run"].includes(action.semantic) || action.unavailableReason
    || !Number.isFinite(action.durationSeconds) || action.durationSeconds <= 0 || action.durationSeconds > 20) {
    return unavailable("An available, bounded source walk/run action is required.");
  }
  const rig = rigFor(actor as SourceActor);
  if (!rig) return unavailable("No exact source/rig locomotion binding with complete independent leg chains and at least three rendered vertices of 0.05 distal weight.");
  const count = Math.ceil(action.durationSeconds * rate), samples: { timeSeconds: number; anchor: Tuple }[] = [];
  const limbBones = rig.limbs.flatMap((limb) => limb.bones), allBones: THREE.Bone[] = [];
  actor.model.traverse((node) => { if ((node as THREE.Bone).isBone) allBones.push(node as THREE.Bone); });
  const spans = limbBones.map(() => 0), starts: THREE.Quaternion[] = [], startPositions: THREE.Vector3[] = [];
  let sourceToken = "", calibrationToken: string | undefined, startAnchor = new THREE.Vector3(), displacement = new THREE.Vector3();
  let loopPosition = 0, loopRotation = 0;
  try {
    for (let index = 0; index <= count; index++) {
      if (options.signal?.aborted) throw abortError();
      const time = action.durationSeconds * index / count;
      sampleReviewPoses(actor, [{ actionId, timeSeconds: time, weight: 1 }], options.settleConstraints);
      const token = reviewLocomotionSourceToken(actor, actionId);
      const source = actor as SourceActor;
      const calibration = JSON.stringify(source.getCalibration?.() ?? source.calibration?.().controls);
      if (index && (token !== sourceToken || calibration !== calibrationToken)) throw abortError();
      if (!index) { sourceToken = token; calibrationToken = calibration; }
      const scale = actor.root.getWorldScale(new THREE.Vector3());
      const rotation = actor.root.getWorldQuaternion(new THREE.Quaternion());
      if (Math.min(scale.x, scale.y, scale.z) <= 0 || Math.max(scale.x, scale.y, scale.z) - Math.min(scale.x, scale.y, scale.z) > 1e-6) {
        return unavailable("Locomotion requires a positive uniform actor world scale.");
      }
      if (new THREE.Vector3(0, 1, 0).applyQuaternion(rotation).y < 1 - 1e-6) return unavailable("Ground locomotion requires an upright actor placement.");
      const origin = actor.root.getWorldPosition(new THREE.Vector3()), inverse = rotation.invert();
      // Exclude scene translation/yaw while retaining actual runtime metre scale.
      const point = (bone: THREE.Bone) => bone.getWorldPosition(new THREE.Vector3()).sub(origin).applyQuaternion(inverse);
      const anchor = point(rig.anchor);
      if (![anchor.x, anchor.y, anchor.z].every(Number.isFinite)) return unavailable("Nonfinite source root motion.");
      samples.push(Object.freeze({ timeSeconds: time, anchor: tuple(anchor) }));
      if (!index) {
        startAnchor = anchor;
        allBones.forEach((bone) => { starts.push(bone.quaternion.clone().normalize()); startPositions.push(point(bone)); });
      }
      limbBones.forEach((bone, boneIndex) => {
        spans[boneIndex] = Math.max(spans[boneIndex]!, starts[allBones.indexOf(bone)]!.angleTo(bone.quaternion.clone().normalize()));
      });
      if (index === count) {
        displacement = anchor.clone().sub(startAnchor);
        allBones.forEach((bone, boneIndex) => {
          loopPosition = Math.max(loopPosition, point(bone).sub(startPositions[boneIndex]!).sub(displacement).length());
          loopRotation = Math.max(loopRotation, starts[boneIndex]!.angleTo(bone.quaternion.clone().normalize()));
        });
      }
      if (index % 8 === 7) { options.restore(); await new Promise<void>((resolve) => setTimeout(resolve, 0)); }
    }
    const planar = Math.hypot(displacement.x, displacement.z);
    const status = planar < 0.05 ? "in-place" : Math.abs(displacement.x) > Math.abs(displacement.z) * 0.2
      || Math.abs(displacement.y) > 0.03 ? "unavailable" : displacement.z > 0 ? "authored-forward" : "authored-backward";
    const articulated = rig.limbs.every((_limb, index) => spans[index * 3]! > 0.02 && spans[index * 3 + 1]! > 0.02);
    const repeats = status === "authored-forward" && articulated && loopPosition <= 0.02 && loopRotation <= 0.1;
    const reason = status === "in-place" ? "Source gait is in-place. Derive stride from actual weighted foot-support motion before adding transport."
      : status === "authored-backward" ? "Source travels backward in the actor-forward frame. It is not silently reversed or relabeled forward."
      : status === "unavailable" ? "Source travel is lateral or changes elevation; no straight ground approach binding is inferred."
      : !articulated ? "Required independent upper/lower leg articulation is missing; root travel alone is not a gait."
      : !repeats ? "Source cycle has a pose discontinuity; repeat transport needs an explicit loop/transition review." : undefined;
    return Object.freeze({ ...base, status, canRepeatAuthoredTravel: repeats, sourceToken, anchorName: rig.anchor.name,
      cycleDisplacement: tuple(displacement), samples: Object.freeze(samples),
      limbs: Object.freeze(rig.limbs.map((limb, index) => Object.freeze({ id: limb.id,
        bones: Object.freeze(limb.bones.map((bone) => bone.name)), rotationSpansRadians: Object.freeze(spans.slice(index * 3, index * 3 + 3)),
        distalSkinInfluence: Object.freeze({ ...limb.distalSkinInfluence, minimumWeight: MINIMUM_DISTAL_WEIGHT }) }))),
      loopPositionResidualMeters: loopPosition, loopRotationResidualRadians: loopRotation,
      evidence: `${rate} Hz actual source poses; runtime metre scale; independent leg-chain rotations; full-skeleton loop residual. Weighted foot support, skin quality and at-speed motion remain unreviewed.`,
      ...(reason ? { unavailableReason: reason } : {}) });
  } finally { options.restore(); }
}
