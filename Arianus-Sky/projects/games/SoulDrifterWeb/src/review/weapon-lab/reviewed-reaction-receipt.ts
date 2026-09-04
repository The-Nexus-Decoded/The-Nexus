import { REACTION_ARCHETYPES, REACTION_CONTRACT_CLIPS, REACTION_SETS, REACTION_PHASE_ROLES,
  type ReactionArchetype, type ReactionSetId } from "./reaction-contract";

/**
 * Review-only intake for an authored special-attack reaction pack.
 *
 * The pack is installed BESIDE the human animation library, never over it. The
 * library at
 * `/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb`
 * is untouched and stays byte-identical; a reaction pack is its own GLB under
 * `/assets/weapon-lab/reactions/` and reaches an actor only through this
 * allowlist, the same way a rebuilt Warden body sits beside the shipped one.
 *
 * An archetype may be delivered as more than one file while the authoring lanes
 * run in parallel — the poison three, the burning three and the knockdown three
 * are separate builds on the same rig. That is why an entry is a LIST of packs.
 * What is enforced is the union: an archetype is registered only when its packs
 * together carry exactly the contract clips, with no clip claimed twice. A
 * half-finished archetype cannot reach the lab by being written to disk, and
 * merging the lanes into one GLB later collapses three rows into one with no code
 * change.
 *
 * `rigSourceSha256` records the body the pack was authored against, so a pack can
 * never be played on a lineage it was not built for. `jointCount` is checked
 * against the parsed skin at load, so a re-export that drops or reorders bones is
 * rejected before it is bound to an actor.
 */
export interface ReviewedReactionPack {
  readonly archetype: ReactionArchetype;
  readonly url: string;
  readonly bytes: number;
  readonly sha256: string;
  /** Body GLB this pack carries the skeleton of, not the immediate working parent. */
  readonly rigSourceSha256: string;
  readonly jointCount: number;
  /** Exact clip names in this file; a subset of the archetype's six. */
  readonly clips: readonly string[];
}
export type ReviewedReactionPacks = Readonly<Partial<Record<ReactionArchetype, readonly ReviewedReactionPack[]>>>;

const REV = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Explicit build-time allowlist. No runtime registration, no library mutation. */
export function prepareReviewedReactionPacks(input: ReviewedReactionPacks): ReviewedReactionPacks {
  const result: Partial<Record<ReactionArchetype, readonly ReviewedReactionPack[]>> = {};
  for (const [key, packs] of Object.entries(input)) {
    const archetype = key as ReactionArchetype;
    const invalid = (why: string) => new Error(`Invalid reviewed reaction pack for ${key}: ${why}`);
    if (!REACTION_ARCHETYPES.includes(archetype)) throw invalid("unknown archetype");
    if (!Array.isArray(packs) || !packs.length) throw invalid("no packs listed");
    const url = new RegExp(`^/assets/weapon-lab/reactions/${archetype}-reactions-(.+)\\.glb$`);
    const claimed: string[] = [];
    for (const pack of packs) {
      const match = typeof pack?.url === "string" ? url.exec(pack.url) : null;
      if (!pack || pack.archetype !== archetype) throw invalid("archetype does not match its key");
      if (!match || !REV.test(match[1]!)) throw invalid(`url is not /assets/weapon-lab/reactions/${archetype}-reactions-<rev>.glb`);
      if (!Number.isSafeInteger(pack.bytes) || pack.bytes <= 0) throw invalid("byte length is not a positive integer");
      if (!/^[a-f0-9]{64}$/.test(pack.sha256) || !/^[a-f0-9]{64}$/.test(pack.rigSourceSha256)) throw invalid("checksums must be lowercase hex sha256");
      if (!Number.isSafeInteger(pack.jointCount) || pack.jointCount < 1 || pack.jointCount > 256) throw invalid("joint count is out of range");
      if (!Array.isArray(pack.clips) || !pack.clips.length) throw invalid("no clips listed");
      if (new Set(pack.clips).size !== pack.clips.length) throw invalid("a clip is listed twice in one pack");
      for (const clip of pack.clips) {
        if (!REACTION_CONTRACT_CLIPS.includes(clip)) throw invalid(`${clip} is not a contract clip name`);
        if (claimed.includes(clip)) throw invalid(`${clip} is claimed by two packs`);
        claimed.push(clip);
      }
    }
    const missing = REACTION_CONTRACT_CLIPS.filter((clip) => !claimed.includes(clip));
    if (missing.length) throw invalid(`incomplete set, missing ${missing.join(", ")}`);
    result[archetype] = Object.freeze(packs.map((pack) => Object.freeze({ ...pack, clips: Object.freeze([...pack.clips]) })));
  }
  return Object.freeze(result);
}

/** Which pack file carries a clip, for evidence and for load ordering. */
export function reactionPackForClip(packs: readonly ReviewedReactionPack[], clipName: string): ReviewedReactionPack | null {
  return packs.find((pack) => pack.clips.includes(clipName)) ?? null;
}

/** True when every clip of `setId` is registered for `archetype`. */
export function reactionSetInstalled(registry: ReviewedReactionPacks, archetype: ReactionArchetype, setId: ReactionSetId): boolean {
  const packs = registry[archetype];
  if (!packs) return false;
  return REACTION_PHASE_ROLES.every((role) => packs.some((pack) => pack.clips.includes(REACTION_SETS[setId].clips[role])));
}

export function reviewedReactionNote(packs: readonly ReviewedReactionPack[]): string {
  const clips = packs.flatMap((pack) => pack.clips);
  return `Special-attack reaction pack: ${clips.length} clips across ${packs.length} pinned file${packs.length === 1 ? "" : "s"} `
    + `(${packs.map((pack) => pack.url.split("/").pop()).join(", ")}). `
    + "Authored on the same rig as the body and installed beside the animation library, which is unchanged. "
    + "Motion intake only; damage, status duration and gameplay acceptance are separate.";
}

/**
 * Packs cleared for isolated Motion Forge review.
 *
 * `humanoid` is delivered as the three authoring lanes that produced it. All
 * three files carry the same 65-joint Human Foundation skeleton in the same order
 * as `human-foundation-pilot-runtime-4k.glb` (sha256 b86f7378…c5ff81), measured,
 * so any of them binds on the existing human actor.
 *
 * `warden` and `breachling` stay absent until their nine clips exist. The
 * selection rules already key off the archetype, so registering them is a data
 * change here and nothing else.
 */
export const REVIEWED_REACTION_PACKS: ReviewedReactionPacks = prepareReviewedReactionPacks({
  humanoid: [
    {
      archetype: "humanoid",
      url: "/assets/weapon-lab/reactions/humanoid-reactions-poison-r3.glb",
      bytes: 3_364_176,
      sha256: "ab3104742fd881cc18e8bbfeeac2c71800cf526fe7e2b8853aa10be5959b8ec8",
      rigSourceSha256: "b86f7378ada29ff11e0fbc030d438fe241b8d4a74c47afd37cc8aced28c5ff81",
      jointCount: 65,
      clips: ["PoisonImpact", "PoisonLoop", "PoisonRecover"],
    },
    {
      archetype: "humanoid",
      url: "/assets/weapon-lab/reactions/humanoid-reactions-burn-r1.glb",
      bytes: 3_403_688,
      sha256: "90f4bae15ec21302dac7d44e8b5d2fb844894ce8fbbe48f57a5a060300091ff5",
      rigSourceSha256: "b86f7378ada29ff11e0fbc030d438fe241b8d4a74c47afd37cc8aced28c5ff81",
      jointCount: 65,
      clips: ["BurnFlare", "BurnBurn", "BurnRecover"],
    },
    {
      archetype: "humanoid",
      url: "/assets/weapon-lab/reactions/humanoid-reactions-kd-r13.glb",
      bytes: 3_442_812,
      sha256: "f87ab1ddc0f0f5bc33cdd39d60531c6ead29a60b4e2ea3a62830ff7627644918",
      rigSourceSha256: "b86f7378ada29ff11e0fbc030d438fe241b8d4a74c47afd37cc8aced28c5ff81",
      jointCount: 65,
      clips: ["Knockdown", "ProneHold", "GetUp"],
    },
  ],
});
