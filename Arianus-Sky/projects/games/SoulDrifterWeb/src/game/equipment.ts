import type { CallingId } from "./character";

export type WeaponFamily = "sword" | "axe" | "hammer" | "staff" | "bow" | "dagger" | "spear" | "focus";
export type WeaponTraining = "untrained" | "trained" | "specialized";
export type WeaponStat = "damage" | "power" | "fire" | "holyPower" | "speed" | "stability" | "focus";

export interface WeaponModifier {
  stat: WeaponStat;
  amount: number;
  callingIds?: readonly CallingId[];
  description: string;
}

export interface WeaponSpellGrant {
  skillId: string;
  name: string;
  callingIds: readonly CallingId[];
}

export interface WeaponDefinition {
  id: string;
  name: string;
  family: WeaponFamily;
  baseDamage: number;
  modifiers: readonly WeaponModifier[];
  spellGrants?: readonly WeaponSpellGrant[];
}

export interface StarterLoadout {
  outfit: "Worn Soul-Well tunic, pants, belt, and boots";
  weapon: string;
  offhand?: string;
}

export interface ResolvedWeaponUse {
  canEquip: true;
  training: WeaponTraining;
  physicalDamage: number;
  activeModifiers: readonly WeaponModifier[];
  inactiveModifiers: ReadonlyArray<WeaponModifier & { reason: string }>;
  availableSkills: readonly string[];
  grantedSpells: readonly WeaponSpellGrant[];
  dormantSpells: ReadonlyArray<WeaponSpellGrant & { reason: string }>;
}

export const COMMON_STARTER_OUTFIT: StarterLoadout["outfit"] = "Worn Soul-Well tunic, pants, belt, and boots";

export const STARTER_LOADOUTS: Readonly<Record<CallingId, StarterLoadout>> = {
  warrior: { outfit: COMMON_STARTER_OUTFIT, weapon: "Plain iron longsword" },
  mage: { outfit: COMMON_STARTER_OUTFIT, weapon: "Ashwood practice staff" },
  priest: { outfit: COMMON_STARTER_OUTFIT, weapon: "Plain wooden mace" },
  sharpshooter: { outfit: COMMON_STARTER_OUTFIT, weapon: "Rough shortbow" },
  paladin: { outfit: COMMON_STARTER_OUTFIT, weapon: "Plain iron shortsword", offhand: "Battered wooden shield" },
  summoner: { outfit: COMMON_STARTER_OUTFIT, weapon: "Unadorned binding rod" },
  asura: { outfit: COMMON_STARTER_OUTFIT, weapon: "Plain ritual knife" },
  slayer: { outfit: COMMON_STARTER_OUTFIT, weapon: "Pair of worn daggers" },
  shadowknight: { outfit: COMMON_STARTER_OUTFIT, weapon: "Battered iron longsword" },
};

export const WEAPON_TRAINING: Readonly<Record<CallingId, Readonly<Partial<Record<WeaponFamily, WeaponTraining>>>>> = {
  warrior: { sword: "specialized", axe: "trained", hammer: "trained", spear: "trained", bow: "trained" },
  mage: { staff: "specialized", focus: "trained", dagger: "trained" },
  priest: { hammer: "trained", staff: "trained", focus: "trained" },
  sharpshooter: { bow: "specialized", dagger: "trained", sword: "trained" },
  paladin: { sword: "specialized", hammer: "trained", spear: "trained" },
  summoner: { staff: "trained", focus: "specialized", dagger: "trained" },
  asura: { dagger: "trained", focus: "specialized", staff: "trained" },
  slayer: { dagger: "specialized", sword: "trained", bow: "trained" },
  shadowknight: { sword: "specialized", axe: "trained", hammer: "trained", staff: "trained" },
};

export const WEAPON_EXAMPLES: readonly WeaponDefinition[] = [
  {
    id: "basic-fire-staff",
    name: "Basic Fire Staff",
    family: "staff",
    baseDamage: 5,
    modifiers: [
      { stat: "power", amount: 10, callingIds: ["mage"], description: "+10 spell power for Mages" },
      { stat: "fire", amount: 20, callingIds: ["mage"], description: "+20 Fire affinity for Mages" },
    ],
    spellGrants: [
      { skillId: "kindle-lance", name: "Kindle Lance", callingIds: ["mage"] },
    ],
  },
  {
    id: "sword-of-the-heavens",
    name: "Sword of the Heavens",
    family: "sword",
    baseDamage: 20,
    modifiers: [
      { stat: "holyPower", amount: 30, callingIds: ["paladin"], description: "+30 Holy Power for Paladins" },
      { stat: "speed", amount: 5, callingIds: ["paladin", "shadowknight", "warrior"], description: "+5 Speed for trained heavy sword callings" },
    ],
  },
] as const;

const TRAINING_DAMAGE_MULTIPLIER: Readonly<Record<WeaponTraining, number>> = {
  untrained: 0.7,
  trained: 1,
  specialized: 1.1,
};

export function weaponTrainingFor(callingId: CallingId, family: WeaponFamily): WeaponTraining {
  return WEAPON_TRAINING[callingId][family] ?? "untrained";
}

export function starterLoadoutByCallingId(callingId: CallingId): StarterLoadout {
  return STARTER_LOADOUTS[callingId];
}

export function resolveWeaponUse(
  weapon: WeaponDefinition,
  callingId: CallingId,
  learnedWeaponSkills: readonly string[] = [],
): ResolvedWeaponUse {
  const training = weaponTrainingFor(callingId, weapon.family);
  const activeModifiers = weapon.modifiers.filter((modifier) => !modifier.callingIds || modifier.callingIds.includes(callingId));
  const inactiveModifiers = weapon.modifiers
    .filter((modifier) => modifier.callingIds && !modifier.callingIds.includes(callingId))
    .map((modifier) => ({ ...modifier, reason: `Dormant for ${callingId}; the weapon remains usable as a ${weapon.family}.` }));
  const grantedSpells = (weapon.spellGrants ?? []).filter((grant) => grant.callingIds.includes(callingId));
  const dormantSpells = (weapon.spellGrants ?? [])
    .filter((grant) => !grant.callingIds.includes(callingId))
    .map((grant) => ({ ...grant, reason: `The ${grant.name} channel does not answer this calling.` }));

  return {
    canEquip: true,
    training,
    physicalDamage: Math.max(1, Math.round(weapon.baseDamage * TRAINING_DAMAGE_MULTIPLIER[training])),
    activeModifiers,
    inactiveModifiers,
    availableSkills: [...new Set(learnedWeaponSkills)],
    grantedSpells,
    dormantSpells,
  };
}
