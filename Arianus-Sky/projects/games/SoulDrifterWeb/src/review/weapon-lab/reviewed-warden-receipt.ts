import {
  CINDERBOUND_WARDEN_ASSETS, CINDERBOUND_WARDEN_SHATTER_CHUNK_PREFIX,
  cinderboundWardenActionNames, cinderboundWardenClipSet, type CinderboundWardenKind,
} from "../../game/dungeons/breach-v2-wardens";
import { CINDERBOUND_WARDEN_SHATTER_CLIP } from "../../game/dungeons/breach-v2-warden-effects";

/**
 * Review-only intake for a rebuilt Cinderbound Warden body.
 *
 * The shipped Warden GLBs are byte-pinned in the mobs catalog and re-hashed by the
 * asset loader and by CI, so a rebuilt body is never written over them. It is
 * installed beside them under /assets/weapon-lab/wardens/ and listed as its own
 * review entry, the same way the four-view Breachling bodies sit beside the
 * single-view ones. `runtimeSourceSha256` records which shipped Warden the entry
 * stands in for, so a receipt can never be pointed at the wrong lineage.
 *
 * A Warden receipt pins the whole clip set rather than a revised subset: the
 * warden runtime enumerates every required action name at load and throws on a
 * missing one, so a partial pack cannot be reviewed at all. The one clip a pack
 * may legitimately omit is the shatter death — but only by omitting the fracture
 * with it. A receipt that claims fractured chunks without the DeathShatter clip,
 * or the clip without the chunks, is rejected here rather than failing later on
 * the stage.
 */
export interface ReviewedWardenReceipt {
  readonly kind: CinderboundWardenKind;
  readonly url: string;
  /** Shipped Warden asset this rebuild stands in for, not the immediate working parent. */
  readonly runtimeSourceSha256: string;
  readonly bytes: number;
  readonly sha256: string;
  /** Recorded for provenance; the runtime still derives scale from the measured height. */
  readonly runtimeScale: number;
  readonly clips: readonly string[];
  /**
   * Number of `Shatter_Chunk_NN` nodes the pack ships, when it carries the
   * fracture. Absent on a pack with no shatter death; never zero.
   */
  readonly shatterChunks?: number;
}
export type ReviewedWardenReceipts = Readonly<Partial<Record<CinderboundWardenKind, ReviewedWardenReceipt>>>;

const CLIP_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;

/** Explicit build-time allowlist. No runtime registration, no catalog mutation. */
export function prepareReviewedWardenReceipts(input: ReviewedWardenReceipts): ReviewedWardenReceipts {
  const result: Partial<Record<CinderboundWardenKind, ReviewedWardenReceipt>> = {};
  for (const [key, receipt] of Object.entries(input)) {
    const kind = key as CinderboundWardenKind;
    const known = Object.hasOwn(CINDERBOUND_WARDEN_ASSETS, kind);
    const required = known ? cinderboundWardenActionNames(kind) : [];
    const allowed = known ? cinderboundWardenClipSet(kind) : [];
    // The shatter death and the fractured geometry are one feature: a pack claims
    // both or neither.
    const shatterChunks = receipt?.shatterChunks;
    const claimsShatter = shatterChunks !== undefined;
    const shattering = Array.isArray(receipt?.clips) && receipt.clips.includes(CINDERBOUND_WARDEN_SHATTER_CLIP);
    if (!known || !receipt || receipt.kind !== kind
      || !new RegExp(`^/assets/weapon-lab/wardens/${kind}-[a-z0-9-]+\\.glb$`).test(receipt.url)
      || !Number.isSafeInteger(receipt.bytes) || receipt.bytes <= 0
      || !/^[a-f0-9]{64}$/.test(receipt.sha256) || !/^[a-f0-9]{64}$/.test(receipt.runtimeSourceSha256)
      || !Number.isFinite(receipt.runtimeScale) || receipt.runtimeScale <= 0 || receipt.runtimeScale > 100
      || !Array.isArray(receipt.clips)
      || receipt.clips.some((name) => typeof name !== "string" || !CLIP_NAME.test(name))
      || new Set(receipt.clips).size !== receipt.clips.length
      || required.some((name) => !receipt.clips.includes(name))
      || receipt.clips.some((name) => !allowed.includes(name))
      || claimsShatter !== shattering
      || (claimsShatter && (!Number.isSafeInteger(shatterChunks) || (shatterChunks as number) < 1))) {
      throw new Error(`Invalid reviewed Warden receipt for ${key}`);
    }
    result[kind] = Object.freeze({ ...receipt, clips: Object.freeze([...receipt.clips]) });
  }
  return Object.freeze(result);
}

export function reviewedWardenNote(receipt: ReviewedWardenReceipt): string {
  return `Rebuilt four-view Warden body: ${receipt.clips.length} clips authored on the hand-built game skeleton. `
    + (receipt.shatterChunks === undefined
      ? `No shatter death: this body ships no ${CINDERBOUND_WARDEN_SHATTER_CHUNK_PREFIX}NN pieces, so it dies by DeathCollapse only. `
      : `Both deaths: DeathCollapse plus a ${receipt.shatterChunks}-piece ${CINDERBOUND_WARDEN_SHATTER_CLIP}. `)
    + "The shipped single-view Warden is untouched and remains selectable for comparison. "
    + "Motion intake only; contact, damage and gameplay acceptance are separate.";
}

/**
 * Rebuilt Warden bodies cleared for isolated Motion Forge review.
 *
 * Empty until a composer pack passes its mechanical gates and is installed. Each
 * entry stays absent until that exact export clears review, so an unfinished pack
 * cannot reach the lab by being written to disk.
 *
 * v12 / v7 are the repulsor pass. They must be pinned together with the emission
 * change in breach-v2-warden-effects.ts, because the two halves only work as a
 * pair: the runtime now fires along the PALM NORMAL, and only these packs cock the
 * wrist so that normal points at the target. Pointing this receipt back at v11 / v6
 * while the runtime reads the palm normal would fire the beam ~92-98 degrees off
 * the target, which is worse than the defect the pass exists to fix.
 */
export const REVIEWED_FOURVIEW_WARDEN_RECEIPTS: ReviewedWardenReceipts = prepareReviewedWardenReceipts({
  wayfarer: {
    kind: "wayfarer",
    url: "/assets/weapon-lab/wardens/wayfarer-cinderbound-warden-fourview-v12.glb",
    runtimeSourceSha256: "6653370bbd3f057dce8602de257cdcc60163fd012589bb76ed5983d1d03ca387",
    bytes: 23_369_212,
    sha256: "79b8420120f6227b6a8056f67b1ca9067048f0e63b575617a65878cb0c106dcf",
    runtimeScale: 3.6733054326308605,
    shatterChunks: 22,
    clips: [
      "Idle", "CombatIdle", "HeadLook", "HeavyWalk", "HeavyRun", "TurnLeft", "TurnRight", "HitReact",
      "DeathCollapse", "DeathShatter", "BladeSweep", "CinderSweep", "AshCall", "PalmFire", "SoulTax", "FurnaceShutdown",
    ],
  },
  oathbreaker: {
    kind: "oathbreaker",
    url: "/assets/weapon-lab/wardens/oathbreaker-greater-cinderbound-warden-fourview-v7.glb",
    runtimeSourceSha256: "244cefb9e478c8ce561722e479a2cafce9fb5c91c4ee42477c893ee8f91a5a3d",
    bytes: 21_408_764,
    sha256: "0885b9041e18204a15e34531907b4a8d317f05ff59c085ae397acb7d65aca075",
    runtimeScale: 3.9985279615318867,
    shatterChunks: 22,
    clips: [
      "Idle", "CombatIdle", "HeadLook", "HeavyWalk", "HeavyRun", "TurnLeft", "TurnRight", "HitReact",
      "DeathCollapse", "DeathShatter", "BladeSweep", "CinderSweep", "AshCall", "PalmFire",
    ],
  },
});
