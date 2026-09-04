import { BREACHLING_RUNTIME_ASSETS, type BreachlingTier } from "../../game/dungeons/breach-v2-breachlings";
import { COMPOSER_MOB_PACKS, COMPOSER_MOB_PACKS_FOURVIEW } from "./composer-mob-packs";

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

// Exact frozen exports authorized for isolated Motion Forge review.
// Each variant/action remains absent until that exact export clears QA.
const LEGACY_REVIEWED_MOB_RECEIPTS: ReviewedMobReceipts = {
  base: {
    variant: "base", url: "/assets/weapon-lab/mobs/breachling-base-approved-attacks-v1.glb",
    runtimeSourceSha256: "00921227fb9a2c3049363c1a8bda35bb8acf20a73811e3ad86c6256bd91b0cc7",
    bytes: 8823468,
    sha256: "1ddbd4e5ac46e9c3b53379d94e27038d1fbfb8faf9b575b5947cf835bed43217",
    runtimeScale: 1.7714769640700978,
    actions: ["BiteAttack", "ClawAttack", "LungeAttack", "TailWhip", "SpitAttack"],
    neutralHolds: ["Idle", "CombatIdle"],
  },
  oathbound: {
    variant: "oathbound", url: "/assets/weapon-lab/mobs/breachling-oathbound-approved-lunge-spit-claw-bite-v1.glb",
    runtimeSourceSha256: "077e130cd8a9fa0a755aed1c1efe1f268f8ef08470762adead1b7bf0e2948939",
    bytes: 11473984,
    sha256: "b4039fcd931dcb2dadd48a2a9ee6eea2b123d3c1ddd0a85cc439cacc2f777747",
    runtimeScale: 2.05656927752596,
    actions: ["LungeAttack", "SpitAttack", "ClawAttack", "BiteAttack"],
    neutralHolds: ["Idle", "CombatIdle"],
  },
  stalker: {
    variant: "stalker", url: "/assets/weapon-lab/mobs/breachling-stalker-approved-attacks-v1.glb",
    runtimeSourceSha256: "1f61df8716b60dd376959dbff1295c708f770d3601cf9781263d1996f808a641",
    bytes: 9764884,
    sha256: "068d46cc64c17b7480870f8fa836602a2042ae32b7e6c338747f923d5efdca42",
    runtimeScale: 2.253428958684859,
    actions: ["BiteAttack", "ClawAttack", "LungeAttack", "TailWhip", "SpitAttack"],
    neutralHolds: [],
  },
  ravager: {
    variant: "ravager", url: "/assets/weapon-lab/mobs/breachling-ravager-approved-attacks-v1.glb",
    runtimeSourceSha256: "cd8fa4f5daf6f789e80322fad2ed7df15cb7b6dcea0dec19c0d869478f08e22c",
    bytes: 8606112,
    sha256: "11f567a98d810001d262315bb97f7ec56789f502c2fe5e4fd6732966e147d97d",
    runtimeScale: 1.6278343683021053,
    actions: ["BiteAttack", "ClawAttack", "LungeAttack", "TailWhip", "SpitAttack"],
    neutralHolds: [],
  },
};
// Motion-composer packs (issue-458-motion-composer-v1) replace the earlier
// per-variant receipts where present. They are review-only intake: exact
// bytes, every clip revised, neutral holds recalibrated (14 deg rest gape,
// anatomical elbow/knee poles). Owner sign-off and dungeon promotion are separate.
const COMPOSER_REVIEWED_MOB_RECEIPTS: ReviewedMobReceipts = Object.fromEntries(
  Object.entries(COMPOSER_MOB_PACKS).map(([variant, pack]) => [variant, {
    variant: pack!.variant, url: pack!.url, runtimeSourceSha256: pack!.runtimeSourceSha256, bytes: pack!.bytes,
    sha256: pack!.sha256, runtimeScale: pack!.runtimeScale, actions: [...pack!.actions], neutralHolds: [...pack!.neutralHolds],
  }]),
);
export const REVIEWED_MOB_RECEIPTS = prepareReviewedMobReceipts({ ...LEGACY_REVIEWED_MOB_RECEIPTS, ...COMPOSER_REVIEWED_MOB_RECEIPTS });
// Four-view remodel bodies (Tripo multi-view meshes, Tripo auto-rig converted to the
// canonical skeleton). Separate review entries keyed by the same variants; they share
// the dungeon lineage of their legacy variant and never replace it without owner sign-off.
export const REVIEWED_FOURVIEW_MOB_RECEIPTS: ReviewedMobReceipts = prepareReviewedMobReceipts(Object.fromEntries(
  Object.entries(COMPOSER_MOB_PACKS_FOURVIEW).map(([variant, pack]) => [variant, {
    variant: pack!.variant, url: pack!.url, runtimeSourceSha256: pack!.runtimeSourceSha256, bytes: pack!.bytes,
    sha256: pack!.sha256, runtimeScale: pack!.runtimeScale, actions: [...pack!.actions], neutralHolds: [...pack!.neutralHolds],
  }]),
));
// Existing base-specific contact/provenance consumers retain their exact intake.
export const REVIEWED_BASE_MOB_RECEIPT = REVIEWED_MOB_RECEIPTS.base!;
export const REVIEWED_BASE_MOB_URL = REVIEWED_BASE_MOB_RECEIPT.url;
