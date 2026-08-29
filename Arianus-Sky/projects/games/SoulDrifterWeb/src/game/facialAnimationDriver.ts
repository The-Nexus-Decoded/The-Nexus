import * as THREE from "three";

/** Apple ARKit's complete 52-blendshape vocabulary, with exact lower-camel names. */
export const ARKIT_FACIAL_MORPH_NAMES = [
  "browDownLeft",
  "browDownRight",
  "browInnerUp",
  "browOuterUpLeft",
  "browOuterUpRight",
  "cheekPuff",
  "cheekSquintLeft",
  "cheekSquintRight",
  "eyeBlinkLeft",
  "eyeBlinkRight",
  "eyeLookDownLeft",
  "eyeLookDownRight",
  "eyeLookInLeft",
  "eyeLookInRight",
  "eyeLookOutLeft",
  "eyeLookOutRight",
  "eyeLookUpLeft",
  "eyeLookUpRight",
  "eyeSquintLeft",
  "eyeSquintRight",
  "eyeWideLeft",
  "eyeWideRight",
  "jawForward",
  "jawLeft",
  "jawOpen",
  "jawRight",
  "mouthClose",
  "mouthDimpleLeft",
  "mouthDimpleRight",
  "mouthFrownLeft",
  "mouthFrownRight",
  "mouthFunnel",
  "mouthLeft",
  "mouthLowerDownLeft",
  "mouthLowerDownRight",
  "mouthPressLeft",
  "mouthPressRight",
  "mouthPucker",
  "mouthRight",
  "mouthRollLower",
  "mouthRollUpper",
  "mouthShrugLower",
  "mouthShrugUpper",
  "mouthSmileLeft",
  "mouthSmileRight",
  "mouthStretchLeft",
  "mouthStretchRight",
  "mouthUpperUpLeft",
  "mouthUpperUpRight",
  "noseSneerLeft",
  "noseSneerRight",
  "tongueOut",
] as const;

/** Exact semantic names from the locked Meta-style visemes02 source pack. */
export const META_VISEME_NAMES = [
  "viseme_sil",
  "viseme_PP",
  "viseme_FF",
  "viseme_TH",
  "viseme_DD",
  "viseme_kk",
  "viseme_CH",
  "viseme_SS",
  "viseme_nn",
  "viseme_RR",
  "viseme_aa",
  "viseme_E",
  "viseme_I",
  "viseme_O",
  "viseme_U",
] as const;

/** Silence is a zero-weight state; only these 14 direct visemes are baked into geometry. */
export const BAKED_META_VISEME_MORPH_NAMES = [
  "viseme_PP",
  "viseme_FF",
  "viseme_TH",
  "viseme_DD",
  "viseme_kk",
  "viseme_CH",
  "viseme_SS",
  "viseme_nn",
  "viseme_RR",
  "viseme_aa",
  "viseme_E",
  "viseme_I",
  "viseme_O",
  "viseme_U",
] as const;

export const DIALOGUE_FACIAL_MORPH_NAMES = [
  ...ARKIT_FACIAL_MORPH_NAMES,
  ...BAKED_META_VISEME_MORPH_NAMES,
] as const;

export const AGE_FACIAL_MORPH_NAMES = ["Age_Middle", "Age_Elder"] as const;

export type ArkitFacialMorphName = typeof ARKIT_FACIAL_MORPH_NAMES[number];
export type MetaVisemeName = typeof META_VISEME_NAMES[number];
export type BakedMetaVisemeMorphName = typeof BAKED_META_VISEME_MORPH_NAMES[number];
export type DialogueFacialMorphName = typeof DIALOGUE_FACIAL_MORPH_NAMES[number];
export type AgeFacialMorphName = typeof AGE_FACIAL_MORPH_NAMES[number];

/** A source-produced cue relative to the supplied line start time. */
export interface TimedMetaVisemeCue {
  readonly viseme: MetaVisemeName;
  readonly startsAtSeconds: number;
  readonly endsAtSeconds: number;
  readonly peakAtSeconds?: number;
  readonly weight?: number;
}

export interface FacialAnimationCapabilityStatus {
  status: "READY" | "PARTIAL" | "MORPH_TARGETS_UNAVAILABLE";
  animatedMeshCount: number;
  availableMorphs: readonly DialogueFacialMorphName[];
  missingMorphs: readonly DialogueFacialMorphName[];
  availableAgeMorphs: readonly AgeFacialMorphName[];
  capabilities: {
    blink: boolean;
    gaze: boolean;
    speech: boolean;
  };
}

interface MorphBinding {
  influences: number[];
  index: number;
}

interface ValidatedSpeechCue {
  endsAtSeconds: number;
  peakAtSeconds: number;
  startsAtSeconds: number;
  viseme: MetaVisemeName;
  weight: number;
}

interface GazeTarget {
  horizontal: number;
  vertical: number;
}

const BLINK_MORPHS = ["eyeBlinkLeft", "eyeBlinkRight"] as const;
const GAZE_MORPHS = [
  "eyeLookDownLeft",
  "eyeLookDownRight",
  "eyeLookInLeft",
  "eyeLookInRight",
  "eyeLookOutLeft",
  "eyeLookOutRight",
  "eyeLookUpLeft",
  "eyeLookUpRight",
] as const;

/*
 * The driver consumes exact asset-authored channels. Its three subsystem sets
 * are deliberately narrow: blink owns only the two blink channels, gaze owns
 * only the eight paired eye-look channels, and speech owns only the 14 direct
 * Meta visemes. It never writes another ARKit expression, Age_*, or Face_*.
 *
 * Blink is a brief asymmetric-speed close/hold/open motion, but no unverified
 * millisecond measurement is treated as a production contract. Deformation is
 * asset-authored and must pass the project's reference-driven visual gates.
 */
const BLINK_CLOSE_SECONDS = 0.08;
const BLINK_HOLD_SECONDS = 0.025;
const BLINK_OPEN_SECONDS = 0.16;
const BLINK_TOTAL_SECONDS = BLINK_CLOSE_SECONDS + BLINK_HOLD_SECONDS + BLINK_OPEN_SECONDS;

function clampWeight(value: number): number {
  return THREE.MathUtils.clamp(value, 0, 1);
}

function stableUnitInterval(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function smoothUnitInterval(value: number): number {
  const clamped = clampWeight(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function validateSpeechCues(cues: readonly TimedMetaVisemeCue[]): ValidatedSpeechCue[] {
  return cues.flatMap((cue) => {
    const startsAtSeconds = Math.max(0, cue.startsAtSeconds);
    const endsAtSeconds = cue.endsAtSeconds;
    if (!Number.isFinite(startsAtSeconds)
      || !Number.isFinite(endsAtSeconds)
      || endsAtSeconds <= startsAtSeconds
      || !META_VISEME_NAMES.includes(cue.viseme)) {
      return [];
    }
    const requestedPeak = cue.peakAtSeconds ?? (startsAtSeconds + endsAtSeconds) * 0.5;
    const peakAtSeconds = THREE.MathUtils.clamp(
      Number.isFinite(requestedPeak) ? requestedPeak : (startsAtSeconds + endsAtSeconds) * 0.5,
      startsAtSeconds,
      endsAtSeconds,
    );
    return [{
      viseme: cue.viseme,
      startsAtSeconds,
      peakAtSeconds,
      endsAtSeconds,
      weight: clampWeight(cue.weight ?? 1),
    }];
  });
}

function cueWeight(cue: ValidatedSpeechCue, localSeconds: number): number {
  if (localSeconds < cue.startsAtSeconds || localSeconds > cue.endsAtSeconds) return 0;
  if (cue.peakAtSeconds <= cue.startsAtSeconds) {
    return (1 - smoothUnitInterval(
      (localSeconds - cue.startsAtSeconds) / (cue.endsAtSeconds - cue.startsAtSeconds),
    )) * cue.weight;
  }
  if (cue.peakAtSeconds >= cue.endsAtSeconds) {
    return smoothUnitInterval(
      (localSeconds - cue.startsAtSeconds) / (cue.endsAtSeconds - cue.startsAtSeconds),
    ) * cue.weight;
  }
  if (localSeconds <= cue.peakAtSeconds) {
    return smoothUnitInterval(
      (localSeconds - cue.startsAtSeconds) / (cue.peakAtSeconds - cue.startsAtSeconds),
    ) * cue.weight;
  }
  return (1 - smoothUnitInterval(
    (localSeconds - cue.peakAtSeconds) / (cue.endsAtSeconds - cue.peakAtSeconds),
  )) * cue.weight;
}

/**
 * Drives exact, already-authored facial morph targets on a live model. Missing
 * subsystem controls fail closed; bones and geometry are never modified.
 */
export class FacialAnimationDriver {
  private readonly bindings = new Map<DialogueFacialMorphName, MorphBinding[]>();
  private readonly capability: FacialAnimationCapabilityStatus;
  private readonly deterministicSeed: string;
  private readonly phaseOffset: number;
  private dialogueActive = false;
  private dialogueStartedAt = 0;
  private speechStartedAt = 0;
  private speechEndsAt = 0;
  private activeSpeechCues: readonly ValidatedSpeechCue[] = [];

  public constructor(root: THREE.Object3D, deterministicSeed: string) {
    const boundMeshIds = new Set<number>();
    const availableAgeMorphs = new Set<AgeFacialMorphName>();
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const dictionary = object.morphTargetDictionary;
      const influences = object.morphTargetInfluences;
      if (!dictionary || !influences) return;
      DIALOGUE_FACIAL_MORPH_NAMES.forEach((name) => {
        const index = dictionary[name];
        if (typeof index !== "number" || index < 0 || index >= influences.length) return;
        const bindings = this.bindings.get(name) ?? [];
        bindings.push({ influences, index });
        this.bindings.set(name, bindings);
        boundMeshIds.add(object.id);
      });
      AGE_FACIAL_MORPH_NAMES.forEach((name) => {
        const index = dictionary[name];
        if (typeof index === "number" && index >= 0 && index < influences.length) availableAgeMorphs.add(name);
      });
    });

    const availableMorphs = DIALOGUE_FACIAL_MORPH_NAMES.filter((name) => this.bindings.has(name));
    const missingMorphs = DIALOGUE_FACIAL_MORPH_NAMES.filter((name) => !this.bindings.has(name));
    this.capability = {
      status: availableMorphs.length === 0
        ? "MORPH_TARGETS_UNAVAILABLE"
        : missingMorphs.length === 0 ? "READY" : "PARTIAL",
      animatedMeshCount: boundMeshIds.size,
      availableMorphs,
      missingMorphs,
      availableAgeMorphs: AGE_FACIAL_MORPH_NAMES.filter((name) => availableAgeMorphs.has(name)),
      capabilities: {
        blink: this.hasAll(BLINK_MORPHS),
        gaze: this.hasAll(GAZE_MORPHS),
        speech: this.hasAll(BAKED_META_VISEME_MORPH_NAMES),
      },
    };
    this.deterministicSeed = deterministicSeed;
    this.phaseOffset = stableUnitInterval(deterministicSeed);
    this.clearOwnedChannels();
  }

  public capabilityStatus(): FacialAnimationCapabilityStatus {
    return {
      ...this.capability,
      availableMorphs: [...this.capability.availableMorphs],
      missingMorphs: [...this.capability.missingMorphs],
      availableAgeMorphs: [...this.capability.availableAgeMorphs],
      capabilities: { ...this.capability.capabilities },
    };
  }

  /** Starts dialogue using canonical, analyzer-produced Meta viseme cues. */
  public beginDialogueWithVisemes(cues: readonly TimedMetaVisemeCue[], elapsedSeconds: number): void {
    if (this.capability.status === "MORPH_TARGETS_UNAVAILABLE") return;
    this.dialogueActive = true;
    this.dialogueStartedAt = elapsedSeconds;
    this.speakVisemeCues(cues, elapsedSeconds);
  }

  /** Replaces the active line using canonical, analyzer-produced Meta viseme cues. */
  public speakVisemeCues(cues: readonly TimedMetaVisemeCue[], elapsedSeconds: number): void {
    if (this.capability.status === "MORPH_TARGETS_UNAVAILABLE") return;
    this.clearSpeechChannels();
    this.dialogueActive = true;
    this.speechStartedAt = elapsedSeconds;
    this.activeSpeechCues = validateSpeechCues(cues);
    this.speechEndsAt = elapsedSeconds + this.activeSpeechCues.reduce(
      (maximum, cue) => Math.max(maximum, cue.endsAtSeconds),
      0,
    );
  }

  /** @deprecated Compatibility only. Text has no proven timing, so speech fails closed. */
  public beginDialogue(text: string, elapsedSeconds: number): void {
    void text;
    this.beginDialogueWithVisemes([], elapsedSeconds);
  }

  /** @deprecated Compatibility only. Text has no proven timing, so speech fails closed. */
  public speakLine(text: string, elapsedSeconds: number): void {
    void text;
    this.speakVisemeCues([], elapsedSeconds);
  }

  public closeDialogue(): void {
    this.dialogueActive = false;
    this.speechEndsAt = 0;
    this.activeSpeechCues = [];
    this.clearOwnedChannels();
  }

  public update(elapsedSeconds: number): void {
    if (!this.dialogueActive || this.capability.status === "MORPH_TARGETS_UNAVAILABLE") return;
    if (this.capability.capabilities.blink) {
      const blinkWeights = new Map<DialogueFacialMorphName, number>();
      this.addIdleBlink(blinkWeights, elapsedSeconds);
      this.writeChannels(BLINK_MORPHS, blinkWeights);
    }
    if (this.capability.capabilities.gaze) {
      const gazeWeights = new Map<DialogueFacialMorphName, number>();
      this.addIdleGaze(gazeWeights, elapsedSeconds);
      this.writeChannels(GAZE_MORPHS, gazeWeights);
    }
    if (this.capability.capabilities.speech) {
      const speechWeights = new Map<DialogueFacialMorphName, number>();
      if (elapsedSeconds <= this.speechEndsAt) this.addSpeech(speechWeights, elapsedSeconds);
      this.writeChannels(BAKED_META_VISEME_MORPH_NAMES, speechWeights);
    }
  }

  private hasAll(names: readonly DialogueFacialMorphName[]): boolean {
    return names.every((name) => this.bindings.has(name));
  }

  private addIdleBlink(weights: Map<DialogueFacialMorphName, number>, elapsedSeconds: number): void {
    const local = elapsedSeconds - this.dialogueStartedAt;
    let blinkStartsAt = 1.25 + this.phaseOffset * 1.25;
    let blinkIndex = 0;
    while (local > blinkStartsAt + BLINK_TOTAL_SECONDS && blinkIndex < 512) {
      blinkStartsAt += BLINK_TOTAL_SECONDS
        + 2.7
        + stableUnitInterval(`${this.deterministicSeed}:blink-gap:${blinkIndex}`) * 3.1;
      blinkIndex += 1;
    }

    const phase = local - blinkStartsAt;
    if (phase < 0 || phase >= BLINK_TOTAL_SECONDS) return;
    const blink = phase < BLINK_CLOSE_SECONDS
      ? smoothUnitInterval(phase / BLINK_CLOSE_SECONDS)
      : phase < BLINK_CLOSE_SECONDS + BLINK_HOLD_SECONDS
        ? 1
        : 1 - smoothUnitInterval(
          (phase - BLINK_CLOSE_SECONDS - BLINK_HOLD_SECONDS) / BLINK_OPEN_SECONDS,
        );
    if (blink <= 0) return;
    weights.set("eyeBlinkLeft", clampWeight(blink));
    weights.set("eyeBlinkRight", clampWeight(blink));
  }

  private addIdleGaze(weights: Map<DialogueFacialMorphName, number>, elapsedSeconds: number): void {
    const local = Math.max(0, elapsedSeconds - this.dialogueStartedAt);
    let segmentStartsAt = 0;
    let segmentIndex = 0;
    let segmentDuration = this.gazeHoldSeconds(segmentIndex);
    while (local >= segmentStartsAt + segmentDuration && segmentIndex < 512) {
      segmentStartsAt += segmentDuration;
      segmentIndex += 1;
      segmentDuration = this.gazeHoldSeconds(segmentIndex);
    }

    const previous = segmentIndex === 0 ? { horizontal: 0, vertical: 0 } : this.gazeTarget(segmentIndex - 1);
    const target = this.gazeTarget(segmentIndex);
    const transition = smoothUnitInterval((local - segmentStartsAt) / 0.14);
    const horizontal = THREE.MathUtils.lerp(previous.horizontal, target.horizontal, transition);
    const vertical = THREE.MathUtils.lerp(previous.vertical, target.vertical, transition);
    if (horizontal < 0) {
      weights.set("eyeLookOutLeft", Math.abs(horizontal));
      weights.set("eyeLookInRight", Math.abs(horizontal));
    } else if (horizontal > 0) {
      weights.set("eyeLookInLeft", horizontal);
      weights.set("eyeLookOutRight", horizontal);
    }
    if (vertical < 0) {
      weights.set("eyeLookDownLeft", Math.abs(vertical));
      weights.set("eyeLookDownRight", Math.abs(vertical));
    } else if (vertical > 0) {
      weights.set("eyeLookUpLeft", vertical);
      weights.set("eyeLookUpRight", vertical);
    }
  }

  private gazeHoldSeconds(segmentIndex: number): number {
    return 2.2 + stableUnitInterval(`${this.deterministicSeed}:gaze-hold:${segmentIndex}`) * 2.4;
  }

  private gazeTarget(segmentIndex: number): GazeTarget {
    const directionIndex = Math.floor(
      stableUnitInterval(`${this.deterministicSeed}:gaze-direction:${segmentIndex}`) * 9,
    );
    const directions: readonly GazeTarget[] = [
      { horizontal: 0, vertical: 0 },
      { horizontal: -1, vertical: 0 },
      { horizontal: 1, vertical: 0 },
      { horizontal: 0, vertical: 1 },
      { horizontal: 0, vertical: -1 },
      { horizontal: -0.8, vertical: 0.6 },
      { horizontal: 0.8, vertical: 0.6 },
      { horizontal: -0.8, vertical: -0.6 },
      { horizontal: 0.8, vertical: -0.6 },
    ];
    const direction = directions[directionIndex] ?? directions[0]!;
    const horizontalAmplitude = 0.08
      + stableUnitInterval(`${this.deterministicSeed}:gaze-horizontal:${segmentIndex}`) * 0.1;
    const verticalAmplitude = 0.04
      + stableUnitInterval(`${this.deterministicSeed}:gaze-vertical:${segmentIndex}`) * 0.07;
    return {
      horizontal: direction.horizontal * horizontalAmplitude,
      vertical: direction.vertical * verticalAmplitude,
    };
  }

  private addSpeech(weights: Map<DialogueFacialMorphName, number>, elapsedSeconds: number): void {
    const local = Math.max(0, elapsedSeconds - this.speechStartedAt);
    const silenceActive = this.activeSpeechCues.some(
      (cue) => cue.viseme === "viseme_sil"
        && local >= cue.startsAtSeconds
        && local <= cue.endsAtSeconds,
    );
    if (silenceActive) return;

    this.activeSpeechCues.forEach((cue) => {
      if (cue.viseme === "viseme_sil") return;
      const articulation = cueWeight(cue, local);
      if (articulation <= 0) return;
      weights.set(cue.viseme, (weights.get(cue.viseme) ?? 0) + articulation);
    });
    const total = [...weights.values()].reduce((sum, weight) => sum + weight, 0);
    const normalization = total > 1 ? 1 / total : 1;
    weights.forEach((weight, name) => weights.set(name, clampWeight(weight * normalization)));
  }

  private clearOwnedChannels(): void {
    if (this.capability.capabilities.blink) this.writeChannels(BLINK_MORPHS, new Map());
    if (this.capability.capabilities.gaze) this.writeChannels(GAZE_MORPHS, new Map());
    if (this.capability.capabilities.speech) this.clearSpeechChannels();
  }

  private clearSpeechChannels(): void {
    if (this.capability.capabilities.speech) {
      this.writeChannels(BAKED_META_VISEME_MORPH_NAMES, new Map());
    }
  }

  private writeChannels(
    names: readonly DialogueFacialMorphName[],
    weights: ReadonlyMap<DialogueFacialMorphName, number>,
  ): void {
    names.forEach((name) => {
      const weight = clampWeight(weights.get(name) ?? 0);
      this.bindings.get(name)?.forEach(({ influences, index }) => { influences[index] = weight; });
    });
  }
}
