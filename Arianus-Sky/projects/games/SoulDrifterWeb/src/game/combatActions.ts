import { MINIMUM_BOW_RANGE_METERS, bowRangeDecision, type BowRangeDecision } from "./archery/archeryActions";
import type { WeaponFamily } from "./equipment";

export interface CombatActionDefinition {
  id: "basic";
  name: string;
  range: number;
  baseDamage: number;
  cooldownMs: number;
  stabilityCost: number;
  classResourceDelta: number;
}

/**
 * Every calling retains a mundane weapon strike. It is weaker than a class
 * signature, but an empty Stability or class-resource pool can never disable it.
 */
export const BASIC_ATTACK: CombatActionDefinition = {
  id: "basic",
  name: "Weapon Strike",
  range: 1,
  baseDamage: 6,
  cooldownMs: 720,
  stabilityCost: 0,
  classResourceDelta: 0,
};

export interface WeaponAttackProfile {
  minimumRangeMeters: number;
  maximumRangeMeters: number;
  closeRangeDecision: BowRangeDecision | "melee-strike";
}

const MELEE_ATTACK_PROFILE: WeaponAttackProfile = {
  minimumRangeMeters: 0,
  maximumRangeMeters: BASIC_ATTACK.range,
  closeRangeDecision: "melee-strike",
};

const BOW_ATTACK_PROFILE: WeaponAttackProfile = {
  minimumRangeMeters: MINIMUM_BOW_RANGE_METERS,
  maximumRangeMeters: 8,
  closeRangeDecision: "bow-strike",
};

export function basicAttackProfileForWeapon(family: WeaponFamily): WeaponAttackProfile {
  return family === "bow" ? { ...BOW_ATTACK_PROFILE } : { ...MELEE_ATTACK_PROFILE };
}

export function basicAttackDecision(family: WeaponFamily, targetDistanceMeters: number): BowRangeDecision | "melee-strike" {
  return family === "bow" ? bowRangeDecision(targetDistanceMeters) : "melee-strike";
}

export function basicAttackDamage(might: number, finesse: number): number {
  const martialBonus = Math.floor(Math.max(0, might - 8) / 4);
  const precisionBonus = Math.floor(Math.max(0, finesse - 10) / 6);
  return BASIC_ATTACK.baseDamage + martialBonus + precisionBonus;
}
