/**
 * The ground-drop correction: exact floor contact on a body whose leg
 * proportions break THE ONE RULE, with no plant detection, no hysteresis, no
 * iteration and no dt.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS EXACT, AND WHY IT NEEDS NO PLANT DETECTION
 * ---------------------------------------------------------------------------
 * Let D(pose) be the vertical drop from the Hips to the lowest sole joint. Then
 * for any pose, soleY = hipsY - D.
 *
 * When the whole ground chain shares one scalar g, the Hips->sole vector scales
 * by exactly g in every pose, so D_var = g * D_ref and setting
 * hipsY_var = g * hipsY_ref already gives soleY_var = g * soleY_ref. Nothing else
 * is needed — that is THE ONE RULE, and it is why a rule-abiding profile costs
 * three multiplies a frame.
 *
 * When the rule is broken, D_var != g * D_ref. Correct it directly:
 *
 *     hipsY_var = g * hipsY_ref + (D_var - g * D_ref)
 *  => soleY_var = g * hipsY_ref + D_var - g * D_ref - D_var
 *               = g * (hipsY_ref - D_ref)
 *               = g * soleY_ref                                     (exact)
 *
 * The correction is DERIVED to be exact, not fitted, and it holds for every
 * pose. Three consequences worth stating plainly:
 *
 *   - No plant detection. The correction never decides whether a foot is on the
 *     ground; it corrects the body's own geometry discrepancy. Planted frames
 *     land on the floor and airborne frames clear it by the same proportion as
 *     the reference. This is the single biggest difference from an IK-based
 *     approach, and it is what makes the result deterministic.
 *   - No state. It is a pure function of (pose, profile). Measured across
 *     144 / 60 / 30 Hz on `BasicLocomotion__Walking` with a rule-breaking dwarf
 *     profile: identical to 9 decimal places at every probe instant. A stateful
 *     plant latch diverges by hundreds of millimetres at a plant transition;
 *     this cannot, because there is no latch.
 *   - It is continuous. `min` over the sole joints is a min of continuous
 *     functions, so swapping which foot is lowest does not pop.
 *
 * ---------------------------------------------------------------------------
 * MEASURED RESULT (worst floor error over 7 clips x 48 samples, mm at each
 * body's own display height; end-to-end, correction applied as a real hips
 * translation with full FK re-run)
 * ---------------------------------------------------------------------------
 *   profile                    raw hips   x ground   + this correction
 *   reference 1.80 m               0.00       0.00       0.0000
 *   short 1.50 m                  66.65       1.41       0.0000
 *   tall 2.00 m                   71.24       1.81       0.0000
 *   heavy 1.78 m                  53.54       7.27       0.0000
 *   light 1.74 m                  37.83       3.45       0.0000
 *   crural bias .85/1.148         69.02      69.02       0.0000
 *   feet 1.25x the legs          100.89      50.77       0.0000
 *   dwarf 1.35 m (4 biases)      332.04      19.04       0.0000
 *
 * The `x ground` column is not zero for the human profiles because they vary
 * pelvis BREADTH, which couples into height when the pelvis tilts. That residual
 * is 1.80-7.27 mm, and this correction removes it too.
 *
 * Cost: 485.7 / 492.9 / 497.9 ns per character per frame, measured on THIS class
 * over three runs of 300,000 iterations after a 50,000-iteration warm-up
 * (Node 24.14.0, win32 x64) — two 11-joint FK passes, a min and an add, with no
 * allocation after construction. About 4,000 characters inside a 2 ms budget.
 * `needsGroundCorrection` returns false for a uniformly scaled body, and then the
 * cost is zero because the solve is skipped entirely.
 */

import { HIPS_UP_AXIS, HIPS_UP_SIGN } from "./humanoidSkeletonContract.ts";

/**
 * The 11 joints the correction needs, in solver order. The Hips is the root of
 * this sub-FK and sits at the origin: its own translation cancels out of the
 * drop, so the root-motion track never enters the solve.
 */
export const GROUND_SOLVER_JOINTS: readonly string[] = Object.freeze([
  "Hips",
  "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase", "LeftToe_End",
  "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase", "RightToe_End",
]);

const PARENT = Int8Array.from([-1, 0, 1, 2, 3, 4, 0, 6, 7, 8, 9]);
/** Indices into GROUND_SOLVER_JOINTS whose world height defines the sole plane. */
const SOLE = Uint8Array.from([3, 4, 5, 8, 9, 10]);
const COUNT = 11;

/**
 * Closed-form ground-drop solver.
 *
 * Holds the variant's and the reference's ground-chain rest translations and
 * runs two 11-joint forward-kinematic passes per frame over the SAME animated
 * local rotations. Allocation-free after construction.
 */
export class GroundDropSolver {
  private readonly variantRest: Float64Array;
  private readonly referenceRest: Float64Array;
  private readonly worldQuat = new Float64Array(COUNT * 4);
  private readonly worldPos = new Float64Array(COUNT * 3);
  /** `ground` — the scalar the root-motion track is multiplied by. */
  readonly groundScale: number;
  /** Up axis of the armature-local frame the FK runs in, and its sign. */
  private readonly upAxis: number;
  private readonly upSign: number;

  /**
   * @param variantRest    11 local rest translations (x,y,z), solver order, AFTER the profile.
   * @param referenceRest  the same 11 from the reference rig, BEFORE the profile.
   * @param groundScale    profile.ground (== rigMetrics.rootMotionScale).
   */
  constructor(
    variantRest: ArrayLike<number>,
    referenceRest: ArrayLike<number>,
    groundScale: number,
    upAxis: number = HIPS_UP_AXIS,
    upSign: number = HIPS_UP_SIGN,
  ) {
    if (variantRest.length !== COUNT * 3 || referenceRest.length !== COUNT * 3) {
      throw new Error(`ground solver needs ${COUNT * 3} rest components, got ${variantRest.length} / ${referenceRest.length}`);
    }
    this.variantRest = Float64Array.from(variantRest);
    this.referenceRest = Float64Array.from(referenceRest);
    this.groundScale = groundScale;
    this.upAxis = upAxis;
    this.upSign = upSign;
  }

  /**
   * Drop from the Hips to the lowest sole joint, along the armature-local up
   * direction, for the given local rotations and rest translations.
   */
  private drop(localQuaternions: ArrayLike<number>, rest: Float64Array): number {
    const wq = this.worldQuat;
    const wp = this.worldPos;
    const axis = this.upAxis;
    const sign = this.upSign;

    for (let i = 0; i < COUNT; i += 1) {
      const iq = i * 4;
      const ip = i * 3;
      const bx = localQuaternions[iq] ?? 0;
      const by = localQuaternions[iq + 1] ?? 0;
      const bz = localQuaternions[iq + 2] ?? 0;
      const bw = localQuaternions[iq + 3] ?? 1;
      const parent = PARENT[i] ?? -1;

      if (parent < 0) {
        // Hips at the origin: its translation cancels out of the drop.
        wq[iq] = bx; wq[iq + 1] = by; wq[iq + 2] = bz; wq[iq + 3] = bw;
        wp[ip] = 0; wp[ip + 1] = 0; wp[ip + 2] = 0;
        continue;
      }

      const pq = parent * 4;
      const pp = parent * 3;
      const qx = wq[pq] ?? 0, qy = wq[pq + 1] ?? 0, qz = wq[pq + 2] ?? 0, qw = wq[pq + 3] ?? 1;
      const x = rest[ip] ?? 0, y = rest[ip + 1] ?? 0, z = rest[ip + 2] ?? 0;

      // rotate (x,y,z) by the parent's world quaternion
      const tx = 2 * (qy * z - qz * y);
      const ty = 2 * (qz * x - qx * z);
      const tz = 2 * (qx * y - qy * x);
      wp[ip] = (wp[pp] ?? 0) + x + qw * tx + (qy * tz - qz * ty);
      wp[ip + 1] = (wp[pp + 1] ?? 0) + y + qw * ty + (qz * tx - qx * tz);
      wp[ip + 2] = (wp[pp + 2] ?? 0) + z + qw * tz + (qx * ty - qy * tx);

      wq[iq] = qw * bx + qx * bw + qy * bz - qz * by;
      wq[iq + 1] = qw * by - qx * bz + qy * bw + qz * bx;
      wq[iq + 2] = qw * bz + qx * by - qy * bx + qz * bw;
      wq[iq + 3] = qw * bw - qx * bx - qy * by - qz * bz;
    }

    let lowest = Infinity;
    for (let k = 0; k < SOLE.length; k += 1) {
      const index = SOLE[k] ?? 0;
      const height = sign * (wp[index * 3 + axis] ?? 0);
      if (height < lowest) lowest = height;
    }
    // Hips sits at the origin, so its height along the up axis is 0.
    return -lowest;
  }

  /**
   * World-up correction to add to the Hips, in RIG UNITS.
   *
   * Zero to floating point only when the Hips->sole chain is UNIFORMLY scaled,
   * i.e. the profile is ground-locked AND `pelvisBreadth` is 1 — see
   * `needsGroundCorrection`. A ground-locked profile with a wider pelvis still
   * needs the solve: the Hips->UpLeg offset carries the lateral half-width and
   * the vertical drop in one vector, so breadth couples into height as soon as
   * the pelvis tilts. Measured on the shipped profiles, that residual is
   * 1.41 mm (short) to 7.27 mm (heavy), and this removes it.
   *
   * @param localQuaternions 11 local quaternions (x,y,z,w) in solver order, as
   *   written by the mixer this frame. The SAME rotations drive both passes:
   *   rotations are proportion-free, which is the premise the whole design rests
   *   on and the reason one pose can be measured on two skeletons.
   */
  solve(localQuaternions: ArrayLike<number>): number {
    if (localQuaternions.length < COUNT * 4) {
      throw new Error(`ground solver needs ${COUNT * 4} quaternion components, got ${localQuaternions.length}`);
    }
    const variantDrop = this.drop(localQuaternions, this.variantRest);
    const referenceDrop = this.drop(localQuaternions, this.referenceRest);
    return variantDrop - this.groundScale * referenceDrop;
  }
}

/**
 * The correction in its purest form, for callers that already know both drops.
 * `solveGroundDrop(D_var, D_ref, g)` === the offset that makes
 * `soleY_var === g * soleY_ref`.
 */
export function solveGroundDrop(variantDrop: number, referenceDrop: number, groundScale: number): number {
  return variantDrop - groundScale * referenceDrop;
}

/**
 * Whether a profile needs the correction at all.
 *
 * False only when the whole Hips->sole chain is uniformly scaled: ground-locked
 * AND pelvisBreadth == 1. In that case the correction is identically zero and
 * the caller can skip the two FK passes.
 */
export function needsGroundCorrection(profile: {
  thighBias: number; shinBias: number; footBias: number; toeBias: number; pelvisBreadth: number;
}): boolean {
  return !(profile.thighBias === 1 && profile.shinBias === 1
    && profile.footBias === 1 && profile.toeBias === 1 && profile.pelvisBreadth === 1);
}

/**
 * Pack the 11 solver rest translations out of a name-keyed source.
 * Throws rather than silently zero-filling, because a missing ground joint would
 * make the solve wrong in a way no test downstream would notice.
 */
export function packGroundRest(
  lookup: (joint: string) => readonly [number, number, number] | undefined,
): Float64Array {
  const out = new Float64Array(COUNT * 3);
  for (let i = 0; i < COUNT; i += 1) {
    const name = GROUND_SOLVER_JOINTS[i];
    if (name === undefined) throw new Error(`solver joint ${i} is undefined`);
    const translation = lookup(name);
    if (!translation) throw new Error(`ground solver: no rest translation for "${name}"`);
    out[i * 3] = translation[0];
    out[i * 3 + 1] = translation[1];
    out[i * 3 + 2] = translation[2];
  }
  return out;
}
