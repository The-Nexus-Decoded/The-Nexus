/**
 * The creator's choreography as numbers.
 *
 * How far the head may follow the pointer on each station, the shape of every additive
 * cue the body answers with (nod, shake, brace, settle), the memory-station glance and
 * the awaken timeline. Pure - no three.js, no DOM - so every envelope is unit-tested as a
 * function of time and `CreationAvatarPreview` only has to write the results onto bones.
 */

const DEGREES_TO_RADIANS = Math.PI / 180;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function easeOutQuad(t: number): number {
  const x = clamp(t, 0, 1);
  return 1 - (1 - x) * (1 - x);
}

export function easeInOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/** The seven stations as the choreography sees them: body and face are separate stops. */
export type CreatorStation = "name" | "race" | "body" | "face" | "calling" | "memory" | "review";

/** Radians. Yaw turns toward screen-right, pitch looks up. */
export interface CreatorGazeAngles {
  yaw: number;
  pitch: number;
}

export interface CreatorGazeLimitsDegrees {
  yawDegrees: number;
  pitchDegrees: number;
}

export interface CreatorStationChoreography {
  /** Multiplier on every gaze input: the pointer, hover overrides and the idle drift. */
  gazeScale: number;
  /** Hard limit on the scaled gaze; the face close-up cannot afford a full turn. */
  gazeClamp?: CreatorGazeLimitsDegrees;
  /** Weight-shift amplitude once the figure has been left alone: 1 full, 0.5 half, 0 off. */
  settle: number;
}

export const CREATOR_STATION_CHOREOGRAPHY: Readonly<Record<CreatorStation, CreatorStationChoreography>> = Object.freeze({
  name: { gazeScale: 0.4, settle: 0 },
  race: { gazeScale: 1, settle: 1 },
  body: { gazeScale: 1, settle: 1 },
  face: { gazeScale: 1, gazeClamp: { yawDegrees: 16, pitchDegrees: 8 }, settle: 0.5 },
  calling: { gazeScale: 1, settle: 0 },
  memory: { gazeScale: 1, settle: 0 },
  review: { gazeScale: 0.6, settle: 0 },
});

/** A hover or swatch override never turns the head past this share of the station's limit. */
export const CREATOR_GAZE_OVERRIDE_CAP = 0.6;
/** An override lingers this long after the pointer leaves the element. */
export const CREATOR_GAZE_OVERRIDE_RELEASE_MS = 600;
/** The weight eases out this fast when a drag or a clip takes the head, and back in this slowly. */
export const CREATOR_GAZE_WEIGHT_MS = Object.freeze({ out: 200, in: 600 });
/** With no pointer the target wanders on a slow sine so the figure never stares. */
export const CREATOR_GAZE_DRIFT = Object.freeze({ afterMs: 2500, yawDegrees: 4, periodMs: 7000 });
/** After this long without a hand on the figure it shifts its weight. */
export const CREATOR_SETTLE_IDLE_MS = 9000;

/** The station's gaze limit in radians: the base limit scaled, then clamped where the station says so. */
export function stationGazeLimits(
  profile: CreatorStationChoreography,
  limits: CreatorGazeLimitsDegrees,
): CreatorGazeAngles {
  const yawDegrees = Math.min(limits.yawDegrees * profile.gazeScale, profile.gazeClamp?.yawDegrees ?? Infinity);
  const pitchDegrees = Math.min(limits.pitchDegrees * profile.gazeScale, profile.gazeClamp?.pitchDegrees ?? Infinity);
  return { yaw: yawDegrees * DEGREES_TO_RADIANS, pitch: pitchDegrees * DEGREES_TO_RADIANS };
}

/**
 * Applies the station's amplitude to a gaze computed at the base limits. Every input goes
 * through here - the pointer, hover overrides, the drift - so no station can be out-turned
 * by a programmatic target; overrides are capped a second time.
 */
export function scaleGazeAngles(
  angles: CreatorGazeAngles,
  profile: CreatorStationChoreography,
  limits: CreatorGazeLimitsDegrees,
  override = false,
): CreatorGazeAngles {
  const limit = stationGazeLimits(profile, limits);
  const cap = override ? CREATOR_GAZE_OVERRIDE_CAP : 1;
  return {
    yaw: clamp(angles.yaw * profile.gazeScale, -limit.yaw * cap, limit.yaw * cap),
    pitch: clamp(angles.pitch * profile.gazeScale, -limit.pitch * cap, limit.pitch * cap),
  };
}

/** Pointer (or element centre) in client pixels to canvas NDC, right and up positive. */
export function gazeTargetFromPointer(
  clientX: number,
  clientY: number,
  canvasRect: { left: number; top: number; width: number; height: number },
): { x: number; y: number } | null {
  if (canvasRect.width < 1 || canvasRect.height < 1) return null;
  return {
    x: ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1,
    y: 1 - ((clientY - canvasRect.top) / canvasRect.height) * 2,
  };
}

/**
 * Yaw (radians) the unattended gaze wanders by; zero until the pointer has been gone a
 * while. The sine starts from zero, so the sway needs no ramp to come in without a snap.
 */
export function gazeDriftYaw(idleMs: number): number {
  const { afterMs, yawDegrees, periodMs } = CREATOR_GAZE_DRIFT;
  if (!(idleMs > afterMs)) return 0;
  return yawDegrees * DEGREES_TO_RADIANS * Math.sin(((idleMs - afterMs) / periodMs) * Math.PI * 2);
}

/** 0..1 plateau: eases in over `blendMs`, holds `holdMs`, eases out over `blendMs`. */
export function holdEnvelope(elapsedMs: number, blendMs: number, holdMs: number): number {
  if (!(elapsedMs > 0)) return 0;
  if (elapsedMs < blendMs) return easeInOutCubic(elapsedMs / blendMs);
  if (elapsedMs < blendMs + holdMs) return 1;
  if (elapsedMs < blendMs * 2 + holdMs) return 1 - easeInOutCubic((elapsedMs - blendMs - holdMs) / blendMs);
  return 0;
}

/** The fourth memory ends with the figure looking down into the water. */
export const CREATOR_MEMORY_GLANCE = Object.freeze({ pitchDegrees: -8, holdMs: 1200, blendMs: 400 });

/** NpcListen starts this far into the camera move when a memory station follows another stop. */
export const CREATOR_MEMORY_LISTEN_TWEEN_FRACTION = 0.6;

export function memoryListenDelayMs(cameraMoved: boolean, tweenMs: number): number {
  return cameraMoved ? Math.round(tweenMs * CREATOR_MEMORY_LISTEN_TWEEN_FRACTION) : 0;
}

// ---------------------------------------------------------------------------- cues

export type CreatorCue = "nod" | "shake" | "brace" | "settle";

export const CREATOR_CUE_TIMING = Object.freeze({
  nod: { riseMs: 180, returnMs: 300 },
  /** -1 -> +1 -> 0 in three equal swings. */
  shake: { swingMs: 120, swings: 3 },
  brace: { riseMs: 220, holdMs: 600, releaseMs: 500 },
  settle: { durationMs: 900 },
});

export const CREATOR_CUE_AMPLITUDE = Object.freeze({
  /** Head, about its ear-to-ear axis; positive nods down. */
  nodPitchDegrees: 7,
  /** Head, about its up axis; the swing alternates sides. */
  shakeYawDegrees: 6,
  /** Spine1 lifts the chest; the shoulders square by mirrored rotations about their length. */
  braceSpinePitchDegrees: -2.5,
  braceShoulderDegrees: 1.5,
  /** Hips slide sideways and Spine1 counter-rolls so the head stays over the feet. */
  settleHipsMetres: 0.012,
  settleSpineRollDegrees: 1.2,
});

export function cueDurationMs(cue: CreatorCue): number {
  switch (cue) {
    case "nod": return CREATOR_CUE_TIMING.nod.riseMs + CREATOR_CUE_TIMING.nod.returnMs;
    case "shake": return CREATOR_CUE_TIMING.shake.swingMs * CREATOR_CUE_TIMING.shake.swings;
    case "brace": return CREATOR_CUE_TIMING.brace.riseMs + CREATOR_CUE_TIMING.brace.holdMs + CREATOR_CUE_TIMING.brace.releaseMs;
    default: return CREATOR_CUE_TIMING.settle.durationMs;
  }
}

/**
 * The cue's envelope at `elapsedMs` since it was triggered. Nod and brace are 0..1 and
 * return to 0; shake is -1..1 and returns to 0; settle is 0..1 and holds at 1 (the caller
 * multiplies in the side it settled toward).
 */
export function cueEnvelope(cue: CreatorCue, elapsedMs: number): number {
  if (!(elapsedMs > 0)) return 0;
  switch (cue) {
    case "nod": {
      const { riseMs, returnMs } = CREATOR_CUE_TIMING.nod;
      if (elapsedMs < riseMs) return easeOutQuad(elapsedMs / riseMs);
      if (elapsedMs < riseMs + returnMs) return 1 - easeInOutCubic((elapsedMs - riseMs) / returnMs);
      return 0;
    }
    case "shake": {
      const { swingMs, swings } = CREATOR_CUE_TIMING.shake;
      if (elapsedMs >= swingMs * swings) return 0;
      const swing = Math.floor(elapsedMs / swingMs);
      const t = easeInOutCubic((elapsedMs - swing * swingMs) / swingMs);
      // Swing targets: 0 -> -1 -> +1 -> 0.
      const from = swing === 0 ? 0 : swing === 1 ? -1 : 1;
      const to = swing === 0 ? -1 : swing === 1 ? 1 : 0;
      return from + (to - from) * t;
    }
    case "brace": {
      const { riseMs, holdMs, releaseMs } = CREATOR_CUE_TIMING.brace;
      if (elapsedMs < riseMs) return easeOutQuad(elapsedMs / riseMs);
      if (elapsedMs < riseMs + holdMs) return 1;
      if (elapsedMs < riseMs + holdMs + releaseMs) return 1 - easeInOutCubic((elapsedMs - riseMs - holdMs) / releaseMs);
      return 0;
    }
    default:
      return easeInOutCubic(elapsedMs / CREATOR_CUE_TIMING.settle.durationMs);
  }
}

// -------------------------------------------------------------------------- awaken

export type AwakenAction = "fade-chrome" | "dissolve" | "hide";

export interface AwakenStep {
  readonly atMs: number;
  readonly action: AwakenAction;
}

/** Farewell must be playing within this long of Awaken, or the quick path runs instead. */
export const AWAKEN_CLIP_CAP_MS = 600;

/**
 * What the shell does after Awaken, relative to t0 - the moment the Farewell clip is
 * confirmed playing (or the cap expires). With the clip: the chrome fades while the figure
 * takes its leave, the dissolve follows, and the game is handed the profile once the
 * dissolve has finished. Without it: the existing 520 ms dissolve. Under reduced motion
 * the CSS clamp makes the dissolve instant, so there is nothing to wait for.
 */
export function awakenTimeline(reducedMotion: boolean, farewellBound = false): readonly AwakenStep[] {
  if (reducedMotion) return [{ atMs: 0, action: "hide" }];
  if (farewellBound) {
    return [
      { atMs: 1800, action: "fade-chrome" },
      { atMs: 2200, action: "dissolve" },
      { atMs: 2720, action: "hide" },
    ];
  }
  return [
    { atMs: 0, action: "dissolve" },
    { atMs: 520, action: "hide" },
  ];
}

/** `bound` within `capMs`, otherwise false; a rejection is also false (never an error at Awaken). */
export function resolveWithin(bound: Promise<boolean>, capMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), capMs);
    bound.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(false);
      },
    );
  });
}
