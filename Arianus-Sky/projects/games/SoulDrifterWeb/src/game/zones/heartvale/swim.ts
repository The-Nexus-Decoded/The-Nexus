/**
 * Heartvale water — swimmable-water logic (#453 owner directive).
 *
 * Pure, headless-testable domain logic: real depth from the HeightField
 * river carve (never a flat plane), flow direction from the river polylines,
 * wade→swim classification, breath/drowning model. The Three.js side
 * (player controller, splash rings, underwater overlay) consumes this; the
 * multiplayer/gameplay-authority wiring is explicitly NOT this ticket.
 */

import { WATER_TUNING, type WaterTuning } from "./waterTuning";

export interface HeightSource {
  height(x: number, z: number): number;
}

export interface RiverCourse {
  id: string;
  /** soulwell-local meters, downstream order. */
  samples: [number, number][];
  /** Visual half-width of the ribbon (m). */
  halfWidth: number;
}

export type WaterContact = "dry" | "wade" | "swim";

export class WaterBody {
  readonly tuning: WaterTuning;
  private readonly field: HeightSource;
  private readonly courses: RiverCourse[];
  private readonly lift: number;

  constructor(field: HeightSource, courses: RiverCourse[], tuning: WaterTuning = WATER_TUNING) {
    this.field = field;
    this.courses = courses;
    this.tuning = tuning;
    this.lift = tuning.waterLift;
  }

  /** Nearest river sample + segment, or null when beyond every corridor. */
  private nearest(x: number, z: number): { course: RiverCourse; index: number; distance: number } | null {
    let best: { course: RiverCourse; index: number; distance: number } | null = null;
    for (const course of this.courses) {
      for (let i = 0; i < course.samples.length; i += 1) {
        const [sx, sz] = course.samples[i]!;
        const d = Math.hypot(x - sx, z - sz);
        if (!best || d < best.distance) best = { course, index: i, distance: d };
      }
    }
    return best;
  }

  /** Water surface height at (x, z), or null when not over a river corridor. */
  waterSurfaceAt(x: number, z: number): number | null {
    const near = this.nearest(x, z);
    if (!near || near.distance > near.course.halfWidth + 1.5) return null;
    const [sx, sz] = near.course.samples[near.index]!;
    return this.field.height(sx, sz) + this.lift;
  }

  /** Real depth under the surface at (x, z); 0 when dry. */
  depthAt(x: number, z: number): number {
    const surface = this.waterSurfaceAt(x, z);
    if (surface === null) return 0;
    return Math.max(0, surface - this.field.height(x, z));
  }

  /** dry → wade → swim by real depth (tunable thresholds). */
  classifyAt(x: number, z: number): WaterContact {
    const depth = this.depthAt(x, z);
    if (depth < this.tuning.wadeKneeDepth) return "dry";
    if (depth < this.tuning.swimDepth) return "wade";
    return "swim";
  }

  /** Downstream unit vector of the nearest river segment; null when dry. */
  flowAt(x: number, z: number): { x: number; z: number } | null {
    const near = this.nearest(x, z);
    if (!near || near.distance > near.course.halfWidth + 1.5) return null;
    const { course, index } = near;
    const next = course.samples[Math.min(index + 1, course.samples.length - 1)]!;
    const prev = course.samples[Math.max(index - 1, 0)]!;
    const dx = next[0] - prev[0];
    const dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) return null;
    return { x: dx / len, z: dz / len };
  }

  /** Current drift vector (m/s) at (x, z): flow scaled by tunable strength,
   * reduced while wading (feet on the bed resist the push). */
  currentAt(x: number, z: number): { x: number; z: number } {
    const flow = this.flowAt(x, z);
    if (!flow) return { x: 0, z: 0 };
    const contact = this.classifyAt(x, z);
    const factor = contact === "swim" ? 1 : this.tuning.currentWadeFactor;
    return { x: flow.x * this.tuning.currentStrength * factor, z: flow.z * this.tuning.currentStrength * factor };
  }
}

/** Breath meter + forgiving EQ-style drowning (#453). */
export class BreathMeter {
  readonly tuning: WaterTuning;
  breath: number;
  health: number;

  constructor(tuning: WaterTuning = WATER_TUNING) {
    this.tuning = tuning;
    this.breath = tuning.breathMaxSeconds;
    this.health = tuning.startHealth;
  }

  /** Advance one frame. `headSubmerged` = the head is under the surface. */
  update(dt: number, headSubmerged: boolean): void {
    if (headSubmerged) {
      this.breath = Math.max(0, this.breath - dt);
      if (this.breath === 0) {
        this.health = Math.max(0, this.health - this.tuning.drownDamagePerSecond * dt);
      }
    } else {
      this.breath = Math.min(this.tuning.breathMaxSeconds, this.breath + this.tuning.breathRefillPerSecond * dt);
    }
  }

  get breathFraction(): number {
    return this.breath / this.tuning.breathMaxSeconds;
  }

  get healthFraction(): number {
    return this.health / this.tuning.startHealth;
  }
}
