import * as THREE from "three";

export const DIALOGUE_FACIAL_MORPH_NAMES = [
  "Blink_L",
  "Blink_R",
  "JawOpen",
  "Smile",
  "Frown",
  "Viseme_AA",
  "Viseme_EE",
  "Viseme_OH",
  "Viseme_MBP",
  "Gaze_Left",
  "Gaze_Right",
  "Gaze_Up",
  "Gaze_Down",
  "Brow_Raise",
  "Brow_Lower",
  "LipSeal",
] as const;

export const AGE_FACIAL_MORPH_NAMES = ["Age_Middle", "Age_Elder"] as const;

export type DialogueFacialMorphName = typeof DIALOGUE_FACIAL_MORPH_NAMES[number];
export type AgeFacialMorphName = typeof AGE_FACIAL_MORPH_NAMES[number];

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

const SPEECH_MORPHS = [
  "JawOpen",
  "Viseme_AA",
  "Viseme_EE",
  "Viseme_OH",
  "Viseme_MBP",
  "LipSeal",
] as const satisfies readonly DialogueFacialMorphName[];

const GAZE_MORPHS = ["Gaze_Left", "Gaze_Right", "Gaze_Up", "Gaze_Down"] as const;

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

function speechDurationSeconds(text: string): number {
  const words = text.trim().split(/\s+/u).filter(Boolean).length;
  const characters = text.replace(/\s/gu, "").length;
  return THREE.MathUtils.clamp(0.45 + words * 0.3 + characters * 0.012, 0.8, 8);
}

function speechUnits(text: string): string[] {
  const units = text.toUpperCase().match(/[A-Z]/gu);
  return units && units.length > 0 ? units : ["A"];
}

function visemeForCharacter(character: string): "Viseme_AA" | "Viseme_EE" | "Viseme_OH" | "Viseme_MBP" {
  if (/[MBP]/u.test(character)) return "Viseme_MBP";
  if (/[OUWQ]/u.test(character)) return "Viseme_OH";
  if (/[EIY]/u.test(character)) return "Viseme_EE";
  return "Viseme_AA";
}

/**
 * Drives only exact, already-authored facial morph targets on a live model.
 * Missing controls are ignored; bones and geometry are never modified.
 */
export class FacialAnimationDriver {
  private readonly bindings = new Map<DialogueFacialMorphName, MorphBinding[]>();
  private readonly capability: FacialAnimationCapabilityStatus;
  private readonly phaseOffset: number;
  private dialogueActive = false;
  private dialogueStartedAt = 0;
  private speechStartedAt = 0;
  private speechEndsAt = 0;
  private activeSpeechUnits: string[] = ["A"];

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
        blink: this.hasAll(["Blink_L", "Blink_R"]),
        gaze: this.hasAll(GAZE_MORPHS),
        speech: this.hasAll(SPEECH_MORPHS),
      },
    };
    this.phaseOffset = stableUnitInterval(deterministicSeed);
    this.writeNeutral();
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

  public beginDialogue(text: string, elapsedSeconds: number): void {
    if (this.capability.status === "MORPH_TARGETS_UNAVAILABLE") return;
    this.dialogueActive = true;
    this.dialogueStartedAt = elapsedSeconds;
    this.speakLine(text, elapsedSeconds);
  }

  public speakLine(text: string, elapsedSeconds: number): void {
    if (this.capability.status === "MORPH_TARGETS_UNAVAILABLE") return;
    this.writeNeutral();
    this.dialogueActive = true;
    this.speechStartedAt = elapsedSeconds;
    this.speechEndsAt = elapsedSeconds + speechDurationSeconds(text);
    this.activeSpeechUnits = speechUnits(text);
  }

  public closeDialogue(): void {
    this.dialogueActive = false;
    this.speechEndsAt = 0;
    this.writeNeutral();
  }

  public update(elapsedSeconds: number): void {
    if (!this.dialogueActive || this.capability.status === "MORPH_TARGETS_UNAVAILABLE") return;
    const weights = new Map<DialogueFacialMorphName, number>();
    this.addIdleBlink(weights, elapsedSeconds);
    this.addIdleGaze(weights, elapsedSeconds);
    if (elapsedSeconds < this.speechEndsAt) this.addSpeech(weights, elapsedSeconds);
    this.writeWeights(weights);
  }

  private hasAll(names: readonly DialogueFacialMorphName[]): boolean {
    return names.every((name) => this.bindings.has(name));
  }

  private addIdleBlink(weights: Map<DialogueFacialMorphName, number>, elapsedSeconds: number): void {
    const local = elapsedSeconds - this.dialogueStartedAt;
    const initialDelay = 1.6 + this.phaseOffset * 1.4;
    if (local < initialDelay) return;
    const interval = 3.1 + this.phaseOffset * 1.2;
    const phase = (local - initialDelay) % interval;
    const blink = phase < 0.075
      ? phase / 0.075
      : phase < 0.19 ? 1 - (phase - 0.075) / 0.115 : 0;
    if (blink <= 0) return;
    weights.set("Blink_L", clampWeight(blink));
    weights.set("Blink_R", clampWeight(blink * 0.97));
  }

  private addIdleGaze(weights: Map<DialogueFacialMorphName, number>, elapsedSeconds: number): void {
    const local = elapsedSeconds - this.dialogueStartedAt;
    const horizontal = Math.sin(local * 0.62 + this.phaseOffset * Math.PI * 2) * 0.2;
    const vertical = Math.sin(local * 0.37 + this.phaseOffset * Math.PI) * 0.1;
    weights.set(horizontal >= 0 ? "Gaze_Right" : "Gaze_Left", Math.abs(horizontal));
    weights.set(vertical >= 0 ? "Gaze_Up" : "Gaze_Down", Math.abs(vertical));
  }

  private addSpeech(weights: Map<DialogueFacialMorphName, number>, elapsedSeconds: number): void {
    const local = Math.max(0, elapsedSeconds - this.speechStartedAt);
    const remaining = Math.max(0, this.speechEndsAt - elapsedSeconds);
    const envelope = Math.min(1, local / 0.1, remaining / 0.16);
    const unitPosition = local * 8;
    const unitIndex = Math.floor(unitPosition);
    const blend = unitPosition - unitIndex;
    const current = this.activeSpeechUnits[unitIndex % this.activeSpeechUnits.length]!;
    const next = this.activeSpeechUnits[(unitIndex + 1) % this.activeSpeechUnits.length]!;
    this.addViseme(weights, visemeForCharacter(current), (1 - blend) * envelope);
    this.addViseme(weights, visemeForCharacter(next), blend * envelope);
  }

  private addViseme(
    weights: Map<DialogueFacialMorphName, number>,
    viseme: "Viseme_AA" | "Viseme_EE" | "Viseme_OH" | "Viseme_MBP",
    weight: number,
  ): void {
    const strength = clampWeight(weight * 0.82);
    weights.set(viseme, clampWeight((weights.get(viseme) ?? 0) + strength));
    if (viseme === "Viseme_MBP") {
      weights.set("LipSeal", clampWeight((weights.get("LipSeal") ?? 0) + strength * 0.92));
      return;
    }
    const jawScale = viseme === "Viseme_OH" ? 0.66 : viseme === "Viseme_AA" ? 0.72 : 0.46;
    weights.set("JawOpen", clampWeight((weights.get("JawOpen") ?? 0) + strength * jawScale));
  }

  private writeNeutral(): void {
    this.writeWeights(new Map());
  }

  private writeWeights(weights: ReadonlyMap<DialogueFacialMorphName, number>): void {
    this.bindings.forEach((bindings, name) => {
      const weight = clampWeight(weights.get(name) ?? 0);
      bindings.forEach(({ influences, index }) => { influences[index] = weight; });
    });
  }
}
