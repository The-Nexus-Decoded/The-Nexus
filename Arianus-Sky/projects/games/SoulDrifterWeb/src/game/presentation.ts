import * as THREE from "three";
import {
  HAIR_COLORS,
  SKIN_TONES,
  resolveCharacterAppearance,
  type FaceTypeId,
  type FacialHairId,
  type HairColorId,
  type HairStyleSelectionId,
  type SkinToneId,
} from "./character";
import {
  applyHumanFaceType,
  hasValidatedAppearanceAncestor,
  HUMAN_FACIAL_HAIR_MODULE_NAMES,
  HUMAN_HAIR_MODULE_NAMES,
} from "./humanAppearanceAssembly";

export interface PointerHitCandidate<TTile> {
  enemyId?: string;
  interactId?: string;
  tile?: TTile;
}

export type PointerHitIntent<TTile> =
  | { kind: "enemy"; id: string }
  | { kind: "interact"; id: string }
  | { kind: "ground"; tile: TTile }
  | null;

export function resolvePointerHitIntent<TTile>(hits: readonly PointerHitCandidate<TTile>[]): PointerHitIntent<TTile> {
  const semanticHit = hits.find((hit) => hit.enemyId !== undefined || hit.interactId !== undefined);
  if (semanticHit?.enemyId !== undefined) return { kind: "enemy", id: semanticHit.enemyId };
  if (semanticHit?.interactId !== undefined) return { kind: "interact", id: semanticHit.interactId };
  const groundHit = hits.find((hit) => hit.tile !== undefined);
  return groundHit?.tile === undefined ? null : { kind: "ground", tile: groundHit.tile };
}

export function occlusionSampleHeights(upperHeight: number): [number, number] {
  return [Math.min(0.28, upperHeight), upperHeight];
}

function isGroundingAttackTarget(target: string): boolean {
  const normalized = target.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ["root", "armature", "pelvis", "hips"].some((name) => normalized.endsWith(name))
    || /(?:thigh|calf|foot|ball|toe)(?:l|r)$/.test(normalized)
    || /(?:left|right)(?:upleg|leg|foot|toebase|toe)$/.test(normalized);
}

/** Foundation pilot keeps its skin under provider-authored names. */
export function isActorSkinSurface(name: string): boolean {
  return /skin|face|ear|nose|brow|jaw|head|humanfoundation_body|tripo_079291c6/i.test(name);
}

export function cloneActorMaterial(
  source: THREE.Material,
  tint: number,
  preserveAuthoredPalette: boolean,
  skinTone?: number,
): THREE.Material {
  const material = source.clone();
  if (!(material instanceof THREE.MeshStandardMaterial)) return material;

  if (preserveAuthoredPalette) {
    if (skinTone !== undefined && isActorSkinSurface(`${source.name} ${material.name}`)) {
      material.color.lerp(new THREE.Color(skinTone), 0.62);
      material.roughness = Math.max(material.roughness, 0.5);
    }
    return material;
  }

  material.color.lerp(new THREE.Color(tint), 0.08);
  material.roughness = Math.max(material.roughness, 0.48);
  material.emissive.copy(material.color).multiplyScalar(0.09);
  material.emissiveIntensity = 0.48;
  return material;
}

/**
 * Converts vendor-authored locomotion into an in-place clip. World3D owns grid
 * displacement; clips own the planted feet, body weight, hands, and telegraph.
 */
export function sanitizeInPlaceClip(clip: THREE.AnimationClip): THREE.AnimationClip {
  const tracks = clip.tracks
    .flatMap((track) => {
      const separator = track.name.lastIndexOf(".");
      if (separator < 0) return [track.clone()];
      const target = track.name.slice(0, separator).split(/[|/:]/).at(-1)?.toLowerCase();
      if (!target) return [track.clone()];

      const property = track.name.slice(separator + 1).toLowerCase();
      const normalizedTarget = target.replace(/[^a-z0-9]/g, "");
      if (normalizedTarget.endsWith("armature")) return [];

      const isCore = ["root", "pelvis", "hips"].some((name) => normalizedTarget.endsWith(name));
      if (isCore && property === "position" && track.getValueSize() >= 3) {
        const anchored = track.clone();
        const values = anchored.values;
        const stride = anchored.getValueSize();
        const anchorX = values[0] ?? 0;
        const anchorZ = values[2] ?? 0;
        for (let index = 0; index < values.length; index += stride) {
          values[index] = anchorX;
          values[index + 2] = anchorZ;
        }
        return [anchored];
      }

      if (normalizedTarget.endsWith("root")) return [];

      return property !== "position" || !isGroundingAttackTarget(target) ? [track.clone()] : [];
    })
  return new THREE.AnimationClip(clip.name, clip.duration, tracks, clip.blendMode);
}

export const sanitizeAttackClip = sanitizeInPlaceClip;

/**
 * Normalizes the imported Mixamo death take into a semantic one-way fall.
 * Its valid collapse is followed by an unintended stand-up tail.
 */
export function createTerminalDeathClip(
  source: THREE.AnimationClip,
  terminalNormalized = 0.408,
): THREE.AnimationClip {
  const terminalTime = source.duration * THREE.MathUtils.clamp(terminalNormalized, 0, 1);
  const tracks = source.tracks.map((sourceTrack) => {
    const track = sourceTrack.clone();
    // KeyframeTrack.trim treats the upper bound as exclusive; preserve an
    // authored sample that lands exactly on the semantic terminal.
    track.trim(0, terminalTime + 1e-6);
    return track;
  });
  return new THREE.AnimationClip("DeathBaseline", terminalTime, tracks, source.blendMode);
}

/** Progressively tips the collapsed rig onto its support plane. */
export function deathBodyTilt(normalizedTime: number): number {
  const progress = THREE.MathUtils.smoothstep(normalizedTime, 0.55, 1);
  return -progress * Math.PI / 2;
}

export type WeaponVisualState = "hidden" | "sheathed" | "drawn";

export interface WeaponPresentation {
  handSocket: THREE.Group;
  hipSocket: THREE.Group;
  state: WeaponVisualState;
}

const STARTER_LONGSWORD_PART = /^SK_Starter(?:Long|Short)sword_(?:Blade|Grip|Guard|Pommel)(?:_Mesh)?$/i;

/**
 * Creates one visual copy for the hand and one for the left hip. Both are
 * driven by the same skeleton, so armor/skin changes never require re-rigging
 * the animation library.
 */
export function createStarterLongswordPresentation(model: THREE.Object3D): WeaponPresentation | undefined {
  const parts: THREE.Object3D[] = [];
  model.traverse((child) => {
    if (STARTER_LONGSWORD_PART.test(child.name)) parts.push(child);
  });
  if (parts.length === 0) return undefined;

  const handBone = model.getObjectByName("hand_r") ?? parts[0]!.parent;
  const hipBone = model.getObjectByName("pelvis") ?? model.getObjectByName("spine_01");
  if (!handBone || !hipBone) return undefined;

  const handSocket = new THREE.Group();
  handSocket.name = "weapon-socket-hand-r";
  handBone.add(handSocket);
  model.updateMatrixWorld(true);
  parts.forEach((part) => handSocket.attach(part));

  const hipSocket = handSocket.clone(true);
  hipSocket.name = "weapon-socket-hip-l";
  // Short blades hang at the left side of the belt, clear of the thigh and
  // the forward bend envelope. Large weapon families can supply a separate
  // back socket later; this avoids the disconnected chest harness.
  hipSocket.position.set(0.24, -0.05, 0.0);
  hipSocket.rotation.set(0.08, -0.12, 2.1);
  hipBone.add(hipSocket);

  const presentation: WeaponPresentation = { handSocket, hipSocket, state: "hidden" };
  setWeaponVisualState(presentation, "hidden");
  return presentation;
}

export function setWeaponVisualState(presentation: WeaponPresentation, state: WeaponVisualState): void {
  presentation.state = state;
  presentation.handSocket.visible = state === "drawn";
  presentation.hipSocket.visible = state === "sheathed";
}

export type HumanoidRaceId = "human" | "elf" | "dwarf" | "halfling";

export interface ModularAppearance {
  hairStyle: HairStyleSelectionId;
  raceId: HumanoidRaceId;
  faceType?: FaceTypeId;
  facialHair?: FacialHairId;
  hairColor?: HairColorId;
  skinTone?: SkinToneId;
  age?: number;
  hairGreying?: number;
  facialHairGreying?: number;
}

export type ModularAssetApplication = "applied" | "none" | "missing-provider-asset";

export interface ModularAppearanceResult {
  hair: ModularAssetApplication;
  facialHair: ModularAssetApplication;
  faceMorphApplied: string | null;
  ageMorphsApplied: readonly string[];
  tintedMaterials: number;
  missingProviderAssets: readonly string[];
}

/** glTF extras contract required on an approved provider module or its containing scene. */
export const MODULAR_APPEARANCE_PROVIDER_STATUS_KEY = "souldrifterAppearanceAssetStatus";
export const MODULAR_APPEARANCE_PROVIDER_APPROVED = "PROVIDER_APPROVED";

export const HUMAN_SCALP_FOLLICLE_MASK_STATUS_KEY = "souldrifterFollicleMaskStatus";
export const HUMAN_SCALP_FOLLICLE_MASK_URL_KEY = "souldrifterFollicleMaskUrl";
export const HUMAN_SCALP_FOLLICLE_MASK_SHA256_KEY = "souldrifterFollicleMaskSha256";
export const HUMAN_SCALP_FOLLICLE_MASK_UV_SET_KEY = "souldrifterFollicleMaskUvSet";
export const HUMAN_SCALP_FOLLICLE_MASK_SOURCE_HEAD_SHA256_KEY = "souldrifterFollicleMaskSourceHeadSha256";
export const HUMAN_SCALP_FOLLICLE_UNDERCOAT_STRENGTH_KEY = "souldrifterFollicleUndercoatStrength";

const HUMAN_SCALP_FOLLICLE_MASK_APPROVED = "LOCAL_AUTHORING_VALIDATED";
const HUMAN_SCALP_FOLLICLE_SOURCE_HEAD_SHA256 = "5DB5DB3B28802F604E87449CF41B5852F3454800E1520CB1C3685836796242B8";
const HUMAN_SCALP_FOLLICLE_MATERIAL = "tripo_079291c6_872f_4a79_8d7e_51aedb0891a6";
const HUMAN_SCALP_FOLLICLE_MAX_STRENGTH = 0.30;
const HUMAN_SCALP_FOLLICLE_SHADER_KEY = "souldrifter-scalp-follicle-undercoat-v2";
const HUMAN_SCALP_FOLLICLE_STATE_KEY = "souldrifterScalpFollicleUniformState";
const HUMAN_SCALP_FOLLICLE_ISOLATION_KEY = "souldrifterScalpFollicleMaterialOwner";
const HUMAN_SCALP_FOLLICLE_REQUEST_KEY = "souldrifterScalpFollicleRequest";
const HUMAN_SCALP_FOLLICLE_MODEL_STATE_KEY = "souldrifterScalpFollicleUndercoat";
const HUMAN_SCALP_FOLLICLE_TARGET = /^(?:HumanFoundation_Body|HumanFoundation_HeadBase)$/;
const HUMAN_SCALP_FOLLICLE_MASK_URL = /^\/assets\/3d\/characters\/human-foundation-pilot\/follicle-masks\/[a-z0-9][a-z0-9._-]*\.png$/;

interface HumanScalpFollicleUniformState {
  mask: { value: THREE.Texture | null };
  tint: { value: THREE.Color };
  strength: { value: number };
  url: string | null;
}

interface HumanScalpFollicleMaskContract {
  url: string;
  strength: number;
}

export type HumanScalpFollicleMaskLoader = (url: string) => Promise<THREE.Texture | null>;

const humanScalpFollicleMaskPromises = new Map<string, Promise<THREE.Texture | null>>();

function defaultHumanScalpFollicleMaskLoader(url: string): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(url, resolve, undefined, () => resolve(null));
  });
}

function loadHumanScalpFollicleMask(
  url: string,
  loader: HumanScalpFollicleMaskLoader,
): Promise<THREE.Texture | null> {
  let cached = humanScalpFollicleMaskPromises.get(url);
  if (!cached) {
    try {
      cached = loader(url)
        .then((texture) => {
          if (!texture) return null;
          texture.flipY = false;
          texture.colorSpace = THREE.NoColorSpace;
          return texture;
        })
        .catch(() => null);
    } catch {
      cached = Promise.resolve(null);
    }
    humanScalpFollicleMaskPromises.set(url, cached);
  }
  return cached;
}

function moduleHasForbiddenScalpUnderlay(module: THREE.Object3D): boolean {
  let forbidden = false;
  module.traverse((child) => {
    if (forbidden) return;
    if (child !== module && /(?:scalp|rootcap|undercoat|underlay)/i.test(child.name)) {
      forbidden = true;
      return;
    }
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    forbidden = materials.some((material) => material.userData.souldrifterTintChannel === "SKIN");
  });
  return forbidden;
}

function readHumanScalpFollicleMaskContract(
  model: THREE.Object3D,
  hairModule: THREE.Object3D | undefined,
): HumanScalpFollicleMaskContract | null {
  if (!hairModule || hairModule.visible === false || !hasProviderApproval(hairModule, model)) return null;
  if (moduleHasForbiddenScalpUnderlay(hairModule)) return null;
  const metadata = hairModule.userData;
  const url = metadata[HUMAN_SCALP_FOLLICLE_MASK_URL_KEY] as unknown;
  const sha256 = metadata[HUMAN_SCALP_FOLLICLE_MASK_SHA256_KEY] as unknown;
  const strength = metadata[HUMAN_SCALP_FOLLICLE_UNDERCOAT_STRENGTH_KEY] as unknown;
  if (metadata[HUMAN_SCALP_FOLLICLE_MASK_STATUS_KEY] !== HUMAN_SCALP_FOLLICLE_MASK_APPROVED
    || typeof url !== "string" || !HUMAN_SCALP_FOLLICLE_MASK_URL.test(url)
    || typeof sha256 !== "string" || !/^[A-F0-9]{64}$/.test(sha256)
    || metadata[HUMAN_SCALP_FOLLICLE_MASK_UV_SET_KEY] !== "UVMap"
    || metadata[HUMAN_SCALP_FOLLICLE_MASK_SOURCE_HEAD_SHA256_KEY] !== HUMAN_SCALP_FOLLICLE_SOURCE_HEAD_SHA256
    || typeof strength !== "number" || !Number.isFinite(strength)
    || strength <= 0 || strength > HUMAN_SCALP_FOLLICLE_MAX_STRENGTH) {
    return null;
  }
  return { url, strength };
}

function isolateHumanScalpFollicleTargets(model: THREE.Object3D): THREE.MeshStandardMaterial[] {
  const targets: THREE.MeshStandardMaterial[] = [];
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !HUMAN_SCALP_FOLLICLE_TARGET.test(child.name)) return;
    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    let changed = false;
    const materials = sourceMaterials.map((source) => {
      if (!(source instanceof THREE.MeshStandardMaterial)
        || source.name !== HUMAN_SCALP_FOLLICLE_MATERIAL || !source.map) return source;
      let material = source;
      if (source.userData[HUMAN_SCALP_FOLLICLE_ISOLATION_KEY] !== child.uuid) {
        material = source.clone();
        material.onBeforeCompile = source.onBeforeCompile;
        material.customProgramCacheKey = source.customProgramCacheKey;
        material.userData[HUMAN_SCALP_FOLLICLE_ISOLATION_KEY] = child.uuid;
        changed = true;
      }
      targets.push(material);
      return material;
    });
    if (changed) child.material = Array.isArray(child.material) ? materials : materials[0]!;
  });
  return targets;
}

function existingHumanScalpFollicleTargets(model: THREE.Object3D): THREE.MeshStandardMaterial[] {
  const targets: THREE.MeshStandardMaterial[] = [];
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !HUMAN_SCALP_FOLLICLE_TARGET.test(child.name)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial
        && material.name === HUMAN_SCALP_FOLLICLE_MATERIAL && material.map) targets.push(material);
    });
  });
  return targets;
}

function humanScalpFollicleUniformState(
  material: THREE.MeshStandardMaterial,
): HumanScalpFollicleUniformState {
  const existing = material.userData[HUMAN_SCALP_FOLLICLE_STATE_KEY] as HumanScalpFollicleUniformState | undefined;
  if (existing) return existing;
  const state: HumanScalpFollicleUniformState = {
    mask: { value: null },
    tint: { value: new THREE.Color() },
    strength: { value: 0 },
    url: null,
  };
  const previousCompile = material.onBeforeCompile.bind(material);
  const previousCacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previousCompile(shader, renderer);
    shader.uniforms.souldrifterFollicleMask = state.mask;
    shader.uniforms.souldrifterFollicleTint = state.tint;
    shader.uniforms.souldrifterFollicleStrength = state.strength;
    shader.fragmentShader = `
uniform sampler2D souldrifterFollicleMask;
uniform vec3 souldrifterFollicleTint;
uniform float souldrifterFollicleStrength;
${shader.fragmentShader.replace("#include <map_fragment>", `
#include <map_fragment>
#ifdef USE_MAP
  float souldrifterFollicleDensity = texture2D( souldrifterFollicleMask, vMapUv ).r;
  float souldrifterFollicleInfluence = clamp(
    souldrifterFollicleDensity * souldrifterFollicleStrength,
    0.0,
    ${HUMAN_SCALP_FOLLICLE_MAX_STRENGTH.toFixed(2)}
  );
  float souldrifterFollicleTintLuma = max(
    dot( souldrifterFollicleTint, vec3( 0.2126, 0.7152, 0.0722 ) ),
    0.04
  );
  vec3 souldrifterFollicleTintChroma = clamp(
    souldrifterFollicleTint / souldrifterFollicleTintLuma,
    vec3( 0.55 ),
    vec3( 1.45 )
  );
  float souldrifterFollicleRootShadow = mix( 1.0, 0.55, souldrifterFollicleInfluence );
  vec3 souldrifterFollicleChromaModulation = mix(
    vec3( 1.0 ),
    souldrifterFollicleTintChroma,
    souldrifterFollicleInfluence
  );
  diffuseColor.rgb *= souldrifterFollicleRootShadow * souldrifterFollicleChromaModulation;
#endif
`)}`;
  };
  material.customProgramCacheKey = () => `${previousCacheKey()}|${HUMAN_SCALP_FOLLICLE_SHADER_KEY}`;
  material.userData[HUMAN_SCALP_FOLLICLE_STATE_KEY] = state;
  material.userData.souldrifterScalpFollicleRuntime = HUMAN_SCALP_FOLLICLE_SHADER_KEY;
  material.needsUpdate = true;
  return state;
}

function disableHumanScalpFollicleUndercoat(
  model: THREE.Object3D,
  targets: readonly THREE.MeshStandardMaterial[],
  reason: string,
): void {
  targets.forEach((material) => {
    const state = material.userData[HUMAN_SCALP_FOLLICLE_STATE_KEY] as HumanScalpFollicleUniformState | undefined;
    if (!state) return;
    state.mask.value = null;
    state.strength.value = 0;
    state.url = null;
  });
  model.userData[HUMAN_SCALP_FOLLICLE_MODEL_STATE_KEY] = { status: "DISABLED", reason };
}

/**
 * Adds a density-mask follicle transition directly to the exact Tripo skin.
 * It never accepts a scalp shell or skin-tinted hair underlay, and it leaves
 * the actor's authored 4K map, normal map, and roughness channels untouched.
 */
export function setHumanScalpFollicleUndercoat(
  model: THREE.Object3D,
  hairModule: THREE.Object3D | undefined,
  hairTint: THREE.Color,
  loader: HumanScalpFollicleMaskLoader = defaultHumanScalpFollicleMaskLoader,
): void {
  const previousRequest = Number(model.userData[HUMAN_SCALP_FOLLICLE_REQUEST_KEY] ?? 0);
  const request = Number.isFinite(previousRequest) ? previousRequest + 1 : 1;
  model.userData[HUMAN_SCALP_FOLLICLE_REQUEST_KEY] = request;
  const existingTargets = existingHumanScalpFollicleTargets(model);
  const contract = readHumanScalpFollicleMaskContract(model, hairModule);
  if (!contract) {
    disableHumanScalpFollicleUndercoat(model, existingTargets, "missing-or-invalid-approved-mask");
    return;
  }
  const targets = isolateHumanScalpFollicleTargets(model);
  if (targets.length === 0) {
    disableHumanScalpFollicleUndercoat(model, existingTargets, "exact-tripo-scalp-target-missing");
    return;
  }
  const states = targets.map((material) => humanScalpFollicleUniformState(material));
  states.forEach((state) => state.tint.value.copy(hairTint));
  const alreadyActive = states.every((state) => state.url === contract.url && state.mask.value);
  if (alreadyActive) {
    states.forEach((state) => { state.strength.value = contract.strength; });
    model.userData[HUMAN_SCALP_FOLLICLE_MODEL_STATE_KEY] = {
      status: "ACTIVE",
      url: contract.url,
      strength: contract.strength,
    };
    return;
  }
  states.forEach((state) => {
    state.mask.value = null;
    state.strength.value = 0;
    state.url = contract.url;
  });
  model.userData[HUMAN_SCALP_FOLLICLE_MODEL_STATE_KEY] = { status: "LOADING", url: contract.url };
  void loadHumanScalpFollicleMask(contract.url, loader).then((texture) => {
    if (model.userData[HUMAN_SCALP_FOLLICLE_REQUEST_KEY] !== request) return;
    if (!texture) {
      disableHumanScalpFollicleUndercoat(model, targets, "mask-load-failed");
      return;
    }
    states.forEach((state) => {
      state.mask.value = texture;
      state.tint.value.copy(hairTint);
      state.strength.value = contract.strength;
      state.url = contract.url;
    });
    model.userData[HUMAN_SCALP_FOLLICLE_MODEL_STATE_KEY] = {
      status: "ACTIVE",
      url: contract.url,
      strength: contract.strength,
    };
  });
}

/**
 * The head texture paints the crown silver so short styles read as stubble.
 * For "shaved" that paint becomes a bald-cap, so we swap in a skin-toned scalp
 * variant shipped next to the models. Shared by the human and elf GLBs (same
 * head texture), and by every cloneActorMaterial copy (map is shared by
 * reference, so we swap per material instance via userData).
 */
const SCALP_SKIN_URL = "/assets/3d/characters/human-shadowknight/T_Superhero_Male_Ligh_ScalpSkin.png";
let scalpSkinTexture: THREE.Texture | null = null;
let scalpSkinPromise: Promise<THREE.Texture | null> | null = null;

function loadScalpSkinTexture(): Promise<THREE.Texture | null> {
  scalpSkinPromise ??= new Promise((resolve) => {
    new THREE.TextureLoader().load(
      SCALP_SKIN_URL,
      (texture) => {
        texture.flipY = false;
        texture.colorSpace = THREE.SRGBColorSpace;
        scalpSkinTexture = texture;
        resolve(texture);
      },
      undefined,
      () => resolve(null),
    );
  });
  return scalpSkinPromise;
}

function swapScalpMaterial(material: THREE.Material, useSkinTexture: boolean, texture: THREE.Texture | null): void {
  if (!(material instanceof THREE.MeshStandardMaterial)) return;
  const map = material.map;
  const isScalpSkin = /human_skin/i.test(material.name ?? "") || /ScalpSilver/i.test(map?.name ?? "");
  const silver = material.userData.silverScalpMap as THREE.Texture | undefined;
  if (!silver && map && isScalpSkin) material.userData.silverScalpMap = map;
  const silverMap = material.userData.silverScalpMap as THREE.Texture | undefined;
  if (!silverMap) return;
  const next = useSkinTexture && texture ? texture : silverMap;
  if (material.map !== next) {
    material.map = next;
    material.needsUpdate = true;
  }
}

function applyScalpVariant(
  model: THREE.Object3D,
  hairStyle: HairStyleSelectionId,
): void {
  const shaved = hairStyle === "shaved" || hairStyle === "shaved-buzzed";
  const useSkinTexture = shaved;
  model.userData.scalpShaved = shaved;
  model.userData.scalpUsesSkinTexture = useSkinTexture;
  const apply = (texture: THREE.Texture | null): void => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => swapScalpMaterial(material, useSkinTexture, texture));
      }
    });
  };
  if (!useSkinTexture) {
    apply(scalpSkinTexture);
    return;
  }
  if (scalpSkinTexture) apply(scalpSkinTexture);
  else void loadScalpSkinTexture().then((texture) => {
    // The player may have switched styles while the texture streamed in.
    if (texture && model.userData.scalpUsesSkinTexture === true) apply(texture);
  });
}

const RACE_AVATAR_SHAPES: Readonly<Record<HumanoidRaceId, { width: number; depth: number }>> = {
  human: { width: 1, depth: 1 },
  elf: { width: 0.94, depth: 0.96 },
  dwarf: { width: 1.22, depth: 1.15 },
  halfling: { width: 1.08, depth: 1.04 },
};

export function raceAvatarShape(raceId: string): { width: number; depth: number } {
  return RACE_AVATAR_SHAPES[raceId as HumanoidRaceId] ?? RACE_AVATAR_SHAPES.human;
}

const HAIR_MODULE_NAMES = {
  "shaved-buzzed": "SK_Hair_Buzzed",
  ...HUMAN_HAIR_MODULE_NAMES,
} as const;

const FACIAL_HAIR_MODULE_NAMES = HUMAN_FACIAL_HAIR_MODULE_NAMES;

function hasProviderApproval(module: THREE.Object3D, model: THREE.Object3D): boolean {
  return hasValidatedAppearanceAncestor(module, model);
}

function findApprovedModule(model: THREE.Object3D, name: string): THREE.Object3D | undefined {
  let match: THREE.Object3D | undefined;
  model.traverse((child) => {
    if (!match && child.name.toLowerCase() === name.toLowerCase() && hasProviderApproval(child, model)) {
      match = child;
    }
  });
  return match;
}

function hideAppearanceModules(model: THREE.Object3D): void {
  model.traverse((child) => {
    if (/^SK_Hair_(?:Buzzed|Cropped|Parted|CurlyCoiled|Long|TiedBack|Braided)$/i.test(child.name)
      || /^SK_HairScalp$/i.test(child.name)
      || /^SK_SilverHairClump/i.test(child.name)
      || /^SK_FacialHair_(?:Stubble|Moustache|Goatee|ShortBeard|FullBeard)$/i.test(child.name)
      || /^SK_Beard_Full$/i.test(child.name)) {
      child.visible = false;
    }
  });
}

const GREYING_COLOR = new THREE.Color(0xa8a39b);
const HAIR_MAP_RECOLOR_KEY = "souldrifter-hair-map-recolor-v2";

function enableHairMapRecolor(material: THREE.MeshStandardMaterial): void {
  if (!material.map || material.userData.souldrifterHairMapRecolor === HAIR_MAP_RECOLOR_KEY) return;
  // Runtime hair is delivered as layered cards. Every SoulDrifter renderer
  // enables MSAA but does not run a temporal resolve, so alpha-to-coverage is
  // stable where alpha hashing would introduce visible grain and shimmer.
  // Keep depth writes on to avoid order-dependent transparent-card seams and
  // render both sides so back-facing cards remain visible during head turns.
  material.transparent = false;
  material.alphaHash = false;
  material.alphaTest = Math.max(0.35, material.alphaTest);
  material.alphaToCoverage = true;
  material.depthWrite = true;
  material.side = THREE.DoubleSide;
  material.metalness = 0;
  material.roughness = Math.max(0.58, material.roughness);
  if (material instanceof THREE.MeshPhysicalMaterial) {
    material.anisotropy = Math.max(0.45, material.anisotropy);
  }
  const previousCompile = material.onBeforeCompile.bind(material);
  const previousCacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previousCompile(shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  #ifdef DECODE_VIDEO_TEXTURE
    sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
  #endif
  float souldrifterHairLuma = dot( sampledDiffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
  // Preserve the authored strand variation without letting a near-black baked
  // diffuse map swallow blonde, grey, or white creator selections.
  float souldrifterStrandValue = mix( 0.72, 1.18, smoothstep( 0.01, 0.65, souldrifterHairLuma ) );
  diffuseColor *= vec4( vec3( souldrifterStrandValue ), sampledDiffuseColor.a );
#endif
`);
  };
  material.customProgramCacheKey = () => `${previousCacheKey()}|${HAIR_MAP_RECOLOR_KEY}`;
  material.userData.souldrifterHairMapRecolor = HAIR_MAP_RECOLOR_KEY;
  material.userData.souldrifterHairRuntimeMaterial = "alpha-tested-msaa-anisotropic-cards-v2";
}

function tintMaterial(material: THREE.Material, color: THREE.Color, recolorTexturedHair = false): boolean {
  if (!(material instanceof THREE.MeshStandardMaterial)) return false;
  if (recolorTexturedHair) enableHairMapRecolor(material);
  material.color.copy(color);
  material.needsUpdate = true;
  return true;
}

function resolvedActorSkinColor(model: THREE.Object3D, fallback: THREE.Color): THREE.Color {
  let skin: THREE.Color | undefined;
  model.traverse((child) => {
    if (skin || !(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (skin || !(material instanceof THREE.MeshStandardMaterial)) return;
      const surfaceName = `${child.name} ${material.name}`;
      const excludedAccessory = /hair|brow|lash|eye|tooth|teeth|mouth|tongue|scalp/i.test(surfaceName);
      if (!excludedAccessory && isActorSkinSurface(surfaceName)) skin = material.color.clone();
    });
  });
  return skin ?? fallback;
}

function tintAppearanceModule(
  object: THREE.Object3D,
  hairColor: THREE.Color,
  skinColor: THREE.Color,
): number {
  let count = 0;
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      const channel = material.userData.souldrifterTintChannel as unknown;
      const mode = material.userData.souldrifterTintMode as unknown;
      // Missing channels are the approved legacy all-hair contract. Any new,
      // explicit unknown channel fails closed instead of receiving hair dye.
      const tint = channel === undefined || channel === "HAIR"
        ? hairColor
        : channel === "SKIN" && mode === "MATCH_RUNTIME_SKIN_TONE"
          ? skinColor
          : null;
      const texturedHair = tint === hairColor && (channel === "HAIR" || channel === undefined);
      if (tint && tintMaterial(material, tint, texturedHair)) count += 1;
    });
  });
  return count;
}

function tintBrows(model: THREE.Object3D, color: THREE.Color): number {
  let count = 0;
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (/brow/i.test(`${child.name} ${material.name}`) && tintMaterial(material, color, true)) count += 1;
    });
  });
  return count;
}

function applyAgeMorphs(model: THREE.Object3D, age: number): string[] {
  const applied = new Set<string>();
  const middleWeight = age <= 0.5 ? age * 2 : (1 - age) * 2;
  const elderWeight = age <= 0.5 ? 0 : (age - 0.5) * 2;
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.morphTargetDictionary || !child.morphTargetInfluences) return;
    for (const [name, weight] of [["Age_Middle", middleWeight], ["Age_Elder", elderWeight]] as const) {
      const index = child.morphTargetDictionary[name];
      if (index === undefined) continue;
      child.morphTargetInfluences[index] = weight;
      applied.add(name);
    }
  });
  return [...applied];
}

export function applyModularAppearance(
  model: THREE.Object3D,
  appearance: ModularAppearance,
): ModularAppearanceResult {
  const resolved = resolveCharacterAppearance({
    ...appearance,
    skinTone: appearance.skinTone ?? "ashen",
  });
  hideAppearanceModules(model);
  model.traverse((child) => {
    if (/SK_PointEar_(?:L|R)/i.test(child.name)) child.visible = appearance.raceId === "elf";
  });

  const missingProviderAssets: string[] = [];
  const hairName = HAIR_MODULE_NAMES[resolved.hairStyle];
  const hairModule = findApprovedModule(model, hairName);
  let hair: ModularAssetApplication = "applied";
  if (hairModule) hairModule.visible = true;
  else if (resolved.hairStyle === "shaved-buzzed") hair = "none";
  else {
    hair = "missing-provider-asset";
    missingProviderAssets.push(hairName);
  }

  const facialHairName = resolved.facialHair === "none"
    ? undefined
    : FACIAL_HAIR_MODULE_NAMES[resolved.facialHair];
  const facialHairModule = facialHairName ? findApprovedModule(model, facialHairName) : undefined;
  let facialHair: ModularAssetApplication = resolved.facialHair === "none" ? "none" : "applied";
  if (facialHairModule) facialHairModule.visible = true;
  else if (facialHairName) {
    facialHair = "missing-provider-asset";
    missingProviderAssets.push(facialHairName);
  }

  const baseHairColor = new THREE.Color(HAIR_COLORS[resolved.hairColor].color);
  const hairColor = baseHairColor.clone().lerp(GREYING_COLOR, resolved.hairGreying);
  const facialHairColor = baseHairColor.clone().lerp(GREYING_COLOR, resolved.facialHairGreying);
  const skinColor = resolvedActorSkinColor(model, new THREE.Color(SKIN_TONES[resolved.skinTone].color));
  let tintedMaterials = tintBrows(model, hairColor);
  if (hairModule) tintedMaterials += tintAppearanceModule(hairModule, hairColor, skinColor);
  if (facialHairModule) tintedMaterials += tintAppearanceModule(facialHairModule, facialHairColor, skinColor);

  const result: ModularAppearanceResult = {
    hair,
    facialHair,
    faceMorphApplied: applyHumanFaceType(model, resolved.faceType),
    ageMorphsApplied: applyAgeMorphs(model, resolved.age),
    tintedMaterials,
    missingProviderAssets,
  };
  model.userData.modularAppearanceResult = result;

  applyScalpVariant(model, resolved.hairStyle);
  setHumanScalpFollicleUndercoat(
    model,
    resolved.hairStyle === "shaved-buzzed" ? undefined : hairModule,
    hairColor,
  );
  return result;
}

export function screenPanToWorld(
  cameraAzimuth: number,
  horizontal: number,
  vertical: number,
): THREE.Vector2 {
  return new THREE.Vector2(
    horizontal * Math.cos(cameraAzimuth) + vertical * Math.sin(cameraAzimuth),
    -horizontal * Math.sin(cameraAzimuth) + vertical * Math.cos(cameraAzimuth),
  );
}

export function cameraPanBounds(
  roomWidth: number,
  roomHeight: number,
  tileSize: number,
  visibleMarginTiles: number,
): THREE.Vector2 {
  const margin = tileSize * visibleMarginTiles;
  return new THREE.Vector2(
    Math.max(0, roomWidth * tileSize * 0.5 - margin),
    Math.max(0, roomHeight * tileSize * 0.5 - margin),
  );
}

export interface CameraFollowState {
  center: THREE.Vector2;
  lookAhead: THREE.Vector2;
  manualOffset: THREE.Vector2;
  manualIdleSeconds: number;
}

export interface CameraFollowFrame {
  player: THREE.Vector2;
  movement: THREE.Vector2;
  cameraAzimuth: number;
  verticalSpan: number;
  aspect: number;
  zoom: number;
  compact: boolean;
  deltaSeconds: number;
  roomCenter: THREE.Vector2;
  roomBounds: THREE.Vector2;
}

export interface CameraFollowResult extends CameraFollowState {
  target: THREE.Vector2;
  deadZone: THREE.Vector2;
}

function dampingAlpha(lambda: number, deltaSeconds: number): number {
  return 1 - Math.exp(-lambda * THREE.MathUtils.clamp(deltaSeconds, 0, 0.1));
}

/** Bounds camera follow by every generated tile in a logical room, including crawl sections outside the authored room rectangle. */
export function cameraTileEnvelope(
  tiles: readonly { x: number; y: number }[],
  tileSize: number,
): { center: THREE.Vector2; bounds: THREE.Vector2 } {
  if (tiles.length === 0) throw new Error("Camera tile envelope requires at least one tile.");
  const xs = tiles.map((tile) => tile.x);
  const ys = tiles.map((tile) => tile.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    center: new THREE.Vector2((minX + maxX) * 0.5 * tileSize, (minY + maxY) * 0.5 * tileSize),
    bounds: new THREE.Vector2((maxX - minX + 1) * 0.5 * tileSize, (maxY - minY + 1) * 0.5 * tileSize),
  };
}

export function cameraFollowStep(
  previous: CameraFollowState,
  frame: CameraFollowFrame,
): CameraFollowResult {
  const center = previous.center.clone();
  const lookAhead = previous.lookAhead.clone();
  const manualOffset = previous.manualOffset.clone();
  const moving = frame.movement.lengthSq() > 1e-8;
  const manualIdleSeconds = moving
    ? previous.manualIdleSeconds
    : previous.manualIdleSeconds + frame.deltaSeconds;
  const halfWidth = (frame.verticalSpan * Math.max(0.1, frame.aspect)) / (2 * Math.max(0.1, frame.zoom));
  const halfGroundDepth = (frame.verticalSpan * 0.82) / (2 * Math.max(0.1, frame.zoom));
  const deadZoneRatio = frame.compact ? 0.12 : 0.18;
  const deadZone = new THREE.Vector2(halfWidth * deadZoneRatio, halfGroundDepth * deadZoneRatio);
  const screenRight = screenPanToWorld(frame.cameraAzimuth, 1, 0).normalize();
  const screenUp = screenPanToWorld(frame.cameraAzimuth, 0, 1).normalize();
  const relative = frame.player.clone().sub(center);
  const screenX = relative.dot(screenRight);
  const screenY = relative.dot(screenUp);
  const overflowX = Math.sign(screenX) * Math.max(0, Math.abs(screenX) - deadZone.x);
  const overflowY = Math.sign(screenY) * Math.max(0, Math.abs(screenY) - deadZone.y);
  const desiredCenter = center.clone()
    .addScaledVector(screenRight, overflowX)
    .addScaledVector(screenUp, overflowY);
  center.lerp(desiredCenter, dampingAlpha(8.5, frame.deltaSeconds));

  const desiredLookAhead = moving
    ? frame.movement.clone().normalize().multiplyScalar(frame.compact ? 0.72 : 0.9)
    : new THREE.Vector2();
  lookAhead.lerp(desiredLookAhead, dampingAlpha(moving ? 5.5 : 3.5, frame.deltaSeconds));

  if (moving || manualIdleSeconds > 1.25) {
    manualOffset.lerp(new THREE.Vector2(), dampingAlpha(moving ? 8 : 2.2, frame.deltaSeconds));
  }

  const roomMin = frame.roomCenter.clone().sub(frame.roomBounds);
  const roomMax = frame.roomCenter.clone().add(frame.roomBounds);
  center.clamp(roomMin, roomMax);
  const target = center.clone().add(lookAhead).add(manualOffset).clamp(roomMin, roomMax);
  return { center, lookAhead, manualOffset, manualIdleSeconds, target, deadZone };
}
