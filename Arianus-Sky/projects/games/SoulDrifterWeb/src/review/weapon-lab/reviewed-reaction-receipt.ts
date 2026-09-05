import { REACTION_ARCHETYPES, REACTION_CONTRACT_CLIPS, REACTION_SETS, REACTION_PHASE_ROLES,
  type ReactionArchetype, type ReactionSetId } from "./reaction-contract";

/**
 * Review-only intake for an authored special-attack reaction pack.
 *
 * A pack is installed BESIDE the body it plays on, never over it. The human
 * library at
 * `/assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb`
 * is untouched and stays byte-identical, and so are the Warden and Breachling
 * bodies: a reaction pack is its own GLB under `/assets/weapon-lab/reactions/`
 * and reaches an actor only through this allowlist, the same way a rebuilt Warden
 * body sits beside the shipped one.
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
 *
 * Both of those are archetype properties, not constants: the three archetypes are
 * three different skeletons, measured at 65, 18 and 30 joints. `REACTION_RIG_LINEAGE`
 * below is the one place that says which body each archetype's pack carries, and
 * every row is checked against its own archetype's entry rather than against a
 * humanoid-shaped default.
 */
export interface ReviewedReactionPack {
  readonly archetype: ReactionArchetype;
  readonly url: string;
  readonly bytes: number;
  readonly sha256: string;
  /** Body GLB this pack carries the skeleton of, not the immediate working parent. */
  readonly rigSourceSha256: string;
  readonly jointCount: number;
  /** Exact clip names in this file; a subset of the archetype's nine. */
  readonly clips: readonly string[];
}
export type ReviewedReactionPacks = Readonly<Partial<Record<ReactionArchetype, readonly ReviewedReactionPack[]>>>;

/** The one body an archetype's packs carry the skeleton of, and its joint count. */
export interface ReactionRigLineage {
  readonly bodyUrl: string;
  readonly sha256: string;
  readonly jointCount: number;
  /** How the equality below was established, so a later reader does not have to re-derive it. */
  readonly evidence: string;
}

/**
 * Which rig each archetype's reaction pack is authored on.
 *
 * Every value here was measured on the shipped bytes by comparing the pack GLB's
 * own skin against the body GLB's: same joint count, same joint order, and max
 * absolute difference 0.000e+0 on bind translation, bind rotation, bind scale and
 * the inverse bind matrices. A pack is therefore not merely compatible with its
 * body — it carries that body's skeleton exactly.
 *
 * SIBLING BODIES ARE NOT COVERED BY THE SAME NUMBERS, and this is the reason the
 * lineage is pinned rather than inferred from the archetype's joint names:
 *  - `oathbreaker-greater-cinderbound-warden-fourview-v7.glb` has the same 18
 *    joints in the same order, but its bind differs from the Wayfarer's by up to
 *    0.229 in a quaternion component and 0.681 in an inverse bind matrix entry.
 *  - `breachling-ravager-fourview-composer-v4.glb` (34 joints) and
 *    `breachling-oathbound-fourview-composer-q4.glb` (38) carry the base rig's 30
 *    names plus rear toes, at up to 1.462 of quaternion component difference;
 *    `breachling-stalker-fourview-composer-v5.glb` (26) is missing
 *    `front_toe1L..3L/R` outright and is rejected by `assertReactionClipsBind`
 *    before anything is bound.
 * Playing a pack on a sibling is a per-variant build, not a registration.
 */
export const REACTION_RIG_LINEAGE: Readonly<Record<ReactionArchetype, ReactionRigLineage>> = Object.freeze({
  humanoid: Object.freeze({
    bodyUrl: "/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb",
    sha256: "b86f7378ada29ff11e0fbc030d438fe241b8d4a74c47afd37cc8aced28c5ff81",
    jointCount: 65,
    evidence: "Human Foundation rig; 65 joints, bind identical to the shipped runtime body (max abs diff 0 on TRS and inverse binds).",
  }),
  warden: Object.freeze({
    bodyUrl: "/assets/weapon-lab/wardens/wayfarer-cinderbound-warden-fourview-v12.glb",
    sha256: "79b8420120f6227b6a8056f67b1ca9067048f0e63b575617a65878cb0c106dcf",
    jointCount: 18,
    evidence: "Cinderbound Wayfarer four-view body; 18 joints, no digit or toe bones, bind identical (max abs diff 0 on TRS and inverse binds).",
  }),
  breachling: Object.freeze({
    bodyUrl: "/assets/weapon-lab/mobs/breachling-base-fourview-composer-v8.glb",
    sha256: "625055eef3c3a8cd755f343aedfd70e0ecb4310a953ad60b39430be455c2b9c0",
    jointCount: 30,
    evidence: "Base Breachling four-view body; 30 joints — 24 canonical plus six front toes — bind identical (max abs diff 0 on TRS and inverse binds).",
  }),
});

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
      // The rig is the archetype's, never a shared constant: 65, 18 and 30 joints
      // are three different skeletons, and a row that names the wrong one would
      // otherwise register a pack that cannot bind on the body it will be played on.
      const lineage = REACTION_RIG_LINEAGE[archetype];
      if (pack.rigSourceSha256 !== lineage.sha256) throw invalid(`pinned against the wrong rig; the ${archetype} pack carries ${lineage.bodyUrl}`);
      if (pack.jointCount !== lineage.jointCount) throw invalid(`joint count ${pack.jointCount} is not the ${lineage.jointCount}-joint ${archetype} rig`);
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
 * All three archetypes are registered. Each one carries the same nine contract
 * clips on its OWN skeleton — 65 joints for the humanoid, 18 for the Warden, 30
 * for the Breachling — so selection resolves by archetype and a body is never
 * handed another archetype's motion. The union rule is unchanged and still the
 * thing that admits a row: an archetype appears here only when its packs together
 * carry exactly the nine clips with none claimed twice, whether that arrives as
 * one file or as three authoring lanes.
 *
 * `humanoid` is delivered as the three lanes that produced it. All three files
 * carry the same 65-joint Human Foundation skeleton in the same order as
 * `human-foundation-pilot-runtime-4k.glb` (sha256 b86f7378…c5ff81), measured, so
 * any of them binds on the existing human actor.
 *
 * `warden` and `breachling` are single files, each nine clips on one rig. Both
 * were verified the same way the humanoid rows were: bytes and sha256 hashed on
 * the installed file, and the pack's own skin compared joint for joint against the
 * body named in `REACTION_RIG_LINEAGE` (same count, same order, max absolute
 * difference 0.000e+0 on bind TRS and inverse bind matrices).
 *
 * Revisions poison-r4 / burn-r2 / kd-r14 close contract defects D1 and D4. Every
 * clip now animates 52 of the 65 joints instead of 20: the 30 finger joints and
 * the two ToeBase joints carry authored motion, and the 13 that remain at the
 * bind rotation are exactly the 13 Mixamo END SITES that own zero skin weight on
 * this body (ten fingertips, two toe tips, HeadTop_End), so no vertex on the mesh
 * is left unreachable. BurnBurn's steps leave the floor: measured toe clearance
 * rose from 47.1 / 42.1 mm to 85.7 / 79.7 mm on the 0.9891 m rig, and the worst
 * accumulated horizontal drag of a contact vertex fell from 8.72 / 3.98 mm to
 * 2.19 / 2.34 mm. Byte lengths and checksums below were hashed on these files.
 */
export const REVIEWED_REACTION_PACKS: ReviewedReactionPacks = prepareReviewedReactionPacks({
  humanoid: [
    {
      archetype: "humanoid",
      url: "/assets/weapon-lab/reactions/humanoid-reactions-poison-r4.glb",
      bytes: 3_364_176,
      sha256: "2d7bdfaacac3ee9650f292d64d9c8d4a583c9396be47a66658953cfadba51363",
      rigSourceSha256: "b86f7378ada29ff11e0fbc030d438fe241b8d4a74c47afd37cc8aced28c5ff81",
      jointCount: 65,
      clips: ["PoisonImpact", "PoisonLoop", "PoisonRecover"],
    },
    {
      archetype: "humanoid",
      url: "/assets/weapon-lab/reactions/humanoid-reactions-burn-r2.glb",
      bytes: 3_403_688,
      sha256: "246b46a6867b499961908cd5977335206df593d90be0c7f5f15f43cdb224030f",
      rigSourceSha256: "b86f7378ada29ff11e0fbc030d438fe241b8d4a74c47afd37cc8aced28c5ff81",
      jointCount: 65,
      clips: ["BurnFlare", "BurnBurn", "BurnRecover"],
    },
    {
      archetype: "humanoid",
      url: "/assets/weapon-lab/reactions/humanoid-reactions-kd-r14.glb",
      bytes: 3_442_812,
      sha256: "c40fa8ab8615fbc2c81418645942e9192c2679f49f35b6cf0353e252afa8eb34",
      rigSourceSha256: "b86f7378ada29ff11e0fbc030d438fe241b8d4a74c47afd37cc8aced28c5ff81",
      jointCount: 65,
      clips: ["Knockdown", "ProneHold", "GetUp"],
    },
  ],
  // One file, nine clips, on the Cinderbound rig's own 18 joints. The Warden has
  // no digit or toe bones, so D1 has no analogue here: every joint the rig owns
  // carries authored motion in every clip.
  warden: [
    {
      archetype: "warden",
      url: "/assets/weapon-lab/reactions/warden-reactions-r3.glb",
      bytes: 22_228_284,
      sha256: "ac58bc6ff929821a4585a661c4297ad85dca4890ad212c997d603e359b744662",
      rigSourceSha256: "79b8420120f6227b6a8056f67b1ca9067048f0e63b575617a65878cb0c106dcf",
      jointCount: 18,
      clips: ["PoisonImpact", "PoisonLoop", "PoisonRecover", "BurnFlare", "BurnBurn", "BurnRecover",
        "Knockdown", "ProneHold", "GetUp"],
    },
  ],
  // One file, nine clips, on the base four-view quadruped's 30 joints — the 24
  // canonical bones plus the six front toes, which carry 8.18 % of the body's skin
  // weight and are what keeps the forepaws out of the floor.
  //
  // quad-r9 supersedes quad-r4, which shipped contract defect D8: `GetUp` teleported
  // the planted right REAR foot 154.91 mm horizontally in one 1/60 s frame and back
  // again while never leaving the 4 mm contact band, and `BurnRecover` — which nobody
  // had looked at — did the same at 150.30 mm and 61.45 mm. Both clips are re-authored:
  // the hind pair is gathered earlier and folded deeper so it takes a real step, and the
  // forepaw the animal actually stands up on is planted at the frame its own FK
  // trajectory reaches the floor instead of being left free to skate. Measured on the
  // shipped bytes with issue-458-motion-composer-v1/tools/measure-breachling-pack.mjs:
  // every rear foot of every clip now reads 0.00 mm of in-band out-and-back, and the
  // worst anywhere in the pack is 1.47 mm on a forepaw in `PoisonImpact`, which quad-r4
  // also had.
  breachling: [
    {
      archetype: "breachling",
      url: "/assets/weapon-lab/reactions/breachling-reactions-quad-r9.glb",
      bytes: 15_195_976,
      sha256: "0ef324b7d893fe24c6cf42f41803a8352fda97493e987294f07b3083ca7bf915",
      rigSourceSha256: "625055eef3c3a8cd755f343aedfd70e0ecb4310a953ad60b39430be455c2b9c0",
      jointCount: 30,
      clips: ["PoisonImpact", "PoisonLoop", "PoisonRecover", "BurnFlare", "BurnBurn", "BurnRecover",
        "Knockdown", "ProneHold", "GetUp"],
    },
  ],
});
