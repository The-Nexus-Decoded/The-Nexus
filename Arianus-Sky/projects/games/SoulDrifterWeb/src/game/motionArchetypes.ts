export const MOTION_ARCHETYPE_IDS = [
  "stationary-horizontal-arc",
  "advancing-slash",
  "overhead-chop",
  "thrust",
  "rising-cut",
  "360-cleave",
  "dash-lunge",
  "retreating-counter",
  "shield-bash",
  "staff-sweep",
  "bow-crossbow",
  "casting-channeling",
  "jab-cross",
  "front-kick",
] as const;

export const MOTION_SKILL_IDS = [
  "weapon-strike",
  "siphon-cleave",
  "cinder-guard",
  "recover",
] as const;

/**
 * Shared non-skill motion vocabulary for player characters and compatible NPCs.
 * These are semantic IDs, not vendor clip names. Mixamo or other source clips are
 * acquired once and retargeted locally to satisfy these contracts.
 */
export const CORE_CHARACTER_MOTION_IDS = [
  // Baseline and locomotion.
  "idle-neutral",
  "idle-alert",
  "walk-forward",
  "walk-backward",
  "strafe-left",
  "strafe-right",
  "jog-forward",
  "run-forward",
  "sprint-forward",
  "move-start",
  "move-stop",
  "turn-left-90",
  "turn-right-90",
  "turn-180",
  "crouch-idle",
  "crouch-walk",
  "sneak-walk",

  // Traversal.
  "step-up",
  "step-down",
  "jump-start",
  "jump-loop",
  "land",
  "vault-low",
  "climb-ledge",
  "ladder-up",
  "ladder-down",
  "swim-idle",
  "swim-forward",

  // World and inventory interactions.
  "door-open",
  "door-close",
  "chest-open",
  "chest-close",
  "pickup-ground",
  "pickup-waist",
  "place-item",
  "drop-item",
  "push-heavy",
  "pull-heavy",
  "lever-use",
  "switch-use",
  "read-object",
  "sit-down",
  "sit-idle",
  "stand-up",
  "sleep-down",
  "sleep-idle",
  "wake-up",
  "eat",
  "drink",
  "equip-weapon",
  "unequip-weapon",

  // Conversation and social readability.
  "conversation-idle",
  "conversation-gesture",
  "point",
  "wave",
  "nod",
  "shake-head",
  "kneel",
  "stand-from-kneel",

  // Reactions and life cycle.
  "hit-front",
  "hit-back",
  "hit-left",
  "hit-right",
  "knockdown",
  "get-up",
  "death-front",
  "death-back",
] as const;

/** Minimum animation surface required by the First Breach vertical slice. */
export const VERTICAL_SLICE_REQUIRED_MOTION_IDS = [
  "idle-neutral",
  "idle-alert",
  "walk-forward",
  "run-forward",
  "move-start",
  "move-stop",
  "turn-left-90",
  "turn-right-90",
  "door-open",
  "door-close",
  "chest-open",
  "pickup-ground",
  "place-item",
  "lever-use",
  "read-object",
  "equip-weapon",
  "unequip-weapon",
  "conversation-idle",
  "conversation-gesture",
  "point",
  "nod",
  "hit-front",
  "hit-back",
  "knockdown",
  "get-up",
  "death-front",
] as const satisfies readonly (typeof CORE_CHARACTER_MOTION_IDS[number])[];

export type MotionArchetypeId = typeof MOTION_ARCHETYPE_IDS[number];
export type MotionSkillId = typeof MOTION_SKILL_IDS[number];
export type CoreCharacterMotionId = typeof CORE_CHARACTER_MOTION_IDS[number];
export type WeaponFamily = "unarmed" | "sword" | "axe" | "mace" | "shield" | "staff" | "bow" | "crossbow" | "focus";
export type Grip = "unarmed" | "one-handed" | "two-handed" | "dual-wield";
export type RootPolicy = "in-place" | "authored-displacement" | "target-warped";
export type FacingPolicy = "locked" | "auto-face-target" | "movement-facing";
export type HitShape = "frontal-arc" | "line" | "circle" | "projectile" | "self-area";
export type MotionEventKind = "contact" | "release";
export type Hand = "left" | "right";
export type HandContactTarget = "hilt" | "free";
export type HandIntent = "weapon-control" | "balance-guard" | "ward" | "channel";
export type ActionWeaponState = "hidden" | "sheathed" | "drawn";
export type TorsoIntent = "attack-drive" | "attack-sweep" | "ward-cast" | "recovery-channel";

export interface MotionArchetypeContract {
  skillId: MotionSkillId;
  registryKey: `combat.${string}`;
  id: MotionArchetypeId;
  clipNames: readonly string[];
  weaponFamily: WeaponFamily;
  grip: Grip;
  weaponState: ActionWeaponState;
  torsoIntent: TorsoIntent;
  handContacts: {
    dominant: {
      hand: Hand;
      target: HandContactTarget;
      intent: HandIntent;
      continuity: "continuous";
    };
    support: {
      hand: Hand;
      target: HandContactTarget;
      intent: HandIntent;
      continuity: "continuous" | "phase-specific";
    };
  };
  playbackRate: number;
  blendSeconds: number;
  rootPolicy: RootPolicy;
  displacement: { tiles: number; meters: number };
  facing: FacingPolicy;
  hit: { shape: HitShape; reachTiles: number };
  timing: {
    telegraph: readonly [start: number, end: number];
    event: {
      kind: MotionEventKind;
      at: number;
      /** One marker synchronizes the gameplay result and its VFX/SFX. */
      marker: string;
    };
    recovery: readonly [start: number, end: number];
    cancelWindow: readonly [start: number, end: number];
  };
  interruptibility: {
    telegraph: boolean;
    active: boolean;
    recovery: boolean;
  };
  footContacts: ReadonlyArray<{
    foot: "left" | "right";
    planted: readonly [start: number, end: number];
  }>;
  sockets: {
    vfx: readonly string[];
    sfx: readonly string[];
  };
  styleLayers: {
    race: readonly string[];
    calling: readonly string[];
  };
}

const groundedFeet = [
  { foot: "left", planted: [0, 1] },
  { foot: "right", planted: [0, 1] },
] as const;

/** Beginner one-handed stab: compact guard, point alignment, short drive, balanced recovery. */
export const WEAPON_STRIKE_MOTION: MotionArchetypeContract = {
  skillId: "weapon-strike",
  registryKey: "combat.basic.weapon-strike",
  id: "stationary-horizontal-arc",
  clipNames: ["WeaponStrikeBaseline", "Punch"],
  weaponFamily: "sword",
  grip: "one-handed",
  weaponState: "drawn",
  torsoIntent: "attack-drive",
  handContacts: {
    dominant: { hand: "right", target: "hilt", intent: "weapon-control", continuity: "continuous" },
    support: { hand: "left", target: "free", intent: "balance-guard", continuity: "continuous" },
  },
  playbackRate: 0.65,
  blendSeconds: 0.06,
  rootPolicy: "in-place",
  displacement: { tiles: 0, meters: 0 },
  facing: "auto-face-target",
  hit: { shape: "frontal-arc", reachTiles: 1 },
  timing: {
    telegraph: [0, 0.36],
    event: { kind: "contact", at: 0.82, marker: "weapon-strike.contact" },
    recovery: [0.82, 1],
    cancelWindow: [0.9, 1],
  },
  interruptibility: { telegraph: true, active: false, recovery: true },
  footContacts: groundedFeet,
  sockets: {
    vfx: ["weapon_tip", "weapon_contact"],
    sfx: ["weapon_whoosh", "weapon_contact"],
  },
  styleLayers: { race: [], calling: ["shadowknight"] },
};

/** No-weapon basic: compact rear-hand cross with both feet planted. */
export const UNARMED_PUNCH_MOTION: MotionArchetypeContract = {
  skillId: "weapon-strike",
  registryKey: "combat.basic.unarmed-punch",
  id: "jab-cross",
  clipNames: ["UnarmedPunch"],
  weaponFamily: "unarmed",
  grip: "unarmed",
  weaponState: "hidden",
  torsoIntent: "attack-drive",
  handContacts: {
    dominant: { hand: "right", target: "free", intent: "weapon-control", continuity: "continuous" },
    support: { hand: "left", target: "free", intent: "balance-guard", continuity: "continuous" },
  },
  playbackRate: 1.05,
  blendSeconds: 0.06,
  rootPolicy: "in-place",
  displacement: { tiles: 0, meters: 0 },
  facing: "auto-face-target",
  hit: { shape: "frontal-arc", reachTiles: 1 },
  timing: {
    telegraph: [0, 0.38],
    event: { kind: "contact", at: 0.56, marker: "unarmed-punch.contact" },
    recovery: [0.56, 1],
    cancelWindow: [0.84, 1],
  },
  interruptibility: { telegraph: true, active: false, recovery: true },
  footContacts: groundedFeet,
  sockets: { vfx: ["hand_r", "unarmed_contact"], sfx: ["unarmed_whoosh", "unarmed_contact"] },
  styleLayers: { race: [], calling: [] },
};

/** Alternating no-weapon basic: simple lead-foot snap kick, not an acrobatic finisher. */
export const UNARMED_KICK_MOTION: MotionArchetypeContract = {
  skillId: "weapon-strike",
  registryKey: "combat.basic.unarmed-kick",
  id: "front-kick",
  clipNames: ["UnarmedKick"],
  weaponFamily: "unarmed",
  grip: "unarmed",
  weaponState: "hidden",
  torsoIntent: "attack-drive",
  handContacts: {
    dominant: { hand: "right", target: "free", intent: "balance-guard", continuity: "continuous" },
    support: { hand: "left", target: "free", intent: "balance-guard", continuity: "continuous" },
  },
  playbackRate: 0.96,
  blendSeconds: 0.06,
  rootPolicy: "in-place",
  displacement: { tiles: 0, meters: 0 },
  facing: "auto-face-target",
  hit: { shape: "frontal-arc", reachTiles: 1 },
  timing: {
    telegraph: [0, 0.36],
    event: { kind: "contact", at: 0.54, marker: "unarmed-kick.contact" },
    recovery: [0.54, 1],
    cancelWindow: [0.84, 1],
  },
  interruptibility: { telegraph: true, active: false, recovery: true },
  footContacts: [
    { foot: "left", planted: [0, 1] },
    { foot: "right", planted: [0, 0.24] },
    { foot: "right", planted: [0.78, 1] },
  ],
  sockets: { vfx: ["foot_r", "unarmed_contact"], sfx: ["unarmed_whoosh", "unarmed_contact"] },
  styleLayers: { race: [], calling: [] },
};

export const SIPHON_CLEAVE_MOTION: MotionArchetypeContract = {
  skillId: "siphon-cleave",
  registryKey: "combat.signature.siphon-cleave",
  id: "stationary-horizontal-arc",
  clipNames: ["SiphonCleaveBaseline", "SiphonCleave", "SwordSlash"],
  weaponFamily: "sword",
  grip: "one-handed",
  weaponState: "drawn",
  torsoIntent: "attack-sweep",
  handContacts: {
    dominant: { hand: "right", target: "hilt", intent: "weapon-control", continuity: "continuous" },
    support: { hand: "left", target: "free", intent: "channel", continuity: "continuous" },
  },
  playbackRate: 0.47,
  blendSeconds: 0.07,
  rootPolicy: "in-place",
  displacement: { tiles: 0, meters: 0 },
  facing: "auto-face-target",
  hit: { shape: "frontal-arc", reachTiles: 2 },
  timing: {
    telegraph: [0, 0.88],
    event: { kind: "contact", at: 0.88, marker: "siphon-cleave.contact" },
    recovery: [0.88, 1],
    cancelWindow: [0.94, 1],
  },
  interruptibility: { telegraph: true, active: false, recovery: true },
  footContacts: groundedFeet,
  sockets: {
    vfx: ["weapon_tip", "weapon_contact", "free_hand"],
    sfx: ["weapon_whoosh", "soul_drain"],
  },
  styleLayers: { race: [], calling: ["shadowknight"] },
};

/** Shared hostile melee timing: visible anticipation, one contact marker, then recovery. */
export const ENEMY_MELEE_MOTION: MotionArchetypeContract = {
  skillId: "weapon-strike",
  registryKey: "combat.enemy.melee",
  id: "advancing-slash",
  clipNames: ["SwordSlashOutward", "SwordSlash", "BasicThrust", "Punch"],
  weaponFamily: "sword",
  grip: "one-handed",
  weaponState: "drawn",
  torsoIntent: "attack-drive",
  handContacts: {
    dominant: { hand: "right", target: "hilt", intent: "weapon-control", continuity: "continuous" },
    support: { hand: "left", target: "free", intent: "balance-guard", continuity: "continuous" },
  },
  playbackRate: 0.82,
  blendSeconds: 0.08,
  rootPolicy: "in-place",
  displacement: { tiles: 0, meters: 0 },
  facing: "auto-face-target",
  hit: { shape: "frontal-arc", reachTiles: 1 },
  timing: {
    telegraph: [0, 0.34],
    event: { kind: "contact", at: 0.56, marker: "enemy-melee.contact" },
    recovery: [0.56, 1],
    cancelWindow: [0.88, 1],
  },
  interruptibility: { telegraph: true, active: false, recovery: true },
  footContacts: groundedFeet,
  sockets: { vfx: ["weapon_tip", "weapon_contact"], sfx: ["enemy_whoosh", "enemy_contact"] },
  styleLayers: { race: [], calling: [] },
};

export const CINDER_GUARD_MOTION: MotionArchetypeContract = {
  skillId: "cinder-guard",
  registryKey: "combat.defense.cinder-guard",
  id: "casting-channeling",
  clipNames: ["CastWard", "CinderGuard", "Cast", "Victory"],
  weaponFamily: "sword",
  grip: "one-handed",
  weaponState: "drawn",
  torsoIntent: "ward-cast",
  handContacts: {
    dominant: { hand: "right", target: "hilt", intent: "weapon-control", continuity: "continuous" },
    support: { hand: "left", target: "free", intent: "ward", continuity: "phase-specific" },
  },
  playbackRate: 0.9,
  blendSeconds: 0.08,
  rootPolicy: "in-place",
  displacement: { tiles: 0, meters: 0 },
  facing: "locked",
  hit: { shape: "self-area", reachTiles: 0 },
  timing: {
    telegraph: [0, 0.28],
    event: { kind: "release", at: 0.45, marker: "cinder-guard.release" },
    recovery: [0.72, 1],
    cancelWindow: [0.82, 1],
  },
  interruptibility: { telegraph: true, active: false, recovery: true },
  footContacts: groundedFeet,
  sockets: {
    vfx: ["weapon_guard", "free_hand"],
    sfx: ["ward_release"],
  },
  styleLayers: { race: [], calling: ["shadowknight"] },
};

export const RECOVER_MOTION: MotionArchetypeContract = {
  skillId: "recover",
  registryKey: "combat.utility.recover",
  id: "casting-channeling",
  clipNames: ["CastSummon", "Recover", "PickupGround", "PickUp", "SitDown"],
  weaponFamily: "sword",
  grip: "one-handed",
  weaponState: "sheathed",
  torsoIntent: "recovery-channel",
  handContacts: {
    dominant: { hand: "right", target: "free", intent: "channel", continuity: "continuous" },
    support: { hand: "left", target: "free", intent: "channel", continuity: "phase-specific" },
  },
  playbackRate: 0.9,
  blendSeconds: 0.08,
  rootPolicy: "in-place",
  displacement: { tiles: 0, meters: 0 },
  facing: "locked",
  hit: { shape: "self-area", reachTiles: 0 },
  timing: {
    telegraph: [0, 0.28],
    event: { kind: "release", at: 0.67, marker: "recover.release" },
    recovery: [0.67, 1],
    cancelWindow: [0.86, 1],
  },
  interruptibility: { telegraph: true, active: false, recovery: true },
  footContacts: groundedFeet,
  sockets: {
    vfx: ["sternum", "free_hand"],
    sfx: ["recovery_release"],
  },
  styleLayers: { race: [], calling: [] },
};

export const MOTION_BY_SKILL_ID: Readonly<Record<MotionSkillId, MotionArchetypeContract>> = {
  "weapon-strike": WEAPON_STRIKE_MOTION,
  "siphon-cleave": SIPHON_CLEAVE_MOTION,
  "cinder-guard": CINDER_GUARD_MOTION,
  recover: RECOVER_MOTION,
};

export type WorldInteractionMotionId = "door" | "chest" | "pickup" | "lever" | "soul-well" | "conversation";

export interface WorldInteractionMotionContract {
  clipNames: readonly string[];
  playbackRate: number;
  eventAt: number;
  requiresEmptyHands: true;
}

/** One shared contract keeps every world interaction on the sheath -> act -> redraw path. */
export const WORLD_INTERACTION_MOTIONS: Readonly<Record<WorldInteractionMotionId, WorldInteractionMotionContract>> = {
  door: { clipNames: ["DoorOpenInward", "DoorOpenOutward"], playbackRate: 0.92, eventAt: 0.55, requiresEmptyHands: true },
  chest: { clipNames: ["PickupWaist", "PickupGround"], playbackRate: 0.9, eventAt: 0.58, requiresEmptyHands: true },
  pickup: { clipNames: ["PickupWaist", "PickupGround"], playbackRate: 0.9, eventAt: 0.62, requiresEmptyHands: true },
  lever: { clipNames: ["PullLever", "PickupWaist"], playbackRate: 0.9, eventAt: 0.54, requiresEmptyHands: true },
  "soul-well": { clipNames: ["CastWard", "CastProjectile", "Cast"], playbackRate: 0.86, eventAt: 0.52, requiresEmptyHands: true },
  conversation: { clipNames: ["Idle"], playbackRate: 1, eventAt: 0, requiresEmptyHands: true },
};
