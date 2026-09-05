/**
 * The retarget step: normalise the 400-clip library ONCE at load so it plays on a
 * body of any proportions. There is no per-body copy of the library — it is
 * decoded once and shared by every actor.
 *
 * Three things happen, and only the second is the one the brief predicted:
 *
 * 1. STRIP the inert tracks. Measured on the shipped library: it is not 400 clips
 *    of rotation, it is 78,000 channels — rotation AND translation AND scale on
 *    all 65 joints of all 400 clips (per-clip shape "65/65/65", 400 of 400).
 *      - the 25,600 non-Hips position tracks are constant: worst intra-clip
 *        spread 6.48e-7 rig units, and they equal the body's bind translations to
 *        within 5.00e-5 (0.09 mm at 1.8 m).
 *      - the 26,000 scale tracks are unit: worst |scale - 1| = 1.74e-5.
 *    Harmless on the source body, fatal on a re-proportioned one: an
 *    AnimationMixer writes those constants onto whatever bones it is bound to, so
 *    they stamp the SOURCE rig's bone lengths back on every frame and the variant
 *    ceases to exist. Dropping them is a correctness fix, not an optimisation.
 *    Measured: 51,600 of 78,000 bindings removed (66.2%).
 *
 *    One honest side effect of dropping the scale tracks: 44 of the shipped
 *    body's 67 nodes carry float32 scale noise around 1 (worst, LeftUpLeg at
 *    [1.0000076, 0.9999998, 1.0000197]). Today the library's scale tracks
 *    overwrite that noise with their own ~1 values; afterwards the body keeps its
 *    own. Both are within 2e-5 of unity, so the difference is sub-micrometre at
 *    1.8 m — but it is a behaviour change, not a no-op, and it is why the test
 *    fixture's forward kinematics applies node scale.
 *
 * 2. NORMALISE the root motion. The Hips position track is the only
 *    proportion-dependent data in the library. Divide it by the reference
 *    standing hip height and it becomes dimensionless — pelvis position in
 *    standing hip heights — and the runtime multiplies by the playing body's own.
 *
 * 3. REBIND it onto a root-motion proxy node rather than the Hips bone.
 *    three's PropertyMixer blends an action against the BINDING'S ORIGINAL VALUE
 *    whenever accumulated weight is below one (crossfade-in, additive). On the
 *    Hips bone that original value is the bind translation in rig units, and
 *    blending it against a dimensionless quantity is meaningless. On a zero-rest
 *    proxy the blend stays linear in the normalised quantity and the affine map
 *    is applied afterwards, so it commutes with convex blending:
 *        sum(w_i * n_i) * h  ===  sum(w_i * (n_i * h))   when sum(w_i) = 1.
 *
 * ---------------------------------------------------------------------------
 * HOW LEG LENGTH IS DEFINED AND MEASURED
 * ---------------------------------------------------------------------------
 * The divisor is STANDING HIP HEIGHT, not the leg bone chain:
 *
 *     hipHeight = worldY(Hips) - min(worldY over the six sole joints),
 *                 in the BIND pose, in rig units.
 *
 * Measured on the shipped body: 0.551676. The leg bone chain
 * (UpLeg->Leg->Foot) is 0.470431 — they differ by the ankle-to-sole height
 * (0.051837) and the pelvis drop (0.031353).
 *
 * Hip height is the right one for three reasons, all measured:
 *   - The track encodes pelvis height above the floor, so hip height is what it
 *     is dimensionally. `BasicLocomotion__Idle` holds z at -0.54987 against a
 *     bind hip height of 0.551676 — a 99.67% stance, i.e. a natural soft knee.
 *   - The library's floor is the lowest sole JOINT at Y = 0 (median 0.000357
 *     over all 400 clips; 385 of 400 within +/-0.02). The mesh bounding box
 *     sits 0.004105 rig units lower and using it biases every hip height.
 *   - Under THE ONE RULE the two coincide exactly (measured: for every
 *     ground-locked profile the leg-chain ratio equals `ground` to 4 decimals),
 *     and when the rule is broken hip height is strictly better: on a dwarf
 *     profile it leaves 19.04 mm against the leg chain's 29.21 mm.
 *
 * The track is in RIG UNITS in the armature's Z-up frame, not metres: local x is
 * lateral, local y is forward travel, local z is vertical with a NEGATIVE sign.
 * Verified by perturbing each hips-local axis and reading the world delta.
 */

import {
  REFERENCE_HIP_HEIGHT,
  type BodyProportionProfile,
  type RigMetrics,
  deriveRigMetrics,
} from "./bodyProportionProfile.ts";
import { HIPS_UP_AXIS, HIPS_UP_SIGN, canonicalizeJointName } from "./humanoidSkeletonContract.ts";

/** The node the normalised root motion is bound to. Add one per model. */
export const ROOT_MOTION_NODE = "SDRootMotion";

/** Structural stand-in for THREE.KeyframeTrack. */
export interface KeyframeTrackLike {
  name: string;
  readonly times: ArrayLike<number>;
  values: Float32Array | Float64Array | number[];
}

/** Structural stand-in for THREE.AnimationClip. */
export interface AnimationClipLike {
  readonly name: string;
  tracks: KeyframeTrackLike[];
}

export interface NormalizationOptions {
  /**
   * Tolerance for calling a non-Hips position track constant, in rig units.
   * Measured worst intra-clip spread on the shipped library: 6.48e-7.
   */
  readonly constantPositionEpsilon?: number;
  /** Tolerance for calling a scale track unit. Measured worst: 1.74e-5. */
  readonly unitScaleEpsilon?: number;
  /** The reference standing hip height to divide the root track by. */
  readonly referenceHipHeight?: number;
}

export interface NormalizationAnomaly {
  readonly clip: string;
  readonly track: string;
  readonly kind: "animated-position" | "non-unit-scale" | "aliased-root-track" | "missing-root-track";
  readonly detail: string;
}

export interface NormalizationReport {
  readonly clips: number;
  readonly tracksBefore: number;
  readonly tracksAfter: number;
  readonly rootTracksNormalized: number;
  /** Root-motion value arrays shared by more than one clip. Divided exactly once. */
  readonly aliasedRootArrays: number;
  readonly anomalies: readonly NormalizationAnomaly[];
}

const POSITION_SUFFIX = ".position";
const QUATERNION_SUFFIX = ".quaternion";
const SCALE_SUFFIX = ".scale";

function splitTrackName(name: string): { node: string; property: string } | null {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return null;
  return { node: name.slice(0, dot), property: name.slice(dot) };
}

function spread(values: ArrayLike<number>, stride: number, component: number): number {
  let min = Infinity;
  let max = -Infinity;
  for (let i = component; i < values.length; i += stride) {
    const v = values[i] ?? 0;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return max - min;
}

/**
 * Normalise a decoded library in place.
 *
 * Idempotent: a second pass recognises the proxy node and leaves it alone rather
 * than dividing twice.
 *
 * ALIASING GUARD. Measured on the shipped library: 6,474 output accessors are
 * shared by more than one channel (identical accessors deduplicate on export —
 * `BasicLocomotion__Walking` and `MaleLocomotion__Walking` are byte-identical),
 * and 22 of those carry ROOT MOTION, covering 44 clips. An unguarded in-place
 * rewrite divides each of those arrays once per clip that references it. Measured
 * consequence on a ground=0.7 body: a pelvis at 447.9 mm instead of 639.9 mm —
 * 192.0 mm off, on 44 clips. This function divides each backing array exactly
 * once, keyed by array identity.
 */
export function normalizeHumanoidLibrary(
  clips: readonly AnimationClipLike[],
  options: NormalizationOptions = {},
): NormalizationReport {
  const positionEpsilon = options.constantPositionEpsilon ?? 1e-5;
  const scaleEpsilon = options.unitScaleEpsilon ?? 1e-4;
  const hipHeight = options.referenceHipHeight ?? REFERENCE_HIP_HEIGHT;

  const anomalies: NormalizationAnomaly[] = [];
  const dividedArrays = new Set<object>();
  const rootArrayUsers = new Map<object, number>();

  let tracksBefore = 0;
  let tracksAfter = 0;
  let rootTracksNormalized = 0;

  for (const clip of clips) {
    tracksBefore += clip.tracks.length;
    const kept: KeyframeTrackLike[] = [];
    let sawRoot = false;

    for (const track of clip.tracks) {
      const parts = splitTrackName(track.name);
      if (!parts) {
        kept.push(track);
        continue;
      }
      const { node, property } = parts;

      if (property === QUATERNION_SUFFIX) {
        kept.push(track);
        continue;
      }

      // Already-normalised root motion: recognise the proxy and pass it through.
      if (node === ROOT_MOTION_NODE) {
        kept.push(track);
        sawRoot = true;
        continue;
      }

      const canonical = canonicalizeJointName(node);

      if (property === SCALE_SUFFIX) {
        for (let i = 0; i < track.values.length; i += 1) {
          if (Math.abs((track.values[i] ?? 1) - 1) > scaleEpsilon) {
            anomalies.push({
              clip: clip.name, track: track.name, kind: "non-unit-scale",
              detail: `scale departs from 1 by ${Math.abs((track.values[i] ?? 1) - 1).toExponential(3)}`,
            });
            break;
          }
        }
        continue; // dropped
      }

      if (property === POSITION_SUFFIX) {
        if (canonical !== "Hips") {
          let worst = 0;
          for (let c = 0; c < 3; c += 1) worst = Math.max(worst, spread(track.values, 3, c));
          if (worst > positionEpsilon) {
            anomalies.push({
              clip: clip.name, track: track.name, kind: "animated-position",
              detail: `non-Hips position track actually animates (spread ${worst.toExponential(3)}); dropping it would lose authored motion`,
            });
          }
          continue; // dropped
        }

        // Root motion: normalise, exactly once per backing array.
        const backing = track.values as unknown as object;
        rootArrayUsers.set(backing, (rootArrayUsers.get(backing) ?? 0) + 1);
        if (!dividedArrays.has(backing)) {
          dividedArrays.add(backing);
          const values = track.values;
          for (let i = 0; i < values.length; i += 1) values[i] = (values[i] ?? 0) / hipHeight;
          rootTracksNormalized += 1;
        }
        track.name = `${ROOT_MOTION_NODE}${POSITION_SUFFIX}`;
        kept.push(track);
        sawRoot = true;
        continue;
      }

      kept.push(track);
    }

    if (!sawRoot) {
      anomalies.push({
        clip: clip.name, track: "(none)", kind: "missing-root-track",
        detail: "clip has no Hips position track; the body will not be placed vertically",
      });
    }

    clip.tracks = kept;
    tracksAfter += kept.length;
  }

  let aliasedRootArrays = 0;
  for (const users of rootArrayUsers.values()) if (users > 1) aliasedRootArrays += 1;

  return { clips: clips.length, tracksBefore, tracksAfter, rootTracksNormalized, aliasedRootArrays, anomalies };
}

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------

export interface Vec3Like { x: number; y: number; z: number }

/**
 * Turn the normalised proxy position into this body's Hips local translation.
 *
 * Call once per frame, AFTER `mixer.update()` and BEFORE `updateMatrixWorld`.
 * Three multiplies, plus the optional ground-drop correction from
 * `groundDropCorrection.ts`.
 *
 * One scalar does both axes on purpose: hip height sits on the legs and stride
 * length scales with the legs, so the same `hipHeight` normalises the vertical
 * and horizontal channels alike.
 *
 * @param groundYCorrection world-up correction in RIG UNITS (see
 *   `solveGroundDrop`). Applied along the hips-local up axis, which is local z
 *   with a negative sign.
 */
export function applyRootMotion(
  proxyPosition: Readonly<Vec3Like>,
  hipsPosition: Vec3Like,
  metrics: RigMetrics,
  groundYCorrection = 0,
): void {
  const scale = metrics.hipHeight;
  hipsPosition.x = proxyPosition.x * scale;
  hipsPosition.y = proxyPosition.y * scale;
  hipsPosition.z = proxyPosition.z * scale;
  if (groundYCorrection !== 0) {
    const axis = HIPS_UP_AXIS === 2 ? "z" : HIPS_UP_AXIS === 1 ? "y" : "x";
    hipsPosition[axis] += HIPS_UP_SIGN * groundYCorrection;
  }
}

/** Convenience for callers holding a profile rather than metrics. */
export function rootMotionScaleFor(profile: BodyProportionProfile): number {
  return deriveRigMetrics(profile).rootMotionScale;
}
