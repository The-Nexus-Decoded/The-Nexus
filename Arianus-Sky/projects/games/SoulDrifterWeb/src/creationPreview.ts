import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  SKIN_TONES,
  type CanonicalHairStyleId,
  type CanonicalHairTextureId,
  type FaceTypeId,
  type FacialHairId,
  type HairColorId,
  type HairStyleId,
  type SkinToneId,
} from "./game/character";
import { HUMAN_FOUNDATION_MODEL_PATH } from "./game/avatarIdentity";
import { lightingTuningRegistry } from "./game/lightingTuning";
import {
  applyModularAppearance,
  cloneActorMaterial,
  isActorSkinSurface,
  raceAvatarShape,
  skinToneMaterialColor,
} from "./game/presentation";
import {
  hydrateHumanAppearanceModules,
  inspectHumanAppearanceAvailability,
} from "./game/humanAppearanceAssembly";
import {
  bindOptionalCompatibleAnimationClip,
  normalizeAnimationPackRootMotion,
} from "./game/animationPacks";
import {
  HUMAN_FOUNDATION_APPROVED_ANIMATIONS,
  type HumanFoundationApprovedAnimationSpec,
} from "./game/humanFoundationApprovedAnimations";
import {
  CREATOR_CUE_AMPLITUDE,
  CREATOR_GAZE_OVERRIDE_RELEASE_MS,
  CREATOR_GAZE_WEIGHT_MS,
  CREATOR_SETTLE_IDLE_MS,
  CREATOR_STATION_CHOREOGRAPHY,
  cueDurationMs,
  cueEnvelope,
  cueReach,
  cueRegion,
  easeInOutCubic,
  easeOutQuad,
  gazeDriftYaw,
  gazeTargetFromPointer,
  holdEnvelope,
  meanAbsoluteRgbDifference,
  meanRgb,
  nodPitchDegrees,
  scaleGazeAngles,
  shakeYawDegrees,
  stationGazeLimits,
  type CreationRegion,
  type CreatorCue,
  type CreatorCuePart,
  type CreatorGazeAngles,
  type CreatorStationChoreography,
  type RgbMean,
} from "./creationChoreography";

const PREVIEW_MODEL_LEGACY_HUMAN = "/assets/3d/characters/human-shadowknight/human-shadowknight.glb";
const PREVIEW_MODEL_ELF = "/assets/3d/characters/elf-shadowknight-v2/elf-shadowknight-v2.glb";
const STARTER_SWORD_PART = /^SK_Starter(?:Long|Short)sword_(?:Blade|Grip|Guard|Pommel)(?:_Mesh)?$/i;
const FOUNDATION_HELPER = /^(?:Camera|Cube|Icosphere|Light)$/i;
export const CREATOR_RELAXED_IDLE_PACK = Object.freeze({
  url: "/assets/3d/animations/human-foundation-pilot/review-packs/human-foundation-pilot-review-male-locomotion-01.glb",
  sourceClipName: "MaleLocomotion__Idle",
});
export type CreationPreviewReaction = "listen" | "farewell";

/**
 * Reactions the creator may ask of the character. Each resolves, by semantic
 * clip name, to an entry of HUMAN_FOUNDATION_APPROVED_ANIMATIONS, so nothing
 * unapproved or prop-bound can be played here even if a key is added later.
 * `fadeSeconds` is the crossfade out of the idle.
 */
export const CREATOR_REACTION_CLIPS: Readonly<Record<CreationPreviewReaction, {
  semanticClipName: string;
  fadeSeconds: number;
}>> = Object.freeze({
  listen: { semanticClipName: "AuthoredUtility__NpcListen", fadeSeconds: 0.35 },
  farewell: { semanticClipName: "AuthoredUtility__Farewell", fadeSeconds: 0.3 },
});
const CREATOR_REACTION_SETTLE_SECONDS = 0.45;

/** The approved spec behind a reaction, or null when it is unapproved or needs a prop. */
export function resolveCreatorReactionSpec(
  reaction: CreationPreviewReaction,
): HumanFoundationApprovedAnimationSpec | null {
  const entry = CREATOR_REACTION_CLIPS[reaction];
  const spec = HUMAN_FOUNDATION_APPROVED_ANIMATIONS
    .find((candidate) => candidate.semanticClipName === entry.semanticClipName);
  if (!spec || spec.externalTargetBinding) return null;
  return spec;
}

/** How far the head may turn toward the pointer. */
export const CREATOR_GAZE_LIMITS = Object.freeze({ yawDegrees: 28, pitchDegrees: 12 });
const CREATOR_GAZE_RESPONSE_PER_SECOND = 6;
const CREATOR_GAZE_HOLD_MS = 4000;
const CREATOR_GAZE_NEUTRAL = Object.freeze({ yaw: 0, pitch: 0 });

function wrapAngle(radians: number): number {
  const wrapped = (radians + Math.PI) % (2 * Math.PI);
  return (wrapped < 0 ? wrapped + 2 * Math.PI : wrapped) - Math.PI;
}

/**
 * Yaw/pitch (radians) the head adds to look toward the pointer. `ndcX/ndcY`
 * are the pointer's position on the canvas in -1..1 (right and up positive);
 * `pivotYaw` is the turntable rotation, which the head undoes as far as a neck
 * allows so a figure turned away still glances the right way.
 */
export function creatorGazeAngles(ndcX: number, ndcY: number, pivotYaw: number): { yaw: number; pitch: number } {
  const maxYaw = THREE.MathUtils.degToRad(CREATOR_GAZE_LIMITS.yawDegrees);
  const maxPitch = THREE.MathUtils.degToRad(CREATOR_GAZE_LIMITS.pitchDegrees);
  const wanted = THREE.MathUtils.clamp(ndcX, -1, 1) * maxYaw - wrapAngle(pivotYaw);
  return {
    yaw: THREE.MathUtils.clamp(wanted, -maxYaw, maxYaw),
    pitch: THREE.MathUtils.clamp(ndcY, -1, 1) * maxPitch,
  };
}

/**
 * GLTFLoader runs every node name through `PropertyBinding.sanitizeNodeName`,
 * which strips ":" - so the rig's `mixamorig:Head` reaches the runtime as
 * `mixamorigHead`. Matching only the authored colon form silently matches
 * nothing, so build the variant set once and compare exactly.
 */
function boneNameVariants(...names: readonly string[]): ReadonlySet<string> {
  const variants = new Set<string>();
  for (const name of names) {
    variants.add(name.toLowerCase());
    variants.add(THREE.PropertyBinding.sanitizeNodeName(name).toLowerCase());
  }
  return variants;
}

const CREATOR_IDLE_STABLE_HEAD_BONES = boneNameVariants(
  "mixamorig:Neck", "mixamorig:Head", "mixamorig:HeadTop_End",
  "Neck", "Head", "HeadTop_End",
);
const CREATOR_HEAD_BONES = boneNameVariants("mixamorig:Head", "Head");

/**
 * Additive breathing.
 *
 * The approved creator idle is effectively static - measured across its 8.37 s
 * loop it carries 1.32 deg on Spine, 0.39 deg on Spine1/Spine2 and 6.5 mm of
 * hip travel, and normalizeAnimationPackRootMotion(..., "lock-to-rest") removes
 * the hip travel outright. Played alone it reads as a statue, which is the
 * other half of the owner's "relaxed breathing idle" requirement.
 *
 * ANIMATION_PROVIDER_ROUTING.md sanctions additive breathing as a procedural
 * runtime layer, so the motion is generated here rather than by swapping in an
 * unreviewed clip. Amplitudes are deliberately small: this should register only
 * as the figure being alive, never as a performance.
 */
const CREATOR_BREATH_PERIOD_SECONDS = 4.6; // ~13 breaths/minute, resting adult
const CREATOR_BREATH_INHALE_FRACTION = 0.42; // the inhale is quicker than the release

interface CreatorBreathJoint {
  readonly bone: THREE.Object3D;
  readonly axis: THREE.Vector3;
  readonly radians: number;
}

interface CreatorAdditivePoseEntry {
  readonly quaternion: THREE.Quaternion;
  readonly position: THREE.Vector3;
}

/**
 * The mixer's own pose for every bone an additive layer touches.
 *
 * three.js writes a bone only when its accumulated track value changed since
 * the previous frame (`PropertyMixer.apply`: "value has changed -> update scene
 * graph"). The stabilised idle holds the neck and head on one constant value,
 * so after the first frame the mixer never touches them again, and a layer
 * that multiplies onto "the mixer's output" is really multiplying onto its own
 * previous frame: the offsets integrate and the head folds onto the shoulder
 * within seconds of real time. Restoring the mixer's last pose before every
 * update and snapshotting it after makes each frame's additive offset start
 * from the same place whether or not the mixer wrote anything. The same trap
 * holds for positions: the root-locked Hips track is one constant value, so
 * the settle's hip slide is restored here too.
 */
export class CreatorAdditivePose {
  private readonly joints = new Map<THREE.Object3D, CreatorAdditivePoseEntry>();

  public get size(): number {
    return this.joints.size;
  }

  /** Records the bone with whatever pose it holds right now as the mixer's. */
  public register(bone: THREE.Object3D): void {
    if (!this.joints.has(bone)) {
      this.joints.set(bone, { quaternion: bone.quaternion.clone(), position: bone.position.clone() });
    }
  }

  /** Before `mixer.update`: hand every bone back to the mixer untouched. */
  public restore(): void {
    for (const [bone, pose] of this.joints) {
      bone.quaternion.copy(pose.quaternion);
      bone.position.copy(pose.position);
    }
  }

  /** After `mixer.update`: remember what the mixer left, written or not. */
  public snapshot(): void {
    for (const [bone, pose] of this.joints) {
      pose.quaternion.copy(bone.quaternion);
      pose.position.copy(bone.position);
    }
  }

  public clear(): void {
    this.joints.clear();
  }
}

const CREATOR_CUE_BONES = {
  head: boneNameVariants("mixamorig:Head", "Head"),
  neck: boneNameVariants("mixamorig:Neck", "Neck"),
  spine1: boneNameVariants("mixamorig:Spine1", "Spine1"),
  leftShoulder: boneNameVariants("mixamorig:LeftShoulder", "LeftShoulder"),
  rightShoulder: boneNameVariants("mixamorig:RightShoulder", "RightShoulder"),
  hips: boneNameVariants("mixamorig:Hips", "Hips"),
} as const;
type CreatorCueBone = keyof typeof CREATOR_CUE_BONES;
/** Read, never written: the crown, whose height on screen sets a cue's reach. */
const CREATOR_CUE_HEAD_TOP = boneNameVariants("mixamorig:HeadTop_End", "HeadTop_End");
// Bone-local axes of the upright mixamorig spine and head: X ear-to-ear (a positive
// turn nods down), Y up the bone, Z forward. The shoulders rotate about their own Z.
const CREATOR_CUE_AXIS_X = new THREE.Vector3(1, 0, 0);
const CREATOR_CUE_AXIS_Y = new THREE.Vector3(0, 1, 0);
const CREATOR_CUE_AXIS_Z = new THREE.Vector3(0, 0, 1);
const CREATOR_CUE_SCRATCH = new THREE.Quaternion();
const CREATOR_CUE_SCRATCH_VECTOR = new THREE.Vector3();
/** The settle amplitude follows a station change over this long, so body <-> face never pops. */
const CREATOR_SETTLE_AMPLITUDE_SECONDS = 0.3;

/**
 * Writes the additive cues onto the rig. Every bone it touches is registered with the
 * preview's `CreatorAdditivePose`, and `apply` runs after that pose is snapshotted, so a
 * cue is always one offset from the mixer's frame and never compounds on its own last
 * frame. Envelopes come from `creationChoreography`; this class only turns them into
 * rotations and, for the settle, a hip slide.
 */
export class CreatorCuePlayer {
  private readonly bones = new Map<CreatorCueBone, THREE.Object3D>();
  private headTopBone: THREE.Object3D | null = null;
  /** Each cue in flight: when it started and the reach (`cueReach`) it latched as it did. */
  private readonly inFlight = new Map<Exclude<CreatorCue, "settle">, { startedAt: number; reach: number }>();
  private settleFrom = 0;
  private settleTo = 0;
  private settleStartedAt = 0;
  private settleAmplitude = 0;
  private settleAmplitudeTarget = 0;

  /** Resolves the cue bones on the model; returns how many of the six were found. */
  public bind(model: THREE.Object3D, additivePose: CreatorAdditivePose): number {
    this.release();
    model.traverse((node) => {
      const name = node.name.toLowerCase();
      if (!this.headTopBone && CREATOR_CUE_HEAD_TOP.has(name)) this.headTopBone = node;
      for (const bone of Object.keys(CREATOR_CUE_BONES) as CreatorCueBone[]) {
        if (!CREATOR_CUE_BONES[bone].has(name) || this.bones.has(bone)) continue;
        additivePose.register(node);
        this.bones.set(bone, node);
      }
    });
    return this.bones.size;
  }

  public release(): void {
    this.bones.clear();
    this.headTopBone = null;
    this.cancel();
  }

  /**
   * World-space centre of the part a cue moves, for placing the pixel gate's crop: the
   * head between its base and crown, the shoulders between the two shoulder joints, the
   * hips at the hip joint. Null until the rig has bound.
   */
  public partCentre(part: CreatorCuePart, target: THREE.Vector3): THREE.Vector3 | null {
    if (part === "hips") {
      const hips = this.bones.get("hips");
      return hips ? hips.getWorldPosition(target) : null;
    }
    const [first, second] = part === "head"
      ? [this.bones.get("head"), this.headTopBone]
      : [this.bones.get("leftShoulder"), this.bones.get("rightShoulder")];
    if (!first || !second) return null;
    first.getWorldPosition(target);
    return target.add(second.getWorldPosition(CREATOR_CUE_SCRATCH_VECTOR)).multiplyScalar(0.5);
  }

  /** World-space base and crown of the head, whose distance on screen sets a cue's reach. */
  public headSpan(base: THREE.Vector3, crown: THREE.Vector3): boolean {
    const head = this.bones.get("head");
    if (!head || !this.headTopBone) return false;
    head.getWorldPosition(base);
    this.headTopBone.getWorldPosition(crown);
    return true;
  }

  /** Drops every cue in flight; the next `apply` writes nothing. */
  public cancel(): void {
    this.inFlight.clear();
    this.settleFrom = 0;
    this.settleTo = 0;
    this.settleAmplitude = 0;
  }

  /**
   * Starts a cue. `reach` (0..1, `cueReach` of the head's height on screen) is latched
   * here, so a camera move mid-cue does not alter the cue in flight; the settle has none.
   */
  public play(cue: CreatorCue, now: number, reach = 0): void {
    if (cue === "settle") {
      // Alternate sides from wherever the last shift left the figure.
      this.settleFrom = this.settleValue(now);
      this.settleTo = this.settleTo > 0 ? -1 : 1;
      this.settleStartedAt = now;
      return;
    }
    this.inFlight.set(cue, { startedAt: now, reach: Number.isFinite(reach) ? Math.min(1, Math.max(0, reach)) : 0 });
  }

  public isPlaying(cue: CreatorCue, now: number): boolean {
    if (cue === "settle") return this.settleTo !== 0 && now - this.settleStartedAt < cueDurationMs("settle");
    const flight = this.inFlight.get(cue);
    return flight !== undefined && now - flight.startedAt < cueDurationMs(cue);
  }

  /** The reach a cue in flight latched, or null when it is not playing. */
  public reachOf(cue: Exclude<CreatorCue, "settle">): number | null {
    return this.inFlight.get(cue)?.reach ?? null;
  }

  /** The side the figure is settled toward, -1..1 (0 when standing square). */
  private settleValue(now: number): number {
    return this.settleFrom + (this.settleTo - this.settleFrom) * cueEnvelope("settle", now - this.settleStartedAt);
  }

  /** The station's settle amplitude (0 stands the figure square again). */
  public setSettleAmplitude(amplitude: number, now: number): void {
    this.settleAmplitudeTarget = amplitude;
    if (amplitude === 0 && this.settleTo !== 0) {
      this.settleFrom = this.settleValue(now);
      this.settleTo = 0;
      this.settleStartedAt = now;
    }
  }

  public apply(now: number, deltaSeconds: number): void {
    this.settleAmplitude += (this.settleAmplitudeTarget - this.settleAmplitude)
      * (1 - Math.exp(-deltaSeconds / CREATOR_SETTLE_AMPLITUDE_SECONDS));
    const nod = this.envelope("nod", now);
    const shake = this.envelope("shake", now);
    const brace = this.envelope("brace", now);
    const settle = this.settleValue(now) * this.settleAmplitude;
    const nodPitch = nodPitchDegrees(this.reachOf("nod") ?? 0);
    const shakeYaw = shakeYawDegrees(this.reachOf("shake") ?? 0);
    const head = this.bones.get("head");
    if (head && (nod !== 0 || shake !== 0)) {
      this.rotate(head, CREATOR_CUE_AXIS_Y, shake * shakeYaw.head);
      this.rotate(head, CREATOR_CUE_AXIS_X, nod * nodPitch.head);
    }
    const neck = this.bones.get("neck");
    if (neck && (nod !== 0 || shake !== 0)) {
      this.rotate(neck, CREATOR_CUE_AXIS_Y, shake * shakeYaw.neck);
      this.rotate(neck, CREATOR_CUE_AXIS_X, nod * nodPitch.neck);
    }
    const spine1 = this.bones.get("spine1");
    if (spine1 && (nod !== 0 || shake !== 0 || brace !== 0 || settle !== 0)) {
      this.rotate(spine1, CREATOR_CUE_AXIS_Y, shake * shakeYaw.spine);
      this.rotate(spine1, CREATOR_CUE_AXIS_X, nod * nodPitch.spine + brace * CREATOR_CUE_AMPLITUDE.braceSpinePitchDegrees);
      // Counter-roll: a positive turn about the forward axis leans the torso toward -X
      // while the hips slide toward +X, so the head stays over the feet.
      this.rotate(spine1, CREATOR_CUE_AXIS_Z, settle * CREATOR_CUE_AMPLITUDE.settleSpineRollDegrees);
    }
    if (brace !== 0) {
      const left = this.bones.get("leftShoulder");
      const right = this.bones.get("rightShoulder");
      if (left) this.rotate(left, CREATOR_CUE_AXIS_Z, -brace * CREATOR_CUE_AMPLITUDE.braceShoulderDegrees);
      if (right) this.rotate(right, CREATOR_CUE_AXIS_Z, brace * CREATOR_CUE_AMPLITUDE.braceShoulderDegrees);
    }
    const hips = this.bones.get("hips");
    if (hips && settle !== 0) hips.position.x += settle * CREATOR_CUE_AMPLITUDE.settleHipsMetres;
  }

  private envelope(cue: Exclude<CreatorCue, "settle">, now: number): number {
    const flight = this.inFlight.get(cue);
    if (flight === undefined) return 0;
    const elapsed = now - flight.startedAt;
    if (elapsed >= cueDurationMs(cue)) {
      this.inFlight.delete(cue);
      return 0;
    }
    return cueEnvelope(cue, elapsed);
  }

  private rotate(bone: THREE.Object3D, axis: THREE.Vector3, degrees: number): void {
    if (degrees === 0) return;
    CREATOR_CUE_SCRATCH.setFromAxisAngle(axis, THREE.MathUtils.degToRad(degrees));
    bone.quaternion.multiply(CREATOR_CUE_SCRATCH);
  }
}

interface CreatorGazeJoint {
  readonly bone: THREE.Object3D;
  /** Share of the gaze angle this joint carries; neck and head sum to 1. */
  readonly share: number;
}

const CREATOR_GAZE_JOINTS: ReadonlyArray<{ names: ReadonlySet<string>; share: number }> = [
  { names: boneNameVariants("mixamorig:Neck", "Neck"), share: 0.35 },
  { names: boneNameVariants("mixamorig:Head", "Head"), share: 0.65 },
];
// Bone-local axes of the upright mixamorig neck/head: Y runs up the bone, X
// is the ear-to-ear axis. Looking up is a negative turn about X.
const CREATOR_GAZE_YAW_AXIS = new THREE.Vector3(0, 1, 0);
const CREATOR_GAZE_PITCH_AXIS = new THREE.Vector3(-1, 0, 0);
const CREATOR_GAZE_SCRATCH_YAW = new THREE.Quaternion();
const CREATOR_GAZE_SCRATCH_PITCH = new THREE.Quaternion();

const CREATOR_BREATH_JOINTS: ReadonlyArray<{
  names: ReadonlySet<string>;
  axis: readonly [number, number, number];
  degrees: number;
}> = [
  { names: boneNameVariants("mixamorig:Spine1", "Spine1"), axis: [1, 0, 0], degrees: -0.55 },
  { names: boneNameVariants("mixamorig:Spine2", "Spine2"), axis: [1, 0, 0], degrees: -0.85 },
  { names: boneNameVariants("mixamorig:LeftShoulder", "LeftShoulder"), axis: [0, 0, 1], degrees: 0.7 },
  { names: boneNameVariants("mixamorig:RightShoulder", "RightShoulder"), axis: [0, 0, 1], degrees: -0.7 },
];

/** 0..1 breath envelope: a quicker inhale and a slower release, not a plain sine. */
export function creatorBreathEnvelope(elapsedSeconds: number): number {
  const phase = (((elapsedSeconds / CREATOR_BREATH_PERIOD_SECONDS) % 1) + 1) % 1;
  if (phase < CREATOR_BREATH_INHALE_FRACTION) {
    return Math.sin((phase / CREATOR_BREATH_INHALE_FRACTION) * Math.PI * 0.5);
  }
  const release = (phase - CREATOR_BREATH_INHALE_FRACTION) / (1 - CREATOR_BREATH_INHALE_FRACTION);
  return Math.cos(release * Math.PI * 0.5);
}

/** Strips the trailing `.property` (or `.property[i]`) from an animation track name. */
function trackNodeName(trackName: string): string {
  const cut = trackName.lastIndexOf(".");
  return cut === -1 ? trackName : trackName.slice(0, cut);
}


/**
 * The four authored camera stops. `medium` is head-to-mid-chest (name, memories), `body`
 * the full figure, `face` the head-and-shoulders portrait, `hero` the low three-quarter
 * shot of the imprint. Stations only ever move between these; there is no free zoom.
 */
export type CreationPreviewView = "medium" | "body" | "face" | "hero";

/** Intensity multipliers over CREATION_LIGHT_BASE; each station authors one of these. */
export interface CreationLightState {
  key: number;
  fill: number;
  rim: number;
  under: number;
}

/**
 * Measured on the face stop, not eyeballed: with rim 18 and under 5 the Well's teal put as much
 * light on the face as the warm key, so Deep skin came back grey-green (cheek 46/57/53, more green
 * than red). The teal stays as an accent at a third of that, the key carries the face, and the
 * hemisphere is a warm sky so every tone keeps its hue.
 */
export const CREATION_LIGHT_BASE = Object.freeze({ hemisphere: 0.45, key: 28, fill: 5, rim: 6.5, under: 2.4 });
export const CREATION_RIM_DEFAULT = 0x6de6dc;
/** Base-colour-only skin with KHR specular 1.6 turns to plastic above this. */
export const CREATION_SKIN_ENV_INTENSITY = 0.35;
export const CREATION_CAMERA_TWEEN_MS = 720;
/** `sampleRegion` keeps the last read of this many distinct regions to diff against. */
const CREATOR_REGION_SAMPLE_SLOTS = 8;
const CREATOR_REGION_CENTRE = new THREE.Vector3();
const CREATOR_REGION_HEAD_BASE = new THREE.Vector3();
const CREATOR_REGION_HEAD_CROWN = new THREE.Vector3();
const CREATOR_REGION_NDC = new THREE.Vector3();

/** What `sampleRegion` reads back for one crop. */
export interface CreationRegionSample extends RgbMean {
  /** Device pixels read. */
  pixels: number;
  /**
   * Mean absolute per-channel difference per pixel from the previous sample of this same
   * region; null on a region's first sample. The pixel gate reads this.
   */
  diff: RgbMean | null;
}

export interface CreationPreviewOptions {
  view?: CreationPreviewView;
  autoRotate?: boolean;
  /** Called with a human-readable reason whenever the model or its idle cannot be shown. */
  onLoadFailure?: (reason: string) => void;
  /**
   * Initial reduced-motion state; `setReducedMotion` follows the OS afterwards. Cuts camera
   * tweens, stills the motes, drops the gaze, cues and clips, keeps the breath at 60%.
   */
  reducedMotion?: boolean;
}

export interface CreationCameraStop {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

interface CreationPreviewFraming {
  center: THREE.Vector3;
  boundsSize: THREE.Vector3;
  bodyHeight: number;
  headY: number;
}

export interface CreationPreviewAppearance {
  hairStyle: HairStyleId;
  hairTexture?: CanonicalHairTextureId;
  skinTone: SkinToneId;
  raceId: string;
  facialHair?: FacialHairId;
  hairColor?: HairColorId;
  age?: number;
  hairGreying?: number;
  facialHairGreying?: number;
  faceType?: FaceTypeId;
}

export interface CreationPreviewAvailability {
  faceTypes: readonly FaceTypeId[];
  hairTextures: readonly CanonicalHairTextureId[];
  hairStylesByTexture: Readonly<Record<CanonicalHairTextureId, readonly CanonicalHairStyleId[]>>;
  hairStyles: readonly CanonicalHairStyleId[];
  facialHair: readonly FacialHairId[];
  ageMorphsAvailable: boolean;
  dialogueMorphsAvailable: boolean;
}

export const EMPTY_CREATION_PREVIEW_AVAILABILITY: CreationPreviewAvailability = Object.freeze({
  faceTypes: Object.freeze(["foundation"] as FaceTypeId[]),
  hairTextures: Object.freeze(["straight"] as CanonicalHairTextureId[]),
  hairStylesByTexture: Object.freeze({
    straight: Object.freeze(["shaved-buzzed"] as CanonicalHairStyleId[]),
    curly: Object.freeze(["shaved-buzzed"] as CanonicalHairStyleId[]),
  }),
  hairStyles: Object.freeze(["shaved-buzzed"] as CanonicalHairStyleId[]),
  facialHair: Object.freeze(["none"] as FacialHairId[]),
  ageMorphsAvailable: false,
  dialogueMorphsAvailable: false,
});

/** Discovers only approved provider modules; rejected legacy meshes never become creator choices. */
export function inspectCreationPreviewAvailability(model: THREE.Object3D): CreationPreviewAvailability {
  return inspectHumanAppearanceAvailability(model);
}

/** Fits the rolled bind-pose view against both portrait-canvas axes. */
export function bodyPreviewFitDistance(
  boundsSize: THREE.Vector3,
  aspect: number,
  verticalFovDegrees: number,
): number {
  const tanHalfVerticalFov = Math.tan(THREE.MathUtils.degToRad(verticalFovDegrees * 0.5));
  const safeAspect = Math.max(0.01, aspect);
  // Camera-up is world +Y and screen-right is world +X, so height drives the
  // vertical fit and the (arms-down) shoulder span drives the horizontal fit.
  const verticalDistance = boundsSize.y / (2 * tanHalfVerticalFov);
  const horizontalDistance = boundsSize.x / (2 * tanHalfVerticalFov * safeAspect);
  // The provider actor is a concave silhouette, so adding the full AABB depth
  // would frame empty corner volume and make the body unreadably small.
  return Math.max(verticalDistance, horizontalDistance) * 1.2;
}

function cameraStop(px: number, py: number, pz: number, tx: number, ty: number, tz: number): CreationCameraStop {
  return { position: new THREE.Vector3(px, py, pz), target: new THREE.Vector3(tx, ty, tz) };
}

/**
 * Where the camera stands for a stop, from the cached framing. Every stop keeps the
 * camera on +Z of the figure; only the pivot yaws.
 */
/**
 * Scroll-wheel zoom. A wheel over the stage dollies the camera from the
 * station's stop toward the face stop; scrolling back returns it. Lines and
 * pages are normalised to pixels so a mouse, a trackpad and a Firefox line
 * scroll all cover the same range: about nine 100 px notches from body to face.
 */
export const CREATOR_WHEEL_ZOOM_PER_PIXEL = 1 / 900;
export const CREATOR_ZOOM_RESPONSE_SECONDS = 0.12;

export function creatorWheelZoomStep(deltaY: number, deltaMode: number): number {
  const pixels = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY;
  // scrolling up (negative deltaY) zooms in; a zero delta is a plain 0, never -0
  const step = -pixels * CREATOR_WHEEL_ZOOM_PER_PIXEL;
  return step === 0 ? 0 : step;
}

/** The camera stop `zoom` (0..1) of the way from the station's stop to the face stop. */
export function creationZoomedStop(station: CreationCameraStop, face: CreationCameraStop, zoom: number): CreationCameraStop {
  const t = Math.min(1, Math.max(0, zoom));
  return {
    position: station.position.clone().lerp(face.position, t),
    target: station.target.clone().lerp(face.target, t),
  };
}

export function creationCameraStop(
  view: CreationPreviewView,
  framing: CreationPreviewFraming,
  aspect: number,
  fovDegrees: number,
): CreationCameraStop {
  const { center, boundsSize, bodyHeight, headY } = framing;
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(fovDegrees * 0.5));
  const safeAspect = Math.max(0.01, aspect);
  // A stop names a vertical span; a portrait viewport also has to hold the shoulders,
  // so the horizontal fit wins when it is the larger of the two.
  const distanceForSpan = (span: number, width: number): number =>
    Math.max(span / (2 * tanHalfFov), width / (2 * tanHalfFov * safeAspect));
  switch (view) {
    case "face": {
      // Head-and-shoulders portrait. `headY` is the Head bone (skull base, 0.377 on the
      // 0.9995-unit pilot); the crown sits ~0.12 above it and the chin ~0.03 below. A
      // 0.20 x bodyHeight span centred 0.035 above the bone puts the chin ~19% up the
      // frame, the crown ~94% up and the eyes just above centre.
      const y = headY + bodyHeight * 0.035;
      return cameraStop(center.x, y, center.z + distanceForSpan(bodyHeight * 0.20, bodyHeight * 0.16), center.x, y, center.z);
    }
    case "medium": {
      // Head to mid-chest with headroom: `headY` is the skull base, the crown sits
      // ~0.125 x bodyHeight above it, so the look-at stays close to the bone and the
      // span leaves ~15% of the frame above the crown.
      const y = headY - bodyHeight * 0.03;
      return cameraStop(center.x, y, center.z + distanceForSpan(bodyHeight * 0.44, boundsSize.x * 1.15), center.x, y, center.z);
    }
    case "hero":
      // Low three-quarter: the camera sits a little below the chest and looks up at
      // the head and shoulders, with the crown kept a tenth of the frame from the top.
      return cameraStop(
        center.x, center.y + bodyHeight * 0.02, center.z + distanceForSpan(bodyHeight * 0.80, boundsSize.x * 1.4),
        center.x, center.y + bodyHeight * 0.20, center.z,
      );
    default: {
      const distance = bodyPreviewFitDistance(boundsSize, aspect, fovDegrees);
      return cameraStop(
        center.x, center.y + bodyHeight * 0.06, center.z + distance,
        center.x, center.y + bodyHeight * 0.02, center.z,
      );
    }
  }
}

/** Soft radial blob under the feet; no shadow maps anywhere in the creator. */
function contactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.55)");
    gradient.addColorStop(0.55, "rgba(0, 0, 0, 0.22)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const MOTE_RADIUS = 2.2;
const MOTE_HEIGHT = 2.4;
const MOTE_RISE_PER_SECOND = 0.04;
const MOTE_TEAL = new THREE.Color(0x7af4df);
const MOTE_BRONZE = new THREE.Color(0xefb85f);

/**
 * Holds the neck and head at the clip's neutral first frame so the creator
 * portrait stays still enough to inspect while the authored torso and shoulder
 * tracks keep playing.
 *
 * Measured on `MaleLocomotion__Idle`, the source clip carries only 1.42 deg of
 * head and 0.81 deg of neck rotation across its 8.37 s loop, so this is a
 * guard against a livelier clip being swapped in later rather than a fix for a
 * visible nod today. It is not the source of the creator's motion - see the
 * additive breathing layer in `render()`.
 */
export function stabilizeCreatorRelaxedIdle(clip: THREE.AnimationClip): THREE.AnimationClip {
  const tracks = clip.tracks.map((sourceTrack) => {
    const track = sourceTrack.clone();
    if (!CREATOR_IDLE_STABLE_HEAD_BONES.has(trackNodeName(track.name).toLowerCase())) return track;

    const valueSize = track.getValueSize();
    const neutral = Array.from(track.values.slice(0, valueSize));
    for (let offset = 0; offset < track.values.length; offset += valueSize) {
      for (let component = 0; component < valueSize; component += 1) {
        track.values[offset + component] = neutral[component]!;
      }
    }
    return track;
  });
  return new THREE.AnimationClip(`${clip.name}_StableHead`, clip.duration, tracks, clip.blendMode);
}

/**
 * Turns an in-place reaction clip to face the way the idle it crossfades from faces.
 *
 * The authored utility packs and the review-pack idle disagree about the Hips rest
 * orientation: measured on the bound clips, NpcListen's and Farewell's Hips sit a
 * constant 95 deg from MaleLocomotion__Idle's while their spines agree within 4 deg.
 * Root normalisation only pins the Hips position, so without this the whole figure
 * swings a quarter turn to face screen-right the moment a reaction starts. Every root
 * key is premultiplied by the same delta, so authored root motion inside the clip
 * survives relative to the idle's facing. A clip or reference without a root
 * quaternion track is returned unchanged.
 */
export function alignClipRootRotation(
  clip: THREE.AnimationClip,
  reference: THREE.AnimationClip,
  rootNodeName: string,
): THREE.AnimationClip {
  const rootTrackName = `${rootNodeName}.quaternion`;
  const referenceTrack = reference.tracks.find((track) => track.name === rootTrackName);
  const rootTrack = clip.tracks.find((track) => track.name === rootTrackName);
  if (!referenceTrack || !rootTrack || referenceTrack.getValueSize() !== 4 || rootTrack.getValueSize() !== 4) return clip;
  const delta = new THREE.Quaternion().fromArray(referenceTrack.values, 0)
    .multiply(new THREE.Quaternion().fromArray(rootTrack.values, 0).invert());
  const key = new THREE.Quaternion();
  const tracks = clip.tracks.map((sourceTrack) => {
    const track = sourceTrack.clone();
    if (track.name !== rootTrackName) return track;
    for (let offset = 0; offset < track.values.length; offset += 4) {
      key.fromArray(track.values, offset).premultiply(delta).toArray(track.values, offset);
    }
    return track;
  });
  return new THREE.AnimationClip(clip.name, clip.duration, tracks, clip.blendMode);
}

const CREATOR_BREATH_SCRATCH = new THREE.Quaternion();

const gltfCache = new Map<string, Promise<GLTF>>();

function loadPreviewModel(url: string): Promise<GLTF> {
  let cached = gltfCache.get(url);
  if (!cached) {
    cached = new Promise<GLTF>((resolve, reject) => {
      new GLTFLoader().load(url, resolve, undefined, reject);
    });
    gltfCache.set(url, cached);
  }
  return cached;
}

export function previewModelUrl(raceId: string): string {
  if (!raceId || raceId === "human") return HUMAN_FOUNDATION_MODEL_PATH;
  return raceId === "elf" ? PREVIEW_MODEL_ELF : PREVIEW_MODEL_LEGACY_HUMAN;
}

/**
 * Live 3D stand-in for the creation appearance step. Reuses the same modular
 * appearance and skin-tone code paths as the in-game avatar, so what the
 * player sees here is what spawns at the Soul Well.
 */
export class CreationAvatarPreview {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly rotationPivot = new THREE.Group();
  private readonly camera: THREE.PerspectiveCamera;
  private model: THREE.Object3D | undefined;
  private appearance: CreationPreviewAppearance;
  private yaw = 0;
  private targetYaw = 0;
  private dragging = false;
  private lastPointerX = 0;
  private lastInteractionAt = performance.now();
  private lastFrameAt = performance.now();
  private frame = 0;
  private disposed = false;
  private previewView: CreationPreviewView;
  /** The player's opt-in turntable; reduced motion overrides it per frame, so the choice survives an OS toggle. */
  private autoRotate: boolean;
  private mixer: THREE.AnimationMixer | null = null;
  private motionRequest = 0;
  private framing: CreationPreviewFraming | null = null;
  private readonly onLoadFailure: ((reason: string) => void) | undefined;
  private breathJoints: CreatorBreathJoint[] = [];
  private readonly additivePose = new CreatorAdditivePose();
  private breathSeconds = 0;
  private idleAction: THREE.AnimationAction | null = null;
  private reactionAction: THREE.AnimationAction | null = null;
  private reactionRequest = 0;
  private readonly reactionClips = new Map<string, THREE.AnimationClip>();
  private gazeJoints: CreatorGazeJoint[] = [];
  /** Smoothed (yaw, pitch) in radians. */
  private readonly gaze = new THREE.Vector2();
  /** Pointer position on the canvas in NDC, right and up positive. */
  private readonly gazeTarget = new THREE.Vector2();
  private gazeSeenAt = 0;
  private gazeProfile: CreatorStationChoreography = CREATOR_STATION_CHOREOGRAPHY.body;
  /** A hovered card, row or swatch the head turns toward instead of the pointer. */
  private gazeOverride: { x: number; y: number; until: number } | null = null;
  /** A timed pitch bias (the fourth memory's look down into the water). */
  private gazeBias: { pitch: number; startedAt: number; holdMs: number; blendMs: number } | null = null;
  /** 0..1 share of the gaze written to the bones; a drag or a clip owns the head at 0. */
  private readonly gazeWeight: { value: number; from: number; to: number; startedAt: number };
  private clipHoldsHead = false;
  private reactionFinished: (() => void) | null = null;
  private readonly cues = new CreatorCuePlayer();
  private lastSettleAt = performance.now();
  private reducedMotion: boolean;
  private presentationYaw = 0;
  private viewOffsetFraction = 0;
  /** Wheel zoom toward the face stop, smoothed toward `zoomTarget` every frame. */
  private zoom = 0;
  private zoomTarget = 0;
  private appliedViewOffset = 0;
  private cameraSettled = false;
  private cameraTween: { fromPosition: THREE.Vector3; fromTarget: THREE.Vector3; startedAt: number; durationMs: number } | null = null;
  private readonly cameraTarget = new THREE.Vector3();
  private readonly lightState: CreationLightState = { key: 1, fill: 0.6, rim: 1, under: 1 };
  private readonly lightTarget: CreationLightState = { key: 1, fill: 0.6, rim: 1, under: 1 };
  private readonly rimColorTarget = new THREE.Color(CREATION_RIM_DEFAULT);
  private readonly keyLight: THREE.PointLight;
  private readonly fillLight: THREE.PointLight;
  private readonly rimLight: THREE.PointLight;
  private readonly underLight: THREE.PointLight;
  private readonly contactShadow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly motes: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private readonly moteBase: Float32Array;
  private readonly motePhase: Float32Array;
  private moteSeconds = 0;
  private motePulseUntil = 0;
  private cssWidth = 0;
  private cssHeight = 0;
  private appliedPixelRatio = 0;
  /** Last pixels read per region key, so the next sample of that region can report `diff`. */
  private readonly regionSamples = new Map<string, Uint8Array>();

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    appearance: CreationPreviewAppearance,
    private readonly onAvailabilityChange?: (availability: CreationPreviewAvailability) => void,
    options: CreationPreviewOptions = {},
  ) {
    this.appearance = { ...appearance };
    this.previewView = options.view ?? "body";
    this.yaw = this.frontYaw();
    this.targetYaw = this.yaw;
    this.reducedMotion = options.reducedMotion ?? false;
    this.autoRotate = options.autoRotate ?? false;
    const gazeWeight = this.reducedMotion ? 0 : 1;
    this.gazeWeight = { value: gazeWeight, from: gazeWeight, to: gazeWeight, startedAt: 0 };
    this.onLoadFailure = options.onLoadFailure;
    // Until a station speaks, the figure behaves as it does on the body station.
    this.cues.setSettleAmplitude(this.gazeProfile.settle, performance.now());
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // The world's exposure, so the creator predicts how the Well will light this body.
    this.renderer.toneMappingExposure = lightingTuningRegistry.snapshot().exposure;
    this.renderer.setClearColor(0x000000, 0);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    this.rotationPivot.rotation.y = this.yaw;
    this.scene.add(this.rotationPivot);

    this.scene.add(new THREE.HemisphereLight(0xd8c7b4, 0x1c1611, CREATION_LIGHT_BASE.hemisphere));
    this.keyLight = new THREE.PointLight(0xffd1b7, CREATION_LIGHT_BASE.key, 24, 2);
    this.keyLight.position.set(-1.6, 3.1, 2.4);
    this.rimLight = new THREE.PointLight(CREATION_RIM_DEFAULT, CREATION_LIGHT_BASE.rim, 18, 2);
    this.rimLight.position.set(1.9, 2.2, -2.1);
    this.fillLight = new THREE.PointLight(0x6f8fb8, CREATION_LIGHT_BASE.fill * 0.6, 18, 2);
    this.fillLight.position.set(2.2, 1.6, 2.0);
    // Low teal from the Well itself: shins, hands and the underside of the jaw.
    this.underLight = new THREE.PointLight(0x3fd6c6, CREATION_LIGHT_BASE.under, 6, 2);
    this.underLight.position.set(0.9, 0.35, 0.6);
    this.scene.add(this.keyLight, this.rimLight, this.fillLight, this.underLight);

    this.contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, depthWrite: false }),
    );
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.visible = false;
    this.scene.add(this.contactShadow);

    const moteCount = window.innerWidth <= 1079 ? 40 : 90;
    const positions = new Float32Array(moteCount * 3);
    const colors = new Float32Array(moteCount * 3);
    this.moteBase = new Float32Array(moteCount * 2);
    this.motePhase = new Float32Array(moteCount);
    for (let i = 0; i < moteCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * MOTE_RADIUS;
      this.moteBase[i * 2] = Math.cos(angle) * radius;
      this.moteBase[i * 2 + 1] = Math.sin(angle) * radius;
      this.motePhase[i] = Math.random() * Math.PI * 2;
      positions[i * 3] = this.moteBase[i * 2]!;
      positions[i * 3 + 1] = Math.random() * MOTE_HEIGHT;
      positions[i * 3 + 2] = this.moteBase[i * 2 + 1]!;
    }
    const moteGeometry = new THREE.BufferGeometry();
    moteGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    moteGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.motes = new THREE.Points(moteGeometry, new THREE.PointsMaterial({
      size: 0.018,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.motes.visible = false;
    this.scene.add(this.motes);
    this.updateMotes(0);

    canvas.addEventListener("pointerdown", this.onPointerDown);
    // The stage never scrolls, so the wheel is the zoom; passive: false lets it stop the page.
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    // A cancelled touch - an incoming call, a gesture takeover - never fires
    // pointerup, which would leave `dragging` true and kill manual rotation.
    window.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("lostpointercapture", this.onPointerUp);
    document.documentElement.addEventListener("mouseleave", this.onGazeLost);
    window.addEventListener("blur", this.onGazeLost);

    this.loadModelForRace(this.appearance.raceId);
    this.frame = requestAnimationFrame(() => this.render());
  }

  private modelUrl: string | null = null;

  private loadModelForRace(raceId: string): void {
    const url = previewModelUrl(raceId);
    if (url === this.modelUrl && this.model) return;
    this.modelUrl = url;
    this.onAvailabilityChange?.(EMPTY_CREATION_PREVIEW_AVAILABILITY);
    void loadPreviewModel(url)
      .then(async (gltf) => {
        if (this.disposed || this.modelUrl !== url) return;
        if (this.model) this.rotationPivot.remove(this.model);
        const model = cloneSkeleton(gltf.scene);
        // Hydrate before cloning materials so the base body and every attached
        // appearance module receive preview-local tint and shader instances.
        if (!raceId || raceId === "human") await hydrateHumanAppearanceModules(model);
        if (this.disposed || this.modelUrl !== url) return;
        const helpers: THREE.Object3D[] = [];
        model.traverse((child) => {
          if (STARTER_SWORD_PART.test(child.name)) child.visible = false;
          if (child instanceof THREE.Camera || child instanceof THREE.Light
            || (FOUNDATION_HELPER.test(child.name) && !(child instanceof THREE.SkinnedMesh))) {
            helpers.push(child);
            return;
          }
          if (child instanceof THREE.Mesh) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            const customized = materials.map((source) => {
              const material = cloneActorMaterial(source, 0, true);
              // Remember the authored palette so skin re-tints always start
              // from the same base instead of compounding previous lerps.
              if (material instanceof THREE.MeshStandardMaterial) {
                material.userData.authoredColor = material.color.clone();
              }
              return material;
            });
            child.material = Array.isArray(child.material) ? customized : customized[0]!;
          }
        });
        helpers.forEach((helper) => helper.removeFromParent());
        this.model = model;
        this.rotationPivot.add(model);
        model.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          for (const material of materials) {
            if (material instanceof THREE.MeshStandardMaterial) material.envMapIntensity = CREATION_SKIN_ENV_INTENSITY;
          }
        });
        this.cameraSettled = false;
        this.onAvailabilityChange?.(inspectCreationPreviewAvailability(model));
        // The reflection map costs a few dozen milliseconds; it waits until the
        // figure is on screen and announced.
        this.ensureEnvironment();
        this.applyAppearance();
        this.syncPreviewMotion();
      })
      .catch((error) => {
        this.onAvailabilityChange?.(EMPTY_CREATION_PREVIEW_AVAILABILITY);
        console.warn("Creation avatar preview failed to load.", error);
        this.onLoadFailure?.("the returned body could not be loaded");
      });
  }

  public setAppearance(appearance: CreationPreviewAppearance): void {
    const raceChanged = appearance.raceId !== this.appearance.raceId;
    this.appearance = { ...appearance };
    if (raceChanged) this.loadModelForRace(appearance.raceId);
    this.applyAppearance();
  }

  /**
   * Moves to another camera stop with the authored tween; the idle keeps playing.
   * Returns whether the stop changed, so a station cue can time itself to the move.
   */
  public setView(view: CreationPreviewView): boolean {
    if (this.previewView === view) return false;
    this.previewView = view;
    this.beginCameraTween();
    this.resetFacing();
    this.zoom = 0;
    this.zoomTarget = 0;
    return true;
  }

  /** 0 = the station's own stop, 1 = the face stop; the frame eases toward it. */
  public setZoom(fraction: number): void {
    this.zoomTarget = Math.min(1, Math.max(0, fraction));
    this.lastInteractionAt = performance.now();
  }

  public zoomBy(step: number): void {
    this.setZoom(this.zoomTarget + step);
  }

  public get zoomFraction(): number {
    return this.zoom;
  }

  public setAutoRotate(enabled: boolean): void {
    this.autoRotate = enabled;
    this.lastInteractionAt = performance.now();
  }

  /** The station's authored yaw (radians); `resetFacing()` and the front-view button return to it. */
  public setPresentationYaw(radians: number): void {
    this.presentationYaw = radians;
    this.targetYaw = radians;
    this.lastInteractionAt = performance.now();
  }

  /** Shifts the figure sideways in the frame (0.14 = left of centre on desktop, 0 on phones). */
  public setViewOffset(fraction: number): void {
    this.viewOffsetFraction = fraction;
  }

  public setLightState(state: Partial<CreationLightState>): void {
    Object.assign(this.lightTarget, state);
  }

  public setRimColor(hex: number): void {
    this.rimColorTarget.set(hex);
  }

  /** Briefly doubles the motes' presence (station arrival, a chosen tone). */
  public pulseMotes(durationMs = 3000): void {
    this.motePulseUntil = performance.now() + durationMs;
  }

  private beginCameraTween(): void {
    if (!this.cameraSettled) return;
    this.cameraTween = {
      fromPosition: this.camera.position.clone(),
      fromTarget: this.cameraTarget.clone(),
      startedAt: performance.now(),
      durationMs: this.reducedMotion ? 0 : CREATION_CAMERA_TWEEN_MS,
    };
  }

  private ensureEnvironment(): void {
    if (this.scene.environment) return;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }

  private applyLights(deltaSeconds: number): void {
    const blend = 1 - Math.exp(-deltaSeconds / 0.23);
    for (const channel of ["key", "fill", "rim", "under"] as const) {
      this.lightState[channel] += (this.lightTarget[channel] - this.lightState[channel]) * blend;
    }
    this.keyLight.intensity = CREATION_LIGHT_BASE.key * this.lightState.key;
    this.fillLight.intensity = CREATION_LIGHT_BASE.fill * this.lightState.fill;
    this.rimLight.intensity = CREATION_LIGHT_BASE.rim * this.lightState.rim;
    this.underLight.intensity = CREATION_LIGHT_BASE.under * this.lightState.under;
    this.rimLight.color.lerp(this.rimColorTarget, 1 - Math.exp(-deltaSeconds / 0.18));
  }

  private updateMotes(deltaSeconds: number): void {
    const geometry = this.motes.geometry;
    const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
    const colors = geometry.getAttribute("color") as THREE.BufferAttribute;
    const count = positions.count;
    const now = performance.now();
    const pulse = now < this.motePulseUntil ? 1.6 : 1;
    this.motes.material.size = 0.018 * pulse;
    this.motes.material.opacity = Math.min(1, 0.85 * pulse);
    const animate = !this.reducedMotion && deltaSeconds > 0;
    if (animate) this.moteSeconds += deltaSeconds;
    const scratch = new THREE.Color();
    for (let i = 0; i < count; i += 1) {
      let y = positions.getY(i);
      if (animate) {
        y += MOTE_RISE_PER_SECOND * deltaSeconds;
        if (y > MOTE_HEIGHT) y -= MOTE_HEIGHT;
        const drift = Math.sin(this.moteSeconds * Math.PI * 2 * 0.3 + this.motePhase[i]!) * 0.05;
        positions.setXYZ(i, this.moteBase[i * 2]! + drift, y, this.moteBase[i * 2 + 1]! - drift * 0.6);
      }
      const height = y / MOTE_HEIGHT;
      // Additive blending: darker is fainter, so the top 0.4 fades by dimming.
      const fade = height > 1 - 0.4 / MOTE_HEIGHT ? (1 - height) / (0.4 / MOTE_HEIGHT) : 1;
      scratch.copy(MOTE_TEAL).lerp(MOTE_BRONZE, height).multiplyScalar(fade);
      colors.setXYZ(i, scratch.r, scratch.g, scratch.b);
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  }

  /**
   * Plays one approved reaction clip over the idle and settles back into it.
   * Resolves true once the clip is playing, false when it cannot be shown
   * (model or idle not bound yet, unapproved, incompatible, reduced motion).
   * The creator treats false as "the character keeps idling", never as an
   * error. While the clip plays it owns the head: the gaze weight eases to 0
   * and comes back once the clip has settled, when `onFinished` also fires.
   */
  public playReaction(reaction: CreationPreviewReaction, onFinished?: () => void): Promise<boolean> {
    const model = this.model;
    const mixer = this.mixer;
    const idle = this.idleAction;
    if (!model || !mixer || !idle || this.reducedMotion) return Promise.resolve(false);
    const spec = resolveCreatorReactionSpec(reaction);
    if (!spec) {
      console.warn(`Creator reaction "${reaction}" has no approved, prop-free Human clip.`);
      return Promise.resolve(false);
    }
    const request = ++this.reactionRequest;
    const fadeSeconds = CREATOR_REACTION_CLIPS[reaction].fadeSeconds;
    return this.bindReactionClip(spec, model)
      .then((clip) => {
        if (!clip || this.disposed || request !== this.reactionRequest || this.mixer !== mixer) return false;
        const action = mixer.clipAction(clip);
        const previous = this.reactionAction;
        // Mirrors three's skinning_blending example: enable, restore the base
        // weight and rewind before fading, or a previously faded-out action
        // stays disabled and the fade is invisible.
        action.enabled = true;
        action.setEffectiveTimeScale(1);
        action.setEffectiveWeight(1);
        action.reset();
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
        if (previous && previous !== action) previous.fadeOut(fadeSeconds);
        action.crossFadeFrom(idle, fadeSeconds, false);
        this.reactionAction = action;
        this.clipHoldsHead = true;
        this.reactionFinished = onFinished ?? null;
        return true;
      })
      .catch((error) => {
        console.warn(`Creator reaction "${reaction}" failed to load.`, error);
        return false;
      });
  }

  /** Warms a reaction clip (fetch and bind) so a later `playReaction` starts on the beat. */
  public prefetchReaction(reaction: CreationPreviewReaction): void {
    if (this.reducedMotion) return;
    const spec = resolveCreatorReactionSpec(reaction);
    if (!spec) return;
    const model = this.model;
    const warm: Promise<unknown> = model ? this.bindReactionClip(spec, model) : loadPreviewModel(spec.url);
    void warm.catch((error) => {
      console.warn(`Creator reaction "${reaction}" could not be prefetched.`, error);
    });
  }

  /**
   * The station's gaze amplitude and settle behaviour (CREATOR_STATION_CHOREOGRAPHY).
   * Re-applying the current profile (a resize, the hide-UI toggle) changes nothing, so the
   * settle clock only restarts on a real station change.
   */
  public setStationChoreography(profile: CreatorStationChoreography): void {
    if (this.gazeProfile === profile) return;
    const now = performance.now();
    this.gazeProfile = profile;
    this.cues.setSettleAmplitude(profile.settle, now);
    this.lastSettleAt = now;
  }

  /**
   * Turns the head toward an element (a hovered card, row or swatch) instead of the
   * pointer, capped below the station's limit. `null` releases the override a beat
   * after the pointer leaves; `holdMs` lets a chosen swatch hold the glance first.
   */
  public setGazeTarget(element: Element | null, holdMs = Infinity): void {
    const now = performance.now();
    if (!element) {
      if (this.gazeOverride) {
        this.gazeOverride.until = Math.min(this.gazeOverride.until, now + CREATOR_GAZE_OVERRIDE_RELEASE_MS);
      }
      return;
    }
    const rect = element.getBoundingClientRect();
    const target = gazeTargetFromPointer(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      this.canvas.getBoundingClientRect(),
    );
    if (!target) return;
    this.gazeOverride = { x: target.x, y: target.y, until: now + holdMs };
  }

  /** A timed pitch bias on top of the gaze; negative degrees look down. */
  public glance(pitchDegrees: number, holdMs: number, blendMs: number): void {
    if (this.reducedMotion) return;
    this.gazeBias = { pitch: THREE.MathUtils.degToRad(pitchDegrees), startedAt: performance.now(), holdMs, blendMs };
  }

  /**
   * Plays one additive cue on the rig; nothing under reduced motion or before the idle
   * binds. A nod or a shake takes its reach from how tall the head is on screen at the
   * camera as last drawn, so the same cue carries from the neck at the full-body stops.
   */
  public playCue(cue: CreatorCue): void {
    if (this.reducedMotion) return;
    const now = performance.now();
    this.cues.play(cue, now, cueReach(this.headHeightPx() ?? 0));
    this.lastSettleAt = now;
  }

  /** Mid-session OS changes apply: cuts the camera, stills the motes, drops every cue and the gaze. */
  public setReducedMotion(flag: boolean): void {
    this.reducedMotion = flag;
    if (!flag) return;
    this.cameraTween = null;
    this.cues.cancel();
    this.gazeOverride = null;
    this.gazeBias = null;
  }

  /**
   * Renders one frame and reads a canvas region (CSS pixels from the top-left) back from
   * the drawing buffer in the same task: the crop's mean RGB (0..255) and, from the second
   * sample of the same region on, `diff`, the mean absolute per-channel difference per
   * pixel since the previous sample. `diff` is the pixel gate behind every cue: a cue that
   * does not move it does not ship. The mean alone cannot see a rotation (a nod moves the
   * face inside the crop, not the crop's colour), which is why the gate reads `diff`.
   * Null before the first frame has sized the canvas.
   */
  public sampleRegion(region: CreationRegion): CreationRegionSample | null {
    if (this.disposed || this.cssWidth === 0 || this.cssHeight === 0) return null;
    this.renderer.render(this.scene, this.camera);
    const gl = this.renderer.getContext();
    const ratio = this.appliedPixelRatio || 1;
    const width = Math.max(1, Math.round(region.w * ratio));
    const height = Math.max(1, Math.round(region.h * ratio));
    const x = Math.round(region.x * ratio);
    // GL rows run bottom-up.
    const y = Math.round((this.cssHeight - region.y - region.h) * ratio);
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const key = `${region.x},${region.y},${region.w},${region.h}`;
    const previous = this.regionSamples.get(key);
    // Re-insert so the map stays in most-recently-sampled order and the oldest region drops first.
    this.regionSamples.delete(key);
    this.regionSamples.set(key, pixels);
    if (this.regionSamples.size > CREATOR_REGION_SAMPLE_SLOTS) {
      for (const oldest of this.regionSamples.keys()) {
        this.regionSamples.delete(oldest);
        break;
      }
    }
    const diff = previous && previous.length === pixels.length ? meanAbsoluteRgbDifference(previous, pixels) : null;
    return { ...meanRgb(pixels), pixels: width * height, diff };
  }

  /**
   * The crop the pixel gate samples over a part the cues move, at the current camera: the
   * design's 200 px square centred on the part's projected centre, kept inside the canvas.
   * Null until the rig and canvas are up, or when the part is off the canvas. Read after a
   * frame; the projection is the last one drawn.
   */
  public cueRegion(part: CreatorCuePart): CreationRegion | null {
    if (this.disposed || this.cssWidth === 0 || this.cssHeight === 0) return null;
    const centre = this.cues.partCentre(part, CREATOR_REGION_CENTRE);
    if (!centre) return null;
    return cueRegion(this.toCanvasPixels(centre), { width: this.cssWidth, height: this.cssHeight });
  }

  /** How tall the head is on screen, CSS pixels from its base to its crown at the camera as last drawn. */
  private headHeightPx(): number | null {
    if (this.disposed || this.cssWidth === 0 || this.cssHeight === 0) return null;
    if (!this.cues.headSpan(CREATOR_REGION_HEAD_BASE, CREATOR_REGION_HEAD_CROWN)) return null;
    const base = this.toCanvasPixels(CREATOR_REGION_HEAD_BASE);
    const crown = this.toCanvasPixels(CREATOR_REGION_HEAD_CROWN);
    return Math.hypot(crown.x - base.x, crown.y - base.y);
  }

  /** A world point to CSS pixels from the canvas's top-left, through the camera as last drawn. */
  private toCanvasPixels(world: THREE.Vector3): { x: number; y: number } {
    const ndc = CREATOR_REGION_NDC.copy(world).project(this.camera);
    return { x: ((ndc.x + 1) / 2) * this.cssWidth, y: ((1 - ndc.y) / 2) * this.cssHeight };
  }

  private settleReaction(): void {
    const idle = this.idleAction;
    const action = this.reactionAction;
    if (!idle || !action) return;
    idle.enabled = true;
    idle.setEffectiveTimeScale(1);
    idle.setEffectiveWeight(1);
    idle.crossFadeFrom(action, CREATOR_REACTION_SETTLE_SECONDS, false);
    this.reactionAction = null;
    this.clipHoldsHead = false;
    const finished = this.reactionFinished;
    this.reactionFinished = null;
    finished?.();
  }

  private bindReactionClip(
    spec: HumanFoundationApprovedAnimationSpec,
    model: THREE.Object3D,
  ): Promise<THREE.AnimationClip | null> {
    const cached = this.reactionClips.get(spec.semanticClipName);
    if (cached) return Promise.resolve(cached);
    return loadPreviewModel(spec.url).then((gltf) => {
      // The bound idle is the reference the clip is aligned to; before it exists a
      // prefetch has still warmed the pack, and playReaction refuses to play anyway.
      const idle = this.idleAction?.getClip();
      if (this.model !== model || !idle) return null;
      const source = gltf.animations.find((clip) => clip.name === spec.sourceClipName);
      if (!source) {
        console.warn(`Approved reaction pack ${spec.url} is missing ${spec.sourceClipName}.`);
        return null;
      }
      const bound = bindOptionalCompatibleAnimationClip(source, model, `Creator_${spec.semanticClipName}`);
      if (!bound) {
        console.warn(`Approved reaction ${spec.semanticClipName} is incompatible with the Human foundation rig.`);
        return null;
      }
      const rootNode = model.getObjectByName(spec.rootNodeName);
      // Same hip treatment as the idle, so a blend never slides the pelvis, and the
      // same facing, so it never turns the figure away either.
      const clip = spec.rootPolicy === "authored"
        ? bound
        : alignClipRootRotation(
          normalizeAnimationPackRootMotion(bound, spec.rootNodeName, rootNode?.position, "lock-to-rest"),
          idle,
          spec.rootNodeName,
        );
      this.reactionClips.set(spec.semanticClipName, clip);
      return clip;
    });
  }

  private frontYaw(): number {
    // Every stop is upright; stations may author a presentation yaw (calling, review).
    return this.presentationYaw;
  }

  public resetFacing(): void {
    const frontYaw = this.frontYaw();
    this.yaw = frontYaw;
    this.targetYaw = frontYaw;
    this.rotationPivot.rotation.y = frontYaw;
    this.lastInteractionAt = performance.now();
    this.updatePreviewFraming();
  }

  public dispose(): void {
    this.disposed = true;
    this.motionRequest += 1;
    this.regionSamples.clear();
    cancelAnimationFrame(this.frame);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("lostpointercapture", this.onPointerUp);
    document.documentElement.removeEventListener("mouseleave", this.onGazeLost);
    window.removeEventListener("blur", this.onGazeLost);
    this.stopPreviewMotion();
    if (this.model) {
      // Only the per-instance material clones are ours to release. Geometries
      // and textures still belong to the cached source GLTF that the next
      // preview clones from, so disposing those would break re-entry.
      this.model.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => material.dispose());
      });
      this.rotationPivot.remove(this.model);
    }
    this.scene.environment?.dispose();
    this.contactShadow.geometry.dispose();
    this.contactShadow.material.map?.dispose();
    this.contactShadow.material.dispose();
    this.motes.geometry.dispose();
    this.motes.material.dispose();
    this.renderer.dispose();
    // Without an explicit context loss mobile Safari drops the oldest context
    // when the game's own renderer starts, and the canvas goes blank.
    this.renderer.forceContextLoss();
  }

  private captureBreathJoints(model: THREE.Object3D): void {
    const joints: CreatorBreathJoint[] = [];
    model.traverse((node) => {
      for (const spec of CREATOR_BREATH_JOINTS) {
        if (!spec.names.has(node.name.toLowerCase())) continue;
        this.additivePose.register(node);
        joints.push({
          bone: node,
          axis: new THREE.Vector3(spec.axis[0], spec.axis[1], spec.axis[2]).normalize(),
          radians: THREE.MathUtils.degToRad(spec.degrees),
        });
      }
    });
    this.breathJoints = joints;
    // The head-bone matchers in this file were dead for a whole release because
    // nothing checked that they resolved. Fail loudly instead of silently
    // animating nothing.
    if (joints.length !== CREATOR_BREATH_JOINTS.length) {
      console.warn(
        `Creator breathing resolved ${joints.length} of ${CREATOR_BREATH_JOINTS.length} joints; `
        + "the additive breathing layer is degraded or inert.",
      );
    } else if (import.meta.env.DEV) {
      console.info(`Creator breathing bound ${joints.length} joints.`);
    }
  }

  /**
   * Rides on the mixer's pose for the frame (so a blended reaction keeps
   * breathing). `additivePose` restored that pose before the mixer ran, so the
   * offset never compounds on a previous frame's offset.
   */
  private applyBreath(deltaSeconds: number): void {
    if (this.breathJoints.length === 0) return;
    this.breathSeconds += deltaSeconds;
    // Breathing is the one motion that stays on under reduced motion, at 60%.
    const envelope = creatorBreathEnvelope(this.breathSeconds) * (this.reducedMotion ? 0.6 : 1);
    for (const joint of this.breathJoints) {
      CREATOR_BREATH_SCRATCH.setFromAxisAngle(joint.axis, joint.radians * envelope);
      joint.bone.quaternion.multiply(CREATOR_BREATH_SCRATCH);
    }
  }

  /**
   * Neck and head. The stabilised idle holds them on one constant value, which
   * is exactly the case where the mixer stops writing them, so the gaze is
   * added on top of the pose `additivePose` restores each frame rather than on
   * whatever the bone happened to hold. A reaction clip moves them, and the
   * gaze rides along.
   */
  private captureGazeJoints(model: THREE.Object3D): void {
    const joints: CreatorGazeJoint[] = [];
    model.traverse((node) => {
      for (const spec of CREATOR_GAZE_JOINTS) {
        if (!spec.names.has(node.name.toLowerCase())) continue;
        this.additivePose.register(node);
        joints.push({ bone: node, share: spec.share });
      }
    });
    if (joints.length !== CREATOR_GAZE_JOINTS.length) {
      console.warn(`Creator gaze resolved ${joints.length} of ${CREATOR_GAZE_JOINTS.length} joints.`);
    }
    this.gazeJoints = joints;
    this.gaze.set(0, 0);
  }

  /** Head, Neck, Spine1, both shoulders and Hips for the cues; they share the additive pose with breath and gaze. */
  private captureCueJoints(model: THREE.Object3D): void {
    const wanted = Object.keys(CREATOR_CUE_BONES).length;
    const bound = this.cues.bind(model, this.additivePose);
    if (bound !== wanted) console.warn(`Creator cues resolved ${bound} of ${wanted} joints; some cues are inert.`);
  }

  /** The cues ride on the same snapshotted pose as breath and gaze; the settle fires itself when idle. */
  private applyCues(deltaSeconds: number, now: number): void {
    if (!this.reducedMotion && this.gazeProfile.settle > 0
      && now - Math.max(this.lastInteractionAt, this.lastSettleAt) > CREATOR_SETTLE_IDLE_MS) {
      this.cues.play("settle", now);
      this.lastSettleAt = now;
    }
    this.cues.apply(now, deltaSeconds);
  }

  /** Where the head wants to look this frame, in radians at the station's amplitude. */
  private gazeWanted(now: number): CreatorGazeAngles {
    if (this.gazeOverride && now >= this.gazeOverride.until) this.gazeOverride = null;
    const override = this.gazeOverride;
    let wanted: CreatorGazeAngles;
    if (override) {
      wanted = scaleGazeAngles(
        creatorGazeAngles(override.x, override.y, this.yaw), this.gazeProfile, CREATOR_GAZE_LIMITS, true,
      );
    } else if (now - this.gazeSeenAt < CREATOR_GAZE_HOLD_MS) {
      wanted = scaleGazeAngles(
        creatorGazeAngles(this.gazeTarget.x, this.gazeTarget.y, this.yaw), this.gazeProfile, CREATOR_GAZE_LIMITS,
      );
    } else {
      wanted = { ...CREATOR_GAZE_NEUTRAL };
    }
    // Unattended, the target wanders a little so the figure never stares at one point;
    // the sway stays inside the station's limit instead of adding to a target already on it.
    const limit = stationGazeLimits(this.gazeProfile, CREATOR_GAZE_LIMITS);
    wanted.yaw = THREE.MathUtils.clamp(
      wanted.yaw + gazeDriftYaw(now - this.gazeSeenAt) * this.gazeProfile.gazeScale, -limit.yaw, limit.yaw,
    );
    const bias = this.gazeBias;
    if (bias) {
      const elapsed = now - bias.startedAt;
      wanted.pitch += bias.pitch * holdEnvelope(elapsed, bias.blendMs, bias.holdMs);
      if (elapsed >= bias.blendMs * 2 + bias.holdMs) this.gazeBias = null;
    }
    return wanted;
  }

  /**
   * 0..1 share of the gaze the bones receive. A drag, a playing clip or reduced motion
   * takes it to 0 in 200 ms so the clip owns the head outright (two drivers on one bone
   * jitter); it comes back over 600 ms once the head is free again.
   */
  private gazeWeightAt(now: number): number {
    const weight = this.gazeWeight;
    const to = this.dragging || this.clipHoldsHead || this.reducedMotion ? 0 : 1;
    if (to !== weight.to) {
      weight.from = weight.value;
      weight.to = to;
      weight.startedAt = now;
    }
    const durationMs = to === 0 ? CREATOR_GAZE_WEIGHT_MS.out : CREATOR_GAZE_WEIGHT_MS.in;
    weight.value = weight.from + (weight.to - weight.from) * easeOutQuad((now - weight.startedAt) / durationMs);
    return weight.value;
  }

  private applyGaze(deltaSeconds: number, now: number): void {
    if (this.gazeJoints.length === 0) return;
    const wanted = this.gazeWanted(now);
    const blend = 1 - Math.exp(-deltaSeconds * CREATOR_GAZE_RESPONSE_PER_SECOND);
    this.gaze.x += (wanted.yaw - this.gaze.x) * blend;
    this.gaze.y += (wanted.pitch - this.gaze.y) * blend;
    const weight = this.gazeWeightAt(now);
    if (weight <= 0) return;
    for (const joint of this.gazeJoints) {
      CREATOR_GAZE_SCRATCH_YAW.setFromAxisAngle(CREATOR_GAZE_YAW_AXIS, this.gaze.x * joint.share * weight);
      CREATOR_GAZE_SCRATCH_PITCH.setFromAxisAngle(CREATOR_GAZE_PITCH_AXIS, this.gaze.y * joint.share * weight);
      joint.bone.quaternion.multiply(CREATOR_GAZE_SCRATCH_YAW).multiply(CREATOR_GAZE_SCRATCH_PITCH);
    }
  }

  private trackGaze(event: PointerEvent): void {
    // A finger only moves while it is dragging the figure, and a drag is an
    // inspection, so touch never steers the gaze.
    if (event.pointerType === "touch") return;
    const target = gazeTargetFromPointer(event.clientX, event.clientY, this.canvas.getBoundingClientRect());
    if (!target) return;
    this.gazeTarget.set(target.x, target.y);
    this.gazeSeenAt = performance.now();
  }

  private readonly onGazeLost = (): void => {
    this.gazeSeenAt = 0;
  };

  private stopPreviewMotion(resetPose = false): void {
    this.breathJoints = [];
    this.additivePose.clear();
    if (this.mixer && this.model) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.model);
    }
    this.mixer = null;
    this.idleAction = null;
    this.reactionAction = null;
    this.reactionRequest += 1;
    this.reactionClips.clear();
    this.clipHoldsHead = false;
    this.reactionFinished = null;
    this.gazeJoints = [];
    this.cues.release();
    if (resetPose && this.model) {
      this.model.traverse((child) => {
        if (child instanceof THREE.SkinnedMesh) child.skeleton.pose();
      });
      this.model.updateMatrixWorld(true);
    }
  }

  private syncPreviewMotion(): void {
    const model = this.model;
    const request = ++this.motionRequest;
    this.stopPreviewMotion(false);
    this.updatePreviewFraming();
    if (!model) return;

    void loadPreviewModel(CREATOR_RELAXED_IDLE_PACK.url)
      .then((gltf) => {
        if (this.disposed || request !== this.motionRequest || this.model !== model) return;
        const source = gltf.animations.find((clip) => clip.name === CREATOR_RELAXED_IDLE_PACK.sourceClipName);
        if (!source) {
          console.warn(`Creator relaxed-idle clip is unavailable: ${CREATOR_RELAXED_IDLE_PACK.sourceClipName}`);
          this.onLoadFailure?.("the relaxed idle is missing, so the body is shown in its bind pose");
          return;
        }
        const bound = bindOptionalCompatibleAnimationClip(source, model, "CreatorIdleRelaxed");
        if (!bound) {
          console.warn("Creator relaxed-idle preview is incompatible with the Human foundation rig.");
          this.onLoadFailure?.("the relaxed idle does not fit this rig, so the body is shown in its bind pose");
          return;
        }
        const rootTrack = bound.tracks.find((track) => /(?:armature|hips)[^.]*\.position$/i.test(track.name));
        const rootNodeName = rootTrack?.name.slice(0, rootTrack.name.lastIndexOf("."));
        const rootNode = rootNodeName ? model.getObjectByName(rootNodeName) : undefined;
        const normalized = rootNodeName
          ? normalizeAnimationPackRootMotion(bound, rootNodeName, rootNode?.position, "lock-to-rest")
          : bound;
        const clip = stabilizeCreatorRelaxedIdle(normalized);
        const mixer = new THREE.AnimationMixer(model);
        this.mixer = mixer;
        this.idleAction = mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity);
        this.idleAction.play();
        mixer.addEventListener("finished", (event) => {
          if (event.action === this.reactionAction) this.settleReaction();
        });
        // The bind pose is a T-pose; the idle drops the arms, collapsing the
        // horizontal bounds by ~3.4x. Framing computed before the mixer binds
        // would render the figure tiny and then jump on the next re-frame.
        mixer.update(0);
        model.updateMatrixWorld(true);
        this.captureBreathJoints(model);
        this.captureGazeJoints(model);
        this.captureCueJoints(model);
        this.updatePreviewFraming();
      })
      .catch((error) => {
        console.warn("Creator relaxed-idle preview failed to load.", error);
        this.onLoadFailure?.("the relaxed idle could not be loaded, so the body is shown in its bind pose");
      });
  }

  private currentSkinColor(): number {
    return SKIN_TONES[this.appearance.skinTone]?.color ?? SKIN_TONES.ashen.color;
  }

  private applyAppearance(): void {
    if (!this.model) return;
    const skinTone = this.currentSkinColor();
    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          const base = material.userData.authoredColor as THREE.Color | undefined;
          if (material instanceof THREE.MeshStandardMaterial && base
            && isActorSkinSurface(`${child.name} ${material.name}`)) {
            skinToneMaterialColor(base, skinTone, material.color);
          }
        });
      }
    });
    applyModularAppearance(this.model, {
      hairStyle: this.appearance.hairStyle,
      hairTexture: this.appearance.hairTexture,
      raceId: (this.appearance.raceId || "human") as "human" | "elf" | "dwarf" | "halfling",
      facialHair: this.appearance.facialHair ?? "none",
      hairColor: this.appearance.hairColor,
      age: this.appearance.age,
      hairGreying: this.appearance.hairGreying,
      facialHairGreying: this.appearance.facialHairGreying,
      faceType: this.appearance.faceType,
    });
    const shape = raceAvatarShape(this.appearance.raceId);
    this.model.scale.set(shape.width, 1, shape.depth);
    this.updatePreviewFraming();
  }

  private updatePreviewFraming(): void {
    if (!this.model) {
      this.framing = null;
      return;
    }
    this.model.updateMatrixWorld(true);
    const bounds = new THREE.Box3();
    this.model.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || /weapon|sword|staff|bow/i.test(child.name)) return;
      let cursor: THREE.Object3D | null = child;
      while (cursor) {
        if (!cursor.visible) return;
        cursor = cursor.parent;
      }
      bounds.expandByObject(child, true);
    });
    if (bounds.isEmpty()) bounds.setFromObject(this.model, true);
    const bodyHeight = Math.max(0.5, bounds.max.y - bounds.min.y);
    const center = bounds.getCenter(new THREE.Vector3());
    const boundsSize = bounds.getSize(new THREE.Vector3());
    let head: THREE.Object3D | undefined;
    this.model.traverse((node) => {
      if (!head && CREATOR_HEAD_BONES.has(node.name.toLowerCase())) head = node;
    });
    const headY = head?.getWorldPosition(new THREE.Vector3()).y ?? bounds.min.y + bodyHeight * 0.88;
    this.framing = { center, boundsSize, bodyHeight, headY };
    const floorY = center.y - boundsSize.y * 0.5;
    this.contactShadow.position.set(center.x, floorY + 0.002, center.z);
    this.contactShadow.visible = true;
    this.motes.position.set(center.x, floorY, center.z);
    this.motes.visible = true;
  }

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.zoomBy(creatorWheelZoomStep(event.deltaY, event.deltaMode));
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.dragging = true;
    this.lastPointerX = event.clientX;
    this.canvas.setPointerCapture?.(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.trackGaze(event);
    if (!this.dragging) return;
    this.targetYaw += (event.clientX - this.lastPointerX) * 0.012;
    this.lastPointerX = event.clientX;
    this.lastInteractionAt = performance.now();
  };

  private readonly onPointerUp = (): void => {
    this.dragging = false;
    this.lastInteractionAt = performance.now();
  };

  private render(): void {
    if (this.disposed) return;
    try {
      this.renderFrame();
    } catch (error) {
      // A throw inside a requestAnimationFrame callback ends the loop silently
      // in some hosts; record it where a harness can read it, then rethrow.
      const errors = ((window as Window & { __stageErrors?: unknown[] }).__stageErrors ??= []);
      errors.push(error);
      throw error;
    }
  }

  private renderFrame(): void {
    const now = performance.now();
    const deltaSeconds = Math.min(0.05, Math.max(0, (now - this.lastFrameAt) / 1000));
    this.lastFrameAt = now;
    this.additivePose.restore();
    this.mixer?.update(deltaSeconds);
    this.additivePose.snapshot();
    this.applyBreath(deltaSeconds);
    this.applyGaze(deltaSeconds, now);
    this.applyCues(deltaSeconds, now);
    this.applyLights(deltaSeconds);
    this.updateMotes(deltaSeconds);
    const width = Math.max(1, Math.round(this.canvas.clientWidth));
    const height = Math.max(1, Math.round(this.canvas.clientHeight));
    // Compare CSS pixels against CSS pixels. `canvas.width` becomes a device
    // pixel value once a pixel ratio is set, so the old comparison could never
    // match again and setSize ran on every frame.
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    if (width !== this.cssWidth || height !== this.cssHeight || pixelRatio !== this.appliedPixelRatio
      || this.viewOffsetFraction !== this.appliedViewOffset) {
      this.cssWidth = width;
      this.cssHeight = height;
      this.appliedPixelRatio = pixelRatio;
      this.appliedViewOffset = this.viewOffsetFraction;
      this.renderer.setPixelRatio(pixelRatio);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      // A positive offset shows the right part of the full frustum, which moves the
      // figure left - clear of the folio on the right.
      if (this.viewOffsetFraction !== 0) {
        this.camera.setViewOffset(width, height, Math.round(this.viewOffsetFraction * width), 0, width, height);
      } else {
        this.camera.clearViewOffset();
      }
      this.camera.updateProjectionMatrix();
    }

    if (this.autoRotate && !this.reducedMotion && !this.dragging && now - this.lastInteractionAt > 2200) {
      this.targetYaw += 0.0035;
    }
    this.yaw += (this.targetYaw - this.yaw) * 0.12;
    if (this.model) {
      this.rotationPivot.rotation.y = this.yaw;
      this.model.updateMatrixWorld(true);
      const framing = this.framing;
      if (!framing) {
        this.renderer.render(this.scene, this.camera);
        this.frame = requestAnimationFrame(() => this.render());
        return;
      }
      const stationStop = creationCameraStop(this.previewView, framing, this.camera.aspect, this.camera.fov);
      this.zoom += (this.zoomTarget - this.zoom) * (1 - Math.exp(-deltaSeconds / CREATOR_ZOOM_RESPONSE_SECONDS));
      const stop = this.zoom > 0.0005 && this.previewView !== "face"
        ? creationZoomedStop(stationStop, creationCameraStop("face", framing, this.camera.aspect, this.camera.fov), this.zoom)
        : stationStop;
      const tween = this.cameraTween;
      if (!this.cameraSettled) {
        this.camera.position.copy(stop.position);
        this.cameraTarget.copy(stop.target);
        this.cameraSettled = true;
        this.cameraTween = null;
      } else if (tween) {
        const progress = tween.durationMs <= 0 ? 1 : (now - tween.startedAt) / tween.durationMs;
        const t = easeInOutCubic(progress);
        this.camera.position.lerpVectors(tween.fromPosition, stop.position, t);
        this.cameraTarget.lerpVectors(tween.fromTarget, stop.target, t);
        if (progress >= 1) this.cameraTween = null;
      } else {
        this.camera.position.copy(stop.position);
        this.cameraTarget.copy(stop.target);
      }
      // The figure is upright once the idle drives the rig: ordinary world up.
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(this.cameraTarget);
    }
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(() => this.render());
  }
}
