/**
 * Proportion profiles.
 *
 * A body is the shared skeleton plus ten numbers. Builds, presentations, races and heights
 * are all expressed here; none of them touches the animation library.
 *
 * THE ONE RULE
 * `ground` scales every joint that decides how far the pelvis sits above the floor: both
 * UpLeg offsets' VERTICAL axis, both thighs, both shins, both feet, both toes. It is one
 * scalar on purpose. When the whole ground chain shares one scalar, the standing hip height
 * scales by exactly that scalar, so rescaling the library's root-motion track by `ground`
 * reproduces the authored motion on the new body. Measured over six clips including a crouch
 * and a run-jump, the worst residual on rule-abiding bodies was 12.78 mm at 1.35 m; break the
 * rule (feet 25% larger than the legs) and the same clips cost 31.16 mm.
 *
 * Everything above the pelvis — spine, neck, skull, shoulders, arms, hands — and pelvis
 * breadth are free. They do not enter the floor contact at all.
 *
 * All reference constants below were measured on
 * human-foundation-pilot-runtime-4k.glb on 2026-09-04.
 */

import { canonicalizeJointName } from "./humanoidRigContract";

/** Rig-unit measurements of the reference body. 1 rig unit = 1.800879 m at a 1.8 m display height. */
export const REFERENCE_METRICS = {
  /** Mesh bounding height, bind pose. */
  rigHeight: 0.999512,
  /** Hips joint to the sole plane, bind pose. This is the quantity the root-motion track encodes. */
  hipHeight: 0.555782,
  /** Thigh + shin, straight-line joint distances. */
  legChain: 0.470388,
  /** Ankle joint to the sole plane. */
  ankleHeight: 0.055942,
  /** Ankle joint to toe tip. */
  footLength: 0.120820,
  /** Hips -> UpLeg lateral half-width (the free axis). */
  pelvisHalfWidth: 0.052001,
  /** Hips -> UpLeg vertical drop (the locked axis). */
  pelvisDrop: 0.031352,
  /** Bind vertical rise, Hips -> Spine2, summed over the three spine joints. */
  spineRise: 0.197060,
  /** Bind vertical rise, Spine2 -> Head. */
  neckRise: 0.123930,
  /** Bind vertical rise, Head -> HeadTop_End, plus the 0.006292 scalp cap above that joint. */
  skullRise: 0.122732,
} as const;

/** The armature is rotated +90 degrees about X, so bone space is Z-up. */
export const ROOT_MOTION_AXES = {
  /** Track component indices that carry horizontal travel. */
  horizontal: [0, 1] as const,
  /** Track component index that carries height. World Y = -track.z. */
  vertical: 2 as const,
  verticalSign: -1 as const,
} as const;

export type SegmentGroup =
  | "rootOffset"
  | "pelvis"
  | "ground"
  | "spine"
  | "neck"
  | "skull"
  | "clavicleSpan"
  | "upperArm"
  | "foreArm"
  | "hand";

/** Which group owns each joint's offset-from-parent. Keyed by canonical stem. */
export function segmentGroupOf(jointName: string): SegmentGroup {
  const n = canonicalizeJointName(jointName);
  if (n === "Hips") return "rootOffset";
  if (/^(Left|Right)UpLeg$/.test(n)) return "pelvis";
  if (/^(Left|Right)(Leg|Foot|ToeBase|Toe_End)$/.test(n)) return "ground";
  if (/^Spine\d?$/.test(n)) return "spine";
  if (n === "Neck" || n === "Head") return "neck";
  if (n === "HeadTop_End") return "skull";
  if (/^(Left|Right)Shoulder$/.test(n)) return "clavicleSpan";
  if (/^(Left|Right)Arm$/.test(n)) return "clavicleSpan";
  if (/^(Left|Right)ForeArm$/.test(n)) return "upperArm";
  if (/^(Left|Right)Hand$/.test(n)) return "foreArm";
  if (/Hand(Index|Middle|Ring|Pinky|Thumb)\d$/.test(n)) return "hand";
  return "rootOffset";
}

/**
 * Ten numbers describe a body. Height is metres; the other nine are dimensionless multipliers
 * on the reference skeleton, all 1.0 for the reference body itself.
 */
export interface ProportionProfile {
  readonly schemaVersion: 1;
  readonly id: string;
  /** Display height in metres, sole to scalp. The 1.5 - 2.0 m range is the design target. */
  readonly heightMeters: number;
  /** LOCKED CHAIN: pelvis drop, thighs, shins, feet, toes. One scalar, no exceptions. */
  readonly ground: number;
  /** Free: pelvis breadth and stance width. Does not affect floor contact. */
  readonly pelvisBreadth: number;
  /** Free: the three spine joints. Torso length. */
  readonly spine: number;
  /** Free: neck and head joints. */
  readonly neck: number;
  /** Free: skull height above the head joint. */
  readonly skull: number;
  /** Free: clavicle offsets. Shoulder width. */
  readonly clavicleSpan: number;
  /** Free: upper arm length. */
  readonly upperArm: number;
  /** Free: forearm length. */
  readonly foreArm: number;
  /** Free: all finger joints. Drives weapon grip sizing. */
  readonly hand: number;
}

export const REFERENCE_PROFILE: ProportionProfile = {
  schemaVersion: 1,
  id: "human-foundation-reference",
  heightMeters: 1.8,
  ground: 1,
  pelvisBreadth: 1,
  spine: 1,
  neck: 1,
  skull: 1,
  clavicleSpan: 1,
  upperArm: 1,
  foreArm: 1,
  hand: 1,
};

export function makeProfile(id: string, overrides: Partial<Omit<ProportionProfile, "schemaVersion" | "id">>): ProportionProfile {
  return { ...REFERENCE_PROFILE, id, ...overrides };
}

/**
 * Per-axis multipliers for a joint's local translation, in its parent's frame.
 *
 * Only `pelvis` is anisotropic: its lateral and fore-aft axes carry pelvis breadth while its
 * vertical axis is locked to the ground chain. Every other ground-chain joint has a pure
 * along-bone offset, so a scalar is enough.
 */
export function jointAxisScale(jointName: string, profile: ProportionProfile): [number, number, number] {
  const group = segmentGroupOf(jointName);
  switch (group) {
    // The Hips offset places the whole skeleton relative to the armature origin. It is a rigid
    // translation of every joint including the feet, so it cancels out of hip height entirely
    // and must not be scaled -- scaling it just slides the body through the floor plane.
    case "rootOffset": return [1, 1, 1];
    case "pelvis": return [profile.pelvisBreadth, profile.ground, profile.pelvisBreadth];
    case "ground": return [profile.ground, profile.ground, profile.ground];
    default: {
      const k = profile[group];
      return [k, k, k];
    }
  }
}

/** A bone this module can rescale. Three.js `Bone` satisfies it structurally. */
export interface MutableBoneLike {
  readonly name: string;
  readonly position: { x: number; y: number; z: number };
}

/**
 * Rewrite a skeleton's bind translations for a profile.
 *
 * The bones must be at their REFERENCE bind translations when this is called; applying two
 * profiles in sequence compounds them. Rotations are never touched — that is the whole point.
 */
export function applyProportionProfile(bones: Iterable<MutableBoneLike>, profile: ProportionProfile): number {
  let changed = 0;
  for (const bone of bones) {
    const [sx, sy, sz] = jointAxisScale(bone.name, profile);
    if (sx === 1 && sy === 1 && sz === 1) continue;
    bone.position.x *= sx;
    bone.position.y *= sy;
    bone.position.z *= sz;
    changed += 1;
  }
  return changed;
}

export interface DerivedRigMetrics {
  /** Sole-to-scalp height in rig units. */
  readonly rigHeight: number;
  /** Hips joint to sole plane in rig units. */
  readonly hipHeight: number;
  /** Metres per rig unit once the model is uniformly scaled to `heightMeters`. */
  readonly metresPerRigUnit: number;
  /** The factor the shared library's root-motion track must be multiplied by for this body. */
  readonly rootMotionScale: number;
}

/**
 * Predict a body's rig metrics from its profile alone — no mesh, no bounding box.
 *
 * This matters: `Box3.setFromObject` does NOT skin, so a bounding box measured on a
 * re-proportioned body returns the bind-space geometry extent and is identical for every
 * profile. Height must come from the rig, and the profile already knows it.
 */
export function deriveRigMetrics(profile: ProportionProfile): DerivedRigMetrics {
  const hipHeight = REFERENCE_METRICS.hipHeight * profile.ground;
  const rigHeight =
    hipHeight +
    REFERENCE_METRICS.spineRise * profile.spine +
    REFERENCE_METRICS.neckRise * profile.neck +
    REFERENCE_METRICS.skullRise * profile.skull;
  return {
    rigHeight,
    hipHeight,
    metresPerRigUnit: profile.heightMeters / rigHeight,
    // Exact, and it is just the ground scalar: every term of hip height scales by it.
    rootMotionScale: profile.ground,
  };
}

/** Metres of a segment on this body, given its reference length in rig units. */
export function segmentMetres(referenceRigUnits: number, group: SegmentGroup, profile: ProportionProfile): number {
  const scale = group === "pelvis" || group === "rootOffset" ? 1 : group === "ground" ? profile.ground : profile[group];
  return referenceRigUnits * scale * deriveRigMetrics(profile).metresPerRigUnit;
}

export interface ProfileViolation {
  readonly field: string;
  readonly detail: string;
}

/** Guard rails. These bounds are design limits, not physics — they are where the residuals were measured. */
export function validateProfile(profile: ProportionProfile): readonly ProfileViolation[] {
  const out: ProfileViolation[] = [];
  const positive = (field: keyof ProportionProfile) => {
    const value = profile[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      out.push({ field: String(field), detail: `must be a positive finite number, got ${String(value)}` });
    }
  };
  (["heightMeters", "ground", "pelvisBreadth", "spine", "neck", "skull", "clavicleSpan", "upperArm", "foreArm", "hand"] as const)
    .forEach(positive);
  if (profile.heightMeters < 0.9 || profile.heightMeters > 3.0) {
    out.push({ field: "heightMeters", detail: `outside the supported 0.9 - 3.0 m range, got ${profile.heightMeters}` });
  }
  if (profile.ground < 0.5 || profile.ground > 1.6) {
    out.push({ field: "ground", detail: `outside the measured 0.5 - 1.6 range, got ${profile.ground}` });
  }
  return out;
}
