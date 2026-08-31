import * as THREE from "three";

/** Review controls are opt-in; dungeon actors retain their authored defaults. */
export interface BreachV2AnimationReviewPlayback {
  speed?: number;
  loop?: boolean | null;
}

/** Restore the previous overlay before the mixer, then apply it to the new pose. */
export interface BreachV2AnimationReviewPoseHooks {
  restore(): void;
  apply(): void;
}

export interface BreachV2AnimationReviewActor {
  root: THREE.Group;
  model: THREE.Object3D;
}

export interface BreachV2AnimationReviewSnapshot {
  timeSeconds: number;
  durationSeconds: number;
  normalizedTime: number;
  paused: boolean;
  playbackSpeed: number;
  reviewLoop: boolean | null;
}

export interface BreachV2AnimationReviewState {
  speed: number;
  loop: boolean | null;
  hooks: BreachV2AnimationReviewPoseHooks | null;
}

export function createBreachV2AnimationReviewState(): BreachV2AnimationReviewState {
  return { speed: 1, loop: null, hooks: null };
}

export function configureBreachV2AnimationReview(
  state: BreachV2AnimationReviewState,
  playback: BreachV2AnimationReviewPlayback,
): void {
  if (playback.speed !== undefined) {
    if (!Number.isFinite(playback.speed)) throw new Error("Animation review speed must be finite.");
    state.speed = THREE.MathUtils.clamp(playback.speed, 0.05, 3);
  }
  if (playback.loop !== undefined) state.loop = playback.loop;
}

export function setBreachV2AnimationReviewPoseHooks(
  state: BreachV2AnimationReviewState,
  hooks: BreachV2AnimationReviewPoseHooks | null,
): void {
  state.hooks?.restore();
  state.hooks = hooks;
  hooks?.apply();
}

export function evaluateBreachV2AnimationReviewPose(
  state: BreachV2AnimationReviewState,
  mixer: THREE.AnimationMixer,
  deltaSeconds: number,
  alreadyRestored = false,
): void {
  // A paused action or a clip missing a bone track will not overwrite its bone.
  // Restoring first is therefore essential; repeated paused samples must not
  // accumulate the prior additive offset or save it as a mixer binding baseline.
  // An immediate action switch has already restored its overlay before
  // stopAllAction restored the mixer's original binding state. Restoring the
  // previous overlay baseline a second time would undo that binding reset.
  if (!alreadyRestored) state.hooks?.restore();
  mixer.update(deltaSeconds * state.speed);
  state.hooks?.apply();
}

export function breachV2AnimationReviewSnapshot(
  state: BreachV2AnimationReviewState,
  action: THREE.AnimationAction,
): BreachV2AnimationReviewSnapshot {
  const durationSeconds = action.getClip().duration;
  return {
    timeSeconds: action.time,
    durationSeconds,
    normalizedTime: durationSeconds > 0 ? THREE.MathUtils.clamp(action.time / durationSeconds, 0, 1) : 0,
    paused: action.paused,
    playbackSpeed: state.speed,
    reviewLoop: state.loop,
  };
}
