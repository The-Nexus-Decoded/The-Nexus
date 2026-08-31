// Shared immutable review definitions, moved from the solo lab without changing labels or source clips.
import { STAFF_NEW_ACTIONS } from "./staff-moves.js";

export const URLS = {
  body: "./assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb",
  animations: "./assets/3d/animations/human-foundation-pilot/human-foundation-pilot-animation-library.glb",
  locomotionExtras: "./assets/weapon-lab/locomotion-extras/locomotion-extras.glb",
  longsword: "./assets/3d/weapons/sword/weapon-sword-longsword-starter-v001.glb",
  shortsword: "./assets/weapon-lab/weapons/weapon-sword-shortsword-starter-v001.glb",
  shortswordPreviewTexture: "./assets/weapon-lab/textures/shortsword-basecolor-2k.jpg",
  shield: "./assets/weapon-lab/weapons/weapon-shield-wooden-starter-v001-2k.glb",
  staff: "./assets/weapon-lab/weapons/weapon-staff-ashwood-practice-v001.glb",
  staffPreviewTexture: "./assets/weapon-lab/textures/staff-basecolor-2k.jpg",
  mace: "./assets/weapon-lab/weapons/weapon-mace-wooden-starter-v001.glb",
  macePreviewTexture: "./assets/weapon-lab/textures/mace-basecolor-2k.jpg",
  bow: "./assets/weapon-lab/weapons/weapon-bow-short-starter-v001.glb",
  bowPreviewTexture: "./assets/weapon-lab/textures/bow-basecolor-2k.jpg",
  arrow: "./assets/3d/weapons/bow/weapon-arrow-starter-v002.glb",
  quiver: "./assets/3d/weapons/bow/weapon-quiver-starter-v002.glb",
  harness: "./assets/3d/gear/gear-quiver-harness-human-masculine-v001.glb",
  rod: "./assets/weapon-lab/weapons/weapon-wand-fire-starter-v001.glb",
  knife: "./assets/weapon-lab/weapons/weapon-knife-ritual-starter-v001.glb",
  knifePreviewTexture: "./assets/weapon-lab/textures/knife-basecolor-2k.jpg",
  dagger: "./assets/weapon-lab/weapons/weapon-dagger-worn-starter-v001.glb",
  daggerPreviewTexture: "./assets/weapon-lab/textures/dagger-basecolor-2k.jpg",
};

export const BOW_TRIPLE_SHOT_NAME = "GapAuthored__BowThreeArrowMultishot";
export const BOW_AIM_RUN_NAME = "GapAuthored__BowAimRunForward";
export const BOW_QUIVER_DRAW_NAME = "GapAuthored__BowQuiverDrawToNock";
export const BOW_RELEASE_NAME = "GapAuthored__BowReleaseFromNock";
export const BOW_STRIKE_NAME = "GapAuthored__BowCloseRangeStrike";
export const GREATSWORD_TWO_HAND_SHEATHE_NAME = "GapAuthored__GreatswordTwoHandSheathe";

/** Existing solo-arrow choreography, shared with contact review without retiming it. */
export const BOW_PROJECTILE_MOTION = Object.freeze({
  releasePhaseByAction: Object.freeze({ [BOW_RELEASE_NAME]: 0.3, [BOW_TRIPLE_SHOT_NAME]: 0.58 }),
  rangeMeters: 6,
  dropMeters: 0.65,
  spreadRadiansByCount: Object.freeze({
    1: Object.freeze([0]), 2: Object.freeze([-0.045, 0.045]), 3: Object.freeze([-0.075, 0, 0.075]),
  }),
});

export const ACTIONS = {
  twoHandSword: [
    ["Greatsword two-hand guard", "GreatSword__GreatSwordIdle"],
    ["Pommel butt smash", "GreatSword__GreatSwordAttack"],
    ["Greatsword slash 1", "GreatSword__GreatSwordSlash"],
    ["Greatsword slash 2", "GreatSword__GreatSwordSlash2"],
    ["Greatsword slash 3", "GreatSword__GreatSwordSlash3"],
    ["Greatsword high-spin attack", "GreatSword__GreatSwordHighSpinAttack"],
    ["Greatsword jumping attack", "GreatSword__GreatSwordJumpAttack"],
    ["Greatsword two-hand block", "GreatSword__GreatSwordBlocking"],
    ["Sheathe greatsword with both hands — authored", GREATSWORD_TWO_HAND_SHEATHE_NAME],
    ["Draw greatsword from back", "GreatSword__DrawAGreatSword2"],
  ],
  oneHandMeleeProxy: [
    ["One-hand idle — axe-authored proxy", "ProMeleeAxe__StandingIdle"],
    ["Downward strike — axe-authored proxy", "ProMeleeAxe__StandingMeleeAttackDownward"],
    ["Horizontal strike — axe-authored proxy", "ProMeleeAxe__StandingMeleeAttackHorizontal"],
    ["Backhand strike — axe-authored proxy", "ProMeleeAxe__StandingMeleeAttackBackhand"],
    ["Block — axe-authored proxy", "ProMeleeAxe__StandingBlockIdle"],
    ["Equip underarm — axe-authored proxy", "ProMeleeAxe__UnarmedEquipUnderarm"],
    ["Disarm underarm — axe-authored proxy", "ProMeleeAxe__StandingDisarmUnderarm"],
  ],
  staff: [
    ["Staff butt smash — matched interaction", "Interactions__HumanMasculineAthleticMuscularStaffButtSmash"],
    ["One-hand roundhouse — 360-high melee proxy", "ProMeleeAxe__StandingMeleeAttack360High"],
    ["One-hand low sweep — 360-low melee proxy", "ProMeleeAxe__StandingMeleeAttack360Low"],
    ["One-hand high strike — downward melee proxy", "ProMeleeAxe__StandingMeleeAttackDownward"],
    ["One-hand horizontal swing — melee proxy", "ProMeleeAxe__StandingMeleeAttackHorizontal"],
    ["Staff block — melee block proxy", "ProMeleeAxe__StandingBlockIdle"],
    ["Staff + free-hand cast gesture — caster proxy", "ProMagic__Standing2HCastSpell01"],
    ["Staff + free-hand magic attack — caster proxy", "ProMagic__Standing2HMagicAttack01"],
    ["Staff + free-hand area gesture — caster proxy", "ProMagic__Standing2HMagicAreaAttack01"],
    ["Staff caster idle — caster proxy", "ProMagic__StandingIdle"],
    ...STAFF_NEW_ACTIONS,
  ],
  bow: [
    ["Bow idle — matched", "ProLongbow__StandingIdle01"],
    ["Walk with bow + quiver — matched", "ProLongbow__StandingWalkForward"],
    ["Run with bow + quiver — matched", "ProLongbow__StandingRunForward"],
    ["Walk with bow drawn — matched", "ProLongbow__StandingAimWalkForward"],
    ["Run with bow drawn — authored", BOW_AIM_RUN_NAME],
    ["Draw arrow from quiver — authored", BOW_QUIVER_DRAW_NAME],
    ["Release nocked arrow — authored", BOW_RELEASE_NAME],
    ["Three-arrow multishot — authored", BOW_TRIPLE_SHOT_NAME],
    ["Bow strike — close-range fallback (authored)", BOW_STRIKE_NAME],
    ["Aim overdraw — matched", "ProLongbow__StandingAimOverdraw"],
    ["Aim recoil — matched", "ProLongbow__StandingAimRecoil"],
    ["Equip from back — matched", "Interactions__HumanMasculineAthleticMuscularBowEquipFromBack"],
    ["Stow to back — matched", "Interactions__HumanMasculineAthleticMuscularBowStowToBack"],
  ],
  magic: [
    ["Focus idle", "ProMagic__StandingIdle"],
    ["One-hand cast", "ProMagic__Standing1HCastSpell01"],
    ["Magic attack 1", "ProMagic__Standing1HMagicAttack01"],
    ["Magic attack 2", "ProMagic__Standing1HMagicAttack02"],
    ["Block", "ProMagic__StandingBlockIdle"],
  ],
  unarmedMagic: [
    ["No-weapon focus idle", "ProMagic__StandingIdle"],
    ["No-weapon one-hand cast", "ProMagic__Standing1HCastSpell01"],
    ["No-weapon magic attack 1", "ProMagic__Standing1HMagicAttack01"],
    ["No-weapon magic attack 2", "ProMagic__Standing1HMagicAttack02"],
    ["No-weapon magic block", "ProMagic__StandingBlockIdle"],
  ],
  dagger: [
    ["Dagger ready — one-hand proxy", "ProMeleeAxe__StandingIdle"],
    ["Forward stab — horizontal-melee proxy", "ProMeleeAxe__StandingMeleeAttackHorizontal"],
    ["Backstab — backhand-melee proxy", "ProMeleeAxe__StandingMeleeAttackBackhand"],
    ["Spinning strike — 360-low proxy", "ProMeleeAxe__StandingMeleeAttack360Low"],
    ["Dodge strike — run-jump proxy", "ProMeleeAxe__StandingMeleeRunJumpAttack"],
    ["One-hand parry — block proxy", "ProMeleeAxe__StandingBlockIdle"],
    ["Reinforced two-hand block — exact clip required", "ProMeleeAxe__StandingBlockReactLarge"],
  ],
};

// Explicit review bindings, not a promise that source equipment fits a loadout.
// These names point at unchanged library clips; no name-based fallback is used.
const SOURCE_RESPONSE_GROUPS = Object.freeze({
  greatsword: Object.freeze([
    "GreatSword__GreatSwordImpact", "GreatSword__GreatSwordImpact2", "GreatSword__GreatSwordImpact3",
    "GreatSword__GreatSwordImpact4", "GreatSword__GreatSwordImpact5",
    "GreatSword__TwoHandedSwordDeath", "GreatSword__TwoHandedSwordDeath2",
  ]),
  bow: Object.freeze([
    "ProLongbow__StandingReactSmallFromFront", "ProLongbow__StandingReactSmallFromHeadshot",
    "ProLongbow__StandingDeathBackward01", "ProLongbow__StandingDeathForward01",
  ]),
  caster: Object.freeze([
    "ProMagic__StandingReactSmallFromFront", "ProMagic__StandingReactSmallFromBack",
    "ProMagic__StandingReactSmallFromLeft", "ProMagic__StandingReactSmallFromRight",
    "ProMagic__StandingReactLargeFromFront", "ProMagic__StandingReactLargeFromBack",
    "ProMagic__StandingReactLargeFromLeft", "ProMagic__StandingReactLargeFromRight",
    "ProMagic__StandingReactDeathBackward", "ProMagic__StandingReactDeathForward",
    "ProMagic__StandingReactDeathLeft", "ProMagic__StandingReactDeathRight",
  ]),
  oneHand: Object.freeze([
    "ProMeleeAxe__StandingReactLargeGut", "ProMeleeAxe__StandingReactLargeFromLeft",
    "ProMeleeAxe__StandingReactLargeFromRight",
  ]),
  // The axe family contains no death. These are explicitly generic candidates,
  // not silent sword/shield or shooter substitutions and not equipment-approved.
  genericDeath: Object.freeze([
    "Interactions__HumanMasculineAthleticMuscularDeathBack",
    "Interactions__HumanMasculineAthleticMuscularDeathLeft",
    "Interactions__HumanMasculineAthleticMuscularDeathRightMirrored",
  ]),
});
const SOURCE_RESPONSE_BINDINGS = Object.freeze({
  twoHandSword: Object.freeze(["greatsword"]), bow: Object.freeze(["bow"]),
  magic: Object.freeze(["caster"]), unarmedMagic: Object.freeze(["caster"]),
  staff: Object.freeze(["caster", "oneHand"]),
  oneHandMeleeProxy: Object.freeze(["oneHand", "genericDeath"]),
  dagger: Object.freeze(["oneHand", "genericDeath"]),
});

/** Opt-in equipment review candidates; the solo curated catalog stays unchanged. */
export function sourceResponseActions(loadoutId, clips) {
  const family = LOADOUTS[loadoutId]?.actionFamily;
  if (!family) throw new Error(`Unknown human response binding: ${loadoutId}`);
  return SOURCE_RESPONSE_BINDINGS[family].flatMap((group) => SOURCE_RESPONSE_GROUPS[group]
    .filter((name) => clips.has(name))
    .map((name) => [`${group === "genericDeath" ? "Generic source candidate" : `${sourcePrefix(name)} source candidate`} · ${clipActionName(name)} · equipment suitability unverified`, name]));
}

export const GREATSWORD_BACK_TRANSITIONS = new Set([
  "GreatSword__DrawAGreatSword1",
  "GreatSword__DrawAGreatSword2",
]);

export const ACTION_PRESETS = {
  GreatSword__GreatSwordIdle: {
    name: "greatsword-two-hand-idle-v1",
    grip: { Index: 0.5, Middle: 0.5, Ring: 0.5, Pinky: 0.5, thumb: 0.1 },
    leftGrip: { Index: 0.5, Middle: 0.5, Ring: 0.5, Pinky: 0.5, thumb: 0.1 },
    socket: { x: 0, y: 0.04, z: 0, rx: 0, ry: 0, rz: -Math.PI / 2, scale: 1 },
  },
  GreatSword__GreatSwordAttack: {
    name: "greatsword-pommel-butt-smash-v1",
    grip: { Index: 0.5, Middle: 0.5, Ring: 0.5, Pinky: 0.5, thumb: 0.1 },
    leftGrip: { Index: 0.5, Middle: 0.5, Ring: 0.5, Pinky: 0.5, thumb: 0.1 },
    socket: { x: 0, y: 0.04, z: 0, rx: 0, ry: 0, rz: -Math.PI / 2, scale: 1 },
  },
  [BOW_QUIVER_DRAW_NAME]: {
    name: "bow-feather-retrieval-grip-v2",
    grip: { Index: 0.95, Middle: 0.86, Ring: 0.78, Pinky: 0.72, thumb: 0.78 },
    leftGrip: { Index: -0.5, Middle: -0.45, Ring: -0.4, Pinky: -0.35, thumb: 0 },
  },
  [BOW_TRIPLE_SHOT_NAME]: {
    name: "bow-three-arrow-feather-retrieval-grip-v1",
    grip: { Index: 0.61, Middle: 0.68, Ring: 0.67, Pinky: 0.65, thumb: 0.43 },
    leftGrip: { Index: -0.5, Middle: -0.45, Ring: -0.4, Pinky: -0.35, thumb: 0 },
  },
};

export const ASSET_SPECS = {
  longsword: { canonical: true, targetLength: 1.05, gripEnd: "min", gripFraction: 0.1 },
  shortsword: { targetLength: 0.75, gripEnd: "hilt", gripFraction: 0.10 },
  shield: { targetLength: 0.68, planar: true, gripEnd: "center", gripFraction: 0.5 },
  staff: { targetLength: 1.75, radialScale: 0.5, gripEnd: "center", gripFraction: 0.52 },
  mace: { targetLength: 0.68, gripEnd: "small", gripFraction: 0.13 },
  // Preserve the approved 1.18 m span while restoring the slimmer original
  // silhouette. Scaling only the radial axes does not shorten the draw length.
  bow: { targetLength: 1.18, radialScale: 0.68, gripEnd: "center", gripFraction: 0.5 },
  arrow: { canonical: true, targetLength: 0.94, gripEnd: "small", gripFraction: 0.1 },
  quiver: { canonical: true, targetLength: 0.64, gripEnd: "center", gripFraction: 0.5 },
  harness: { canonical: true, targetLength: 0.479746, gripEnd: "center", gripFraction: 0.5 },
  rod: { canonical: true, targetLength: 0.38, gripEnd: "min", gripFraction: 0.145 },
  knife: { targetLength: 0.34, gripEnd: "hilt", gripFraction: 0.16 },
  dagger: { targetLength: 0.38, gripEnd: "hilt", gripFraction: 0.16 },
};

export const R = -Math.PI / 2;
export const LOADOUTS = {
  longswordTwoHand: {
    label: "Greatsword — matched two-hand clips (no shield)",
    actionFamily: "twoHandSword",
    match: "matched: dedicated GreatSword two-hand animation family",
    attachments: [{ asset: "longsword", bone: "RightHand", role: "primary", position: [0, 0.04, 0], rotation: [0, 0, R] }],
  },
  shortswordOnly: {
    label: "Shortsword — one-hand proxy (no shield)",
    actionFamily: "oneHandMeleeProxy",
    match: "proxy: one-hand axe-authored motions; sword-and-shield withheld until combat shield exists",
    attachments: [{ asset: "shortsword", bone: "RightHand", role: "primary", position: [0, 0.062, 0.03], rotation: [0, 0, R] }],
  },
  staff: {
    label: "Ashwood staff — mixed match/proxy",
    actionFamily: "staff",
    match: "mixed: one matched staff interaction plus melee/caster-authored proxies",
    missing: "new fighting moves are authored review drafts; original matched and proxy moves are retained",
    attachments: [{ asset: "staff", bone: "RightHand", role: "primary", position: [0, 0.062, 0.03], rotation: [0, 0, R] }],
  },
  mace: {
    label: "Wooden mace — one-hand proxy",
    actionFamily: "oneHandMeleeProxy",
    match: "proxy: one-hand axe-authored motions; no mace-specific clips in the V2 library",
    attachments: [{ asset: "mace", bone: "RightHand", role: "primary", position: [0, 0.062, 0.018], rotation: [0, 0, R] }],
  },
  bow: {
    label: "Shortbow + approved Tripo arrows, quiver, and harness — matched",
    actionFamily: "bow",
    match: "matched: dedicated longbow and bow-interaction clips",
    arrowBundle: {
      bone: "Spine2",
      position: [-0.083, -0.109, -0.115],
      rotation: [0.05, Math.PI, -0.18],
      capacity: 100,
    },
    attachments: [
      {
        asset: "bow",
        bone: "LeftHand",
        role: "primary",
        position: [0, -0.01, 0.03],
        rotation: [0, 0, Math.PI / 2],
        poses: {
          // The Mixamo hand bone is a wrist pivot. The 3 cm palm-depth offset
          // seats the modeled leather handle inside the curled fingers.
          hand: { bone: "LeftHand", position: [0, -0.01, 0.03], rotation: [0, 0, Math.PI / 2] },
          back: { bone: "Spine2", position: [0.18, -0.02, -0.24], rotation: [0.08, Math.PI, -0.62] },
        },
      },
      { asset: "arrow", bone: "RightHand", role: "ammo", position: [0, 0.04, 0] },
      {
        asset: "quiver",
        bone: "Spine2",
        role: "back",
        rotation: [0.05, Math.PI, -0.18],
        position: [-0.09, -0.12, -0.115],
        // Keep the approved length, but flatten the generated bowl-like
        // cross-section into a shallow leather back-quiver.
        scale: [0.6, 1, 0.6],
      },
      {
        asset: "harness",
        bone: "Spine2",
        role: "harness",
        rotation: [0, Math.PI, -0.55],
        position: [-0.14, -0.24, 0.05],
        scale: 1,
        // The generated source is replaced at runtime by one closed
        // off-shoulder sling. It runs from the quiver over the shoulder,
        // diagonally across the torso, and back to the lower quiver mount.
        visible: true,
      },
    ],
  },
  rod: {
    label: "Fire caster wand — Tripo starter",
    actionFamily: "magic",
    match: "Tripo fire wand; caster-role animation proxies, fitted right-hand grip",
    attachments: [{ asset: "rod", bone: "RightHand", role: "primary", position: [0, 0.05, 0.021], rotation: [0, 0, R] }],
  },
  unarmedMagic: {
    label: "Unarmed magic — no staff, rod, or wand",
    actionFamily: "unarmedMagic",
    match: "matched by role: no weapon attachment; Human Foundation V2 magic clips",
    attachments: [],
  },
  knife: {
    label: "Ritual knife — caster tool",
    actionFamily: "magic",
    match: "matched by role: ritual/caster motions; not the rogue combat dagger",
    attachments: [{ asset: "knife", bone: "RightHand", role: "primary", position: [0, 0.062, 0.03], rotation: [0, 0, R] }],
  },
  daggerSingle: {
    label: "Worn dagger — single-hand rogue starter",
    progression: "starter",
    actionFamily: "dagger",
    match: "temporary motion proxies; exact dagger stab/backstab/parry clips remain required from the animation lane",
    missing: "exact dagger-specific stab, backstab, dodge-strike, parry, and reinforced two-hand-block clips",
    attachments: [{ asset: "dagger", bone: "RightHand", role: "primary", position: [0, 0.062, 0.03], rotation: [0, 0, R] }],
  },
  daggers: {
    label: "Paired worn daggers — later-game dual wield",
    progression: "later-game locked",
    actionFamily: "dagger",
    match: "later-game preview only; exact dual-wield clips are absent from the V2 library",
    missing: "exact dual-wield dagger animation family",
    attachments: [
      { asset: "dagger", bone: "RightHand", role: "primary", position: [0, 0.062, 0.03], rotation: [0, 0, R] },
      { asset: "dagger", bone: "LeftHand", role: "offhand", position: [0, 0.062, 0.03], rotation: [0, 0, Math.PI / 2] },
    ],
  },
};

export const OPEN_GRIP = { Index: 0, Middle: 0, Ring: 0, Pinky: 0, thumb: 0 };
export const TWO_HAND_GRIP = { Index: 0.5, Middle: 0.5, Ring: 0.5, Pinky: 0.5, thumb: 0.1 };
export const BOW_HAND_GRIP = { Index: -0.5, Middle: -0.45, Ring: -0.4, Pinky: -0.35, thumb: 0 };
export const FITTED_HAND_GRIP = { Index: 1.2, Middle: 1.2, Ring: 1.2, Pinky: 1.2, thumb: 0.55 };
export const NARROW_HAND_GRIP = { Index: 1.2, Middle: 1.2, Ring: 1.2, Pinky: 1.2, thumb: 0.55 };
export const FITTED_GRIP_LOADOUTS = new Set(["staff", "mace", "shortswordOnly", "knife", "daggerSingle", "daggers", "rod"]);
export const LOADOUT_GRIP_PRESETS = {
  longswordTwoHand: { right: TWO_HAND_GRIP, left: TWO_HAND_GRIP },
  shortswordOnly: { right: FITTED_HAND_GRIP, left: OPEN_GRIP },
  staff: { right: FITTED_HAND_GRIP, left: FITTED_HAND_GRIP },
  mace: { right: FITTED_HAND_GRIP, left: OPEN_GRIP },
  bow: { right: BOW_HAND_GRIP, left: BOW_HAND_GRIP },
  rod: { right: NARROW_HAND_GRIP, left: OPEN_GRIP },
  unarmedMagic: { right: OPEN_GRIP, left: OPEN_GRIP },
  knife: { right: NARROW_HAND_GRIP, left: OPEN_GRIP },
  daggerSingle: { right: NARROW_HAND_GRIP, left: OPEN_GRIP },
  daggers: { right: NARROW_HAND_GRIP, left: NARROW_HAND_GRIP },
};

export const PREVIEW_TEXTURE_URLS = {
  shortsword: URLS.shortswordPreviewTexture,
  staff: URLS.staffPreviewTexture,
  mace: URLS.macePreviewTexture,
  bow: URLS.bowPreviewTexture,
  knife: URLS.knifePreviewTexture,
  dagger: URLS.daggerPreviewTexture,
};

export const REQUIRED_PREVIEW_TEXTURE_ASSETS = new Set([
  "shortsword", "staff", "mace", "bow", "knife", "dagger",
]);

export const RUN_DIVE_GAP_NAME = "GapAuthored__SwimRunDiveWaterEntry";
export const AUTHORED_GAP_LABELS = new Map([
  [RUN_DIVE_GAP_NAME, "DRAFT GAP — Run, dive, and enter water"],
  [BOW_TRIPLE_SHOT_NAME, "DRAFT BOW — Three-arrow multishot"],
  [BOW_AIM_RUN_NAME, "DRAFT BOW — Run forward while drawn"],
  [BOW_QUIVER_DRAW_NAME, "DRAFT BOW — Quiver draw to nock"],
  [BOW_RELEASE_NAME, "DRAFT BOW — Release from nock"],
  [GREATSWORD_TWO_HAND_SHEATHE_NAME, "DRAFT GREATSWORD — Two-hand shoulder sheathe"],
]);

export const CATALOG_ACTIVITIES = [
  { key: "locomotion", label: "Basic locomotion — unarmed", matches: isBasicLocomotionClip },
  { key: "weapons", label: "Weapon animations", matches: isWeaponClip },
  { key: "attacks", label: "Attacks and offense", matches: isAttackClip },
  { key: "defense", label: "Blocks, defense, and dodges", matches: isDefenseClip },
  { key: "swimming", label: "Swimming", matches: (clipName) => /Swim/i.test(clipActionName(clipName)) },
  { key: "climbing", label: "Climbing and ropes", matches: (clipName) => /Climb/i.test(clipActionName(clipName)) },
  { key: "objects", label: "Interacting with objects", matches: isObjectInteractionClip },
  { key: "social", label: "Social, gestures, and talking", matches: isSocialClip },
  { key: "magic", label: "Magic and casting", matches: isMagicClip },
  { key: "reactions", label: "Hit reactions and impacts", matches: isReactionClip },
  { key: "death", label: "Deaths and dying", matches: isDeathClip },
  { key: "idles", label: "Idles and stances", matches: isIdleClip },
  { key: "all", label: "All source + authored clips — advanced", matches: () => true },
];

export const CATALOG_LOCOMOTION = [
  { key: "all", label: "All basic locomotion", matches: () => true },
  { key: "walking", label: "Walking", matches: (clipName) => /Walk/i.test(clipActionName(clipName)) },
  { key: "running", label: "Running and sprinting", matches: (clipName) => /Run|Sprint/i.test(clipActionName(clipName)) },
  { key: "jumping", label: "Jumping, falling, landing, and diving", matches: (clipName) => /Jump|Fall|Land|Dive/i.test(clipActionName(clipName)) },
  { key: "strafing", label: "Strafing", matches: (clipName) => /Strafe/i.test(clipActionName(clipName)) },
  { key: "turning", label: "Turning", matches: (clipName) => /Turn/i.test(clipActionName(clipName)) },
  { key: "crouching", label: "Crouch movement", matches: (clipName) => /Crouch/i.test(clipActionName(clipName)) },
];

export const CATALOG_WEAPONS = [
  { key: "all", label: "All weapon types", matches: () => true },
  { key: "greatsword", label: "Greatsword", matches: (clipName) => sourcePrefix(clipName) === "GreatSword" },
  { key: "swordShield", label: "Sword and shield", matches: (clipName) => sourcePrefix(clipName) === "ProSwordAndShield" || /SwordShield/i.test(clipActionName(clipName)) },
  { key: "oneHand", label: "Axe and one-hand melee", matches: (clipName) => sourcePrefix(clipName) === "ProMeleeAxe" },
  { key: "staff", label: "Staff", matches: (clipName) => /Staff/i.test(clipActionName(clipName)) },
  { key: "bow", label: "Bow and arrow", matches: (clipName) => sourcePrefix(clipName) === "ProLongbow" || /Bow/i.test(clipActionName(clipName)) },
  { key: "rifle", label: "Rifle and shooter", matches: (clipName) => ["ProRifle", "BasicShooter", "Shooter"].includes(sourcePrefix(clipName)) },
];

export const CATALOG_WEAPON_ACTIONS = [
  { key: "all", label: "All actions", matches: () => true },
  { key: "attacks", label: "Attacks and strikes", matches: isAttackClip },
  { key: "defense", label: "Blocks and dodges", matches: isDefenseClip },
  { key: "aimFire", label: "Aim, draw arrow, fire, and reload", matches: (clipName) => /Aim|DrawArrow|Shoot|Firing|Reload/i.test(clipActionName(clipName)) },
  { key: "equip", label: "Draw, equip, stow, and sheathe", matches: (clipName) => /DrawA|DrawSword|Equip|Disarm|Stow|Sheath/i.test(clipActionName(clipName)) },
  { key: "movement", label: "Weapon locomotion", matches: isLocomotionClip },
  { key: "idle", label: "Weapon idles and stances", matches: isIdleClip },
  { key: "reactions", label: "Weapon hit reactions", matches: isReactionClip },
  { key: "death", label: "Weapon deaths", matches: isDeathClip },
  { key: "magic", label: "Weapon casting and power-up", matches: isMagicClip },
];

export const CATALOG_LOADOUT = {
  label: "Human Foundation V2 animation catalog",
  progression: "review-only",
  match: "raw source clip or clearly labeled authored gap draft, with no weapon, socket correction, IK, or grip overlay",
  missing: "400 original clips preserved + 5 new Mixamo locomotion clips; stair source travel retained; authored gap drafts remain separate",
  attachments: [],
};

export const TARGET_HEIGHT_METERS = 2.06;
export function sourcePrefix(clipName) {
  return clipName.includes("__") ? clipName.split("__", 1)[0] : "Ungrouped";
}

export function clipActionName(clipName) {
  return clipName.includes("__") ? clipName.split("__").at(-1) : clipName;
}

export function isWeaponClip(clipName) {
  const prefix = sourcePrefix(clipName);
  const actionName = clipActionName(clipName);
  const weaponFamily = ["GreatSword", "ProSwordAndShield", "ProMeleeAxe", "ProLongbow", "ProRifle", "BasicShooter", "Shooter"].includes(prefix);
  return (weaponFamily && !/^Unarmed/i.test(actionName))
    || /Bow|SwordShield|Staff/i.test(actionName);
}

export function isAttackClip(clipName) {
  return /Attack|Strike|Slash|Kick|Shoot|Firing|TossGrenade|StaffButtSmash|MagicAttack/i.test(clipActionName(clipName));
}

export function isDefenseClip(clipName) {
  return /Block|Dodge|Parry/i.test(clipActionName(clipName));
}

export function isLocomotionClip(clipName) {
  const actionName = clipActionName(clipName);
  return !/Swim|Climb|Death|Dying/i.test(actionName)
    && /Walk|Run|Sprint|Strafe|Turn|Jump|Fall|Land|Dive|Crouch/i.test(actionName);
}

export function isBasicLocomotionClip(clipName) {
  const prefix = sourcePrefix(clipName);
  const actionName = clipActionName(clipName);
  const unarmedSource = ["BasicLocomotion", "MaleLocomotion"].includes(prefix)
    || (prefix === "ProMeleeAxe" && /^Unarmed/i.test(actionName))
    || (prefix === "Interactions" && /WalkInPlace/i.test(actionName));
  return unarmedSource && isLocomotionClip(clipName);
}

export function isObjectInteractionClip(clipName) {
  return sourcePrefix(clipName) === "Interactions"
    && /Door|Container|Chest|Pickup|Harvest|PullHeavy|PushHeavy|PullLever|PushButton/i.test(clipActionName(clipName));
}

export function isSocialClip(clipName) {
  return sourcePrefix(clipName) === "Interactions"
    && /Beckon|Greet|Nod|ShakeNo|Point|Talk|Think|Wave/i.test(clipActionName(clipName));
}

export function isMagicClip(clipName) {
  return sourcePrefix(clipName) === "ProMagic" || /Magic|Cast|Spell|PowerUp/i.test(clipActionName(clipName));
}

export function isReactionClip(clipName) {
  return /React|Impact|HitReaction/i.test(clipActionName(clipName));
}

export function isDeathClip(clipName) {
  return /Death|Dying/i.test(clipActionName(clipName));
}

export function isIdleClip(clipName) {
  return /Idle|Looking|Examine/i.test(clipActionName(clipName));
}
