import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

import {
  resolveCharacterAppearance,
  type CanonicalHairStyleId,
  type CanonicalHairTextureId,
  type CharacterAppearance,
  type FaceTypeId,
  type FacialHairId,
} from "./character";
import {
  DIALOGUE_FACIAL_MORPH_NAMES,
  FacialAnimationDriver,
  type FacialAnimationCapabilityStatus,
  type TimedMetaVisemeCue,
} from "./facialAnimationDriver";

/**
 * Hair is chosen once, when a profile is created, and changing it afterwards is a paid edit. So
 * the pack ships as one file per module behind a manifest: the creator reads the manifest to know
 * what it may offer, and a module's geometry is fetched only when something actually wears it.
 */
export const HUMAN_APPEARANCE_MODULE_BASE_PATH = "/assets/3d/characters/human-foundation-pilot/appearance-modules";
export const HUMAN_APPEARANCE_MODULE_MANIFEST_PATH = `${HUMAN_APPEARANCE_MODULE_BASE_PATH}/manifest.json`;

export interface HumanAppearanceModuleEntry {
  name: string;
  file: string;
  bytes: number;
  sha256: string;
  vertices: number;
  meshes: readonly string[];
  extras: Readonly<Record<string, unknown>>;
}

export interface HumanAppearanceModuleManifest {
  version: number;
  basePath: string;
  modules: readonly HumanAppearanceModuleEntry[];
}


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
const APPEARANCE_MODULE_STATE_KEY = "souldrifterAppearanceModuleState";

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
  /** Modules whose geometry is attached to this actor right now. */
  attachedModules: readonly string[];
  /** Modules the manifest offers, each fetchable on demand. */
  availableModules?: readonly string[];
  /** Contract modules the pack does not carry at all. */
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

function hasAttachedNamedModule(model: THREE.Object3D, name: string): boolean {
  let available = false;
  model.traverse((child) => {
    available ||= child.name.toLowerCase() === name.toLowerCase()
      && hasValidatedAppearanceAncestor(child, model);
  });
  return available;
}

/**
 * A module counts as offerable once the manifest lists it, well before its geometry arrives.
 * Falls back to walking the actor so a model assembled by hand still reports what it carries.
 */
function hasValidatedNamedModule(model: THREE.Object3D, name: string): boolean {
  const state = model.userData[APPEARANCE_MODULE_STATE_KEY] as { entries: Map<string, unknown> } | undefined;
  if (state?.entries.has(name)) return true;
  return hasAttachedNamedModule(model, name);
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
  only?: readonly string[],
): HumanAppearanceHydrationResult {
  const attachedModules: string[] = [];
  const missingModules: string[] = [];
  const names = only ?? [
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
const moduleAssets = new Map<string, Promise<GLTF | null>>();
let manifestPromise: Promise<HumanAppearanceModuleManifest | null> | null = null;

/** Every module name the appearance contract can name, whether or not the pack carries it. */
export const HUMAN_APPEARANCE_CONTRACT_MODULE_NAMES: readonly string[] = Object.freeze([
  ...Object.values(HUMAN_HAIR_MODULE_NAMES),
  ...Object.values(HUMAN_FACIAL_HAIR_MODULE_NAMES),
]);

function loadAppearanceManifest(): Promise<HumanAppearanceModuleManifest | null> {
  manifestPromise ??= fetch(HUMAN_APPEARANCE_MODULE_MANIFEST_PATH)
    .then((response) => (response.ok ? response.json() as Promise<HumanAppearanceModuleManifest> : null))
    .catch(() => null)
    .then((manifest) => {
      if (!manifest || !Array.isArray(manifest.modules)) {
        manifestPromise = null;
        return null;
      }
      return manifest;
    });
  return manifestPromise;
}

function loadAppearanceModuleAsset(entry: HumanAppearanceModuleEntry, basePath: string): Promise<GLTF | null> {
  const existing = moduleAssets.get(entry.name);
  if (existing) return existing;
  const url = `${basePath.replace(/\/$/, "")}/${entry.file}`;
  const pending = new Promise<GLTF>((resolve, reject) => {
    gltfLoader.load(url, resolve, undefined, reject);
  }).catch((error) => {
    // A failed fetch must not poison the cache; a later selection may succeed.
    moduleAssets.delete(entry.name);
    console.warn(`Appearance module ${entry.name} could not be loaded.`, error);
    return null;
  });
  moduleAssets.set(entry.name, pending);
  return pending;
}

interface AppearanceModuleState {
  manifest: HumanAppearanceModuleManifest;
  entries: Map<string, HumanAppearanceModuleEntry>;
  attached: Set<string>;
  inFlight: Map<string, Promise<boolean>>;
  onModuleReady?: (name: string) => void;
}

function moduleState(target: THREE.Object3D): AppearanceModuleState | undefined {
  return target.userData[APPEARANCE_MODULE_STATE_KEY] as AppearanceModuleState | undefined;
}

/** Names this actor could still wear: already attached, or listed in the manifest. */
export function humanAppearanceModuleNames(target: THREE.Object3D): ReadonlySet<string> {
  const state = moduleState(target);
  if (!state) return new Set();
  return new Set([...state.entries.keys(), ...state.attached]);
}

/**
 * Attaches one module's geometry, fetching it the first time it is asked for. Resolves false when
 * the pack does not carry it, so a caller can fall back rather than wait forever.
 */
export async function ensureHumanAppearanceModule(target: THREE.Object3D, name: string): Promise<boolean> {
  const state = moduleState(target);
  if (!state) return false;
  if (state.attached.has(name)) return true;
  const running = state.inFlight.get(name);
  if (running) return running;
  const entry = state.entries.get(name);
  if (!entry) return false;
  const pending = loadAppearanceModuleAsset(entry, state.manifest.basePath ?? HUMAN_APPEARANCE_MODULE_BASE_PATH)
    .then((gltf) => {
      if (!gltf) return false;
      const result = attachValidatedHumanAppearanceModules(target, cloneSkeleton(gltf.scene), [name]);
      const attached = result.attachedModules.includes(name);
      if (attached) {
        state.attached.add(name);
        const hydration = target.userData[APPEARANCE_HYDRATION_KEY] as HumanAppearanceHydrationResult | undefined;
        if (hydration) {
          target.userData[APPEARANCE_HYDRATION_KEY] = {
            ...hydration,
            attachedModules: [...state.attached],
          } satisfies HumanAppearanceHydrationResult;
        }
      }
      return attached;
    })
    .finally(() => { state.inFlight.delete(name); });
  state.inFlight.set(name, pending);
  return pending;
}

/**
 * Starts a fetch for a module that is not attached yet, and reports whether one is now under way.
 * A renderer calls this from its synchronous apply pass and keeps showing what it already has.
 */
export function requestHumanAppearanceModule(target: THREE.Object3D, name: string): boolean {
  const state = moduleState(target);
  if (!state || state.attached.has(name) || !state.entries.has(name)) return false;
  void ensureHumanAppearanceModule(target, name).then((attached) => {
    if (attached) state.onModuleReady?.(name);
  });
  return true;
}

/**
 * Reads the module manifest and records what this actor may wear. No geometry is fetched here;
 * `ensureHumanAppearanceModule` brings a module in when something selects it.
 */
export async function hydrateHumanAppearanceModules(
  target: THREE.Object3D,
  options?: { onModuleReady?: (name: string) => void },
): Promise<HumanAppearanceHydrationResult> {
  const existing = moduleState(target);
  if (existing) {
    existing.onModuleReady = options?.onModuleReady;
    return target.userData[APPEARANCE_HYDRATION_KEY] as HumanAppearanceHydrationResult;
  }
  const manifest = await loadAppearanceManifest();
  const entries = new Map<string, HumanAppearanceModuleEntry>();
  for (const entry of manifest?.modules ?? []) {
    if (HUMAN_APPEARANCE_CONTRACT_MODULE_NAMES.includes(entry.name)) entries.set(entry.name, entry);
  }
  const state: AppearanceModuleState = {
    manifest: manifest ?? { version: 0, basePath: HUMAN_APPEARANCE_MODULE_BASE_PATH, modules: [] },
    entries,
    attached: new Set(),
    inFlight: new Map(),
    onModuleReady: options?.onModuleReady,
  };
  target.userData[APPEARANCE_MODULE_STATE_KEY] = state;
  const result: HumanAppearanceHydrationResult = {
    attachedModules: [],
    availableModules: [...entries.keys()],
    missingModules: HUMAN_APPEARANCE_CONTRACT_MODULE_NAMES.filter((name) => !entries.has(name)),
  };
  target.userData[APPEARANCE_HYDRATION_KEY] = result;
  return result;
}

/** The modules an actor wearing this appearance needs on screen: a hairstyle, and maybe a beard. */
export function humanAppearanceWornModules(appearance: Partial<CharacterAppearance> | undefined): string[] {
  const resolved = resolveCharacterAppearance(appearance);
  const worn: string[] = [];
  const hair = humanHairModuleName(resolved.hairStyle, resolved.hairTexture);
  if (hair) worn.push(hair);
  if (resolved.facialHair !== "none") worn.push(HUMAN_FACIAL_HAIR_MODULE_NAMES[resolved.facialHair]);
  return worn;
}

/** Fetches exactly what this appearance wears, so an actor never pays for the rest of the catalogue. */
export async function ensureWornHumanAppearanceModules(
  target: THREE.Object3D,
  appearance: Partial<CharacterAppearance> | undefined,
): Promise<void> {
  await Promise.all(humanAppearanceWornModules(appearance)
    .map((name) => ensureHumanAppearanceModule(target, name)));
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
