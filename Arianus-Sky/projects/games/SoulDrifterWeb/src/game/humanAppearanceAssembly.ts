import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

import type {
  CanonicalHairStyleId,
  CanonicalHairTextureId,
  FaceTypeId,
  FacialHairId,
} from "./character";
import {
  DIALOGUE_FACIAL_MORPH_NAMES,
  FacialAnimationDriver,
  type FacialAnimationCapabilityStatus,
  type TimedMetaVisemeCue,
} from "./facialAnimationDriver";

export const HUMAN_MODULAR_APPEARANCE_MODEL_PATH = "/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-modular-appearance.glb";

export const HUMAN_FACE_TYPES: ReadonlyArray<{ id: FaceTypeId; name: string; description: string }> = [
  { id: "foundation", name: "Foundation face", description: "The accepted topology-neutral Human foundation." },
  { id: "soft-round", name: "Soft / round", description: "A softer jaw and rounder cheek silhouette on the same animation topology." },
  { id: "angular-high-cheek", name: "Angular / high-cheek", description: "Higher cheek planes and a more angular jaw on the same animation topology." },
  { id: "broad-strong", name: "Broad / strong", description: "A broader jaw and stronger facial planes on the same animation topology." },
];

export const HUMAN_FACE_MORPH_BY_TYPE: Readonly<Record<Exclude<FaceTypeId, "foundation">, string>> = {
  "soft-round": "Face_SoftRound",
  "angular-high-cheek": "Face_AngularHighCheek",
  "broad-strong": "Face_BroadStrong",
};

export const HUMAN_DIALOGUE_MORPH_NAMES = DIALOGUE_FACIAL_MORPH_NAMES;

export type HumanHairStyleWithModule = Exclude<CanonicalHairStyleId, "shaved-buzzed">;
export const HUMAN_HAIR_STYLE_MODULE_BASE: Readonly<Record<HumanHairStyleWithModule, string>> = {
  cropped: "SK_Hair_Cropped",
  fade: "SK_Hair_Fade",
  parted: "SK_Hair_Parted",
  afro: "SK_Hair_Afro",
  cornrows: "SK_Hair_Cornrows",
  locs: "SK_Hair_Locs",
  twists: "SK_Hair_Twists",
  bun: "SK_Hair_Bun",
  "tied-back": "SK_Hair_TiedBack",
  braided: "SK_Hair_Braided",
  long: "SK_Hair_Long",
};
export const HUMAN_HAIR_TEXTURE_MODULE_SUFFIX: Readonly<Record<CanonicalHairTextureId, string>> = {
  straight: "Straight",
  curly: "Curly",
};
export const HUMAN_HAIR_TEXTURE_IDS = Object.keys(HUMAN_HAIR_TEXTURE_MODULE_SUFFIX) as readonly CanonicalHairTextureId[];
export const HUMAN_HAIR_STYLE_IDS_WITH_MODULE = Object.keys(HUMAN_HAIR_STYLE_MODULE_BASE) as readonly HumanHairStyleWithModule[];

/** A style is authored once per texture: `SK_Hair_<Style>_<Texture>`. Shaved has no module. */
export function humanHairModuleName(style: CanonicalHairStyleId, texture: CanonicalHairTextureId): string | undefined {
  if (style === "shaved-buzzed") return undefined;
  return `${HUMAN_HAIR_STYLE_MODULE_BASE[style]}_${HUMAN_HAIR_TEXTURE_MODULE_SUFFIX[texture]}`;
}

/** Every style x texture module the contract can carry, keyed `<style>/<texture>`. */
export const HUMAN_HAIR_MODULE_NAMES: Readonly<Record<string, string>> = Object.freeze(Object.fromEntries(
  HUMAN_HAIR_STYLE_IDS_WITH_MODULE.flatMap((style) => HUMAN_HAIR_TEXTURE_IDS.map((texture) => [
    `${style}/${texture}`,
    humanHairModuleName(style, texture) as string,
  ])),
));

export const HUMAN_FACIAL_HAIR_MODULE_NAMES: Readonly<Record<Exclude<FacialHairId, "none">, string>> = {
  stubble: "SK_FacialHair_Stubble",
  moustache: "SK_FacialHair_Moustache",
  goatee: "SK_FacialHair_Goatee",
  "short-beard": "SK_FacialHair_ShortBeard",
  "full-beard": "SK_FacialHair_FullBeard",
};

const LOCAL_AUTHORING_VALIDATED = "LOCAL_AUTHORING_VALIDATED";
const LEGACY_PROVIDER_APPROVED = "PROVIDER_APPROVED";
const APPEARANCE_HYDRATION_KEY = "souldrifterCanonicalAppearanceHydrated";

export interface HumanAppearanceAvailability {
  faceTypes: readonly FaceTypeId[];
  /** Textures with at least one validated style module; straight alone when the pack has none. */
  hairTextures: readonly CanonicalHairTextureId[];
  /** Per texture, the styles the loaded pack can actually show. Shaved is under every texture. */
  hairStylesByTexture: Readonly<Record<CanonicalHairTextureId, readonly CanonicalHairStyleId[]>>;
  /** Union across textures, for consumers that only ask "is this style showable at all". */
  hairStyles: readonly CanonicalHairStyleId[];
  facialHair: readonly FacialHairId[];
  ageMorphsAvailable: boolean;
  dialogueMorphsAvailable: boolean;
}

export interface HumanAppearanceHydrationResult {
  attachedModules: readonly string[];
  missingModules: readonly string[];
}

function isLocallyValidated(value: unknown): boolean {
  return value === LOCAL_AUTHORING_VALIDATED || value === LEGACY_PROVIDER_APPROVED;
}

/** Accepts the current local-authoring receipt and the older provider-approved embedded extras. */
export function hasValidatedAppearanceAncestor(object: THREE.Object3D, boundary: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = object;
  while (current) {
    const statuses = [
      current.userData.souldrifterApprovalStatus,
      current.userData.souldrifterAppearanceAssetStatus,
    ].filter((status) => status !== undefined);
    if (statuses.length > 0) {
      return statuses.some(isLocallyValidated);
    }
    if (current === boundary) return false;
    current = current.parent;
  }
  return false;
}

function availableMorphNames(model: THREE.Object3D): Set<string> {
  const available = new Set<string>();
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.morphTargetDictionary) return;
    Object.keys(child.morphTargetDictionary).forEach((name) => available.add(name));
  });
  return available;
}

function facialHeadReady(model: THREE.Object3D): boolean {
  let ready = false;
  model.traverse((child) => {
    ready ||= child.userData.souldrifterFacialReadiness === "READY"
      && hasValidatedAppearanceAncestor(child, model);
  });
  return ready;
}

function hasValidatedNamedModule(model: THREE.Object3D, name: string): boolean {
  let available = false;
  model.traverse((child) => {
    available ||= child.name.toLowerCase() === name.toLowerCase()
      && hasValidatedAppearanceAncestor(child, model);
  });
  return available;
}

/** Discovers exactly what the loaded, locally validated canonical assembly can safely expose. */
export function inspectHumanAppearanceAvailability(model: THREE.Object3D): HumanAppearanceAvailability {
  const morphs = availableMorphNames(model);
  const ready = facialHeadReady(model);
  const faceTypes: FaceTypeId[] = ["foundation"];
  if (ready) {
    for (const [id, morph] of Object.entries(HUMAN_FACE_MORPH_BY_TYPE) as [Exclude<FaceTypeId, "foundation">, string][]) {
      if (morphs.has(morph)) faceTypes.push(id);
    }
  }
  const hairStylesByTexture = {} as Record<CanonicalHairTextureId, readonly CanonicalHairStyleId[]>;
  for (const texture of HUMAN_HAIR_TEXTURE_IDS) {
    hairStylesByTexture[texture] = ["shaved-buzzed", ...HUMAN_HAIR_STYLE_IDS_WITH_MODULE.filter((style) => (
      hasValidatedNamedModule(model, humanHairModuleName(style, texture) as string)
    ))];
  }
  const texturesWithModules = HUMAN_HAIR_TEXTURE_IDS.filter((texture) => hairStylesByTexture[texture].length > 1);
  const hairTextures: CanonicalHairTextureId[] = texturesWithModules.length > 0 ? texturesWithModules : ["straight"];
  const hairStyles: CanonicalHairStyleId[] = ["shaved-buzzed"];
  for (const style of HUMAN_HAIR_STYLE_IDS_WITH_MODULE) {
    if (HUMAN_HAIR_TEXTURE_IDS.some((texture) => hairStylesByTexture[texture].includes(style))) hairStyles.push(style);
  }
  const facialHair: FacialHairId[] = ["none"];
  for (const [id, name] of Object.entries(HUMAN_FACIAL_HAIR_MODULE_NAMES) as [Exclude<FacialHairId, "none">, string][]) {
    if (hasValidatedNamedModule(model, name)) facialHair.push(id);
  }
  return {
    faceTypes,
    hairTextures,
    hairStylesByTexture,
    hairStyles,
    facialHair,
    ageMorphsAvailable: ready && morphs.has("Age_Middle") && morphs.has("Age_Elder"),
    dialogueMorphsAvailable: ready && HUMAN_DIALOGUE_MORPH_NAMES.every((name) => morphs.has(name)),
  };
}

/** Resets the compatible face family and applies exactly one selected shape. */
export function applyHumanFaceType(model: THREE.Object3D, faceType: FaceTypeId): string | null {
  const selected = faceType === "foundation" ? null : HUMAN_FACE_MORPH_BY_TYPE[faceType];
  let applied = false;
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.morphTargetDictionary || !child.morphTargetInfluences) return;
    for (const morph of Object.values(HUMAN_FACE_MORPH_BY_TYPE)) {
      const index = child.morphTargetDictionary[morph];
      if (index === undefined) continue;
      child.morphTargetInfluences[index] = morph === selected ? 1 : 0;
      applied ||= morph === selected;
    }
  });
  return selected && applied ? selected : null;
}

function rebindSkinnedMeshes(module: THREE.Object3D, target: THREE.Object3D): boolean {
  let compatible = true;
  module.traverse((child) => {
    if (!(child instanceof THREE.SkinnedMesh)) return;
    const targetBones = child.skeleton.bones.map((bone) => findTargetNode(target, bone.name));
    if (targetBones.some((bone) => !(bone instanceof THREE.Bone))) {
      compatible = false;
      return;
    }
    const skeleton = new THREE.Skeleton(
      targetBones as THREE.Bone[],
      child.skeleton.boneInverses.map((inverse) => inverse.clone()),
    );
    child.bind(skeleton, child.bindMatrix.clone());
  });
  return compatible;
}

function findTargetNode(target: THREE.Object3D, authoredName: string): THREE.Object3D | undefined {
  return target.getObjectByName(authoredName)
    ?? target.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(authoredName));
}

function containsSkinnedMesh(module: THREE.Object3D): boolean {
  let skinned = false;
  module.traverse((child) => { skinned ||= child instanceof THREE.SkinnedMesh; });
  return skinned;
}

function isolateAppearanceModuleMaterials(module: THREE.Object3D): void {
  module.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    const isolated = materials.map((material) => material.clone());
    child.material = Array.isArray(child.material) ? isolated : isolated[0]!;
  });
}

/**
 * Attaches only the locked, locally validated modular meshes. The source
 * armature never enters the runtime scene; skinned modules are rebound to the
 * target's canonical 65-bone skeleton by exact bone name.
 */
export function attachValidatedHumanAppearanceModules(
  target: THREE.Object3D,
  source: THREE.Object3D,
): HumanAppearanceHydrationResult {
  const attachedModules: string[] = [];
  const missingModules: string[] = [];
  const names = [
    ...Object.values(HUMAN_HAIR_MODULE_NAMES),
    ...Object.values(HUMAN_FACIAL_HAIR_MODULE_NAMES),
  ];
  source.updateMatrixWorld(true);
  target.updateMatrixWorld(true);
  for (const name of names) {
    const module = source.getObjectByName(name);
    if (!module || !hasValidatedAppearanceAncestor(module, source) || !rebindSkinnedMeshes(module, target)) {
      missingModules.push(name);
      continue;
    }
    const anchorName = typeof module.userData.souldrifterHeadBone === "string"
      ? module.userData.souldrifterHeadBone
      : "mixamorig:Head";
    const anchor = containsSkinnedMesh(module) ? target : findTargetNode(target, anchorName);
    if (!anchor) {
      missingModules.push(name);
      continue;
    }
    // SkeletonUtils intentionally shares material references. Each actor must
    // own its hair tint and shader state so a creator preview or portrait
    // cannot recolor another live actor.
    isolateAppearanceModuleMaterials(module);
    module.userData.souldrifterAppearanceAssetStatus = LOCAL_AUTHORING_VALIDATED;
    anchor.attach(module);
    module.visible = false;
    attachedModules.push(name);
  }
  target.updateMatrixWorld(true);
  return { attachedModules, missingModules };
}

const gltfLoader = new GLTFLoader();
let appearanceAssetPromise: Promise<GLTF> | null = null;

function loadAppearanceAsset(): Promise<GLTF> {
  appearanceAssetPromise ??= new Promise<GLTF>((resolve, reject) => {
    gltfLoader.load(HUMAN_MODULAR_APPEARANCE_MODEL_PATH, resolve, undefined, reject);
  }).catch((error) => {
    appearanceAssetPromise = null;
    throw error;
  });
  return appearanceAssetPromise;
}

/** Loads and installs the canonical modular hair asset once per actor. */
export async function hydrateHumanAppearanceModules(target: THREE.Object3D): Promise<HumanAppearanceHydrationResult> {
  const previous = target.userData[APPEARANCE_HYDRATION_KEY] as HumanAppearanceHydrationResult | undefined;
  if (previous) return previous;
  try {
    const gltf = await loadAppearanceAsset();
    const result = attachValidatedHumanAppearanceModules(target, cloneSkeleton(gltf.scene));
    target.userData[APPEARANCE_HYDRATION_KEY] = result;
    return result;
  } catch {
    const result: HumanAppearanceHydrationResult = {
      attachedModules: [],
      missingModules: [
        ...Object.values(HUMAN_HAIR_MODULE_NAMES),
        ...Object.values(HUMAN_FACIAL_HAIR_MODULE_NAMES),
      ],
    };
    target.userData[APPEARANCE_HYDRATION_KEY] = result;
    return result;
  }
}

export interface HumanAppearancePortraitController {
  readonly model: THREE.Object3D;
  readonly capability: FacialAnimationCapabilityStatus;
  beginDialogueWithVisemes(cues: readonly TimedMetaVisemeCue[], elapsedSeconds: number): void;
  speakVisemeCues(cues: readonly TimedMetaVisemeCue[], elapsedSeconds: number): void;
  /** @deprecated Compatibility only; timed Meta viseme cues are canonical. */
  beginDialogue(text: string, elapsedSeconds: number): void;
  /** @deprecated Compatibility only; timed Meta viseme cues are canonical. */
  speakLine(text: string, elapsedSeconds: number): void;
  update(elapsedSeconds: number): void;
  closeDialogue(): void;
}

/**
 * Creates an isolated close-up actor from the already assembled live actor.
 * A dialogue/quest canvas can render `model` without loading a second identity
 * or reapplying a different head, hair, skin, age, or face configuration.
 */
export function createHumanAppearancePortraitController(
  assembledActor: THREE.Object3D,
  identity: string,
): HumanAppearancePortraitController {
  const model = cloneSkeleton(assembledActor);
  model.userData.souldrifterPortraitSource = assembledActor.uuid;
  const facialAnimation = new FacialAnimationDriver(model, `${identity}:portrait`);
  return {
    model,
    capability: facialAnimation.capabilityStatus(),
    beginDialogueWithVisemes: (cues, elapsedSeconds) => facialAnimation.beginDialogueWithVisemes(cues, elapsedSeconds),
    speakVisemeCues: (cues, elapsedSeconds) => facialAnimation.speakVisemeCues(cues, elapsedSeconds),
    beginDialogue: (text, elapsedSeconds) => facialAnimation.beginDialogue(text, elapsedSeconds),
    speakLine: (text, elapsedSeconds) => facialAnimation.speakLine(text, elapsedSeconds),
    update: (elapsedSeconds) => facialAnimation.update(elapsedSeconds),
    closeDialogue: () => facialAnimation.closeDialogue(),
  };
}
