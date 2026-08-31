// Review-only intake. This path must never replace the dungeon asset catalog.
export const REVIEWED_BASE_MOB_URL = "/assets/weapon-lab/mobs/breachling-base-approved-attacks-v1.glb";

export interface ReviewedMobReceipt {
  readonly bytes: number;
  readonly sha256: string;
  readonly runtimeScale: number;
  readonly actions: readonly string[];
}

// Inactive until the actual continuous export has passed its intake and the
// owner-authorized review asset is present. Never invent a pending export hash.
export const REVIEWED_BASE_MOB_RECEIPT: ReviewedMobReceipt | null = null;
