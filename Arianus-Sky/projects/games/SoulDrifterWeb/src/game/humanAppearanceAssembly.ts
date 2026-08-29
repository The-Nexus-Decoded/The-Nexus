import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

import type {
  CanonicalHairStyleId,
  FaceTypeId,
  FacialHairId,
} from "./character";
import {
  FacialAnimationDriver,
  type FacialAnimationCapabilityStatus,
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

export const HUMAN_DIALOGUE_MORPH_NAMES = [
  "Blink_L",
  "Blink_R",
  "JawOpen",
  "Smile",
  "Frown",
  "Viseme_AA",
  "Viseme_EE",
  "Viseme_OH",
  "Viseme_MBP",
  "Gaze_Left",
  "Gaze_Right",
  "Gaze_Up",
  "Gaze_Down",
  "Brow_Raise",
  "Brow_Lower",
  "LipSeal",
] as const;

export const HUMAN_HAIR_MODULE_NAMES: Readonly<Record<Exclude<CanonicalHairStyleId, "shaved-buzzed">, string>> = {
  cropped: "SK_Hair_Cropped",
  parted: "SK_Hair_Parted",
  "curly-coiled": "SK_Hair_CurlyCoiled",
  long: "SK_Hair_Long",
  "tied-back": "SK_Hair_TiedBack",
  braided: "SK_Hair_Braided",
};

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
  const hairStyles: CanonicalHairStyleId[] = ["shaved-buzzed"];
  for (const [id, name] of Object.entries(HUMAN_HAIR_MODULE_NAMES) as [Exclude<CanonicalHairStyleId, "shaved-buzzed">, string][]) {
    if (hasValidatedNamedModule(model, name)) hairStyles.push(id);
  }
  const facialHair: FacialHairId[] = ["none"];
  for (const [id, name] of Object.entries(HUMAN_FACIAL_HAIR_MODULE_NAMES) as [Exclude<FacialHairId, "none">, string][]) {
    if (hasValidatedNamedModule(model, name)) facialHair.push(id);
  }
  return {
    faceTypes,
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
  beginDialogue(text: string, elapsedSeconds: number): void;
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
    beginDialogue: (text, elapsedSeconds) => facialAnimation.beginDialogue(text, elapsedSeconds),
    speakLine: (text, elapsedSeconds) => facialAnimation.speakLine(text, elapsedSeconds),
    update: (elapsedSeconds) => facialAnimation.update(elapsedSeconds),
    closeDialogue: () => facialAnimation.closeDialogue(),
  };
}
