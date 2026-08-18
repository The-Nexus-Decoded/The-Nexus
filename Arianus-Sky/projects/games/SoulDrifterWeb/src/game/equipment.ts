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
  weaponFamily: WeaponFamily;
  offhand?: string;
}

export type EquipmentSlot = "head" | "body" | "legs" | "feet" | "mainHand" | "offHand";
export type InventoryItemKind = "equipment" | "consumable" | "quest" | "material";

export const STARTER_BACKPACK_SLOTS = 30;

export interface BackpackCapacity {
  baseSlots: number;
  earnedSlots: number;
  entitlementSlots: number;
}

export interface InventoryState {
  items: InventoryItem[];
  capacity: BackpackCapacity;
}

export interface InventoryItem {
  id: string;
  name: string;
  kind: InventoryItemKind;
  slot?: EquipmentSlot;
  equipped: boolean;
  weaponFamily?: WeaponFamily;
  durability?: number;
  maxDurability?: number;
  quantity?: number;
  stackLimit?: number;
  description: string;
}

export interface InventoryAddResult {
  added: boolean;
  stacked: boolean;
  reason?: "duplicate" | "full" | "stack-full";
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

export function createStarterBackpackCapacity(): BackpackCapacity {
  return { baseSlots: STARTER_BACKPACK_SLOTS, earnedSlots: 0, entitlementSlots: 0 };
}

export function totalBackpackSlots(capacity: BackpackCapacity): number {
  return Math.max(0, capacity.baseSlots + capacity.earnedSlots + capacity.entitlementSlots);
}

export function backpackItems(items: readonly InventoryItem[]): readonly InventoryItem[] {
  return items.filter((item) => !item.equipped);
}

export function backpackSlotsUsed(items: readonly InventoryItem[]): number {
  return backpackItems(items).length;
}

export function canMoveToBackpack(items: readonly InventoryItem[], capacity: BackpackCapacity): boolean {
  return backpackSlotsUsed(items) < totalBackpackSlots(capacity);
}

export function addInventoryItem(
  items: InventoryItem[],
  item: Omit<InventoryItem, "equipped">,
  capacity: BackpackCapacity,
): InventoryAddResult {
  const existing = items.find((candidate) => candidate.id === item.id);
  if (existing) {
    const currentQuantity = existing.quantity ?? 1;
    const incomingQuantity = item.quantity ?? 1;
    const stackLimit = existing.stackLimit ?? item.stackLimit ?? 1;
    if (stackLimit <= 1) return { added: false, stacked: false, reason: "duplicate" };
    if (currentQuantity + incomingQuantity > stackLimit) return { added: false, stacked: false, reason: "stack-full" };
    existing.quantity = currentQuantity + incomingQuantity;
    existing.stackLimit = stackLimit;
    return { added: true, stacked: true };
  }
  if (!canMoveToBackpack(items, capacity)) return { added: false, stacked: false, reason: "full" };
  items.push({ ...item, quantity: item.quantity ?? 1, equipped: false });
  return { added: true, stacked: false };
}

export const STARTER_LOADOUTS: Readonly<Record<CallingId, StarterLoadout>> = {
  warrior: { outfit: COMMON_STARTER_OUTFIT, weapon: "Plain iron longsword", weaponFamily: "sword" },
  mage: { outfit: COMMON_STARTER_OUTFIT, weapon: "Ashwood practice staff", weaponFamily: "staff" },
  priest: { outfit: COMMON_STARTER_OUTFIT, weapon: "Plain wooden mace", weaponFamily: "hammer" },
  sharpshooter: { outfit: COMMON_STARTER_OUTFIT, weapon: "Rough shortbow", weaponFamily: "bow" },
  paladin: { outfit: COMMON_STARTER_OUTFIT, weapon: "Plain iron shortsword", weaponFamily: "sword", offhand: "Battered wooden shield" },
  summoner: { outfit: COMMON_STARTER_OUTFIT, weapon: "Unadorned binding rod", weaponFamily: "focus" },
  asura: { outfit: COMMON_STARTER_OUTFIT, weapon: "Plain ritual knife", weaponFamily: "dagger" },
  slayer: { outfit: COMMON_STARTER_OUTFIT, weapon: "Pair of worn daggers", weaponFamily: "dagger" },
  shadowknight: { outfit: COMMON_STARTER_OUTFIT, weapon: "Battered iron longsword", weaponFamily: "sword" },
};

export function createStarterInventory(callingId: CallingId): InventoryItem[] {
  const loadout = starterLoadoutByCallingId(callingId);
  const items: InventoryItem[] = [
    {
      id: "starter-body",
      name: "Worn Soul-Well tunic",
      kind: "equipment",
      slot: "body",
      equipped: true,
      durability: 24,
      maxDurability: 24,
      description: "Plain C-tier cloth returned with the body. No heroic enchantment.",
    },
    {
      id: "starter-legs",
      name: "Worn Soul-Well trousers",
      kind: "equipment",
      slot: "legs",
      equipped: true,
      durability: 22,
      maxDurability: 22,
      description: "Patched starter trousers suitable for the First Breach.",
    },
    {
      id: "starter-feet",
      name: "Scuffed leather boots",
      kind: "equipment",
      slot: "feet",
      equipped: true,
      durability: 26,
      maxDurability: 26,
      description: "Basic boots with enough grip for broken Soulwell stone.",
    },
    {
      id: "starter-weapon",
      name: loadout.weapon,
      kind: "equipment",
      slot: "mainHand",
      equipped: true,
      weaponFamily: loadout.weaponFamily,
      durability: 40,
      maxDurability: 40,
      description: "The calling's basic weapon. Mundane, reliable, and equipped from awakening.",
    },
  ];
  if (loadout.offhand) {
    items.push({
      id: "starter-offhand",
      name: loadout.offhand,
      kind: "equipment",
      slot: "offHand",
      equipped: true,
      durability: 32,
      maxDurability: 32,
      description: "A basic off-hand implement with no magical properties.",
    });
  }
  return items;
}

export function equippedItem(items: readonly InventoryItem[], slot: EquipmentSlot): InventoryItem | undefined {
  return items.find((item) => item.slot === slot && item.equipped);
}

export function equippedUsableWeapon(items: readonly InventoryItem[]): InventoryItem | undefined {
  const weapon = equippedItem(items, "mainHand");
  if (!weapon?.weaponFamily) return undefined;
  if (weapon.maxDurability !== undefined && (weapon.durability ?? 0) <= 0) return undefined;
  return weapon;
}

export function setItemEquipped(items: InventoryItem[], itemId: string, equipped: boolean): InventoryItem | undefined {
  const item = items.find((candidate) => candidate.id === itemId);
  if (!item?.slot) return undefined;
  if (equipped) {
    items.forEach((candidate) => {
      if (candidate.slot === item.slot) candidate.equipped = false;
    });
  }
  item.equipped = equipped;
  return item;
}

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
