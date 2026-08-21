import type { CallingId } from "./character";

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
 * Every calling retains a mundane weapon strike. An empty Stability or
 * class-resource pool can never disable it, and martial callings receive a
 * small level-one proficiency bonus appropriate to their starter weapon.
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

const CALLING_BASIC_DAMAGE_BONUS: Readonly<Record<CallingId, number>> = {
  warrior: 3,
  mage: 0,
  priest: 3,
  sharpshooter: 1,
  paladin: 3,
  summoner: 0,
  asura: 1,
  slayer: 3,
  shadowknight: 3,
};

export function basicAttackDamage(might: number, finesse: number, callingId?: CallingId): number {
  const martialBonus = Math.floor(Math.max(0, might - 8) / 4);
  const precisionBonus = Math.floor(Math.max(0, finesse - 10) / 6);
  return BASIC_ATTACK.baseDamage + martialBonus + precisionBonus + (callingId ? CALLING_BASIC_DAMAGE_BONUS[callingId] : 0);
}
