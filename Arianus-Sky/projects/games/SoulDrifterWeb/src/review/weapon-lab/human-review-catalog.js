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

const GREATSWORD_SOCKET = { x: 0, y: 0.04, z: 0, rx: 0, ry: 0, rz: -Math.PI / 2, scale: 1 };
// The one greatsword curl, declared before ACTION_PRESETS uses it and re-exported
// below as TWO_HAND_GRIP. Both presets used to repeat it as literals, which let the
// action and loadout values drift apart silently.
//
// thumb 1.4 rad is the smallest curl that brings the thumb tip joint onto the haft.
// Measured on the shipped rig against a 35.6 mm-diameter haft, hole-filled radius
// profile: the tip stood 40.6 mm clear of the wood at the old 0.1 in 14 of 19
// clips, and 10.2 mm at 1.4 -- one finger flesh radius, i.e. pad on the wood.
// Higher values over-close (1.6 buries the tip to 0.9 mm on GreatSwordBlocking).
const GREATSWORD_GRIP = { Index: 0.5, Middle: 0.5, Ring: 0.5, Pinky: 0.5, thumb: 1.4 };
export const ACTION_PRESETS = {
  GreatSword__GreatSwordIdle: {
    name: "greatsword-two-hand-idle-v2",
    grip: GREATSWORD_GRIP,
    leftGrip: GREATSWORD_GRIP,
    socket: GREATSWORD_SOCKET,
  },
  GreatSword__GreatSwordAttack: {
    name: "greatsword-pommel-butt-smash-v2",
    grip: GREATSWORD_GRIP,
    leftGrip: GREATSWORD_GRIP,
    socket: GREATSWORD_SOCKET,
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
  // canonical: prepareAsset() returns the mesh untouched, so gripEnd/gripFraction
  // are never applied to it -- they were declared here and silently ignored. The
  // mesh authors its own anchor: measured 156.584 mm from the butt of a 1049.99 mm
  // blade, an effective grip fraction of 0.149, not the 0.1 once declared.
  // targetLength stays: prepareAsset and weapon-lab.js both read it.
  longsword: { canonical: true, targetLength: 1.05 },
  // 0.10 seated the fist astride the 40 mm pommel knob -- measured, the pinky tip
  // sat 8.7 mm inside it and its flesh 37 mm inside. 0.15 clears the knob onto the
  // 26-30 mm handle proper: the anchor moves 75.0 -> 112.5 mm from the butt.
  shortsword: { targetLength: 0.75, gripEnd: "hilt", gripFraction: 0.15 },
  shield: { targetLength: 0.68, planar: true, gripEnd: "center", gripFraction: 0.5 },
  // gripEnd/gripFraction ARE consumed by prepareAsset here (removing them yields a
  // NaN prepared bounds), but they do NOT decide where the staff ends up: staff-grip.js
  // centerStaffVisual re-seats the mesh on its own prepared bounds midpoint afterwards,
  // which cancels the 0.52 bias. That was audited and deliberately left alone. Seating
  // the prepared anchor directly instead was tried: the anchor sits 35 mm off this
  // mesh's midpoint, so it unbalances the staff by 70 mm and fails the 1e-6, 1900-sample
  // balance proof in scripts/verify-weapon-lab-staff.mjs. A quarterstaff held off centre
  // is wrong, so the proof wins and the bias stays cancelled.
  staff: { targetLength: 1.75, radialScale: 0.5, gripEnd: "center", gripFraction: 0.52 },
  mace: { targetLength: 0.68, gripEnd: "small", gripFraction: 0.13 },
  // Preserve the approved 1.18 m span while restoring the slimmer original
  // silhouette. Scaling only the radial axes does not shorten the draw length.
  bow: { targetLength: 1.18, radialScale: 0.68, gripEnd: "center", gripFraction: 0.5 },
  arrow: { canonical: true, targetLength: 0.94, gripEnd: "small", gripFraction: 0.1 },
  quiver: { canonical: true, targetLength: 0.64, gripEnd: "center", gripFraction: 0.5 },
  harness: { canonical: true, targetLength: 0.479746, gripEnd: "center", gripFraction: 0.5 },
  // canonical, so gripEnd/gripFraction were never applied and are dropped here for
  // the same reason as longsword's: measured, a +0.20 gripFraction bias moved this
  // weapon's anchor by -0.001 mm while it moved the shortsword's by +150.0 mm.
  // The mesh authors its own anchor, 55.019 mm from the butt of a 380.02 mm wand.
  // targetLength stays: prepareAsset and weapon-lab.js both read it.
  rod: { canonical: true, targetLength: 0.38 },
  // 0.16 seated the fist 32 mm below the guard, leaving bare handle above it.
  // Measured on ProMagic__StandingIdle against the knife's own radius profile:
  // 0.16 -> 0.20 takes the worst finger-joint deviation 13.601 -> 12.960 mm and
  // the mean over the 16 finger joints 6.121 -> 5.791 mm, with the same curls.
  // 0.24 reverses it (13.417 mm) as the index knuckle reaches the crossguard.
  knife: { targetLength: 0.34, gripEnd: "hilt", gripFraction: 0.20 },
  dagger: { targetLength: 0.38, gripEnd: "hilt", gripFraction: 0.16 },
};

export const R = -Math.PI / 2;
export const LOADOUTS = {
  longswordTwoHand: {
    label: "Greatsword — matched two-hand clips (no shield)",
    actionFamily: "twoHandSword",
    match: "matched: dedicated GreatSword two-hand animation family",
    attachments: [{
      asset: "longsword", bone: "RightHand", role: "primary",
      position: [0, 0.04, 0], rotation: [0, 0, R],
      // A bare back carry -- no harness, no scabbard, the greatsword simply rests
      // across the back. The `back` literal is not hand-authored: it is the world
      // transform the approved GapAuthored__GreatswordTwoHandSheathe already ends
      // on (its `inserted` key), re-expressed in Spine2-local calibration metres.
      // Deriving it that way makes the sheathe's hand-off transform-identical, so
      // the sword cannot pop as the clip releases it. Measured on the shipped rig:
      // hilt 1.384 m, tip 0.355 m, sitting 144-354 mm behind the spine, i.e. clear
      // of a torso whose half-depth is ~120 mm.
      //
      // Carry only. The library has no draw-from-back animation to match it: on
      // GreatSword__DrawAGreatSword1 the right hand comes no closer than 386 mm to
      // this hilt, and on DrawAGreatSword2 it starts at 484 mm and travels AWAY, to
      // 713 mm. Wiring these clips to the mount would have the hand grasp open air.
      poses: {
        hand: { bone: "RightHand", position: [0, 0.04, 0], rotation: [0, 0, R] },
        back: { bone: "Spine2", position: [-0.278, 0.0433, -0.165], rotation: [-0.2644, 0.7055, 3.0893] },
      },
    }],
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
    // The mace head is asymmetric, so prepareAsset's x/z bounding-box centring puts
    // the socket 11.5 mm off the shaft's own centreline and the mace hung to one
    // side of the fist. The socket offset takes that up instead: measured, the fist
    // centre sat 10.101 mm off the shaft axis at [0, 0.062, 0.018] and 0.041 mm off
    // it here. Hand-local Y and Z are both perpendicular to the shaft (the weapon
    // lies along hand-local X), so this is a pure translation in the radial plane
    // and the two probe points that solved it are exactly linear.
    attachments: [{ asset: "mace", bone: "RightHand", role: "primary", position: [0, 0.0543, 0.0114], rotation: [0, 0, R] }],
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
export const TWO_HAND_GRIP = GREATSWORD_GRIP;
export const BOW_HAND_GRIP = { Index: -0.5, Middle: -0.45, Ring: -0.4, Pinky: -0.35, thumb: 0 };
export const FITTED_HAND_GRIP = { Index: 1.2, Middle: 1.2, Ring: 1.2, Pinky: 1.2, thumb: 0.55 };
export const NARROW_HAND_GRIP = { Index: 1.2, Middle: 1.2, Ring: 1.2, Pinky: 1.2, thumb: 0.55 };
// The blade grips' own curls, split out of NARROW_HAND_GRIP so a `rod` change can
// never move them. NARROW_HAND_GRIP was byte-identical to FITTED_HAND_GRIP, so a
// single angle drove four fingers of different length onto four different chords
// of the same ~48 mm handle: the short fingers reached the wood first and kept
// going. Measured per finger against each weapon's own radius profile (the tip
// gap is taken against the LARGEST radius within +/-7.5 mm axially, so it is a
// bound, not an estimate), the shipped 1.2 buried the pinky's middle phalanx
// 24.0 mm (dagger) / 13.3 mm (knife) inside the handle. The corrected gradient
// follows finger length, which is what a shared angle cannot express.
//
// Index stays at 1.2 in both: applyHandOverlay spends `angle` x [1.2, 1.4, 1.2]
// across the three phalanges, so 1.2 is already 261 deg of total flexion and 1.4
// -- which measures better still (dagger index 13.283 -> 10.789 mm) -- is 305 deg
// and wraps the finger through itself.
export const DAGGER_HAND_GRIP = { Index: 1.2, Middle: 1.0, Ring: 1.0, Pinky: 0.6, thumb: 0.55 };
export const KNIFE_HAND_GRIP = { Index: 1.2, Middle: 1.0, Ring: 1.0, Pinky: 0.9, thumb: 0.55 };
// Index/Middle reach past Ring/Pinky, so one shared curl cannot close four fingers
// of different lengths on a 26-30 mm handle: measured on ProMeleeAxe__StandingIdle
// against the fitted shaft centreline, the shipped 1.2 left the index and middle
// TIPS 15.9 and 16.9 mm clear while ring and pinky sat 3.4-3.9 mm off the wood.
// 1.8 / 2.0 close them: four-finger tip spread 23.7 mm -> 2.8 mm.
export const SHORTSWORD_HAND_GRIP = { Index: 1.8, Middle: 2.0, Ring: 1.2, Pinky: 1.2, thumb: 0.55 };
// Same problem on a thinner shaft, and in the other direction for the short
// fingers: once the shaft is centred in the fist, 1.2 drove ring and pinky 11.2
// and 9.0 mm THROUGH it while index and middle were still 7.6 and 3.5 mm clear.
// Measured tip spread 17.9 mm -> 2.8 mm.
export const MACE_HAND_GRIP = { Index: 1.6, Middle: 1.2, Ring: 0.9, Pinky: 0.9, thumb: 0.55 };
// The two-hand block seats the support hand higher up the mace, where the shaft is
// only ~23 mm in radius, so the staff-sized curl left all four of its fingertips
// 17.9-28.2 mm in the air while the palm was 3.2 mm inside the wood. Measured
// off-hand tip spread 10.3 mm -> 0.8 mm.
export const MACE_SUPPORT_HAND_GRIP = { Index: 1.75, Middle: 1.85, Ring: 1.83, Pinky: 1.78, thumb: 0.55 };
// The wand is a 13.8 mm shaft -- thinner than the fist tunnel -- so a fingertip
// given more curl orbits it instead of closing on it, and only Index and Ring
// respond monotonically (measured: Middle's skin standoff is at its minimum at
// 1.2 and rises at 1.0 and at 1.3 alike). Index closes the 6.2 mm standoff that
// left it touching the wand nowhere; Ring backs off the curl that buried its
// flesh 4.8 mm in the shaft. Middle and Pinky are already at their own measured
// optimum and are left at 1.2.
export const WAND_HAND_GRIP = { Index: 1.51, Middle: 1.2, Ring: 1.12, Pinky: 1.2, thumb: 0.55 };
// The staff's own curl, split out of FITTED_HAND_GRIP so a shortsword or mace
// change can never move it. The values are deliberately the shipped ones.
//
// The audit reported the staff's index and middle FINGERTIPS standing ~29 mm clear
// of the 33 mm-diameter shaft. That is not a curl error and raising the curl does
// not fix it: applyHandOverlay rotates the three phalanges by [1.2, 1.2, 1.0] x
// this angle from the bind pose, so 1.2 already spends 82/82/69 deg -- a closed
// fist -- and ~1.35 (263 deg total) is the anatomical ceiling. Measured on
// ProMagic__StandingIdle the index tip moves only 29.663 -> 29.496 -> 29.217 mm
// across curls 1.2 / 1.3 / 1.35, while the fist centre leaves the shaft
// (-5.0 -> -0.4 -> +1.8 mm). Reaching the tip to the wood needs 1.9 rad = 370 deg
// of total flexion, which wraps the finger a full turn: the tip then reads 7.1 mm
// only because it has come back round, and the middle joint bulges 29 mm clear
// (radial 45.7 mm against a 16.5 mm shaft). At 1.2 the shaft is held the way a
// hand actually holds a thin rod -- by the middle phalanges, with the fist centre
// 5.0-21.6 mm inside the wood.
export const STAFF_HAND_GRIP = { Index: 1.2, Middle: 1.2, Ring: 1.2, Pinky: 1.2, thumb: 0.55 };
export const FITTED_GRIP_LOADOUTS = new Set(["staff", "mace", "shortswordOnly", "knife", "daggerSingle", "daggers", "rod"]);
export const LOADOUT_GRIP_PRESETS = {
  longswordTwoHand: { right: TWO_HAND_GRIP, left: TWO_HAND_GRIP },
  shortswordOnly: { right: SHORTSWORD_HAND_GRIP, left: OPEN_GRIP },
  // `left` covers the ten free-hand clips; on the ten two-hand clips the actor
  // fits the support hand with STAFF_HAND_GRIP as well.
  staff: { right: STAFF_HAND_GRIP, left: STAFF_HAND_GRIP },
  // `left` covers the eight one-hand clips; on the two-hand block the actor fits
  // the support hand with MACE_SUPPORT_HAND_GRIP instead.
  mace: { right: MACE_HAND_GRIP, left: OPEN_GRIP },
  bow: { right: BOW_HAND_GRIP, left: BOW_HAND_GRIP },
  rod: { right: WAND_HAND_GRIP, left: OPEN_GRIP },
  unarmedMagic: { right: OPEN_GRIP, left: OPEN_GRIP },
  knife: { right: KNIFE_HAND_GRIP, left: OPEN_GRIP },
  daggerSingle: { right: DAGGER_HAND_GRIP, left: OPEN_GRIP },
  // Both hands take the fitted path for `daggers`, and the measured per-finger
  // optimum is the same on each: left Index 1.2 / Middle 1.0 / Ring 1.0 / Pinky 0.6.
  daggers: { right: DAGGER_HAND_GRIP, left: DAGGER_HAND_GRIP },
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

/**
 * The height the review body is scaled to, and it must agree with the game.
 *
 * 1.8 m, matching BREACHLING_SPIT_PLAYER_HEIGHT_METERS in
 * src/game/dungeons/breach-v2-breachling-mouths.ts. It was 2.06 m, which nothing in
 * the game agreed with: the spit aimed at BREACHLING_SPIT_TARGET_HEIGHT_METERS
 * (1.15 m) while this body's chest measured 1.5516 m, so acid was thrown 40 cm low
 * at hip height, and the top 26 cm of the character projected out of the 1.8 m hit
 * capsule entirely. The body measures 7.9 heads tall - a correctly proportioned
 * adult male, not a giant - so there was no artistic intent requiring 2.06.
 *
 * Changing it re-scales every weapon grip and moves every pinned contact row, which
 * is why it is one constant with this much comment on it. Owner decision, 2026-09-04.
 */
export const TARGET_HEIGHT_METERS = 1.8;

/**
 * The body height every BODY-relative measurement in this lane was taken on:
 * socket seats, palm depths, thumb targets, and the review stride bounds. Those
 * are all anatomy -- wrist to fist centre, palm depth, thumb opposition, leg
 * length -- so they are stored as metres on this reference body and re-expressed
 * for whatever TARGET_HEIGHT_METERS is in force. Ratio, not table: one constant
 * covers the selectable 1.5-2.0 m range without a per-height column.
 *
 * Weapon-relative distances are deliberately NOT scaled by it: ASSET_SPECS
 * targetLength, the greatsword support-hand target, and the mace two-hand grip at
 * 0.24 m up the shaft are all measured on the weapon, and a sword does not shrink
 * because the man holding it does. The weapons are modelled to scale already.
 *
 * The game lane owns the same reference in src/game/humanWeaponCalibration.ts,
 * where its socketBodyUnits converts per-actor rather than against one target
 * height. It is duplicated rather than imported because this file is pure JS that
 * scripts/verify-weapon-lab-staff.mjs loads under plain node, which cannot parse a
 * .ts import. tests/humanWeaponCalibration.test.ts pins the two values equal.
 */
export const CALIBRATION_HEIGHT_METERS = 2.06;
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
