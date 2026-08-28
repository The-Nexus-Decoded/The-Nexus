import type { CallingId } from "./character";

export const STARTER_RECOVERY_CHARGES = 4;
export const BOSS_CHECKPOINT_RECOVERY_CHARGES = 4;

export function recoveryChargesAtBossCheckpoint(currentCharges: number): number {
  return Math.max(currentCharges, BOSS_CHECKPOINT_RECOVERY_CHARGES);
}

export interface RecoveryPool {
  hp: number;
  maxHp: number;
  stability: number;
  maxStability: number;
  resource: number;
}

export interface RecoveryResult extends RecoveryPool {
  healed: number;
  stabilityRestored: number;
  resourceRestored: number;
}

const REST_HEAL_FRACTION: Readonly<Record<CallingId, number>> = {
  warrior: 0.14,
  mage: 0.1,
  priest: 0.2,
  sharpshooter: 0.11,
  paladin: 0.16,
  summoner: 0.1,
  asura: 0.11,
  slayer: 0.12,
  shadowknight: 0.14,
};

export function recoverWhileSafe(callingId: CallingId, pool: RecoveryPool): RecoveryResult {
  const healed = Math.min(pool.maxHp - pool.hp, Math.max(2, Math.ceil(pool.maxHp * REST_HEAL_FRACTION[callingId])));
  const stabilityRestored = Math.min(pool.maxStability - pool.stability, 24);
  const resourceRestored = Math.min(100 - pool.resource, 18);
  return {
    hp: pool.hp + healed,
    maxHp: pool.maxHp,
    stability: pool.stability + stabilityRestored,
    maxStability: pool.maxStability,
    resource: pool.resource + resourceRestored,
    healed,
    stabilityRestored,
    resourceRestored,
  };
}

export function priestMendingWardHealing(hp: number, maxHp: number): number {
  return Math.min(maxHp - hp, Math.max(3, Math.ceil(maxHp * 0.18)));
}
