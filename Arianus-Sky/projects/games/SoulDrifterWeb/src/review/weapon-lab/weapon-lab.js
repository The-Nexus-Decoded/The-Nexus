import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { centerStaffVisual, fitStaffToSourceHands, staffUsesSupportHand, fitCasterStaffHand, fitMaceBlockSupport, maceUsesSupportHand } from "./staff-grip.js";
import { STAFF_NEW_ACTIONS, buildStaffFightingClips } from "./staff-moves.js";
import { locomotionActions, buildCarryLocomotionClips } from "./weapon-locomotion.js";

const LIVE_CALIBRATION_URL = "./assets/weapon-lab/live-calibration.json";
const LIVE_CALIBRATION_ENABLED = import.meta.env.DEV
  && new URLSearchParams(location.search).get("liveCalibration") === "1";
const URLS = {
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

const BOW_TRIPLE_SHOT_NAME = "GapAuthored__BowThreeArrowMultishot";
const BOW_AIM_RUN_NAME = "GapAuthored__BowAimRunForward";
const BOW_QUIVER_DRAW_NAME = "GapAuthored__BowQuiverDrawToNock";
const BOW_RELEASE_NAME = "GapAuthored__BowReleaseFromNock";
const BOW_STRIKE_NAME = "GapAuthored__BowCloseRangeStrike";
const GREATSWORD_TWO_HAND_SHEATHE_NAME = "GapAuthored__GreatswordTwoHandSheathe";

const ACTIONS = {
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

const GREATSWORD_BACK_TRANSITIONS = new Set([
  "GreatSword__DrawAGreatSword1",
  "GreatSword__DrawAGreatSword2",
]);

const ACTION_PRESETS = {
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

const ASSET_SPECS = {
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

const R = -Math.PI / 2;
const LOADOUTS = {
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

const OPEN_GRIP = { Index: 0, Middle: 0, Ring: 0, Pinky: 0, thumb: 0 };
const TWO_HAND_GRIP = { Index: 0.5, Middle: 0.5, Ring: 0.5, Pinky: 0.5, thumb: 0.1 };
const BOW_HAND_GRIP = { Index: -0.5, Middle: -0.45, Ring: -0.4, Pinky: -0.35, thumb: 0 };
const FITTED_HAND_GRIP = { Index: 1.2, Middle: 1.2, Ring: 1.2, Pinky: 1.2, thumb: 0.55 };
const NARROW_HAND_GRIP = { Index: 1.2, Middle: 1.2, Ring: 1.2, Pinky: 1.2, thumb: 0.55 };
const FITTED_GRIP_LOADOUTS = new Set(["staff", "mace", "shortswordOnly", "knife", "daggerSingle", "daggers", "rod"]);
const LOADOUT_GRIP_PRESETS = {
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

const PREVIEW_TEXTURE_URLS = {
  shortsword: URLS.shortswordPreviewTexture,
  staff: URLS.staffPreviewTexture,
  mace: URLS.macePreviewTexture,
  bow: URLS.bowPreviewTexture,
  knife: URLS.knifePreviewTexture,
  dagger: URLS.daggerPreviewTexture,
};

const REQUIRED_PREVIEW_TEXTURE_ASSETS = new Set([
  "shortsword", "staff", "mace", "bow", "knife", "dagger",
]);

const RUN_DIVE_GAP_NAME = "GapAuthored__SwimRunDiveWaterEntry";
const AUTHORED_GAP_LABELS = new Map([
  [RUN_DIVE_GAP_NAME, "DRAFT GAP — Run, dive, and enter water"],
  [BOW_TRIPLE_SHOT_NAME, "DRAFT BOW — Three-arrow multishot"],
  [BOW_AIM_RUN_NAME, "DRAFT BOW — Run forward while drawn"],
  [BOW_QUIVER_DRAW_NAME, "DRAFT BOW — Quiver draw to nock"],
  [BOW_RELEASE_NAME, "DRAFT BOW — Release from nock"],
  [GREATSWORD_TWO_HAND_SHEATHE_NAME, "DRAFT GREATSWORD — Two-hand shoulder sheathe"],
]);

const CATALOG_ACTIVITIES = [
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

const CATALOG_LOCOMOTION = [
  { key: "all", label: "All basic locomotion", matches: () => true },
  { key: "walking", label: "Walking", matches: (clipName) => /Walk/i.test(clipActionName(clipName)) },
  { key: "running", label: "Running and sprinting", matches: (clipName) => /Run|Sprint/i.test(clipActionName(clipName)) },
  { key: "jumping", label: "Jumping, falling, landing, and diving", matches: (clipName) => /Jump|Fall|Land|Dive/i.test(clipActionName(clipName)) },
  { key: "strafing", label: "Strafing", matches: (clipName) => /Strafe/i.test(clipActionName(clipName)) },
  { key: "turning", label: "Turning", matches: (clipName) => /Turn/i.test(clipActionName(clipName)) },
  { key: "crouching", label: "Crouch movement", matches: (clipName) => /Crouch/i.test(clipActionName(clipName)) },
];

const CATALOG_WEAPONS = [
  { key: "all", label: "All weapon types", matches: () => true },
  { key: "greatsword", label: "Greatsword", matches: (clipName) => sourcePrefix(clipName) === "GreatSword" },
  { key: "swordShield", label: "Sword and shield", matches: (clipName) => sourcePrefix(clipName) === "ProSwordAndShield" || /SwordShield/i.test(clipActionName(clipName)) },
  { key: "oneHand", label: "Axe and one-hand melee", matches: (clipName) => sourcePrefix(clipName) === "ProMeleeAxe" },
  { key: "staff", label: "Staff", matches: (clipName) => /Staff/i.test(clipActionName(clipName)) },
  { key: "bow", label: "Bow and arrow", matches: (clipName) => sourcePrefix(clipName) === "ProLongbow" || /Bow/i.test(clipActionName(clipName)) },
  { key: "rifle", label: "Rifle and shooter", matches: (clipName) => ["ProRifle", "BasicShooter", "Shooter"].includes(sourcePrefix(clipName)) },
];

const CATALOG_WEAPON_ACTIONS = [
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

const CATALOG_LOADOUT = {
  label: "Human Foundation V2 animation catalog",
  progression: "review-only",
  match: "raw source clip or clearly labeled authored gap draft, with no weapon, socket correction, IK, or grip overlay",
  missing: "400 original clips preserved + 5 new Mixamo locomotion clips; stair source travel retained; authored gap drafts remain separate",
  attachments: [],
};

const TARGET_HEIGHT_METERS = 2.06;
const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const status = document.querySelector("#status");
const reviewModeSelect = document.querySelector("#reviewMode");
const weaponSetSelect = document.querySelector("#weaponSet");
const weaponSetRow = document.querySelector("#weaponSetRow");
const catalogActivitySelect = document.querySelector("#catalogActivity");
const catalogActivityRow = document.querySelector("#catalogActivityRow");
const catalogLocomotionSelect = document.querySelector("#catalogLocomotion");
const catalogLocomotionRow = document.querySelector("#catalogLocomotionRow");
const catalogWeaponSelect = document.querySelector("#catalogWeapon");
const catalogWeaponRow = document.querySelector("#catalogWeaponRow");
const catalogActionTypeSelect = document.querySelector("#catalogActionType");
const catalogActionTypeRow = document.querySelector("#catalogActionTypeRow");
const actionLabel = document.querySelector("#actionLabel");
const actionSelect = document.querySelector("#action");
const staffGripSelect = document.querySelector("#staffGripStyle");
const staffGripRow = document.querySelector("#staffGripRow");
const staffGripTransition = { from: { spread: 0, roll: 0 }, to: { spread: 0, roll: 0 }, start: 0 };
function currentStaffGripStyle() {
  const t = THREE.MathUtils.smoothstep(performance.now() - staffGripTransition.start, 0, 700);
  return { spread: THREE.MathUtils.lerp(staffGripTransition.from.spread, staffGripTransition.to.spread, t), roll: THREE.MathUtils.lerp(staffGripTransition.from.roll, staffGripTransition.to.roll, t) };
}
const arrowCountInput = document.querySelector("#arrowCount");
const minimumBowRangeInput = document.querySelector("#minimumBowRange");
const timeInput = document.querySelector("#time");
const speedInput = document.querySelector("#speed");
const loopInput = document.querySelector("#loop");
const playButton = document.querySelector("#play");
const gripInputs = {
  Index: document.querySelector("#indexCurl"),
  Middle: document.querySelector("#middleCurl"),
  Ring: document.querySelector("#ringCurl"),
  Pinky: document.querySelector("#pinkyCurl"),
};
const thumbInput = document.querySelector("#thumb");
const leftGripInputs = {
  Index: document.querySelector("#leftIndexCurl"),
  Middle: document.querySelector("#leftMiddleCurl"),
  Ring: document.querySelector("#leftRingCurl"),
  Pinky: document.querySelector("#leftPinkyCurl"),
};
const leftThumbInput = document.querySelector("#leftThumb");
const twoHandEnabledInput = document.querySelector("#twoHandEnabled");
const twoHandTargetInputs = {
  x: document.querySelector("#twoHandTargetX"),
  y: document.querySelector("#twoHandTargetY"),
  z: document.querySelector("#twoHandTargetZ"),
};
const twoHandWristInputs = {
  x: document.querySelector("#twoHandWristX"),
  y: document.querySelector("#twoHandWristY"),
  z: document.querySelector("#twoHandWristZ"),
};
const socketInputs = {
  x: document.querySelector("#socketX"),
  y: document.querySelector("#socketY"),
  z: document.querySelector("#socketZ"),
  rx: document.querySelector("#rotationX"),
  ry: document.querySelector("#rotationY"),
  rz: document.querySelector("#rotationZ"),
  scale: document.querySelector("#weaponScale"),
};

for (const [key, loadout] of Object.entries(LOADOUTS)) {
  weaponSetSelect.add(new Option(loadout.label, key));
}

function isCatalogMode() {
  return reviewModeSelect.value === "catalog";
}

function activeLoadout() {
  return isCatalogMode() ? CATALOG_LOADOUT : LOADOUTS[weaponSetSelect.value];
}

function sourcePrefix(clipName) {
  return clipName.includes("__") ? clipName.split("__", 1)[0] : "Ungrouped";
}

function clipActionName(clipName) {
  return clipName.includes("__") ? clipName.split("__").at(-1) : clipName;
}

function isWeaponClip(clipName) {
  const prefix = sourcePrefix(clipName);
  const actionName = clipActionName(clipName);
  const weaponFamily = ["GreatSword", "ProSwordAndShield", "ProMeleeAxe", "ProLongbow", "ProRifle", "BasicShooter", "Shooter"].includes(prefix);
  return (weaponFamily && !/^Unarmed/i.test(actionName))
    || /Bow|SwordShield|Staff/i.test(actionName);
}

function isAttackClip(clipName) {
  return /Attack|Strike|Slash|Kick|Shoot|Firing|TossGrenade|StaffButtSmash|MagicAttack/i.test(clipActionName(clipName));
}

function isDefenseClip(clipName) {
  return /Block|Dodge|Parry/i.test(clipActionName(clipName));
}

function isLocomotionClip(clipName) {
  const actionName = clipActionName(clipName);
  return !/Swim|Climb|Death|Dying/i.test(actionName)
    && /Walk|Run|Sprint|Strafe|Turn|Jump|Fall|Land|Dive|Crouch/i.test(actionName);
}

function isBasicLocomotionClip(clipName) {
  const prefix = sourcePrefix(clipName);
  const actionName = clipActionName(clipName);
  const unarmedSource = ["BasicLocomotion", "MaleLocomotion"].includes(prefix)
    || (prefix === "ProMeleeAxe" && /^Unarmed/i.test(actionName))
    || (prefix === "Interactions" && /WalkInPlace/i.test(actionName));
  return unarmedSource && isLocomotionClip(clipName);
}

function isObjectInteractionClip(clipName) {
  return sourcePrefix(clipName) === "Interactions"
    && /Door|Container|Chest|Pickup|Harvest|PullHeavy|PushHeavy|PullLever|PushButton/i.test(clipActionName(clipName));
}

function isSocialClip(clipName) {
  return sourcePrefix(clipName) === "Interactions"
    && /Beckon|Greet|Nod|ShakeNo|Point|Talk|Think|Wave/i.test(clipActionName(clipName));
}

function isMagicClip(clipName) {
  return sourcePrefix(clipName) === "ProMagic" || /Magic|Cast|Spell|PowerUp/i.test(clipActionName(clipName));
}

function isReactionClip(clipName) {
  return /React|Impact|HitReaction/i.test(clipActionName(clipName));
}

function isDeathClip(clipName) {
  return /Death|Dying/i.test(clipActionName(clipName));
}

function isIdleClip(clipName) {
  return /Idle|Looking|Examine/i.test(clipActionName(clipName));
}

function catalogFilter(definitions, key) {
  return definitions.find((definition) => definition.key === key) ?? definitions[0];
}

function catalogClips(
  activityKey = catalogActivitySelect.value,
  weaponKey = catalogWeaponSelect.value,
  actionTypeKey = catalogActionTypeSelect.value,
  locomotionKey = catalogLocomotionSelect.value,
) {
  const activity = catalogFilter(CATALOG_ACTIVITIES, activityKey);
  const weapon = catalogFilter(CATALOG_WEAPONS, weaponKey);
  const actionType = catalogFilter(CATALOG_WEAPON_ACTIONS, actionTypeKey);
  const locomotion = catalogFilter(CATALOG_LOCOMOTION, locomotionKey);
  return [...(actor?.clips?.keys() ?? [])].filter((clipName) => (
    activity.matches(clipName)
      && (activity.key !== "weapons" || (weapon.matches(clipName) && actionType.matches(clipName)))
      && (activity.key !== "locomotion" || locomotion.matches(clipName))
  ));
}

function replaceCountedOptions(select, definitions, countForDefinition) {
  const previousValue = select.value;
  select.replaceChildren();
  for (const definition of definitions) {
    const count = countForDefinition(definition);
    if (!count) continue;
    select.add(new Option(`${definition.label} — ${count}`, definition.key));
  }
  if ([...select.options].some(({ value }) => value === previousValue)) select.value = previousValue;
}

function populateCatalogFilters() {
  replaceCountedOptions(
    catalogActivitySelect,
    CATALOG_ACTIVITIES,
    ({ key }) => catalogClips(key, "all", "all", "all").length,
  );
  replaceCountedOptions(
    catalogLocomotionSelect,
    CATALOG_LOCOMOTION,
    ({ key }) => catalogClips("locomotion", "all", "all", key).length,
  );
  replaceCountedOptions(
    catalogWeaponSelect,
    CATALOG_WEAPONS,
    ({ key }) => catalogClips("weapons", key, "all").length,
  );
  replaceCountedOptions(
    catalogActionTypeSelect,
    CATALOG_WEAPON_ACTIONS,
    ({ key }) => catalogClips("weapons", catalogWeaponSelect.value, key).length,
  );
}

function updateReviewControls() {
  const catalogMode = isCatalogMode();
  const weaponCatalog = catalogMode && catalogActivitySelect.value === "weapons";
  const locomotionCatalog = catalogMode && catalogActivitySelect.value === "locomotion";
  weaponSetRow.hidden = isCatalogMode();
  catalogActivityRow.hidden = !catalogMode;
  catalogLocomotionRow.hidden = !locomotionCatalog;
  catalogWeaponRow.hidden = !weaponCatalog;
  catalogActionTypeRow.hidden = !weaponCatalog;
  actionLabel.textContent = isCatalogMode() ? "Source clip" : "Action";
  arrowCountInput.disabled = isCatalogMode() || weaponSetSelect.value !== "bow";
  staffGripRow.hidden = catalogMode || weaponSetSelect.value !== "staff";
  staffGripSelect.disabled = !staffUsesSupportHand(actionSelect.value);
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "default" });
} catch (error) {
  status.textContent = `WEBGL ERROR\n${error}`;
  throw error;
}
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = false;
renderer.domElement.addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  status.textContent = "WEBGL CONTEXT LOST\nClose the other 3D preview tab, then reload this page.";
});
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x11151b);
scene.add(new THREE.HemisphereLight(0xc8ddff, 0x1e1813, 2.2));
const keyLight = new THREE.DirectionalLight(0xffe6ca, 5.2);
keyLight.position.set(2.5, 4.5, 4);
keyLight.castShadow = true;
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x86b6ff, 3.1);
rimLight.position.set(-4, 2, -3);
scene.add(rimLight);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(9, 6),
  new THREE.MeshStandardMaterial({ color: 0x20262f, roughness: 0.94 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.02, 40);
camera.position.set(0, 1.3, 4.2);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableRotate = true;
controls.enableZoom = true;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.minDistance = 0.45;
controls.maxDistance = 14;
controls.target.set(0, 1.05, 0);

function stripHelpers(model) {
  const helpers = [];
  model.traverse((object) => {
    if (object.isCamera || object.isLight || (/^(?:Cube|Icosphere)$/i.test(object.name) && !object.isSkinnedMesh)) {
      helpers.push(object);
    } else if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  helpers.forEach((helper) => helper.removeFromParent());
}

function normalizeBoneName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findBone(bones, suffix) {
  const wanted = normalizeBoneName(`mixamorig${suffix}`);
  return [...bones.values()].find((bone) => normalizeBoneName(bone.name) === wanted)
    ?? [...bones.values()].find((bone) => normalizeBoneName(bone.name).endsWith(normalizeBoneName(suffix)));
}

function collectPoints(model, limit = 24000, includeMesh = () => true) {
  model.updateMatrixWorld(true);
  const points = [];
  const point = new THREE.Vector3();
  model.traverse((object) => {
    const position = object.geometry?.attributes?.position;
    if (!object.isMesh || !position || !includeMesh(object)) return;
    const stride = Math.max(1, Math.ceil(position.count / limit));
    for (let index = 0; index < position.count; index += stride) {
      points.push(point.fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld).clone());
    }
  });
  return points;
}

function principalAxis(points) {
  const mean = points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / points.length);
  let xx = 0; let xy = 0; let xz = 0; let yy = 0; let yz = 0; let zz = 0;
  for (const point of points) {
    const x = point.x - mean.x; const y = point.y - mean.y; const z = point.z - mean.z;
    xx += x * x; xy += x * y; xz += x * z; yy += y * y; yz += y * z; zz += z * z;
  }
  let axis = new THREE.Vector3(0.4, 1, 0.2).normalize();
  for (let iteration = 0; iteration < 16; iteration += 1) {
    axis = new THREE.Vector3(
      xx * axis.x + xy * axis.y + xz * axis.z,
      xy * axis.x + yy * axis.y + yz * axis.z,
      xz * axis.x + yz * axis.y + zz * axis.z,
    ).normalize();
  }
  return axis;
}

function principalAxisUnsigned(vectors) {
  let xx = 0; let xy = 0; let xz = 0; let yy = 0; let yz = 0; let zz = 0;
  for (const vector of vectors) {
    xx += vector.x * vector.x; xy += vector.x * vector.y; xz += vector.x * vector.z;
    yy += vector.y * vector.y; yz += vector.y * vector.z; zz += vector.z * vector.z;
  }
  let axis = new THREE.Vector3(0.3, 0.5, 1).normalize();
  for (let iteration = 0; iteration < 16; iteration += 1) {
    axis = new THREE.Vector3(
      xx * axis.x + xy * axis.y + xz * axis.z,
      xy * axis.x + yy * axis.y + yz * axis.z,
      xz * axis.x + yz * axis.y + zz * axis.z,
    ).normalize();
  }
  return axis;
}

function collectNormals(model, limit = 24000) {
  model.updateMatrixWorld(true);
  const normals = [];
  const normal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  model.traverse((object) => {
    const attribute = object.geometry?.attributes?.normal;
    if (!object.isMesh || !attribute) return;
    normalMatrix.getNormalMatrix(object.matrixWorld);
    const stride = Math.max(1, Math.ceil(attribute.count / limit));
    for (let index = 0; index < attribute.count; index += stride) {
      normals.push(normal.fromBufferAttribute(attribute, index).applyNormalMatrix(normalMatrix).normalize().clone());
    }
  });
  return normals;
}

function endRadius(points, bounds, atMaximum) {
  const band = (bounds.max.y - bounds.min.y) * 0.24;
  const selected = points.filter((point) => atMaximum ? point.y >= bounds.max.y - band : point.y <= bounds.min.y + band);
  if (!selected.length) return 0;
  return selected.reduce((sum, point) => sum + Math.hypot(point.x, point.z), 0) / selected.length;
}

function prepareAsset(source, assetName) {
  const spec = ASSET_SPECS[assetName];
  const visual = source.clone(true);
  stripHelpers(visual);
  if (spec.canonical) {
    visual.name = `${assetName}-visual`;
    visual.updateMatrixWorld(true);
    return {
      visual,
      sourceLength: spec.targetLength,
      targetLength: spec.targetLength,
      normalizedBounds: new THREE.Box3().setFromObject(visual, true),
    };
  }

  const wrapper = new THREE.Group();
  wrapper.name = `${assetName}-normalized`;
  wrapper.add(visual);
  const sourcePoints = collectPoints(visual);
  if (spec.planar) {
    const normalAxis = principalAxisUnsigned(collectNormals(visual));
    visual.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(normalAxis, new THREE.Vector3(0, 0, 1)));
    visual.updateMatrixWorld(true);
    const verticalAxis = principalAxis(collectPoints(visual));
    verticalAxis.z = 0;
    if (verticalAxis.lengthSq() > 0.0001) {
      visual.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(verticalAxis.normalize(), new THREE.Vector3(0, 1, 0)));
    }
    visual.traverse((object) => {
      if (!object.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const replacements = materials.map((material) => {
        const replacement = material.clone();
        replacement.side = THREE.DoubleSide;
        return replacement;
      });
      object.material = Array.isArray(object.material) ? replacements : replacements[0];
    });
  } else {
    const align = new THREE.Quaternion().setFromUnitVectors(principalAxis(sourcePoints), new THREE.Vector3(0, 1, 0));
    visual.quaternion.premultiply(align);
  }
  visual.updateMatrixWorld(true);
  let points = collectPoints(visual).map((point) => point.clone());
  let bounds = new THREE.Box3().setFromPoints(points);
  const minRadius = endRadius(points, bounds, false);
  const maxRadius = endRadius(points, bounds, true);
  const largeEndIsMaximum = maxRadius > minRadius;
  const sourceCenter = bounds.getCenter(new THREE.Vector3());
  const guardPoint = spec.gripEnd === "hilt" ? points.reduce((widest, point) => (
    Math.hypot(point.x - sourceCenter.x, point.z - sourceCenter.z)
      > Math.hypot(widest.x - sourceCenter.x, widest.z - sourceCenter.z) ? point : widest
  )) : null;
  // A sword's narrowest end is the blade tip, not its handle. The crossguard
  // sits close to the pommel end; orient that end downward before grip anchoring.
  const shouldFlip = !spec.planar && ((spec.gripEnd === "large" && largeEndIsMaximum)
    || (spec.gripEnd === "small" && !largeEndIsMaximum)
    || (guardPoint && guardPoint.y > sourceCenter.y));
  if (shouldFlip) {
    if (spec.gripEnd === "hilt") {
      // Flip in normalized world axes, not the generated root's original axes.
      visual.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI));
    } else visual.rotateZ(Math.PI);
    visual.updateMatrixWorld(true);
    points = collectPoints(visual).map((point) => point.clone());
    bounds = new THREE.Box3().setFromPoints(points);
  }

  const sourceLength = bounds.max.y - bounds.min.y;
  const scale = spec.targetLength / sourceLength;
  visual.scale.multiplyScalar(scale);
  visual.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(visual, true);
  const center = bounds.getCenter(new THREE.Vector3());
  const anchorY = THREE.MathUtils.lerp(bounds.min.y, bounds.max.y, spec.gripFraction);
  visual.position.x -= center.x;
  visual.position.y -= anchorY;
  visual.position.z -= center.z;
  visual.updateMatrixWorld(true);
  if (spec.radialScale) wrapper.scale.set(spec.radialScale, 1, spec.radialScale);
  const normalizedBounds = new THREE.Box3().setFromObject(wrapper, true);
  return { visual: wrapper, sourceLength, targetLength: spec.targetLength, normalizedBounds };
}

function createActor(bodySource, clips) {
  const model = cloneSkeleton(bodySource);
  stripHelpers(model);
  const bounds = new THREE.Box3().setFromObject(model, true);
  model.scale.setScalar(TARGET_HEIGHT_METERS / (bounds.max.y - bounds.min.y));
  scene.add(model);
  const bones = new Map();
  model.traverse((object) => { if (object.isBone) bones.set(object.name, object); });
  return {
    model,
    bones,
    bindFingerQuaternions: new Map([...bones].filter(([name]) => /Hand(Index|Middle|Ring|Pinky|Thumb)/.test(name))
      .map(([name, bone]) => [name, bone.quaternion.clone()])),
    mixer: new THREE.AnimationMixer(model),
    clips: new Map(clips.map((clip) => [clip.name, clip])),
    sourceClipCount: clips.length,
    authoredGapCount: 0,
    sockets: [],
    primary: null,
    action: null,
    overlay: new Map(),
    fittedOverlayBase: new Map(),
    ikBase: new Map(),
    bowIKBase: new Map(),
    bowString: null,
    arrowBundle: null,
    quiverHarness: null,
    handArrowExtras: [],
    projectile: null,
  };
}

function buildRunDiveWaterEntryGap(actor) {
  const sourceNames = {
    run: "MaleLocomotion__StandardRun",
    dive: "ProMeleeAxe__UnarmedJumpRunning",
    swim: "Interactions__HumanMasculineAthleticMuscularSwimForwardLoop",
  };
  const sources = Object.fromEntries(Object.entries(sourceNames).map(([phase, clipName]) => {
    const clip = actor.clips.get(clipName);
    if (!clip) throw new Error(`Cannot author ${RUN_DIVE_GAP_NAME}: missing ${phase} source ${clipName}.`);
    return [phase, clip];
  }));

  const sampleModel = cloneSkeleton(actor.model);
  const sampleMixer = new THREE.AnimationMixer(sampleModel);
  const actions = Object.fromEntries(Object.entries(sources).map(([phase, clip]) => {
    const action = sampleMixer.clipAction(clip);
    action.enabled = true;
    action.play();
    return [phase, action];
  }));
  const bones = [];
  sampleModel.traverse((object) => { if (object.isBone) bones.push(object); });

  const duration = 3.2;
  const framesPerSecond = 30;
  const sampleCount = Math.round(duration * framesPerSecond) + 1;
  const times = [];
  const positions = new Map(bones.map((bone) => [bone.name, []]));
  const quaternions = new Map(bones.map((bone) => [bone.name, []]));
  const fade = (value) => THREE.MathUtils.smoothstep(value, 0, 1);

  for (let frame = 0; frame < sampleCount; frame += 1) {
    const time = Math.min(frame / framesPerSecond, duration);
    const runToDive = fade((time - 1.05) / 0.3);
    const diveToSwim = fade((time - 2.05) / 0.3);
    const weights = {
      run: 1 - runToDive,
      dive: runToDive * (1 - diveToSwim),
      swim: diveToSwim,
    };
    actions.run.time = ((time / 0.88) % 1) * sources.run.duration;
    actions.dive.time = THREE.MathUtils.clamp((time - 1.05) / 1.3, 0, 1) * sources.dive.duration;
    actions.swim.time = ((Math.max(0, time - 2.05) / 1.05) % 1) * sources.swim.duration;
    for (const [phase, action] of Object.entries(actions)) action.setEffectiveWeight(weights[phase]);
    sampleMixer.update(0);
    times.push(time);
    for (const bone of bones) {
      positions.get(bone.name).push(...bone.position.toArray());
      quaternions.get(bone.name).push(...bone.quaternion.toArray());
    }
  }

  const tracks = [];
  for (const bone of bones) {
    tracks.push(new THREE.VectorKeyframeTrack(`${bone.name}.position`, times, positions.get(bone.name)));
    tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, quaternions.get(bone.name)));
  }
  sampleMixer.stopAllAction();
  sampleMixer.uncacheRoot(sampleModel);
  const clip = new THREE.AnimationClip(RUN_DIVE_GAP_NAME, duration, tracks);
  clip.userData = {
    status: "draft",
    gap: "continuous unarmed run-up, forward dive, and transition into a forward swim",
    sources: Object.values(sourceNames),
  };
  clip.optimize();
  return clip;
}

function buildBowThreeArrowMultishot(actor) {
  const sourceName = "Interactions__HumanMasculineAthleticMuscularBowShoot";
  const source = actor.clips.get(sourceName);
  if (!source) throw new Error(`Cannot author ${BOW_TRIPLE_SHOT_NAME}: missing source ${sourceName}.`);
  const clip = source.clone();
  clip.name = BOW_TRIPLE_SHOT_NAME;
  clip.userData = {
    status: "draft",
    gap: "three arrows visibly drawn from the quiver, nocked together, and released in a spread",
    sources: [sourceName],
  };
  return clip;
}

function buildBowAimRunForward(actor) {
  const runName = "ProLongbow__StandingRunForward";
  const aimName = "ProLongbow__StandingAimWalkForward";
  const run = actor.clips.get(runName);
  const aim = actor.clips.get(aimName);
  if (!run || !aim) throw new Error(`Cannot author ${BOW_AIM_RUN_NAME}: missing ${!run ? runName : aimName}.`);
  const upperBodyTrack = (track) => /Spine|Neck|Head|Shoulder|Arm|ForeArm|Hand/i.test(track.name);
  const tracks = run.tracks.filter((track) => !upperBodyTrack(track)).map((track) => track.clone());
  for (const sourceTrack of aim.tracks.filter(upperBodyTrack)) {
    const track = sourceTrack.clone();
    track.scale(run.duration / aim.duration);
    tracks.push(track);
  }
  const clip = new THREE.AnimationClip(BOW_AIM_RUN_NAME, run.duration, tracks);
  clip.userData = {
    status: "draft",
    gap: "forward bow run with the upper body maintaining a nocked, drawn aiming pose",
    sources: [runName, aimName],
  };
  clip.optimize();
  return clip;
}

function buildBowQuiverDrawToNock(actor) {
  const sourceName = "Interactions__HumanMasculineAthleticMuscularBowDrawArrow";
  const source = actor.clips.get(sourceName);
  if (!source) throw new Error(`Cannot author ${BOW_QUIVER_DRAW_NAME}: missing source ${sourceName}.`);
  const clip = source.clone();
  clip.name = BOW_QUIVER_DRAW_NAME;
  clip.userData = {
    status: "draft",
    gap: "drive the elbow back, grip the fletching, withdraw beside the head, lower the held arrow to the waist, then present and nock",
    sources: [sourceName],
  };
  return clip;
}

function buildBowReleaseFromNock(actor) {
  const sourceName = "Interactions__HumanMasculineAthleticMuscularBowShoot";
  const source = actor.clips.get(sourceName);
  if (!source) throw new Error(`Cannot author ${BOW_RELEASE_NAME}: missing source ${sourceName}.`);
  const framesPerSecond = 30;
  const startFrame = Math.floor(source.duration * 0.48 * framesPerSecond);
  const endFrame = Math.ceil(source.duration * 0.82 * framesPerSecond);
  const clip = THREE.AnimationUtils.subclip(source, BOW_RELEASE_NAME, startFrame, endFrame, framesPerSecond);
  clip.userData = {
    status: "draft",
    gap: "release and follow-through from an already-nocked arrow without a second quiver retrieval",
    sources: [sourceName],
  };
  return clip;
}

function buildBowCloseRangeStrike(actor) {
  const sourceName = "Interactions__HumanMasculineAthleticMuscularStaffButtSmash";
  const source = actor.clips.get(sourceName);
  if (!source) throw new Error(`Cannot author ${BOW_STRIKE_NAME}: missing source ${sourceName}.`);
  const clip = source.clone();
  clip.name = BOW_STRIKE_NAME;
  clip.userData = {
    status: "draft",
    gap: "close-range bow-body strike used when an enemy is inside the minimum safe ranged distance",
    sources: [sourceName],
    combat: {
      role: "close-range-fallback",
      contactNormalizedTime: 0.52,
      alternatives: ["swap-to-melee"],
    },
  };
  return clip;
}

function buildGreatswordTwoHandSheathe(actor) {
  const sourceName = "GreatSword__GreatSwordIdle";
  const source = actor.clips.get(sourceName);
  if (!source) throw new Error(`Cannot author ${GREATSWORD_TWO_HAND_SHEATHE_NAME}: missing source ${sourceName}.`);
  const duration = 4;
  const timeScale = duration / source.duration;
  const tracks = source.tracks.map((sourceTrack) => {
    const track = sourceTrack.clone();
    track.scale(timeScale);
    return track;
  });
  const clip = new THREE.AnimationClip(GREATSWORD_TWO_HAND_SHEATHE_NAME, duration, tracks);
  clip.userData = {
    status: "draft",
    gap: "dedicated four-second two-hand transfer: guard, dominant-shoulder lift, blade turn, then slow guided back insertion",
    sources: [sourceName],
  };
  clip.optimize();
  return clip;
}

function addAuthoredGapClips(actor) {
  const clips = [
    buildRunDiveWaterEntryGap(actor),
    buildBowThreeArrowMultishot(actor),
    buildBowAimRunForward(actor),
    buildBowQuiverDrawToNock(actor),
    buildBowReleaseFromNock(actor),
    buildBowCloseRangeStrike(actor),
    buildGreatswordTwoHandSheathe(actor),
    ...buildStaffFightingClips(actor),
  ];
  for (const clip of clips) actor.clips.set(clip.name, clip);
  actor.authoredGapCount = clips.length;
}

function buildArrowBundle(actor, preparedAssets) {
  actor.arrowBundle = null;
  const quiver = actor.sockets.find(({ role, asset }) => role === "back" && /quiver/i.test(asset));
  const config = LOADOUTS.bow.arrowBundle;
  const bone = findBone(actor.bones, config.bone);
  if (!quiver || !bone || !preparedAssets.has("arrow")) return;
  const preparedArrow = preparedAssets.get("arrow");
  const socket = new THREE.Group();
  socket.name = "inventory-socket-arrow-bundle";
  socket.scale.setScalar(1 / actor.model.scale.x);
  socket.position.fromArray(config.position).multiplyScalar(1 / actor.model.scale.x);
  socket.rotation.fromArray(config.rotation);
  bone.add(socket);
  preparedArrow.visual.updateMatrixWorld(true);
  const rootInverse = preparedArrow.visual.matrixWorld.clone().invert();
  const meshes = [];
  preparedArrow.visual.traverse((sourceMesh) => {
    if (!sourceMesh.isMesh) return;
    const geometry = sourceMesh.geometry.clone();
    geometry.applyMatrix4(rootInverse.clone().multiply(sourceMesh.matrixWorld));
    const fill = new THREE.InstancedMesh(geometry, sourceMesh.material, config.capacity);
    fill.name = `arrow-bundle-real-arrow-${meshes.length}`;
    fill.castShadow = false;
    fill.receiveShadow = false;
    fill.frustumCulled = false;
    fill.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    meshes.push(fill);
  });
  if (!meshes.length) throw new Error("The textured arrow source has no renderable mesh for the quiver fill.");

  const placement = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const arrowheadDown = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const quiverBounds = quiver.prepared.normalizedBounds;
  const arrowBounds = preparedArrow.normalizedBounds;
  const arrowBaseY = quiverBounds.min.y + 0.025 + arrowBounds.max.y;
  const placements = [];
  for (let index = 0; index < config.capacity; index += 1) {
    const radius = 0.003 + 0.019 * Math.sqrt((index + 0.5) / config.capacity);
    const angle = index * goldenAngle;
    position.set(Math.cos(angle) * radius, arrowBaseY + (index % 5) * 0.0015, Math.sin(angle) * radius);
    rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle * 0.12).multiply(arrowheadDown);
    placement.compose(position, rotation, scale);
    for (const fill of meshes) fill.setMatrixAt(index, placement);
    placements.push(position.clone());
  }
  for (const fill of meshes) fill.instanceMatrix.needsUpdate = true;
  socket.add(...meshes);
  actor.arrowBundle = {
    socket,
    bone: config.bone,
    meshes,
    placements,
    quiverOpeningLocal: new THREE.Vector3(0, quiverBounds.max.y - 0.012, 0),
    // The approved arrow points +Y in hand and is flipped head-down only for
    // storage. Grip the lower half of the fletching, where the pinched fingers
    // can actually reach without sliding beside the feathers.
    pickupLocal: new THREE.Vector3(0, arrowBaseY - arrowBounds.min.y - 0.14, 0),
    arrowBounds: arrowBounds.clone(),
    clearExtractionMeters: quiverBounds.getSize(new THREE.Vector3()).y + 0.1,
    bundleRadiusMeters: 0.022,
    localSignature: placements.map((value) => value.toArray().map((component) => component.toFixed(5)).join(",")).join("|"),
    totalInventory: 0,
    displayedInQuiver: 0,
    handArrowVisible: false,
  };
}

function disposeArrowBundle(actor) {
  if (!actor.arrowBundle) return;
  for (const mesh of actor.arrowBundle.meshes) {
    mesh.geometry.dispose();
  }
  actor.arrowBundle.socket.removeFromParent();
  actor.arrowBundle = null;
}

function buildQuiverHarness(actor) {
  actor.quiverHarness = null;
  const harness = actor.sockets.find(({ role, asset }) => role === "harness" && asset === "harness");
  if (!harness) return;
  harness.visual.removeFromParent();
  const visual = new THREE.Group();
  visual.name = "body-conforming-off-shoulder-quiver-harness";
  const material = new THREE.MeshStandardMaterial({
    color: 0x5c2d1c,
    roughness: 0.72,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const strapNames = ["off-shoulder-sling"];
  const straps = strapNames.map((name) => {
    const geometry = new THREE.BufferGeometry();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `quiver-harness-strap-${name}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    visual.add(mesh);
    return mesh;
  });
  harness.socket.add(visual);
  harness.visual = visual;
  harness.visible = true;
  actor.quiverHarness = {
    mesh: visual,
    harness,
    straps,
    sampledPoints: [],
    integratedAsset: true,
    strapCount: straps.length,
  };
  updateQuiverHarness(actor);
}

function harnessPath(controlPoints, samples = 48) {
  return new THREE.CatmullRomCurve3(controlPoints, false, "centripetal").getPoints(samples);
}

function updateHarnessRibbon(mesh, socket, centerlineWorld, torsoCenterWorld, torsoUpWorld, widthMeters = 0.026) {
  const positions = [];
  const indices = [];
  const halfWidth = widthMeters * 0.5;
  for (let index = 0; index < centerlineWorld.length; index += 1) {
    const previous = centerlineWorld[Math.max(0, index - 1)];
    const next = centerlineWorld[Math.min(centerlineWorld.length - 1, index + 1)];
    const tangent = next.clone().sub(previous).normalize();
    const surfaceNormal = centerlineWorld[index].clone().sub(torsoCenterWorld);
    surfaceNormal.addScaledVector(torsoUpWorld, -surfaceNormal.dot(torsoUpWorld)).normalize();
    const across = new THREE.Vector3().crossVectors(surfaceNormal, tangent).normalize();
    if (across.lengthSq() < 1e-8) across.copy(bodyDirection(new THREE.Vector3(1, 0, 0)));
    const left = socket.worldToLocal(centerlineWorld[index].clone().addScaledVector(across, halfWidth));
    const right = socket.worldToLocal(centerlineWorld[index].clone().addScaledVector(across, -halfWidth));
    positions.push(...left.toArray(), ...right.toArray());
    if (index < centerlineWorld.length - 1) {
      const vertex = index * 2;
      indices.push(vertex, vertex + 2, vertex + 1, vertex + 1, vertex + 2, vertex + 3);
    }
  }
  mesh.geometry.dispose();
  mesh.geometry = new THREE.BufferGeometry();
  mesh.geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  mesh.geometry.setIndex(indices);
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingSphere();
}

function updateQuiverHarness(actor) {
  const state = actor.quiverHarness;
  const harness = state?.harness;
  if (!harness || state.straps?.length !== 1) return;
  actor.model.updateMatrixWorld(true);
  harness.socket.updateWorldMatrix(true, true);
  const leftShoulder = findBone(actor.bones, "LeftShoulder")?.getWorldPosition(new THREE.Vector3());
  const rightShoulder = findBone(actor.bones, "RightShoulder")?.getWorldPosition(new THREE.Vector3());
  const spine1 = findBone(actor.bones, "Spine1")?.getWorldPosition(new THREE.Vector3());
  const spine2 = findBone(actor.bones, "Spine2")?.getWorldPosition(new THREE.Vector3());
  const quiver = actor.sockets.find(({ role, asset }) => role === "back" && asset === "quiver");
  if (!leftShoulder || !rightShoulder || !spine1 || !spine2 || !quiver) return;
  const right = rightShoulder.clone().sub(leftShoulder).normalize();
  const torsoUp = spine2.clone().sub(spine1).normalize();
  const modelForward = bodyDirection(new THREE.Vector3(0, 0, 1));
  const forward = new THREE.Vector3().crossVectors(torsoUp, right).normalize();
  if (forward.dot(modelForward) < 0) forward.negate();
  const up = new THREE.Vector3().crossVectors(right, forward).normalize();
  if (up.dot(torsoUp) < 0) up.negate();
  const back = forward.clone().negate();
  const chestCenter = spine1.clone().lerp(spine2, 0.35);
  const topRight = rightShoulder.clone().addScaledVector(up, 0.012);
  const lowerLeft = chestCenter.clone().addScaledVector(right, -0.17).addScaledVector(up, -0.2);
  const frontTorsoDepth = 0.185;
  const lowerTorsoDepth = 0.16;
  const shoulderFront = topRight.clone()
    .addScaledVector(forward, 0.145)
    .addScaledVector(right, 0.025);
  const diagonalUpper = chestCenter.clone()
    .addScaledVector(right, 0.045)
    .addScaledVector(up, 0.055)
    .addScaledVector(forward, frontTorsoDepth);
  const diagonalLower = chestCenter.clone()
    .addScaledVector(right, -0.07)
    .addScaledVector(up, -0.075)
    .addScaledVector(forward, frontTorsoDepth);
  const quiverUpper = quiver.socket.localToWorld(new THREE.Vector3(0, 0.15, 0));
  const quiverLower = quiver.socket.localToWorld(new THREE.Vector3(0, -0.15, 0));
  const routes = [
    [
      quiverUpper,
      topRight.clone().addScaledVector(back, 0.09).addScaledVector(right, 0.02),
      topRight.clone().addScaledVector(back, 0.055).addScaledVector(right, 0.06),
      topRight.clone().addScaledVector(right, 0.085),
      topRight.clone().addScaledVector(forward, 0.055).addScaledVector(right, 0.06),
      shoulderFront,
      diagonalUpper,
      diagonalLower,
      lowerLeft.clone().addScaledVector(forward, lowerTorsoDepth),
      lowerLeft.clone().addScaledVector(right, -0.055),
      lowerLeft.clone().addScaledVector(back, lowerTorsoDepth),
      quiverLower,
    ],
  ];
  routes.forEach((route, index) => updateHarnessRibbon(
    state.straps[index],
    harness.socket,
    harnessPath(route),
    chestCenter,
    up,
  ));
  state.fitDiagnostic = {
    style: "single-off-shoulder-sling",
    torsoUpAlignment: up.dot(torsoUp),
    shoulderToWaistDropMeters: shoulderFront.clone().sub(lowerLeft).dot(torsoUp),
    frontSurfaceWaypointCount: 4,
  };
  actor.quiverHarness.sampledPoints = collectPoints(harness.visual, 900);
}

function disposeQuiverHarness(actor) {
  if (!actor.quiverHarness) return;
  actor.quiverHarness = null;
}

function buildBowStringRig(actor) {
  actor.bowString = null;
  const bow = actor.sockets.find(({ role, asset }) => role === "primary" && asset === "bow");
  if (!bow) return;
  let rig = null;
  bow.visual.traverse((mesh) => {
    if (rig || !mesh.isMesh || !mesh.geometry?.attributes?.position || !mesh.geometry.index) return;
    mesh.geometry = mesh.geometry.clone();
    const position = mesh.geometry.attributes.position;
    mesh.geometry.computeBoundingBox();
    const bounds = mesh.geometry.boundingBox;
    const size = bounds.getSize(new THREE.Vector3());
    if (size.y < 0.5 || size.x <= 0) return;
    const chordLimit = bounds.min.x + size.x * 0.05;
    const centerZ = (bounds.min.z + bounds.max.z) * 0.5;
    const thicknessLimit = size.z * 0.1;
    const lower = bounds.min.y + size.y * 0.04;
    const upper = bounds.max.y - size.y * 0.04;
    const stringVertex = (index) => position.getX(index) <= chordLimit
      && Math.abs(position.getZ(index) - centerZ) <= thicknessLimit;
    const staticStringVertex = (index) => position.getX(index) <= bounds.min.x + size.x * 0.08
      && Math.abs(position.getZ(index) - centerZ) <= size.z * 0.18;
    const sourceIndex = mesh.geometry.index;
    const kept = [];
    let removedTriangles = 0;
    for (let offset = 0; offset < sourceIndex.count; offset += 3) {
      const triangle = [sourceIndex.getX(offset), sourceIndex.getX(offset + 1), sourceIndex.getX(offset + 2)];
      const isStringTriangle = triangle.every((index) => staticStringVertex(index)
        && position.getY(index) >= lower
        && position.getY(index) <= upper);
      if (isStringTriangle) removedTriangles += 1;
      else kept.push(...triangle);
    }
    if (removedTriangles < 100) return;
    mesh.geometry.setIndex(kept);
    mesh.geometry.clearGroups();
    mesh.geometry.addGroup(0, kept.length, 0);
    mesh.geometry.computeBoundingSphere();

    const lowerAnchor = new THREE.Vector3();
    const upperAnchor = new THREE.Vector3();
    let lowerCount = 0;
    let upperCount = 0;
    for (let index = 0; index < position.count; index += 1) {
      const y = position.getY(index);
      if (!stringVertex(index)) continue;
      const vertex = new THREE.Vector3(position.getX(index), y, position.getZ(index));
      if (y >= bounds.min.y + size.y * 0.04 && y <= bounds.min.y + size.y * 0.12) {
        lowerAnchor.add(vertex);
        lowerCount += 1;
      }
      if (y >= bounds.min.y + size.y * 0.88 && y <= bounds.min.y + size.y * 0.96) {
        upperAnchor.add(vertex);
        upperCount += 1;
      }
    }
    if (!lowerCount || !upperCount) throw new Error("Bow string rig could not locate both limb-tip anchors.");
    lowerAnchor.multiplyScalar(1 / lowerCount);
    upperAnchor.multiplyScalar(1 / upperCount);
    const restNock = lowerAnchor.clone().lerp(upperAnchor, 0.5);
    const stringMaterial = new THREE.MeshStandardMaterial({ color: 0x7b5735, roughness: 0.9, metalness: 0 });
    const stringGeometry = new THREE.CylinderGeometry(0.0022, 0.0022, 1, 8, 1, true);
    const lowerSegment = new THREE.Mesh(stringGeometry, stringMaterial);
    const upperSegment = new THREE.Mesh(stringGeometry.clone(), stringMaterial);
    lowerSegment.name = "dynamic-bow-string-lower";
    upperSegment.name = "dynamic-bow-string-upper";
    lowerSegment.frustumCulled = false;
    upperSegment.frustumCulled = false;
    mesh.add(lowerSegment, upperSegment);
    rig = {
      host: mesh,
      lowerAnchor,
      upperAnchor,
      restNock,
      lowerSegment,
      upperSegment,
      currentNockWorld: new THREE.Vector3(),
      removedTriangles,
    };
  });
  if (!rig) throw new Error("Bow string rig could not isolate the modeled straight string.");
  actor.bowString = { ...rig, pulled: false, pullAlpha: 0, nockErrorMeters: null };
}

function bowStringPullAlpha(state) {
  if (!state.handArrowVisible) return 0;
  const clipName = actor?.action?.getClip().name ?? "";
  const normalizedTime = Number(timeInput.value);
  if (["ProLongbow__StandingAimOverdraw", "ProLongbow__StandingAimWalkForward", BOW_AIM_RUN_NAME].includes(clipName)) return 1;
  if (clipName === BOW_QUIVER_DRAW_NAME) {
    return THREE.MathUtils.smoothstep(normalizedTime, BOW_DRAW_TIMING.nocked - 0.12, BOW_DRAW_TIMING.nocked);
  }
  if (clipName === BOW_RELEASE_NAME) {
    return 1 - THREE.MathUtils.smoothstep(normalizedTime, BOW_RELEASE_TIMING.release, BOW_RELEASE_TIMING.release + 0.08);
  }
  if (clipName === BOW_TRIPLE_SHOT_NAME) {
    const nockedTime = BOW_TIMING.tripleArrowNocked;
    return THREE.MathUtils.smoothstep(normalizedTime, nockedTime - 0.1, nockedTime);
  }
  return 0;
}

function updateBowString(actor, state) {
  if (!actor.bowString) return;
  const pullAlpha = bowStringPullAlpha(state);
  const nockWorld = drawFingerNockWorld(actor);
  const target = nockWorld ? actor.bowString.host.worldToLocal(nockWorld.clone()) : actor.bowString.restNock;
  const currentNock = actor.bowString.restNock.clone().lerp(target, pullAlpha);
  const alignSegment = (segment, start, end) => {
    const direction = end.clone().sub(start);
    segment.position.copy(start).add(end).multiplyScalar(0.5);
    segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    segment.scale.set(1, direction.length(), 1);
    segment.updateMatrixWorld(true);
  };
  alignSegment(actor.bowString.lowerSegment, actor.bowString.lowerAnchor, currentNock);
  alignSegment(actor.bowString.upperSegment, currentNock, actor.bowString.upperAnchor);
  actor.bowString.currentNockWorld.copy(currentNock);
  actor.bowString.host.localToWorld(actor.bowString.currentNockWorld);
  actor.bowString.pulled = pullAlpha > 0.95;
  actor.bowString.pullAlpha = pullAlpha;
  actor.bowString.nockErrorMeters = nockWorld && pullAlpha > 0.95
    ? actor.bowString.currentNockWorld.distanceTo(nockWorld)
    : null;
}

function weaponHandContactMetrics(actor, record, side, centerY = 0) {
  if (!record) return null;
  actor.model.updateMatrixWorld(true);
  const hand = findBone(actor.bones, `${side}Hand`);
  const points = collectPoints(record.visual, 6000).filter((point) => (
    Math.abs(record.socket.worldToLocal(point.clone()).y - centerY) < 0.065
  ));
  const digits = Object.fromEntries(["Index", "Middle", "Ring", "Pinky", "Thumb"].map((name) => {
    const chain = [1, 2, 3, 4].map((index) => findBone(actor.bones, `${side}Hand${name}${index}`))
      .filter(Boolean).map((bone) => bone.getWorldPosition(new THREE.Vector3()));
    const candidates = chain.slice(1).map((end, index) => closestSampleToSurface(chain[index], end, points, 8));
    const closest = candidates.filter(Boolean).sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
    return [name, {
      distanceMeters: closest?.distanceMeters ?? null,
      contactsHandle: Boolean(closest && closest.distanceMeters <= 0.024),
      chainInHand: chain.map((point) => hand.worldToLocal(point.clone()).multiplyScalar(actor.model.scale.x).toArray()),
      chainInSocket: chain.map((point) => record.socket.worldToLocal(point.clone()).toArray()),
    }];
  }));
  const localPoints = points.map((point) => record.socket.worldToLocal(point.clone()));
  const bounds = new THREE.Box3().setFromPoints(localPoints);
  const coreBounds = new THREE.Box3().setFromPoints(localPoints.filter((point) => Math.abs(point.y - centerY) < 0.018));
  return {
    asset: record.asset, side, centerY, surfaceSamples: points.length,
    handleBounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    handleCoreBounds: { min: coreBounds.min.toArray(), max: coreBounds.max.toArray() },
    digits,
    fingerContactCount: ["Index", "Middle", "Ring", "Pinky"].filter((name) => digits[name].contactsHandle).length,
    thumbContactsHandle: digits.Thumb.contactsHandle,
  };
}

function pointToSegmentDistance(point, start, end) {
  const segment = end.clone().sub(start);
  const lengthSquared = segment.lengthSq();
  if (lengthSquared < 1e-8) return point.distanceTo(start);
  const phase = THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSquared, 0, 1);
  return point.distanceTo(start.clone().addScaledVector(segment, phase));
}

function closestSampleToSurface(digitStart, digitEnd, surfacePoints, samples = 16) {
  let closest = null;
  for (let index = 0; index <= samples; index += 1) {
    const digitPoint = digitStart.clone().lerp(digitEnd, index / samples);
    for (const surfacePoint of surfacePoints) {
      const distanceMeters = digitPoint.distanceTo(surfacePoint);
      if (!closest || distanceMeters < closest.distanceMeters) {
        closest = { distanceMeters, digitPoint, surfacePoint };
      }
    }
  }
  return closest;
}

function bowHandleContactMetrics(actor, bow) {
  if (!bow) return null;
  actor.model.updateMatrixWorld(true);
  bow.socket.updateWorldMatrix(true, true);
  const handleStart = bow.socket.localToWorld(new THREE.Vector3(0, -0.075, 0));
  const handleEnd = bow.socket.localToWorld(new THREE.Vector3(0, 0.075, 0));
  const handleHalfLengthMeters = 0.09;
  const digitRadiusMeters = 0.012;
  const contactToleranceMeters = 0.012;
  const gripSurfacePoints = collectPoints(bow.visual, 6000).filter((point) => (
    Math.abs(bow.socket.worldToLocal(point.clone()).y) <= handleHalfLengthMeters
  ));
  const digitNames = ["Index", "Middle", "Ring", "Pinky", "Thumb"];
  const digits = Object.fromEntries(digitNames.map((name) => {
    const chain = [1, 2, 3]
      .map((index) => findBone(actor.bones, `LeftHand${name}${index}`)?.getWorldPosition(new THREE.Vector3()) ?? null)
      .filter(Boolean);
    const candidates = chain.length === 3
      ? [
        closestSampleToSurface(chain[0], chain[1], gripSurfacePoints),
        closestSampleToSurface(chain[1], chain[2], gripSurfacePoints),
      ]
      : [];
    const closest = candidates.reduce(
      (best, candidate) => (!best || candidate.distanceMeters < best.distanceMeters ? candidate : best),
      null,
    );
    const centerlineDistanceMeters = closest?.distanceMeters ?? null;
    return [name, {
      chainWorld: chain.map((point) => point.toArray()),
      closestDigitPointWorld: closest?.digitPoint.toArray() ?? null,
      closestHandlePointWorld: closest?.surfacePoint.toArray() ?? null,
      surfaceDistanceMeters: centerlineDistanceMeters,
      surfaceGapMeters: centerlineDistanceMeters === null
        ? null
        : Math.max(0, centerlineDistanceMeters - digitRadiusMeters),
      contactsHandle: centerlineDistanceMeters !== null
        && centerlineDistanceMeters <= digitRadiusMeters + contactToleranceMeters,
    }];
  }));
  const fingerContactCount = ["Index", "Middle", "Ring", "Pinky"]
    .filter((name) => digits[name].contactsHandle).length;
  return {
    handleStartWorld: handleStart.toArray(),
    handleEndWorld: handleEnd.toArray(),
    handleHalfLengthMeters,
    gripSurfacePointCount: gripSurfacePoints.length,
    digitRadiusMeters,
    contactToleranceMeters,
    digits,
    fingerContactCount,
    thumbContactsHandle: digits.Thumb.contactsHandle,
    passes: fingerContactCount >= 3
      && digits.Thumb.contactsHandle,
  };
}

const BODY_CLEARANCE_CAPSULES = [
  { name: "lower-torso", start: "Hips", end: "Spine1", radius: 0.145 },
  { name: "upper-torso", start: "Spine1", end: "Neck", radius: 0.155 },
  { name: "shoulders", start: "LeftShoulder", end: "RightShoulder", radius: 0.09 },
  { name: "head", start: "Head", end: "Head", radius: 0.11 },
  { name: "left-upper-arm", start: "LeftArm", end: "LeftForeArm", radius: 0.075 },
  { name: "left-forearm", start: "LeftForeArm", end: "LeftHand", radius: 0.06 },
  { name: "right-upper-arm", start: "RightArm", end: "RightForeArm", radius: 0.075 },
  { name: "right-forearm", start: "RightForeArm", end: "RightHand", radius: 0.06 },
  { name: "left-thigh", start: "LeftUpLeg", end: "LeftLeg", radius: 0.1 },
  { name: "left-shin", start: "LeftLeg", end: "LeftFoot", radius: 0.075 },
  { name: "right-thigh", start: "RightUpLeg", end: "RightLeg", radius: 0.1 },
  { name: "right-shin", start: "RightLeg", end: "RightFoot", radius: 0.075 },
];

const ARTIFACT_CLEARANCE_POLICIES = {
  back: {
    fitMode: "rigid-mounted",
    // Keep a visible 2 mm buffer without forcing the close-fitting quiver to
    // float away from the torso during the most extreme arm swing.
    minimumMeters: 0.002,
    correctMounted: true,
    excludedCapsules: [],
    correctionExcludedCapsules: [
      "left-upper-arm", "left-forearm", "right-upper-arm", "right-forearm",
      "left-thigh", "left-shin", "right-thigh", "right-shin",
    ],
  },
  harness: {
    fitMode: "skinned-shell",
    minimumMeters: 0,
    correctMounted: false,
    excludedCapsules: [],
    correctionExcludedCapsules: [
      "left-upper-arm", "left-forearm", "right-upper-arm", "right-forearm",
      "left-thigh", "left-shin", "right-thigh", "right-shin",
    ],
  },
  primary: {
    fitMode: "held-socket",
    minimumMeters: 0,
    correctMounted: false,
    // A held artifact is allowed to contact its gripping arm. It is never
    // allowed to pass through the rest of the body.
    excludedCapsules: ["left-upper-arm", "left-forearm"],
  },
  ammo: {
    fitMode: "held-socket",
    minimumMeters: 0,
    correctMounted: false,
    excludedCapsules: ["right-upper-arm", "right-forearm"],
  },
  clothing: {
    fitMode: "skinned-shell",
    minimumMeters: 0.003,
    correctMounted: false,
    excludedCapsules: [],
  },
  cloth: {
    fitMode: "dynamic-cloth",
    minimumMeters: 0.006,
    correctMounted: false,
    excludedCapsules: [],
  },
};

function worldBodyClearanceCapsules(actor, excludedCapsules = []) {
  const excluded = new Set(excludedCapsules);
  return BODY_CLEARANCE_CAPSULES.filter(({ name }) => !excluded.has(name)).map((definition) => {
    const startBone = findBone(actor.bones, definition.start);
    const endBone = findBone(actor.bones, definition.end);
    if (!startBone || !endBone) return null;
    return {
      ...definition,
      startWorld: startBone.getWorldPosition(new THREE.Vector3()),
      endWorld: endBone.getWorldPosition(new THREE.Vector3()),
    };
  }).filter(Boolean);
}

function attachmentBodyClearanceMetrics(actor, record, excludedCapsulesOverride = null) {
  const policy = ARTIFACT_CLEARANCE_POLICIES[record?.role];
  if (!record?.visual?.visible || !policy) return null;
  actor.model.updateMatrixWorld(true);
  record.socket.updateWorldMatrix(true, true);
  const points = collectPoints(
    record.visual,
    700,
    (mesh) => !mesh.name.startsWith("dynamic-bow-string-"),
  );
  const capsules = worldBodyClearanceCapsules(actor, excludedCapsulesOverride ?? policy.excludedCapsules);
  const anchorBone = findBone(actor.bones, record.activeBone ?? record.bone);
  const socketWorld = record.socket.getWorldPosition(new THREE.Vector3());
  const anchorWorld = anchorBone?.getWorldPosition(new THREE.Vector3()) ?? null;
  let minimum = {
    clearanceMeters: Infinity,
    capsuleName: null,
    pointWorld: null,
    capsuleStartWorld: null,
    capsuleEndWorld: null,
  };
  for (const point of points) {
    for (const capsule of capsules) {
      const clearanceMeters = pointToSegmentDistance(point, capsule.startWorld, capsule.endWorld) - capsule.radius;
      if (clearanceMeters < minimum.clearanceMeters) {
        minimum = {
          clearanceMeters,
          capsuleName: capsule.name,
          pointWorld: point.toArray(),
          capsuleStartWorld: capsule.startWorld.toArray(),
          capsuleEndWorld: capsule.endWorld.toArray(),
        };
      }
    }
  }
  if (!Number.isFinite(minimum.clearanceMeters)) return null;
  return {
    ...minimum,
    asset: record.asset,
    role: record.role,
    fitMode: policy.fitMode,
    anchorBone: anchorBone?.name ?? null,
    anchoredToExpectedBone: Boolean(anchorBone && record.socket.parent === anchorBone),
    anchorOffsetMeters: anchorWorld ? socketWorld.distanceTo(anchorWorld) : null,
    minimumRequiredMeters: policy.minimumMeters,
    passes: minimum.clearanceMeters >= policy.minimumMeters,
  };
}

function translateSocketInWorld(socket, worldDelta) {
  const parent = socket.parent;
  if (!parent) return;
  const currentWorld = socket.getWorldPosition(new THREE.Vector3());
  const targetLocal = parent.worldToLocal(currentWorld.add(worldDelta));
  socket.position.copy(targetLocal);
  socket.updateMatrixWorld(true);
}

function enforceMountedArtifactClearance(actor) {
  const corrections = [];
  for (const record of actor.sockets) {
    const policy = ARTIFACT_CLEARANCE_POLICIES[record.role];
    if (!policy?.correctMounted || !record.visual.visible) continue;
    let totalCorrectionMeters = 0;
    for (let iteration = 0; iteration < 4; iteration += 1) {
      const metric = attachmentBodyClearanceMetrics(actor, record, policy.correctionExcludedCapsules);
      if (!metric || metric.passes) break;
      const spine = findBone(actor.bones, "Spine2") ?? findBone(actor.bones, "Spine1");
      const spineWorld = spine?.getWorldPosition(new THREE.Vector3());
      const bounds = new THREE.Box3().setFromObject(record.visual, true);
      const centerWorld = bounds.getCenter(new THREE.Vector3());
      const outward = spineWorld ? centerWorld.sub(spineWorld) : bodyDirection(new THREE.Vector3(0, 0, -1));
      if (outward.lengthSq() < 1e-8) outward.copy(bodyDirection(new THREE.Vector3(0, 0, -1)));
      outward.normalize();
      const remainingCorrectionBudget = Math.max(0, 0.035 - totalCorrectionMeters);
      const correctionMeters = Math.min(
        policy.minimumMeters - metric.clearanceMeters + 0.002,
        0.012,
        remainingCorrectionBudget,
      );
      if (correctionMeters <= 0) break;
      const worldDelta = outward.multiplyScalar(correctionMeters);
      translateSocketInWorld(record.socket, worldDelta);
      if (record.role === "back" && actor.arrowBundle) translateSocketInWorld(actor.arrowBundle.socket, worldDelta);
      totalCorrectionMeters += correctionMeters;
    }
    const finalMetric = attachmentBodyClearanceMetrics(actor, record);
    corrections.push({
      asset: record.asset,
      role: record.role,
      correctionMeters: totalCorrectionMeters,
      finalClearanceMeters: finalMetric?.clearanceMeters ?? null,
      passes: finalMetric?.passes ?? true,
    });
  }
  return corrections;
}

function artifactBodyClearanceMetrics(actor) {
  return actor.sockets.map((record) => attachmentBodyClearanceMetrics(actor, record)).filter(Boolean);
}

function minimumQuiverBodyClearance(actor) {
  if (!actor.arrowBundle) return null;
  const bodyProxies = [
    ["Head", 0.105],
    ["Neck", 0.075],
    ["LeftShoulder", 0.105],
    ["RightShoulder", 0.105],
  ].map(([name, radius]) => ({ bone: findBone(actor.bones, name), radius })).filter(({ bone }) => bone);
  let clearance = Infinity;
  const visibleCount = Math.min(actor.arrowBundle.displayedInQuiver ?? 0, actor.arrowBundle.placements.length);
  for (const placement of actor.arrowBundle.placements.slice(0, visibleCount)) {
    const start = actor.arrowBundle.socket.localToWorld(new THREE.Vector3(
      placement.x,
      placement.y + actor.arrowBundle.arrowBounds.min.y,
      placement.z,
    ));
    const end = actor.arrowBundle.socket.localToWorld(new THREE.Vector3(
      placement.x,
      placement.y + actor.arrowBundle.arrowBounds.max.y,
      placement.z,
    ));
    for (const { bone, radius } of bodyProxies) {
      const boneWorld = bone.getWorldPosition(new THREE.Vector3());
      clearance = Math.min(clearance, pointToSegmentDistance(boneWorld, start, end) - radius);
    }
  }
  return Number.isFinite(clearance) ? clearance : null;
}

function harnessBodyClearanceMetrics(actor) {
  const points = actor.quiverHarness?.sampledPoints ?? [];
  if (!points.length) return null;
  const bodyProxies = [
    ["Spine1", 0.09],
    ["Spine2", 0.095],
    ["Neck", 0.06],
    ["LeftShoulder", 0.065],
    ["RightShoulder", 0.065],
  ].map(([name, radius]) => ({ bone: findBone(actor.bones, name), radius })).filter(({ bone }) => bone);
  let minimum = { clearance: Infinity, pointIndex: -1, boneName: null, pointWorld: null, boneWorld: null };
  points.forEach((point, pointIndex) => {
    bodyProxies.forEach(({ bone, radius }) => {
      const boneWorld = bone.getWorldPosition(new THREE.Vector3());
      const clearance = point.distanceTo(boneWorld) - radius;
      if (clearance < minimum.clearance) {
        minimum = {
          clearance,
          pointIndex,
          boneName: bone.name,
          pointWorld: point.toArray(),
          boneWorld: boneWorld.toArray(),
        };
      }
    });
  });
  return Number.isFinite(minimum.clearance) ? minimum : null;
}

function minimumHarnessBodyClearance(actor) {
  return harnessBodyClearanceMetrics(actor)?.clearance ?? null;
}

function minimumGreatswordBodyClearance(actor, hiltWorld, bladeTipWorld) {
  const bodyProxies = [
    ["Spine1", 0.15],
    ["Spine2", 0.15],
    ["Neck", 0.075],
    ["Head", 0.105],
    ["LeftShoulder", 0.1],
    ["RightShoulder", 0.1],
  ].map(([name, radius]) => ({ bone: findBone(actor.bones, name), radius })).filter(({ bone }) => bone);
  return Math.min(...bodyProxies.map(({ bone, radius }) => (
    pointToSegmentDistance(bone.getWorldPosition(new THREE.Vector3()), hiltWorld, bladeTipWorld) - radius
  )));
}

function minimumHandArrowBodyClearance(actor, handArrow) {
  if (!handArrow?.visual.visible) return null;
  if (handArrowCollisionMode(actor) === "nested-in-clear-quiver") {
    const quiver = actor.sockets.find(({ role, asset }) => role === "back" && asset === "quiver");
    const policy = ARTIFACT_CLEARANCE_POLICIES.back;
    return quiver
      ? attachmentBodyClearanceMetrics(actor, quiver, policy.correctionExcludedCapsules)?.clearanceMeters ?? null
      : null;
  }
  const bodyProxies = [
    ["Spine", 0.14],
    ["Spine1", 0.15],
    ["Spine2", 0.14],
    ["Neck", 0.075],
    ["Head", 0.105],
    ["RightShoulder", 0.105],
  ].map(([name, radius]) => ({ bone: findBone(actor.bones, name), radius })).filter(({ bone }) => bone);
  const tip = handArrow.socket.localToWorld(new THREE.Vector3(0, handArrow.prepared.normalizedBounds.max.y, 0));
  const nock = handArrow.socket.localToWorld(new THREE.Vector3(0, handArrow.prepared.normalizedBounds.min.y, 0));
  return Math.min(...bodyProxies.map(({ bone, radius }) => (
    pointToSegmentDistance(bone.getWorldPosition(new THREE.Vector3()), tip, nock) - radius
  )));
}

function handArrowCollisionMode(actor) {
  const clipName = actor?.action?.getClip().name ?? "";
  const normalizedTime = Number(timeInput.value);
  if (clipName === BOW_QUIVER_DRAW_NAME
    && normalizedTime >= BOW_DRAW_TIMING.featherGrip
    && normalizedTime <= BOW_DRAW_TIMING.withdrawBack) {
    // While the shaft is still inside the rigid quiver, inherit the verified
    // quiver/body clearance instead of treating the contained arrow as an
    // independent body collider.
    return "nested-in-clear-quiver";
  }
  return "independent-body-clearance";
}

function minimumHandArrowWristClearance(actor, handArrow) {
  if (!handArrow?.visual.visible) return null;
  const wrist = findBone(actor.bones, "RightHand");
  if (!wrist) return null;
  const tip = handArrow.socket.localToWorld(new THREE.Vector3(0, handArrow.prepared.normalizedBounds.max.y, 0));
  const nock = handArrow.socket.localToWorld(new THREE.Vector3(0, handArrow.prepared.normalizedBounds.min.y, 0));
  return pointToSegmentDistance(wrist.getWorldPosition(new THREE.Vector3()), tip, nock) - 0.035;
}

function buildHandArrowExtras(actor) {
  actor.handArrowExtras = [];
  const handArrow = actor.sockets.find(({ role, asset }) => role === "ammo" && /arrow/i.test(asset));
  if (!handArrow) return;
  for (const [index, offset] of [-0.018, 0.018].entries()) {
    const visual = handArrow.prepared.visual.clone(true);
    visual.name = `bow-hand-arrow-extra-${index + 2}`;
    visual.position.x += offset;
    visual.position.z += index === 0 ? 0.008 : -0.008;
    visual.visible = false;
    handArrow.socket.add(visual);
    actor.handArrowExtras.push(visual);
  }
}

function disposeHandArrowExtras(actor) {
  for (const visual of actor.handArrowExtras) visual.removeFromParent();
  actor.handArrowExtras = [];
}

function buildArrowProjectile(actor, preparedAssets) {
  actor.projectile = null;
  if (!preparedAssets.has("arrow")) return;
  const visuals = Array.from({ length: 3 }, (_, index) => {
    const visual = preparedAssets.get("arrow").visual.clone(true);
    visual.name = `bow-arrow-projectile-${index + 1}`;
    visual.visible = false;
    scene.add(visual);
    return visual;
  });
  actor.projectile = {
    visuals,
    startPosition: new THREE.Vector3(),
    startQuaternion: new THREE.Quaternion(),
    direction: new THREE.Vector3(),
    captured: false,
    distanceMeters: 0,
  };
}

function disposeArrowProjectile(actor) {
  if (!actor.projectile) return;
  for (const visual of actor.projectile.visuals) visual.removeFromParent();
  actor.projectile = null;
}

const BOW_TIMING = {
  tripleArrowPickup: 0.28,
  tripleArrowNocked: 0.56,
  tripleRelease: 0.58,
  equipTransfer: 0.33,
  stowTransfer: 0.4,
};

const BOW_DRAW_TIMING = {
  reachStart: 0.03,
  featherGrip: 0.18,
  withdrawBack: 0.34,
  lowerWaist: 0.56,
  forwardWaist: 0.72,
  presentToBow: 0.82,
  nocked: 0.92,
};

const BOW_RELEASE_TIMING = { release: 0.3 };
const BOW_STRIKE_TIMING = { windupEnd: 0.28, contact: 0.52, recoverStart: 0.66 };

function applyAttachmentPose(record, poseName) {
  const pose = record?.poses?.[poseName];
  if (!pose) return;
  const bone = findBone(actor.bones, pose.bone);
  if (!bone) throw new Error(`Missing ${pose.bone} for ${record.asset} ${poseName} pose.`);
  if (record.socket.parent !== bone) bone.add(record.socket);
  const actorScale = actor.model.scale.x;
  record.socket.scale.setScalar(1 / actorScale);
  record.socket.position.fromArray(pose.position ?? [0, 0, 0]).multiplyScalar(1 / actorScale);
  record.socket.rotation.fromArray(pose.rotation ?? [0, 0, 0]);
  record.activeBone = pose.bone;
  record.activePose = poseName;
  record.socket.updateMatrixWorld(true);
}

function attachmentPoseWorld(record, poseName) {
  const pose = record?.poses?.[poseName];
  const bone = pose ? findBone(actor.bones, pose.bone) : null;
  if (!pose || !bone) return null;
  bone.updateWorldMatrix(true, false);
  const actorScale = actor.model.scale.x;
  const localMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3().fromArray(pose.position ?? [0, 0, 0]).multiplyScalar(1 / actorScale),
    new THREE.Quaternion().setFromEuler(new THREE.Euler().fromArray(pose.rotation ?? [0, 0, 0])),
    new THREE.Vector3().setScalar(1 / actorScale),
  );
  const worldMatrix = bone.matrixWorld.clone().multiply(localMatrix);
  return {
    position: new THREE.Vector3().setFromMatrixPosition(worldMatrix),
    quaternion: new THREE.Quaternion().setFromRotationMatrix(worldMatrix),
    scale: new THREE.Vector3().setFromMatrixScale(worldMatrix),
  };
}

function applyBlendedAttachmentPose(record, fromPoseName, toPoseName, alpha) {
  const from = attachmentPoseWorld(record, fromPoseName);
  const to = attachmentPoseWorld(record, toPoseName);
  if (!from || !to) return;
  if (record.socket.parent !== scene) scene.add(record.socket);
  record.socket.position.copy(from.position).lerp(to.position, alpha);
  record.socket.quaternion.copy(from.quaternion).slerp(to.quaternion, alpha);
  record.socket.scale.copy(from.scale).lerp(to.scale, alpha);
  record.activeBone = "world-transfer";
  record.activePose = `${fromPoseName}-to-${toPoseName}`;
  record.socket.updateMatrixWorld(true);
}

const GREATSWORD_SHEATHE_TIMING = {
  shoulderPrep: 0.2,
  lifted: 0.45,
  bladeOut: 0.62,
  bladeTurned: 0.74,
  inserted: 1,
};

function bodyDirection(localDirection) {
  const quaternion = actor.model.getWorldQuaternion(new THREE.Quaternion());
  return localDirection.clone().applyQuaternion(quaternion).normalize();
}

function greatswordBladeQuaternion(bladeDirection, preferredCrossguardDirection) {
  const blade = bladeDirection.clone().normalize();
  const crossguard = preferredCrossguardDirection.clone()
    .addScaledVector(blade, -preferredCrossguardDirection.dot(blade));
  if (crossguard.lengthSq() < 1e-6) {
    crossguard.copy(bodyDirection(new THREE.Vector3(0, 0, 1)))
      .addScaledVector(blade, -bodyDirection(new THREE.Vector3(0, 0, 1)).dot(blade));
  }
  crossguard.normalize();
  const normal = new THREE.Vector3().crossVectors(crossguard, blade).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(crossguard, blade, normal),
  );
}

function restoreGreatswordHandAttachment() {
  const record = actor?.primary;
  if (!record || record.asset !== "longsword") return;
  if (record.socket.parent === scene) {
    const hand = findBone(actor.bones, record.bone);
    if (hand) hand.add(record.socket);
    record.socket.scale.setScalar(1 / actor.model.scale.x);
    updateSocketFromControls();
  }
  record.activeBone = record.bone;
  record.activePose = "fixed";
  actor.greatswordSheathe = null;
}

function updateGreatswordSheathePreview() {
  if (isCatalogMode() || weaponSetSelect.value !== "longswordTwoHand" || !actor?.primary) return;
  const clipName = actor.action?.getClip().name ?? "";
  if (clipName !== GREATSWORD_TWO_HAND_SHEATHE_NAME) {
    restoreGreatswordHandAttachment();
    return;
  }

  const record = actor.primary;
  const socket = record.socket;
  actor.model.updateMatrixWorld(true);
  if (!actor.greatswordSheathe) {
    const rightHand = findBone(actor.bones, "RightHand");
    const leftHand = findBone(actor.bones, "LeftHand");
    if (!rightHand || !leftHand) return;
    socket.updateMatrixWorld(true);
    const startPosition = socket.getWorldPosition(new THREE.Vector3());
    const startQuaternion = socket.getWorldQuaternion(new THREE.Quaternion());
    const startScale = socket.getWorldScale(new THREE.Vector3());
    const inverseSocketQuaternion = startQuaternion.clone().invert();
    const rightHandWorldQuaternion = rightHand.getWorldQuaternion(new THREE.Quaternion());
    const leftHandWorldQuaternion = leftHand.getWorldQuaternion(new THREE.Quaternion());
    actor.greatswordSheathe = {
      startPosition,
      startQuaternion,
      startScale,
      rightGripLocal: socket.worldToLocal(rightHand.getWorldPosition(new THREE.Vector3())),
      handRelative: {
        Right: inverseSocketQuaternion.clone().multiply(rightHandWorldQuaternion),
        Left: inverseSocketQuaternion.clone().multiply(leftHandWorldQuaternion),
      },
    };
    scene.attach(socket);
  }

  const state = actor.greatswordSheathe;
  const normalizedTime = THREE.MathUtils.clamp(Number(timeInput.value), 0, 1);
  const shoulder = findBone(actor.bones, "RightShoulder")?.getWorldPosition(new THREE.Vector3());
  const spine = findBone(actor.bones, "Spine2")?.getWorldPosition(new THREE.Vector3());
  if (!shoulder || !spine) return;
  const up = bodyDirection(new THREE.Vector3(0, 1, 0));
  const right = shoulder.clone().sub(spine).addScaledVector(up, -shoulder.clone().sub(spine).dot(up)).normalize();
  const back = bodyDirection(new THREE.Vector3(0, 0, -1));
  const forward = back.clone().negate();
  const prepPosition = shoulder.clone().addScaledVector(right, 0.24).addScaledVector(up, 0.08).addScaledVector(forward, 0.13);
  const liftPosition = shoulder.clone().addScaledVector(right, 0.25).addScaledVector(up, 0.28).addScaledVector(back, 0.06);
  const turnPosition = shoulder.clone().addScaledVector(right, 0.27).addScaledVector(up, 0.3).addScaledVector(back, 0.34);
  const turnedPosition = shoulder.clone().addScaledVector(right, 0.18).addScaledVector(up, 0.2).addScaledVector(back, 0.3);
  const insertedPosition = shoulder.clone().addScaledVector(right, 0.2).addScaledVector(up, -0.02).addScaledVector(back, 0.33);
  const liftQuaternion = greatswordBladeQuaternion(
    up.clone().multiplyScalar(0.9).addScaledVector(back, 0.3).addScaledVector(right, 0.12),
    right,
  );
  const turnQuaternion = greatswordBladeQuaternion(
    up.clone().multiplyScalar(0.42).addScaledVector(back, 0.88).addScaledVector(right, 0.14),
    right,
  );
  const insertedQuaternion = greatswordBladeQuaternion(
    up.clone().multiplyScalar(-0.98).addScaledVector(back, 0.2),
    right,
  );
  const keys = [
    { time: 0, position: state.startPosition, quaternion: state.startQuaternion },
    { time: GREATSWORD_SHEATHE_TIMING.shoulderPrep, position: prepPosition, quaternion: liftQuaternion },
    { time: GREATSWORD_SHEATHE_TIMING.lifted, position: liftPosition, quaternion: liftQuaternion },
    { time: GREATSWORD_SHEATHE_TIMING.bladeOut, position: turnPosition, quaternion: turnQuaternion },
    { time: GREATSWORD_SHEATHE_TIMING.bladeTurned, position: turnedPosition, quaternion: insertedQuaternion },
    { time: GREATSWORD_SHEATHE_TIMING.inserted, position: insertedPosition, quaternion: insertedQuaternion },
  ];
  let from = keys[0];
  let to = keys[1];
  for (let index = 1; index < keys.length; index += 1) {
    if (normalizedTime <= keys[index].time) {
      from = keys[index - 1];
      to = keys[index];
      break;
    }
  }
  const rawAlpha = THREE.MathUtils.inverseLerp(from.time, to.time, normalizedTime);
  const alpha = THREE.MathUtils.smoothstep(rawAlpha, 0, 1);
  socket.position.copy(from.position).lerp(to.position, alpha);
  socket.quaternion.copy(from.quaternion).slerp(to.quaternion, alpha);
  socket.scale.copy(state.startScale);
  socket.updateMatrixWorld(true);
  record.activeBone = "world-transfer";
  record.activePose = "two-hand-shoulder-sheathe";
}

function updateBowCarryPreview() {
  if (isCatalogMode() || weaponSetSelect.value !== "bow") return;
  const bow = actor.sockets.find(({ role, asset }) => role === "primary" && asset === "bow");
  if (!bow?.poses) return;
  const clipName = actor.action?.getClip().name ?? "";
  const normalizedTime = Number(timeInput.value);
  if (clipName.endsWith("BowEquipFromBack")) {
    if (normalizedTime <= 0.24) applyAttachmentPose(bow, "back");
    else if (normalizedTime >= 0.4) applyAttachmentPose(bow, "hand");
    else applyBlendedAttachmentPose(bow, "back", "hand", THREE.MathUtils.smoothstep(normalizedTime, 0.24, 0.4));
    return;
  }
  if (clipName.endsWith("BowStowToBack")) {
    if (normalizedTime <= 0.32) applyAttachmentPose(bow, "hand");
    else if (normalizedTime >= 0.48) applyAttachmentPose(bow, "back");
    else applyBlendedAttachmentPose(bow, "hand", "back", THREE.MathUtils.smoothstep(normalizedTime, 0.32, 0.48));
    return;
  }
  applyAttachmentPose(bow, "hand");
}

function bowArrowState() {
  const inventory = THREE.MathUtils.clamp(Math.round(Number(arrowCountInput.value)), 0, 100);
  const clipName = actor?.action?.getClip().name ?? "";
  const normalizedTime = Number(timeInput.value);
  let handArrowVisible = false;
  let firedThisPreview = false;
  let handArrowCount = 0;
  let firedArrowCount = 0;
  if (clipName === BOW_TRIPLE_SHOT_NAME) {
    const available = Math.min(3, inventory);
    handArrowCount = normalizedTime >= BOW_TIMING.tripleArrowPickup && normalizedTime < BOW_TIMING.tripleRelease ? available : 0;
    firedArrowCount = normalizedTime >= BOW_TIMING.tripleRelease ? available : 0;
    handArrowVisible = handArrowCount > 0;
    firedThisPreview = firedArrowCount > 0;
  } else if (clipName === BOW_QUIVER_DRAW_NAME) {
    handArrowVisible = normalizedTime >= BOW_DRAW_TIMING.featherGrip && inventory > 0;
    handArrowCount = handArrowVisible ? 1 : 0;
  } else if (clipName === BOW_RELEASE_NAME) {
    handArrowVisible = normalizedTime < BOW_RELEASE_TIMING.release && inventory > 0;
    firedThisPreview = normalizedTime >= BOW_RELEASE_TIMING.release && inventory > 0;
    handArrowCount = handArrowVisible ? 1 : 0;
    firedArrowCount = firedThisPreview ? 1 : 0;
  } else if (["ProLongbow__StandingAimOverdraw", "ProLongbow__StandingAimWalkForward", BOW_AIM_RUN_NAME].includes(clipName)) {
    handArrowVisible = inventory > 0;
    handArrowCount = handArrowVisible ? 1 : 0;
  }
  const displayedInQuiver = Math.max(0, inventory - handArrowCount - firedArrowCount);
  return { inventory, displayedInQuiver, handArrowVisible, handArrowCount, firedThisPreview, firedArrowCount };
}

const ARROW_FLIGHT_AXIS = new THREE.Vector3(0, 1, 0);

function drawFingerNockWorld(actor) {
  const hand = findBone(actor.bones, "RightHand");
  if (!hand) return null;
  actor.model.updateMatrixWorld(true);
  const handWorld = hand.getWorldPosition(new THREE.Vector3());
  const thumb = findBone(actor.bones, "RightHandThumb3")
    ?? findBone(actor.bones, "RightHandThumb2")
    ?? findBone(actor.bones, "RightHandThumb1");
  const index = findBone(actor.bones, "RightHandIndex3")
    ?? findBone(actor.bones, "RightHandIndex2")
    ?? findBone(actor.bones, "RightHandIndex1");
  if (!thumb || !index) return handWorld;
  // The nock/fletching is pinched between the thumb and index finger. The old
  // index/middle average put the shaft beside the hand even when the numeric
  // reach error was zero.
  const nock = thumb.getWorldPosition(new THREE.Vector3())
    .add(index.getWorldPosition(new THREE.Vector3()))
    .multiplyScalar(0.5);
  const outward = nock.clone().sub(handWorld);
  const isMultishot = actor.action?.getClip().name === BOW_TRIPLE_SHOT_NAME;
  const fingerClearance = isMultishot ? 0.012 : 0.004;
  if (outward.lengthSq() > 1e-8) nock.addScaledVector(outward.normalize(), fingerClearance);
  return nock;
}

function slerpDirection(from, to, alpha) {
  const fromRotation = new THREE.Quaternion().setFromUnitVectors(ARROW_FLIGHT_AXIS, from.clone().normalize());
  const toRotation = new THREE.Quaternion().setFromUnitVectors(ARROW_FLIGHT_AXIS, to.clone().normalize());
  fromRotation.slerp(toRotation, THREE.MathUtils.clamp(alpha, 0, 1));
  return ARROW_FLIGHT_AXIS.clone().applyQuaternion(fromRotation).normalize();
}

function bowArrowTransferPose(actor, pickup, fingerNock, normalizedTime, quiverDirection, bowGrip) {
  const spine = findBone(actor.bones, "Spine2")?.getWorldPosition(new THREE.Vector3()) ?? pickup.clone();
  const shoulder = findBone(actor.bones, "RightShoulder")?.getWorldPosition(new THREE.Vector3()) ?? pickup.clone();
  const head = findBone(actor.bones, "Head")?.getWorldPosition(new THREE.Vector3()) ?? shoulder.clone();
  const up = new THREE.Vector3(0, 1, 0);
  const outward = shoulder.clone().sub(spine);
  outward.y = 0;
  if (outward.lengthSq() < 1e-8) {
    outward.set(1, 0, 0).applyQuaternion(actor.model.getWorldQuaternion(new THREE.Quaternion()));
  }
  outward.normalize();
  // The bow hand is the reliable forward reference. Using the final draw hand
  // here sent the arrow behind the shoulder before nocking and caused the
  // shaft-through-body path visible in the rejected review frames.
  const front = bowGrip.clone().sub(spine);
  front.y = 0;
  if (front.lengthSq() < 1e-8) {
    front.copy(fingerNock).sub(spine);
    front.y = 0;
  }
  front.normalize();
  // The filmed back-quiver retrieval is not an overhead flourish. The elbow
  // drives backward, the hand withdraws the arrow beside the head, then drops
  // it to the waist and presents it forward from there for nocking.
  const withdrawBack = head.clone()
    .addScaledVector(up, -0.06)
    .addScaledVector(outward, 0.16)
    .addScaledVector(front, -0.08);
  const lowerWaist = spine.clone()
    .addScaledVector(up, -0.32)
    .addScaledVector(outward, 0.25)
    .addScaledVector(front, 0.13);
  const forwardWaist = spine.clone()
    .addScaledVector(up, -0.27)
    .addScaledVector(outward, 0.28)
    .addScaledVector(front, 0.43);
  const presentToBow = shoulder.clone()
    .addScaledVector(up, -0.10)
    .addScaledVector(outward, 0.30)
    .addScaledVector(front, 0.56);
  let nock;
  let stage;
  if (normalizedTime <= BOW_DRAW_TIMING.featherGrip) {
    nock = pickup.clone();
    stage = "feather-grip";
  } else if (normalizedTime <= BOW_DRAW_TIMING.withdrawBack) {
    const alpha = THREE.MathUtils.smoothstep(normalizedTime, BOW_DRAW_TIMING.featherGrip, BOW_DRAW_TIMING.withdrawBack);
    nock = pickup.clone().lerp(withdrawBack, alpha);
    stage = "withdraw-back";
  } else if (normalizedTime <= BOW_DRAW_TIMING.lowerWaist) {
    const alpha = THREE.MathUtils.smoothstep(normalizedTime, BOW_DRAW_TIMING.withdrawBack, BOW_DRAW_TIMING.lowerWaist);
    nock = withdrawBack.clone().lerp(lowerWaist, alpha);
    stage = "lower-waist";
  } else if (normalizedTime <= BOW_DRAW_TIMING.forwardWaist) {
    const alpha = THREE.MathUtils.smoothstep(normalizedTime, BOW_DRAW_TIMING.lowerWaist, BOW_DRAW_TIMING.forwardWaist);
    nock = lowerWaist.clone().lerp(forwardWaist, alpha);
    stage = "forward-waist";
  } else if (normalizedTime <= BOW_DRAW_TIMING.presentToBow) {
    const alpha = THREE.MathUtils.smoothstep(normalizedTime, BOW_DRAW_TIMING.forwardWaist, BOW_DRAW_TIMING.presentToBow);
    nock = forwardWaist.clone().lerp(presentToBow, alpha);
    stage = "present-to-bow";
  } else {
    const alpha = THREE.MathUtils.smoothstep(normalizedTime, BOW_DRAW_TIMING.presentToBow, BOW_DRAW_TIMING.nocked);
    nock = presentToBow.clone().lerp(fingerNock, alpha);
    stage = normalizedTime < BOW_DRAW_TIMING.nocked ? "nock" : "full-draw";
  }
  const nockedDirection = bowGrip.clone().sub(nock).normalize();
  const featherLedDirection = quiverDirection.clone().negate();
  const waistDirection = front.clone().addScaledVector(up, 0.08).normalize();
  let direction;
  if (normalizedTime <= BOW_DRAW_TIMING.withdrawBack) {
    direction = featherLedDirection.clone();
  } else if (normalizedTime <= BOW_DRAW_TIMING.lowerWaist) {
    const orientationAlpha = THREE.MathUtils.smoothstep(
      normalizedTime,
      BOW_DRAW_TIMING.withdrawBack,
      BOW_DRAW_TIMING.lowerWaist,
    );
    direction = slerpDirection(featherLedDirection, waistDirection, orientationAlpha);
  } else if (normalizedTime <= BOW_DRAW_TIMING.presentToBow) {
    direction = waistDirection.clone();
  } else {
    const orientationAlpha = THREE.MathUtils.smoothstep(
      normalizedTime,
      BOW_DRAW_TIMING.presentToBow,
      BOW_DRAW_TIMING.nocked,
    );
    direction = slerpDirection(waistDirection, nockedDirection, orientationAlpha);
  }
  return { nock, direction, stage };
}

function alignHandArrow(handArrow) {
  if (!handArrow) return;
  const leftHand = findBone(actor.bones, "LeftHand");
  const rightHand = findBone(actor.bones, "RightHand");
  if (!leftHand || !rightHand) return;
  actor.model.updateMatrixWorld(true);
  const fingerNock = drawFingerNockWorld(actor) ?? rightHand.getWorldPosition(new THREE.Vector3());
  const clipName = actor.action?.getClip().name ?? "";
  const normalizedTime = Number(timeInput.value);
  const isSingleDrawTransition = clipName === BOW_QUIVER_DRAW_NAME && normalizedTime < BOW_DRAW_TIMING.nocked;
  const isTripleDrawTransition = clipName === BOW_TRIPLE_SHOT_NAME && normalizedTime < BOW_TIMING.tripleArrowNocked;
  let transferDirection = null;
  if (isSingleDrawTransition || isTripleDrawTransition) {
    if (actor.arrowBundle?.pickupLocal) {
      const quiverDirection = ARROW_FLIGHT_AXIS.clone().applyQuaternion(
        actor.arrowBundle.socket.getWorldQuaternion(new THREE.Quaternion()),
      ).normalize();
      const transferTime = isTripleDrawTransition
        ? THREE.MathUtils.lerp(
          BOW_DRAW_TIMING.featherGrip,
          BOW_DRAW_TIMING.nocked,
          THREE.MathUtils.smoothstep(normalizedTime, BOW_TIMING.tripleArrowPickup, BOW_TIMING.tripleArrowNocked),
        )
        : normalizedTime;
      const pickup = actor.arrowBundle.socket.localToWorld(actor.arrowBundle.pickupLocal.clone());
      const bowGrip = leftHand.getWorldPosition(new THREE.Vector3());
      const transfer = bowArrowTransferPose(actor, pickup, fingerNock, transferTime, quiverDirection, bowGrip);
      transferDirection = transfer.direction;
    }
  }
  const bow = leftHand.getWorldPosition(new THREE.Vector3());
  const direction = transferDirection ?? bow.sub(fingerNock).normalize();
  if (direction.lengthSq() < 1e-8) return;
  const desiredWorld = new THREE.Quaternion().setFromUnitVectors(ARROW_FLIGHT_AXIS, direction);
  const parentWorld = handArrow.socket.parent.getWorldQuaternion(new THREE.Quaternion());
  handArrow.socket.quaternion.copy(parentWorld.invert().multiply(desiredWorld)).normalize();
  let featherGripInset = 0;
  if (isSingleDrawTransition || isTripleDrawTransition) {
    const transferTime = isTripleDrawTransition
      ? THREE.MathUtils.lerp(
        BOW_DRAW_TIMING.featherGrip,
        BOW_DRAW_TIMING.nocked,
        THREE.MathUtils.smoothstep(normalizedTime, BOW_TIMING.tripleArrowPickup, BOW_TIMING.tripleArrowNocked),
      )
      : normalizedTime;
    featherGripInset = transferTime <= BOW_DRAW_TIMING.presentToBow
      ? 0.075
      : THREE.MathUtils.lerp(
        0.075,
        0,
        THREE.MathUtils.smoothstep(transferTime, BOW_DRAW_TIMING.presentToBow, BOW_DRAW_TIMING.nocked),
      );
  }
  const nock = fingerNock.clone().addScaledVector(direction, -featherGripInset);
  const nockOffset = new THREE.Vector3(0, handArrow.prepared.normalizedBounds.min.y, 0).applyQuaternion(desiredWorld);
  const socketOriginWorld = nock.clone().sub(nockOffset);
  handArrow.socket.position.copy(handArrow.socket.parent.worldToLocal(socketOriginWorld));
  handArrow.socket.updateMatrixWorld(true);
}

function updateArrowProjectile(handArrow, state) {
  const projectile = actor.projectile;
  if (!projectile) return;
  const clipName = actor.action?.getClip().name ?? "";
  const normalizedTime = Number(timeInput.value);
  const isTripleShot = clipName === BOW_TRIPLE_SHOT_NAME;
  const releaseTime = isTripleShot ? BOW_TIMING.tripleRelease : BOW_RELEASE_TIMING.release;
  const isReleasedShot = (clipName === BOW_RELEASE_NAME || isTripleShot) && state.firedThisPreview;
  if (!isReleasedShot) {
    for (const visual of projectile.visuals) visual.visible = false;
    projectile.captured = false;
    projectile.distanceMeters = 0;
    return;
  }
  if (!projectile.captured) {
    alignHandArrow(handArrow);
    handArrow.socket.getWorldPosition(projectile.startPosition);
    handArrow.socket.getWorldQuaternion(projectile.startQuaternion);
    projectile.direction.copy(ARROW_FLIGHT_AXIS).applyQuaternion(projectile.startQuaternion).normalize();
    projectile.captured = true;
  }
  const phase = THREE.MathUtils.clamp((normalizedTime - releaseTime) / (1 - releaseTime), 0, 1);
  projectile.distanceMeters = phase * 6;
  const projectileCount = isTripleShot ? state.firedArrowCount : 1;
  const spreads = projectileCount === 3 ? [-0.075, 0, 0.075] : projectileCount === 2 ? [-0.045, 0.045] : [0];
  projectile.visuals.forEach((visual, index) => {
    visual.visible = index < projectileCount;
    if (!visual.visible) return;
    const direction = projectile.direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spreads[index]);
    visual.position.copy(projectile.startPosition).addScaledVector(direction, projectile.distanceMeters);
    visual.position.y -= phase * phase * 0.65;
    visual.quaternion.setFromUnitVectors(ARROW_FLIGHT_AXIS, direction);
    visual.updateMatrixWorld(true);
  });
}

function updateBowInventoryPreview() {
  if (!actor) return;
  const enabled = !isCatalogMode() && weaponSetSelect.value === "bow";
  arrowCountInput.disabled = !enabled;
  const state = bowArrowState();
  const handArrow = actor.sockets.find(({ role, asset }) => role === "ammo" && /arrow/i.test(asset));
  if (handArrow) {
    alignHandArrow(handArrow);
    handArrow.visual.visible = enabled && state.handArrowVisible;
    actor.handArrowExtras.forEach((visual, index) => {
      visual.visible = enabled && state.handArrowCount >= index + 2;
    });
    updateArrowProjectile(handArrow, enabled ? state : { ...state, firedThisPreview: false });
  } else if (actor.projectile) {
    for (const visual of actor.projectile.visuals) visual.visible = false;
    actor.projectile.captured = false;
  }
  if (actor.arrowBundle) {
    for (const mesh of actor.arrowBundle.meshes) mesh.count = enabled ? state.displayedInQuiver : 0;
    Object.assign(actor.arrowBundle, state, { totalInventory: state.inventory });
  }
  updateBowString(actor, enabled ? state : { ...state, handArrowVisible: false });
  document.querySelector("#arrowCountOut").textContent = `${state.inventory} / 100`;
}

function addAttachment(actor, preparedAssets, attachment) {
  const bone = findBone(actor.bones, attachment.bone);
  if (!bone) throw new Error(`Missing socket bone ${attachment.bone}.`);
  const prepared = preparedAssets.get(attachment.asset);
  const socket = new THREE.Group();
  socket.name = `weapon-socket-${attachment.role}-${attachment.asset}`;
  const actorScale = actor.model.scale.x;
  socket.scale.setScalar(1 / actorScale);
  socket.position.fromArray(attachment.position ?? [0, 0, 0]).multiplyScalar(1 / actorScale);
  socket.rotation.fromArray(attachment.rotation ?? [0, 0, 0]);
  const visual = prepared.visual.clone(true);
  visual.visible = attachment.visible !== false;
  if (Array.isArray(attachment.scale)) visual.scale.fromArray(attachment.scale);
  else if (Number.isFinite(attachment.scale)) visual.scale.setScalar(attachment.scale);
  socket.add(visual);
  bone.add(socket);
  const record = {
    ...attachment,
    socket,
    visual,
    prepared,
    activeBone: attachment.bone,
    activePose: attachment.poses ? "hand" : "fixed",
  };
  actor.sockets.push(record);
  if (attachment.role === "primary") actor.primary = record;
  return record;
}

function removeOverlay(actor) {
  for (const [bone, quaternion] of actor.overlay) bone.quaternion.multiply(quaternion.clone().invert());
  actor.overlay.clear();
  for (const [bone, quaternion] of actor.fittedOverlayBase) bone.quaternion.copy(quaternion);
  actor.fittedOverlayBase.clear();
}

function applyHandOverlay(actor, side, inputs, thumbInputForSide) {
  const euler = new THREE.Euler();
  const fitted = FITTED_GRIP_LOADOUTS.has(weaponSetSelect.value)
    && (side === "Right" || weaponSetSelect.value === "daggers"
      || (["staff", "mace"].includes(weaponSetSelect.value) && twoHandIKAllowed()));
  const applyFingerRotation = (bone, rotation) => {
    if (fitted) {
      if (!actor.fittedOverlayBase.has(bone)) actor.fittedOverlayBase.set(bone, bone.quaternion.clone());
      bone.quaternion.copy(actor.bindFingerQuaternions.get(bone.name) ?? actor.fittedOverlayBase.get(bone));
      bone.quaternion.multiply(rotation).normalize();
    } else {
      // Keep legacy additive overlays exact. Inferring a delta from a source
      // quaternion uses conjugation as inversion and amplifies non-unit source
      // rounding every paused frame, eventually tearing the skinned mesh.
      bone.quaternion.multiply(rotation);
      actor.overlay.set(bone, rotation);
    }
  };
  for (const [finger, input] of Object.entries(inputs)) {
    const angle = Number(input.value);
    for (const segment of [1, 2, 3]) {
      const bone = findBone(actor.bones, `${side}Hand${finger}${segment}`);
      if (!bone) continue;
      const narrowHandle = ["knife", "daggerSingle", "daggers", "rod"].includes(weaponSetSelect.value);
      const segmentWeight = fitted ? (narrowHandle ? [1.2, 1.4, 1.2] : [1.2, 1.2, 1])[segment - 1] : 1;
      const additive = new THREE.Quaternion().setFromEuler(euler.set(angle * segmentWeight, 0, 0, "XYZ"));
      applyFingerRotation(bone, additive);
    }
  }
  const thumb = Number(thumbInputForSide.value);
  const mirror = side === "Left" ? -1 : 1;
  const thumb1 = findBone(actor.bones, `${side}HandThumb1`);
  const thumb2 = findBone(actor.bones, `${side}HandThumb2`);
  if (thumb1) {
    const additive = new THREE.Quaternion().setFromEuler(euler.set(thumb * 0.45, -thumb * mirror, thumb * 0.3 * mirror));
    applyFingerRotation(thumb1, additive);
  }
  if (thumb2) {
    const additive = new THREE.Quaternion().setFromEuler(euler.set(thumb * 0.65, 0, -thumb * 0.25 * mirror));
    applyFingerRotation(thumb2, additive);
  }
  if (fitted) {
    const hand = findBone(actor.bones, `${side}Hand`);
    const tip = findBone(actor.bones, `${side}HandThumb4`);
    const links = [3, 2, 1].map((segment) => findBone(actor.bones, `${side}HandThumb${segment}`)).filter(Boolean);
    // Source caster clips spread the thumb. A bind-relative opposition target
    // closes it onto the outside of the index finger instead of into the shaft.
    if (links[0]) applyFingerRotation(links[0], new THREE.Quaternion());
    actor.model.updateMatrixWorld(true);
    const wandGrip = weaponSetSelect.value === "rod";
    if (wandGrip && thumb1 && thumb2) {
      // Thin wands need thumb opposition from the palm, not the large open
      // C-shaped thumb arc used to wrap a sword/staff handle.
      const origin = thumb1.getWorldPosition(new THREE.Vector3());
      const thumbRootTarget = hand.localToWorld(new THREE.Vector3(0.035 * mirror, 0.035, 0.02).multiplyScalar(1 / actor.model.scale.x));
      const delta = new THREE.Quaternion().setFromUnitVectors(
        thumb2.getWorldPosition(new THREE.Vector3()).sub(origin).normalize(), thumbRootTarget.sub(origin).normalize(),
      );
      const desired = delta.multiply(thumb1.getWorldQuaternion(new THREE.Quaternion()));
      thumb1.quaternion.copy(thumb1.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired)).normalize();
    }
    const thumbTarget = wandGrip ? [0.01 * mirror, 0.064, 0.038] : [0.025 * mirror, 0.062, 0.05];
    const target = hand.localToWorld(new THREE.Vector3().fromArray(thumbTarget).multiplyScalar(1 / actor.model.scale.x));
    for (let iteration = 0; tip && iteration < 8; iteration += 1) {
      for (const bone of wandGrip ? links.slice(0, 2) : links) {
        hand.updateWorldMatrix(true, true);
        const origin = bone.getWorldPosition(new THREE.Vector3());
        const delta = new THREE.Quaternion().setFromUnitVectors(
          tip.getWorldPosition(new THREE.Vector3()).sub(origin).normalize(), target.clone().sub(origin).normalize(),
        );
        const desired = delta.multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
        bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired)).normalize();
      }
    }
  }
}

function applyOverlay(actor) {
  applyHandOverlay(actor, "Right", gripInputs, thumbInput);
  applyHandOverlay(actor, "Left", leftGripInputs, leftThumbInput);
  actor.model.updateMatrixWorld(true);
}

function removeTwoHandIK(actor) {
  for (const [bone, quaternion] of actor.ikBase) bone.quaternion.copy(quaternion);
  actor.ikBase.clear();
  actor.model.updateMatrixWorld(true);
}

function solveGreatswordSheatheArm(actor, side, targetWorld) {
  const hand = findBone(actor.bones, `${side}Hand`);
  const shoulder = findBone(actor.bones, `${side}Shoulder`);
  const links = [`${side}ForeArm`, `${side}Arm`]
    .map((name) => findBone(actor.bones, name))
    .filter(Boolean);
  if (!hand || !shoulder || links.length < 2) return;
  for (const link of [...links, shoulder, hand]) {
    if (!actor.ikBase.has(link)) actor.ikBase.set(link, link.quaternion.clone());
  }
  const linkPosition = new THREE.Vector3();
  const handPosition = new THREE.Vector3();
  const towardHand = new THREE.Vector3();
  const towardTarget = new THREE.Vector3();
  const linkWorld = new THREE.Quaternion();
  const parentWorld = new THREE.Quaternion();
  const deltaWorld = new THREE.Quaternion();
  const desiredWorld = new THREE.Quaternion();
  actor.model.updateMatrixWorld(true);
  shoulder.getWorldPosition(linkPosition);
  hand.getWorldPosition(handPosition);
  towardHand.copy(handPosition).sub(linkPosition);
  towardTarget.copy(targetWorld).sub(linkPosition);
  if (towardHand.lengthSq() >= 1e-8 && towardTarget.lengthSq() >= 1e-8) {
    deltaWorld.setFromUnitVectors(towardHand.normalize(), towardTarget.normalize());
    shoulder.getWorldQuaternion(linkWorld);
    desiredWorld.copy(deltaWorld).multiply(linkWorld);
    shoulder.parent.getWorldQuaternion(parentWorld);
    const solvedShoulder = parentWorld.invert().multiply(desiredWorld).normalize();
    shoulder.quaternion.copy(actor.ikBase.get(shoulder)).slerp(solvedShoulder, 0.52);
  }
  for (let iteration = 0; iteration < 28; iteration += 1) {
    for (const link of links) {
      actor.model.updateMatrixWorld(true);
      link.getWorldPosition(linkPosition);
      hand.getWorldPosition(handPosition);
      towardHand.copy(handPosition).sub(linkPosition);
      towardTarget.copy(targetWorld).sub(linkPosition);
      if (towardHand.lengthSq() < 1e-8 || towardTarget.lengthSq() < 1e-8) continue;
      deltaWorld.setFromUnitVectors(towardHand.normalize(), towardTarget.normalize());
      link.getWorldQuaternion(linkWorld);
      desiredWorld.copy(deltaWorld).multiply(linkWorld);
      link.parent.getWorldQuaternion(parentWorld);
      link.quaternion.copy(parentWorld.invert().multiply(desiredWorld)).normalize();
    }
  }
}

function orientGreatswordSheatheHand(actor, side, socketWorldQuaternion) {
  const state = actor.greatswordSheathe;
  const hand = findBone(actor.bones, `${side}Hand`);
  const relative = state?.handRelative?.[side];
  if (!hand || !relative) return;
  const desiredWorld = socketWorldQuaternion.clone().multiply(relative);
  const parentWorld = hand.parent.getWorldQuaternion(new THREE.Quaternion());
  hand.quaternion.copy(parentWorld.invert().multiply(desiredWorld)).normalize();
}

function applyTwoHandIK(actor) {
  const clipName = actor.action?.getClip().name;
  // Reset the mesh center before all early returns, including one-hand/caster
  // actions and disabled IK. The two-hand fit then centers it between palms.
  centerStaffVisual(actor);
  if (!isCatalogMode() && weaponSetSelect.value === "staff" && clipName?.startsWith("ProMagic__")) {
    fitCasterStaffHand(actor, findBone);
    return;
  }
  if (!twoHandIKEnabled || !twoHandIKAllowed(clipName)) return;
  if (weaponSetSelect.value === "staff") {
    actor.staffGripFit = fitStaffToSourceHands(actor, findBone, currentStaffGripStyle());
    return;
  }
  if (weaponSetSelect.value === "mace") {
    actor.maceGripFit = fitMaceBlockSupport(actor, findBone);
    return;
  }
  if (clipName === GREATSWORD_TWO_HAND_SHEATHE_NAME && actor.greatswordSheathe) {
    const socket = actor.primary.socket;
    const state = actor.greatswordSheathe;
    actor.model.updateMatrixWorld(true);
    socket.updateMatrixWorld(true);
    const rightTargetWorld = socket.localToWorld(state.rightGripLocal.clone());
    const normalizedTime = Number(timeInput.value);
    const gripTighten = THREE.MathUtils.smoothstep(normalizedTime, 0.48, 0.64)
      * (1 - THREE.MathUtils.smoothstep(normalizedTime, 0.82, 0.98));
    state.leftGripLocal = twoHandGripTarget.clone().lerp(new THREE.Vector3(-0.016, -0.055, 0.01), gripTighten);
    const leftTargetWorld = socket.localToWorld(state.leftGripLocal.clone());
    solveGreatswordSheatheArm(actor, "Right", rightTargetWorld);
    solveGreatswordSheatheArm(actor, "Left", leftTargetWorld);
    actor.model.updateMatrixWorld(true);
    const socketWorldQuaternion = socket.getWorldQuaternion(new THREE.Quaternion());
    orientGreatswordSheatheHand(actor, "Right", socketWorldQuaternion);
    orientGreatswordSheatheHand(actor, "Left", socketWorldQuaternion);
    actor.model.updateMatrixWorld(true);
    return;
  }
  const hand = findBone(actor.bones, "LeftHand");
  const links = ["LeftForeArm", "LeftArm", "LeftShoulder"]
    .map((name) => findBone(actor.bones, name))
    .filter(Boolean);
  if (!hand || links.length < 2) return;

  actor.model.updateMatrixWorld(true);
  const targetWorld = actor.primary.socket.localToWorld(twoHandGripTarget.clone());
  for (const link of [...links, hand]) actor.ikBase.set(link, link.quaternion.clone());
  const linkPosition = new THREE.Vector3();
  const handPosition = new THREE.Vector3();
  const towardHand = new THREE.Vector3();
  const towardTarget = new THREE.Vector3();
  const linkWorld = new THREE.Quaternion();
  const parentWorld = new THREE.Quaternion();
  const deltaWorld = new THREE.Quaternion();
  const desiredWorld = new THREE.Quaternion();

  for (let iteration = 0; iteration < 6; iteration += 1) {
    for (const link of links) {
      actor.model.updateMatrixWorld(true);
      link.getWorldPosition(linkPosition);
      hand.getWorldPosition(handPosition);
      towardHand.copy(handPosition).sub(linkPosition);
      towardTarget.copy(targetWorld).sub(linkPosition);
      if (towardHand.lengthSq() < 1e-8 || towardTarget.lengthSq() < 1e-8) continue;
      deltaWorld.setFromUnitVectors(towardHand.normalize(), towardTarget.normalize());
      link.getWorldQuaternion(linkWorld);
      desiredWorld.copy(deltaWorld).multiply(linkWorld);
      link.parent.getWorldQuaternion(parentWorld);
      link.quaternion.copy(parentWorld.invert().multiply(desiredWorld)).normalize();
    }
  }
  hand.quaternion.multiply(new THREE.Quaternion().setFromEuler(twoHandWristCorrection)).normalize();
  actor.model.updateMatrixWorld(true);
}

function removeBowDrawIK(actor) {
  for (const [bone, quaternion] of actor.bowIKBase) bone.quaternion.copy(quaternion);
  actor.bowIKBase.clear();
  actor.model.updateMatrixWorld(true);
}

function applyBowDrawIK(actor) {
  if (isCatalogMode() || weaponSetSelect.value !== "bow") return;
  const clipName = actor.action?.getClip().name ?? "";
  const normalizedTime = Number(timeInput.value);
  const isArrowDraw = clipName === BOW_QUIVER_DRAW_NAME;
  const isTripleDraw = clipName === BOW_TRIPLE_SHOT_NAME && normalizedTime <= BOW_TIMING.tripleArrowNocked;
  const isBowStrike = clipName === BOW_STRIKE_NAME;
  const isEquip = clipName.endsWith("BowEquipFromBack");
  const isStow = clipName.endsWith("BowStowToBack");
  if (!isArrowDraw && !isTripleDraw && !isBowStrike && !isEquip && !isStow) return;

  let side;
  let targetWorld;
  let reachWeight;
  if (isBowStrike) {
    const bow = actor.sockets.find(({ role, asset }) => role === "primary" && asset === "bow");
    if (!bow) return;
    side = "Right";
    targetWorld = bow.socket.localToWorld(new THREE.Vector3(0, -0.09, 0.02));
    reachWeight = THREE.MathUtils.smoothstep(normalizedTime, 0.12, BOW_STRIKE_TIMING.windupEnd)
      * (1 - THREE.MathUtils.smoothstep(normalizedTime, BOW_STRIKE_TIMING.recoverStart, 0.92));
  } else if (isArrowDraw || isTripleDraw) {
    if (!actor.arrowBundle?.pickupLocal) return;
    side = "Right";
    const leftHand = findBone(actor.bones, "LeftHand");
    const rightHand = findBone(actor.bones, "RightHand");
    if (!leftHand || !rightHand) return;
    actor.model.updateMatrixWorld(true);
    const fingerNock = drawFingerNockWorld(actor) ?? rightHand.getWorldPosition(new THREE.Vector3());
    const quiverDirection = ARROW_FLIGHT_AXIS.clone().applyQuaternion(
      actor.arrowBundle.socket.getWorldQuaternion(new THREE.Quaternion()),
    ).normalize();
    const pickup = actor.arrowBundle.socket.localToWorld(actor.arrowBundle.pickupLocal.clone());
    const transferTime = isTripleDraw
      ? THREE.MathUtils.lerp(
        BOW_DRAW_TIMING.featherGrip,
        BOW_DRAW_TIMING.nocked,
        THREE.MathUtils.smoothstep(normalizedTime, BOW_TIMING.tripleArrowPickup, BOW_TIMING.tripleArrowNocked),
      )
      : normalizedTime;
    const transfer = bowArrowTransferPose(
      actor,
      pickup,
      fingerNock,
      transferTime,
      quiverDirection,
      leftHand.getWorldPosition(new THREE.Vector3()),
    );
    targetWorld = transfer.nock.clone();
    reachWeight = THREE.MathUtils.smoothstep(transferTime, BOW_DRAW_TIMING.reachStart, BOW_DRAW_TIMING.featherGrip);
  } else {
    const bow = actor.sockets.find(({ role, asset }) => role === "primary" && asset === "bow");
    const backPose = bow?.poses?.back;
    const backBone = backPose ? findBone(actor.bones, backPose.bone) : null;
    if (!backPose || !backBone) return;
    side = "Left";
    targetWorld = backBone.localToWorld(
      new THREE.Vector3().fromArray(backPose.position).multiplyScalar(1 / actor.model.scale.x),
    );
    reachWeight = isEquip
      ? THREE.MathUtils.smoothstep(normalizedTime, 0.16, 0.28) * (1 - THREE.MathUtils.smoothstep(normalizedTime, 0.34, 0.46))
      : THREE.MathUtils.smoothstep(normalizedTime, 0.24, 0.36) * (1 - THREE.MathUtils.smoothstep(normalizedTime, 0.42, 0.54));
  }
  if (reachWeight <= 0) return;

  const hand = findBone(actor.bones, `${side}Hand`);
  const linkNames = (isArrowDraw || isTripleDraw)
    ? [`${side}Hand`, `${side}ForeArm`, `${side}Arm`, `${side}Shoulder`]
    : [`${side}ForeArm`, `${side}Arm`, `${side}Shoulder`];
  const links = linkNames
    .map((name) => findBone(actor.bones, name))
    .filter(Boolean);
  if (!hand || links.length < 2) return;

  actor.model.updateMatrixWorld(true);
  for (const link of links) actor.bowIKBase.set(link, link.quaternion.clone());
  const linkPosition = new THREE.Vector3();
  const handPosition = new THREE.Vector3();
  const towardHand = new THREE.Vector3();
  const towardTarget = new THREE.Vector3();
  const linkWorld = new THREE.Quaternion();
  const parentWorld = new THREE.Quaternion();
  const deltaWorld = new THREE.Quaternion();
  const desiredWorld = new THREE.Quaternion();

  // Fingertip/pinch IK needs a few more passes than wrist IK because the
  // effector sits at the end of the articulated hand, behind the shoulder at
  // pickup. Extra deterministic passes remove the several-centimeter miss.
  for (let iteration = 0; iteration < 28; iteration += 1) {
    for (const link of links) {
      actor.model.updateMatrixWorld(true);
      link.getWorldPosition(linkPosition);
      if (isArrowDraw || isTripleDraw) {
        handPosition.copy(drawFingerNockWorld(actor) ?? hand.getWorldPosition(new THREE.Vector3()));
      } else {
        hand.getWorldPosition(handPosition);
      }
      towardHand.copy(handPosition).sub(linkPosition);
      towardTarget.copy(targetWorld).sub(linkPosition);
      if (towardHand.lengthSq() < 1e-8 || towardTarget.lengthSq() < 1e-8) continue;
      deltaWorld.setFromUnitVectors(towardHand.normalize(), towardTarget.normalize());
      link.getWorldQuaternion(linkWorld);
      desiredWorld.copy(deltaWorld).multiply(linkWorld);
      link.parent.getWorldQuaternion(parentWorld);
      link.quaternion.copy(parentWorld.invert().multiply(desiredWorld)).normalize();
    }
  }
  for (const link of links) {
    const solved = link.quaternion.clone();
    link.quaternion.copy(actor.bowIKBase.get(link)).slerp(solved, reachWeight);
  }
  actor.model.updateMatrixWorld(true);
}

let actor;
let preparedAssets;
let playing = true;
let loadoutRevision = 0;
let lastArtifactClearanceGuardTime = -Infinity;
let appliedCalibrationRevision = -1;
let applyingCalibration = false;
let followGrip = false;
let followFullBody = true;
let followedTargetReady = false;
let twoHandIKEnabled = twoHandEnabledInput.checked;
let activeActionCalibrationKey = null;
const actionCalibrationStates = new Map();
const followGripOffset = new THREE.Vector3(-1.8, 0.35, 1.8);
const followFullBodyOffset = new THREE.Vector3(0.15, 0.3, 6.35);
const followedTarget = new THREE.Vector3();
const followDelta = new THREE.Vector3();
const twoHandGripTarget = new THREE.Vector3(-0.024, -0.09, 0.016);
const twoHandWristCorrection = new THREE.Euler(0.4, 0, 0, "XYZ");
const DEFAULT_TWO_HAND_TARGET = [-0.024, -0.09, 0.016];
const DEFAULT_TWO_HAND_WRIST = [0.4, 0, 0];
const TWO_HAND_DEFAULTS_BY_LOADOUT = {
  longswordTwoHand: { target: DEFAULT_TWO_HAND_TARGET, wrist: DEFAULT_TWO_HAND_WRIST },
  staff: { target: [-0.062, 0.32, -0.03], wrist: [0, 0, -Math.PI / 2] },
};

function twoHandIKAllowed(clipName = actor?.action?.getClip().name) {
  if (isCatalogMode() || !actor?.primary) return false;
  if (weaponSetSelect.value === "staff") return staffUsesSupportHand(clipName);
  if (weaponSetSelect.value === "mace") return maceUsesSupportHand(clipName);
  return weaponSetSelect.value === "longswordTwoHand" && !GREATSWORD_BACK_TRANSITIONS.has(clipName);
}

function twoHandDefaultsForLoadout() {
  return TWO_HAND_DEFAULTS_BY_LOADOUT[weaponSetSelect.value]
    ?? { target: DEFAULT_TWO_HAND_TARGET, wrist: DEFAULT_TWO_HAND_WRIST };
}

function updateSocketFromControls() {
  if (!actor?.primary) return;
  const actorScale = actor.model.scale.x;
  actor.primary.socket.position.set(
    Number(socketInputs.x.value) / actorScale,
    Number(socketInputs.y.value) / actorScale,
    Number(socketInputs.z.value) / actorScale,
  );
  actor.primary.socket.rotation.set(
    Number(socketInputs.rx.value),
    Number(socketInputs.ry.value),
    Number(socketInputs.rz.value),
  );
  actor.primary.visual.scale.setScalar(Number(socketInputs.scale.value));
  if (actor.primary.asset === "staff") {
    actor.primary.visual.scale.x *= ASSET_SPECS.staff.radialScale;
    actor.primary.visual.scale.z *= ASSET_SPECS.staff.radialScale;
  }
  actor.model.updateMatrixWorld(true);
}

function setAttachmentTransform(role, transform = {}) {
  if (!actor) return false;
  const record = actor.sockets.find((candidate) => candidate.role === role);
  if (!record) return false;
  const actorScale = actor.model.scale.x;
  if (Array.isArray(transform.position)) {
    record.socket.position.fromArray(transform.position).multiplyScalar(1 / actorScale);
  }
  if (Array.isArray(transform.rotation)) record.socket.rotation.fromArray(transform.rotation);
  if (Array.isArray(transform.scale)) record.visual.scale.fromArray(transform.scale);
  else if (Number.isFinite(transform.scale)) record.visual.scale.setScalar(transform.scale);
  actor.model.updateMatrixWorld(true);
  if (role === "harness") updateQuiverHarness(actor);
  return true;
}

function setSocketControls(attachment) {
  const position = attachment?.position ?? [0, 0, 0];
  const rotation = attachment?.rotation ?? [0, 0, 0];
  for (const input of Object.values(socketInputs)) input.disabled = !attachment;
  socketInputs.x.value = position[0]; socketInputs.y.value = position[1]; socketInputs.z.value = position[2];
  socketInputs.rx.value = rotation[0]; socketInputs.ry.value = rotation[1]; socketInputs.rz.value = rotation[2];
  socketInputs.scale.value = 1;
  updateOutputs();
  updateSocketFromControls();
}

function actionCalibrationKey(clipName) {
  return `${isCatalogMode() ? "catalog" : weaponSetSelect.value}::${clipName}`;
}

function gripInputValues(inputs, thumb) {
  return {
    ...Object.fromEntries(Object.entries(inputs).map(([finger, input]) => [finger, Number(input.value)])),
    thumb: Number(thumb.value),
  };
}

function writeGripInputs(inputs, thumb, values) {
  for (const [finger, input] of Object.entries(inputs)) input.value = values[finger] ?? 0;
  thumb.value = values.thumb ?? 0;
}

function defaultActionCalibration(clipName) {
  if (isCatalogMode()) {
    return {
      grip: { ...OPEN_GRIP },
      leftGrip: { ...OPEN_GRIP },
      socket: null,
      twoHandLock: { enabled: false, target: [...DEFAULT_TWO_HAND_TARGET], wrist: [...DEFAULT_TWO_HAND_WRIST] },
    };
  }
  const actionPreset = ACTION_PRESETS[clipName]
    ?? (clipName.startsWith("GreatSword__") ? ACTION_PRESETS.GreatSword__GreatSwordAttack : null);
  const loadoutPreset = LOADOUT_GRIP_PRESETS[weaponSetSelect.value];
  const twoHandDefaults = twoHandDefaultsForLoadout();
  const attachment = activeLoadout().attachments.find(({ role }) => role === "primary");
  const position = attachment?.position ?? [0, 0, 0];
  const rotation = attachment?.rotation ?? [0, 0, 0];
  return {
    grip: { ...(actionPreset?.grip ?? loadoutPreset?.right ?? OPEN_GRIP) },
    leftGrip: { ...(["staff", "mace"].includes(weaponSetSelect.value)
      ? (twoHandIKAllowed(clipName) ? FITTED_HAND_GRIP : OPEN_GRIP)
      : (actionPreset?.leftGrip ?? loadoutPreset?.left ?? OPEN_GRIP)) },
    socket: actor.primary ? (actionPreset?.socket ?? {
      x: position[0], y: position[1], z: position[2],
      rx: rotation[0], ry: rotation[1], rz: rotation[2], scale: 1,
    }) : null,
    twoHandLock: {
      enabled: twoHandIKAllowed(clipName),
      target: [...twoHandDefaults.target],
      wrist: [...twoHandDefaults.wrist],
    },
  };
}

function captureActiveActionCalibration() {
  if (!activeActionCalibrationKey || !actor?.action) return;
  actionCalibrationStates.set(activeActionCalibrationKey, {
    grip: gripInputValues(gripInputs, thumbInput),
    leftGrip: gripInputValues(leftGripInputs, leftThumbInput),
    socket: actor.primary ? Object.fromEntries(Object.entries(socketInputs).map(([key, input]) => [key, Number(input.value)])) : null,
    twoHandLock: {
      enabled: twoHandIKEnabled,
      target: twoHandGripTarget.toArray(),
      wrist: [twoHandWristCorrection.x, twoHandWristCorrection.y, twoHandWristCorrection.z],
    },
  });
}

function restoreActionCalibration(clipName) {
  const key = actionCalibrationKey(clipName);
  const state = actionCalibrationStates.get(key) ?? defaultActionCalibration(clipName);
  activeActionCalibrationKey = key;
  writeGripInputs(gripInputs, thumbInput, state.grip);
  writeGripInputs(leftGripInputs, leftThumbInput, state.leftGrip);
  twoHandIKEnabled = Boolean(state.twoHandLock.enabled);
  twoHandEnabledInput.checked = twoHandIKEnabled;
  twoHandEnabledInput.disabled = !twoHandIKAllowed(clipName);
  twoHandGripTarget.fromArray(state.twoHandLock.target);
  twoHandWristCorrection.set(...state.twoHandLock.wrist, "XYZ");
  [twoHandTargetInputs.x.value, twoHandTargetInputs.y.value, twoHandTargetInputs.z.value] = state.twoHandLock.target;
  [twoHandWristInputs.x.value, twoHandWristInputs.y.value, twoHandWristInputs.z.value] = state.twoHandLock.wrist;
  if (state.socket && actor.primary) {
    for (const [keyName, input] of Object.entries(socketInputs)) input.value = state.socket[keyName];
    updateSocketFromControls();
  } else {
    setSocketControls(null);
  }
  updateOutputs();
}

function disposeModel(model) {
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry?.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials.filter(Boolean)) {
      for (const value of Object.values(material)) {
        if (value?.isTexture) value.dispose();
      }
      material.dispose();
    }
  });
}

async function rebuildLoadout() {
  const revision = ++loadoutRevision;
  captureActiveActionCalibration();
  removeOverlay(actor);
  removeTwoHandIK(actor);
  removeBowDrawIK(actor);
  disposeArrowBundle(actor);
  disposeQuiverHarness(actor);
  actor.bowString = null;
  disposeHandArrowExtras(actor);
  disposeArrowProjectile(actor);
  actor.mixer.stopAllAction();
  actor.action = null;
  activeActionCalibrationKey = null;
  actor.sockets.forEach(({ socket, visual }) => {
    socket.removeFromParent();
    disposeModel(visual);
  });
  actor.sockets = [];
  actor.primary = null;
  actionSelect.replaceChildren();
  actionSelect.disabled = true;
  weaponSetSelect.disabled = true;
  reviewModeSelect.disabled = true;
  catalogActivitySelect.disabled = true;
  catalogLocomotionSelect.disabled = true;
  catalogWeaponSelect.disabled = true;
  catalogActionTypeSelect.disabled = true;
  const loadout = activeLoadout();
  const assetNames = [...new Set(loadout.attachments.map(({ asset }) => asset))];
  const missingRequiredPreviews = assetNames.filter((assetName) => REQUIRED_PREVIEW_TEXTURE_ASSETS.has(assetName) && !PREVIEW_TEXTURE_URLS[assetName]);
  if (missingRequiredPreviews.length) throw new Error(`Placeholder prevention gate: missing browser texture derivative for ${missingRequiredPreviews.join(", ")}.`);
  status.textContent = `Loading ${loadout.label}\n${assetNames.join(" + ")}\nOnly this selected set is entering GPU memory.`;
  const [loadedAssets, previewTextures] = await Promise.all([
    Promise.all(assetNames.map((assetName) => loader.loadAsync(URLS[assetName]))),
    Promise.all(assetNames.map((assetName) => PREVIEW_TEXTURE_URLS[assetName]
      ? textureLoader.loadAsync(PREVIEW_TEXTURE_URLS[assetName])
      : Promise.resolve(null))),
  ]);
  if (revision !== loadoutRevision) {
    loadedAssets.forEach(({ scene: loadedScene }) => disposeModel(loadedScene));
    return;
  }
  preparedAssets = new Map(assetNames.map((assetName, index) => {
    const prepared = prepareAsset(loadedAssets[index].scene, assetName);
    const previewTexture = previewTextures[index];
    if (previewTexture && !prepared.usesCleanLeatherTexture) {
      previewTexture.colorSpace = THREE.SRGBColorSpace;
      previewTexture.flipY = false;
      previewTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      prepared.visual.traverse((object) => {
        if (!object.isMesh) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        const replacements = materials.map((material) => {
          const replacement = material.clone();
          replacement.map = previewTexture;
          replacement.color.set(0xffffff);
          replacement.needsUpdate = true;
          return replacement;
        });
        object.material = Array.isArray(object.material) ? replacements : replacements[0];
      });
    }
    let meshCount = 0;
    const untexturedMeshes = [];
    prepared.visual.traverse((object) => {
      if (!object.isMesh) return;
      meshCount += 1;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.some((material) => !material?.map)) untexturedMeshes.push(object.name || `mesh-${meshCount}`);
    });
    if (!meshCount || untexturedMeshes.length) {
      throw new Error(`Placeholder prevention gate: ${assetName} has ${meshCount ? `untextured mesh material(s): ${untexturedMeshes.join(", ")}` : "no renderable mesh"}.`);
    }
    return [assetName, prepared];
  }));
  loadout.attachments.forEach((attachment) => addAttachment(actor, preparedAssets, attachment));
  buildBowStringRig(actor);
  buildArrowBundle(actor, preparedAssets);
  buildQuiverHarness(actor);
  buildHandArrowExtras(actor);
  buildArrowProjectile(actor, preparedAssets);
  const availableActions = isCatalogMode()
    ? catalogClips().map((clipName) => [AUTHORED_GAP_LABELS.get(clipName) ?? `${sourcePrefix(clipName)} — ${clipName.split("__").at(-1)}`, clipName])
    : [...ACTIONS[loadout.actionFamily], ...locomotionActions(weaponSetSelect.value, actor.clips)]
      .filter((row, index, rows) => rows.findIndex((candidate) => candidate[1] === row[1]) === index);
  for (const [label, clipName] of availableActions) {
    if (actor.clips.has(clipName)) actionSelect.add(new Option(label, clipName));
  }
  if (!actionSelect.options.length) {
    const catalogDescription = `${catalogActivitySelect.value}/${catalogLocomotionSelect.value}/${catalogWeaponSelect.value}/${catalogActionTypeSelect.value}`;
    throw new Error(`No source animations matched ${isCatalogMode() ? catalogDescription : loadout.actionFamily}.`);
  }
  actionSelect.disabled = false;
  weaponSetSelect.disabled = false;
  reviewModeSelect.disabled = false;
  catalogActivitySelect.disabled = false;
  catalogLocomotionSelect.disabled = false;
  catalogWeaponSelect.disabled = false;
  catalogActionTypeSelect.disabled = false;
  updateReviewControls();
  activateAction(actionSelect.value);
  fullView();
}

function activateAction(clipName) {
  captureActiveActionCalibration();
  removeOverlay(actor);
  removeTwoHandIK(actor);
  removeBowDrawIK(actor);
  actor.mixer.stopAllAction();
  const clip = actor.clips.get(clipName);
  if (!clip) throw new Error(`Animation clip is missing: ${clipName}`);
  actor.action = actor.mixer.clipAction(clip);
  actor.action.reset();
  actor.action.clampWhenFinished = true;
  actor.action.setLoop(loopInput.checked ? THREE.LoopRepeat : THREE.LoopOnce, loopInput.checked ? Infinity : 1);
  actor.action.play();
  actor.action.paused = !playing;
  timeInput.value = 0;
  actor.mixer.update(0);
  restoreActionCalibration(clipName);
  updateReviewControls();
  updateGreatswordSheathePreview();
  updateBowCarryPreview();
  applyOverlay(actor);
  applyBowDrawIK(actor);
  applyTwoHandIK(actor);
  updateBowInventoryPreview();
  enforceMountedArtifactClearance(actor);
  updateStatus();
}

function updateOutputs() {
  for (const input of [
    ...Object.values(gripInputs), thumbInput,
    ...Object.values(leftGripInputs), leftThumbInput,
    ...Object.values(twoHandTargetInputs), ...Object.values(twoHandWristInputs),
    timeInput, ...Object.values(socketInputs),
  ]) {
    const output = document.querySelector(`#${input.id}Out`);
    if (output) output.textContent = Number(input.value).toFixed(input === socketInputs.scale ? 2 : 3);
  }
  document.querySelector("#speedOut").textContent = `${Number(speedInput.value).toFixed(1)}x`;
  document.querySelector("#minimumBowRangeOut").textContent = `${Number(minimumBowRangeInput.value).toFixed(1)}m`;
}

function updateStatus() {
  if (!actor?.action) return;
  const loadout = activeLoadout();
  const attachments = actor.sockets.map(({ asset, bone, activeBone, activePose, role }) => `${role}:${asset}@${activeBone ?? bone}[${activePose ?? "fixed"}]`).join(" | ") || "none";
  const primarySocket = actor.primary
    ? `position=[${[socketInputs.x, socketInputs.y, socketInputs.z].map((input) => Number(input.value).toFixed(3)).join(", ")}]m euler=[${[socketInputs.rx, socketInputs.ry, socketInputs.rz].map((input) => Number(input.value).toFixed(3)).join(", ")}]rad scale=${Number(socketInputs.scale.value).toFixed(2)}`
    : "none (unarmed)";
  status.textContent = [
    `reviewMode=${isCatalogMode() ? "human-animation-catalog" : "human-weapons"}`,
    `loadout=${loadout.label}`,
    `sourceGroup=${sourcePrefix(actor.action.getClip().name)} catalogFilters=${isCatalogMode() ? `${catalogActivitySelect.value}/${catalogLocomotionSelect.value}/${catalogWeaponSelect.value}/${catalogActionTypeSelect.value}` : "n/a"}`,
    `progression=${loadout.progression ?? "starter"}`,
    `animationMatch=${loadout.match}`,
    `action=${actionSelect.options[actionSelect.selectedIndex]?.text ?? actionSelect.value}`,
    `missingActions=${loadout.missing ?? "none"}`,
    `playback=${playing ? "playing" : "paused"} speed=${Number(speedInput.value).toFixed(1)}x normalizedTime=${Number(timeInput.value).toFixed(3)}`,
    `attachments=${attachments}`,
    `previewTextures=${actor.sockets.map(({ asset }) => `${asset}:${PREVIEW_TEXTURE_URLS[asset] ? "embedded-baseColor-2k" : "source-material"}`).join(" | ") || "none"}`,
    `primarySocket ${primarySocket}`,
    `rightGrip index/middle/ring/pinky=[${Object.values(gripInputs).map((input) => Number(input.value).toFixed(3)).join(", ")}] thumb=${Number(thumbInput.value).toFixed(3)}`,
    `leftGrip index/middle/ring/pinky=[${Object.values(leftGripInputs).map((input) => Number(input.value).toFixed(3)).join(", ")}] thumb=${Number(leftThumbInput.value).toFixed(3)}`,
    ...(!isCatalogMode() && weaponSetSelect.value === "bow" ? [
      `bowInventory total=${actor.arrowBundle?.totalInventory ?? Number(arrowCountInput.value)} inQuiver=${actor.arrowBundle?.displayedInQuiver ?? 0} handArrows=${actor.arrowBundle?.handArrowCount ?? 0} firedArrows=${actor.arrowBundle?.firedArrowCount ?? 0} projectileDistance=${actor.projectile?.distanceMeters?.toFixed(2) ?? "0.00"}m`,
      `bowCombat minimumRangedDistance=${Number(minimumBowRangeInput.value).toFixed(1)}m closeRangeFallbacks=[bow-strike, swap-to-melee]`,
    ] : []),
    `twoHandLock enabled=${twoHandIKEnabled} active=${twoHandIKEnabled && twoHandIKAllowed()} target=[${twoHandGripTarget.toArray().map((value) => value.toFixed(3)).join(", ")}] wrist=[${[twoHandWristCorrection.x, twoHandWristCorrection.y, twoHandWristCorrection.z].map((value) => value.toFixed(3)).join(", ")}]`,
    `calibrationKey=${activeActionCalibrationKey}`,
    ...(weaponSetSelect.value === "staff" && !isCatalogMode() ? [`staffGripStyle=${staffGripSelect.value} support=${staffUsesSupportHand(actionSelect.value) ? "two-hand fighting" : "source free-hand / caster"}`] : []),
    `placeholderAssetGate=PASS`,
    "source=#435 preserved Smart Mesh GLBs | animation=Human Foundation V2 library",
  ].join("\n");
  window.__weaponLab = {
    ready: true,
    reviewMode: reviewModeSelect.value,
    loadout: isCatalogMode() ? "catalog" : weaponSetSelect.value,
    action: actionSelect.value,
    playing,
    normalizedTime: Number(timeInput.value),
    preset: ACTION_PRESETS[actionSelect.value]?.name ?? "per-action-calibration",
    calibrationKey: activeActionCalibrationKey,
    catalog: {
      totalClips: actor.clips.size,
      sourceClips: actor.sourceClipCount,
      authoredGapClips: actor.authoredGapCount,
      activity: catalogActivitySelect.value,
      locomotionType: catalogLocomotionSelect.value,
      weapon: catalogWeaponSelect.value,
      actionType: catalogActionTypeSelect.value,
      visibleClips: actionSelect.options.length,
    },
    progression: loadout.progression ?? "starter",
    animationMatch: loadout.match,
    combatRules: {
      minimumBowRangeMeters: Number(minimumBowRangeInput.value),
      insideMinimumBowRange: [BOW_STRIKE_NAME, "swap-to-melee"],
    },
    attachments: actor.sockets.map(({ asset, bone, activeBone, activePose, role, socket, visual }) => ({
      asset,
      bone: activeBone ?? bone,
      pose: activePose ?? "fixed",
      role,
      position: socket.position.toArray().map((value) => value * actor.model.scale.x),
      rotation: [socket.rotation.x, socket.rotation.y, socket.rotation.z],
      scale: visual.scale.x,
    })),
    setAttachment: setAttachmentTransform,
    getHandPose: (side = "Left") => Object.fromEntries([...actor.bones]
      .filter(([name]) => name.includes(`${side}Hand`)).map(([name, bone]) => [name, bone.quaternion.toArray()])),
    setWeaponAssetView: (visibleBody = false) => {
      actor.model.traverse((mesh) => { if (mesh.isSkinnedMesh) mesh.visible = visibleBody; });
      if (!actor.primary) return;
      const box = new THREE.Box3().setFromObject(actor.primary.visual, true);
      followGrip = false;
      followFullBody = false;
      setFollowView(box.getCenter(new THREE.Vector3()), new THREE.Vector3(0, 0.15, box.getSize(new THREE.Vector3()).length() * 2), 35);
    },
    setHandGrip: (side, values) => {
      const inputs = side === "Left" ? leftGripInputs : gripInputs;
      const thumb = side === "Left" ? leftThumbInput : thumbInput;
      writeGripInputs(inputs, thumb, { ...gripInputValues(inputs, thumb), ...values });
    },
    setWeaponHandView: (side = "Right", offset = [-0.4, 0.1, 0.5], fov = 32) => {
      const hand = findBone(actor.bones, `${side}Hand`);
      if (!hand) return;
      followGrip = false;
      followFullBody = false;
      setFollowView(hand.getWorldPosition(new THREE.Vector3()), new THREE.Vector3().fromArray(offset), fov);
    },
    getWeaponHandContacts: () => actor.sockets.filter((record) => ["primary", "offhand"].includes(record.role))
      .flatMap((record) => {
        const contacts = [weaponHandContactMetrics(actor, record, record.bone.startsWith("Left") ? "Left" : "Right")];
        if (record.asset === "staff" && twoHandIKEnabled && twoHandIKAllowed()) contacts.push(weaponHandContactMetrics(actor, record, "Left", actor.staffGripFit?.supportAlongShaft ?? twoHandGripTarget.y));
        if (record.asset === "mace" && twoHandIKEnabled && twoHandIKAllowed()) contacts.push(weaponHandContactMetrics(actor, record, "Left", 0.24));
        return contacts;
      }),
    setGripView: (offset = [1.5, 0.3, 1.5], fov = 35) => handView(offset, fov),
    setBowGripView: (offset = [0.55, 0.12, 0.55], fov = 30) => {
      const bow = actor.sockets.find(({ role, asset }) => role === "primary" && asset === "bow");
      if (!bow) return;
      followGrip = false;
      followFullBody = false;
      setFollowView(bow.socket.getWorldPosition(new THREE.Vector3()), new THREE.Vector3().fromArray(offset), fov);
    },
    setBowHandPose: ({ position, rotation } = {}) => {
      const bow = actor.sockets.find(({ role, asset }) => role === "primary" && asset === "bow");
      if (!bow?.poses?.hand) return null;
      if (position) bow.poses.hand.position = [...position];
      if (rotation) bow.poses.hand.rotation = [...rotation];
      applyAttachmentPose(bow, "hand");
      return { position: [...bow.poses.hand.position], rotation: [...bow.poses.hand.rotation] };
    },
    setLeftGrip: (values = {}) => {
      writeGripInputs(leftGripInputs, leftThumbInput, {
        ...gripInputValues(leftGripInputs, leftThumbInput),
        ...values,
      });
      return gripInputValues(leftGripInputs, leftThumbInput);
    },
    setActionView: actionView,
    setBackView: backView,
    setQuiverView: (offset = [0.75, 0.08, -1.65], fov = 32) => {
      if (!actor.arrowBundle) return;
      const target = actor.arrowBundle.socket.localToWorld(actor.arrowBundle.pickupLocal.clone().multiplyScalar(0.55));
      followGrip = false;
      followFullBody = false;
      setFollowView(target, new THREE.Vector3().fromArray(offset), fov);
    },
    getArrowBundleTransform: () => ({
      position: actor.arrowBundle?.socket.position.toArray().map((value) => value * actor.model.scale.x) ?? null,
      rotation: actor.arrowBundle
        ? [actor.arrowBundle.socket.rotation.x, actor.arrowBundle.socket.rotation.y, actor.arrowBundle.socket.rotation.z]
        : null,
    }),
    setArrowBundleTransform: ({ position, rotation } = {}) => {
      if (!actor.arrowBundle) return null;
      if (position) actor.arrowBundle.socket.position.fromArray(position).multiplyScalar(1 / actor.model.scale.x);
      if (rotation) actor.arrowBundle.socket.rotation.fromArray(rotation);
      actor.arrowBundle.socket.updateMatrixWorld(true);
      updateBowInventoryPreview();
      return window.__weaponLab.getArrowBundleTransform();
    },
    getQuiverMeshBounds: () => {
      const quiver = actor.sockets.find(({ role, asset }) => role === "back" && asset === "quiver");
      if (!quiver) return [];
      const bounds = [];
      quiver.visual.traverse((object) => {
        if (!object.isMesh) return;
        const box = new THREE.Box3().setFromObject(object, true);
        bounds.push({
          name: object.name,
          center: box.getCenter(new THREE.Vector3()).toArray(),
          size: box.getSize(new THREE.Vector3()).toArray(),
        });
      });
      return bounds;
    },
    getCameraState: () => ({
      position: camera.position.toArray(),
      target: controls.target.toArray(),
      distance: camera.position.distanceTo(controls.target),
      followMode: followGrip ? "grip" : followFullBody ? "full" : "free",
    }),
    setTwoHandIKEnabled: (enabled) => {
      twoHandIKEnabled = Boolean(enabled);
      twoHandEnabledInput.checked = twoHandIKEnabled;
      return twoHandIKEnabled;
    },
    setTwoHandTarget: (offset) => {
      twoHandGripTarget.fromArray(offset);
      [twoHandTargetInputs.x.value, twoHandTargetInputs.y.value, twoHandTargetInputs.z.value] = twoHandGripTarget.toArray();
      updateOutputs();
      return twoHandGripTarget.toArray();
    },
    setTwoHandWrist: (euler) => {
      twoHandWristCorrection.fromArray([...euler, "XYZ"]);
      [twoHandWristInputs.x.value, twoHandWristInputs.y.value, twoHandWristInputs.z.value] = [twoHandWristCorrection.x, twoHandWristCorrection.y, twoHandWristCorrection.z];
      updateOutputs();
      return [twoHandWristCorrection.x, twoHandWristCorrection.y, twoHandWristCorrection.z];
    },
    getBowMetrics: () => {
      actor.model.updateMatrixWorld(true);
      const rightHand = findBone(actor.bones, "RightHand");
      const leftHand = findBone(actor.bones, "LeftHand");
      const quiver = actor.sockets.find(({ role, asset }) => role === "back" && asset === "quiver");
      const bow = actor.sockets.find(({ role, asset }) => role === "primary" && asset === "bow");
      const handArrow = actor.sockets.find(({ role, asset }) => role === "ammo" && asset === "arrow");
      const openingWorld = quiver && actor.arrowBundle?.quiverOpeningLocal
        ? quiver.socket.localToWorld(actor.arrowBundle.quiverOpeningLocal.clone())
        : null;
      const pickupWorld = actor.arrowBundle?.pickupLocal
        ? actor.arrowBundle.socket.localToWorld(actor.arrowBundle.pickupLocal.clone())
        : null;
      const handWorld = rightHand?.getWorldPosition(new THREE.Vector3()) ?? null;
      const drawNockWorld = drawFingerNockWorld(actor);
      const headWorld = findBone(actor.bones, "Head")?.getWorldPosition(new THREE.Vector3()) ?? null;
      const spineWorld = findBone(actor.bones, "Spine2")?.getWorldPosition(new THREE.Vector3()) ?? null;
      const rightUpperArmWorld = findBone(actor.bones, "RightArm")?.getWorldPosition(new THREE.Vector3()) ?? null;
      const rightElbowWorld = findBone(actor.bones, "RightForeArm")?.getWorldPosition(new THREE.Vector3()) ?? null;
      const rightThumbWorld = (findBone(actor.bones, "RightHandThumb3")
        ?? findBone(actor.bones, "RightHandThumb2"))?.getWorldPosition(new THREE.Vector3()) ?? null;
      const rightIndexWorld = (findBone(actor.bones, "RightHandIndex3")
        ?? findBone(actor.bones, "RightHandIndex2"))?.getWorldPosition(new THREE.Vector3()) ?? null;
      const rightElbowAngleDegrees = rightUpperArmWorld && rightElbowWorld && handWorld
        ? THREE.MathUtils.radToDeg(
          rightUpperArmWorld.clone().sub(rightElbowWorld).angleTo(handWorld.clone().sub(rightElbowWorld)),
        )
        : null;
      const handArrowNockWorld = handArrow
        ? handArrow.socket.localToWorld(new THREE.Vector3(0, handArrow.prepared.normalizedBounds.min.y, 0))
        : null;
      const handArrowFeatherGripWorld = handArrow
        ? handArrow.socket.localToWorld(new THREE.Vector3(0, handArrow.prepared.normalizedBounds.min.y + 0.075, 0))
        : null;
      const handArrowTipWorld = handArrow
        ? handArrow.socket.localToWorld(new THREE.Vector3(0, handArrow.prepared.normalizedBounds.max.y, 0))
        : null;
      const leftHandWorld = leftHand?.getWorldPosition(new THREE.Vector3()) ?? null;
      const leftFingerBases = ["LeftHandIndex1", "LeftHandMiddle1", "LeftHandRing1", "LeftHandPinky1"]
        .map((name) => findBone(actor.bones, name)?.getWorldPosition(new THREE.Vector3()))
        .filter(Boolean);
      const leftFingerBaseCenterWorld = leftFingerBases.length
        ? leftFingerBases.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / leftFingerBases.length)
        : null;
      const leftPalmGripTargetWorld = leftHandWorld && leftFingerBaseCenterWorld
        ? leftHandWorld.clone().lerp(leftFingerBaseCenterWorld, 0.68)
        : null;
      const leftPalmGripTargetInHand = leftHand && leftPalmGripTargetWorld
        ? leftHand.worldToLocal(leftPalmGripTargetWorld.clone()).multiplyScalar(actor.model.scale.x)
        : null;
      const bowGripWorld = bow?.socket.getWorldPosition(new THREE.Vector3()) ?? null;
      const handArrowDirection = handArrowNockWorld && handArrowTipWorld
        ? handArrowTipWorld.clone().sub(handArrowNockWorld).normalize()
        : null;
      const arrowTipBeyondBowGripMeters = handArrowTipWorld && bowGripWorld && handArrowDirection
        ? handArrowTipWorld.clone().sub(bowGripWorld).dot(handArrowDirection)
        : null;
      const transformSignature = (object) => {
        if (!object) return null;
        object.updateMatrixWorld(true);
        return object.matrixWorld.elements.map((value) => value.toFixed(6)).join(",");
      };
      const backPose = bow?.poses?.back;
      const backBone = backPose ? findBone(actor.bones, backPose.bone) : null;
      const backGripWorld = backBone && backPose
        ? backBone.localToWorld(new THREE.Vector3().fromArray(backPose.position).multiplyScalar(1 / actor.model.scale.x))
        : null;
      const bowStrikeGripWorld = bow
        ? bow.socket.localToWorld(new THREE.Vector3(0, -0.09, 0.02))
        : null;
      const harnessStrapBounds = actor.quiverHarness?.straps?.map((mesh) => {
        const bounds = new THREE.Box3().setFromObject(mesh, true);
        return {
          name: mesh.name,
          centerWorld: bounds.getCenter(new THREE.Vector3()).toArray(),
          sizeMeters: bounds.getSize(new THREE.Vector3()).toArray(),
        };
      }) ?? [];
      return {
        bowPose: bow?.activePose ?? null,
        bowBone: bow?.activeBone ?? null,
        handArrowVisible: actor.arrowBundle?.handArrowVisible ?? false,
        handArrowCount: actor.arrowBundle?.handArrowCount ?? 0,
        displayedInQuiver: actor.arrowBundle?.displayedInQuiver ?? 0,
        arrowBundleVisibleInstanceCount: actor.arrowBundle?.meshes[0]?.count ?? 0,
        arrowBundleIndependent: Boolean(actor.arrowBundle && quiver && actor.arrowBundle.socket.parent !== quiver.socket),
        arrowBundleParentName: actor.arrowBundle?.socket.parent?.name ?? null,
        quiverParentName: quiver?.socket.parent?.name ?? null,
        arrowBundleWorldSignature: transformSignature(actor.arrowBundle?.socket),
        quiverWorldSignature: transformSignature(quiver?.socket),
        projectileVisible: actor.projectile?.visuals.some((visual) => visual.visible) ?? false,
        projectileCount: actor.projectile?.visuals.filter((visual) => visual.visible).length ?? 0,
        projectileDistanceMeters: actor.projectile?.distanceMeters ?? 0,
        rightHandToQuiverMouthMeters: handWorld && openingWorld ? handWorld.distanceTo(openingWorld) : null,
        rightHandToQuiverPickupMeters: handWorld && pickupWorld ? handWorld.distanceTo(pickupWorld) : null,
        drawNockToQuiverMouthMeters: drawNockWorld && openingWorld ? drawNockWorld.distanceTo(openingWorld) : null,
        drawNockToQuiverPickupMeters: drawNockWorld && pickupWorld ? drawNockWorld.distanceTo(pickupWorld) : null,
        handArrowNockToQuiverPickupMeters: handArrowNockWorld && pickupWorld ? handArrowNockWorld.distanceTo(pickupWorld) : null,
        handArrowNockToDrawNockMeters: handArrowNockWorld && drawNockWorld ? handArrowNockWorld.distanceTo(drawNockWorld) : null,
        handArrowFeatherGripToDrawNockMeters: handArrowFeatherGripWorld && drawNockWorld
          ? handArrowFeatherGripWorld.distanceTo(drawNockWorld)
          : null,
        rightElbowAngleDegrees,
        rightGripPinchSpreadMeters: rightThumbWorld && rightIndexWorld
          ? rightThumbWorld.distanceTo(rightIndexWorld)
          : null,
        handArrowHighestPointAboveHeadMeters: headWorld && handArrowNockWorld && handArrowTipWorld
          ? Math.max(handArrowNockWorld.y, handArrowTipWorld.y) - headWorld.y
          : null,
        drawNockBelowSpineMeters: spineWorld && drawNockWorld ? spineWorld.y - drawNockWorld.y : null,
        bowStringPulled: actor.bowString?.pulled ?? false,
        bowStringPullAlpha: actor.bowString?.pullAlpha ?? 0,
        bowStringNockErrorMeters: actor.bowString?.nockErrorMeters ?? null,
        minimumQuiverBodyClearanceMeters: minimumQuiverBodyClearance(actor),
        minimumHarnessBodyClearanceMeters: minimumHarnessBodyClearance(actor),
        artifactBodyClearances: artifactBodyClearanceMetrics(actor),
        handArrowBodyClearanceMeters: minimumHandArrowBodyClearance(actor, handArrow),
        handArrowCollisionMode: handArrowCollisionMode(actor),
        handArrowWristClearanceMeters: minimumHandArrowWristClearance(actor, handArrow),
        handArrowDirection: handArrowDirection?.toArray() ?? null,
        handArrowLengthMeters: handArrow?.prepared.normalizedBounds.getSize(new THREE.Vector3()).y ?? null,
        handArrowRadialDiameterMeters: handArrow
          ? Math.max(
            handArrow.prepared.normalizedBounds.getSize(new THREE.Vector3()).x,
            handArrow.prepared.normalizedBounds.getSize(new THREE.Vector3()).z,
          )
          : null,
        bowHandleRadialDiameterMeters: bow
          ? Math.max(
            bow.prepared.normalizedBounds.getSize(new THREE.Vector3()).x,
            bow.prepared.normalizedBounds.getSize(new THREE.Vector3()).z,
          ) * bow.visual.scale.x
          : null,
        bowGripToWristMeters: bowGripWorld && leftHandWorld ? bowGripWorld.distanceTo(leftHandWorld) : null,
        bowGripToPalmChannelMeters: bowGripWorld && leftPalmGripTargetWorld
          ? bowGripWorld.distanceTo(leftPalmGripTargetWorld)
          : null,
        leftPalmGripTargetWorld: leftPalmGripTargetWorld?.toArray() ?? null,
        leftPalmGripTargetInHand: leftPalmGripTargetInHand?.toArray() ?? null,
        bowGripWorld: bowGripWorld?.toArray() ?? null,
        bowHandleContact: bowHandleContactMetrics(actor, bow),
        quiverHarnessVisible: actor.quiverHarness?.mesh.visible ?? false,
        quiverHarnessStrapCount: actor.quiverHarness?.strapCount ?? 0,
        quiverHarnessFit: actor.quiverHarness?.fitDiagnostic ?? null,
        quiverHarnessStrapBounds: harnessStrapBounds,
        quiverHarnessClearanceDiagnostic: harnessBodyClearanceMetrics(actor),
        arrowTipBeyondBowGripMeters,
        bowStrike: {
          actionName: BOW_STRIKE_NAME,
          selected: actor.action?.getClip().name === BOW_STRIKE_NAME,
          windupEnd: BOW_STRIKE_TIMING.windupEnd,
          contactNormalizedTime: BOW_STRIKE_TIMING.contact,
          recoverStart: BOW_STRIKE_TIMING.recoverStart,
          atContact: actor.action?.getClip().name === BOW_STRIKE_NAME
            && Math.abs(Number(timeInput.value) - BOW_STRIKE_TIMING.contact) <= 0.035,
          rightHandGripErrorMeters: bowStrikeGripWorld && handWorld
            ? bowStrikeGripWorld.distanceTo(handWorld)
            : null,
          minimumRangedDistanceMeters: Number(minimumBowRangeInput.value),
          fallbackOptions: ["bow-strike", "swap-to-melee"],
        },
        quiverBundleMaxRadiusMeters: actor.arrowBundle?.bundleRadiusMeters ?? null,
        quiverBundleLocalSignature: actor.arrowBundle?.localSignature ?? null,
        arrowBundleMaxRadiusMeters: actor.arrowBundle?.bundleRadiusMeters ?? null,
        arrowBundleLocalSignature: actor.arrowBundle?.localSignature ?? null,
        quiverPickupWorld: pickupWorld?.toArray() ?? null,
        drawNockWorld: drawNockWorld?.toArray() ?? null,
        drawNockInQuiver: quiver && drawNockWorld ? quiver.socket.worldToLocal(drawNockWorld.clone()).toArray() : null,
        drawNockInSpine: drawNockWorld ? findBone(actor.bones, "Spine2")?.worldToLocal(drawNockWorld.clone()).toArray() ?? null : null,
        quiverPickupInSpine: pickupWorld ? findBone(actor.bones, "Spine2")?.worldToLocal(pickupWorld.clone()).toArray() ?? null : null,
        actorScale: actor.model.scale.x,
        rightShoulderWorld: findBone(actor.bones, "RightShoulder")?.getWorldPosition(new THREE.Vector3()).toArray() ?? null,
        leftShoulderWorld: findBone(actor.bones, "LeftShoulder")?.getWorldPosition(new THREE.Vector3()).toArray() ?? null,
        leftHandToBackBowGripMeters: leftHandWorld && backGripWorld ? leftHandWorld.distanceTo(backGripWorld) : null,
      };
    },
    getGripMetrics: () => {
      if (!actor.primary) return { unarmed: true, targetErrorMeters: null };
      actor.model.updateMatrixWorld(true);
      const rightHand = findBone(actor.bones, "RightHand");
      const leftHand = findBone(actor.bones, "LeftHand");
      const socket = actor.primary.socket;
      const rightWorld = rightHand.getWorldPosition(new THREE.Vector3());
      const leftWorld = leftHand.getWorldPosition(new THREE.Vector3());
      const targetWorld = socket.localToWorld(twoHandGripTarget.clone());
      return {
        rightWorld: rightWorld.toArray(),
        leftWorld: leftWorld.toArray(),
        rightInSocket: socket.worldToLocal(rightWorld.clone()).toArray(),
        leftInSocket: socket.worldToLocal(leftWorld.clone()).toArray(),
        targetInSocket: twoHandGripTarget.toArray(),
        wristCorrection: [twoHandWristCorrection.x, twoHandWristCorrection.y, twoHandWristCorrection.z],
        targetErrorMeters: leftWorld.distanceTo(targetWorld),
      };
    },
    getArtifactCollisionMetrics: () => ({
      clearances: artifactBodyClearanceMetrics(actor),
      corrections: enforceMountedArtifactClearance(actor),
    }),
    getGreatswordMetrics: () => {
      if (!actor.primary || actor.primary.asset !== "longsword") return { active: false };
      actor.model.updateMatrixWorld(true);
      const socket = actor.primary.socket;
      const state = actor.greatswordSheathe;
      const rightHand = findBone(actor.bones, "RightHand");
      const leftHand = findBone(actor.bones, "LeftHand");
      const rightShoulder = findBone(actor.bones, "RightShoulder");
      const spine = findBone(actor.bones, "Spine2");
      const head = findBone(actor.bones, "Head");
      const rightWorld = rightHand?.getWorldPosition(new THREE.Vector3()) ?? null;
      const leftWorld = leftHand?.getWorldPosition(new THREE.Vector3()) ?? null;
      const hiltWorld = socket.getWorldPosition(new THREE.Vector3());
      const rightTargetWorld = state
        ? socket.localToWorld(state.rightGripLocal.clone())
        : hiltWorld.clone();
      const leftTargetWorld = socket.localToWorld(state?.leftGripLocal ?? twoHandGripTarget.clone());
      const bladeTipWorld = socket.localToWorld(
        new THREE.Vector3(0, actor.primary.prepared.targetLength * 0.9, 0),
      );
      return {
        active: actor.action?.getClip().name === GREATSWORD_TWO_HAND_SHEATHE_NAME,
        durationSeconds: actor.action?.getClip().duration ?? null,
        pose: actor.primary.activePose,
        socketParentName: socket.parent?.name ?? null,
        hiltWorld: hiltWorld.toArray(),
        hiltInSpine: spine ? spine.worldToLocal(hiltWorld.clone()).toArray() : null,
        bladeTipWorld: bladeTipWorld.toArray(),
        bladeDirection: bladeTipWorld.clone().sub(hiltWorld).normalize().toArray(),
        minimumBladeBodyClearanceMeters: minimumGreatswordBodyClearance(actor, hiltWorld, bladeTipWorld),
        rightShoulderWorld: rightShoulder?.getWorldPosition(new THREE.Vector3()).toArray() ?? null,
        headWorld: head?.getWorldPosition(new THREE.Vector3()).toArray() ?? null,
        rightHandErrorMeters: rightWorld ? rightWorld.distanceTo(rightTargetWorld) : null,
        leftHandErrorMeters: leftWorld ? leftWorld.distanceTo(leftTargetWorld) : null,
      };
    },
  };
}

function setFollowView(target, offset, fov) {
  followedTarget.copy(target);
  followedTargetReady = true;
  controls.target.copy(target);
  camera.position.copy(target).add(offset);
  camera.fov = fov;
  camera.updateProjectionMatrix();
  controls.update();
}

function translateFollowTarget(target) {
  if (!followedTargetReady) {
    followedTarget.copy(target);
    followedTargetReady = true;
    return;
  }
  followDelta.copy(target).sub(followedTarget);
  camera.position.add(followDelta);
  controls.target.add(followDelta);
  followedTarget.copy(target);
}

function fullView() {
  followGrip = false;
  followFullBody = true;
  const hips = actor ? findBone(actor.bones, "Hips") : null;
  const target = hips?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3(0, 1.05, 0);
  setFollowView(target, followFullBodyOffset, 44);
}

function backView() {
  followGrip = false;
  followFullBody = true;
  const hips = actor ? findBone(actor.bones, "Hips") : null;
  const target = hips?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3(0, 1.05, 0);
  setFollowView(target, new THREE.Vector3(0.15, 0.3, -6.35), 44);
}

function handTarget() {
  const hands = [findBone(actor.bones, "RightHand"), findBone(actor.bones, "LeftHand")].filter(Boolean);
  return hands.reduce((sum, bone) => sum.add(bone.getWorldPosition(new THREE.Vector3())), new THREE.Vector3()).multiplyScalar(1 / hands.length);
}

function handView(offset = [1.5, 0.3, 1.5], fov = 35) {
  if (!actor) return;
  const target = handTarget();
  followGrip = true;
  followFullBody = false;
  followGripOffset.fromArray(offset);
  setFollowView(target, followGripOffset, fov);
}

function actionView() {
  handView([-1.8, 0.35, 1.8], 40);
}

function setPlaying(next) {
  playing = next;
  if (playing) (isCatalogMode() ? fullView() : actionView());
  if (actor?.action) actor.action.paused = !playing;
  playButton.textContent = playing ? "Pause" : "Play";
  playButton.classList.toggle("active", playing);
  updateStatus();
}

async function applyLiveCalibration(calibration) {
  if (!actor || calibration.revision === appliedCalibrationRevision) return;
  applyingCalibration = true;
  try {
    if (calibration.reviewMode && calibration.reviewMode !== reviewModeSelect.value) {
      reviewModeSelect.value = calibration.reviewMode;
      updateReviewControls();
      await rebuildLoadout();
    }
    const catalogFilterChanged = [
      ["catalogActivity", catalogActivitySelect],
      ["catalogLocomotion", catalogLocomotionSelect],
      ["catalogWeapon", catalogWeaponSelect],
      ["catalogActionType", catalogActionTypeSelect],
    ].some(([property, select]) => {
      if (!calibration[property] || calibration[property] === select.value) return false;
      select.value = calibration[property];
      return true;
    });
    if (catalogFilterChanged && isCatalogMode()) {
      populateCatalogFilters();
      updateReviewControls();
      await rebuildLoadout();
    }
    if (calibration.loadout && (isCatalogMode() || calibration.loadout !== weaponSetSelect.value)) {
      reviewModeSelect.value = "weapons";
      weaponSetSelect.value = calibration.loadout;
      updateReviewControls();
      await rebuildLoadout();
    }
    if (calibration.action && actor.clips.has(calibration.action) && actionSelect.value !== calibration.action) {
      actionSelect.value = calibration.action;
      activateAction(calibration.action);
    }
    if (Number.isFinite(calibration.speed)) speedInput.value = calibration.speed;
    if (calibration.grip) {
      for (const [finger, input] of Object.entries(gripInputs)) {
        if (Number.isFinite(calibration.grip[finger])) input.value = calibration.grip[finger];
      }
      if (Number.isFinite(calibration.grip.thumb)) thumbInput.value = calibration.grip.thumb;
    }
    if (calibration.leftGrip) {
      for (const [finger, input] of Object.entries(leftGripInputs)) {
        if (Number.isFinite(calibration.leftGrip[finger])) input.value = calibration.leftGrip[finger];
      }
      if (Number.isFinite(calibration.leftGrip.thumb)) leftThumbInput.value = calibration.leftGrip.thumb;
    }
    if (calibration.twoHandLock) {
      if (typeof calibration.twoHandLock.enabled === "boolean") {
        twoHandIKEnabled = calibration.twoHandLock.enabled;
        twoHandEnabledInput.checked = twoHandIKEnabled;
      }
      if (Array.isArray(calibration.twoHandLock.target) && calibration.twoHandLock.target.length === 3) {
        twoHandGripTarget.fromArray(calibration.twoHandLock.target);
        [twoHandTargetInputs.x.value, twoHandTargetInputs.y.value, twoHandTargetInputs.z.value] = twoHandGripTarget.toArray();
      }
      if (Array.isArray(calibration.twoHandLock.wrist) && calibration.twoHandLock.wrist.length === 3) {
        twoHandWristCorrection.fromArray([...calibration.twoHandLock.wrist, "XYZ"]);
        [twoHandWristInputs.x.value, twoHandWristInputs.y.value, twoHandWristInputs.z.value] = calibration.twoHandLock.wrist;
      }
    }
    if (calibration.socket) {
      for (const [key, input] of Object.entries(socketInputs)) {
        if (Number.isFinite(calibration.socket[key])) input.value = calibration.socket[key];
      }
      updateSocketFromControls();
    }
    if (calibration.offhand) setAttachmentTransform("offhand", calibration.offhand);
    if (typeof calibration.playing === "boolean") setPlaying(calibration.playing);
    if (Number.isFinite(calibration.normalizedTime) && actor.action) {
      removeOverlay(actor);
      removeTwoHandIK(actor);
      removeBowDrawIK(actor);
      actor.action.paused = true;
      actor.action.time = THREE.MathUtils.clamp(calibration.normalizedTime, 0, 1) * actor.action.getClip().duration;
      actor.mixer.update(0);
      timeInput.value = THREE.MathUtils.clamp(calibration.normalizedTime, 0, 1);
      updateGreatswordSheathePreview();
      updateBowCarryPreview();
      applyOverlay(actor);
      applyBowDrawIK(actor);
      applyTwoHandIK(actor);
    } else {
      removeOverlay(actor);
      removeTwoHandIK(actor);
      removeBowDrawIK(actor);
      updateGreatswordSheathePreview();
      updateBowCarryPreview();
      applyOverlay(actor);
      applyBowDrawIK(actor);
      applyTwoHandIK(actor);
    }
    if (calibration.view === "full") fullView();
    if (calibration.view === "hands") handView();
    if (calibration.view === "action") actionView();
    captureActiveActionCalibration();
    appliedCalibrationRevision = calibration.revision;
    updateOutputs();
    updateStatus();
    status.textContent += `\nliveCalibrationRevision=${appliedCalibrationRevision}`;
  } finally {
    applyingCalibration = false;
  }
}

async function pollLiveCalibration() {
  if (!LIVE_CALIBRATION_ENABLED || applyingCalibration) return;
  try {
    const response = await fetch(`${LIVE_CALIBRATION_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;
    await applyLiveCalibration(await response.json());
  } catch {
    // The lab remains manually usable if the optional live-control file is absent.
  }
}

function rebuildWithErrorBoundary() {
  rebuildLoadout().catch((error) => {
    actionSelect.disabled = false;
    weaponSetSelect.disabled = false;
    reviewModeSelect.disabled = false;
    catalogActivitySelect.disabled = false;
    catalogLocomotionSelect.disabled = false;
    catalogWeaponSelect.disabled = false;
    catalogActionTypeSelect.disabled = false;
    status.textContent = `LOAD ERROR\n${error?.stack ?? error}`;
    window.__weaponLab = { ready: false, error: String(error) };
    console.error(error);
  });
}

reviewModeSelect.addEventListener("change", () => { updateReviewControls(); rebuildWithErrorBoundary(); });
catalogActivitySelect.addEventListener("change", () => {
  populateCatalogFilters();
  updateReviewControls();
  rebuildWithErrorBoundary();
});
catalogLocomotionSelect.addEventListener("change", rebuildWithErrorBoundary);
catalogWeaponSelect.addEventListener("change", () => {
  populateCatalogFilters();
  rebuildWithErrorBoundary();
});
catalogActionTypeSelect.addEventListener("change", rebuildWithErrorBoundary);
weaponSetSelect.addEventListener("change", rebuildWithErrorBoundary);
actionSelect.addEventListener("change", () => activateAction(actionSelect.value));
arrowCountInput.addEventListener("input", () => { updateBowInventoryPreview(); updateOutputs(); updateStatus(); });
minimumBowRangeInput.addEventListener("input", () => { updateOutputs(); updateStatus(); });
playButton.addEventListener("click", () => setPlaying(!playing));
document.querySelector("#restart").addEventListener("click", () => {
  removeOverlay(actor); removeTwoHandIK(actor); removeBowDrawIK(actor); actor.action.reset().play(); actor.action.paused = !playing; timeInput.value = 0; updateOutputs();
});
loopInput.addEventListener("change", () => activateAction(actionSelect.value));
timeInput.addEventListener("input", () => {
  setPlaying(false);
  removeOverlay(actor);
  removeTwoHandIK(actor);
  removeBowDrawIK(actor);
  actor.action.paused = true;
  actor.action.time = Number(timeInput.value) * actor.action.getClip().duration;
  actor.mixer.update(0);
  updateGreatswordSheathePreview();
  updateBowCarryPreview();
  applyOverlay(actor);
  applyBowDrawIK(actor);
  applyTwoHandIK(actor);
  updateBowInventoryPreview();
  enforceMountedArtifactClearance(actor);
  updateOutputs(); updateStatus();
});
speedInput.addEventListener("input", () => { updateOutputs(); updateStatus(); });
for (const input of [...Object.values(gripInputs), thumbInput, ...Object.values(leftGripInputs), leftThumbInput]) {
  input.addEventListener("input", () => { removeOverlay(actor); applyOverlay(actor); updateOutputs(); updateStatus(); });
}
twoHandEnabledInput.addEventListener("change", () => {
  twoHandIKEnabled = twoHandEnabledInput.checked;
  removeOverlay(actor); removeTwoHandIK(actor); applyTwoHandIK(actor); applyOverlay(actor); updateOutputs(); updateStatus();
});
for (const input of [...Object.values(twoHandTargetInputs), ...Object.values(twoHandWristInputs)]) {
  input.addEventListener("input", () => {
    twoHandGripTarget.set(...Object.values(twoHandTargetInputs).map((targetInput) => Number(targetInput.value)));
    twoHandWristCorrection.set(...Object.values(twoHandWristInputs).map((wristInput) => Number(wristInput.value)), "XYZ");
    removeOverlay(actor); removeTwoHandIK(actor); applyTwoHandIK(actor); applyOverlay(actor); updateOutputs(); updateStatus();
  });
}
for (const input of Object.values(socketInputs)) {
  input.addEventListener("input", () => { updateSocketFromControls(); updateOutputs(); updateStatus(); });
}
document.querySelector("#resetGrip").addEventListener("click", () => {
  actionCalibrationStates.delete(activeActionCalibrationKey);
  removeOverlay(actor); removeTwoHandIK(actor);
  restoreActionCalibration(actor.action.getClip().name);
  applyTwoHandIK(actor); applyOverlay(actor); updateOutputs(); updateStatus();
});
document.querySelector("#resetSocket").addEventListener("click", () => {
  actionCalibrationStates.delete(activeActionCalibrationKey);
  removeOverlay(actor); removeTwoHandIK(actor);
  restoreActionCalibration(actor.action.getClip().name);
  applyTwoHandIK(actor); applyOverlay(actor); updateStatus();
});
document.querySelector("#fullView").addEventListener("click", fullView);
document.querySelector("#actionView").addEventListener("click", actionView);
document.querySelector("#handView").addEventListener("click", () => handView());
document.querySelector("#backView").addEventListener("click", backView);
document.querySelector("#hide").addEventListener("click", () => { document.querySelector(".panel").hidden = true; });
addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "h") document.querySelector(".panel").hidden = !document.querySelector(".panel").hidden;
  if (event.code === "Space" && event.target === document.body) { event.preventDefault(); setPlaying(!playing); }
});

try {
  const [body, animationLibrary, locomotionExtras] = await Promise.all([
    loader.loadAsync(URLS.body),
    loader.loadAsync(URLS.animations),
    loader.loadAsync(URLS.locomotionExtras),
  ]);
  const sourceClips = [...animationLibrary.animations, ...locomotionExtras.animations];
  if (new Set(sourceClips.map((clip) => clip.name)).size !== sourceClips.length) {
    throw new Error("Duplicate source animation names in locomotion addendum");
  }
  actor = createActor(body.scene, sourceClips);
  addAuthoredGapClips(actor);
  for (const clip of buildCarryLocomotionClips(actor.clips)) actor.clips.set(clip.name, clip);
  populateCatalogFilters();
  updateReviewControls();
  await rebuildLoadout();
  updateOutputs();
  fullView();
  if (LIVE_CALIBRATION_ENABLED) {
    await pollLiveCalibration();
    setInterval(pollLiveCalibration, 750);
  }
} catch (error) {
  status.textContent = `LOAD ERROR\n${error?.stack ?? error}`;
  window.__weaponLab = { ready: false, error: String(error) };
  console.error(error);
}

const clock = new THREE.Clock();
staffGripSelect.addEventListener("change", () => {
  staffGripTransition.from = currentStaffGripStyle();
  staffGripTransition.to = { spread: staffGripSelect.value === "wide" ? 0.14 : 0, roll: staffGripSelect.value === "reverse" ? Math.PI : 0 };
  staffGripTransition.start = performance.now();
  updateStatus();
});
renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.05);
  if (actor?.action) {
    removeOverlay(actor);
    removeTwoHandIK(actor);
    removeBowDrawIK(actor);
    if (playing) {
      actor.action.paused = false;
      actor.mixer.update(delta * Number(speedInput.value));
      timeInput.value = actor.action.time / actor.action.getClip().duration;
    } else {
      actor.action.paused = true;
      actor.mixer.update(0);
    }
    updateGreatswordSheathePreview();
    updateBowCarryPreview();
    applyOverlay(actor);
    applyBowDrawIK(actor);
    updateQuiverHarness(actor);
    applyTwoHandIK(actor);
    updateBowInventoryPreview();
    const artifactClearanceGuardTime = performance.now();
    if (artifactClearanceGuardTime - lastArtifactClearanceGuardTime >= 150) {
      enforceMountedArtifactClearance(actor);
      lastArtifactClearanceGuardTime = artifactClearanceGuardTime;
    }
    document.querySelector("#timeOut").textContent = Number(timeInput.value).toFixed(3);
  }
  if (followGrip && actor) {
    const target = handTarget();
    translateFollowTarget(target);
  } else if (followFullBody && actor) {
    const hips = findBone(actor.bones, "Hips");
    if (hips) {
      const target = hips.getWorldPosition(new THREE.Vector3());
      translateFollowTarget(target);
    }
  }
  controls.update();
  renderer.render(scene, camera);
});

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function releaseRenderer() {
  renderer.setAnimationLoop(null);
  renderer.dispose();
}
addEventListener("beforeunload", releaseRenderer, { once: true });
if (import.meta.hot) import.meta.hot.dispose(releaseRenderer);
