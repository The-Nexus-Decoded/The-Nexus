// Review-only intake. This path must never replace the dungeon asset catalog.
export const REVIEWED_BASE_MOB_URL = "/assets/weapon-lab/mobs/breachling-base-approved-attacks-v1.glb";

export interface ReviewedMobReceipt {
  readonly bytes: number;
  readonly sha256: string;
  readonly runtimeScale: number;
  readonly actions: readonly string[];
}

// Exact continuous-v5 export authorized for isolated Motion Studio review.
// This is a motion intake, not gameplay/contact/projectile acceptance.
export const REVIEWED_BASE_MOB_RECEIPT: ReviewedMobReceipt | null = {
  bytes: 8823468,
  sha256: "1ddbd4e5ac46e9c3b53379d94e27038d1fbfb8faf9b575b5947cf835bed43217",
  runtimeScale: 1.7714769640700978,
  actions: ["BiteAttack", "ClawAttack", "LungeAttack", "TailWhip", "SpitAttack"],
};
