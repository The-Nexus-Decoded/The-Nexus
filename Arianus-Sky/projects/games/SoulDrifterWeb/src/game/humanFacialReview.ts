import * as THREE from "three";
import {
  ARKIT_FACIAL_MORPH_NAMES,
  BAKED_META_VISEME_MORPH_NAMES,
  FacialAnimationDriver,
  type DialogueFacialMorphName,
  type TimedMetaVisemeCue,
} from "./facialAnimationDriver";

export const FACIAL_REVIEW_UNAVAILABLE_ENTRY = "Face__Unavailable";
export const FACIAL_REVIEW_NEUTRAL_ENTRY = "Face__Neutral";
export const FACIAL_REVIEW_TIMED_SPEECH_ENTRY = "Viseme__TimedSpeech";

const STATIC_REVIEW_DURATION_SECONDS = 2;
const TIMED_SPEECH_DURATION_SECONDS = 2.4;
const TIMED_SPEECH_CUES: readonly TimedMetaVisemeCue[] = [
  { viseme: "viseme_PP", startsAtSeconds: 0, peakAtSeconds: 0.12, endsAtSeconds: 0.28 },
  { viseme: "viseme_aa", startsAtSeconds: 0.24, peakAtSeconds: 0.46, endsAtSeconds: 0.68 },
  { viseme: "viseme_E", startsAtSeconds: 0.62, peakAtSeconds: 0.84, endsAtSeconds: 1.02 },
  { viseme: "viseme_TH", startsAtSeconds: 0.96, peakAtSeconds: 1.12, endsAtSeconds: 1.32 },
  { viseme: "viseme_O", startsAtSeconds: 1.26, peakAtSeconds: 1.48, endsAtSeconds: 1.7 },
  { viseme: "viseme_RR", startsAtSeconds: 1.64, peakAtSeconds: 1.82, endsAtSeconds: 2.02 },
  { viseme: "viseme_U", startsAtSeconds: 1.96, peakAtSeconds: 2.14, endsAtSeconds: 2.34 },
];

interface MorphBinding {
  influences: number[];
  index: number;
}

export interface HumanFacialReviewSnapshot {
  status: "READY" | "PARTIAL" | "MORPH_TARGETS_UNAVAILABLE";
  targetCount: number;
  availableTargets: readonly DialogueFacialMorphName[];
  activeEntry: string;
  timeSeconds: number;
  durationSeconds: number;
  reason?: string;
}

export interface HumanFacialReview {
  entries(): readonly string[];
  isEntry(name: string): boolean;
  play(name: string, loop: boolean): number;
  pause(paused: boolean): void;
  pose(name: string, normalizedTime: number): void;
  reset(): void;
  update(deltaSeconds: number): void;
  snapshot(): HumanFacialReviewSnapshot;
  dispose(): void;
}

function reviewEntryName(name: DialogueFacialMorphName): string {
  return ARKIT_FACIAL_MORPH_NAMES.includes(name as typeof ARKIT_FACIAL_MORPH_NAMES[number])
    ? `Face__${name}`
    : `Viseme__${name}`;
}

/**
 * Reviews only morphs physically present on the accepted actor. The controller
 * never replaces geometry, materials, bones, or body animation clips.
 */
export function createHumanFacialReview(root: THREE.Object3D): HumanFacialReview {
  const bindings = new Map<DialogueFacialMorphName, MorphBinding[]>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const dictionary = object.morphTargetDictionary;
    const influences = object.morphTargetInfluences;
    if (!dictionary || !influences) return;
    [...ARKIT_FACIAL_MORPH_NAMES, ...BAKED_META_VISEME_MORPH_NAMES].forEach((name) => {
      const index = dictionary[name];
      if (typeof index !== "number" || index < 0 || index >= influences.length) return;
      const targetBindings = bindings.get(name) ?? [];
      targetBindings.push({ influences, index });
      bindings.set(name, targetBindings);
    });
  });

  const availableTargets = [
    ...ARKIT_FACIAL_MORPH_NAMES,
    ...BAKED_META_VISEME_MORPH_NAMES,
  ].filter((name): name is DialogueFacialMorphName => bindings.has(name));
  const targetCount = availableTargets.length;
  const facialDriver = new FacialAnimationDriver(root, "issue-487-facial-review");
  const capability = facialDriver.capabilityStatus();
  const supportsTimedSpeech = capability.capabilities.speech;
  const entries = targetCount === 0
    ? [FACIAL_REVIEW_UNAVAILABLE_ENTRY]
    : [
      FACIAL_REVIEW_NEUTRAL_ENTRY,
      ...availableTargets.map(reviewEntryName),
      ...(supportsTimedSpeech ? [FACIAL_REVIEW_TIMED_SPEECH_ENTRY] : []),
    ];
  const entryToTarget = new Map(
    availableTargets.map((name) => [reviewEntryName(name), name] as const),
  );
  const unavailableReason = "Facial review unavailable: targetCount=0 on the loaded accepted actor.";
  let activeEntry = targetCount === 0 ? FACIAL_REVIEW_UNAVAILABLE_ENTRY : FACIAL_REVIEW_NEUTRAL_ENTRY;
  let elapsedSeconds = 0;
  let durationSeconds = 0;
  let paused = true;
  let looping = false;

  const clearDiscoveredTargets = (): void => {
    bindings.forEach((targetBindings) => {
      targetBindings.forEach(({ influences, index }) => { influences[index] = 0; });
    });
  };
  const requireEntry = (name: string): boolean => {
    if (!entries.includes(name)) throw new Error(`Unknown facial review entry ${name}.`);
    return targetCount > 0;
  };
  const beginTimedSpeech = (): void => {
    clearDiscoveredTargets();
    elapsedSeconds = 0;
    facialDriver.beginDialogueWithVisemes(TIMED_SPEECH_CUES, 0);
    facialDriver.update(0);
  };
  const applyStaticEntry = (name: string): void => {
    facialDriver.closeDialogue();
    clearDiscoveredTargets();
    const target = entryToTarget.get(name);
    if (!target) return;
    bindings.get(target)?.forEach(({ influences, index }) => { influences[index] = 1; });
  };

  clearDiscoveredTargets();
  root.userData.humanFacialReview = {
    status: capability.status,
    targetCount,
    reason: targetCount === 0 ? unavailableReason : undefined,
  };

  return {
    entries: () => [...entries],
    isEntry: (name) => entries.includes(name),
    play: (name, loop) => {
      const available = requireEntry(name);
      activeEntry = name;
      if (!available) {
        elapsedSeconds = 0;
        durationSeconds = 0;
        paused = true;
        looping = false;
        return 0;
      }
      looping = loop;
      paused = false;
      durationSeconds = name === FACIAL_REVIEW_TIMED_SPEECH_ENTRY
        ? TIMED_SPEECH_DURATION_SECONDS
        : STATIC_REVIEW_DURATION_SECONDS;
      if (name === FACIAL_REVIEW_TIMED_SPEECH_ENTRY) beginTimedSpeech();
      else {
        elapsedSeconds = 0;
        applyStaticEntry(name);
      }
      return durationSeconds;
    },
    pause: (value) => { paused = value; },
    pose: (name, normalizedTime) => {
      const available = requireEntry(name);
      activeEntry = name;
      if (!available) {
        elapsedSeconds = 0;
        durationSeconds = 0;
        paused = true;
        looping = false;
        return;
      }
      looping = false;
      paused = true;
      durationSeconds = name === FACIAL_REVIEW_TIMED_SPEECH_ENTRY
        ? TIMED_SPEECH_DURATION_SECONDS
        : STATIC_REVIEW_DURATION_SECONDS;
      if (name === FACIAL_REVIEW_TIMED_SPEECH_ENTRY) {
        beginTimedSpeech();
        elapsedSeconds = THREE.MathUtils.clamp(normalizedTime, 0, 1) * durationSeconds;
        facialDriver.update(elapsedSeconds);
      } else {
        elapsedSeconds = THREE.MathUtils.clamp(normalizedTime, 0, 1) * durationSeconds;
        applyStaticEntry(name);
      }
    },
    reset: () => {
      activeEntry = targetCount === 0 ? FACIAL_REVIEW_UNAVAILABLE_ENTRY : FACIAL_REVIEW_NEUTRAL_ENTRY;
      elapsedSeconds = 0;
      durationSeconds = 0;
      paused = true;
      looping = false;
      facialDriver.closeDialogue();
      clearDiscoveredTargets();
    },
    update: (deltaSeconds) => {
      if (paused || durationSeconds <= 0) return;
      const nextElapsedSeconds = elapsedSeconds + Math.max(0, deltaSeconds);
      if (nextElapsedSeconds >= durationSeconds && looping) {
        const remainder = nextElapsedSeconds % durationSeconds;
        if (activeEntry === FACIAL_REVIEW_TIMED_SPEECH_ENTRY) beginTimedSpeech();
        elapsedSeconds = remainder;
      } else {
        elapsedSeconds = Math.min(nextElapsedSeconds, durationSeconds);
        if (!looping && elapsedSeconds >= durationSeconds) paused = true;
      }
      if (activeEntry === FACIAL_REVIEW_TIMED_SPEECH_ENTRY) facialDriver.update(elapsedSeconds);
    },
    snapshot: () => ({
      status: capability.status,
      targetCount,
      availableTargets: [...availableTargets],
      activeEntry,
      timeSeconds: elapsedSeconds,
      durationSeconds,
      reason: targetCount === 0 ? unavailableReason : undefined,
    }),
    dispose: () => {
      facialDriver.closeDialogue();
      clearDiscoveredTargets();
      delete root.userData.humanFacialReview;
    },
  };
}
