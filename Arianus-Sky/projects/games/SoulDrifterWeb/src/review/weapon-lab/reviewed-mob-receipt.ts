import { BREACHLING_RUNTIME_ASSETS, type BreachlingTier } from "../../game/dungeons/breach-v2-breachlings";

export interface ReviewedMobReceipt {
  readonly variant: BreachlingTier;
  readonly url: string;
  /** Original dungeon asset lineage, not the immediate working-file parent. */
  readonly runtimeSourceSha256: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly runtimeScale: number;
  readonly actions: readonly string[];
  readonly neutralHolds: readonly string[];
}
export type ReviewedMobReceipts = Readonly<Partial<Record<BreachlingTier, ReviewedMobReceipt>>>;

/** Explicit build-time allowlist. No runtime registration or source-catalog mutation. */
export function prepareReviewedMobReceipts(input: ReviewedMobReceipts): ReviewedMobReceipts {
  const result: Partial<Record<BreachlingTier, ReviewedMobReceipt>> = {};
  for (const [key, receipt] of Object.entries(input)) {
    if (!Object.hasOwn(BREACHLING_RUNTIME_ASSETS, key) || !receipt || receipt.variant !== key
      || !new RegExp(`^/assets/weapon-lab/mobs/breachling-${key}-[a-z0-9-]+\\.glb$`).test(receipt.url)
      || !Number.isSafeInteger(receipt.bytes) || receipt.bytes <= 0
      || !/^[a-f0-9]{64}$/.test(receipt.sha256) || !/^[a-f0-9]{64}$/.test(receipt.runtimeSourceSha256)
      || !Number.isFinite(receipt.runtimeScale) || receipt.runtimeScale <= 0 || receipt.runtimeScale > 100
      || !Array.isArray(receipt.actions) || !Array.isArray(receipt.neutralHolds)
      || !receipt.actions.length && !receipt.neutralHolds.length
      || receipt.actions.some((name) => typeof name !== "string" || !/^[A-Za-z][A-Za-z0-9_]*$/.test(name)
        || ["Idle", "CombatIdle"].includes(name))
      || receipt.neutralHolds.some((name) => !["Idle", "CombatIdle"].includes(name))
      || new Set([...receipt.actions, ...receipt.neutralHolds]).size !== receipt.actions.length + receipt.neutralHolds.length) {
      throw new Error(`Invalid reviewed Breachling receipt for ${key}`);
    }
    result[key as BreachlingTier] = Object.freeze({ ...receipt,
      actions: Object.freeze([...receipt.actions]), neutralHolds: Object.freeze([...receipt.neutralHolds]) });
  }
  return Object.freeze(result);
}

export function reviewedMobNote(receipt: ReviewedMobReceipt): string {
  return `Revised motions: ${receipt.actions.join(", ") || "none"}. Approved neutral holds: ${receipt.neutralHolds.join(", ") || "none"}. `
    + "All remaining clips are source, not revised. Motion intake only; gameplay and projectile acceptance are separate.";
}

// Exact continuous-v5 export authorized for isolated Motion Studio review.
// Other variants remain absent until their exact frozen exports clear QA.
export const REVIEWED_MOB_RECEIPTS = prepareReviewedMobReceipts({
  base: {
    variant: "base", url: "/assets/weapon-lab/mobs/breachling-base-approved-attacks-v1.glb",
    runtimeSourceSha256: "00921227fb9a2c3049363c1a8bda35bb8acf20a73811e3ad86c6256bd91b0cc7",
    bytes: 8823468,
    sha256: "1ddbd4e5ac46e9c3b53379d94e27038d1fbfb8faf9b575b5947cf835bed43217",
    runtimeScale: 1.7714769640700978,
    actions: ["BiteAttack", "ClawAttack", "LungeAttack", "TailWhip", "SpitAttack"],
    neutralHolds: ["Idle", "CombatIdle"],
  },
});
// Existing base-specific contact/provenance consumers retain their exact intake.
export const REVIEWED_BASE_MOB_RECEIPT = REVIEWED_MOB_RECEIPTS.base!;
export const REVIEWED_BASE_MOB_URL = REVIEWED_BASE_MOB_RECEIPT.url;
