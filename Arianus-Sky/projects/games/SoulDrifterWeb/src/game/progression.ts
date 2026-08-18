/**
 * Character progression: experience, levels, and level-up growth.
 *
 * The Heartvale outdoor zone (Zone 2) is budgeted so a player who completes
 * the quest chain plus its required kills arrives at roughly level 10, which
 * is the intended band for the Lockroot Vaults follow-up. Multiplayer note:
 * XP is awarded per contributing player; group scaling lives in quests.ts.
 */

import type { Stats } from "./character";

export const MAX_ZONE_LEVEL = 10;

export interface ProgressionState {
  level: number;
  /** XP accumulated within the current level. */
  xp: number;
  /** Lifetime XP, for analytics and quest budgeting checks. */
  totalXp: number;
  unspentStatPoints: number;
}

export function createProgression(): ProgressionState {
  return { level: 1, xp: 0, totalXp: 0, unspentStatPoints: 0 };
}

/** XP required to go from `level` to `level + 1`. */
export function xpForNextLevel(level: number): number {
  if (level < 1) throw new Error(`Level must be >= 1; received ${level}.`);
  return 80 + level * level * 20;
}

/** Cumulative XP required to reach `level` from level 1. */
export function xpToReachLevel(level: number): number {
  let total = 0;
  for (let current = 1; current < level; current += 1) total += xpForNextLevel(current);
  return total;
}

/** Monster XP by monster level; elites and zone bosses multiply this. */
export function monsterXp(monsterLevel: number, tier: "normal" | "elite" | "boss" = "normal"): number {
  const base = 12 + monsterLevel * 6;
  const multiplier = tier === "boss" ? 8 : tier === "elite" ? 3 : 1;
  return base * multiplier;
}

export interface LevelUpResult {
  state: ProgressionState;
  levelsGained: number;
}

/** Adds XP and applies as many level-ups as the award crosses. */
export function awardXp(state: ProgressionState, amount: number): LevelUpResult {
  if (amount < 0) throw new Error(`XP awards must be non-negative; received ${amount}.`);
  const next: ProgressionState = {
    ...state,
    xp: state.xp + Math.round(amount),
    totalXp: state.totalXp + Math.round(amount),
  };
  let levelsGained = 0;
  while (next.xp >= xpForNextLevel(next.level)) {
    next.xp -= xpForNextLevel(next.level);
    next.level += 1;
    next.unspentStatPoints += 2;
    levelsGained += 1;
  }
  return { state: next, levelsGained };
}

/**
 * Derived combat growth from leveling. Leveling never rewrites the character
 * sheet's base stats — it adds a level bonus layer on top, keeping the
 * creation-time identity (race/calling/memory answers) intact.
 */
export function levelStatBonus(level: number): Partial<Stats> {
  const steps = Math.max(0, level - 1);
  return {
    vitality: Math.floor(steps / 2),
    might: Math.floor(steps / 3),
    resonance: Math.floor(steps / 3),
  };
}

export function maxHpAtLevel(baseMaxHp: number, level: number): number {
  return baseMaxHp + Math.max(0, level - 1) * 3;
}

/**
 * Group XP: every contributing member gets full personal XP with a small
 * fellowship bonus, so grouping is never punished and slightly rewarded —
 * the intended way lower-level players tackle elite camps and zone bosses.
 */
export function groupXpShare(personalXp: number, partySize: number): number {
  const size = Math.max(1, Math.min(5, Math.floor(partySize)));
  return Math.round(personalXp * (1 + 0.08 * (size - 1)));
}
