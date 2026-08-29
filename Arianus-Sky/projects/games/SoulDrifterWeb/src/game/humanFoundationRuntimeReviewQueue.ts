import type { PilotAnimationCatalog } from "./pilotAnimationCatalog";

export interface HumanFoundationRuntimeReviewQueueEntry {
  semanticId:
    | "locomotion.fall.loop"
    | "locomotion.land.running"
    | "locomotion.dodge.directional"
    | "combat.unarmed.block";
  clipName: string;
  packId: "pro-longbow-01";
  catalogFingerprint: string;
  playIntent: "LOOP" | "ONE_SHOT";
  preserveAuthoredTravel: boolean;
  allowsAirborneClearance: boolean;
  independentVisualReview: "PASS_PROVISIONAL";
}

export const HUMAN_FOUNDATION_RUNTIME_REVIEW_QUEUE = [
  {
    semanticId: "locomotion.fall.loop",
    clipName: "ProLongbow__FallALoop",
    packId: "pro-longbow-01",
    catalogFingerprint: "5CBF329D0273A15B49B76A39E105D8C52614250FD05A927B3388977CD542BE78",
    playIntent: "LOOP",
    preserveAuthoredTravel: true,
    allowsAirborneClearance: true,
    independentVisualReview: "PASS_PROVISIONAL",
  },
  {
    semanticId: "locomotion.land.running",
    clipName: "ProLongbow__FallALandToRunForward",
    packId: "pro-longbow-01",
    catalogFingerprint: "B757BB2A802E8A9315ACC6A700D7BBAC206C96A68EDDE110238F5DDA69F1D062",
    playIntent: "ONE_SHOT",
    preserveAuthoredTravel: true,
    allowsAirborneClearance: true,
    independentVisualReview: "PASS_PROVISIONAL",
  },
  {
    semanticId: "locomotion.dodge.directional",
    clipName: "ProLongbow__StandingDodgeForward",
    packId: "pro-longbow-01",
    catalogFingerprint: "A03E5BE1E0D87CA3E5687F9A3F8F72872FE72088EFBC6AA580A4751D171E578B",
    playIntent: "ONE_SHOT",
    preserveAuthoredTravel: true,
    allowsAirborneClearance: true,
    independentVisualReview: "PASS_PROVISIONAL",
  },
  {
    semanticId: "locomotion.dodge.directional",
    clipName: "ProLongbow__StandingDodgeBackward",
    packId: "pro-longbow-01",
    catalogFingerprint: "4C9C11B9A96C85345BDA557F6839F2EE0F2AE8DDB3A9C026D951C4E9B4BCB41F",
    playIntent: "ONE_SHOT",
    preserveAuthoredTravel: true,
    allowsAirborneClearance: true,
    independentVisualReview: "PASS_PROVISIONAL",
  },
  {
    semanticId: "locomotion.dodge.directional",
    clipName: "ProLongbow__StandingDodgeLeft",
    packId: "pro-longbow-01",
    catalogFingerprint: "940D9688C87E11C41523DC7F632CCC19FD5C88020E0EF65DFC796B6C24EBE544",
    playIntent: "ONE_SHOT",
    preserveAuthoredTravel: true,
    allowsAirborneClearance: true,
    independentVisualReview: "PASS_PROVISIONAL",
  },
  {
    semanticId: "locomotion.dodge.directional",
    clipName: "ProLongbow__StandingDodgeRight",
    packId: "pro-longbow-01",
    catalogFingerprint: "9E5F5BDD06F21CA208B36468C5EC9D1F600217B9C579A63C8951272998458365",
    playIntent: "ONE_SHOT",
    preserveAuthoredTravel: true,
    allowsAirborneClearance: true,
    independentVisualReview: "PASS_PROVISIONAL",
  },
  {
    semanticId: "combat.unarmed.block",
    clipName: "ProLongbow__StandingBlock",
    packId: "pro-longbow-01",
    catalogFingerprint: "6B4B325CDF88D9D1BCC14E24A5F5E9F2657C57DA88346EACE6FC11CE39820B3A",
    playIntent: "ONE_SHOT",
    preserveAuthoredTravel: false,
    allowsAirborneClearance: false,
    independentVisualReview: "PASS_PROVISIONAL",
  },
] as const satisfies readonly HumanFoundationRuntimeReviewQueueEntry[];

export function resolveHumanFoundationRuntimeReviewQueue(
  catalog: PilotAnimationCatalog,
): readonly string[] {
  const seen = new Set<string>();
  for (const queued of HUMAN_FOUNDATION_RUNTIME_REVIEW_QUEUE) {
    if (seen.has(queued.clipName)) {
      throw new Error(`Issue #487 runtime review queue duplicates ${queued.clipName}.`);
    }
    seen.add(queued.clipName);
    const clip = catalog.clips.find((candidate) => candidate.name === queued.clipName);
    if (!clip) throw new Error(`Issue #487 runtime review queue is missing ${queued.clipName}.`);
    if (clip.packId !== queued.packId) {
      throw new Error(`Issue #487 runtime review queue ${queued.clipName} moved from ${queued.packId} to ${clip.packId}.`);
    }
    if (clip.fingerprint !== queued.catalogFingerprint) {
      throw new Error(`Issue #487 runtime review queue ${queued.clipName} fingerprint changed.`);
    }
    const pack = catalog.packs.find((candidate) => candidate.id === queued.packId);
    if (!pack?.clipNames.includes(queued.clipName)) {
      throw new Error(`Issue #487 runtime review queue pack ${queued.packId} omits ${queued.clipName}.`);
    }
  }
  return HUMAN_FOUNDATION_RUNTIME_REVIEW_QUEUE.map((entry) => entry.clipName);
}
