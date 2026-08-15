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

export function basicAttackDamage(might: number, finesse: number): number {
  const martialBonus = Math.floor(Math.max(0, might - 8) / 4);
  const precisionBonus = Math.floor(Math.max(0, finesse - 10) / 6);
  return BASIC_ATTACK.baseDamage + martialBonus + precisionBonus;
}
