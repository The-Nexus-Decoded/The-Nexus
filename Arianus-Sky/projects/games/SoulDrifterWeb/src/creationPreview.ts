import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import {
  SKIN_TONES,
  type CanonicalHairStyleId,
  type FacialHairId,
  type HairColorId,
  type HairStyleId,
  type SkinToneId,
} from "./game/character";
import { HUMAN_FOUNDATION_MODEL_PATH } from "./game/avatarIdentity";
import {
  applyModularAppearance,
  cloneActorMaterial,
  isActorSkinSurface,
  MODULAR_APPEARANCE_PROVIDER_APPROVED,
  MODULAR_APPEARANCE_PROVIDER_STATUS_KEY,
  raceAvatarShape,
} from "./game/presentation";

const PREVIEW_MODEL_LEGACY_HUMAN = "/assets/3d/characters/human-shadowknight/human-shadowknight.glb";
const PREVIEW_MODEL_ELF = "/assets/3d/characters/elf-shadowknight-v2/elf-shadowknight-v2.glb";
const STARTER_SWORD_PART = /^SK_Starter(?:Long|Short)sword_(?:Blade|Grip|Guard|Pommel)(?:_Mesh)?$/i;
const FOUNDATION_HELPER = /^(?:Camera|Cube|Icosphere|Light)$/i;

export interface CreationPreviewAppearance {
  hairStyle: HairStyleId;
  skinTone: SkinToneId;
  raceId: string;
  facialHair?: FacialHairId;
  hairColor?: HairColorId;
  age?: number;
  hairGreying?: number;
  facialHairGreying?: number;
}

export interface CreationPreviewAvailability {
  hairStyles: readonly CanonicalHairStyleId[];
  facialHair: readonly FacialHairId[];
  ageMorphsAvailable: boolean;
}

export const EMPTY_CREATION_PREVIEW_AVAILABILITY: CreationPreviewAvailability = Object.freeze({
  hairStyles: Object.freeze(["shaved-buzzed"] as CanonicalHairStyleId[]),
  facialHair: Object.freeze(["none"] as FacialHairId[]),
  ageMorphsAvailable: false,
});

const PREVIEW_HAIR_MODULES: Readonly<Record<CanonicalHairStyleId, string>> = {
  "shaved-buzzed": "SK_Hair_Buzzed",
  cropped: "SK_Hair_Cropped",
  parted: "SK_Hair_Parted",
  "curly-coiled": "SK_Hair_CurlyCoiled",
  long: "SK_Hair_Long",
  "tied-back": "SK_Hair_TiedBack",
  braided: "SK_Hair_Braided",
};

const PREVIEW_FACIAL_HAIR_MODULES: Readonly<Record<Exclude<FacialHairId, "none">, string>> = {
  stubble: "SK_FacialHair_Stubble",
  moustache: "SK_FacialHair_Moustache",
  goatee: "SK_FacialHair_Goatee",
  "short-beard": "SK_FacialHair_ShortBeard",
  "full-beard": "SK_FacialHair_FullBeard",
};

function hasApprovedProviderAncestor(module: THREE.Object3D, model: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = module;
  while (current) {
    if (current.userData[MODULAR_APPEARANCE_PROVIDER_STATUS_KEY] === MODULAR_APPEARANCE_PROVIDER_APPROVED) {
      return true;
    }
    if (current === model) return false;
    current = current.parent;
  }
  return false;
}

function hasApprovedModule(model: THREE.Object3D, name: string): boolean {
  let available = false;
  model.traverse((child) => {
    available ||= child.name.toLowerCase() === name.toLowerCase()
      && hasApprovedProviderAncestor(child, model);
  });
  return available;
}

/** Discovers only approved provider modules; rejected legacy meshes never become creator choices. */
export function inspectCreationPreviewAvailability(model: THREE.Object3D): CreationPreviewAvailability {
  const hairStyles = (Object.entries(PREVIEW_HAIR_MODULES) as [CanonicalHairStyleId, string][])
    .filter(([id, name]) => id === "shaved-buzzed" || hasApprovedModule(model, name))
    .map(([id]) => id);
  const facialHair = ["none" as FacialHairId];
  for (const [id, name] of Object.entries(PREVIEW_FACIAL_HAIR_MODULES) as [Exclude<FacialHairId, "none">, string][]) {
    if (hasApprovedModule(model, name)) facialHair.push(id);
  }
  let hasMiddle = false;
  let hasElder = false;
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.morphTargetDictionary) return;
    hasMiddle ||= child.morphTargetDictionary.Age_Middle !== undefined;
    hasElder ||= child.morphTargetDictionary.Age_Elder !== undefined;
  });
  return { hairStyles, facialHair, ageMorphsAvailable: hasMiddle && hasElder };
}

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

function previewModelUrl(raceId: string): string {
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
  private readonly camera: THREE.PerspectiveCamera;
  private model: THREE.Object3D | undefined;
  private appearance: CreationPreviewAppearance;
  private yaw = 0.35;
  private targetYaw = 0.35;
  private dragging = false;
  private lastPointerX = 0;
  private lastInteractionAt = 0;
  private frame = 0;
  private disposed = false;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    appearance: CreationPreviewAppearance,
    private readonly onAvailabilityChange?: (availability: CreationPreviewAvailability) => void,
  ) {
    this.appearance = { ...appearance };
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x000000, 0);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

    this.scene.add(new THREE.HemisphereLight(0xbfd9d4, 0x1c1611, 1.15));
    const key = new THREE.PointLight(0xffd1b7, 32, 24, 2);
    key.position.set(-1.6, 3.1, 2.4);
    const rim = new THREE.PointLight(0x6de6dc, 14, 18, 2);
    rim.position.set(1.9, 2.2, -2.1);
    this.scene.add(key, rim);

    canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);

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
      .then((gltf) => {
        if (this.disposed || this.modelUrl !== url) return;
        if (this.model) this.scene.remove(this.model);
        const model = cloneSkeleton(gltf.scene);
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
        this.scene.add(model);
        this.onAvailabilityChange?.(inspectCreationPreviewAvailability(model));
        this.applyAppearance();
      })
      .catch((error) => {
        this.onAvailabilityChange?.(EMPTY_CREATION_PREVIEW_AVAILABILITY);
        console.warn("Creation avatar preview failed to load.", error);
      });
  }

  public setAppearance(appearance: CreationPreviewAppearance): void {
    const raceChanged = appearance.raceId !== this.appearance.raceId;
    this.appearance = { ...appearance };
    if (raceChanged) this.loadModelForRace(appearance.raceId);
    this.applyAppearance();
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    if (this.model) this.scene.remove(this.model);
    this.renderer.dispose();
  }

  private currentSkinColor(): number {
    return SKIN_TONES[this.appearance.skinTone]?.color ?? SKIN_TONES.ashen.color;
  }

  private applyAppearance(): void {
    if (!this.model) return;
    const skin = new THREE.Color(this.currentSkinColor());
    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          const base = material.userData.authoredColor as THREE.Color | undefined;
          if (material instanceof THREE.MeshStandardMaterial && base
            && isActorSkinSurface(`${child.name} ${material.name}`)) {
            material.color.copy(base).lerp(skin, 0.62);
          }
        });
      }
    });
    applyModularAppearance(this.model, {
      hairStyle: this.appearance.hairStyle,
      raceId: (this.appearance.raceId || "human") as "human" | "elf" | "dwarf" | "halfling",
      facialHair: this.appearance.facialHair ?? "none",
      hairColor: this.appearance.hairColor,
      age: this.appearance.age,
      hairGreying: this.appearance.hairGreying,
      facialHairGreying: this.appearance.facialHairGreying,
    });
    const shape = raceAvatarShape(this.appearance.raceId);
    this.model.scale.set(shape.width, 1, shape.depth);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.dragging = true;
    this.lastPointerX = event.clientX;
    this.canvas.setPointerCapture?.(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
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
    const width = Math.max(1, Math.round(this.canvas.clientWidth));
    const height = Math.max(1, Math.round(this.canvas.clientHeight));
    if (this.canvas.width !== width || this.canvas.height !== height) this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    if (!this.dragging && performance.now() - this.lastInteractionAt > 2200) this.targetYaw += 0.0035;
    this.yaw += (this.targetYaw - this.yaw) * 0.12;
    if (this.model) {
      this.model.rotation.y = this.yaw;
      const bounds = new THREE.Box3().setFromObject(this.model);
      const bodyHeight = Math.max(0.5, bounds.max.y - bounds.min.y);
      const center = bounds.getCenter(new THREE.Vector3());
      const distance = (bodyHeight / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)))) * 1.12;
      this.camera.position.set(center.x, center.y + bodyHeight * 0.06, center.z + distance);
      this.camera.lookAt(center.x, center.y + bodyHeight * 0.02, center.z);
    }
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(() => this.render());
  }
}
