import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import {
  SKIN_TONES,
  type CanonicalHairStyleId,
  type FaceTypeId,
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
  raceAvatarShape,
} from "./game/presentation";
import {
  hydrateHumanAppearanceModules,
  inspectHumanAppearanceAvailability,
} from "./game/humanAppearanceAssembly";
import {
  bindOptionalCompatibleAnimationClip,
  normalizeAnimationPackRootMotion,
} from "./game/animationPacks";

const PREVIEW_MODEL_LEGACY_HUMAN = "/assets/3d/characters/human-shadowknight/human-shadowknight.glb";
const PREVIEW_MODEL_ELF = "/assets/3d/characters/elf-shadowknight-v2/elf-shadowknight-v2.glb";
const STARTER_SWORD_PART = /^SK_Starter(?:Long|Short)sword_(?:Blade|Grip|Guard|Pommel)(?:_Mesh)?$/i;
const FOUNDATION_HELPER = /^(?:Camera|Cube|Icosphere|Light)$/i;
export const CREATOR_RELAXED_IDLE_PACK = Object.freeze({
  url: "/assets/3d/animations/human-foundation-pilot/review-packs/human-foundation-pilot-review-male-locomotion-01.glb",
  sourceClipName: "MaleLocomotion__Idle",
});
const CREATOR_IDLE_STABLE_HEAD_BONE = /(?:^|[:|_.])(?:Neck|Head|HeadTop_End)(?:\.|$)/i;
const CREATOR_BODY_FRONT_YAW = -Math.PI / 2;
const CREATOR_FACE_FRONT_YAW = 0;

export type CreationPreviewView = "body" | "face";

export interface CreationPreviewOptions {
  view?: CreationPreviewView;
  autoRotate?: boolean;
}

interface CreationPreviewFraming {
  center: THREE.Vector3;
  boundsSize: THREE.Vector3;
  bodyHeight: number;
  headY: number;
}

export interface CreationPreviewAppearance {
  hairStyle: HairStyleId;
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
  hairStyles: readonly CanonicalHairStyleId[];
  facialHair: readonly FacialHairId[];
  ageMorphsAvailable: boolean;
  dialogueMorphsAvailable: boolean;
}

export const EMPTY_CREATION_PREVIEW_AVAILABILITY: CreationPreviewAvailability = Object.freeze({
  faceTypes: Object.freeze(["foundation"] as FaceTypeId[]),
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
  // In the bind-pose inspection view, camera-up is world -X and screen-right
  // is world +Y. The Y span therefore contains the outstretched T-pose arms.
  const verticalDistance = boundsSize.x / (2 * tanHalfVerticalFov);
  const horizontalDistance = boundsSize.y / (2 * tanHalfVerticalFov * safeAspect);
  // The provider actor is a concave silhouette, so adding the full AABB depth
  // would frame empty corner volume and make the body unreadably small.
  return Math.max(verticalDistance, horizontalDistance) * 1.2;
}

/**
 * The stock locomotion idle contains a repeated neck/head nod that makes face
 * inspection feel like an NPC acknowledgement loop. Keep the authored torso
 * and shoulder breathing, but hold the neck and head at the clip's neutral
 * first frame so the creator portrait remains relaxed and inspectable.
 */
export function stabilizeCreatorRelaxedIdle(clip: THREE.AnimationClip): THREE.AnimationClip {
  const tracks = clip.tracks.map((sourceTrack) => {
    const track = sourceTrack.clone();
    if (!CREATOR_IDLE_STABLE_HEAD_BONE.test(track.name)) return track;

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
  private readonly rotationPivot = new THREE.Group();
  private readonly camera: THREE.PerspectiveCamera;
  private model: THREE.Object3D | undefined;
  private appearance: CreationPreviewAppearance;
  private yaw = CREATOR_BODY_FRONT_YAW;
  private targetYaw = CREATOR_BODY_FRONT_YAW;
  private dragging = false;
  private lastPointerX = 0;
  private lastInteractionAt = performance.now();
  private lastFrameAt = performance.now();
  private frame = 0;
  private disposed = false;
  private previewView: CreationPreviewView;
  private autoRotate: boolean;
  private mixer: THREE.AnimationMixer | null = null;
  private motionRequest = 0;
  private framing: CreationPreviewFraming | null = null;

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
    this.autoRotate = options.autoRotate ?? false;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x000000, 0);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
    this.rotationPivot.rotation.y = this.yaw;
    this.scene.add(this.rotationPivot);

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
        this.onAvailabilityChange?.(inspectCreationPreviewAvailability(model));
        this.applyAppearance();
        this.syncPreviewMotion();
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

  public setView(view: CreationPreviewView): void {
    if (this.previewView === view) return;
    this.previewView = view;
    this.resetFacing();
    this.syncPreviewMotion();
  }

  public setAutoRotate(enabled: boolean): void {
    this.autoRotate = enabled;
    this.lastInteractionAt = performance.now();
  }

  private frontYaw(): number {
    return this.previewView === "face" ? CREATOR_FACE_FRONT_YAW : CREATOR_BODY_FRONT_YAW;
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
    cancelAnimationFrame(this.frame);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.stopPreviewMotion();
    if (this.model) this.rotationPivot.remove(this.model);
    this.renderer.dispose();
  }

  private stopPreviewMotion(resetPose = false): void {
    if (this.mixer && this.model) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.model);
    }
    this.mixer = null;
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
    this.stopPreviewMotion(this.previewView === "body");
    this.updatePreviewFraming();
    if (!model || this.previewView !== "face") return;

    void loadPreviewModel(CREATOR_RELAXED_IDLE_PACK.url)
      .then((gltf) => {
        if (this.disposed || request !== this.motionRequest || this.model !== model || this.previewView !== "face") return;
        const source = gltf.animations.find((clip) => clip.name === CREATOR_RELAXED_IDLE_PACK.sourceClipName);
        if (!source) {
          console.warn(`Creator relaxed-idle clip is unavailable: ${CREATOR_RELAXED_IDLE_PACK.sourceClipName}`);
          return;
        }
        const bound = bindOptionalCompatibleAnimationClip(source, model, "CreatorIdleRelaxed");
        if (!bound) {
          console.warn("Creator relaxed-idle preview is incompatible with the Human foundation rig.");
          return;
        }
        const rootTrack = bound.tracks.find((track) => /(?:armature|hips)[^.]*\.position$/i.test(track.name));
        const rootNodeName = rootTrack?.name.slice(0, rootTrack.name.lastIndexOf("."));
        const rootNode = rootNodeName ? model.getObjectByName(rootNodeName) : undefined;
        const normalized = rootNodeName
          ? normalizeAnimationPackRootMotion(bound, rootNodeName, rootNode?.position, "lock-to-rest")
          : bound;
        const clip = stabilizeCreatorRelaxedIdle(normalized);
        this.mixer = new THREE.AnimationMixer(model);
        this.mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity).play();
      })
      .catch((error) => console.warn("Creator relaxed-idle preview failed to load.", error));
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
      if (!head && /(?:^|[:|_])head$/i.test(node.name)) head = node;
    });
    const headY = head?.getWorldPosition(new THREE.Vector3()).y ?? bounds.min.y + bodyHeight * 0.88;
    this.framing = { center, boundsSize, bodyHeight, headY };
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
    const now = performance.now();
    const deltaSeconds = Math.min(0.05, Math.max(0, (now - this.lastFrameAt) / 1000));
    this.lastFrameAt = now;
    this.mixer?.update(deltaSeconds);
    const width = Math.max(1, Math.round(this.canvas.clientWidth));
    const height = Math.max(1, Math.round(this.canvas.clientHeight));
    if (this.canvas.width !== width || this.canvas.height !== height) this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    if (this.autoRotate && !this.dragging && now - this.lastInteractionAt > 2200) this.targetYaw += 0.0035;
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
      const { center, boundsSize, bodyHeight, headY } = framing;
      if (this.previewView === "face") {
        this.camera.up.set(0, 1, 0);
        const portraitSpan = bodyHeight * 0.32;
        const portraitTargetY = headY - bodyHeight * 0.04;
        const distance = (portraitSpan / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)))) * 1.05;
        this.camera.position.set(center.x, portraitTargetY + portraitSpan * 0.04, center.z + distance);
        this.camera.lookAt(center.x, portraitTargetY, center.z);
      } else {
        // The exact Tripo/Mixamo bind frame is authored ninety degrees off the
        // gameplay up axis. Rolling only the body-inspection camera presents a
        // conventional upright T-pose without mutating the production rig.
        this.camera.up.set(-1, 0, 0);
        const distance = bodyPreviewFitDistance(boundsSize, this.camera.aspect, this.camera.fov);
        this.camera.position.set(center.x, center.y + bodyHeight * 0.06, center.z + distance);
        this.camera.lookAt(center.x, center.y + bodyHeight * 0.02, center.z);
      }
    }
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(() => this.render());
  }
}
