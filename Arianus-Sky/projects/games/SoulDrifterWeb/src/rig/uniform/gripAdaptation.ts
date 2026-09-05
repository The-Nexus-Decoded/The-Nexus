/**
 * Grip adaptation: make weapon attachment follow the proportion profile without
 * touching the catalog's fraction/angle contract.
 *
 * ---------------------------------------------------------------------------
 * ALREADY PROPORTION-FREE — do not change
 * ---------------------------------------------------------------------------
 *   - `gripEnd` / `gripFraction` are fractions of the weapon's own prepared
 *     bounds. A hilt is 15% along a shortsword in anyone's hands.
 *   - `targetLength` is an absolute weapon length, and that is CORRECT: a 1.05 m
 *     longsword is 1.05 m for everyone. A short character holding a big sword
 *     should read as a short character holding a big sword.
 *   - `radialScale` is weapon-side.
 *   - The finger-curl presets are ANGLES, and angles are proportion-free as
 *     poses. See "THE CURLS STAY ANGLES" below — this is the conclusion that
 *     differs most from the alternative designs, and it is measured.
 *
 * ---------------------------------------------------------------------------
 * NOT PROPORTION-FREE — the socket offsets
 * ---------------------------------------------------------------------------
 * `human-review-actor.js` does, at three sites (1417-1418, 1902-1903, 578-579):
 *     socket.scale.setScalar(1 / actorScale);
 *     socket.position.fromArray(config.position).multiplyScalar(1 / actorScale);
 * The socket is parented to a bone whose world scale is `actorScale`, so the
 * division deliberately cancels it: the offset is ABSOLUTE WORLD METRES on every
 * body regardless of hand size. A 40 mm offset is 40 mm on a 1.5 m character and
 * on a 2.0 m one, while the hand it is supposed to sit inside is not.
 *
 * The fix is to express each offset as a fraction of the reference PALM and
 * multiply by the wielding body's own palm. Palm is `RightHand -> RightHandMiddle1`,
 * measured 0.035205 rig units = 64.066 mm at 1.8 m.
 *
 * ---------------------------------------------------------------------------
 * THE CURLS STAY ANGLES — measured, against the brief's expectation
 * ---------------------------------------------------------------------------
 * The worry is real in principle: a fist's aperture scales with the hand while
 * the haft does not, so identical angles should bite. Measured, it does not bite
 * hard enough to be worth a solver.
 *
 * Method: for each of 6 weapons x 4 fingers, pose the digit at its shipped curl
 * (with the shipped per-phalanx weights [1.2, 1.2, 1.0], or [1.2, 1.4, 1.2] for
 * the narrow handles), sample 7 points along each phalanx, and take the CLOSEST
 * APPROACH to the shaft axis — the line through the socket along hand-local +X
 * (the socket's own +Y, rotated by the catalog's R = -PI/2). Closest approach,
 * not the fingertip: the shipped rig contacts the haft with its MID-PHALANGES,
 * so a tip probe measures the wrong thing.
 *
 * Result, worst closest-approach error over all 6 weapons x 4 fingers, mm:
 *
 *   profile            palm/ref   socket ABSOLUTE   socket x PALM
 *   reference 1.80 m     1.0000            0.00            0.00
 *   short 1.50 m         0.8330           12.86            4.32
 *   tall 2.00 m          1.1114            7.33            2.88
 *   heavy 1.78 m         1.0583            4.11            1.51
 *   light 1.74 m         0.8981            8.13            2.63
 *
 * So palm-scaling the socket takes the worst error from 12.86 mm to 4.32 mm — a
 * 2.98x improvement — and 4.32 mm sits inside the catalog's own calibration
 * window (its greatsword note tunes thumb clearance from 40.6 mm down to 10.2 mm
 * and calls 0.9 mm over-closed).
 *
 * The residual is exactly `|palmRatio - 1| * closestApproachRef` — verified to
 * 0.01 mm — so it is predictable in closed form and needs no solve. That matters
 * because a curl solve is not merely unnecessary, it is ILL-POSED: closest
 * approach is FLAT in the curl angle over most of its range, because the closest
 * point is the finger ROOT, which the curl does not move. Measured on the
 * longsword index, closest approach in mm against curl:
 *     -0.4:15.9  0.0:15.9  0.4:15.9  0.8:15.9  1.2:15.9  1.4:13.0  1.6:4.0  1.8:2.6  2.0:4.1
 * — flat to 1.2, then non-monotone past 1.8. Bisection on that is meaningless.
 *
 * `gripDriftMillimetres` therefore ships as a BUDGET CHECK, not a solver.
 */

import {
  REFERENCE_METRES_PER_RIG_UNIT,
  REFERENCE_PALM,
  REFERENCE_SPINE_RISE,
  type BodyProportionProfile,
  deriveRigMetrics,
} from "./bodyProportionProfile.ts";

export type Vec3Tuple = readonly [number, number, number];

/**
 * Reference palm in display metres on the shipped 1.8 m body: 64.0663 mm.
 * Derived rather than written out, so `palmMeters(REFERENCE_PROFILE)` divides by
 * it to exactly 1 and every fraction round-trips without drift.
 */
export const REFERENCE_PALM_METERS = REFERENCE_PALM * REFERENCE_METRES_PER_RIG_UNIT;

/** Reference torso rise (Hips -> Spine2) in display metres: 358.626 mm. */
export const REFERENCE_TORSO_METERS = REFERENCE_SPINE_RISE * REFERENCE_METRES_PER_RIG_UNIT;

/**
 * The catalog's hand-mounted socket offsets, re-expressed as fractions of the
 * reference palm. Multiply by `palmMeters(profile)` to get world metres.
 *
 * Derived by dividing each catalog offset by 64.0663 mm; the catalog's own
 * metres are recovered exactly on the reference body.
 */
export const PALM_SOCKET_FRACTIONS: Readonly<Record<string, Vec3Tuple>> = Object.freeze({
  // [0, 0.04, 0]
  longsword: [0, 0.62435, 0],
  arrow: [0, 0.62435, 0],
  // [0, 0.062, 0.03]
  shortsword: [0, 0.96775, 0.46826],
  staff: [0, 0.96775, 0.46826],
  knife: [0, 0.96775, 0.46826],
  dagger: [0, 0.96775, 0.46826],
  // [0, 0.0543, 0.0114]
  mace: [0, 0.84756, 0.17794],
  // [0, 0.05, 0.021]
  rod: [0, 0.78044, 0.32778],
  // [0, -0.01, 0.03] — the bow's palm-depth offset on LeftHand
  bowHand: [0, -0.15609, 0.46826],
});

/**
 * Torso-mounted sockets (quiver, back scabbard) as fractions of the reference
 * Hips->Spine2 rise. These follow `spine`, not the palm.
 *
 * Honest limitation: a back socket's LATERAL component really follows
 * `chestBreadth` and its VERTICAL follows `spine`, and this collapses both onto
 * one divisor. On the shipped profiles the two scalars differ by at most 0.17,
 * so the error is bounded by ~17% of the lateral component (about 15 mm on the
 * quiver's -0.09 m x-offset). Split it if a build ever varies them hard.
 */
export const TORSO_SOCKET_FRACTIONS: Readonly<Record<string, Vec3Tuple>> = Object.freeze({
  quiver: [-0.25096, -0.33461, -0.32067],
  quiverAlt: [-0.23144, -0.30394, -0.32067],
  backScabbard: [0.50192, -0.05577, -0.66922],
});

/** Palm length in display metres for a body. */
export function palmMeters(profile: BodyProportionProfile): number {
  return REFERENCE_PALM * profile.hand * deriveRigMetrics(profile).metresPerRigUnit;
}

/** Torso rise (Hips -> Spine2) in display metres for a body. */
export function torsoMeters(profile: BodyProportionProfile): number {
  return REFERENCE_SPINE_RISE * profile.spine * deriveRigMetrics(profile).metresPerRigUnit;
}

/**
 * Resolve a hand-mounted socket offset to world metres for this body.
 *
 * Drop-in for the catalog's `position` array at the three `multiplyScalar(1 /
 * actorScale)` sites: pass the result where the literal used to go, and the
 * offset now follows the hand instead of standing still.
 */
export function handSocketOffsetMeters(fraction: Vec3Tuple, profile: BodyProportionProfile): Vec3Tuple {
  const palm = palmMeters(profile);
  return [fraction[0] * palm, fraction[1] * palm, fraction[2] * palm];
}

/** Resolve a torso-mounted socket offset to world metres for this body. */
export function torsoSocketOffsetMeters(fraction: Vec3Tuple, profile: BodyProportionProfile): Vec3Tuple {
  const torso = torsoMeters(profile);
  return [fraction[0] * torso, fraction[1] * torso, fraction[2] * torso];
}

/** Convert an existing absolute-metre catalog offset into a palm fraction. */
export function toPalmFraction(absoluteMeters: Vec3Tuple): Vec3Tuple {
  return [
    absoluteMeters[0] / REFERENCE_PALM_METERS,
    absoluteMeters[1] / REFERENCE_PALM_METERS,
    absoluteMeters[2] / REFERENCE_PALM_METERS,
  ];
}

/**
 * Reference closest approach of each weapon's worst finger to its shaft axis, in
 * mm, at the shipped curls on the shipped 1.8 m body. Measured by sampling 7
 * points per phalanx across all four fingers and taking the minimum radial
 * distance; the worst (largest) finger is listed because it bounds the drift.
 */
export const REFERENCE_CLOSEST_APPROACH_MM: Readonly<Record<string, number>> = Object.freeze({
  longsword: 25.85,
  shortsword: 21.62,
  mace: 16.29,
  staff: 6.14,
  rod: 14.86,
  dagger: 15.42,
});

/**
 * How far a body's fist misses the haft, in mm, once the socket is palm-scaled.
 *
 * Closed form, verified against full finger FK to 0.01 mm:
 *     drift = |palmRatio - 1| * closestApproachRef
 *
 * Use it as a budget check when adding a build or a race, not as a correction.
 */
export function gripDriftMillimetres(profile: BodyProportionProfile, weapon: string): number {
  const reference = REFERENCE_CLOSEST_APPROACH_MM[weapon];
  if (reference === undefined) throw new Error(`no reference closest approach for weapon "${weapon}"`);
  const ratio = palmMeters(profile) / REFERENCE_PALM_METERS;
  return Math.abs(ratio - 1) * reference;
}

export interface GripBudgetReport {
  readonly profile: string;
  readonly palmRatio: number;
  readonly worstWeapon: string;
  readonly worstDriftMm: number;
  readonly withinBudget: boolean;
}

/**
 * Check every weapon against a drift budget.
 *
 * The default 10 mm comes from the catalog's own greatsword calibration, which
 * treats 10.2 mm of clearance as "pad on the wood" and 0.9 mm as over-closed —
 * so 10 mm is one finger-flesh radius, the width of the window the curls were
 * tuned inside.
 */
export function checkGripBudget(
  profile: BodyProportionProfile,
  budgetMm = 10,
): GripBudgetReport {
  const ratio = palmMeters(profile) / REFERENCE_PALM_METERS;
  let worstWeapon = "";
  let worstDriftMm = 0;
  for (const weapon of Object.keys(REFERENCE_CLOSEST_APPROACH_MM)) {
    const drift = gripDriftMillimetres(profile, weapon);
    if (drift > worstDriftMm) {
      worstDriftMm = drift;
      worstWeapon = weapon;
    }
  }
  return {
    profile: profile.id,
    palmRatio: ratio,
    worstWeapon,
    worstDriftMm,
    withinBudget: worstDriftMm <= budgetMm,
  };
}
