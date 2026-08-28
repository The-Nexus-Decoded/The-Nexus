import type { CallingId } from "./character";
import type { WeaponFamily as EquipmentWeaponFamily } from "./equipment";
import {
  WEAPON_STRIKE_MOTION,
  type Grip,
  type MotionArchetypeContract,
  type MotionArchetypeId,
  type WeaponFamily as MotionWeaponFamily,
} from "./motionArchetypes";

export interface CallingCombatContract {
  callingId: CallingId;
  weaponFamily: EquipmentWeaponFamily;
  basicName: string;
  basicRange: number;
  grip: Grip;
  offhand: "none" | "shield" | "second-weapon";
  basicMotion: MotionArchetypeContract;
  signatureClipNames: readonly string[];
  defenseClipNames: readonly string[];
  drawClipNames: readonly string[];
  sheatheClipNames: readonly string[];
}

interface CallingCombatDefinition {
  weaponFamily: EquipmentWeaponFamily;
  basicName: string;
  basicRange: number;
  grip: Grip;
  offhand: CallingCombatContract["offhand"];
  motionFamily: MotionWeaponFamily;
  motionId: MotionArchetypeId;
  basicClipNames: readonly string[];
  signatureClipNames: readonly string[];
  defenseClipNames: readonly string[];
  drawClipNames?: readonly string[];
  sheatheClipNames?: readonly string[];
}

const DEFINITIONS: Readonly<Record<CallingId, CallingCombatDefinition>> = {
  warrior: {
    weaponFamily: "sword",
    basicName: "Longsword Strike",
    basicRange: 1,
    grip: "one-handed",
    offhand: "none",
    motionFamily: "sword",
    motionId: "stationary-horizontal-arc",
    basicClipNames: ["WeaponStrikeBaseline", "SwordSlash", "BasicThrust"],
    signatureClipNames: ["SwordComboMixamo", "SwordSlashOutward", "SwordSlash"],
    defenseClipNames: ["CastWard", "Victory"],
  },
  mage: {
    weaponFamily: "staff",
    basicName: "Staff Sweep",
    basicRange: 1,
    grip: "two-handed",
    offhand: "none",
    motionFamily: "staff",
    motionId: "staff-sweep",
    basicClipNames: ["StaffSweep", "SwordSlashOutward", "WeaponStrikeBaseline"],
    signatureClipNames: ["CastProjectile", "CastArea", "Cast"],
    defenseClipNames: ["CastWard", "CastArea", "Cast"],
  },
  priest: {
    weaponFamily: "hammer",
    basicName: "Mace Strike",
    basicRange: 1,
    grip: "one-handed",
    offhand: "none",
    motionFamily: "mace",
    motionId: "overhead-chop",
    basicClipNames: ["OverheadChop", "SwordSlashOutward", "WeaponStrikeBaseline"],
    signatureClipNames: ["CastProjectile", "CastWard", "Cast"],
    defenseClipNames: ["CastWard", "CastSummon", "Cast"],
  },
  sharpshooter: {
    weaponFamily: "bow",
    basicName: "Shortbow Shot",
    basicRange: 5,
    grip: "two-handed",
    offhand: "none",
    motionFamily: "bow",
    motionId: "bow-crossbow",
    basicClipNames: ["Shoot_OneHanded", "ShootOneHanded", "CastProjectile"],
    signatureClipNames: ["Shoot_OneHanded", "ShootOneHanded", "CastProjectile"],
    defenseClipNames: ["DodgeBack", "CastWard", "Victory"],
    drawClipNames: [],
    sheatheClipNames: [],
  },
  paladin: {
    weaponFamily: "sword",
    basicName: "Sword-and-Shield Strike",
    basicRange: 1,
    grip: "one-handed",
    offhand: "shield",
    motionFamily: "sword",
    motionId: "shield-bash",
    basicClipNames: ["SwordShieldSlashCandidate", "WeaponStrikeBaseline", "SwordSlash"],
    signatureClipNames: ["OverheadChop", "SwordSlashOutward", "CastProjectile"],
    defenseClipNames: ["CastWard", "Victory"],
  },
  summoner: {
    weaponFamily: "focus",
    basicName: "Binding Rod Bolt",
    basicRange: 4,
    grip: "one-handed",
    offhand: "none",
    motionFamily: "focus",
    motionId: "casting-channeling",
    basicClipNames: ["CastProjectile", "Shoot_OneHanded", "Cast"],
    signatureClipNames: ["CastSummon", "CastArea", "Cast"],
    defenseClipNames: ["CastWard", "CastSummon", "Cast"],
  },
  asura: {
    weaponFamily: "dagger",
    basicName: "Ritual Knife Thrust",
    basicRange: 1,
    grip: "one-handed",
    offhand: "none",
    motionFamily: "sword",
    motionId: "thrust",
    basicClipNames: ["BasicThrust", "WeaponStrikeBaseline", "Punch"],
    signatureClipNames: ["CastProjectile", "CastArea", "Cast"],
    defenseClipNames: ["CastWard", "CastArea", "Cast"],
  },
  slayer: {
    weaponFamily: "dagger",
    basicName: "Twin Dagger Cut",
    basicRange: 1,
    grip: "dual-wield",
    offhand: "second-weapon",
    motionFamily: "sword",
    motionId: "advancing-slash",
    basicClipNames: ["SwordComboMixamo", "SwordSlashInward", "WeaponStrikeBaseline"],
    signatureClipNames: ["SwordComboMixamo", "SwordSlashInward", "BasicThrust"],
    defenseClipNames: ["DodgeBack", "CastWard", "Victory"],
  },
  shadowknight: {
    weaponFamily: "sword",
    basicName: "Longsword Strike",
    basicRange: 1,
    grip: "one-handed",
    offhand: "none",
    motionFamily: "sword",
    motionId: "stationary-horizontal-arc",
    basicClipNames: ["WeaponStrikeBaseline", "SwordSlash", "BasicThrust"],
    signatureClipNames: ["SiphonCleaveBaseline", "SiphonCleave", "SwordSlash"],
    defenseClipNames: ["CastWard", "CinderGuard", "Cast"],
  },
};

function buildBasicMotion(callingId: CallingId, definition: CallingCombatDefinition): MotionArchetypeContract {
  const ranged = definition.basicRange > 1;
  return {
    ...WEAPON_STRIKE_MOTION,
    registryKey: `combat.basic.${callingId}`,
    id: definition.motionId,
    clipNames: definition.basicClipNames,
    weaponFamily: definition.motionFamily,
    grip: definition.grip,
    torsoIntent: ranged ? "ward-cast" : "attack-drive",
    handContacts: {
      dominant: { ...WEAPON_STRIKE_MOTION.handContacts.dominant },
      support: {
        ...WEAPON_STRIKE_MOTION.handContacts.support,
        target: definition.grip === "two-handed" ? "hilt" : "free",
        intent: ranged ? "channel" : "balance-guard",
      },
    },
    hit: { shape: ranged ? "projectile" : "frontal-arc", reachTiles: definition.basicRange },
    timing: {
      ...WEAPON_STRIKE_MOTION.timing,
      event: {
        kind: ranged ? "release" : "contact",
        at: ranged ? 0.62 : WEAPON_STRIKE_MOTION.timing.event.at,
        marker: `${callingId}-basic.${ranged ? "release" : "contact"}`,
      },
      recovery: ranged ? [0.62, 1] : WEAPON_STRIKE_MOTION.timing.recovery,
    },
    sockets: ranged
      ? { vfx: ["weapon_tip", "projectile_release"], sfx: ["weapon_release", "projectile_contact"] }
      : WEAPON_STRIKE_MOTION.sockets,
    styleLayers: { race: [], calling: [callingId] },
  };
}

export const CALLING_COMBAT_CONTRACTS: Readonly<Record<CallingId, CallingCombatContract>> = Object.fromEntries(
  Object.entries(DEFINITIONS).map(([callingId, definition]) => [
    callingId,
    {
      callingId: callingId as CallingId,
      ...definition,
      basicMotion: buildBasicMotion(callingId as CallingId, definition),
      drawClipNames: definition.drawClipNames ?? ["DrawSword"],
      sheatheClipNames: definition.sheatheClipNames ?? ["SheatheSword"],
    },
  ]),
) as unknown as Readonly<Record<CallingId, CallingCombatContract>>;

export function callingCombatContract(callingId: CallingId): CallingCombatContract {
  return CALLING_COMBAT_CONTRACTS[callingId];
}
