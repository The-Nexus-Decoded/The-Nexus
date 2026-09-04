import * as THREE from "three";

import {
  CINDERBOUND_WARDEN_VFX_REFERENCE_HEIGHT_METERS,
  createWardenAshRingVisual,
  createWardenFireBeamVisual,
  createWardenFurnaceShutdownVisual,
  createWardenSoulTaxVisual,
  createWardenSweepWaveVisual,
  createWardenVfxResources,
  type WardenAshRingVisual,
  type WardenFireBeamVisual,
  type WardenFurnaceShutdownVisual,
  type WardenSoulTaxVisual,
  type WardenSweepWaveVisual,
  type WardenVfxResources,
} from "../vfx/cinderbound-warden-vfx";

/**
 * Clip-relative effect timelines for the Cinderbound Warden attacks.
 *
 * Frames are the phase frames of
 * docs/3d-ai-studio/issue-458/cinderbound-warden-motion-v2/attack-plan.json
 * (30 fps). A window is expressed against the spec clip length and rescaled to
 * the runtime clip's real duration, so the shorter Greater Warden exports
 * (CinderSweep 70 frames instead of 84, AshCall 110 instead of 108) keep the
 * effect on the same phase of the motion instead of a fixed fraction.
 */
export const CINDERBOUND_WARDEN_EFFECT_FPS = 30;

export type CinderboundWardenEffectClip = "PalmFire" | "CinderSweep" | "AshCall" | "SoulTax" | "FurnaceShutdown" | "BladeSweep" | "DeathShatter";
export type CinderboundWardenEffectId = "palm-fire" | "cinder-sweep" | "ash-call" | "soul-tax" | "furnace-shutdown" | "blade-sweep" | "death-shatter";

/**
 * The shatter death. Its own clip, alongside DeathCollapse: the collapse is the
 * staged mechanical fall, this one bursts the shell apart on the frame the
 * furnace lets go.
 */
export const CINDERBOUND_WARDEN_SHATTER_CLIP = "DeathShatter";
export type CinderboundWardenEffectPhase = "telegraph" | "active" | "recovery";
export type CinderboundWardenEffectEventPhase = CinderboundWardenEffectPhase | "impact" | "end";

export interface CinderboundWardenEffectWindow {
  /** attack-plan.json phase id that opens the window. */
  readonly from: string;
  readonly startFrame: number;
  /** attack-plan.json phase id that closes the window. */
  readonly until: string;
  readonly endFrame: number;
}

export interface CinderboundWardenEffectTimeline {
  readonly clip: CinderboundWardenEffectClip;
  readonly effect: CinderboundWardenEffectId;
  /** attack-plan.json durationFrames for the clip. */
  readonly specFrames: number;
  readonly telegraph: CinderboundWardenEffectWindow;
  readonly active: CinderboundWardenEffectWindow;
  /** Frame at which the damage/impact event is raised (once per play). */
  readonly impactFrame: number;
  readonly recovery: CinderboundWardenEffectWindow;
  /** Wall-clock seconds the ground residue keeps fading after the clip leaves. */
  readonly lingerSeconds: number;
}

export const CINDERBOUND_WARDEN_EFFECT_TIMELINES: Readonly<Record<CinderboundWardenEffectClip, CinderboundWardenEffectTimeline>> = Object.freeze({
  PalmFire: {
    clip: "PalmFire",
    effect: "palm-fire",
    specFrames: 90,
    telegraph: { from: "aperture-raise", startFrame: 24, until: "fire-release", endFrame: 52 },
    active: { from: "fire-release", startFrame: 52, until: "lower-aperture", endFrame: 78 },
    impactFrame: 52,
    recovery: { from: "lower-aperture", startFrame: 78, until: "guard-return", endFrame: 90 },
    lingerSeconds: 0,
  },
  BladeSweep: {
    clip: "BladeSweep",
    effect: "blade-sweep",
    specFrames: 60,
    telegraph: { from: "anticipation", startFrame: 8, until: "step", endFrame: 22 },
    active: { from: "step", startFrame: 22, until: "follow-through", endFrame: 40 },
    impactFrame: 31,
    recovery: { from: "follow-through", startFrame: 40, until: "guard-return", endFrame: 60 },
    lingerSeconds: 0,
  },
  CinderSweep: {
    clip: "CinderSweep",
    effect: "cinder-sweep",
    specFrames: 84,
    telegraph: { from: "full-load", startFrame: 24, until: "driving-step", endFrame: 36 },
    active: { from: "driving-step", startFrame: 36, until: "powered-follow-through", endFrame: 60 },
    impactFrame: 48,
    recovery: { from: "powered-follow-through", startFrame: 60, until: "guard-return", endFrame: 84 },
    lingerSeconds: 2.5,
  },
  AshCall: {
    clip: "AshCall",
    effect: "ash-call",
    specFrames: 108,
    telegraph: { from: "vent-open", startFrame: 30, until: "ash-expulsion", endFrame: 62 },
    active: { from: "ash-expulsion", startFrame: 62, until: "vent-hold", endFrame: 78 },
    impactFrame: 62,
    recovery: { from: "vent-hold", startFrame: 78, until: "sealed-return", endFrame: 108 },
    lingerSeconds: 1.2,
  },
  SoulTax: {
    clip: "SoulTax",
    effect: "soul-tax",
    specFrames: 120,
    telegraph: { from: "open-palm", startFrame: 34, until: "ring-convergence", endFrame: 52 },
    active: { from: "ring-convergence", startFrame: 52, until: "release", endFrame: 104 },
    impactFrame: 88,
    recovery: { from: "release", startFrame: 104, until: "guard-return", endFrame: 120 },
    lingerSeconds: 0,
  },
  FurnaceShutdown: {
    clip: "FurnaceShutdown",
    effect: "furnace-shutdown",
    specFrames: 120,
    telegraph: { from: "interruption", startFrame: 18, until: "valves-expose", endFrame: 36 },
    active: { from: "valves-expose", startFrame: 36, until: "reignite", endFrame: 88 },
    impactFrame: 88,
    recovery: { from: "reignite", startFrame: 88, until: "powered-return", endFrame: 120 },
    lingerSeconds: 0,
  },
  /**
   * Shatter death. Authored against the same 30 fps phase grid as the other
   * clips: 96 frames from the fatal overload to the ash rest, with the shell
   * letting go on `seam-rupture`. Every window is rescaled to the runtime clip's
   * real duration like the rest, so a shorter export bursts on the same phase of
   * the motion rather than on a fixed fraction of it.
   */
  DeathShatter: {
    clip: "DeathShatter",
    effect: "death-shatter",
    specFrames: 96,
    telegraph: { from: "core-overload", startFrame: 10, until: "seam-rupture", endFrame: 34 },
    active: { from: "seam-rupture", startFrame: 34, until: "shell-scatter", endFrame: 62 },
    /** The shatter frame: the intact body is swapped for the chunks here. */
    impactFrame: 34,
    recovery: { from: "shell-scatter", startFrame: 62, until: "ash-rest", endFrame: 96 },
    lingerSeconds: 0,
  },
});

export function isCinderboundWardenEffectClip(clipName: string): clipName is CinderboundWardenEffectClip {
  return Object.prototype.hasOwnProperty.call(CINDERBOUND_WARDEN_EFFECT_TIMELINES, clipName);
}

export interface CinderboundWardenEffectSeconds {
  telegraph: readonly [number, number];
  active: readonly [number, number];
  impact: number;
  recovery: readonly [number, number];
}

/** Rescales a spec-frame timeline onto a runtime clip's real duration. */
export function cinderboundWardenEffectSeconds(
  clip: CinderboundWardenEffectClip,
  durationSeconds: number,
): CinderboundWardenEffectSeconds {
  const timeline = CINDERBOUND_WARDEN_EFFECT_TIMELINES[clip];
  if (!(durationSeconds > 0)) throw new Error(`${clip} has no positive duration for its effect timeline.`);
  const seconds = (frame: number): number => (frame / timeline.specFrames) * durationSeconds;
  return {
    telegraph: [seconds(timeline.telegraph.startFrame), seconds(timeline.telegraph.endFrame)],
    active: [seconds(timeline.active.startFrame), seconds(timeline.active.endFrame)],
    impact: seconds(timeline.impactFrame),
    recovery: [seconds(timeline.recovery.startFrame), seconds(timeline.recovery.endFrame)],
  };
}

function windowProgress(time: number, window: readonly [number, number]): number {
  const [start, end] = window;
  if (end <= start) return time >= start ? 1 : 0;
  return THREE.MathUtils.clamp((time - start) / (end - start), 0, 1);
}

function inWindow(time: number, window: readonly [number, number]): boolean {
  return time >= window[0] && time < window[1];
}

export interface CinderboundWardenEffectStatus {
  effect: CinderboundWardenEffectId;
  clip: CinderboundWardenEffectClip;
  phase: CinderboundWardenEffectPhase;
  /** 0..1 inside the current phase window. */
  progress: number;
  origin: [number, number, number];
  end: [number, number, number];
  lingering: boolean;
}

export interface CinderboundWardenEffectEvent {
  clip: CinderboundWardenEffectClip;
  effect: CinderboundWardenEffectId;
  phase: CinderboundWardenEffectEventPhase;
  clipTimeSeconds: number;
  origin: [number, number, number];
  target: [number, number, number];
  /** Geometric test of the target against the effect area at this event. */
  hit: boolean;
}

export type CinderboundWardenEffectListener = (event: CinderboundWardenEffectEvent) => void;

/** Which pack's hand the palm rig below describes. Mirrors CinderboundWardenKind. */
export type CinderboundWardenPalmKind = "wayfarer" | "oathbreaker";

/**
 * The palm as a muzzle: where the beam leaves the hand, and which way it faces.
 *
 * Both are constants in the hand_L BONE LOCAL frame because hand_L is a leaf bone - no finger
 * joints, so the hand is one rigid chunk. Measured drift of the fully-weighted hand vertices
 * in the hand bone's own frame, over every sampled frame of every clip, is 0.095 mm on the
 * Wayfarer and 0.000 mm on the Oathbreaker, which is why six numbers can stand in for a
 * per-frame geometric fit.
 */
export interface CinderboundWardenPalmRig {
  /** Unit palm normal. World direction = normal.transformDirection(hand_L.matrixWorld). */
  readonly normalHandLocal: readonly [number, number, number];
  /**
   * Emitter port at the palm centre, pushed clear of the palm surface along the normal so a
   * beam born there starts OUTSIDE the shell. Bone units: port.applyMatrix4(hand_L.matrixWorld)
   * brings the pack's own scale along.
   */
  readonly portHandLocal: readonly [number, number, number];
}

/**
 * Measured per pack; the source is node_modules/.cache/palm-measure/palm-normal-report.json
 * and the same six numbers are carried by the composer and the clearance gate
 * (issue-458-motion-composer-v1/lib/warden-palm-rig.mjs). All three must agree or the gate is
 * measuring a different beam than the game fires.
 *
 * The palm plane is the thinnest robust width of the DISTAL hand searched perpendicular to the
 * bone's finger axis - a whole-hand fit lands 45 deg out, because the wrist cuff is a cylinder
 * and drags it. The sign is the left-hand rule palmNormal = fingerAxis x thumbDir, confirmed by
 * rendering both slab faces: the face the rule calls the back carries the knuckle blocks, the
 * face it calls the palm is the flatter plate, and on the Oathbreaker that plate already
 * carries a recessed circular socket dead centre.
 *
 * The normal is perpendicular to the bone's +Y finger axis on both bodies (91.44 deg / 90.00
 * deg off the forearm at bind). The bind pose is pronated: the palm faces ACROSS the arm, never
 * along it, which is why aiming the forearm can never aim the palm.
 */
export const CINDERBOUND_WARDEN_PALM_RIGS: Readonly<Record<CinderboundWardenPalmKind, CinderboundWardenPalmRig>> = Object.freeze({
  wayfarer: { normalHandLocal: [-0.884988, 0, 0.465615], portHandLocal: [-0.00946, 0.09009, 0.01242] },
  oathbreaker: { normalHandLocal: [-0.533615, 0, -0.845728], portHandLocal: [-0.00314, 0.08653, -0.04334] },
});

export interface CinderboundWardenEffectContext {
  /** Parent for every effect object (dungeon scene or the Motion Forge stage root). */
  scene: THREE.Object3D;
  /** Placement root: position is the boss floor point, rotation.y its facing yaw. */
  actorRoot: THREE.Object3D;
  /** Rigged model with the bone contract (hand_L, lower_arm_L, hand_R, lower_arm_R, chest, ...). */
  model: THREE.Object3D;
  ownerId: string;
  targetHeightMeters: number;
  /** Which pack's palm rig to fire from. Defaults to the Wayfarer's. */
  kind?: CinderboundWardenPalmKind;
}

export interface CinderboundWardenEffectFrame {
  clip: string;
  clipTimeSeconds: number;
  durationSeconds: number;
  deltaSeconds: number;
  /** False while paused or scrubbed: the pose is shown but no event is raised. */
  advancing: boolean;
  /** Player floor point in world space. */
  target: THREE.Vector3;
}

export interface CinderboundWardenEffectSystem {
  /** Called whenever the runtime starts a clip; resets the once-per-play events. */
  beginClip(clipName: string): void;
  evaluate(frame: CinderboundWardenEffectFrame): void;
  status(): CinderboundWardenEffectStatus[];
  /** Multiplier for the chest furnace light (FurnaceShutdown gutters it). */
  furnaceLightFactor(): number;
  setListener(listener: CinderboundWardenEffectListener | null): void;
  dispose(): void;
}

export const CINDERBOUND_WARDEN_TARGET_CHEST_METERS = 0.85;
export const CINDERBOUND_WARDEN_BEAM_HIT_RADIUS_METERS = 0.9;
export const CINDERBOUND_WARDEN_SWEEP_HALF_ARC_RADIANS = THREE.MathUtils.degToRad(80);
export const CINDERBOUND_WARDEN_SOUL_TAX_RANGE_METERS = 7;

interface ClipState {
  clip: CinderboundWardenEffectClip;
  fired: Set<CinderboundWardenEffectEventPhase>;
  lastTime: number;
  aimLocked: boolean;
  lockedEnd: THREE.Vector3;
  sweepStartAngle: number | null;
  /** True once the clip time has passed the impact frame (also when scrubbed). */
  impactReached: boolean;
}

interface Linger {
  effect: CinderboundWardenEffectId;
  ageSeconds: number;
  lingerSeconds: number;
}

function toTuple(vector: THREE.Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z];
}

export function createCinderboundWardenEffectSystem(
  context: CinderboundWardenEffectContext,
): CinderboundWardenEffectSystem {
  const scale = context.targetHeightMeters / CINDERBOUND_WARDEN_VFX_REFERENCE_HEIGHT_METERS;
  const palmRig = CINDERBOUND_WARDEN_PALM_RIGS[context.kind ?? "wayfarer"];
  let resources: WardenVfxResources | null = null;
  let beam: WardenFireBeamVisual | null = null;
  let sweep: WardenSweepWaveVisual | null = null;
  let ashRing: WardenAshRingVisual | null = null;
  let soulTax: WardenSoulTaxVisual | null = null;
  let furnace: WardenFurnaceShutdownVisual | null = null;
  let listener: CinderboundWardenEffectListener | null = null;
  let clipState: ClipState | null = null;
  let lingers: Linger[] = [];
  let wallSeconds = 0;
  let furnaceFactor = 1;
  let current: CinderboundWardenEffectStatus | null = null;
  let disposed = false;
  const scratch = {
    origin: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    end: new THREE.Vector3(),
    tip: new THREE.Vector3(),
    chest: new THREE.Vector3(),
    floor: new THREE.Vector3(),
    delta: new THREE.Vector3(),
  };

  const ensureResources = (): WardenVfxResources => {
    resources ??= createWardenVfxResources();
    return resources;
  };
  const beamVisual = (): WardenFireBeamVisual => {
    if (!beam) {
      beam = createWardenFireBeamVisual(ensureResources(), scale, `${context.ownerId}:palm-fire`);
      context.scene.add(beam.root);
    }
    return beam;
  };
  const sweepVisual = (): WardenSweepWaveVisual => {
    if (!sweep) {
      sweep = createWardenSweepWaveVisual(ensureResources(), scale, `${context.ownerId}:cinder-sweep`);
      context.scene.add(sweep.root);
    }
    return sweep;
  };
  const ashVisual = (): WardenAshRingVisual => {
    if (!ashRing) {
      ashRing = createWardenAshRingVisual(ensureResources(), scale, `${context.ownerId}:ash-call`);
      context.scene.add(ashRing.root);
    }
    return ashRing;
  };
  const soulTaxVisual = (): WardenSoulTaxVisual => {
    if (!soulTax) {
      soulTax = createWardenSoulTaxVisual(ensureResources(), scale, `${context.ownerId}:soul-tax`);
      context.scene.add(soulTax.root);
    }
    return soulTax;
  };
  const furnaceVisual = (): WardenFurnaceShutdownVisual => {
    if (!furnace) {
      furnace = createWardenFurnaceShutdownVisual(ensureResources(), scale, `${context.ownerId}:furnace-shutdown`);
      context.scene.add(furnace.root);
    }
    return furnace;
  };

  const boneWorld = (name: string, out: THREE.Vector3): boolean => {
    const bone = context.model.getObjectByName(name);
    if (!bone) return false;
    bone.getWorldPosition(out);
    return true;
  };
  const actorFloor = (out: THREE.Vector3): THREE.Vector3 => context.actorRoot.getWorldPosition(out);
  const actorForward = (out: THREE.Vector3): THREE.Vector3 => {
    out.set(0, 0, 1);
    return out.transformDirection(context.actorRoot.matrixWorld).setY(0).normalize();
  };
  /**
   * The repulsor muzzle: the emitter port at the palm centre, and the PALM NORMAL.
   *
   * This used to take the direction from the forearm axis, normalize(hand_L - lower_arm_L).
   * That axis is the hand bone's own +Y - the finger axis - so the beam left through the
   * Warden's own hand: 1267 of 4458 hand-weighted vertices inside the 0.11 m beam core with
   * 12 mm of clearance on the Wayfarer, 1170 of 2984 with 11 mm on the Oathbreaker, on every
   * frame of the clip (the wrist does not move relative to the forearm, so it was structural,
   * not a bad frame). The palm normal is perpendicular to that axis on both bodies: the bind
   * pose is pronated and the palm faces across the arm, so no amount of aiming the ARM could
   * ever have aimed the palm.
   *
   * Firing along the palm normal from the port instead takes the Wayfarer to 0 vertices in the
   * core at 0.120 m clearance and the Oathbreaker to 0 at 0.240 m. Both are properties of the
   * hand's own geometry, so they hold whatever the clip does with the arm; what the clip has to
   * supply is the wrist cocked back far enough that the normal points at the target.
   */
  const palm = (origin: THREE.Vector3, forward: THREE.Vector3): void => {
    const hand = context.model.getObjectByName("hand_L");
    if (!hand) {
      actorFloor(origin).y += context.targetHeightMeters * 0.55;
      actorForward(forward);
      return;
    }
    hand.updateWorldMatrix(true, false);
    origin.set(...palmRig.portHandLocal).applyMatrix4(hand.matrixWorld);
    forward.set(...palmRig.normalHandLocal).transformDirection(hand.matrixWorld);
    if (forward.lengthSq() < 1e-8) actorForward(forward); else forward.normalize();
  };
  const bladeTip = (out: THREE.Vector3): void => {
    if (boneWorld("hand_R", out)) {
      const elbow = new THREE.Vector3();
      if (boneWorld("lower_arm_R", elbow) && elbow.distanceToSquared(out) > 1e-6) {
        out.addScaledVector(out.clone().sub(elbow).normalize(), 0.55 * scale);
      }
      return;
    }
    actorFloor(out).y += context.targetHeightMeters * 0.45;
    out.addScaledVector(actorForward(new THREE.Vector3()), 1.4 * scale);
  };
  const chestPoint = (out: THREE.Vector3): void => {
    if (boneWorld("chest", out) || boneWorld("spine", out)) return;
    actorFloor(out).y += context.targetHeightMeters * 0.6;
  };
  const bladeAngle = (): number => {
    bladeTip(scratch.tip);
    actorFloor(scratch.floor);
    return Math.atan2(scratch.tip.x - scratch.floor.x, scratch.tip.z - scratch.floor.z);
  };

  const emit = (
    state: ClipState,
    phase: CinderboundWardenEffectEventPhase,
    frame: CinderboundWardenEffectFrame,
    origin: THREE.Vector3,
    hit: boolean,
  ): void => {
    if (state.fired.has(phase)) return;
    state.fired.add(phase);
    listener?.({
      clip: state.clip,
      effect: CINDERBOUND_WARDEN_EFFECT_TIMELINES[state.clip].effect,
      phase,
      clipTimeSeconds: frame.clipTimeSeconds,
      origin: toTuple(origin),
      target: toTuple(frame.target),
      hit,
    });
  };
  const crossed = (state: ClipState, time: number, now: number, frame: CinderboundWardenEffectFrame): boolean => (
    frame.advancing && state.lastTime < time && now >= time
  );

  const hitTest = (effect: CinderboundWardenEffectId, frame: CinderboundWardenEffectFrame, end: THREE.Vector3): boolean => {
    actorFloor(scratch.floor);
    scratch.delta.copy(frame.target).sub(scratch.floor).setY(0);
    const distance = scratch.delta.length();
    switch (effect) {
      case "palm-fire":
        return Math.hypot(frame.target.x - end.x, frame.target.z - end.z) <= CINDERBOUND_WARDEN_BEAM_HIT_RADIUS_METERS * scale;
      case "cinder-sweep": {
        if (distance < 0.05 || distance > 3.1 * scale) return false;
        const forward = actorForward(scratch.forward);
        const angle = Math.acos(THREE.MathUtils.clamp(scratch.delta.divideScalar(distance).dot(forward), -1, 1));
        return angle <= CINDERBOUND_WARDEN_SWEEP_HALF_ARC_RADIANS;
      }
      case "blade-sweep": {
        // quick melee: blade reach in front of the boss, a narrower arc than the cinder wave
        if (distance < 0.05 || distance > 2.4 * scale) return false;
        const forward = actorForward(scratch.forward);
        const angle = Math.acos(THREE.MathUtils.clamp(scratch.delta.divideScalar(distance).dot(forward), -1, 1));
        return angle <= THREE.MathUtils.degToRad(50);
      }
      case "ash-call":
        return distance <= ashVisual().burstRadiusMeters;
      case "soul-tax":
        return distance <= CINDERBOUND_WARDEN_SOUL_TAX_RANGE_METERS * scale;
      case "furnace-shutdown":
      case "death-shatter":
        // Neither costs the player anything: one is the boss's own vulnerability
        // window, the other is it dying.
        return false;
    }
  };

  const startLinger = (effect: CinderboundWardenEffectId, lingerSeconds: number): void => {
    if (lingerSeconds <= 0) return;
    lingers = lingers.filter((entry) => entry.effect !== effect);
    lingers.push({ effect, ageSeconds: 0, lingerSeconds });
  };
  const hideEffect = (effect: CinderboundWardenEffectId): void => {
    switch (effect) {
      case "palm-fire": beam?.hide(); break;
      case "cinder-sweep": sweep?.hide(); break;
      case "ash-call": ashRing?.hide(); break;
      case "soul-tax": soulTax?.hide(); break;
      // The shatter death drives the same chest-furnace visual as the shutdown:
      // one gutters and relights, the other blows the furnace out for good.
      case "furnace-shutdown": case "death-shatter": furnace?.hide(); break;
    }
  };

  const evaluatePalmFire = (state: ClipState, frame: CinderboundWardenEffectFrame, seconds: CinderboundWardenEffectSeconds): void => {
    const visual = beamVisual();
    const now = frame.clipTimeSeconds;
    palm(scratch.origin, scratch.forward);
    if (now < seconds.active[0] || !state.aimLocked) {
      // The telegraph tracks the target; the beam locks its aim at release so the
      // hold is readable and can be side-stepped.
      state.lockedEnd.copy(frame.target).y += CINDERBOUND_WARDEN_TARGET_CHEST_METERS;
    }
    if (now >= seconds.active[0] && !state.aimLocked) state.aimLocked = true;
    if (now < seconds.active[0]) state.aimLocked = false;
    visual.setAim(scratch.origin, scratch.forward, state.lockedEnd);
    visual.setTime(wallSeconds);
    const telegraph = inWindow(now, seconds.telegraph) ? windowProgress(now, seconds.telegraph) : 0;
    const activeProgress = windowProgress(now, seconds.active);
    const beamStrength = inWindow(now, seconds.active)
      ? Math.min(1, activeProgress * 6) * (1 - Math.max(0, activeProgress - 0.8) * 5)
      : 0;
    const impactAge = now - seconds.impact;
    const impact = impactAge >= 0 && impactAge < 0.35 ? 1 - impactAge / 0.35 : 0;
    visual.setTelegraph(telegraph);
    visual.setBeam(beamStrength);
    visual.setImpact(inWindow(now, seconds.active) ? Math.max(impact, beamStrength * 0.6) : impact);
    furnaceFactor = 1 + beamStrength * 0.4;
    if (crossed(state, seconds.telegraph[0], now, frame)) emit(state, "telegraph", frame, scratch.origin, false);
    if (crossed(state, seconds.active[0], now, frame)) emit(state, "active", frame, scratch.origin, false);
    if (crossed(state, seconds.impact, now, frame)) emit(state, "impact", frame, scratch.origin, hitTest("palm-fire", frame, state.lockedEnd));
    if (crossed(state, seconds.active[1], now, frame)) emit(state, "end", frame, scratch.origin, false);
    current = {
      effect: "palm-fire",
      clip: state.clip,
      phase: now < seconds.active[0] ? "telegraph" : now < seconds.active[1] ? "active" : "recovery",
      progress: now < seconds.active[0] ? telegraph : now < seconds.active[1] ? activeProgress : windowProgress(now, seconds.recovery),
      origin: toTuple(scratch.origin),
      end: toTuple(state.lockedEnd),
      lingering: false,
    };
  };

  const evaluateCinderSweep = (state: ClipState, frame: CinderboundWardenEffectFrame, seconds: CinderboundWardenEffectSeconds): void => {
    const visual = sweepVisual();
    const now = frame.clipTimeSeconds;
    actorFloor(scratch.floor);
    bladeTip(scratch.tip);
    const facing = Math.atan2(actorForward(scratch.forward).x, scratch.forward.z);
    const currentAngle = bladeAngle();
    if (now < seconds.active[0]) state.sweepStartAngle = null;
    if (inWindow(now, seconds.active) && state.sweepStartAngle === null) {
      // The wave starts where the blade is when the driving step begins; when a
      // scrub lands mid-window the loaded right-side guard is assumed.
      state.sweepStartAngle = frame.advancing && state.lastTime < seconds.active[0]
        ? currentAngle
        : facing - CINDERBOUND_WARDEN_SWEEP_HALF_ARC_RADIANS;
    }
    const startAngle = state.sweepStartAngle ?? facing - CINDERBOUND_WARDEN_SWEEP_HALF_ARC_RADIANS;
    let endAngle = currentAngle;
    // Keep the arc growing in the sweep direction (never fold back past the start).
    while (endAngle < startAngle - Math.PI) endAngle += Math.PI * 2;
    while (endAngle > startAngle + Math.PI) endAngle -= Math.PI * 2;
    const telegraph = inWindow(now, seconds.telegraph) ? windowProgress(now, seconds.telegraph) : 0;
    const activeProgress = windowProgress(now, seconds.active);
    // The wave always covers at least the authored sweep arc for the elapsed part of
    // the window, so a clip whose blade lags (or a scrubbed frame) still shows the
    // area the attack claims; a faster blade extends it further.
    const authoredSpan = 2 * CINDERBOUND_WARDEN_SWEEP_HALF_ARC_RADIANS * Math.min(1, activeProgress * 1.35);
    const sweepDirection = Math.sign(endAngle - startAngle || 1);
    if (Math.abs(endAngle - startAngle) < authoredSpan) endAngle = startAngle + authoredSpan * sweepDirection;
    if (Math.abs(endAngle - startAngle) < 0.08) endAngle = startAngle + 0.08 * sweepDirection;
    const wave = inWindow(now, seconds.active) ? Math.min(1, activeProgress * 4) * (1 - Math.max(0, activeProgress - 0.7) / 0.3) : 0;
    const scorchProgress = now >= seconds.impact ? 1 : 0;
    visual.setArc(scratch.floor, startAngle, endAngle);
    visual.setBladeGlow(scratch.tip, Math.max(telegraph, wave));
    visual.setWave(wave);
    visual.setScorch(scorchProgress, scorchProgress * (1 - windowProgress(now, seconds.recovery) * 0.7));
    visual.setTime(wallSeconds);
    furnaceFactor = 1 + telegraph * 0.3;
    if (crossed(state, seconds.telegraph[0], now, frame)) emit(state, "telegraph", frame, scratch.tip, false);
    if (crossed(state, seconds.active[0], now, frame)) emit(state, "active", frame, scratch.tip, false);
    if (crossed(state, seconds.impact, now, frame)) emit(state, "impact", frame, scratch.tip, hitTest("cinder-sweep", frame, scratch.tip));
    if (crossed(state, seconds.active[1], now, frame)) emit(state, "end", frame, scratch.tip, false);
    current = {
      effect: "cinder-sweep",
      clip: state.clip,
      phase: now < seconds.active[0] ? "telegraph" : now < seconds.active[1] ? "active" : "recovery",
      progress: now < seconds.active[0] ? telegraph : now < seconds.active[1] ? activeProgress : windowProgress(now, seconds.recovery),
      origin: toTuple(scratch.tip),
      end: toTuple(scratch.floor),
      lingering: false,
    };
  };

  const evaluateBladeSweep = (state: ClipState, frame: CinderboundWardenEffectFrame, seconds: CinderboundWardenEffectSeconds): void => {
    // Quick melee: the blade heats through the wind-up and trails fire through the
    // swing; no ground wave (that is CinderSweep) and no scorch residue.
    const visual = sweepVisual();
    const now = frame.clipTimeSeconds;
    actorFloor(scratch.floor);
    bladeTip(scratch.tip);
    const facing = Math.atan2(actorForward(scratch.forward).x, scratch.forward.z);
    const telegraph = inWindow(now, seconds.telegraph) ? 0.3 + 0.7 * windowProgress(now, seconds.telegraph) : 0;
    const activeProgress = windowProgress(now, seconds.active);
    const swing = inWindow(now, seconds.active) ? 1 - Math.max(0, activeProgress - 0.75) / 0.25 : 0;
    visual.setArc(scratch.floor, facing, facing + 0.08);
    visual.setBladeGlow(scratch.tip, Math.max(telegraph, swing));
    visual.setWave(0);
    visual.setScorch(0, 0);
    visual.setTime(wallSeconds);
    furnaceFactor = 1 + telegraph * 0.2;
    if (crossed(state, seconds.telegraph[0], now, frame)) emit(state, "telegraph", frame, scratch.tip, false);
    if (crossed(state, seconds.active[0], now, frame)) emit(state, "active", frame, scratch.tip, false);
    if (crossed(state, seconds.impact, now, frame)) emit(state, "impact", frame, scratch.tip, hitTest("blade-sweep", frame, scratch.tip));
    if (crossed(state, seconds.active[1], now, frame)) emit(state, "end", frame, scratch.tip, false);
    current = {
      effect: "blade-sweep",
      clip: state.clip,
      phase: now < seconds.active[0] ? "telegraph" : now < seconds.active[1] ? "active" : "recovery",
      progress: now < seconds.active[0] ? telegraph : now < seconds.active[1] ? activeProgress : windowProgress(now, seconds.recovery),
      origin: toTuple(scratch.tip),
      end: toTuple(scratch.floor),
      lingering: false,
    };
  };

  const evaluateAshCall = (state: ClipState, frame: CinderboundWardenEffectFrame, seconds: CinderboundWardenEffectSeconds): void => {
    const visual = ashVisual();
    const now = frame.clipTimeSeconds;
    actorFloor(scratch.floor);
    visual.setCenter(scratch.floor);
    visual.setTime(wallSeconds);
    const telegraph = inWindow(now, seconds.telegraph) ? 0.35 + 0.65 * windowProgress(now, seconds.telegraph) : 0;
    const burstProgress = windowProgress(now, seconds.active);
    const burst = inWindow(now, seconds.active) ? 1 - burstProgress * 0.35 : 0;
    const ashProgress = now >= seconds.active[0] ? windowProgress(now, [seconds.active[0], seconds.recovery[1]]) : 0;
    const ash = now >= seconds.active[0] ? 1 - windowProgress(now, seconds.recovery) * 0.85 : 0;
    visual.setTelegraph(telegraph);
    visual.setBurst(burstProgress, burst);
    visual.setAsh(ashProgress, ash);
    furnaceFactor = 1 + telegraph * 0.6 - (now >= seconds.active[0] ? 0.4 * (1 - windowProgress(now, seconds.recovery)) : 0);
    chestPoint(scratch.chest);
    if (crossed(state, seconds.telegraph[0], now, frame)) emit(state, "telegraph", frame, scratch.chest, false);
    if (crossed(state, seconds.active[0], now, frame)) emit(state, "active", frame, scratch.chest, false);
    if (crossed(state, seconds.impact, now, frame)) emit(state, "impact", frame, scratch.chest, hitTest("ash-call", frame, scratch.floor));
    if (crossed(state, seconds.active[1], now, frame)) emit(state, "end", frame, scratch.chest, false);
    current = {
      effect: "ash-call",
      clip: state.clip,
      phase: now < seconds.active[0] ? "telegraph" : now < seconds.active[1] ? "active" : "recovery",
      progress: now < seconds.active[0] ? windowProgress(now, seconds.telegraph) : now < seconds.active[1] ? burstProgress : windowProgress(now, seconds.recovery),
      origin: toTuple(scratch.chest),
      end: toTuple(scratch.floor),
      lingering: false,
    };
  };

  const evaluateSoulTax = (state: ClipState, frame: CinderboundWardenEffectFrame, seconds: CinderboundWardenEffectSeconds): void => {
    const visual = soulTaxVisual();
    const now = frame.clipTimeSeconds;
    palm(scratch.origin, scratch.forward);
    scratch.end.copy(frame.target);
    visual.setEndpoints(scratch.origin, scratch.forward, scratch.end);
    visual.setTime(wallSeconds);
    const telegraphProgress = windowProgress(now, seconds.telegraph);
    const telegraph = inWindow(now, seconds.telegraph) ? 1 : 0;
    const activeProgress = windowProgress(now, seconds.active);
    const siphon = inWindow(now, seconds.active) ? Math.min(1, activeProgress * 5) : 0;
    const pulseAge = now - seconds.impact;
    const pulse = pulseAge >= 0 && pulseAge < 0.4 ? 1 - pulseAge / 0.4 : 0;
    visual.setTelegraph(telegraphProgress, telegraph);
    visual.setSiphon(siphon, now - seconds.active[0]);
    visual.setPulse(pulse);
    furnaceFactor = 1 - siphon * 0.25 + pulse * 0.5;
    if (crossed(state, seconds.telegraph[0], now, frame)) emit(state, "telegraph", frame, scratch.origin, false);
    if (crossed(state, seconds.active[0], now, frame)) emit(state, "active", frame, scratch.origin, hitTest("soul-tax", frame, scratch.end));
    if (crossed(state, seconds.impact, now, frame)) emit(state, "impact", frame, scratch.origin, hitTest("soul-tax", frame, scratch.end));
    if (crossed(state, seconds.active[1], now, frame)) emit(state, "end", frame, scratch.origin, false);
    current = {
      effect: "soul-tax",
      clip: state.clip,
      phase: now < seconds.active[0] ? "telegraph" : now < seconds.active[1] ? "active" : "recovery",
      progress: now < seconds.active[0] ? telegraphProgress : now < seconds.active[1] ? activeProgress : windowProgress(now, seconds.recovery),
      origin: toTuple(scratch.origin),
      end: toTuple(scratch.end),
      lingering: false,
    };
  };

  const evaluateFurnaceShutdown = (state: ClipState, frame: CinderboundWardenEffectFrame, seconds: CinderboundWardenEffectSeconds): void => {
    const visual = furnaceVisual();
    const now = frame.clipTimeSeconds;
    chestPoint(scratch.chest);
    actorFloor(scratch.floor);
    visual.setChest(scratch.chest);
    visual.setFloor(scratch.floor);
    visual.setTime(wallSeconds);
    const telegraphProgress = windowProgress(now, seconds.telegraph);
    const activeProgress = windowProgress(now, seconds.active);
    const recoveryProgress = windowProgress(now, seconds.recovery);
    // Interruption: the vent plume spikes then gutters out as the valves expose.
    const vent = now < seconds.telegraph[0] ? 0
      : now < seconds.active[0] ? 1 - telegraphProgress * 0.5
        : now < seconds.active[1] ? Math.max(0, 0.5 - activeProgress * 1.4)
          : 0;
    const valves = now < seconds.active[0] ? 0
      : now < seconds.active[1] ? Math.min(1, activeProgress * 2.5)
        : Math.max(0, 1 - recoveryProgress * 3);
    const vulnerability = now < seconds.active[0] ? 0
      : now < seconds.active[1] ? Math.min(1, activeProgress * 3)
        : Math.max(0, 1 - recoveryProgress * 2.5);
    const reignite = now >= seconds.recovery[0] && recoveryProgress < 0.5 ? Math.sin(recoveryProgress * 2 * Math.PI) : 0;
    visual.setVent(vent);
    visual.setValves(valves);
    visual.setVulnerability(vulnerability);
    visual.setReignite(reignite);
    furnaceFactor = now < seconds.telegraph[0] ? 1
      : now < seconds.active[1] ? Math.max(0.12, 1 - Math.max(telegraphProgress * 0.5, 0.5 + activeProgress * 0.4))
        : 0.12 + 0.88 * Math.min(1, recoveryProgress * 2) + reignite * 0.6;
    if (crossed(state, seconds.telegraph[0], now, frame)) emit(state, "telegraph", frame, scratch.chest, false);
    if (crossed(state, seconds.active[0], now, frame)) emit(state, "active", frame, scratch.chest, false);
    if (crossed(state, seconds.impact, now, frame)) emit(state, "impact", frame, scratch.chest, false);
    if (crossed(state, seconds.recovery[1], now, frame)) emit(state, "end", frame, scratch.chest, false);
    current = {
      effect: "furnace-shutdown",
      clip: state.clip,
      phase: now < seconds.active[0] ? "telegraph" : now < seconds.active[1] ? "active" : "recovery",
      progress: now < seconds.active[0] ? telegraphProgress : now < seconds.active[1] ? activeProgress : recoveryProgress,
      origin: toTuple(scratch.chest),
      end: toTuple(scratch.floor),
      lingering: false,
    };
  };

  const evaluateDeathShatter = (state: ClipState, frame: CinderboundWardenEffectFrame, seconds: CinderboundWardenEffectSeconds): void => {
    // The chest furnace over-pressures through the telegraph, lets go on the
    // shatter frame and never relights. The chunk bodies themselves belong to the
    // warden runtime (they need the skinned nodes); this drives the furnace.
    const visual = furnaceVisual();
    const now = frame.clipTimeSeconds;
    chestPoint(scratch.chest);
    actorFloor(scratch.floor);
    visual.setChest(scratch.chest);
    visual.setFloor(scratch.floor);
    visual.setTime(wallSeconds);
    const telegraphProgress = windowProgress(now, seconds.telegraph);
    const activeProgress = windowProgress(now, seconds.active);
    const recoveryProgress = windowProgress(now, seconds.recovery);
    const overload = now < seconds.telegraph[0] ? 0 : now < seconds.active[0] ? telegraphProgress : 0;
    // The split seams flare on the shatter frame and cool through the scatter.
    const split = now < seconds.active[0] ? overload * 0.4 : Math.max(0, 1 - activeProgress * 1.6);
    visual.setVent(overload);
    visual.setValves(split);
    visual.setVulnerability(now < seconds.active[0] ? 0 : Math.max(0, 1 - recoveryProgress));
    // Nothing reignites: this is the death, not the shutdown.
    visual.setReignite(0);
    furnaceFactor = now < seconds.telegraph[0] ? 1
      : now < seconds.active[0] ? 1 + overload * 1.4
        : 0;
    if (crossed(state, seconds.telegraph[0], now, frame)) emit(state, "telegraph", frame, scratch.chest, false);
    if (crossed(state, seconds.active[0], now, frame)) emit(state, "active", frame, scratch.chest, false);
    if (crossed(state, seconds.impact, now, frame)) emit(state, "impact", frame, scratch.chest, false);
    if (crossed(state, seconds.recovery[1], now, frame)) emit(state, "end", frame, scratch.chest, false);
    current = {
      effect: "death-shatter",
      clip: state.clip,
      phase: now < seconds.active[0] ? "telegraph" : now < seconds.active[1] ? "active" : "recovery",
      progress: now < seconds.active[0] ? telegraphProgress : now < seconds.active[1] ? activeProgress : recoveryProgress,
      origin: toTuple(scratch.chest),
      end: toTuple(scratch.floor),
      lingering: false,
    };
  };

  const evaluateLingers = (deltaSeconds: number): CinderboundWardenEffectStatus[] => {
    const statuses: CinderboundWardenEffectStatus[] = [];
    lingers = lingers.filter((linger) => {
      linger.ageSeconds += deltaSeconds;
      const remaining = 1 - THREE.MathUtils.clamp(linger.ageSeconds / linger.lingerSeconds, 0, 1);
      if (remaining <= 0) {
        hideEffect(linger.effect);
        return false;
      }
      if (linger.effect === "cinder-sweep" && sweep) {
        sweep.setWave(0);
        sweep.setBladeGlow(scratch.tip, 0);
        sweep.setScorch(remaining, remaining * remaining * 0.4);
        sweep.setTime(wallSeconds);
      } else if (linger.effect === "ash-call" && ashRing) {
        ashRing.setTelegraph(0);
        ashRing.setBurst(1, 0);
        ashRing.setAsh(1, remaining * 0.3);
        ashRing.setTime(wallSeconds);
      }
      statuses.push({
        effect: linger.effect,
        clip: linger.effect === "cinder-sweep" ? "CinderSweep" : "AshCall",
        phase: "recovery",
        progress: 1 - remaining,
        origin: toTuple(scratch.floor),
        end: toTuple(scratch.floor),
        lingering: true,
      });
      return true;
    });
    return statuses;
  };

  let lingerStatuses: CinderboundWardenEffectStatus[] = [];

  return {
    beginClip: (clipName) => {
      if (disposed) return;
      if (clipState) {
        const timeline = CINDERBOUND_WARDEN_EFFECT_TIMELINES[clipState.clip];
        // Ground residue (scorch, settling ash) outlives the clip; everything else
        // is cleared the moment another clip takes over.
        if (clipState.impactReached && timeline.lingerSeconds > 0) {
          startLinger(timeline.effect, timeline.lingerSeconds);
        } else {
          hideEffect(timeline.effect);
        }
      }
      current = null;
      furnaceFactor = 1;
      if (!isCinderboundWardenEffectClip(clipName)) {
        clipState = null;
        return;
      }
      lingers = lingers.filter((linger) => linger.effect !== CINDERBOUND_WARDEN_EFFECT_TIMELINES[clipName].effect);
      clipState = {
        clip: clipName,
        fired: new Set(),
        lastTime: -1,
        aimLocked: false,
        lockedEnd: new THREE.Vector3(),
        sweepStartAngle: null,
        impactReached: false,
      };
    },
    evaluate: (frame) => {
      if (disposed) return;
      wallSeconds += Math.max(0, frame.deltaSeconds);
      lingerStatuses = evaluateLingers(Math.max(0, frame.deltaSeconds));
      if (!clipState || clipState.clip !== frame.clip) {
        current = null;
        furnaceFactor = 1;
        return;
      }
      const seconds = cinderboundWardenEffectSeconds(clipState.clip, frame.durationSeconds);
      // A looped or restarted clip wraps its time; re-arm the once-per-play events.
      if (frame.advancing && frame.clipTimeSeconds + 1e-6 < clipState.lastTime) {
        clipState.fired.clear();
        clipState.aimLocked = false;
        clipState.sweepStartAngle = null;
        clipState.impactReached = false;
        clipState.lastTime = -1;
      }
      clipState.impactReached = clipState.impactReached || frame.clipTimeSeconds >= seconds.impact;
      switch (clipState.clip) {
        case "PalmFire": evaluatePalmFire(clipState, frame, seconds); break;
        case "CinderSweep": evaluateCinderSweep(clipState, frame, seconds); break;
        case "BladeSweep": evaluateBladeSweep(clipState, frame, seconds); break;
        case "AshCall": evaluateAshCall(clipState, frame, seconds); break;
        case "SoulTax": evaluateSoulTax(clipState, frame, seconds); break;
        case "FurnaceShutdown": evaluateFurnaceShutdown(clipState, frame, seconds); break;
        case "DeathShatter": evaluateDeathShatter(clipState, frame, seconds); break;
      }
      clipState.lastTime = frame.clipTimeSeconds;
    },
    status: () => [...(current ? [current] : []), ...lingerStatuses],
    furnaceLightFactor: () => furnaceFactor,
    setListener: (next) => { listener = next; },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      listener = null;
      clipState = null;
      lingers = [];
      lingerStatuses = [];
      current = null;
      beam?.dispose();
      sweep?.dispose();
      ashRing?.dispose();
      soulTax?.dispose();
      furnace?.dispose();
      beam = null;
      sweep = null;
      ashRing = null;
      soulTax = null;
      furnace = null;
      resources?.dispose();
      resources = null;
    },
  };
}
