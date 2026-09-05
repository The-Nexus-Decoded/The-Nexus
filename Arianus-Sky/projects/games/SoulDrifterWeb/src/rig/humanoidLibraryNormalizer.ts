/**
 * Normalise the shared humanoid animation library once, at load.
 *
 * WHAT THE SHIPPED LIBRARY ACTUALLY CONTAINS (measured 2026-09-04, all 400 clips)
 *   400 clips x 65 joints x 3 channels = 78,000 tracks.
 *   Every joint carries a position track AND a scale track in every clip.
 *   All 64 non-Hips position tracks are constant: worst within-clip spread 7.138e-7 rig units,
 *     worst deviation from the body's own bind translation 6.352e-5 rig units (0.42% of
 *     RightHandThumb2, 0.114 mm at 1.8 m).
 *   All 65 scale tracks are constant 1 within 1.740e-5.
 *   Only the Hips position track varies, in 398 of 400 clips.
 *
 * So the library is rotation-only in substance but not in form, and the form is dangerous:
 * an AnimationMixer will happily write those constant positions onto a body whose bones are a
 * different length, stamping the source rig's proportions back onto it every frame. Dropping
 * them is a correctness fix, not an optimisation. The optimisation comes free: 78,000 tracks
 * become 26,400 (66.2% fewer bindings) and the decoded float payload drops from 21.73 MB to
 * 20.16 MB.
 *
 * WHAT THE HIPS TRACK IS
 * Not metres. Rig units, in the armature's Z-up frame, measured from the FLOOR: the vertical
 * channel of BasicLocomotion__Idle averages 0.54987 rig units against a bind hip height of
 * 0.555782 — a natural slightly-flexed stance at 98.9% of the locked-knee bind. Playing a clip
 * without this track drops the body 889 mm through the floor at 1.8 m, because the bind pose
 * sits with its origin at mid-height. Cross-checked against known speeds: BasicLocomotion__Walking
 * travels 0.941 rig units in 1.07 s = 1.59 m/s at 1.8 m, and MaleLocomotion__StandardRun 4.15 m/s.
 *
 * WHAT NORMALISATION DOES
 * Divides that track by the reference standing hip height, making it dimensionless — "pelvis
 * height in units of this body's own standing hip height". Every body then multiplies by its
 * own hip height. One decoded library, shared by every actor; the per-body cost is one
 * Object3D and three multiplies per frame.
 */

import { canonicalizeJointName } from "./humanoidRigContract";
import { REFERENCE_METRICS } from "./proportionProfile";

/** The proxy node the root-motion track is retargeted onto. See `createRootMotionProxy`. */
export const ROOT_MOTION_NODE = "SDRootMotion";

/** Worst measured within-clip spread of a constant position track is 7.138e-7 rig units. */
export const CONSTANT_TRACK_EPSILON = 1e-5;
/** Worst measured deviation from the body bind is 6.352e-5 rig units; 5e-4 is 0.9 mm at 1.8 m. */
export const BIND_AGREEMENT_EPSILON = 5e-4;
/** Worst measured |scale - 1| is 1.740e-5. */
export const UNIT_SCALE_EPSILON = 1e-3;

export interface TrackLike {
  name: string;
  readonly values: { length: number; [index: number]: number };
}

export interface ClipLike {
  readonly name: string;
  tracks: TrackLike[];
}

export interface NormalizeOptions {
  /**
   * Canonical joint stem -> that joint's bind translation on the body the library will play on.
   * When supplied, every dropped position track is checked against it, so a library authored
   * for a different rig is reported instead of silently discarded.
   */
  readonly referenceBind?: ReadonlyMap<string, readonly [number, number, number]>;
  /** Standing hip height of the rig the clips were authored on, in rig units. */
  readonly sourceHipHeight?: number;
  /** Where the root-motion track should end up. Defaults to the proxy node. */
  readonly rootMotionTarget?: string;
}

export interface NormalizeReport {
  readonly clips: number;
  readonly tracksBefore: number;
  readonly tracksAfter: number;
  readonly droppedConstantPosition: number;
  readonly droppedUnitScale: number;
  readonly rootMotionTracks: number;
  /**
   * Root-motion tracks that shared a values array already rewritten by an earlier clip.
   * The glTF deduplicates identical accessors, so duplicate clips hand back the SAME
   * Float32Array — measured, 18,191 of the shipped library's 78,000 tracks share an array
   * with another track. Scaling in place without this guard divides those twice.
   */
  readonly rootMotionTracksAliased: number;
  /** Root-motion tracks already in normalised units from a previous pass. */
  readonly rootMotionTracksAlreadyNormalized: number;
  readonly sourceHipHeight: number;
  /** Tracks that were NOT constant, or disagreed with the body bind. These are real problems. */
  readonly anomalies: readonly string[];
}

function splitTrackName(name: string): { node: string; property: string } {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return { node: name, property: "" };
  return { node: name.slice(0, dot), property: name.slice(dot + 1) };
}

function spreadOf(values: TrackLike["values"], stride: number): number {
  let worst = 0;
  for (let c = 0; c < stride; c += 1) {
    let min = Infinity;
    let max = -Infinity;
    for (let i = c; i < values.length; i += stride) {
      const v = values[i] ?? 0;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const spread = max - min;
    if (spread > worst) worst = spread;
  }
  return worst;
}

/**
 * Rewrite the clips in place. Returns what changed and what looked wrong.
 *
 * Safe to run on an already-normalised library: there is nothing left to drop and no Hips
 * position track left to rewrite, so it is a no-op with a zero report.
 */
export function normalizeHumanoidLibrary(clips: readonly ClipLike[], options: NormalizeOptions = {}): NormalizeReport {
  const sourceHipHeight = options.sourceHipHeight ?? REFERENCE_METRICS.hipHeight;
  const rootMotionTarget = options.rootMotionTarget ?? ROOT_MOTION_NODE;
  const anomalies: string[] = [];
  let tracksBefore = 0;
  let tracksAfter = 0;
  let droppedConstantPosition = 0;
  let droppedUnitScale = 0;
  let rootMotionTracks = 0;
  let rootMotionTracksAliased = 0;
  let rootMotionTracksAlreadyNormalized = 0;
  /** Values arrays already rewritten this pass, so an aliased accessor is not scaled twice. */
  const rewritten = new Set<TrackLike["values"]>();
  /** Values arrays reached by any track that is NOT root motion, to catch cross-kind aliasing. */
  const otherKind = new Set<TrackLike["values"]>();

  for (const clip of clips) {
    tracksBefore += clip.tracks.length;
    const kept: TrackLike[] = [];
    for (const track of clip.tracks) {
      const { node, property } = splitTrackName(track.name);
      const joint = canonicalizeJointName(node);

      // Already normalised by an earlier pass: leave it exactly as it is.
      if (node === rootMotionTarget) {
        rootMotionTracksAlreadyNormalized += 1;
        kept.push(track);
        continue;
      }
      if (!(property === "position" && joint === "Hips")) otherKind.add(track.values);

      if (property === "scale") {
        let worst = 0;
        for (let i = 0; i < track.values.length; i += 1) {
          const d = Math.abs((track.values[i] ?? 1) - 1);
          if (d > worst) worst = d;
        }
        if (worst <= UNIT_SCALE_EPSILON) {
          droppedUnitScale += 1;
          continue;
        }
        anomalies.push(`${clip.name}: ${track.name} is a non-unit scale track (worst |s-1| ${worst.toExponential(3)})`);
        kept.push(track);
        continue;
      }

      if (property === "position") {
        if (joint === "Hips") {
          if (rewritten.has(track.values)) {
            // A duplicate clip pointing at the same accessor. Already in normalised units.
            rootMotionTracksAliased += 1;
          } else {
            if (otherKind.has(track.values)) {
              anomalies.push(`${clip.name}: ${track.name} shares its values array with a non-root-motion track; refusing to rewrite it`);
              kept.push(track);
              continue;
            }
            const inv = 1 / sourceHipHeight;
            for (let i = 0; i < track.values.length; i += 1) {
              track.values[i] = (track.values[i] ?? 0) * inv;
            }
            rewritten.add(track.values);
          }
          track.name = `${rootMotionTarget}.position`;
          rootMotionTracks += 1;
          kept.push(track);
          continue;
        }
        const spread = spreadOf(track.values, 3);
        if (spread > CONSTANT_TRACK_EPSILON) {
          anomalies.push(`${clip.name}: ${track.name} is an ANIMATED position track (spread ${spread.toExponential(3)} rig units)`);
          kept.push(track);
          continue;
        }
        const bind = options.referenceBind?.get(joint);
        if (bind) {
          const dx = (track.values[0] ?? 0) - bind[0];
          const dy = (track.values[1] ?? 0) - bind[1];
          const dz = (track.values[2] ?? 0) - bind[2];
          const off = Math.hypot(dx, dy, dz);
          if (off > BIND_AGREEMENT_EPSILON) {
            anomalies.push(`${clip.name}: ${track.name} disagrees with the body bind by ${off.toExponential(3)} rig units`);
            kept.push(track);
            continue;
          }
        }
        droppedConstantPosition += 1;
        continue;
      }

      kept.push(track);
    }
    clip.tracks = kept;
    tracksAfter += kept.length;
  }

  return {
    clips: clips.length,
    tracksBefore,
    tracksAfter,
    droppedConstantPosition,
    droppedUnitScale,
    rootMotionTracks,
    rootMotionTracksAliased,
    rootMotionTracksAlreadyNormalized,
    sourceHipHeight,
    anomalies,
  };
}

/**
 * The per-frame reconstruction, run after `mixer.update()`.
 *
 * `normalized` is whatever the mixer wrote onto the proxy; `hipHeightRigUnits` is this body's
 * own standing hip height. Both horizontal components and the vertical one take the same
 * factor: hip height is what the track encodes, and stride length scales with it too.
 *
 * Why a proxy rather than leaving the track on the Hips bone: three's PropertyMixer blends an
 * action's value against the binding's ORIGINAL value whenever the accumulated weight is below
 * one — during a crossfade in, or under additive actions. On the Hips bone that original value
 * is the bind translation in rig units, and blending it against a dimensionless normalised
 * value is meaningless. On a proxy whose rest value is zero the blend stays linear in the
 * normalised quantity, and the affine map to rig units is applied afterwards. That also makes
 * the map commute with blending: sum(w_i * n_i) * h == sum(w_i * (n_i * h)) when sum(w_i) = 1.
 */
export function applyRootMotion(
  normalized: { x: number; y: number; z: number },
  hipsPosition: { x: number; y: number; z: number },
  hipHeightRigUnits: number,
): void {
  hipsPosition.x = normalized.x * hipHeightRigUnits;
  hipsPosition.y = normalized.y * hipHeightRigUnits;
  hipsPosition.z = normalized.z * hipHeightRigUnits;
}

/**
 * Track bytes for a decoded library, so the budget can be asserted rather than guessed.
 * Counts values plus times, four bytes each.
 */
export function libraryFloatBytes(clips: readonly ClipLike[], timesLength: (track: TrackLike) => number): number {
  let floats = 0;
  for (const clip of clips) {
    for (const track of clip.tracks) floats += track.values.length + timesLength(track);
  }
  return floats * 4;
}
