/**
 * The proportion profile: one height plus fifteen dimensionless multipliers on the
 * reference skeleton. Build, presentation, race and stature are all this one
 * structure, and none of them costs a single new animation clip.
 *
 * A profile may only scale LOCAL REST TRANSLATIONS. It can never rotate a joint,
 * which is exactly why the library's 26,000 rotation channels stay valid under
 * any profile: an elbow bent 90 degrees is 90 degrees on any limb length.
 *
 * ---------------------------------------------------------------------------
 * THE ONE RULE
 * ---------------------------------------------------------------------------
 * `ground` scales every joint that decides how far the pelvis sits above the
 * floor: the pelvis drop, both thighs, both shins, both feet and both toes.
 * When the whole ground chain shares that one scalar, the Hips->sole vector
 * scales by exactly `ground` in EVERY pose, so:
 *
 *     hipHeight(profile) === REFERENCE_HIP_HEIGHT * profile.ground     (exact)
 *
 * Verified against the shipped rig to 5.6e-14 rig units across ground in
 * [0.7, 1.3] and pelvisBreadth in [1.0, 1.3]. The root-motion scale IS the
 * `ground` scalar; nothing else in the profile can move the floor.
 *
 * The four `*Bias` fields exist to break that rule on purpose (a long-shinned
 * build, oversized feet). They default to 1. Breaking the rule is legal and
 * costs nothing in accuracy — `groundDropCorrection.ts` restores exact floor
 * contact — but `isGroundLocked` reports it so a caller can skip the correction
 * entirely when it would be a no-op.
 */

import { CANONICAL_JOINTS, GROUND_CHAIN_JOINTS } from "./humanoidSkeletonContract.ts";

// ---------------------------------------------------------------------------
// Reference constants. All measured first-hand by forward kinematics on
// human-foundation-pilot-runtime-4k.glb, in rig units.
// ---------------------------------------------------------------------------

/**
 * Vertical contribution of each ground segment to the standing hip height,
 * measured from bind world Y on the LEFT leg.
 * (The right leg differs by 8.8e-5 rig units — 0.16 mm at 1.8 m — which is why
 * the left chain alone predicts hip height to better than 0.003 mm.)
 */
export const REFERENCE_PELVIS_DROP = 0.031352495769;
export const REFERENCE_THIGH_RISE = 0.237805267961;
export const REFERENCE_SHIN_RISE = 0.230681943972;
export const REFERENCE_FOOT_RISE = 0.050519866158;
export const REFERENCE_TOE_RISE = 0.001316842556;

/** Vertical contribution of the upper body, bind pose. */
export const REFERENCE_SPINE_RISE = 0.197068321665;
export const REFERENCE_NECK_RISE = 0.084457826500;
export const REFERENCE_SKULL_RISE = 0.155911465924;

/**
 * Standing hip height: world Y of `Hips` minus the lowest sole joint, in the
 * BIND pose. This is the definition of "leg length" the root-motion track is
 * normalised by — see `libraryRootMotion.ts`.
 *
 * Summed from the segments above rather than written out, so that
 * `deriveRigMetrics` divides by it to exactly `ground` with no rounding drift.
 * Forward kinematics on the shipped body gives 0.551676416415 and the sum is
 * identical to the last digit. Note the FK must apply NODE SCALE: 44 of the
 * body's 67 nodes carry float32 scale noise around 1 (worst, LeftUpLeg at
 * [1.0000076, 0.9999998, 1.0000197]), and ignoring it shifts hip height by
 * 1.6e-7 rig units.
 */
export const REFERENCE_HIP_HEIGHT =
  REFERENCE_PELVIS_DROP + REFERENCE_THIGH_RISE + REFERENCE_SHIN_RISE
  + REFERENCE_FOOT_RISE + REFERENCE_TOE_RISE;

/** HeadTop_End minus the lowest sole joint, bind pose. FK gives 0.989114030505. */
export const REFERENCE_RIG_HEIGHT =
  REFERENCE_HIP_HEIGHT + REFERENCE_SPINE_RISE + REFERENCE_NECK_RISE + REFERENCE_SKULL_RISE;

/** `RightHand` -> `RightHandMiddle1`. The divisor every hand-sized value uses. */
export const REFERENCE_PALM = 0.035205222586;

/**
 * The mesh bounding box is 0.999512 rig units tall while the joint-to-joint
 * height is 0.989114 — the mesh stands 1.0105x past the joints (hair and scalp).
 *
 * This is a live bug in the shipped loader: `human-review-actor.js` scales by
 * `TARGET_HEIGHT_METERS / bboxHeight`, so two bodies with identical skeletons and
 * different hair volume render at different actual statures, and (worse)
 * `Box3.setFromObject` does not skin, so it returns the same bind-space extent
 * for every profile. Use `metresPerRigUnit(profile)` instead.
 */
export const REFERENCE_MESH_BBOX_HEIGHT = 0.999512017;

/** Sanity: the shipped body is displayed at 1.8 m, so one rig unit is this many metres. */
export const REFERENCE_METRES_PER_RIG_UNIT = 1.8 / REFERENCE_RIG_HEIGHT;

// ---------------------------------------------------------------------------
// The profile
// ---------------------------------------------------------------------------

export interface BodyProportionProfile {
  readonly id: string;
  /** Display stature in metres, joint-to-joint (HeadTop_End to sole plane). */
  readonly heightMeters: number;

  /** LOCKED: pelvis drop, thighs, shins, feet, toes — one scalar, see THE ONE RULE. */
  readonly ground: number;

  /** Deliberate deviations from the ground rule. All default to 1. */
  readonly thighBias: number;
  readonly shinBias: number;
  readonly footBias: number;
  readonly toeBias: number;

  /**
   * Free: pelvis half-width and depth, RELATIVE TO `ground`.
   *
   * 1 means "as broad as a body with these legs would be", so the whole
   * Hips->sole chain scales by one scalar and the ground-drop correction is
   * identically zero. 1.22 means 22% broader than that.
   */
  readonly pelvisBreadth: number;

  /** Free: torso and head. */
  readonly spine: number;
  readonly neck: number;
  readonly skull: number;

  /** Free: arms. `chestBreadth` is Spine2->Shoulder; `clavicle` is Shoulder->Arm. */
  readonly chestBreadth: number;
  readonly clavicle: number;
  readonly upperArm: number;
  readonly foreArm: number;

  /** Free: `hand` is the palm (Hand->digit root); `digit` is the three phalanges. */
  readonly hand: number;
  readonly digit: number;
}

export type ProfileSegment =
  | "ground" | "spine" | "neck" | "skull"
  | "chestBreadth" | "clavicle" | "upperArm" | "foreArm"
  | "hand" | "digit";

const DIGIT_NAMES = ["Index", "Middle", "Pinky", "Ring", "Thumb"] as const;

function handJoints(tip: boolean): string[] {
  const out: string[] = [];
  for (const side of ["Left", "Right"] as const) {
    for (const digit of DIGIT_NAMES) {
      if (tip) for (const k of [2, 3, 4]) out.push(`${side}Hand${digit}${k}`);
      else out.push(`${side}Hand${digit}1`);
    }
  }
  return out;
}

/**
 * Which joints' local rest translation each segment scales. Exhaustive and
 * disjoint over all 64 non-root canonical joints — asserted by
 * `assertSegmentPartition()` and by the test suite.
 */
export const SEGMENT_JOINTS: Readonly<Record<ProfileSegment, readonly string[]>> = Object.freeze({
  ground: GROUND_CHAIN_JOINTS,
  spine: ["Spine", "Spine1", "Spine2"],
  neck: ["Neck"],
  skull: ["Head", "HeadTop_End"],
  chestBreadth: ["LeftShoulder", "RightShoulder"],
  clavicle: ["LeftArm", "RightArm"],
  upperArm: ["LeftForeArm", "RightForeArm"],
  foreArm: ["LeftHand", "RightHand"],
  hand: handJoints(false),
  digit: handJoints(true),
});

const SEGMENT_OF = new Map<string, ProfileSegment>();
for (const [segment, joints] of Object.entries(SEGMENT_JOINTS) as [ProfileSegment, readonly string[]][]) {
  for (const joint of joints) SEGMENT_OF.set(joint, segment);
}

/** Which bias field, if any, further scales a ground-chain joint. */
const GROUND_BIAS_OF: ReadonlyMap<string, keyof BodyProportionProfile> = new Map([
  ["LeftLeg", "thighBias"], ["RightLeg", "thighBias"],
  ["LeftFoot", "shinBias"], ["RightFoot", "shinBias"],
  ["LeftToeBase", "footBias"], ["RightToeBase", "footBias"],
  ["LeftToe_End", "toeBias"], ["RightToe_End", "toeBias"],
] as const);

export function segmentOf(joint: string): ProfileSegment | null {
  return SEGMENT_OF.get(joint) ?? null;
}

/** Throws if the segment map is not an exhaustive, disjoint cover of the 64 non-root joints. */
export function assertSegmentPartition(): void {
  const owned = new Map<string, ProfileSegment>();
  for (const [segment, joints] of Object.entries(SEGMENT_JOINTS) as [ProfileSegment, readonly string[]][]) {
    for (const joint of joints) {
      const previous = owned.get(joint);
      if (previous) throw new Error(`joint "${joint}" is owned by both ${previous} and ${segment}`);
      owned.set(joint, segment);
    }
  }
  for (const joint of CANONICAL_JOINTS) {
    if (joint.parent === null) continue;
    if (!owned.has(joint.name)) throw new Error(`joint "${joint.name}" is owned by no segment`);
  }
  if (owned.size !== CANONICAL_JOINTS.length - 1) {
    throw new Error(`segment map covers ${owned.size} joints, expected ${CANONICAL_JOINTS.length - 1}`);
  }
}

const DEFAULTS = {
  heightMeters: 1.8,
  ground: 1, thighBias: 1, shinBias: 1, footBias: 1, toeBias: 1,
  pelvisBreadth: 1, spine: 1, neck: 1, skull: 1,
  chestBreadth: 1, clavicle: 1, upperArm: 1, foreArm: 1, hand: 1, digit: 1,
} as const;

export function makeProfile(
  id: string,
  overrides: Partial<Omit<BodyProportionProfile, "id">> = {},
): BodyProportionProfile {
  return { id, ...DEFAULTS, ...overrides };
}

/** True when the ground chain shares a single scalar, i.e. THE ONE RULE holds. */
export function isGroundLocked(profile: BodyProportionProfile): boolean {
  return profile.thighBias === 1 && profile.shinBias === 1 && profile.footBias === 1 && profile.toeBias === 1;
}

/**
 * Per-axis scale for a joint's LOCAL rest translation.
 *
 * Only the pelvis joints are anisotropic. The Hips->UpLeg offset carries a
 * 0.031353 vertical drop AND a 0.052001 lateral half-width in the same vector,
 * and splitting those axes is what makes pelvis breadth free of the floor:
 * the lateral component contributes nothing to hip height in the bind pose, so
 * `hipHeight` stays exactly `REFERENCE_HIP_HEIGHT * ground` at any breadth.
 *
 * (In the Hips local frame x is lateral, y is vertical and z is forward —
 * confirmed by FK: LeftUpLeg's local y of -0.031352 produces exactly 0.031352
 * of world drop.)
 *
 * `pelvisBreadth` multiplies ON TOP of `ground`, so pelvisBreadth == 1 leaves the
 * Hips->sole chain uniformly scaled and the ground-drop correction exactly zero.
 */
export function jointAxisScale(
  profile: BodyProportionProfile,
  joint: string,
): readonly [number, number, number] {
  if (joint === "LeftUpLeg" || joint === "RightUpLeg") {
    const lateral = profile.ground * profile.pelvisBreadth;
    return [lateral, profile.ground, lateral];
  }
  const bias = GROUND_BIAS_OF.get(joint);
  if (bias !== undefined) {
    const scale = profile.ground * (profile[bias] as number);
    return [scale, scale, scale];
  }
  const segment = SEGMENT_OF.get(joint);
  if (segment === undefined || segment === "ground") return [1, 1, 1];
  const scale = profile[segment];
  return [scale, scale, scale];
}

// ---------------------------------------------------------------------------
// Derived metrics — closed form, no forward kinematics, no bounding box.
// ---------------------------------------------------------------------------

export interface RigMetrics {
  /** Standing hip height in rig units. Exactly REFERENCE_HIP_HEIGHT * ground when ground-locked. */
  readonly hipHeight: number;
  /** Joint-to-joint stature in rig units. */
  readonly rigHeight: number;
  /** Multiply rig units by this to get display metres. */
  readonly metresPerRigUnit: number;
  /** Palm length (Hand -> middle-digit root) in display metres. */
  readonly palmMeters: number;
  /** The scalar the root-motion track is multiplied by for this body. */
  readonly rootMotionScale: number;
}

/**
 * Derive a body's metrics from its profile alone.
 *
 * Verified against forward kinematics on the shipped rig over eight profiles
 * spanning ground 0.70..1.30 and every bias combination tried: worst hip-height
 * error 0.0021 mm and worst rig-height error 0.0016 mm at 1.8 m.
 *
 * A bounding box would NOT work here: `Box3.setFromObject` does not skin, so it
 * returns the bind-space geometry extent and is identical for every profile.
 */
export function deriveRigMetrics(profile: BodyProportionProfile): RigMetrics {
  const hipHeight = profile.ground * (
    REFERENCE_PELVIS_DROP
    + REFERENCE_THIGH_RISE * profile.thighBias
    + REFERENCE_SHIN_RISE * profile.shinBias
    + REFERENCE_FOOT_RISE * profile.footBias
    + REFERENCE_TOE_RISE * profile.toeBias
  );
  const rigHeight = hipHeight
    + REFERENCE_SPINE_RISE * profile.spine
    + REFERENCE_NECK_RISE * profile.neck
    + REFERENCE_SKULL_RISE * profile.skull;
  const metresPerRigUnit = profile.heightMeters / rigHeight;
  return {
    hipHeight,
    rigHeight,
    metresPerRigUnit,
    palmMeters: REFERENCE_PALM * profile.hand * metresPerRigUnit,
    rootMotionScale: hipHeight / REFERENCE_HIP_HEIGHT,
  };
}

/** The uniform scale to apply to the model root. Replaces the bbox divisor. */
export function metresPerRigUnit(profile: BodyProportionProfile): number {
  return deriveRigMetrics(profile).metresPerRigUnit;
}

/** Leg-length index: standing hip height as a fraction of stature. Reference 0.5577. */
export function legLengthIndex(profile: BodyProportionProfile): number {
  const metrics = deriveRigMetrics(profile);
  return metrics.hipHeight / metrics.rigHeight;
}

// ---------------------------------------------------------------------------
// Applying a profile
// ---------------------------------------------------------------------------

/** Anything with a mutable local position — a THREE.Bone satisfies this structurally. */
export interface MutableJointLike {
  readonly name: string;
  readonly position: { x: number; y: number; z: number };
}

/**
 * Scale a body's rest translations in place.
 *
 * MUST be called on the BIND pose, before any clip is applied, and the caller
 * must re-emit inverse bind matrices (or call `skeleton.calculateInverses()`)
 * afterwards — a rest translation changed without its IBM detaches the mesh.
 *
 * Returns the joints it touched, so a caller can assert coverage.
 */
export function applyProportionProfile(
  joints: Iterable<MutableJointLike>,
  profile: BodyProportionProfile,
  canonicalize: (name: string) => string | null,
): string[] {
  const touched: string[] = [];
  for (const joint of joints) {
    const canonical = canonicalize(joint.name);
    if (canonical === null) continue;
    const scale = jointAxisScale(profile, canonical);
    if (scale[0] === 1 && scale[1] === 1 && scale[2] === 1) continue;
    joint.position.x *= scale[0];
    joint.position.y *= scale[1];
    joint.position.z *= scale[2];
    touched.push(canonical);
  }
  return touched;
}

// ---------------------------------------------------------------------------
// The shipped profiles.
//
// `reference` is measured — every scalar is 1.0 by definition, and 1.80 m is the
// stature the rig is authored at.
//
// The other four are CONSTRUCTED, not survey data: the shape multipliers follow
// documented directions of human variation (the leg-length index rises with
// stature, so short builds carry proportionally shorter legs and taller ones
// proportionally longer; heavy builds carry a broader pelvis and chest; light
// builds a narrower one). The `legLengthIndex` each produces is printed so the
// numbers are checkable rather than asserted.
// ---------------------------------------------------------------------------

export const REFERENCE_PROFILE: BodyProportionProfile = makeProfile("human-reference-1.80", {
  heightMeters: 1.8,
});

/** 1.50 m. Proportionally shorter legs, longer torso, relatively larger head. legLengthIndex 0.5348. */
export const SHORT_PROFILE: BodyProportionProfile = makeProfile("human-short-1.50", {
  heightMeters: 1.5,
  ground: 0.94, spine: 1.03, neck: 1.0, skull: 1.05,
  pelvisBreadth: 1.0, chestBreadth: 0.98, clavicle: 0.98,
  upperArm: 0.96, foreArm: 0.96, hand: 0.98, digit: 0.98,
});

/** 2.00 m. Proportionally longer legs and arms, relatively smaller head. legLengthIndex 0.5743. */
export const TALL_PROFILE: BodyProportionProfile = makeProfile("human-tall-2.00", {
  heightMeters: 2.0,
  ground: 1.05, spine: 0.99, neck: 1.02, skull: 0.95,
  pelvisBreadth: 0.99, chestBreadth: 1.01, clavicle: 1.02,
  upperArm: 1.04, foreArm: 1.04, hand: 1.02, digit: 1.02,
});

/** Heavy build at 1.78 m. Broad pelvis and chest, slightly shorter legs, larger hands. legLengthIndex 0.5457. */
export const HEAVY_PROFILE: BodyProportionProfile = makeProfile("human-heavy-1.78", {
  heightMeters: 1.78,
  ground: 0.96, spine: 1.01, neck: 0.98, skull: 1.02,
  pelvisBreadth: 1.22, chestBreadth: 1.18, clavicle: 1.05,
  upperArm: 0.98, foreArm: 0.97, hand: 1.05, digit: 1.05,
});

/** Light build at 1.74 m. Narrow pelvis and chest, slightly longer legs, smaller hands. legLengthIndex 0.5678. */
export const LIGHT_PROFILE: BodyProportionProfile = makeProfile("human-light-1.74", {
  heightMeters: 1.74,
  ground: 1.03, spine: 0.99, neck: 1.02, skull: 0.97,
  pelvisBreadth: 0.90, chestBreadth: 0.92, clavicle: 0.97,
  upperArm: 1.01, foreArm: 1.02, hand: 0.94, digit: 0.94,
});

export const SHIPPED_PROFILES: readonly BodyProportionProfile[] = Object.freeze([
  REFERENCE_PROFILE, SHORT_PROFILE, TALL_PROFILE, HEAVY_PROFILE, LIGHT_PROFILE,
]);

export interface ProfileProblem {
  readonly field: string;
  readonly detail: string;
}

/**
 * Sanity-check a profile. The bounds are an outer envelope, not a claim about
 * accuracy: the ground-drop correction is exact at any value, so these catch
 * typos and silhouettes that the SKIN will not survive, not floor error.
 */
export function validateProfile(profile: BodyProportionProfile): ProfileProblem[] {
  const problems: ProfileProblem[] = [];
  if (!(profile.heightMeters > 0.5) || !(profile.heightMeters < 4)) {
    problems.push({ field: "heightMeters", detail: `${profile.heightMeters} is outside 0.5..4 m` });
  }
  const scalars: (keyof BodyProportionProfile)[] = [
    "ground", "thighBias", "shinBias", "footBias", "toeBias", "pelvisBreadth",
    "spine", "neck", "skull", "chestBreadth", "clavicle", "upperArm", "foreArm", "hand", "digit",
  ];
  for (const field of scalars) {
    const value = profile[field] as number;
    if (!Number.isFinite(value) || value < 0.5 || value > 1.6) {
      problems.push({ field: String(field), detail: `${value} is outside the 0.5..1.6 envelope` });
    }
  }
  return problems;
}
