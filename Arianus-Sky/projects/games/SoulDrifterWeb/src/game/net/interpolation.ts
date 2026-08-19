/**
 * Snapshot interpolation for remote players (pure math, no I/O).
 *
 * Each remote player gets a buffer of timestamped states. We render
 * MP_RENDER_DELAY_MS behind the newest snapshot and lerp between the two
 * snapshots bracketing the render time, which hides jitter at 12-20 Hz
 * update rates. Pure and unit-testable.
 */

import type { MpPlayerState } from "./protocol";

export const MP_RENDER_DELAY_MS = 120;
/** Snapshots older than this beyond the render window are dropped. */
const MAX_BUFFER_AGE_MS = 2000;
/** Teleport (snap instantly) when a single step exceeds this distance. */
const TELEPORT_DISTANCE = 6;

export interface TimedState {
  at: number;
  state: MpPlayerState;
}

export interface InterpolatedPose {
  x: number;
  y: number;
  z: number;
  heading: number;
  anim: string;
  /** True when the pose came from a teleport snap rather than a lerp. */
  snapped: boolean;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Shortest-arc angle lerp so headings wrap across ±π cleanly. */
export function lerpAngle(a: number, b: number, t: number): number {
  let diff = (b - a) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export class SnapshotBuffer {
  private snapshots: TimedState[] = [];

  constructor(
    private readonly renderDelayMs: number = MP_RENDER_DELAY_MS,
    private readonly teleportDistance: number = TELEPORT_DISTANCE,
  ) {}

  push(at: number, state: MpPlayerState): void {
    const last = this.snapshots[this.snapshots.length - 1];
    // Drop out-of-order duplicates but tolerate slight reordering by seq.
    if (last && state.seq <= last.state.seq) return;
    this.snapshots.push({ at, state });
    const cutoff = at - MAX_BUFFER_AGE_MS;
    while (this.snapshots.length > 2 && this.snapshots[0]!.at < cutoff) this.snapshots.shift();
  }

  clear(): void {
    this.snapshots = [];
  }

  get size(): number {
    return this.snapshots.length;
  }

  /** Pose for `now` (same clock as `at` values passed to push). */
  sample(now: number): InterpolatedPose | null {
    if (this.snapshots.length === 0) return null;
    const renderAt = now - this.renderDelayMs;
    const newest = this.snapshots[this.snapshots.length - 1]!;
    const oldest = this.snapshots[0]!;

    if (renderAt >= newest.at) return poseOf(newest.state, false);
    if (renderAt <= oldest.at) return poseOf(oldest.state, false);

    let upper = 1;
    while (upper < this.snapshots.length && this.snapshots[upper]!.at < renderAt) upper++;
    const a = this.snapshots[upper - 1]!;
    const b = this.snapshots[upper]!;
    const span = b.at - a.at;
    const t = span <= 0 ? 1 : (renderAt - a.at) / span;

    const dx = b.state.p[0] - a.state.p[0];
    const dy = b.state.p[1] - a.state.p[1];
    const dz = b.state.p[2] - a.state.p[2];
    if (Math.hypot(dx, dy, dz) > this.teleportDistance) return poseOf(b.state, true);

    return {
      x: lerp(a.state.p[0], b.state.p[0], t),
      y: lerp(a.state.p[1], b.state.p[1], t),
      z: lerp(a.state.p[2], b.state.p[2], t),
      heading: lerpAngle(a.state.h, b.state.h, t),
      anim: t < 0.5 ? a.state.a : b.state.a,
      snapped: false,
    };
  }
}

function poseOf(state: MpPlayerState, snapped: boolean): InterpolatedPose {
  return { x: state.p[0], y: state.p[1], z: state.p[2], heading: state.h, anim: state.a, snapped };
}
