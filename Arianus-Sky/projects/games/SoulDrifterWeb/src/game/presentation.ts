import * as THREE from "three";

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

export function cloneActorMaterial(
  source: THREE.Material,
  tint: number,
  preserveAuthoredPalette: boolean,
  skinTone?: number,
): THREE.Material {
  const material = source.clone();
  if (!(material instanceof THREE.MeshStandardMaterial)) return material;

  if (preserveAuthoredPalette) {
    if (skinTone !== undefined && /skin|face|ear|nose|brow|jaw|head/i.test(`${source.name} ${material.name}`)) {
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

export type HairStyleId = "shaved" | "cropped" | "parted" | "silver-sweep";
export type FacialHairId = "none" | "full-beard";
export type HumanoidRaceId = "human" | "elf" | "dwarf" | "halfling";

export interface ModularAppearance {
  hairStyle: HairStyleId;
  raceId: HumanoidRaceId;
  facialHair?: FacialHairId;
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

function swapScalpMaterial(material: THREE.Material, shaved: boolean, texture: THREE.Texture | null): void {
  if (!(material instanceof THREE.MeshStandardMaterial)) return;
  const map = material.map;
  const isScalpSkin = /human_skin/i.test(material.name ?? "") || /ScalpSilver/i.test(map?.name ?? "");
  const silver = material.userData.silverScalpMap as THREE.Texture | undefined;
  if (!silver && map && isScalpSkin) material.userData.silverScalpMap = map;
  const silverMap = material.userData.silverScalpMap as THREE.Texture | undefined;
  if (!silverMap) return;
  const next = shaved && texture ? texture : silverMap;
  if (material.map !== next) {
    material.map = next;
    material.needsUpdate = true;
  }
}

function applyScalpVariant(model: THREE.Object3D, hairStyle: HairStyleId): void {
  const shaved = hairStyle === "shaved";
  model.userData.scalpShaved = shaved;
  const apply = (texture: THREE.Texture | null): void => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => swapScalpMaterial(material, shaved, texture));
      }
    });
  };
  if (!shaved) {
    apply(scalpSkinTexture);
    return;
  }
  if (scalpSkinTexture) apply(scalpSkinTexture);
  else void loadScalpSkinTexture().then((texture) => {
    // The player may have switched styles while the texture streamed in.
    if (texture && model.userData.scalpShaved === true) apply(texture);
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

export function applyModularAppearance(model: THREE.Object3D, appearance: ModularAppearance): void {
  // Legacy elf model: fixed hair clumps + pointed ears (guarded — absent on the human model).
  const hair = model.children.filter((child) => /SK_SilverHairClump/i.test(child.name));
  if (hair.length === 0) {
    model.traverse((child) => {
      if (/SK_SilverHairClump/i.test(child.name)) hair.push(child);
    });
  }
  hair.forEach((strand, index) => {
    strand.visible = appearance.hairStyle === "silver-sweep"
      || ((appearance.hairStyle === "cropped" || appearance.hairStyle === "parted") && index < 3);
  });
  model.traverse((child) => {
    if (/SK_PointEar_(?:L|R)/i.test(child.name)) child.visible = appearance.raceId === "elf";
  });

  // Human model: real hairstyle meshes, scalp underlay, and facial hair.
  const show = (pattern: RegExp, visible: boolean): void => {
    model.traverse((child) => {
      if (pattern.test(child.name)) child.visible = visible;
    });
  };
  show(/^SK_Hair_Long$/i, appearance.hairStyle === "silver-sweep");
  show(/^SK_HairScalp$/i, appearance.hairStyle === "silver-sweep");
  show(/^SK_Hair_Parted$/i, appearance.hairStyle === "parted");
  show(/^SK_Hair_Buzzed$/i, appearance.hairStyle === "cropped");
  show(/^SK_Beard_Full$/i, appearance.facialHair === "full-beard");

  applyScalpVariant(model, appearance.hairStyle);
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
