import {
  CINDERBOUND_WARDEN_ASSETS, cinderboundWardenActionNames, type CinderboundWardenKind,
} from "../../game/dungeons/breach-v2-wardens";

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
 * warden runtime enumerates every action name at load and throws on a missing
 * one, so a partial pack cannot be reviewed at all.
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
}
export type ReviewedWardenReceipts = Readonly<Partial<Record<CinderboundWardenKind, ReviewedWardenReceipt>>>;

const CLIP_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;

/** Explicit build-time allowlist. No runtime registration, no catalog mutation. */
export function prepareReviewedWardenReceipts(input: ReviewedWardenReceipts): ReviewedWardenReceipts {
  const result: Partial<Record<CinderboundWardenKind, ReviewedWardenReceipt>> = {};
  for (const [key, receipt] of Object.entries(input)) {
    const kind = key as CinderboundWardenKind;
    const required = Object.hasOwn(CINDERBOUND_WARDEN_ASSETS, kind) ? cinderboundWardenActionNames(kind) : [];
    if (!Object.hasOwn(CINDERBOUND_WARDEN_ASSETS, kind) || !receipt || receipt.kind !== kind
      || !new RegExp(`^/assets/weapon-lab/wardens/${kind}-[a-z0-9-]+\\.glb$`).test(receipt.url)
      || !Number.isSafeInteger(receipt.bytes) || receipt.bytes <= 0
      || !/^[a-f0-9]{64}$/.test(receipt.sha256) || !/^[a-f0-9]{64}$/.test(receipt.runtimeSourceSha256)
      || !Number.isFinite(receipt.runtimeScale) || receipt.runtimeScale <= 0 || receipt.runtimeScale > 100
      || !Array.isArray(receipt.clips)
      || receipt.clips.some((name) => typeof name !== "string" || !CLIP_NAME.test(name))
      || new Set(receipt.clips).size !== receipt.clips.length
      || required.some((name) => !receipt.clips.includes(name))) {
      throw new Error(`Invalid reviewed Warden receipt for ${key}`);
    }
    result[kind] = Object.freeze({ ...receipt, clips: Object.freeze([...receipt.clips]) });
  }
  return Object.freeze(result);
}

export function reviewedWardenNote(receipt: ReviewedWardenReceipt): string {
  return `Rebuilt four-view Warden body: ${receipt.clips.length} clips authored on the hand-built game skeleton. `
    + "The shipped single-view Warden is untouched and remains selectable for comparison. "
    + "Motion intake only; contact, damage and gameplay acceptance are separate.";
}

/**
 * Rebuilt Warden bodies cleared for isolated Motion Forge review.
 *
 * Empty until a composer pack passes its mechanical gates and is installed. Each
 * entry stays absent until that exact export clears review, so an unfinished pack
 * cannot reach the lab by being written to disk.
 */
export const REVIEWED_FOURVIEW_WARDEN_RECEIPTS: ReviewedWardenReceipts = prepareReviewedWardenReceipts({
  wayfarer: {
    kind: "wayfarer",
    url: "/assets/weapon-lab/wardens/wayfarer-cinderbound-warden-fourview-v8.glb",
    runtimeSourceSha256: "6653370bbd3f057dce8602de257cdcc60163fd012589bb76ed5983d1d03ca387",
    bytes: 17_484_284,
    sha256: "3478250e32077a60e69efcf367011089279fc58ca9d336bf0c3609a256e90f60",
    runtimeScale: 3.6733054326308605,
    clips: [
      "Idle", "CombatIdle", "HeadLook", "HeavyWalk", "HeavyRun", "TurnLeft", "TurnRight", "HitReact",
      "DeathCollapse", "BladeSweep", "CinderSweep", "AshCall", "PalmFire", "SoulTax", "FurnaceShutdown",
    ],
  },
});
