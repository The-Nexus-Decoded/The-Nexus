/**
 * Twist joints, without re-authoring a single clip.
 *
 * THE MEASURED PROBLEM
 * Rolling `mixamorig:LeftForeArm` about its own axis and reading the skinned vertices back
 * (three's `applyBoneTransform`, 397 forearm-weighted vertices of 15,342) gives a worst
 * perpendicular radius, as a fraction of bind, of:
 *
 *      roll  30    45    60    90    120    150    180 degrees
 *     ratio  .9659 .9239 .8660 .7071 .5000  .2588  .0023
 *   cos(r/2) .9659 .9239 .8660 .7071 .5000  .2588  .0000
 *
 * The collapse is exactly cos(roll / 2) — the linear-blend-skinning candy wrapper at the
 * 50/50 seam between the rolling bone and its unrolling parent. The 0.208-of-bind figure
 * quoted for this rig corresponds to a 156-degree roll. At 180 degrees the arm pinches to
 * 0.23% of its radius, and 86 of the 397 vertices fall below half radius.
 *
 * THE FIX, AND WHY IT COSTS NO CLIPS
 * A twist bone is a LEAF SIBLING of the joint that follows it, never an interposed parent:
 *
 *     LeftForeArm
 *       |- LeftHand           canonical, animated by the library
 *       `- LeftForeArmTwist   extra joint, skinned, driven procedurally
 *
 * Interposing it before LeftHand would reparent a canonical joint, and the library's
 * LeftHand rotations — authored relative to LeftForeArm — would then be relative to the
 * twist instead. `validateHumanoidRig` rejects that arrangement.
 *
 * As a leaf it is invisible to the library: all 400 clips animate exactly the 65 canonical
 * joints, so an extra joint is simply never targeted. It is driven each frame from a joint
 * the library DOES animate, by taking the twist component of that joint's local rotation.
 * Nothing is re-authored. The mesh must weight the near-wrist forearm to it, which is a body
 * authoring change, not an animation change.
 *
 * PREDICTED PAYOFF
 * With N twist bones subdividing the roll, neighbouring frames differ by roll/(N+1) rather
 * than by the whole roll, so by the measured law the worst radius becomes
 * cos(roll / (2(N+1))). At a 180-degree roll: N=0 gives 0.000, N=1 gives 0.707, N=2 gives
 * 0.866. That is a prediction from the measured cos law, not itself a measurement — the
 * shipped body has no twist bones and no weights for them.
 */

import { canonicalizeJointName } from "./humanoidRigContract";

export interface QuaternionLike { x: number; y: number; z: number; w: number }
export interface Vector3Like { x: number; y: number; z: number }

/**
 * The twist component of `q` about unit `axis` (swing-twist decomposition).
 *
 * Writes into `target` and returns it. When the rotation is a pure swing the result is the
 * identity, and when it is a pure roll about `axis` the result is `q` itself.
 */
export function twistAbout(q: QuaternionLike, axis: Vector3Like, target: QuaternionLike): QuaternionLike {
  const dot = q.x * axis.x + q.y * axis.y + q.z * axis.z;
  let x = axis.x * dot;
  let y = axis.y * dot;
  let z = axis.z * dot;
  let w = q.w;
  let length = Math.sqrt(x * x + y * y + z * z + w * w);
  if (length < 1e-8) {
    // 180 degrees of pure swing: the twist is undefined, so report none.
    target.x = 0; target.y = 0; target.z = 0; target.w = 1;
    return target;
  }
  const inv = 1 / length;
  x *= inv; y *= inv; z *= inv; w *= inv;
  target.x = x; target.y = y; target.z = z; target.w = w;
  return target;
}

/** Signed roll angle in radians of `q` about unit `axis`, in (-pi, pi]. */
export function rollAngleAbout(q: QuaternionLike, axis: Vector3Like): number {
  const t = twistAbout(q, axis, { x: 0, y: 0, z: 0, w: 1 });
  const projected = t.x * axis.x + t.y * axis.y + t.z * axis.z;
  return 2 * Math.atan2(projected, t.w);
}

/** Scale a rotation about `axis` by `factor`, written into `target`. */
export function scaledRoll(angle: number, axis: Vector3Like, factor: number, target: QuaternionLike): QuaternionLike {
  const half = (angle * factor) / 2;
  const s = Math.sin(half);
  target.x = axis.x * s;
  target.y = axis.y * s;
  target.z = axis.z * s;
  target.w = Math.cos(half);
  return target;
}

export interface TwistJointSpec {
  /** The extra joint's own name. Must not collide with a canonical stem. */
  readonly name: string;
  /** Canonical joint this twist bone hangs off, as a leaf child. */
  readonly parent: string;
  /** Canonical joint whose local rotation supplies the roll. */
  readonly driver: string;
  /** Roll axis in the parent joint's local frame. */
  readonly axis: Vector3Like;
  /** Fraction of the driver's roll this bone takes. */
  readonly factor: number;
}

/**
 * Forearm twists, one per side, taking half the wrist's roll.
 *
 * The axis is exact rather than assumed: every limb bone on this rig has a pure +Y local
 * offset from its parent — measured, the off-axis component of LeftHand, LeftForeArm,
 * LeftArm, LeftLeg, LeftFoot and LeftToeBase local offsets is 0.000%. (The pelvis, spine,
 * shoulders and thumbs are not pure +Y, which is why none of them is a twist site here.)
 */
export const FOREARM_TWIST_JOINTS: readonly TwistJointSpec[] = [
  { name: "LeftForeArmTwist", parent: "LeftForeArm", driver: "LeftHand", axis: { x: 0, y: 1, z: 0 }, factor: 0.5 },
  { name: "RightForeArmTwist", parent: "RightForeArm", driver: "RightHand", axis: { x: 0, y: 1, z: 0 }, factor: 0.5 },
];

export interface TwistDriveTargets {
  /** Local rotation of the driver joint, as the mixer left it this frame. */
  readonly driverLocalRotation: QuaternionLike;
  /** The twist bone's local rotation, written by this call. */
  readonly twistLocalRotation: QuaternionLike;
}

/** Drive one twist bone. Cost is a dot product, a normalise, an atan2 and a sin/cos. */
export function driveTwistJoint(spec: TwistJointSpec, targets: TwistDriveTargets): number {
  const angle = rollAngleAbout(targets.driverLocalRotation, spec.axis);
  scaledRoll(angle, spec.axis, spec.factor, targets.twistLocalRotation);
  return angle;
}

/**
 * Worst skinned radius, as a fraction of bind, at a seam where neighbouring frames differ by
 * `roll / (twistCount + 1)`. Derived from the measured cos(roll/2) law at twistCount = 0.
 */
export function predictedCollapseRatio(rollRadians: number, twistCount: number): number {
  const perSeam = rollRadians / (twistCount + 1);
  return Math.max(0, Math.cos(perSeam / 2));
}

/** Twist bone names must stay outside the canonical namespace, or the validator will claim them. */
export function twistNamesAreExtraJoints(specs: readonly TwistJointSpec[]): boolean {
  return specs.every((spec) => canonicalizeJointName(spec.name) !== spec.parent);
}
