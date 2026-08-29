import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import {
  bindOptionalCompatibleAnimationClip,
  HUMANOID_ACTIVE_ANIMATION_PACKS,
  loadCachedAnimationPack,
  normalizeAnimationPackRootMotion,
  trimAnimationPackClipEnvelope,
  type AnimationPackSpec,
} from "./animationPacks";
import { callingById, SKIN_TONES, type CharacterProfile } from "./character";
import {
  dungeonTileKey,
  generateSoulwellDungeon,
  roomContains,
  type DungeonEnemy,
  type DungeonProp,
  type DungeonRoomKind,
  type DungeonZoneId,
  type GeneratedDungeon,
} from "./dungeon";
import { buildDialogue, type DialogueScene, type NpcDatabase, type NpcStoryOverride } from "./npc";
import { findPath } from "./pathfinding";
import {
  enemyDefeatVisibilityMs,
  planPursuitPath,
  planSoulwellRespawn,
  resolveMeleeTarget,
  shouldAdvanceRealTimeEnemies,
  type SoulwellCheckpoint,
} from "./combatFlow";
import {
  applyDestructibleHit,
  interactionCapability,
  planInteractionRequest,
  portcullisFrame,
  trialGatePresentation,
  type InteractiveKind,
} from "./interactionFlow";
import { storyDatabase } from "./persistence";
import {
  addInventoryItem as storeInventoryItem,
  canMoveToBackpack,
  createStarterBackpackCapacity,
  createStarterInventory,
  equippedUsableWeapon,
  setItemEquipped,
  type BackpackCapacity,
  type InventoryItem,
  type InventoryState,
} from "./equipment";
import { BASIC_ATTACK, basicAttackDamage } from "./combatActions";
import {
  CINDER_GUARD_MOTION,
  ENEMY_MELEE_MOTION,
  RECOVER_MOTION,
  SIPHON_CLEAVE_MOTION,
  UNARMED_KICK_MOTION,
  UNARMED_PUNCH_MOTION,
  WEAPON_STRIKE_MOTION,
  WORLD_INTERACTION_MOTIONS,
  type MotionArchetypeContract,
  type WorldInteractionMotionContract,
} from "./motionArchetypes";
import {
  TRIALS,
  applyStarterImprint,
  callingPerkOptions,
  deterministicTrialRoll,
  hardTrialSkillName,
  raceBoonOptions,
  starterImprintLockReason,
  starterTrialLockReason,
  type StarterImprintSelection,
  type TrialDifficulty,
} from "./tutorialChoices";
import type { CombatStyle, GridPoint, RuntimeState } from "./types";
import { GameUI, type ActionName } from "./ui";
import { buildSoulwellChamber } from "./environment/rooms/SoulwellChamber";
import { createSoulwellMaterialLibrary, type SoulwellMaterialLibrary } from "./environment/MaterialLibrary";
import {
  cameraFollowStep,
  cameraPanBounds,
  cameraTileEnvelope,
  cloneActorMaterial,
  createTerminalDeathClip,
  createStarterLongswordPresentation,
  deathBodyTilt,
  applyModularAppearance,
  raceAvatarShape,
  occlusionSampleHeights,
  resolvePointerHitIntent,
  sanitizeAttackClip,
  setWeaponVisualState,
  screenPanToWorld,
  type CameraFollowState,
  type WeaponPresentation,
  type WeaponVisualState,
} from "./presentation";
import { HUMAN_FOUNDATION_MODEL_PATH, resolvePlayerAvatarManifest } from "./avatarIdentity";
import {
  AvatarMotionController,
  type AvatarMotionDecision,
  type LocomotionPreference,
} from "./avatarMotionController";
import { animationTuningRegistry } from "./animationTuning";
import { lightingTuningRegistry } from "./lightingTuning";
import { markAtlasPoi } from "./atlasSync";
import { HUMAN_FOUNDATION_APPROVED_ANIMATIONS } from "./humanFoundationApprovedAnimations";
import {
  loadPilotAnimationCatalog,
  PilotAnimationCatalogLoader,
} from "./pilotAnimationCatalog";
import { applyPilotSkinPreset, type PilotSkinPresetId } from "./pilotSkinReview";

const TILE_SIZE = 1.75;
const PAPER_DOLL_UP = new THREE.Vector3(0, 1, 0);
const FLOOR_HEIGHT = 0.22;
const SIGNATURE_STABILITY_COST = 12;
const GUARD_STABILITY_COST = 8;
const STABILITY_REGEN_DELAY_MS = 4_500;
const STABILITY_REGEN_INTERVAL_SECONDS = 1.5;
const FALLBACK_WARRIOR_MODEL = "/assets/3d/characters/warrior.gltf";
const FALLBACK_PALADIN_MODEL = "/assets/3d/characters/paladin.gltf";
const PILOT_REVIEW_MODEL = "/assets/3d/characters/human-foundation-pilot/human-foundation-pilot-runtime-4k.glb";
const MAX_RESIDENT_PILOT_REVIEW_ASSETS = 2;
const MAX_RESIDENT_PILOT_BOUND_CLIPS = 2;
const IN_PLACE_ANIMATION_NAMES = new Set([
  "idlerelaxed", "walkbaseline", "runbaseline",
  "swordslash", "siphoncleave", "shoot_onehanded", "punch", "basicthrust",
  "swordslashoutward", "swordslashinward", "runmixamo", "dooropeninward", "dooropenoutward",
  "pickupwaist", "pickupground", "pulllever", "drawsword", "sheathesword",
  "hitreactionmixamo", "deathmixamo", "castprojectile", "castward", "castsummon", "castarea",
  "unarmedpunch", "unarmedkick", "swordcombomixamo", "siphoncleavecandidate", "siphoncleavesource",
  "weaponstrikebaseline", "swordshieldslashcandidate", "weaponstrikecontrolledcandidate", "weaponstrikecontrolledcandidatev2",
  "siphoncleavebaselinecandidate", "siphoncleavebaseline",
]);
const NPC_MODEL_PATHS: Record<string, string> = {
  ilyra: HUMAN_FOUNDATION_MODEL_PATH,
  orren: HUMAN_FOUNDATION_MODEL_PATH,
  brannoc: HUMAN_FOUNDATION_MODEL_PATH,
};
const NPC_APPEARANCES: Readonly<Record<string, CharacterProfile["appearance"]>> = {
  ilyra: { bodyType: "foundation", faceType: "foundation", hairStyle: "parted", skinTone: "light", facialHair: "none" },
  orren: { bodyType: "foundation", faceType: "foundation", hairStyle: "parted", skinTone: "olive", facialHair: "none" },
  brannoc: { bodyType: "foundation", faceType: "foundation", hairStyle: "cropped", skinTone: "deep", facialHair: "full-beard" },
};

interface AnimatedActor {
  id: string;
  root: THREE.Group;
  model: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  clips: Map<string, THREE.AnimationClip>;
  motion: AvatarMotionController;
  currentAction?: THREE.AnimationAction;
  weapon?: WeaponPresentation;
  groundingMeshes: THREE.Mesh[];
  grid: GridPoint;
  label?: THREE.Sprite;
}

interface EnemyRuntime extends AnimatedActor {
  definition: DungeonEnemy;
  hp: number;
  maxHp: number;
  alive: boolean;
  guard: boolean;
  attackCount: number;
  nextActionAt: number;
}

type EnemyAttackPhase = "telegraph" | "contact" | "recovery";

interface EnemyAttackPhaseVisual {
  enemyId: string;
  phase: EnemyAttackPhase;
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  startedAt: number;
}

interface StoryObject {
  id: string;
  grid: GridPoint;
  root: THREE.Object3D;
  kind: InteractiveKind;
  blocksMovement: boolean;
  destructible: boolean;
  questCritical: boolean;
  protectionReason?: string;
  hp: number;
  maxHp: number;
  destroyed: boolean;
}

interface DebugSnapshot {
  seed: number;
  realmPressure: number;
  room: DungeonRoomKind;
  player: GridPoint & { hp: number; stability: number; resource: number };
  combatStyle: CombatStyle;
  combatState: RuntimeState;
  encounter: "none" | "skirmish" | "boss";
  enemies: Array<GridPoint & {
    id: string;
    hp: number;
    alive: boolean;
    visible: boolean;
    targeted: boolean;
    roomId: DungeonRoomKind;
    yaw: number;
    animation: string;
    animationTime: number;
    screen: { x: number; y: number };
  }>;
  npcs: Array<GridPoint & { id: string }>;
  objects: Array<GridPoint & {
    id: string;
    kind: StoryObject["kind"];
    hp: number;
    maxHp: number;
    destroyed: boolean;
    blocksMovement: boolean;
    visible: boolean;
    portcullisY?: number;
  }>;
  rooms: Array<{ id: DungeonRoomKind; center: GridPoint }>;
  revealedRooms: DungeonRoomKind[];
  inventory: Array<{ id: string; name: string; equipped: boolean; slot?: string; durability?: number }>;
  complete: boolean;
  recoveryCharges: number;
  trialDifficulty: TrialDifficulty | null;
  selectedTargetId: string | null;
  enemyAttackPhase: EnemyAttackPhase | null;
  pendingInteractionId: string | null;
  respawnGeneration: number;
  playerYaw: number;
  occlusion: {
    fadedWalls: number;
    fadedLowWalls: number;
    minOpacity: number;
    lowWallMinOpacity: number;
    proofWall: string | null;
    proofWallOpacity: number | null;
  };
  playerAnimation: string;
  playerAnimationTime: number;
  playerAnimationDuration: number;
  playerWeaponState: WeaponVisualState | "none";
  playerWeaponEnchantActive: boolean;
  playerHipSocket?: {
    position: [number, number, number];
    rotation: [number, number, number];
    visible: boolean;
    children: number;
    bounds: { min: [number, number, number]; max: [number, number, number] };
  };
  playerHandSocket?: {
    position: [number, number, number];
    quaternion: [number, number, number, number];
    visible: boolean;
    bounds: { min: [number, number, number]; max: [number, number, number] };
  };
  playerRigProbe: Record<string, {
    position: [number, number, number];
    quaternion: [number, number, number, number];
  } | null>;
  playerBounds: { minY: number; maxY: number; height: number; width: number; depth: number; horizontalSpan: number };
  camera: {
    target: { x: number; z: number };
    followCenter: { x: number; z: number };
    lookAhead: { x: number; z: number };
    manualOffset: { x: number; z: number };
    playerNdc: { x: number; y: number };
  };
  renderer: {
    calls: number;
    triangles: number;
    geometries: number;
    textures: number;
    materials: number;
    viewport: { width: number; height: number; pixelRatio: number };
  };
}

interface DebugBridge {
  snapshot(): DebugSnapshot;
  moveTo(x: number, y: number): Promise<void>;
  interact(id: string): Promise<void>;
  target(id: string): Promise<void>;
  clearTarget(): void;
  action(action: ActionName): Promise<void>;
  setCombatStyle(style: CombatStyle): void;
  activeBlock(): void;
  pose(animation: string, normalizedTime: number): Promise<void>;
  reviewAnimations(): readonly string[];
  reviewAncestry(): string;
  playReview(animation: string, loop: boolean): Promise<number>;
  reviewResidency(): {
    residentAssetIds: readonly string[];
    residentPackIds: readonly string[];
    residentRawClipCount: number;
    residentBoundClipNames: readonly string[];
    pendingAssetIds: readonly string[];
  };
  pauseReview(paused: boolean): void;
  setReviewSkin(preset: PilotSkinPresetId): Promise<{ applied: boolean; materialCount: number; reason?: string }>;
  weapon(state: WeaponVisualState): void;
  weaponSocket(position: [number, number, number], rotation: [number, number, number]): void;
  prepareTrialGate(): void;
  prepareImprint(): void;
  requestInteraction(id: string): Promise<void>;
  confirmInteraction(): Promise<void>;
  prepareCorridor(): Promise<void>;
  prepareOcclusion(): string;
  enemyRound(): Promise<void>;
  enemyPose(id: string, phase: "telegraph" | "contact" | "recovery"): void;
  defeatEnemy(id: string): void;
  gatePose(id: string, progress: number): void;
  defeat(): Promise<void>;
  defeatHold(): void;
  respawn(): Promise<void>;
}

interface DebugCommand {
  type: string;
  x?: number;
  y?: number;
  id?: string;
  action?: ActionName;
  style?: CombatStyle;
  animation?: string;
  normalizedTime?: number;
  weaponState?: WeaponVisualState;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

declare global {
  interface Window {
    __SOULDRIFTER_DEBUG__?: DebugBridge;
  }
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required game element #${id}`);
  return element as T;
}

function samePoint(a: GridPoint, b: GridPoint): boolean {
  return a.x === b.x && a.y === b.y;
}

function manhattan(a: GridPoint, b: GridPoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function gridToWorld(point: GridPoint): THREE.Vector3 {
  return new THREE.Vector3(point.x * TILE_SIZE, 0, point.y * TILE_SIZE);
}

function actorBodyBounds(model: THREE.Object3D): THREE.Box3 {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    // Long weapons can extend below the boots in an idle pose. They belong in
    // the visual bounds, but never in the grounding/height calculation.
    if (/polearm|weapon|sword|staff|bow/i.test(child.name)) return;
    bounds.expandByObject(child, true);
  });
  return bounds.isEmpty() ? new THREE.Box3().setFromObject(model, true) : bounds;
}

function nearestOpenAdjacent(
  from: GridPoint,
  target: GridPoint,
  canEnter: (point: GridPoint) => boolean,
): GridPoint | null {
  const candidates = [
    { x: target.x + 1, y: target.y },
    { x: target.x - 1, y: target.y },
    { x: target.x, y: target.y + 1 },
    { x: target.x, y: target.y - 1 },
  ]
    .filter(canEnter)
    .map((point) => ({ point, path: findPath(from, point, canEnter) }))
    .filter((candidate) => candidate.path.length > 0 || samePoint(candidate.point, from))
    .sort((a, b) => a.path.length - b.path.length);
  return candidates[0]?.point ?? null;
}

export class World3D {
  private readonly ui = new GameUI();
  private readonly calling: ReturnType<typeof callingById>;
  private readonly lighting = lightingTuningRegistry.snapshot();
  private readonly dungeon: GeneratedDungeon;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-16, 16, 12, -12, 0.1, 320);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly paperRenderer: THREE.WebGLRenderer;
  private readonly paperCamera = new THREE.PerspectiveCamera(28, 0.72, 0.1, 80);
  private readonly clock = new THREE.Timer();
  private readonly loader = new GLTFLoader();
  private readonly modelCache = new Map<string, Promise<GLTF>>();
  private readonly animationPackCache = new Map<string, Promise<readonly THREE.AnimationClip[]>>();
  private readonly pilotReviewEnabled = import.meta.env.DEV
    && new URL(window.location.href).searchParams.get("animationReview") === "1";
  private pilotReviewCatalog: PilotAnimationCatalogLoader | null = null;
  private readonly pilotReviewBoundClips = new Map<string, THREE.AnimationClip>();
  private pilotReviewRequest = 0;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly tileMap: Map<string, GeneratedDungeon["tiles"][number]>;
  private readonly floorMeshes: THREE.InstancedMesh[] = [];
  private readonly zoneGroups = new Map<DungeonZoneId, THREE.Group>();
  private readonly fogSeals = new Map<DungeonRoomKind, THREE.Mesh>();
  private readonly occluders: THREE.Mesh[] = [];
  private readonly storyObjects = new Map<string, StoryObject>();
  private readonly npcs = new Map<string, AnimatedActor>();
  private readonly enemies = new Map<string, EnemyRuntime>();
  private readonly environmentAnimators: Array<(elapsed: number, delta: number) => void> = [];
  private readonly environmentDisposers: Array<() => void> = [];
  private readonly revealedRooms = new Set<DungeonRoomKind>();
  private readonly completedEncounters = new Set<"skirmish" | "boss">();
  private readonly inventory: InventoryItem[];
  private readonly backpackCapacity: BackpackCapacity;
  private player!: AnimatedActor;
  private currentRoom: DungeonRoomKind = "training";
  private encounter: "none" | "skirmish" | "boss" = "none";
  private combatStyle: CombatStyle = "real-time";
  private combatState: RuntimeState = "exploration";
  private selectedAction: ActionName | null = null;
  private selectedTargetId: string | null = null;
  private selectedStoryObjectId: string | null = null;
  private pendingInteractionId: string | null = null;
  private playerMoving = false;
  /** Single action lock for combat, world interactions, and equipment transitions. */
  private actionBusy = false;
  private playerGuard = false;
  private reinforcedGuard = false;
  private hp: number;
  private stability: number;
  private resource = 0;
  private realmPressure = 12;
  private recoveryCharges = 2;
  private tutorialStep = 1;
  private signatureReadyAt = 0;
  private basicReadyAt = 0;
  private guardReadyAt = 0;
  private recoverReadyAt = 0;
  private lastStabilitySpendAt = 0;
  private stabilityRegenAccumulator = 0;
  private realTimeTimer = 0;
  private realTimeAttackCursor = 0;
  private unarmedAttackCursor = 0;
  private disposed = false;
  private complete = false;
  private animationFrame = 0;
  private combatSpeed = 1;
  private locomotionPreference: LocomotionPreference = "auto";
  private paperDollVisible = false;
  private paperDollYaw = 0;
  private cameraAzimuth = Math.atan2(-15.5, 19.5);
  private cameraFollow: CameraFollowState = {
    center: new THREE.Vector2(),
    lookAhead: new THREE.Vector2(),
    manualOffset: new THREE.Vector2(),
    manualIdleSeconds: 0,
  };
  private cameraFollowInitialized = false;
  private readonly lastCameraPlayerPosition = new THREE.Vector2();
  private readonly cameraTarget = new THREE.Vector3();
  private movedThisTurn = false;
  private readonly openedObjects = new Set<string>();
  private npcDatabase!: NpcDatabase;
  private hostileMaterials!: SoulwellMaterialLibrary;
  private trialDifficulty: TrialDifficulty | null;
  private trialApplied = false;
  private trialRewardClaimed = false;
  private readonly soulwellCheckpoint: SoulwellCheckpoint;
  private respawnGeneration = 0;
  private debugOcclusionProofWall: { label: string; mesh: THREE.Mesh } | null = null;
  private debugCameraFocus: { first: AnimatedActor; second: AnimatedActor } | null = null;
  private enemyAttackPhaseVisual: EnemyAttackPhaseVisual | null = null;

  public constructor(
    private readonly container: HTMLElement,
    private readonly profile: CharacterProfile,
    private readonly seed: number,
    savedInventory?: InventoryState,
  ) {
    this.calling = callingById(profile.callingId);
    this.inventory = savedInventory?.items.map((item) => ({ ...item })) ?? createStarterInventory(profile.callingId);
    this.backpackCapacity = savedInventory
      ? { ...savedInventory.capacity }
      : createStarterBackpackCapacity();
    this.dungeon = generateSoulwellDungeon(seed);
    this.soulwellCheckpoint = { grid: { ...this.dungeon.playerStart }, room: "training" };
    this.tileMap = new Map(this.dungeon.tiles.map((tile) => [dungeonTileKey(tile), tile]));
    this.trialDifficulty = null;
    this.hp = profile.maxHp;
    this.stability = profile.maxStability;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.lighting.exposure;
    this.renderer.shadowMap.enabled = this.lighting.shadowQuality !== "off";
    this.renderer.shadowMap.type = this.shadowMapType();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.setAttribute("aria-label", "Soulwell dungeon rendered in three dimensions");
    this.renderer.domElement.tabIndex = 0;
    this.camera.layers.enable(1);
    this.paperCamera.layers.set(1);
    this.paperRenderer = new THREE.WebGLRenderer({
      canvas: requiredElement<HTMLCanvasElement>("paper-doll-canvas"),
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.paperRenderer.outputColorSpace = THREE.SRGBColorSpace;
    this.paperRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.paperRenderer.toneMappingExposure = this.lighting.paperDollExposure;
    this.paperRenderer.setClearColor(0x000000, 0);
  }

  public async start(): Promise<void> {
    this.container.replaceChildren(this.renderer.domElement);
    this.scene.background = new THREE.Color(0x05090d);
    this.scene.fog = new THREE.FogExp2(0x071015, this.lighting.fogDensity);
    this.configureLights();
    await this.buildDungeonGeometry();
    this.npcDatabase = await fetch("/data/npcs.json").then((response) => {
      if (!response.ok) throw new Error(`NPC database failed to load (${response.status}).`);
      return response.json() as Promise<NpcDatabase>;
    });
    await this.buildActors();
    this.applyLocalLightingProfile();
    this.bindInput();
    this.bindUI();
    this.revealRoom("training", false);
    // The awakening itself charts the Soul Well on the Lore Atlas map.
    markAtlasPoi("thalenyr", "soulwell", "explored");
    this.resize();
    if (this.pilotReviewEnabled) {
      this.camera.zoom = 2.35;
      this.camera.updateProjectionMatrix();
    }
    this.updateCamera(true, 0);
    this.initializeHud();
    this.installDebugBridge();
    this.animationFrame = requestAnimationFrame(() => this.render());
    window.setTimeout(() => { void this.persistAvatarPreview(); }, 320);
  }

  public destroy(): void {
    this.disposed = true;
    this.pilotReviewRequest += 1;
    if (this.player) {
      this.pilotReviewBoundClips.forEach((clip) => this.player.mixer.uncacheClip(clip));
    }
    this.pilotReviewBoundClips.clear();
    this.pilotReviewCatalog?.clear();
    this.pilotReviewCatalog = null;
    this.clearEnemyAttackPhase();
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener("resize", this.resize);
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("keydown", this.onKeyDown);
    this.environmentDisposers.forEach((dispose) => dispose());
    this.renderer.dispose();
    this.paperRenderer.dispose();
    if (window.__SOULDRIFTER_DEBUG__) delete window.__SOULDRIFTER_DEBUG__;
  }

  private configureLights(): void {
    const hemisphere = new THREE.HemisphereLight(0x9fbeca, 0x17110f, this.lighting.hemisphereIntensity);
    const ambient = new THREE.AmbientLight(0x789092, this.lighting.ambientIntensity);
    hemisphere.layers.enable(1);
    ambient.layers.enable(1);
    this.scene.add(hemisphere);
    this.scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffe4bd, this.lighting.keyIntensity);
    key.position.set(-14, 24, 10);
    key.castShadow = this.lighting.shadowQuality !== "off";
    key.shadow.mapSize.set(this.lighting.shadowMapSize, this.lighting.shadowMapSize);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 110;
    key.shadow.camera.left = -32;
    key.shadow.camera.right = 32;
    key.shadow.camera.top = 32;
    key.shadow.camera.bottom = -32;
    key.shadow.bias = -0.00045;
    key.layers.enable(1);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x47d4c8, this.lighting.rimIntensity);
    rim.position.set(18, 12, -18);
    rim.layers.enable(1);
    this.scene.add(rim);
  }

  private shadowMapType(): THREE.ShadowMapType {
    if (this.lighting.shadowQuality === "basic") return THREE.BasicShadowMap;
    if (this.lighting.shadowQuality === "pcf-soft") return THREE.PCFSoftShadowMap;
    return THREE.PCFShadowMap;
  }

  private applyLocalLightingProfile(): void {
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.PointLight) || object.userData.lightingProfileApplied) return;
      let ancestor: THREE.Object3D | null = object;
      let roomId = "";
      while (ancestor) {
        if (ancestor.name.startsWith("zone-")) {
          roomId = ancestor.name.slice("zone-".length).toLowerCase();
          break;
        }
        ancestor = ancestor.parent;
      }
      const roomMultiplier = this.lighting.roomOverrides[roomId]?.localLightMultiplier ?? 1;
      object.intensity *= this.lighting.localLightMultiplier * roomMultiplier;
      object.castShadow = object.castShadow && this.lighting.shadowQuality !== "off";
      if (object.castShadow) object.shadow.mapSize.set(this.lighting.shadowMapSize, this.lighting.shadowMapSize);
      object.userData.lightingProfileApplied = true;
    });
  }

  private async buildDungeonGeometry(): Promise<void> {
    const zoneIds: DungeonZoneId[] = ["training", "passage-one", "skirmish", "passage-two", "boss"];
    zoneIds.forEach((zoneId) => {
      const group = new THREE.Group();
      group.name = `zone-${zoneId}`;
      group.visible = zoneId === "training";
      this.zoneGroups.set(zoneId, group);
      this.scene.add(group);
    });

    const trainingChamber = await buildSoulwellChamber({
      tiles: this.dungeon.tiles.filter((tile) => tile.zoneId === "training"),
      props: this.dungeon.props.filter((prop) => prop.roomId === "training"),
      seed: this.seed,
      tileSize: TILE_SIZE,
    });
    this.zoneGroups.get("training")!.add(trainingChamber.root);
    this.floorMeshes.push(trainingChamber.floor);
    this.occluders.push(...trainingChamber.occluders);
    trainingChamber.storyObjects.forEach((object) => {
      const capability = this.storyCapability(object.kind, object.id);
      const storyObject: StoryObject = {
        ...object,
        blocksMovement: true,
        destructible: capability.destructible,
        questCritical: capability.questCritical,
        protectionReason: capability.protectionReason,
        hp: capability.maxHp,
        maxHp: capability.maxHp,
        destroyed: false,
      };
      this.storyObjects.set(object.id, storyObject);
      this.createSemanticProxy(storyObject.root, storyObject.root, "interactId", storyObject.id);
      this.addInteractionMarker(storyObject.root, 0x62e6db, false);
    });
    this.environmentAnimators.push(trainingChamber.animate);
    this.environmentDisposers.push(trainingChamber.dispose);
    this.hostileMaterials = await createSoulwellMaterialLibrary(this.seed ^ 0x51a7e);
    this.environmentDisposers.push(() => this.hostileMaterials.dispose());

    for (const zoneId of zoneIds) {
      if (zoneId === "training") continue;
      const tiles = this.dungeon.tiles.filter((tile) => tile.zoneId === zoneId);
      if (tiles.length === 0) continue;
      const floorGeometry = new THREE.BoxGeometry(TILE_SIZE * 0.985, FLOOR_HEIGHT, TILE_SIZE * 0.985, 1, 1, 1);
      const floorMaterial = this.hostileMaterials.flagstone;
      const floors = new THREE.InstancedMesh(floorGeometry, floorMaterial, tiles.length);
      floors.receiveShadow = true;
      floors.userData.tileLookup = tiles.map((tile) => ({ x: tile.x, y: tile.y }));
      const matrix = new THREE.Matrix4();
      tiles.forEach((tile, index) => {
        matrix.makeTranslation(tile.x * TILE_SIZE, -FLOOR_HEIGHT / 2, tile.y * TILE_SIZE);
        floors.setMatrixAt(index, matrix);
        const variation = ((tile.x * 13 + tile.y * 7 + this.seed) % 7) / 70;
        const roomTint = zoneId === "boss" ? new THREE.Color(0x8b716e) : zoneId === "skirmish" ? new THREE.Color(0x789996) : new THREE.Color(0x728b89);
        const color = roomTint.offsetHSL(0, 0, variation - 0.04);
        floors.setColorAt(index, color);
      });
      floors.instanceMatrix.needsUpdate = true;
      floors.instanceColor!.needsUpdate = true;
      this.floorMeshes.push(floors);
      this.zoneGroups.get(zoneId)!.add(floors);
    }

    for (const room of this.dungeon.rooms.filter((candidate) => candidate.id !== "training")) {
      const roomLight = new THREE.PointLight(room.id === "boss" ? 0xe67955 : 0x72ddd4, room.id === "boss" ? 7.5 : 6.2, 22, 1.65);
      roomLight.position.set(room.center.x * TILE_SIZE, 4.8, room.center.y * TILE_SIZE);
      roomLight.castShadow = room.id === "boss";
      roomLight.shadow.mapSize.set(512, 512);
      this.zoneGroups.get(room.id)!.add(roomLight);
    }
    this.dungeon.crawlSections.forEach((section, index) => {
      const light = new THREE.PointLight(index === 2 ? 0x70c7c2 : 0x72ddd4, 5.2, 18, 1.75);
      light.position.set(section.center.x * TILE_SIZE, 4.1, section.center.y * TILE_SIZE);
      this.zoneGroups.get("skirmish")!.add(light);
    });

    this.buildBoundaryWalls();
    this.dungeon.props
      .filter((prop) => prop.roomId !== "training")
      .forEach((prop) => this.buildProp(prop));
    this.addHostileRoomSetDressing();
    this.buildFogSeals();
    this.addDungeonAtmosphere();
  }

  private buildBoundaryWalls(): void {
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    for (const tile of this.dungeon.tiles) {
      if (tile.zoneId === "training") continue;
      for (const direction of directions) {
        const neighbor = { x: tile.x + direction.x, y: tile.y + direction.y };
        if (this.tileMap.has(dungeonTileKey(neighbor))) continue;
        const horizontal = direction.y !== 0;
        const boundaryHeight = tile.zoneId === "passage-one" || tile.zoneId === "passage-two" ? 1.42 : 3.05;
        const geometry = new THREE.BoxGeometry(
          horizontal ? TILE_SIZE * 1.04 : 0.36,
          boundaryHeight,
          horizontal ? 0.36 : TILE_SIZE * 1.04,
        );
        const material = this.hostileMaterials.masonryOccluder.clone();
        material.color.setHex(tile.roomId === "boss" ? 0x9b7772 : tile.zoneId.startsWith("passage") ? 0x748a85 : 0x819a96);
        const wall = new THREE.Mesh(geometry, material);
        wall.position.set(
          (tile.x + direction.x * 0.5) * TILE_SIZE,
          boundaryHeight / 2 - 0.05,
          (tile.y + direction.y * 0.5) * TILE_SIZE,
        );
        wall.castShadow = true;
        wall.receiveShadow = true;
        wall.userData.occluder = true;
        this.occluders.push(wall);
        this.zoneGroups.get(tile.zoneId)!.add(wall);

        if (boundaryHeight > 2 && (tile.x + tile.y) % 4 === 0) {
          const cap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.36, boundaryHeight + 0.32, 8),
            this.hostileMaterials.darkIron,
          );
          cap.position.copy(wall.position);
          cap.castShadow = true;
          this.zoneGroups.get(tile.zoneId)!.add(cap);
        }
      }
    }
  }

  private buildProp(prop: DungeonProp): void {
    const root = new THREE.Group();
    root.position.copy(gridToWorld(prop));
    root.name = prop.id;
    const stone = this.hostileMaterials.masonry;
    const bronze = this.hostileMaterials.bronze;
    const rune = this.hostileMaterials.soulglass;

    if (prop.kind === "soul-well") {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.7, 0.65, 12), stone);
      base.position.y = 0.32;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.16, 8, 24), bronze);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.68;
      const water = new THREE.Mesh(new THREE.CylinderGeometry(1.13, 1.13, 0.06, 24), rune);
      water.position.y = 0.67;
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), rune.clone());
      orb.position.y = 1.55;
      orb.userData.floatBase = 1.55;
      root.userData.animatedOrb = orb;
      root.add(base, rim, water, orb);
      const light = new THREE.PointLight(0x62e6db, 13, 11, 1.7);
      light.position.y = 2.1;
      light.castShadow = true;
      root.add(light);
    } else if (prop.kind === "chest") {
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.68, 0.86), new THREE.MeshStandardMaterial({ color: 0x3c271a, roughness: 0.68 }));
      base.position.y = 0.35;
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.38, 0.92), new THREE.MeshStandardMaterial({ color: 0x6a4324, roughness: 0.55 }));
      lid.name = "coffer-lid";
      lid.position.y = 0.87;
      const bands = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.03, 0.96), bronze);
      bands.position.y = 0.5;
      root.add(base, lid, bands);
    } else if (prop.kind === "pillar") {
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.84, 0.32, 10), stone);
      plinth.position.y = 0.16;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.62, 3.2, 10), stone);
      shaft.position.y = 1.82;
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.08, 6, 16), rune);
      band.rotation.x = Math.PI / 2;
      band.position.y = 1.6;
      const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.52, 0.34, 10), bronze);
      capital.position.y = 3.42;
      root.add(plinth, shaft, band, capital);
    } else if (prop.kind === "rubble") {
      for (let index = 0; index < 7; index += 1) {
        const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + (index % 3) * 0.11, 0), index % 4 === 0 ? bronze : stone);
        chunk.position.set((index % 3 - 1) * 0.38, 0.2, (Math.floor(index / 3) - 0.5) * 0.42);
        chunk.rotation.set(index * 0.4, index * 0.7, 0);
        root.add(chunk);
      }
    } else if (prop.kind === "brazier") {
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 1.2, 8), bronze);
      stand.position.y = 0.6;
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.25, 0.32, 10), stone);
      bowl.position.y = 1.23;
      const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), rune);
      flame.position.y = 1.62;
      flame.userData.flame = true;
      root.add(stand, bowl, flame);
      const light = new THREE.PointLight(prop.roomId === "boss" ? 0xe86d4e : 0x55d8cf, 7.5, 10, 1.7);
      light.position.y = 1.75;
      root.add(light);
    } else if (prop.kind === "crate") {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.92, 1.02), new THREE.MeshStandardMaterial({ color: 0x503521, roughness: 0.82 }));
      body.position.y = 0.48;
      const bandA = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.12, 1.08), bronze);
      bandA.position.y = 0.2;
      const bandB = bandA.clone();
      bandB.position.y = 0.76;
      root.add(body, bandA, bandB);
    } else if (prop.kind === "bench") {
      const wood = new THREE.MeshStandardMaterial({ color: 0x4b3020, roughness: 0.86 });
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.58), wood);
      seat.position.y = 0.72;
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.66, 0.14), wood);
      back.position.set(0, 1.05, 0.24);
      const legA = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.44), bronze);
      legA.position.set(-0.62, 0.36, 0);
      const legB = legA.clone();
      legB.position.x = 0.62;
      root.add(seat, back, legA, legB);
    } else if (prop.kind === "chair") {
      const wood = new THREE.MeshStandardMaterial({ color: 0x553521, roughness: 0.86 });
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.16, 0.75), wood);
      seat.position.y = 0.68;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.82, 0.14), wood);
      back.position.set(0, 1.08, 0.3);
      const legs = [-0.29, 0.29].flatMap((x) => [-0.26, 0.26].map((z) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.68, 0.12), bronze);
        leg.position.set(x, 0.34, z);
        return leg;
      }));
      root.add(seat, back, ...legs);
    } else if (prop.kind === "gate") {
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.38, 3.4, 0.5), bronze);
      const right = left.clone();
      left.position.set(0, 1.7, -1.15);
      right.position.set(0, 1.7, 1.15);
      const arch = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.42, 2.75), bronze);
      arch.name = "trial-door-veil";
      arch.position.set(0, 3.25, 0);
      root.add(left, right, arch);
    } else if (prop.kind === "essence") {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), rune);
      crystal.position.y = 1.25;
      crystal.userData.floatBase = 1.25;
      root.userData.animatedOrb = crystal;
      root.visible = false;
      root.add(crystal);
      const light = new THREE.PointLight(0xbafff4, 11, 9, 1.5);
      light.position.y = 1.4;
      root.add(light);
    }

    root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.userData.interactId = prop.id;
      }
    });
    this.zoneGroups.get(prop.roomId === "training" ? "training" : prop.roomId)!.add(root);
    const capability = this.storyCapability(prop.kind, prop.id);
    const storyObject: StoryObject = {
      id: prop.id,
      grid: { x: prop.x, y: prop.y },
      root,
      kind: prop.kind,
      blocksMovement: prop.blocksMovement,
      destructible: capability.destructible,
      questCritical: capability.questCritical,
      protectionReason: capability.protectionReason,
      hp: capability.maxHp,
      maxHp: capability.maxHp,
      destroyed: false,
    };
    this.storyObjects.set(prop.id, storyObject);
    this.createSemanticProxy(root, root, "interactId", prop.id);
    this.addInteractionMarker(root, capability.destructible ? 0xc58d47 : 0x62e6db, capability.destructible);
  }

  private storyCapability(kind: InteractiveKind, id: string): ReturnType<typeof interactionCapability> {
    if (id === "starter-coffer") {
      return {
        destructible: false,
        questCritical: true,
        maxHp: 0,
        protectionReason: "This quest coffer is anchored to the returning ritual and cannot be damaged.",
      };
    }
    return interactionCapability(kind);
  }

  private createSemanticProxy(
    root: THREE.Object3D,
    visual: THREE.Object3D,
    dataKey: "enemyId" | "interactId",
    id: string,
  ): THREE.Mesh {
    visual.updateMatrixWorld(true);
    const bounds = visual === root ? new THREE.Box3().setFromObject(visual, true) : actorBodyBounds(visual);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const proxy = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.9, size.x), Math.max(1.2, size.y), Math.max(0.9, size.z)),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    );
    proxy.name = `semantic-proxy-${dataKey}-${id}`;
    proxy.userData[dataKey] = id;
    root.updateMatrixWorld(true);
    proxy.position.copy(root.worldToLocal(center));
    root.add(proxy);
    return proxy;
  }

  private addInteractionMarker(root: THREE.Object3D, color: number, destructible: boolean): void {
    const marker = new THREE.Group();
    marker.name = destructible ? "destructible-marker" : "interaction-marker";
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: destructible ? 0.48 : 0.64,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.56, destructible ? 6 : 28), material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.045;
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(destructible ? 0.09 : 0.12, 0), material.clone());
    beacon.position.y = destructible ? 1.2 : 1.75;
    beacon.renderOrder = 92;
    marker.add(ring, beacon);
    root.add(marker);
    const phase = this.environmentAnimators.length * 0.37;
    this.environmentAnimators.push((elapsed) => {
      if (!root.visible) return;
      const highlighted = Boolean(root.userData.interactionHighlighted || root.userData.gateGuidance);
      beacon.position.y = (destructible ? 1.2 : 1.75) + Math.sin(elapsed * 2.1 + phase) * 0.12;
      beacon.rotation.y = elapsed * (destructible ? 0.8 : 1.25);
      marker.scale.setScalar((highlighted ? 1.18 : 0.96) + Math.sin(elapsed * (highlighted ? 4.2 : 2.4) + phase) * (highlighted ? 0.11 : 0.045));
    });
    this.environmentDisposers.push(() => {
      ring.geometry.dispose();
      material.dispose();
      beacon.geometry.dispose();
      (beacon.material as THREE.Material).dispose();
    });
  }

  private buildFogSeals(): void {
    for (const room of this.dungeon.rooms) {
      const seal = new THREE.Mesh(
        new THREE.BoxGeometry(room.width * TILE_SIZE + 2.6, 0.7, room.height * TILE_SIZE + 2.6),
        new THREE.MeshBasicMaterial({ color: 0x020406, transparent: true, opacity: room.id === "training" ? 0 : 0.985 }),
      );
      seal.position.set(room.center.x * TILE_SIZE, 2.45, room.center.y * TILE_SIZE);
      seal.visible = room.id !== "training";
      seal.renderOrder = 70;
      this.scene.add(seal);
      this.fogSeals.set(room.id, seal);
    }
  }

  private addHostileRoomSetDressing(): void {
    for (const room of this.dungeon.rooms.filter((candidate) => candidate.id !== "training")) {
      const root = new THREE.Group();
      root.name = `${room.id}-realm-lock-scar`;
      root.position.set(room.center.x * TILE_SIZE, 0.035, room.center.y * TILE_SIZE);
      const scarColor = room.id === "boss" ? 0xe66b4d : 0x62ded4;
      const scarMaterial = new THREE.MeshBasicMaterial({
        color: scarColor,
        transparent: true,
        opacity: room.id === "boss" ? 0.32 : 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const outer = new THREE.Mesh(new THREE.RingGeometry(2.65, 2.76, 64, 1, 0.24, Math.PI * 1.62), scarMaterial);
      outer.rotation.x = -Math.PI / 2;
      outer.rotation.z = 0.5;
      const innerMaterial = scarMaterial.clone();
      innerMaterial.opacity *= 0.72;
      const inner = new THREE.Mesh(new THREE.RingGeometry(1.46, 1.53, 48, 1, 0, Math.PI * 1.38), innerMaterial);
      inner.rotation.x = -Math.PI / 2;
      inner.rotation.z = -0.72;

      const crackPoints: number[] = [];
      for (let index = 0; index < 10; index += 1) {
        const angle = (index / 10) * Math.PI * 2 + (index % 2) * 0.12;
        const innerRadius = 0.48 + (index % 3) * 0.13;
        const outerRadius = 3.1 + (index % 4) * 0.46;
        crackPoints.push(
          Math.cos(angle) * innerRadius, 0, Math.sin(angle) * innerRadius,
          Math.cos(angle + 0.08) * outerRadius, 0, Math.sin(angle + 0.08) * outerRadius,
        );
      }
      const crackGeometry = new THREE.BufferGeometry();
      crackGeometry.setAttribute("position", new THREE.Float32BufferAttribute(crackPoints, 3));
      const cracks = new THREE.LineSegments(crackGeometry, new THREE.LineBasicMaterial({ color: scarColor, transparent: true, opacity: 0.2 }));

      const shardGeometry = new THREE.OctahedronGeometry(0.16, 0);
      const shards = new THREE.InstancedMesh(shardGeometry, room.id === "boss" ? this.hostileMaterials.bronze : this.hostileMaterials.soulglass, 9);
      for (let index = 0; index < 9; index += 1) {
        const angle = (index / 9) * Math.PI * 2;
        const radius = 3.4 + (index % 3) * 0.55;
        const transform = new THREE.Matrix4().compose(
          new THREE.Vector3(Math.cos(angle) * radius, 0.16 + (index % 2) * 0.08, Math.sin(angle) * radius),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(index * 0.24, angle, index * 0.18)),
          new THREE.Vector3(0.8, 1.1 + (index % 3) * 0.22, 0.8),
        );
        shards.setMatrixAt(index, transform);
      }
      shards.instanceMatrix.needsUpdate = true;
      root.add(outer, inner, cracks, shards);
      this.zoneGroups.get(room.id)!.add(root);
      this.environmentAnimators.push((elapsed, delta) => {
        outer.rotation.z += delta * (room.id === "boss" ? 0.13 : 0.08);
        inner.rotation.z -= delta * 0.11;
        scarMaterial.opacity = (room.id === "boss" ? 0.31 : 0.21) + Math.sin(elapsed * 1.35 + room.center.x) * 0.045;
      });
      this.environmentDisposers.push(() => {
        outer.geometry.dispose();
        inner.geometry.dispose();
        crackGeometry.dispose();
        shardGeometry.dispose();
        scarMaterial.dispose();
        innerMaterial.dispose();
        (cracks.material as THREE.Material).dispose();
      });
    }
  }

  private addDungeonAtmosphere(): void {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    let state = (this.seed ^ 0x6d2b79f5) >>> 0;
    const random = (): number => {
      state = Math.imul(state ^ (state >>> 15), state | 1) >>> 0;
      return state / 4294967296;
    };
    const hostileRooms = this.dungeon.rooms.filter((room) => room.id !== "training");
    for (let index = 0; index < 210; index += 1) {
      const room = hostileRooms[index % hostileRooms.length]!;
      positions.push(
        (room.x + random() * room.width) * TILE_SIZE,
        0.25 + random() * 4.5,
        (room.y + random() * room.height) * TILE_SIZE,
      );
    }
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0x68d8d0, size: 0.045, transparent: true, opacity: 0.36, depthWrite: false }),
    );
    this.scene.add(points);
  }

  private async buildActors(): Promise<void> {
    // Isometric presentation scale is intentionally 12-20% larger than literal
    // architecture scale. Collision remains one logical tile; only the rendered
    // actor is enlarged so face, starter gear, and animation poses survive the camera.
    const raceScale: Record<string, number> = { human: 2.06, elf: 2.16, dwarf: 1.74, halfling: 1.52 };
    const playerAvatar = this.pilotReviewEnabled
      ? { modelPath: PILOT_REVIEW_MODEL, animationPacks: [] }
      : resolvePlayerAvatarManifest(this.profile);
    this.player = await this.createActor(
      "player",
      playerAvatar.modelPath ?? FALLBACK_WARRIOR_MODEL,
      this.dungeon.playerStart,
      this.pilotReviewEnabled ? raceScale.human! : raceScale[this.profile.raceId] ?? 1.7,
      this.calling.signatureColor,
      this.profile.name,
      playerAvatar.animationPacks,
    );
    if (this.pilotReviewEnabled) await this.loadPilotReviewAnimationLibrary(this.player);
    this.scene.add(this.player.root);

    const npcHeights: Record<string, number> = { ilyra: 1.98, orren: 1.94, brannoc: 2.12 };
    const npcNames: Record<string, string> = { ilyra: "Wellkeeper Ilyra", orren: "Breach Scout Orren", brannoc: "Arena Warden Brannoc" };
    await Promise.all(this.dungeon.npcs.map(async (npc) => {
      const actor = await this.createActor(
        npc.id,
        NPC_MODEL_PATHS[npc.id]!,
        npc,
        npcHeights[npc.id]!,
        0xc59b62,
        npcNames[npc.id] ?? npc.id,
        HUMANOID_ACTIVE_ANIMATION_PACKS,
      );
      actor.root.traverse((child) => { child.userData.interactId = npc.id; });
      this.createSemanticProxy(actor.root, actor.model, "interactId", npc.id);
      this.addInteractionMarker(actor.root, 0x62e6db, false);
      this.npcs.set(npc.id, actor);
      const zoneId = this.tileMap.get(dungeonTileKey(npc))?.zoneId ?? "training";
      this.zoneGroups.get(zoneId)!.add(actor.root);
    }));

    await Promise.all(this.dungeon.enemies.map(async (enemy) => {
      const isBoss = enemy.kind === "miniboss";
      const actor = await this.createActor(
        enemy.id,
        isBoss ? FALLBACK_PALADIN_MODEL : "/assets/3d/characters/enemy-breachling.gltf",
        enemy,
        isBoss ? 2.78 : 1.96,
        isBoss ? 0xe45d38 : 0x7849a2,
        enemy.name,
      ) as EnemyRuntime;
      actor.definition = enemy;
      actor.hp = enemy.maxHp;
      actor.maxHp = enemy.maxHp;
      actor.alive = true;
      actor.guard = false;
      actor.attackCount = 0;
      actor.nextActionAt = 0;
      const targetRing = new THREE.Mesh(
        new THREE.RingGeometry(isBoss ? 0.78 : 0.54, isBoss ? 0.94 : 0.68, 48),
        new THREE.MeshBasicMaterial({
          color: isBoss ? 0xff8a5b : 0xf3bd64,
          transparent: true,
          opacity: 0.86,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      targetRing.name = "selected-target-ring";
      targetRing.rotation.x = -Math.PI / 2;
      targetRing.position.y = 0.035;
      targetRing.visible = false;
      targetRing.renderOrder = 8;
      actor.root.userData.targeted = false;
      actor.root.add(targetRing);
      actor.root.traverse((child) => { child.userData.enemyId = enemy.id; });
      this.createSemanticProxy(actor.root, actor.model, "enemyId", enemy.id);
      actor.root.visible = false;
      this.enemies.set(enemy.id, actor);
      this.zoneGroups.get(enemy.roomId)!.add(actor.root);
    }));
  }

  private async createActor(
    id: string,
    path: string,
    grid: GridPoint,
    desiredHeight: number,
    tint: number,
    labelText: string,
    animationPacks: readonly AnimationPackSpec[] = [],
  ): Promise<AnimatedActor> {
    const gltf = await this.loadModel(path);
    const model = cloneSkeleton(gltf.scene);
    const importedHelpers: THREE.Object3D[] = [];
    model.traverse((child) => {
      if (child instanceof THREE.Camera || child instanceof THREE.Light
        || (/^(?:Cube|Icosphere)$/i.test(child.name) && !(child instanceof THREE.SkinnedMesh))) {
        importedHelpers.push(child);
      }
    });
    importedHelpers.forEach((helper) => helper.removeFromParent());
    const appearance = id === "player" && !this.pilotReviewEnabled
      ? this.profile.appearance
      : NPC_APPEARANCES[id];
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const hadMaterialArray = Array.isArray(child.material);
      const materials: THREE.Material[] = hadMaterialArray
        ? [...child.material]
        : [child.material];
      const skinTone = appearance
        ? SKIN_TONES[appearance.skinTone ?? "ashen"].color
        : undefined;
      const customized = materials.map((source: THREE.Material) => (
        cloneActorMaterial(source, tint, appearance !== undefined, skinTone)
      ));
      child.material = hadMaterialArray ? customized : customized[0]!;
    });
    if (appearance) applyModularAppearance(model, {
      hairStyle: appearance.hairStyle ?? "shaved-buzzed",
      raceId: id === "player"
        ? this.profile.raceId as "human" | "elf" | "dwarf" | "halfling"
        : "human",
      facialHair: appearance.facialHair ?? "none",
      hairColor: appearance.hairColor,
      age: appearance.age,
      hairGreying: appearance.hairGreying,
      facialHairGreying: appearance.facialHairGreying,
    });
    model.updateMatrixWorld(true);
    const initialBox = actorBodyBounds(model);
    const sourceHeight = Math.max(0.01, initialBox.max.y - initialBox.min.y);
    const scale = desiredHeight / sourceHeight;
    const raceShape = id === "player" ? raceAvatarShape(this.profile.raceId) : { width: 1, depth: 1 };
    model.scale.set(scale * raceShape.width, scale, scale * raceShape.depth);
    model.updateMatrixWorld(true);
    const scaledBox = actorBodyBounds(model);
    model.position.y -= scaledBox.min.y;
    model.userData.actorBaseQuaternion = model.quaternion.clone();

    const root = new THREE.Group();
    root.name = id;
    root.position.copy(gridToWorld(grid));
    const contact = new THREE.Mesh(
      new THREE.CircleGeometry(desiredHeight * 0.22, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false }),
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.012;
    root.add(contact, model);
    if (id === "player") {
      const focusRing = new THREE.Mesh(
        new THREE.RingGeometry(desiredHeight * 0.23, desiredHeight * 0.27, 40),
        new THREE.MeshBasicMaterial({ color: 0x71e7da, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
      );
      focusRing.rotation.x = -Math.PI / 2;
      focusRing.position.y = 0.018;
      const actorLight = new THREE.PointLight(0xffd1b7, 5.2, 5.5, 2);
      actorLight.position.set(-0.9, desiredHeight + 1.25, 1.3);
      const rimLight = new THREE.PointLight(0x6de6dc, 2.4, 4.2, 2);
      rimLight.position.set(1.1, desiredHeight + 0.8, -1.15);
      root.add(focusRing, actorLight, rimLight);
    }
    const label = this.makeLabel(labelText, id === "player" ? 0x9ff7eb : id.includes("warden") ? 0xff8d70 : 0xf3dfb4);
    label.position.y = desiredHeight + 0.43;
    root.add(label);
    const mixer = new THREE.AnimationMixer(model);
    const clips = new Map(gltf.animations.map((clip) => [
      clip.name,
      IN_PLACE_ANIMATION_NAMES.has(clip.name.toLowerCase()) ? sanitizeAttackClip(clip) : clip,
    ]));
    const externalClips = await Promise.all(animationPacks.map(async (spec) => {
      try {
        return await this.loadExternalAnimationPack(spec, model);
      } catch (error) {
        console.warn(`Optional animation pack ${spec.url} was skipped.`, error);
        return null;
      }
    }));
    externalClips.forEach((externalClip) => {
      if (externalClip) clips.set(externalClip.name, externalClip);
    });
    const deathBaselineSource = [...clips.entries()]
      .find(([name]) => name.toLowerCase() === "deathmixamo")?.[1];
    if (deathBaselineSource) {
      const deathBaseline = createTerminalDeathClip(deathBaselineSource);
      clips.set("DeathBaseline", deathBaseline);
    }
    const groundingMeshes: THREE.Mesh[] = [];
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && /boot|feet|shoe/i.test(child.name)) groundingMeshes.push(child);
    });
    const weapon = id === "player" ? createStarterLongswordPresentation(model) : undefined;
    if (weapon) setWeaponVisualState(weapon, equippedUsableWeapon(this.inventory) ? "sheathed" : "hidden");
    const motion = new AvatarMotionController();
    motion.setWeapon(weapon?.state ?? "hidden");
    const actor: AnimatedActor = {
      id,
      root,
      model,
      mixer,
      clips,
      motion,
      groundingMeshes,
      grid: { x: grid.x, y: grid.y },
      label,
      weapon,
    };
    this.playMotionDecision(actor, motion.idle());
    if (id === "player") model.traverse((child) => child.layers.set(1));
    this.groundActor(actor);
    return actor;
  }

  /** Converts the authored collapse into a readable horizontal corpse. */
  private updateActorDeathPresentation(actor: AnimatedActor): void {
    const baseQuaternion = actor.model.userData.actorBaseQuaternion as THREE.Quaternion | undefined;
    if (!baseQuaternion) return;
    if (actor.motion.current().phase !== "death") {
      if (actor.model.userData.deathPresentationActive) {
        actor.model.quaternion.copy(baseQuaternion);
        actor.model.userData.deathPresentationActive = false;
        actor.model.updateMatrixWorld(true);
      }
      return;
    }
    const action = actor.currentAction;
    const duration = action?.getClip().duration ?? 0;
    const normalized = duration > 0 ? THREE.MathUtils.clamp((action?.time ?? 0) / duration, 0, 1) : 1;
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), deathBodyTilt(normalized));
    actor.model.quaternion.copy(baseQuaternion).multiply(tilt);
    actor.model.userData.deathPresentationActive = true;
    actor.model.updateMatrixWorld(true);
  }

  /** Keeps living boots or the terminal corpse support hull on the dungeon floor. */
  private groundActor(actor: AnimatedActor): void {
    if (!actor.root.visible || !actor.model.visible) return;
    actor.root.updateMatrixWorld(true);
    const bounds = new THREE.Box3();
    const useWholeBody = actor.motion.current().phase === "death";
    if (!useWholeBody && actor.groundingMeshes.length > 0) {
      actor.groundingMeshes.forEach((mesh) => bounds.expandByObject(mesh, true));
    } else {
      bounds.copy(actorBodyBounds(actor.model));
    }
    if (bounds.isEmpty() || !Number.isFinite(bounds.min.y)) return;
    const correction = -bounds.min.y;
    if (Math.abs(correction) < 0.0005) return;
    actor.model.position.y += correction;
    actor.model.updateMatrixWorld(true);
  }

  private loadModel(path: string): Promise<GLTF> {
    const cached = this.modelCache.get(path);
    if (cached) return cached;
    const promise = this.loader.loadAsync(path);
    this.modelCache.set(path, promise);
    return promise;
  }

  private async loadPilotReviewAnimationLibrary(actor: AnimatedActor): Promise<void> {
    const catalog = await loadPilotAnimationCatalog();
    this.pilotReviewCatalog = new PilotAnimationCatalogLoader(
      catalog,
      this.loader,
      MAX_RESIDENT_PILOT_REVIEW_ASSETS,
    );
    const defaultClip = this.pilotReviewCatalog.reviewAnimations()
      .find((name) => name.toLowerCase() === "malelocomotion__idle");
    if (defaultClip) await this.playPilotReviewAnimation(actor, defaultClip, true);
  }

  private async preparePilotReviewClip(actor: AnimatedActor, name: string): Promise<THREE.AnimationClip> {
    const existing = this.pilotReviewBoundClips.get(name);
    if (existing) {
      this.pilotReviewBoundClips.delete(name);
      this.pilotReviewBoundClips.set(name, existing);
      return existing;
    }
    if (!this.pilotReviewCatalog) throw new Error("Issue #487 pilot animation catalog is not initialized.");
    const source = await this.pilotReviewCatalog.loadClip(name);
    const bound = bindOptionalCompatibleAnimationClip(source, actor.model, source.name);
    if (!bound) throw new Error(`Issue #487 pilot clip ${name} is incompatible with the accepted body rig.`);
    const approvedSpec = HUMAN_FOUNDATION_APPROVED_ANIMATIONS.find((spec) => spec.semanticClipName === name);
    const boundRoot = approvedSpec?.rootNodeName ?? bound.tracks
      .map((track) => track.name.slice(0, track.name.lastIndexOf(".")))
      .find((node) => /armature$/i.test(node)) ?? "HumanFoundation_Armature";
    return approvedSpec?.rootPolicy === "authored"
      ? bound
      : normalizeAnimationPackRootMotion(bound, boundRoot);
  }

  private retainPilotReviewBoundClip(actor: AnimatedActor, name: string, clip: THREE.AnimationClip): void {
    this.pilotReviewBoundClips.delete(name);
    this.pilotReviewBoundClips.set(name, clip);
    actor.clips.set(name, clip);
    while (this.pilotReviewBoundClips.size > MAX_RESIDENT_PILOT_BOUND_CLIPS) {
      const oldestName = this.pilotReviewBoundClips.keys().next().value as string | undefined;
      if (!oldestName) break;
      const evicted = this.pilotReviewBoundClips.get(oldestName);
      this.pilotReviewBoundClips.delete(oldestName);
      if (actor.clips.get(oldestName) === evicted) actor.clips.delete(oldestName);
      if (evicted) actor.mixer.uncacheClip(evicted);
    }
  }

  private async activatePilotReviewClip(actor: AnimatedActor, name: string): Promise<THREE.AnimationClip | null> {
    const request = ++this.pilotReviewRequest;
    const clip = await this.preparePilotReviewClip(actor, name);
    if (request !== this.pilotReviewRequest || this.disposed) return null;
    actor.motion.complete();
    this.updateActorDeathPresentation(actor);
    actor.mixer.stopAllAction();
    actor.currentAction = undefined;
    this.retainPilotReviewBoundClip(actor, name, clip);
    return clip;
  }

  private async playPilotReviewAnimation(actor: AnimatedActor, name: string, loop: boolean): Promise<number> {
    const clip = await this.activatePilotReviewClip(actor, name);
    if (!clip) return 0;
    const action = actor.mixer.clipAction(clip);
    action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Number.POSITIVE_INFINITY : 1);
    action.clampWhenFinished = true;
    action.play();
    actor.currentAction = action;
    return clip.duration;
  }

  private async posePilotReviewAnimation(
    actor: AnimatedActor,
    name: string,
    normalizedTime: number,
  ): Promise<void> {
    const clip = await this.activatePilotReviewClip(actor, name);
    if (!clip) return;
    if (name.toLowerCase() === "deathbaseline") actor.motion.beginDeath();
    else actor.motion.complete();
    const action = actor.mixer.clipAction(clip);
    action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    action.paused = false;
    actor.mixer.setTime(clip.duration * THREE.MathUtils.clamp(normalizedTime, 0, 1));
    action.paused = true;
    actor.currentAction = action;
    this.updateActorDeathPresentation(actor);
    actor.model.updateMatrixWorld(true);
    this.groundActor(actor);
  }

  private pilotReviewResidency(): ReturnType<DebugBridge["reviewResidency"]> {
    const raw = this.pilotReviewCatalog?.residency();
    return {
      residentAssetIds: raw?.residentAssetIds ?? [],
      residentPackIds: raw?.residentPackIds ?? [],
      residentRawClipCount: raw?.residentClipCount ?? 0,
      residentBoundClipNames: [...this.pilotReviewBoundClips.keys()],
      pendingAssetIds: raw?.pendingAssetIds ?? [],
    };
  }

  /** Loads raw same-rig clips once, then validates and binds them per cloned actor. */
  private async loadExternalAnimationPack(
    spec: AnimationPackSpec,
    targetModel: THREE.Object3D,
  ): Promise<THREE.AnimationClip | null> {
    const clips = await loadCachedAnimationPack(this.animationPackCache, spec.url, async () => {
      const gltf = await this.loader.loadAsync(spec.url);
      return gltf.animations.map((clip) => clip.clone());
    });
    const source = THREE.AnimationClip.findByName([...clips], spec.sourceClipName);
    if (!source) {
      throw new Error(`Animation pack ${spec.url} does not contain ${spec.sourceClipName}`);
    }
    const bound = bindOptionalCompatibleAnimationClip(source, targetModel, spec.semanticClipName);
    if (!bound) return null;
    // Root-motion normalization must target the node the armature track was
    // actually bound to (it may have been remapped to this model's armature).
    const boundRootNode = bound.tracks
      .map((track) => track.name.slice(0, track.name.lastIndexOf(".")))
      .find((node) => /armature$/i.test(node)) ?? spec.rootNodeName;
    const normalized = spec.rootPolicy === "in-place"
      ? normalizeAnimationPackRootMotion(bound, boundRootNode)
      : bound;
    return trimAnimationPackClipEnvelope(normalized, spec.sourceFrameWindow, spec.sourceFps);
  }

  private makeLabel(text: string, color: number): THREE.Sprite {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 80;
    const context = canvas.getContext("2d")!;
    context.font = "600 34px Rajdhani, sans-serif";
    context.textAlign = "center";
    context.lineWidth = 8;
    context.strokeStyle = "rgba(2,5,7,.92)";
    context.strokeText(text, 256, 50);
    context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
    context.fillText(text, 256, 50);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    sprite.scale.set(3.8, 0.6, 1);
    sprite.renderOrder = 90;
    return sprite;
  }

  private playAnimation(actor: AnimatedActor, name: string, once = false, speedMultiplier = 1, blendSeconds = 0.12): number {
    const clip = actor.clips.get(name) ?? actor.clips.get(name === "RecieveHit" ? "Defeat" : "Idle");
    if (!clip) return 0;
    const action = actor.mixer.clipAction(clip);
    const tuningScope = actor.id === "player"
      ? { clipName: clip.name, raceId: this.profile.raceId, callingId: this.profile.callingId }
      : {
          clipName: clip.name,
          raceId: actor.id.includes("breachling") ? "breachling" : "npc",
          callingId: actor.id.includes("warden") ? "paladin" : "unclassified",
        };
    // Shared playback boundary: base motion intent and combat style are resolved
    // through one versioned document. Future admin/backend changes replace that
    // document; models and Mixamo packs never need to be re-exported for speed.
    const effectiveSpeed = animationTuningRegistry.resolve(this.combatSpeed * speedMultiplier, tuningScope);
    if (actor.currentAction === action && action.isRunning()) return (clip.duration * 1000) / effectiveSpeed;
    actor.currentAction?.fadeOut(blendSeconds);
    action.reset().fadeIn(blendSeconds).setEffectiveTimeScale(effectiveSpeed);
    action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Number.POSITIVE_INFINITY);
    action.clampWhenFinished = once;
    action.play();
    actor.currentAction = action;
    return (clip.duration * 1000) / effectiveSpeed;
  }

  private playFirstAvailableAnimation(actor: AnimatedActor, names: readonly string[], once = false, speedMultiplier = 1, blendSeconds = 0.12): number {
    const match = names
      .map((candidate) => [...actor.clips.keys()].find((name) => name.toLowerCase() === candidate.toLowerCase()))
      .find((name): name is string => Boolean(name));
    return this.playAnimation(actor, match ?? "Idle", once, speedMultiplier, blendSeconds);
  }

  private playMotionDecision(actor: AnimatedActor, decision: AvatarMotionDecision): number {
    if (actor.weapon && actor.weapon.state !== decision.weapon) {
      setWeaponVisualState(actor.weapon, decision.weapon);
    }
    return this.playFirstAvailableAnimation(
      actor,
      decision.clipNames,
      decision.once,
      decision.playbackRate,
      decision.blendSeconds,
    );
  }

  private playActorIdle(actor: AnimatedActor): number {
    return this.playMotionDecision(actor, actor.motion.complete());
  }

  private playActorHit(actor: AnimatedActor): number {
    return this.playMotionDecision(actor, actor.motion.beginHit());
  }

  private playActorDeath(actor: AnimatedActor): number {
    return this.playMotionDecision(actor, actor.motion.beginDeath());
  }

  private playGenericActorAction(actor: AnimatedActor, clipNames: readonly string[], playbackRate = 1, blendSeconds = 0.1): number {
    return this.playMotionDecision(actor, actor.motion.beginGenericAction(clipNames, playbackRate, blendSeconds));
  }

  private hasAnimation(actor: AnimatedActor, names: readonly string[]): boolean {
    const available = new Set([...actor.clips.keys()].map((name) => name.toLowerCase()));
    return names.some((name) => available.has(name.toLowerCase()));
  }

  private playMotionArchetype(actor: AnimatedActor, contract: MotionArchetypeContract): { durationMs: number; eventMs: number } {
    const durationMs = this.playMotionDecision(actor, actor.motion.beginAction(contract));
    return { durationMs, eventMs: durationMs * contract.timing.event.at };
  }

  private poseActorForDebug(actor: AnimatedActor, clipNames: readonly string[], normalizedTime: number): void {
    const clipName = [...actor.clips.keys()].find((name) => clipNames.some((candidate) => candidate.toLowerCase() === name.toLowerCase()));
    if (!clipName) throw new Error(`Unknown debug animation for ${actor.id}: ${clipNames.join(", ")}`);
    const clip = actor.clips.get(clipName)!;
    actor.mixer.stopAllAction();
    const action = actor.mixer.clipAction(clip);
    action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    action.paused = false;
    actor.mixer.setTime(clip.duration * THREE.MathUtils.clamp(normalizedTime, 0, 1));
    action.paused = true;
    actor.currentAction = action;
  }

  private setWeaponState(actor: AnimatedActor, state: WeaponVisualState): void {
    if (actor.weapon) setWeaponVisualState(actor.weapon, state);
    actor.motion.setWeapon(state);
  }

  private async transitionWeapon(actor: AnimatedActor, target: "drawn" | "sheathed"): Promise<void> {
    const weapon = actor.weapon;
    if (!weapon || weapon.state === target) return;
    if (weapon.state === "hidden") {
      this.setWeaponState(actor, target);
      return;
    }

    const clipNames = target === "drawn" ? ["DrawSword"] : ["SheatheSword"];
    if (!this.hasAnimation(actor, clipNames)) {
      this.setWeaponState(actor, target);
      return;
    }
    const durationMs = this.playGenericActorAction(actor, clipNames, target === "drawn" ? 1.2 : 1.65, 0.08);
    const transferAt = target === "drawn" ? 0.58 : 0.64;
    await this.delay(durationMs * transferAt);
    this.setWeaponState(actor, target);
    await this.delay(Math.max(0, durationMs * (1 - transferAt)));
  }

  private async ensurePlayerWeaponDrawn(): Promise<boolean> {
    const equipped = equippedUsableWeapon(this.inventory);
    if (!equipped) {
      this.ui.setMessage("Equip a usable main-hand weapon in the paper doll before using this skill.");
      return false;
    }
    const weapon = this.player.weapon;
    if (!weapon) return false;
    if (weapon.state === "hidden") {
      this.setWeaponState(this.player, "sheathed");
    }
    await this.transitionWeapon(this.player, "drawn");
    return weapon.state === "drawn";
  }

  private async ensurePlayerWeaponSheathed(): Promise<void> {
    const weapon = this.player.weapon;
    if (!weapon || weapon.state === "hidden" || weapon.state === "sheathed") return;
    await this.transitionWeapon(this.player, "sheathed");
  }

  private hasUsableWeapon(): boolean {
    return Boolean(equippedUsableWeapon(this.inventory));
  }

  private basicAttackMotion(armed: boolean): MotionArchetypeContract {
    if (armed) return WEAPON_STRIKE_MOTION;
    const motion = this.unarmedAttackCursor % 2 === 0 ? UNARMED_PUNCH_MOTION : UNARMED_KICK_MOTION;
    this.unarmedAttackCursor += 1;
    return motion;
  }

  private async runPlayerAction(action: () => Promise<void>): Promise<void> {
    if (this.actionBusy || this.playerMoving || this.combatState === "defeat" || this.complete) return;
    this.actionBusy = true;
    try {
      await action();
    } finally {
      this.actionBusy = false;
    }
  }

  private async playWorldInteraction(
    contract: WorldInteractionMotionContract,
    onEvent: () => void | Promise<void>,
    redraw = false,
  ): Promise<void> {
    const beganDrawn = this.player.weapon?.state === "drawn";
    if (beganDrawn) await this.transitionWeapon(this.player, "sheathed");

    // Doors, pickups, and levers bend the torso far enough that a hip-sheathed
    // blade sweeps through the legs. Hide the visual for the interaction only;
    // the motion controller keeps the true equipped state for the recovery.
    const hideForInteraction = Boolean(this.player.weapon && this.player.weapon.state === "sheathed");
    if (this.player.weapon && hideForInteraction) setWeaponVisualState(this.player.weapon, "hidden");

    const hasClip = this.hasAnimation(this.player, contract.clipNames);
    this.player.motion.beginInteraction(contract.clipNames);
    const durationMs = hasClip
      ? this.playFirstAvailableAnimation(this.player, contract.clipNames, true, contract.playbackRate, 0.1)
      : 0;
    const eventMs = durationMs * contract.eventAt;
    if (eventMs > 0) await this.delay(eventMs);
    await onEvent();
    if (durationMs > eventMs) await this.delay(durationMs - eventMs);

    if (this.player.weapon && hideForInteraction) setWeaponVisualState(this.player.weapon, "sheathed");
    if (beganDrawn && redraw) await this.transitionWeapon(this.player, "drawn");
    else this.playActorIdle(this.player);
  }

  private bindInput(): void {
    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.adjustCameraZoom(-Math.sign(event.deltaY) * 0.16);
    }, { passive: false });
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.onKeyDown);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null;
    if (target?.matches("input, textarea, select, button") || this.ui.isDialogueOpen()) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key === "1") void this.handleAction("basic");
    else if (key === "2") void this.handleAction("signature");
    else if (key === "3") void this.handleAction("guard");
    else if (key === "4") void this.handleAction("wait");
    else if (key === "f" && this.pendingInteractionId) void this.confirmPendingInteraction();
    else if (key === "x") void this.togglePlayerWeapon();
    else if (key === "q") this.rotateCamera(-Math.PI / 8);
    else if (key === "e") this.rotateCamera(Math.PI / 8);
    else {
      const direction = ({
        w: { x: 0, y: -1 }, ArrowUp: { x: 0, y: -1 },
        s: { x: 0, y: 1 }, ArrowDown: { x: 0, y: 1 },
        a: { x: -1, y: 0 }, ArrowLeft: { x: -1, y: 0 },
        d: { x: 1, y: 0 }, ArrowRight: { x: 1, y: 0 },
      } as Record<string, GridPoint>)[key];
      if (!direction) return;
      event.preventDefault();
      if (this.encounter !== "none" && this.combatStyle === "turn-based") this.selectedAction = "move";
      void this.handleGroundClick({ x: this.player.grid.x + direction.x, y: this.player.grid.y + direction.y });
    }
  };

  private async togglePlayerWeapon(): Promise<void> {
    await this.runPlayerAction(async () => {
      const weapon = this.player.weapon;
      const equipped = equippedUsableWeapon(this.inventory);
      if (!weapon || !equipped) {
        this.ui.setMessage("No usable main-hand weapon is equipped. Open the paper doll and equip one; basic attacks use the unarmed fallback meanwhile.");
        return;
      }
      const target = weapon.state === "drawn" ? "sheathed" : "drawn";
      await this.transitionWeapon(this.player, target);
      this.playActorIdle(this.player);
      this.ui.setMessage(target === "drawn"
        ? "Weapon drawn. It remains ready until you sheath it or begin a hands-free interaction."
        : "Weapon sheathed.");
    });
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.playerMoving || this.actionBusy || this.ui.isDialogueOpen()) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    const intent = resolvePointerHitIntent(hits.map((hit) => ({
      enemyId: this.findUserData<string>(hit.object, "enemyId"),
      interactId: this.findUserData<string>(hit.object, "interactId"),
      tile: hit.object instanceof THREE.InstancedMesh && typeof hit.instanceId === "number"
        ? hit.object.userData.tileLookup?.[hit.instanceId] as GridPoint | undefined
        : undefined,
    })));
    if (intent?.kind === "enemy") {
      void this.targetEnemy(intent.id);
      return;
    }
    if (intent?.kind === "interact") {
      void this.requestInteractionById(intent.id);
      return;
    }
    if (intent?.kind === "ground") {
      void this.handleGroundClick(intent.tile);
      return;
    }
    // Some decorative meshes sit a few millimetres above the instanced floor.
    // If they consume the first ray hit, resolve the same pointer ray against the
    // logical ground plane so a visibly open tile always remains clickable.
    const groundHit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.groundPlane, groundHit)) {
      const tile = { x: Math.round(groundHit.x / TILE_SIZE), y: Math.round(groundHit.z / TILE_SIZE) };
      if (this.tileMap.has(dungeonTileKey(tile))) void this.handleGroundClick(tile);
    }
  };

  private findUserData<T>(object: THREE.Object3D, key: string): T | undefined {
    let cursor: THREE.Object3D | null = object;
    while (cursor) {
      if (cursor.userData[key] !== undefined) return cursor.userData[key] as T;
      cursor = cursor.parent;
    }
    return undefined;
  }

  private bindUI(): void {
    this.ui.onAction((action) => { void this.handleAction(action); });
    this.ui.onEquipmentToggle((itemId) => {
      void this.runPlayerAction(() => this.toggleInventoryEquipment(itemId));
    });
    this.ui.onEquipmentVisibilityChange((visible) => {
      this.paperDollVisible = visible;
      if (visible && !this.actionBusy && !this.playerMoving) this.playActorIdle(this.player);
      if (visible) this.renderPaperDoll();
    });
    document.getElementById("paper-rotate-left")?.addEventListener("click", () => this.rotatePaperDoll(Math.PI / 4));
    document.getElementById("paper-rotate-right")?.addEventListener("click", () => this.rotatePaperDoll(-Math.PI / 4));
    this.ui.onLocomotionPreferenceChange((preference) => {
      this.locomotionPreference = preference;
    });
    this.ui.onInteractionConfirm(() => { void this.confirmPendingInteraction(); });
    this.ui.onSpeedChange((speed) => {
      this.combatSpeed = speed;
      this.ui.setMessage(`Animation and tactical resolution speed set to ${speed}×.`);
    });
    this.ui.onCombatStyleChange((style) => this.setCombatStylePreference(style));
    document.querySelectorAll<HTMLButtonElement>("[data-camera-control]").forEach((button) => {
      button.addEventListener("click", () => {
        const control = button.dataset.cameraControl;
        if (control === "rotate-left") this.rotateCamera(-Math.PI / 8);
        else if (control === "rotate-right") this.rotateCamera(Math.PI / 8);
        else if (control === "zoom-in") this.adjustCameraZoom(0.28);
        else if (control === "zoom-out") this.adjustCameraZoom(-0.28);
        else if (control === "pan-left") this.panCamera(-1, 0);
        else if (control === "pan-right") this.panCamera(1, 0);
        else if (control === "pan-up") this.panCamera(0, 1);
        else if (control === "pan-down") this.panCamera(0, -1);
        else if (control === "pan-reset") this.resetCameraPan();
      });
    });
  }

  private refreshEquipmentUi(): void {
    this.ui.setInventory(this.inventory, this.backpackCapacity);
    this.ui.setWeaponAvailability(equippedUsableWeapon(this.inventory)?.name ?? null);
    void storyDatabase.saveInventory({ items: this.inventory, capacity: this.backpackCapacity });
  }

  private addInventoryItem(item: Omit<InventoryItem, "equipped">): boolean {
    const result = storeInventoryItem(this.inventory, item, this.backpackCapacity);
    if (!result.added && result.reason === "full") {
      this.ui.setMessage(`Backpack full (${this.backpackCapacity.baseSlots + this.backpackCapacity.earnedSlots + this.backpackCapacity.entitlementSlots} slots). Unequip nothing else until a slot is freed or capacity is expanded.`);
      this.ui.addLog(`${item.name} could not be collected · backpack full.`);
    }
    return result.added;
  }

  private async toggleInventoryEquipment(itemId: string): Promise<void> {
    const item = this.inventory.find((candidate) => candidate.id === itemId);
    if (!item?.slot) return;
    if (this.encounter !== "none") {
      this.ui.setMessage("Equipment cannot be changed while hostile combat is active.");
      return;
    }
    const equipping = !item.equipped;
    if (!equipping && !canMoveToBackpack(this.inventory, this.backpackCapacity)) {
      this.ui.setMessage("The 30-slot backpack is full. Free a slot before unequipping this item.");
      return;
    }
    if (!equipping && item.slot === "mainHand" && this.player.weapon?.state === "drawn") {
      await this.transitionWeapon(this.player, "sheathed");
    }
    setItemEquipped(this.inventory, itemId, equipping);
    if (item.slot === "mainHand") {
      this.setWeaponState(this.player, equipping ? "sheathed" : "hidden");
    }
    this.refreshEquipmentUi();
    this.ui.setMessage(equipping
      ? `${item.name} equipped in ${item.slot === "mainHand" ? "the main hand" : item.slot}.`
      : `${item.name} moved to the backpack. Weapon-required skills update immediately.`);
    this.ui.addLog(`${item.name} ${equipping ? "equipped" : "unequipped"}.`);
    this.playActorIdle(this.player);
    window.setTimeout(() => { void this.persistAvatarPreview(); }, 120);
  }

  private setCombatStylePreference(style: CombatStyle): void {
    if (this.encounter !== "none") return;
    this.combatStyle = style;
    this.ui.setSelectedCombatStyle(style);
    this.ui.setMessage(style === "real-time"
      ? "Real-time combat selected. Enemies will advance and attack continuously."
      : "Tactical combat selected. Enemies act after each completed turn.");
  }

  private rotatePaperDoll(delta: number): void {
    this.paperDollYaw = (this.paperDollYaw + delta) % (Math.PI * 2);
    if (this.paperDollVisible) this.renderPaperDoll();
  }

  private rotateCamera(delta: number): void {
    this.cameraAzimuth += delta;
    this.ui.setMessage("Camera rotated. Use Q / E or the corner controls; the mouse wheel and + / − controls zoom.");
  }

  private adjustCameraZoom(delta: number): void {
    this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom + delta, 0.55, 3);
    this.camera.updateProjectionMatrix();
  }

  private panCamera(horizontal: number, vertical: number): void {
    const room = this.dungeon.rooms.find((candidate) => candidate.id === this.currentRoom)!;
    const delta = screenPanToWorld(this.cameraAzimuth, horizontal * TILE_SIZE * 1.6, vertical * TILE_SIZE * 1.6);
    const bounds = cameraPanBounds(room.width, room.height, TILE_SIZE, 2);
    this.cameraFollow.manualOffset.add(delta).clamp(bounds.clone().multiplyScalar(-1), bounds);
    this.cameraFollow.manualIdleSeconds = 0;
    this.ui.setMessage("Camera panned. Use the arrow controls to inspect the room, or center the view on the player.");
  }

  private resetCameraPan(): void {
    this.cameraFollow.manualOffset.set(0, 0);
    this.cameraFollow.manualIdleSeconds = 0;
    this.ui.setMessage("Camera centered on the player.");
  }

  private initializeHud(): void {
    this.ui.setCharacter(this.profile);
    this.ui.setRunSeed(this.seed);
    this.ui.setZone("The Realm-Lock Vestibule", "Soulwell depth I · Character and combat tutorial");
    this.ui.revealRoute("training", "Realm-Lock Vestibule");
    this.ui.setStats({ hp: this.hp, stability: this.stability, fury: this.resource });
    this.ui.setRealmPressure(this.realmPressure);
    this.ui.setRecoveryCharges(this.recoveryCharges);
    this.refreshEquipmentUi();
    this.ui.setMode("exploration");
    this.ui.setSelectedCombatStyle("real-time");
    this.ui.showCombatControls(true);
    (['move', 'basic', 'signature', 'guard', 'wait'] as ActionName[]).forEach((action) => this.ui.setActionEnabled(action, true));
    const objective = !this.profile.onboarding?.storybookCompleted
      ? "Find Wellkeeper Ilyra and complete the Chronicle of Returning."
      : !this.profile.starterImprint
        ? "Use the Memory Loom to choose your starter traits and three final stat points."
        : !this.openedObjects.has("starter-coffer")
          ? "Inspect your equipped starter gear, then recover supplies from the Wayfarer's Coffer."
          : "Rehearse an action and inspect the two trial gates.";
    this.ui.setObjective(objective);
    this.ui.setTutorial(1, 9, "Awaken inside the broken lock", "Move through the damaged machine-temple and speak with Ilyra. Her illustrated chronicle must reveal why you returned before the Memory Loom will shape your starter strengths.");
    this.ui.addLog(`Soulwell dungeon generated · Run ${this.seed.toString(16).toUpperCase().padStart(8, "0")}.`);
    this.ui.addLog(this.dungeon.modifier);
  }

  private async handleGroundClick(destination: GridPoint): Promise<void> {
    if (this.combatState === "defeat" || this.complete) return;
    if (this.encounter !== "none" && this.combatStyle === "turn-based") {
      if (this.combatState !== "orders") return;
      if (this.selectedAction !== "move") {
        this.ui.setMessage("Choose Move, then select a reachable floor tile.");
        return;
      }
      if (this.movedThisTurn) {
        this.ui.setMessage("You have already repositioned this turn. Use a skill, guard, or recover.");
        return;
      }
      await this.movePlayer(destination, this.profile.movement);
      this.movedThisTurn = true;
      this.selectedAction = null;
      this.ui.setActionEnabled("move", false);
      return;
    }
    await this.movePlayer(destination);
  }

  private async movePlayer(destination: GridPoint, maxSteps = Number.POSITIVE_INFINITY): Promise<void> {
    const path = findPath(this.player.grid, destination, (point) => this.isWalkable(point, "player"));
    if (path.length === 0) {
      if (!samePoint(this.player.grid, destination)) this.ui.setMessage("Stone, rubble, or another creature blocks that route.");
      return;
    }
    const limited = path.slice(0, maxSteps);
    this.playerMoving = true;
    let stepCount = 0;
    try {
      stepCount = await this.walkActor(this.player, limited, 285 / this.combatSpeed);
    } finally {
      this.playerMoving = false;
    }
    if (this.tutorialStep === 1) {
      this.tutorialStep = 2;
      this.ui.setTutorial(2, 9, "Ask why you returned", "Speak with Wellkeeper Ilyra. Her account changes with your ancestry and calling.");
      void storyDatabase.reachCheckpoint("grounded-movement-learned", "tutorial-3d");
    } else if (this.encounter !== "none" && this.combatStyle === "turn-based") {
      this.ui.setMessage(`Repositioned ${stepCount} tile${stepCount === 1 ? "" : "s"}. Choose a skill, guard, or recovery action.`);
    } else {
      this.ui.setMessage(`Moved ${stepCount} tile${stepCount === 1 ? "" : "s"}. Click another floor tile or use WASD / arrow keys.`);
    }
    await this.checkRoomTransition();
    this.updateNearbyInteractionPrompt();
  }

  private async walkActor(actor: AnimatedActor, path: GridPoint[], durationPerStep: number): Promise<number> {
    if (path.length === 0) return 0;
    const preference = actor.id === "player" ? this.locomotionPreference : "auto";
    this.playMotionDecision(actor, actor.motion.beginLocomotion(path.length, preference));
    let moved = 0;
    for (const step of path) {
      if (actor.id === "player" && this.combatState === "defeat") break;
      if (!this.isWalkable(step, actor.id)) break;
      const start = actor.root.position.clone();
      const end = gridToWorld(step);
      actor.root.rotation.y = Math.atan2(end.x - start.x, end.z - start.z);
      await this.tween(durationPerStep, (progress) => actor.root.position.lerpVectors(start, end, progress));
      actor.root.position.y = 0;
      actor.grid = { x: step.x, y: step.y };
      moved += 1;
    }
    this.playActorIdle(actor);
    return moved;
  }

  private async checkRoomTransition(): Promise<void> {
    const tile = this.tileMap.get(dungeonTileKey(this.player.grid));
    if (!tile) return;
    const nextRoom = tile.roomId;
    if (nextRoom !== this.currentRoom) {
      this.currentRoom = nextRoom;
      this.cameraFollow.manualOffset.set(0, 0);
      this.cameraFollow.lookAhead.set(0, 0);
      this.cameraFollowInitialized = false;
      this.revealRoom(nextRoom, true);
    }
    const authoredRoom = this.dungeon.rooms.find((room) => room.id === nextRoom);
    const crossedEncounterThreshold = authoredRoom ? roomContains(authoredRoom, this.player.grid) : false;
    if (nextRoom === "skirmish" && crossedEncounterThreshold && !this.completedEncounters.has("skirmish") && this.encounter === "none") {
      await this.startEncounter("skirmish");
    } else if (nextRoom === "boss" && crossedEncounterThreshold && !this.completedEncounters.has("boss") && this.encounter === "none") {
      await this.startEncounter("boss");
    }
  }

  private revealRoom(roomId: DungeonRoomKind, announce: boolean): void {
    this.revealedRooms.add(roomId);
    const trial = TRIALS[this.trialDifficulty ?? "wayfarer"];
    this.realmPressure = roomId === "training"
      ? 12
      : roomId === "skirmish"
        ? trial.skirmishPressure + (this.seed % 4)
        : trial.bossPressure + (this.seed % 4);
    this.ui.setRealmPressure(this.realmPressure);
    if (roomId === "training") this.zoneGroups.get("training")!.visible = true;
    if (roomId === "skirmish") {
      this.zoneGroups.get("passage-one")!.visible = true;
      this.zoneGroups.get("skirmish")!.visible = true;
    }
    if (roomId === "boss") {
      this.zoneGroups.get("passage-two")!.visible = true;
      this.zoneGroups.get("boss")!.visible = true;
    }
    const seal = this.fogSeals.get(roomId);
    if (seal) {
      seal.visible = true;
      void this.tween(720, (progress) => {
        const material = seal.material as THREE.MeshBasicMaterial;
        material.opacity = 0.985 * (1 - progress);
      }).then(() => { seal.visible = false; });
    }
    const room = this.dungeon.rooms.find((candidate) => candidate.id === roomId)!;
    const kicker = roomId === "training" ? "Soulwell depth I · Safe chamber" : roomId === "skirmish" ? "Soulwell depth II · Hostile" : "Soulwell depth III · Miniboss";
    this.ui.setZone(room.name, kicker);
    this.ui.revealRoute(roomId, room.name);
    if (announce) {
      this.ui.addLog(`Fog recedes: ${room.name}.`);
      this.ui.setMessage(`${room.name} resolves out of the Soulwell fog.`);
    }
  }

  private interactionRoot(id: string): THREE.Object3D | null {
    return this.npcs.get(id)?.root ?? this.storyObjects.get(id)?.root ?? null;
  }

  private interactionGrid(id: string): GridPoint | null {
    return this.npcs.get(id)?.grid ?? this.storyObjects.get(id)?.grid ?? null;
  }

  private interactionPromptFor(id: string): { label: string; detail: string } {
    const npc = this.npcs.get(id);
    if (npc) return { label: `Talk to ${npc.label?.name || id}`, detail: "Confirm conversation" };
    const object = this.storyObjects.get(id);
    if (!object) return { label: "Interact", detail: "Confirm interaction" };
    if (object.kind === "gate") {
      const difficulty = id.includes("oathbreaker") ? "oathbreaker" : "wayfarer";
      const presentation = trialGatePresentation(difficulty);
      return {
        label: `${difficulty === "wayfarer" ? "Wayfarer" : "Oathbreaker"} gate · ${presentation.difficultyLabel}`,
        detail: `${presentation.rewardLabel} · inspect and choose`,
      };
    }
    if (object.destructible) return { label: `Target ${this.objectDisplayName(object)}`, detail: "Confirm target, then use Weapon Strike" };
    if (object.kind === "chest") return { label: "Open Wayfarer's Coffer", detail: "Quest supplies · confirm" };
    if (object.kind === "memory-loom") return { label: "Use Memory Loom", detail: "Shape starter traits · confirm" };
    if (object.kind === "soul-well") return { label: "Touch Soulwell", detail: "Restore Vitality and Stability · confirm" };
    return { label: "Interact", detail: "Confirm interaction" };
  }

  private setPendingInteraction(id: string | null, disabledReason?: string): void {
    if (this.pendingInteractionId) {
      const oldRoot = this.interactionRoot(this.pendingInteractionId);
      if (oldRoot) oldRoot.userData.interactionHighlighted = false;
    }
    this.pendingInteractionId = id;
    if (!id) {
      this.ui.setInteractionPrompt(null);
      return;
    }
    const root = this.interactionRoot(id);
    if (root) root.userData.interactionHighlighted = true;
    this.ui.setInteractionPrompt({ ...this.interactionPromptFor(id), disabledReason });
  }

  private selectStoryObjectTarget(id: string | null): void {
    this.selectedStoryObjectId = id;
    if (id) this.selectEnemyTarget(null);
  }

  private selectEnemyTarget(id: string | null): void {
    const selected = id ? this.enemies.get(id) : undefined;
    this.selectedTargetId = selected?.alive ? selected.id : null;
    this.enemies.forEach((enemy) => {
      const targeted = enemy.id === this.selectedTargetId && enemy.alive;
      enemy.root.userData.targeted = targeted;
      const targetRing = enemy.root.getObjectByName("selected-target-ring");
      if (targetRing) targetRing.visible = targeted;
    });
    if (this.selectedTargetId) {
      this.selectedStoryObjectId = null;
      this.setPendingInteraction(null);
      this.faceActorTowards(this.player, selected!.root.position);
    }
    this.refreshTarget();
  }

  private async requestInteractionById(id: string): Promise<void> {
    if (this.actionBusy || this.playerMoving || this.combatState === "defeat") return;
    const target = this.interactionGrid(id);
    if (!target) return;
    const distance = manhattan(this.player.grid, target);
    const destination = distance <= 1
      ? this.player.grid
      : nearestOpenAdjacent(this.player.grid, target, (point) => this.isWalkable(point, "player"));
    const plan = planInteractionRequest({ distance, canApproach: Boolean(destination) });
    if (plan.action === "disabled") {
      this.setPendingInteraction(id, plan.reason);
      this.ui.setMessage(plan.reason);
      return;
    }
    if (plan.action === "approach") {
      await this.approach(target);
      if (manhattan(this.player.grid, target) > 1) {
        this.setPendingInteraction(id, "No clear approach remains around that obstruction.");
        return;
      }
    }
    if (this.storyObjects.has(id)) this.selectStoryObjectTarget(id);
    this.setPendingInteraction(id);
    this.ui.setMessage(`${this.interactionPromptFor(id).label}. Confirm before committing.`);
  }

  private async confirmPendingInteraction(): Promise<void> {
    const id = this.pendingInteractionId;
    if (!id) return;
    this.setPendingInteraction(null);
    await this.interactById(id);
  }

  private updateNearbyInteractionPrompt(): void {
    if (this.actionBusy || this.playerMoving || this.ui.isDialogueOpen()) return;
    if (this.pendingInteractionId) {
      const current = this.interactionGrid(this.pendingInteractionId);
      if (current && manhattan(this.player.grid, current) <= 1) return;
      this.setPendingInteraction(null);
    }
    const selectedObject = this.selectedStoryObjectId ? this.storyObjects.get(this.selectedStoryObjectId) : undefined;
    if (selectedObject && manhattan(this.player.grid, selectedObject.grid) > 1) this.selectStoryObjectTarget(null);
    const nearby = [
      ...[...this.npcs.values()].map((actor) => ({ id: actor.id, grid: actor.grid })),
      ...[...this.storyObjects.values()]
        .filter((object) => !object.destroyed && object.root.visible)
        .map((object) => ({ id: object.id, grid: object.grid })),
    ]
      .filter((candidate) => manhattan(this.player.grid, candidate.grid) <= 1)
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    if (nearby) this.setPendingInteraction(nearby.id);
  }

  private async interactById(id: string): Promise<void> {
    if (this.actionBusy || this.playerMoving) return;
    const npc = this.npcs.get(id);
    if (npc) {
      await this.approach(npc.grid);
      if (manhattan(this.player.grid, npc.grid) === 1) {
        this.actionBusy = true;
        try {
          if (this.player.weapon?.state === "drawn") await this.transitionWeapon(this.player, "sheathed");
          await this.openNpcDialogue(id);
        } finally {
          this.actionBusy = false;
        }
      }
      return;
    }
    const object = this.storyObjects.get(id);
    if (!object) return;
    if (object.destroyed) return;
    if (object.destructible) {
      this.selectStoryObjectTarget(object.id);
      this.ui.setMessage(`${this.objectDisplayName(object)} targeted. Use Weapon Strike to damage it; quest-critical objects reject attacks with an explanation.`);
      return;
    }
    await this.approach(object.grid);
    if (manhattan(this.player.grid, object.grid) > 1) return;
    this.actionBusy = true;
    try {
    if (object.kind === "gate") {
      await this.playWorldInteraction(WORLD_INTERACTION_MOTIONS.door, async () => {
        this.openTrialChoice(id.includes("oathbreaker") ? "oathbreaker" : "wayfarer");
      }, false);
      return;
    }
    if (object.kind === "soul-well") {
      await this.playWorldInteraction(WORLD_INTERACTION_MOTIONS["soul-well"], () => {
        this.hp = this.profile.maxHp;
        this.stability = this.profile.maxStability;
        this.refreshStats();
        this.ui.setMessage("The Soul Well restores your body and mortal spell channels.");
      });
    } else if (object.kind === "chest") {
      if (this.openedObjects.has(id)) {
        this.ui.setMessage("The Wayfarer's Coffer is empty.");
        return;
      }
      await this.playWorldInteraction(WORLD_INTERACTION_MOTIONS.chest, async () => {
      await this.animateChestOpen(object);
      this.openedObjects.add(id);
      this.addInventoryItem({
        id: "faded-binding-charm",
        name: "Faded binding charm",
        kind: "quest",
        description: "A worn Soul-Well charm that lets the paired trial gates recognize this returned body.",
      });
      this.addInventoryItem({
        id: "woven-recovery-bands",
        name: "Woven Recovery Band",
        kind: "consumable",
        quantity: 2,
        stackLimit: 10,
        description: "Two low-tier recovery bands carried into the shared trial. They restore Vitality and Stability.",
      });
      this.refreshEquipmentUi();
      this.tutorialStep = Math.max(this.tutorialStep, 5);
      this.ui.setTutorial(5, 9, "Choose the gate, not the destination", "Both portcullises enter the same combat-practice wing. Wayfarer teaches the basics; Oathbreaker changes the encounter and pressure for stronger rewards.");
      this.ui.setObjective("Choose a trial gate: Wayfarer (standard reward) or Oathbreaker (severe, stronger reward).");
      this.showTrialGateGuidance();
      this.ui.setMessage("The coffer yields a binding charm and two recovery bands. Your worn C-tier clothing and starter weapon were already equipped when the Well returned you.");
      void storyDatabase.reachCheckpoint("starter-supplies-recovered", id);
      }, false);
    } else if (object.kind === "memory-loom") {
      await this.playWorldInteraction(WORLD_INTERACTION_MOTIONS.lever, () => this.openImprintRefinement(), false);
    } else if (object.kind === "training-effigy") {
      this.tutorialStep = Math.max(this.tutorialStep, 4);
      this.ui.setTutorial(4, 9, "Rehearse without wasting power", `Use the action bar beside the battered effigy. ${this.calling.signatureSkill} may animate without a target and will spend nothing unless it lands.`);
      this.ui.setObjective(this.openedObjects.has("starter-coffer")
        ? "Choose one of the two eastern trial gates when ready."
        : "Practice a skill, then recover the binding charm and recovery supplies from the Wayfarer's Coffer.");
      this.ui.setMessage(`Training effigy ready. Activate ${this.calling.signatureSkill}, ${this.calling.defensiveSkill}, or Recover from the illustrated action bar.`);
      void storyDatabase.reachCheckpoint("training-effigy-inspected", this.calling.id);
    } else if (object.kind === "essence") {
      if (!this.completedEncounters.has("boss")) {
        this.ui.setMessage("The Cinderbound Warden still seals the Soul Essence.");
        return;
      }
      if (!this.complete) {
        await this.playWorldInteraction(WORLD_INTERACTION_MOTIONS.pickup, () => {
        this.complete = true;
        this.claimTrialReward();
        this.addInventoryItem({
          id: "soul-essence-first-memory",
          name: "Soul Essence: First Memory",
          kind: "quest",
          description: "The first stabilized memory recovered from the Soulwell descent.",
        });
        this.refreshEquipmentUi();
        this.ui.setObjective("The first crawl is complete. The stair toward the starting realm has opened.");
        this.ui.setTutorial(9, 9, "The way upward", "The Soulwell dungeon is complete. The next passage leads toward the outdoor starting realm and wider online world.");
        this.ui.setMessage("The first memory returns. Somewhere above, wind moves through a sky that should not exist.");
        this.ui.addLog("Dungeon complete · The First Breach stabilized.");
        void storyDatabase.reachCheckpoint("first-breach-complete", id);
        });
      }
    }
    } finally {
      this.actionBusy = false;
    }
  }

  private async animateChestOpen(object: StoryObject): Promise<void> {
    const lid = object.root.getObjectByName("coffer-lid");
    if (!lid) {
      object.root.rotation.z = -0.08;
      return;
    }
    const start = lid.rotation.x;
    await this.tween(420, (progress) => {
      lid.rotation.x = THREE.MathUtils.lerp(start, -1.08, THREE.MathUtils.smoothstep(progress, 0, 1));
    });
  }

  private showTrialGateGuidance(): void {
    const entries = (["wayfarer", "oathbreaker"] as const).map((difficulty) => {
      const presentation = trialGatePresentation(difficulty);
      const gate = this.storyObjects.get(`gate-${difficulty}`);
      if (gate) gate.root.userData.gateGuidance = true;
      return {
        label: `${difficulty === "wayfarer" ? "Wayfarer" : "Oathbreaker"} · ${presentation.difficultyLabel}`,
        detail: presentation.rewardLabel,
      };
    });
    this.ui.setTrialGateGuidance(entries);
  }

  private clearTrialGateGuidance(): void {
    for (const gate of this.storyObjects.values()) {
      if (gate.kind === "gate") gate.root.userData.gateGuidance = false;
    }
    this.ui.setTrialGateGuidance(null);
  }

  private async liftTrialPortcullis(object: StoryObject): Promise<void> {
    const portcullis = object.root.getObjectByName("trial-portcullis") as THREE.Group | undefined;
    if (!portcullis) {
      this.ui.setMessage("The grate is jammed. The Soulwell keeps the route sealed rather than moving the doorway sideways.");
      return;
    }
    const closedY = portcullis.position.y;
    portcullis.userData.closedY = closedY;
    const veil = object.root.getObjectByName("trial-door-veil") as THREE.Mesh | undefined;
    const veilMaterial = veil?.material as THREE.MeshBasicMaterial | undefined;
    await this.tween(1_180, (progress) => {
      const frame = portcullisFrame({ progress, closedY, liftHeight: 3.5 });
      portcullis.position.y = frame.y;
      object.blocksMovement = frame.blocksMovement;
      if (veilMaterial) veilMaterial.opacity = THREE.MathUtils.lerp(veilMaterial.opacity, 0.025, progress);
    });
    object.blocksMovement = false;
    object.root.userData.gateGuidance = false;
  }

  private async approach(target: GridPoint): Promise<void> {
    if (manhattan(this.player.grid, target) <= 1) return;
    const destination = nearestOpenAdjacent(this.player.grid, target, (point) => this.isWalkable(point, "player"));
    if (!destination) {
      this.ui.setMessage("No clear approach remains around that obstruction.");
      return;
    }
    await this.movePlayer(destination);
  }

  private async strikeDestructible(object: StoryObject): Promise<void> {
    if (this.actionBusy || this.playerMoving || object.destroyed) return;
    if (this.encounter !== "none" && this.combatStyle === "turn-based" && manhattan(this.player.grid, object.grid) > 1) {
      this.ui.setMessage("Move next to that breakable object before spending your tactical action.");
      return;
    }
    await this.approach(object.grid);
    if (manhattan(this.player.grid, object.grid) > 1) return;
    this.actionBusy = true;
    const armed = this.hasUsableWeapon();
    if (armed && !(await this.ensurePlayerWeaponDrawn())) {
      this.actionBusy = false;
      return;
    }
    this.faceActorTowards(this.player, object.root.getWorldPosition(new THREE.Vector3()));
    this.ui.animateAction("basic", BASIC_ATTACK.cooldownMs);
    const motion = this.playMotionArchetype(this.player, this.basicAttackMotion(armed));
    const impactPoint = object.root.getWorldPosition(new THREE.Vector3()).setY(object.kind === "pillar" ? 1.2 : 0.65);
    await this.delay(motion.eventMs);
    const strikeEffect = this.playBasicStrikeEffectAt(impactPoint, !armed);
    const damage = basicAttackDamage(this.profile.stats.might, this.profile.stats.finesse);
    const hit = applyDestructibleHit({
      kind: object.kind,
      hp: object.hp,
      damage,
      seed: this.seed + [...object.id].reduce((total, char) => total + char.charCodeAt(0), 0),
    });
    object.hp = hit.hp;
    await Promise.all([
      strikeEffect,
      this.delay(Math.max(0, motion.durationMs - motion.eventMs - 35)),
    ]);
    if (hit.destroyed) {
      await this.destroyStoryObject(object);
      if (hit.loot === "splintered-supply-cache") {
        this.addInventoryItem({
          id: `salvage-${object.id}`,
          name: "Splintered Supply Cache",
          kind: "consumable",
          quantity: 1,
          stackLimit: 10,
          description: "Usable salvage shaken loose from an ordinary broken prop.",
        });
        this.refreshEquipmentUi();
        this.ui.addLog(`${this.objectDisplayName(object)} drops a Splintered Supply Cache.`);
      }
      this.selectStoryObjectTarget(null);
    }
    else {
      const startingRotation = object.root.rotation.z;
      await this.tween(180, (progress) => {
        object.root.rotation.z = startingRotation + Math.sin(progress * Math.PI * 3) * 0.055 * (1 - progress);
      });
      object.root.rotation.z = startingRotation;
      this.ui.setMessage(`${this.objectDisplayName(object)} takes ${damage} damage · ${object.hp} / ${object.maxHp} integrity.`);
    }
    this.playActorIdle(this.player);
    this.actionBusy = false;
    if (this.encounter !== "none" && this.combatStyle === "turn-based") await this.finishPlayerTurn();
  }

  private objectDisplayName(object: StoryObject): string {
    const labels: Partial<Record<InteractiveKind, string>> = {
      pillar: "Cracked pillar",
      brazier: "Realm brazier",
      rubble: "Loose rubble",
      crate: "Supply crate",
      bench: "Worn bench",
      chair: "Worn chair",
      chest: "Coffer",
    };
    return labels[object.kind] ?? "World object";
  }

  private async destroyStoryObject(object: StoryObject): Promise<void> {
    object.destroyed = true;
    object.blocksMovement = false;
    this.spawnPropDebris(object);
    const startingY = object.root.position.y;
    const direction = (object.grid.x + object.grid.y + this.seed) % 2 === 0 ? 1 : -1;
    await this.tween(420, (progress) => {
      object.root.rotation.z = direction * progress * 1.28;
      object.root.position.y = startingY + Math.sin(progress * Math.PI) * 0.34 - progress * 0.12;
      object.root.scale.setScalar(1 - progress * 0.42);
      object.root.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          material.transparent = true;
          material.opacity = Math.min(material.opacity, 1 - progress * 0.82);
        });
      });
    });
    object.root.visible = false;
    this.ui.setMessage(`${this.objectDisplayName(object)} breaks apart. The cleared tile is now walkable.`);
    this.ui.addLog(`${this.profile.name} destroys ${this.objectDisplayName(object).toLowerCase()}.`);
  }

  private spawnPropDebris(object: StoryObject): void {
    const group = new THREE.Group();
    group.position.copy(object.root.getWorldPosition(new THREE.Vector3()));
    const geometry = new THREE.BoxGeometry(0.18, 0.14, 0.16);
    const material = new THREE.MeshStandardMaterial({ color: 0x5a4635, roughness: 0.92 });
    const pieces = Array.from({ length: 7 }, (_, index) => {
      const piece = new THREE.Mesh(geometry, material);
      const angle = ((index + (this.seed % 5)) / 7) * Math.PI * 2;
      piece.userData.velocity = new THREE.Vector3(Math.cos(angle) * (0.65 + index * 0.05), 1.2 + (index % 3) * 0.24, Math.sin(angle) * (0.65 + index * 0.05));
      piece.position.y = 0.42 + (index % 2) * 0.18;
      group.add(piece);
      return piece;
    });
    this.scene.add(group);
    void this.tween(720, (progress) => {
      const seconds = progress * 0.72;
      pieces.forEach((piece, index) => {
        const velocity = piece.userData.velocity as THREE.Vector3;
        piece.position.set(
          velocity.x * seconds,
          Math.max(0.05, 0.42 + velocity.y * seconds - 2.9 * seconds * seconds),
          velocity.z * seconds,
        );
        piece.rotation.set(seconds * (index + 2), seconds * (index + 3), seconds * 1.7);
      });
      material.opacity = 1 - Math.max(0, progress - 0.7) / 0.3;
      material.transparent = progress > 0.7;
    }).then(() => {
      group.removeFromParent();
      geometry.dispose();
      material.dispose();
    });
  }

  private async openNpcDialogue(npcId: string): Promise<void> {
    const override = await storyDatabase.getNpcStoryOverride<NpcStoryOverride>(npcId);
    const dialogue = buildDialogue(this.npcDatabase, npcId, this.profile, override);
    this.ui.openDialogue(dialogue, (choice) => {
      void storyDatabase.recordDialogue(npcId, dialogue.id, choice.id);
      void storyDatabase.reachCheckpoint(choice.checkpoint, npcId);
      this.ui.addLog(`${dialogue.speaker}: ${choice.label}`);
      if (npcId === "orren") {
        this.tutorialStep = Math.max(this.tutorialStep, 5);
        this.ui.setObjective("Speak with Brannoc at the combat-room threshold, then choose a combat style.");
      } else if (npcId === "brannoc") {
        this.tutorialStep = Math.max(this.tutorialStep, 6);
        this.ui.setTutorial(6, 9, "Enter the shared combat wing", `Use ${this.calling.signatureSkill}, ${this.calling.defensiveSkill}, and Recover. Your chosen gate determines the enemies and Realm Pressure here.`);
        this.ui.setObjective("Cross the threshold and clear the creatures waiting in the Fractured Galleries.");
      }
    }, (choice) => {
      if (npcId !== "ilyra") return;
      if (!this.profile.onboarding?.storybookCompleted) {
        this.ui.openStorybook(
          this.profile,
          (pageIndex) => this.rememberIlyraChroniclePage(pageIndex),
          () => this.completeIlyraChronicle(),
        );
      } else if (choice.id === "refine-imprint" || !this.profile.starterImprint) {
        if (!this.profile.starterImprint) this.openImprintRefinement();
        else this.ui.openStorybook(this.profile, () => undefined, () => undefined);
      }
    });
  }

  private rememberIlyraChroniclePage(pageIndex: number): void {
    if (this.profile.onboarding?.storybookCompleted) return;
    this.profile.onboarding = {
      ...this.profile.onboarding,
      ilyraAnswered: this.profile.onboarding?.ilyraAnswered ?? false,
      storybookPage: pageIndex,
    };
    void storyDatabase.saveCharacter(this.profile);
  }

  private completeIlyraChronicle(): void {
    this.profile.onboarding = {
      ...this.profile.onboarding,
      storybookCompleted: true,
      storybookPage: 6,
      ilyraAnswered: true,
    };
    this.tutorialStep = Math.max(this.tutorialStep, 3);
    this.ui.setTutorial(3, 9, "Shape the soul that returned", "The Chronicle is complete. Place three final stat points, choose one ancestry boon, and choose one mortal base-calling discipline. Higher rune and probability arts remain locked.");
    this.ui.setObjective("Use the Memory Loom to choose your starter traits and three final stat points.");
    this.ui.setMessage("Ilyra closes the chronicle. Now that you know why you were returned, the Memory Loom answers your touch.");
    this.ui.addLog("Chronicle of Returning completed / Ilyra's charge accepted.");
    void storyDatabase.saveCharacter(this.profile);
    void storyDatabase.reachCheckpoint("chronicle-of-returning-complete", "ilyra");
    this.openImprintRefinement();
  }

  private openImprintRefinement(): void {
    const lockReason = starterImprintLockReason(this.profile);
    if (lockReason) {
      this.ui.setMessage(lockReason);
      return;
    }
    if (this.profile.starterImprint) {
      this.ui.setMessage(`Ilyra already sealed ${this.profile.starterImprint.raceBoonName} and ${this.profile.starterImprint.callingPerkName} into this body.`);
      return;
    }
    this.ui.openStarterImprint(
      this.profile,
      raceBoonOptions(this.profile.raceId),
      callingPerkOptions(this.profile.callingId),
      (selection: StarterImprintSelection) => {
        const imprint = applyStarterImprint(this.profile, selection);
        this.hp = this.profile.maxHp;
        this.stability = this.profile.maxStability;
        this.ui.setCharacter(this.profile);
        this.refreshStats();
        this.tutorialStep = Math.max(this.tutorialStep, 4);
        this.ui.setTutorial(4, 9, "Recover and rehearse", `Ilyra sealed ${imprint.raceBoonName} and ${imprint.callingPerkName}. Open the coffer and test your illustrated level-one actions on the effigy.`);
        this.ui.setObjective("Inspect your equipped starter gear, then recover supplies from the Wayfarer's Coffer.");
        this.ui.setMessage("The Memory Loom settles. Your ancestry and calling remain unchanged, but this new body finally feels like yours.");
        this.ui.addLog(`Starter Soul Imprint sealed / ${imprint.raceBoonName} / ${imprint.callingPerkName}.`);
        void storyDatabase.saveCharacter(this.profile);
        void storyDatabase.reachCheckpoint("starter-imprint-sealed", `${imprint.raceBoonId}:${imprint.callingPerkId}`);
      },
    );
  }

  private openTrialChoice(focusedDoor: TrialDifficulty): void {
    const lockReason = starterTrialLockReason(this.profile, {
      cofferOpened: this.openedObjects.has("starter-coffer"),
      hasUsableWeapon: Boolean(equippedUsableWeapon(this.inventory)),
    });
    if (lockReason) {
      this.ui.setMessage(lockReason);
      return;
    }
    const focused = TRIALS[focusedDoor];
    const other = TRIALS[focusedDoor === "wayfarer" ? "oathbreaker" : "wayfarer"];
    const scene: DialogueScene = {
      id: "twin-trial-doors",
      npcId: "trial-doors",
      speaker: "The Twin Trial Gates",
      role: "Realm-lock threshold",
      sprite: "/assets/generated/first-breach-environment-v1.png",
      lines: [
        `${focused.name} answers your touch first. ${focused.description}`,
        `${other.name} remains available. ${other.description}`,
        "Both paths enter the same shifting gallery crawl, but pressure, enemies, and rewards differ. Choose deliberately.",
      ],
      choices: [
        { id: "choose-wayfarer", label: "Enter Wayfarer / standard", response: "The measured lock opens. The gallery will teach before it punishes.", checkpoint: "trial-wayfarer-confirmed" },
        { id: "choose-oathbreaker", label: "Enter Oathbreaker / severe", response: "The harsher lock accepts your oath. The deeper pressure promises stronger spoils.", checkpoint: "trial-oathbreaker-confirmed" },
        { id: "decline-trial", label: "Step away for now", response: "The paired portcullises quiet, but neither choice is lost.", checkpoint: "trial-declined" },
      ],
    };
    this.ui.openDialogue(scene, (choice) => {
      if (choice.id === "choose-wayfarer") void this.selectTrial("wayfarer");
      else if (choice.id === "choose-oathbreaker") void this.selectTrial("oathbreaker");
    });
  }

  private async selectTrial(difficulty: TrialDifficulty): Promise<void> {
    const lockReason = starterTrialLockReason(this.profile, {
      cofferOpened: this.openedObjects.has("starter-coffer"),
      hasUsableWeapon: Boolean(equippedUsableWeapon(this.inventory)),
    });
    if (lockReason) {
      this.ui.setMessage(lockReason);
      return;
    }
    if (this.trialDifficulty && this.trialDifficulty !== difficulty) {
      this.ui.setMessage(`${TRIALS[this.trialDifficulty].name} already holds your oath for this crawl. The second gate has gone dark.`);
      return;
    }
    this.trialDifficulty = difficulty;
    this.profile.chosenTrial = difficulty;
    this.applyTrialToEnemies(difficulty);
    this.zoneGroups.get("passage-one")!.visible = true;
    const trial = TRIALS[difficulty];
    const selectedGate = this.storyObjects.get(`gate-${difficulty}`);
    for (const [gateId, gate] of this.storyObjects) {
      if (gate.kind !== "gate") continue;
      const selected = gateId === `gate-${difficulty}`;
      gate.root.userData.gateGuidance = selected;
      gate.root.traverse((child) => {
        if (child instanceof THREE.PointLight) child.intensity *= selected ? 1.35 : 0.32;
      });
    }
    if (selectedGate) await this.liftTrialPortcullis(selectedGate);
    this.clearTrialGateGuidance();
    this.tutorialStep = Math.max(this.tutorialStep, 5);
    this.ui.setTutorial(5, 9, trial.name, `${trial.description} Both gates converge on a shifting three-to-five-chamber gallery crawl before the miniboss lock.`);
    this.ui.setObjective(`Cross ${trial.name}, follow the branching corridors, and survive the Fractured Galleries.`);
    this.ui.setMessage(`${trial.name} accepts you. The fog parts onto a shifting three-to-five-chamber crawl.`);
    this.ui.addLog(`${trial.name} selected · ${trial.subtitle}.`);
    void storyDatabase.saveCharacter(this.profile);
    void storyDatabase.reachCheckpoint("starter-trial-selected", difficulty);
  }

  private applyTrialToEnemies(difficulty: TrialDifficulty): void {
    if (this.trialApplied) return;
    this.trialApplied = true;
    const trial = TRIALS[difficulty];
    const skirmishEnemies = [...this.enemies.values()]
      .filter((enemy) => enemy.definition.roomId === "skirmish")
      .sort((a, b) => a.id.localeCompare(b.id));
    if (difficulty === "wayfarer") {
      skirmishEnemies.slice(3).forEach((enemy) => {
        enemy.alive = false;
        enemy.root.visible = false;
      });
    } else {
      skirmishEnemies.forEach((enemy, index) => {
        enemy.definition.name = index < 2 ? "Oathbound Breachling" : "Breachling Ravager";
        const labelY = enemy.label?.position.y ?? 2.15;
        if (enemy.label) {
          enemy.label.removeFromParent();
          enemy.label.material.map?.dispose();
          enemy.label.material.dispose();
        }
        enemy.label = this.makeLabel(enemy.definition.name, 0xff9b7d);
        enemy.label.position.y = labelY;
        enemy.root.add(enemy.label);
      });
    }
    for (const enemy of this.enemies.values()) {
      enemy.maxHp = Math.ceil(enemy.maxHp * trial.enemyHpMultiplier);
      enemy.hp = enemy.maxHp;
      enemy.definition.maxHp = enemy.maxHp;
    }
  }

  private claimTrialReward(): void {
    if (this.trialRewardClaimed) return;
    this.trialRewardClaimed = true;
    const difficulty = this.trialDifficulty ?? "wayfarer";
    const trial = TRIALS[difficulty];
    this.addInventoryItem({
      id: `trial-cache-${difficulty}`,
      name: trial.reward,
      kind: "material",
      description: `${trial.name} completion cache. Its final contents are authored in the next progression pass.`,
    });
    if (difficulty === "oathbreaker") {
      this.addInventoryItem({
        id: `grave-iron-${this.profile.callingId}-implement`,
        name: `Grave-Iron ${this.profile.callingName} Implement`,
        kind: "equipment",
        description: "An improved calling implement earned from the severe trial. Slot and modifiers require the class item pass.",
      });
      if (deterministicTrialRoll(this.seed) < trial.skillChance) {
        const skill = hardTrialSkillName(this.profile.callingId);
        this.profile.skills = [...new Set([...this.profile.skills, skill])];
        this.ui.setCharacter(this.profile);
        this.ui.addLog(`New class skill awakened · ${skill}.`);
      } else {
        this.addInventoryItem({
          id: "condensed-realm-pressure-shard",
          name: "Condensed Realm-Pressure Shard",
          kind: "material",
          description: "A valuable residue left when the Oathbreaker skill imprint does not awaken.",
        });
        this.ui.addLog("The skill imprint resisted, leaving a valuable Realm-Pressure shard instead.");
      }
    } else {
      this.addInventoryItem({
        id: `tempered-${this.profile.callingId}-training-gear`,
        name: `Tempered ${this.profile.callingName} Training Gear`,
        kind: "equipment",
        description: "A modest Wayfarer reward awaiting its authored paper-doll slot and modifiers.",
      });
    }
    this.refreshEquipmentUi();
    void storyDatabase.saveCharacter(this.profile);
  }

  private async startEncounter(stage: "skirmish" | "boss"): Promise<void> {
    this.actionBusy = true;
    await this.transitionWeapon(this.player, "drawn");
    this.actionBusy = false;
    this.encounter = stage;
    this.combatStyle = this.ui.selectedCombatStyle();
    this.combatState = this.combatStyle === "turn-based" ? "orders" : "resolution";
    this.ui.lockCombatStyle(true);
    this.ui.showCombatControls(true);
    this.ui.setMode(this.combatState, this.combatStyle);
    this.activeEnemies().forEach((enemy) => { enemy.root.visible = true; });
    this.selectEnemyTarget(this.activeEnemies()[0]?.id ?? null);
    this.refreshTarget();
    if (stage === "skirmish") {
      this.tutorialStep = 6;
      this.ui.setTutorial(6, 9, "Clear the Fractured Galleries", "Defeat every light creature. Recover spends a band when wounded, or restores Stability when no band is needed.");
      this.ui.setObjective(`Clear ${this.activeEnemies().length} Breachlings while preserving health and Stability for the sealed depth.`);
    } else {
      this.tutorialStep = 8;
      this.ui.setTutorial(8, 9, "Break the Cinderbound Warden", `Miniboss pattern: ${this.dungeon.bossPattern.replaceAll("-", " ")}. Read its telegraph and manage your remaining recovery bands.`);
      this.ui.setObjective("Defeat the Cinderbound Warden and claim the Soul Essence.");
    }
    this.ui.addLog(`${stage === "boss" ? "Miniboss" : "Encounter"} engaged · ${this.combatStyle === "turn-based" ? "Tactical Turns" : "Real-Time Action Bar"}.`);
    void storyDatabase.reachCheckpoint(`${stage}-encounter-started`, this.combatStyle);
    if (this.combatStyle === "turn-based") this.preparePlayerTurn();
    else {
      this.realTimeTimer = 0;
      this.realTimeAttackCursor = 0;
    }
  }

  private preparePlayerTurn(): void {
    this.combatState = "orders";
    this.movedThisTurn = false;
    this.selectedAction = null;
    this.ui.setMode("orders", this.combatStyle);
    (['move', 'basic', 'signature', 'guard', 'wait'] as ActionName[]).forEach((action) => this.ui.setActionEnabled(action, true));
    this.ui.setMessage(`Your turn. ${this.stability} Stability · ${this.resource} ${this.calling.resourceName}.`);
  }

  private async handleAction(action: ActionName): Promise<void> {
    if (this.combatState === "defeat" || this.complete || this.actionBusy || this.playerMoving) return;
    if (action === "basic" && this.selectedStoryObjectId) {
      const object = this.storyObjects.get(this.selectedStoryObjectId);
      if (object && !object.destroyed) {
        if (object.questCritical || !object.destructible) {
          this.ui.setMessage(object.protectionReason ?? "The Soulwell protects this quest-critical object from Weapon Strike.");
          return;
        }
        await this.strikeDestructible(object);
        return;
      }
    }
    if (this.encounter === "none") {
      if (action === "move") {
        this.selectedAction = "move";
        this.ui.setMessage("Select a visible floor tile to move. Practice actions remain available outside combat.");
      } else {
        await this.runPlayerAction(async () => {
          if (action === "basic") await this.previewBasicAttack();
          else if (action === "signature") await this.previewSignature();
          else if (action === "guard") await this.activateGuard(true);
          else await this.recover(true);
        });
      }
      return;
    }
    if (this.combatStyle === "turn-based" && this.combatState !== "orders") return;
    if (action === "move") {
      this.selectedAction = "move";
      this.ui.setMessage("Select a reachable floor tile. Walls, rubble, creatures, and NPCs block movement.");
    } else {
      await this.runPlayerAction(async () => {
        if (action === "basic") {
          this.selectedAction = "basic";
          await this.performBasicAttack();
        } else if (action === "signature") {
          this.selectedAction = "signature";
          await this.performSignature();
        } else if (action === "guard") {
          await this.activateGuard();
        } else {
          await this.recover();
        }
      });
    }
  }

  private faceActorTowards(actor: AnimatedActor, target: THREE.Vector3): THREE.Vector3 {
    const direction = target.clone().sub(actor.root.position).setY(0);
    if (direction.lengthSq() < 0.0001) return new THREE.Vector3(0, 0, 1);
    direction.normalize();
    actor.root.rotation.y = Math.atan2(direction.x, direction.z);
    return direction;
  }

  private async previewBasicAttack(aimAt?: THREE.Vector3, reason = "No target"): Promise<void> {
    const armed = this.hasUsableWeapon();
    if (armed && !(await this.ensurePlayerWeaponDrawn())) return;
    this.ui.animateAction("basic", 620);
    const forward = aimAt
      ? this.faceActorTowards(this.player, aimAt)
      : new THREE.Vector3(Math.sin(this.player.root.rotation.y), 0, Math.cos(this.player.root.rotation.y));
    const practicePoint = this.player.root.position.clone().add(forward.multiplyScalar(1.5)).setY(0.88);
    const motion = this.playMotionArchetype(this.player, this.basicAttackMotion(armed));
    await Promise.all([
      this.delay(motion.eventMs).then(() => this.playBasicStrikeEffectAt(practicePoint, !armed)),
      this.delay(Math.max(420, motion.durationMs - 35)),
    ]);
    this.playActorIdle(this.player);
    this.ui.setMessage(`${reason}: ${armed ? "Weapon" : "Unarmed"} Strike rehearses freely and consumes no Stability or class resource.`);
  }

  private async previewSignature(aimAt?: THREE.Vector3, reason = "No target"): Promise<void> {
    if (!(await this.ensurePlayerWeaponDrawn())) return;
    this.ui.animateAction("signature", 760);
    const shadowknightMotion = this.calling.id === "shadowknight"
      ? this.playMotionArchetype(this.player, SIPHON_CLEAVE_MOTION)
      : null;
    const animationMs = shadowknightMotion?.durationMs
      ?? this.playGenericActorAction(this.player, ["CastProjectile", "SwordSlashInward", "SwordSlash", "Punch"], 1.45);
    const forward = aimAt
      ? aimAt.clone().sub(this.player.root.position).setY(0).normalize()
      : new THREE.Vector3(Math.sin(this.player.root.rotation.y), 0, Math.cos(this.player.root.rotation.y));
    if (aimAt) this.faceActorTowards(this.player, aimAt);
    const practicePoint = this.player.root.position.clone().add(forward.multiplyScalar(2.15));
    practicePoint.y = 0.85;
    await Promise.all([
      this.delay(shadowknightMotion?.eventMs ?? 0).then(() => this.playSignatureEffectAt(practicePoint, true)),
      this.delay(Math.max(560, animationMs - 40)),
    ]);
    this.playActorIdle(this.player);
    this.ui.setMessage(`${reason}: ${this.calling.signatureSkill} activates, but causes no hit and consumes no Stability or class resource.`);
    this.ui.addLog(`${this.profile.name} rehearses ${this.calling.signatureSkill}.`);
  }

  private async targetEnemy(enemyId: string): Promise<void> {
    const enemy = this.enemies.get(enemyId);
    if (!enemy?.alive || enemy.definition.roomId !== this.encounter) return;
    this.selectEnemyTarget(enemyId);
    this.refreshTarget();
    this.faceActorTowards(this.player, enemy.root.position);
    if (this.selectedAction === "signature") await this.runPlayerAction(() => this.performSignature());
    else if (this.selectedAction === "basic" || this.combatStyle === "real-time") await this.runPlayerAction(() => this.performBasicAttack());
    else this.ui.setMessage(`${enemy.definition.name} targeted. Use Weapon Strike, ${this.calling.signatureSkill}, or reposition.`);
  }

  private async performBasicAttack(): Promise<void> {
    const active = this.activeEnemies();
    const selected = this.selectedTargetId ? this.enemies.get(this.selectedTargetId) : undefined;
    const selectedOrFirst = selected?.alive && selected.definition.roomId === this.encounter ? selected : active[0];
    const target = resolveMeleeTarget(this.player.grid, this.selectedTargetId, active, BASIC_ATTACK.range)
      ?? selectedOrFirst;
    if (!target) {
      await this.previewBasicAttack();
      return;
    }
    this.selectEnemyTarget(target.id);
    this.faceActorTowards(this.player, target.root.position);
    if (manhattan(this.player.grid, target.grid) > BASIC_ATTACK.range) {
      await this.previewBasicAttack(target.root.position, "Out of range (1 tile required)");
      return;
    }
    const now = performance.now();
    if (this.combatStyle === "real-time" && now < this.basicReadyAt) {
      this.ui.setMessage("Basic attack is still recovering.");
      return;
    }
    const armed = this.hasUsableWeapon();
    if (armed && !(await this.ensurePlayerWeaponDrawn())) return;
    this.combatState = "resolution";
    this.ui.setMode("resolution", this.combatStyle);
    this.ui.animateAction("basic", BASIC_ATTACK.cooldownMs);
    const motion = this.playMotionArchetype(this.player, this.basicAttackMotion(armed));
    await this.delay(motion.eventMs);
    const strikeEffect = this.playBasicStrikeEffectAt(target.root.position.clone().add(new THREE.Vector3(0, 0.88, 0)), !armed);
    const damage = basicAttackDamage(this.profile.stats.might, this.profile.stats.finesse);
    target.hp = Math.max(0, target.hp - damage);
    await Promise.all([
      strikeEffect,
      this.delay(Math.max(0, motion.durationMs - motion.eventMs - 35)),
    ]);
    this.playActorIdle(this.player);
    if (target.hp === 0) await this.defeatEnemy(target);
    else this.playActorHit(target);
    this.ui.addLog(`${armed ? "Weapon" : "Unarmed"} Strike hits ${target.definition.name} for ${damage}; no resource spent.`);
    this.refreshStats();
    this.refreshTarget();
    this.basicReadyAt = now + BASIC_ATTACK.cooldownMs;
    this.selectedAction = null;
    if (this.activeEnemies().length === 0) {
      this.finishEncounter();
      return;
    }
    if (this.combatStyle === "turn-based") await this.finishPlayerTurn();
    else this.ui.setMode("resolution", this.combatStyle);
  }

  private async performSignature(): Promise<void> {
    let target = this.selectedTargetId ? this.enemies.get(this.selectedTargetId) : undefined;
    if (!target?.alive || target.definition.roomId !== this.encounter) target = this.activeEnemies()[0];
    if (!target) return;
    this.selectEnemyTarget(target.id);
    this.faceActorTowards(this.player, target.root.position);
    if (manhattan(this.player.grid, target.grid) > this.calling.signatureRange) {
      await this.previewSignature(
        target.root.position,
        `Out of range (${this.calling.signatureRange} tile${this.calling.signatureRange === 1 ? "" : "s"} required)`,
      );
      return;
    }
    if (this.stability < SIGNATURE_STABILITY_COST) {
      this.ui.setMessage("Your mortal spell channel is unstable. Use Recover before invoking another signature.");
      return;
    }
    const now = performance.now();
    if (this.combatStyle === "real-time" && now < this.signatureReadyAt) {
      this.ui.setMessage(`${this.calling.signatureSkill} is still recovering.`);
      return;
    }
    if (!(await this.ensurePlayerWeaponDrawn())) return;
    this.combatState = "resolution";
    this.ui.setMode("resolution", this.combatStyle);
    this.ui.animateAction("signature", this.combatStyle === "real-time" ? 1200 : 720);
    this.stability = Math.max(0, this.stability - SIGNATURE_STABILITY_COST);
    this.lastStabilitySpendAt = now;
    this.resource = Math.min(100, this.resource + 15);
    const shadowknightMotion = this.calling.id === "shadowknight"
      ? this.playMotionArchetype(this.player, SIPHON_CLEAVE_MOTION)
      : null;
    const animationMs = shadowknightMotion?.durationMs
      ?? this.playGenericActorAction(
        this.player,
        this.calling.signatureRange > 2
          ? ["CastProjectile", "Shoot_OneHanded", "Cast"]
          : ["SwordSlashInward", "SwordSlash", "BasicThrust"],
        1.35,
      );
    const eventMs = shadowknightMotion?.eventMs ?? 0;
    await this.delay(eventMs);
    const signatureEffect = this.playSignatureEffectAt(target.root.position.clone().add(new THREE.Vector3(0, 0.85, 0)), false);
    const damage = this.calling.signatureDamage + (this.resource >= 60 ? 2 : 0);
    target.hp = Math.max(0, target.hp - damage);
    if (this.calling.id === "shadowknight") {
      const healing = Math.min(this.profile.maxHp - this.hp, Math.max(2, Math.ceil(damage * 0.4)));
      this.hp += healing;
      this.ui.addLog(`Siphon Cleave returns ${healing} vitality.`);
    }
    await Promise.all([
      signatureEffect,
      this.delay(Math.max(0, animationMs - eventMs - 40)),
    ]);
    this.playActorIdle(this.player);
    if (target.hp === 0) await this.defeatEnemy(target);
    else this.playActorHit(target);
    this.ui.addLog(`${this.calling.signatureSkill} hits ${target.definition.name} for ${damage}.`);
    this.refreshStats();
    this.refreshTarget();
    this.signatureReadyAt = now + 1200;
    if (this.activeEnemies().length === 0) {
      this.finishEncounter();
      return;
    }
    if (this.combatStyle === "turn-based") await this.finishPlayerTurn();
    else this.ui.setMode("resolution", this.combatStyle);
  }

  private async activateGuard(outOfCombat = false): Promise<void> {
    const now = performance.now();
    if (now < this.guardReadyAt) {
      this.ui.setMessage(`${this.calling.defensiveSkill} is still recovering.`);
      return;
    }
    if (this.stability < GUARD_STABILITY_COST) {
      this.ui.setMessage(`${this.calling.defensiveSkill} needs ${GUARD_STABILITY_COST} Stability.`);
      return;
    }
    if (!(await this.ensurePlayerWeaponDrawn())) return;
    this.stability = Math.max(0, this.stability - GUARD_STABILITY_COST);
    this.lastStabilitySpendAt = now;
    this.reinforcedGuard = this.resource >= 20;
    if (this.reinforcedGuard) this.resource -= 20;
    const shadowknightMotion = this.calling.id === "shadowknight"
      ? this.playMotionArchetype(this.player, CINDER_GUARD_MOTION)
      : null;
    const animationMs = shadowknightMotion?.durationMs
      ?? this.playGenericActorAction(this.player, ["Cast", "Victory"]);
    const eventMs = shadowknightMotion?.eventMs ?? 0;
    this.ui.animateAction("guard", Math.max(1200, animationMs));
    this.guardReadyAt = now + Math.max(outOfCombat ? 4800 : 2600, animationMs);
    await this.delay(eventMs);
    this.playerGuard = true;
    this.playGuardEffect(outOfCombat ? 4000 : 1350);
    this.ui.setMessage(`${this.calling.defensiveSkill} is active${this.reinforcedGuard ? ", reinforced by class resource" : ""}.`);
    this.ui.addLog(`${this.profile.name} invokes ${this.calling.defensiveSkill}.`);
    this.refreshStats();
    await this.delay(Math.max(0, animationMs - eventMs));
    if (!this.playerMoving && this.combatState !== "defeat") this.playActorIdle(this.player);
    if (outOfCombat || this.combatStyle === "real-time") {
      window.setTimeout(() => {
        this.playerGuard = false;
        this.reinforcedGuard = false;
        this.refreshStats();
      }, outOfCombat ? 4000 : 1350);
    } else await this.finishPlayerTurn();
  }

  private async recover(outOfCombat = false): Promise<void> {
    const now = performance.now();
    if (now < this.recoverReadyAt) {
      this.ui.setMessage("Recovery is still on cooldown.");
      return;
    }
    await this.ensurePlayerWeaponSheathed();
    const motion = this.playMotionArchetype(this.player, RECOVER_MOTION);
    this.recoverReadyAt = now + Math.max(5200, motion.durationMs);
    this.ui.animateAction("wait", Math.max(760, motion.durationMs));
    await this.delay(motion.eventMs);
    let healed = 0;
    let restored = 0;
    const needsRecovery = this.hp < this.profile.maxHp || this.stability < this.profile.maxStability;
    if (needsRecovery && this.recoveryCharges > 0) {
      healed = Math.min(this.profile.maxHp - this.hp, Math.ceil(this.profile.maxHp * 0.28));
      this.hp += healed;
      restored = Math.min(this.profile.maxStability - this.stability, 28);
      this.stability += restored;
      this.recoveryCharges -= 1;
      this.ui.addLog(`A Woven Recovery Band restores ${healed} Vitality and ${restored} Stability.`);
    } else if (this.recoveryCharges === 0 && this.stability < this.profile.maxStability) {
      restored = Math.min(this.profile.maxStability - this.stability, 10);
      this.stability += restored;
      this.ui.addLog(`Center Soul restores ${restored} Stability while no recovery bands remain.`);
    }
    this.playRecoveryEffect();
    this.ui.setRecoveryCharges(this.recoveryCharges);
    this.refreshStats();
    this.ui.setMessage(healed > 0 || restored > 0
      ? `${healed > 0 ? `${healed} Vitality and ` : ""}${restored} Stability restored.`
      : "Vitality and Stability are already full; no recovery band was consumed.");
    await this.delay(Math.max(0, motion.durationMs - motion.eventMs));
    if (!this.playerMoving && this.combatState !== "defeat") this.playActorIdle(this.player);
    if (!outOfCombat && this.combatStyle === "turn-based") await this.finishPlayerTurn();
  }

  private async finishPlayerTurn(): Promise<void> {
    this.combatState = "resolution";
    this.selectedAction = null;
    (['move', 'basic', 'signature', 'guard', 'wait'] as ActionName[]).forEach((action) => this.ui.setActionEnabled(action, false));
    this.ui.setMode("resolution", this.combatStyle);
    await this.delay(240 / this.combatSpeed);
    await this.runEnemyRound();
    if (this.hp > 0 && this.activeEnemies().length > 0) this.preparePlayerTurn();
  }

  private async runEnemyRound(): Promise<void> {
    this.actionBusy = true;
    const startedRespawnGeneration = this.respawnGeneration;
    if (this.combatStyle === "real-time") {
      await this.runRealTimeEnemyPulse();
    } else {
      for (const enemy of this.activeEnemies()) {
        await this.enemyStep(enemy);
        if (this.hp <= 0 || this.respawnGeneration !== startedRespawnGeneration) break;
      }
    }
    this.actionBusy = false;
  }

  private async runRealTimeEnemyPulse(): Promise<void> {
    const enemies = this.activeEnemies();
    if (enemies.length === 0) return;

    // Everyone advances during a pulse, but only one adjacent creature may strike.
    // This preserves visible pursuit without letting a whole pack erase a new
    // character during the same animation lock.
    for (const enemy of enemies) {
      if (manhattan(enemy.grid, this.player.grid) <= 1) continue;
      const path = planPursuitPath(enemy.grid, this.player.grid, (point) => this.isWalkable(point, enemy.id));
      const stepCount = enemy.definition.kind === "miniboss" ? 2 : 1;
      await this.walkActor(enemy, path.slice(0, stepCount), 175 / this.combatSpeed);
    }

    const adjacent = enemies.filter((enemy) => manhattan(enemy.grid, this.player.grid) === 1);
    if (adjacent.length === 0) return;
    const attacker = adjacent[this.realTimeAttackCursor % adjacent.length]!;
    this.realTimeAttackCursor = (this.realTimeAttackCursor + 1) % Math.max(1, adjacent.length);
    await this.enemyAttack(attacker);
  }

  private async enemyStep(enemy: EnemyRuntime): Promise<void> {
    const distance = manhattan(enemy.grid, this.player.grid);
    if (distance > 1) {
      const path = planPursuitPath(enemy.grid, this.player.grid, (point) => this.isWalkable(point, enemy.id));
      const stepCount = enemy.definition.kind === "miniboss" ? 2 : 1;
      await this.walkActor(enemy, path.slice(0, stepCount), 175 / this.combatSpeed);
    }
    if (manhattan(enemy.grid, this.player.grid) === 1) await this.enemyAttack(enemy);
  }

  private clearEnemyAttackPhase(): void {
    const visual = this.enemyAttackPhaseVisual;
    if (!visual) return;
    visual.group.removeFromParent();
    visual.geometries.forEach((geometry) => geometry.dispose());
    visual.materials.forEach((material) => material.dispose());
    this.enemyAttackPhaseVisual = null;
  }

  private showEnemyAttackPhase(enemy: EnemyRuntime, phase: EnemyAttackPhase): void {
    this.clearEnemyAttackPhase();
    const group = new THREE.Group();
    group.name = `enemy-attack-phase-${phase}`;
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const material = (color: number, opacity: number, wireframe = false): THREE.MeshBasicMaterial => {
      const value = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        wireframe,
      });
      value.userData.baseOpacity = opacity;
      materials.push(value);
      return value;
    };
    const mesh = (name: string, geometry: THREE.BufferGeometry, value: THREE.Material): THREE.Mesh => {
      geometries.push(geometry);
      const item = new THREE.Mesh(geometry, value);
      item.name = name;
      item.renderOrder = 60;
      group.add(item);
      return item;
    };

    if (phase === "telegraph") {
      const ring = mesh("enemy-telegraph-ring", new THREE.RingGeometry(0.62, 0.98, 40), material(0xff9b45, 0.82));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.035;
      const arc = mesh("enemy-telegraph-arc", new THREE.TorusGeometry(0.78, 0.075, 8, 32, Math.PI * 1.45), material(0xffc15a, 0.9));
      arc.position.y = 1.02;
      arc.rotation.z = Math.PI * 0.78;
      const warning = mesh("enemy-telegraph-pulse", new THREE.OctahedronGeometry(0.2, 0), material(0xff5b38, 0.94));
      warning.position.y = 2.02;
      enemy.root.add(group);
    } else if (phase === "contact") {
      const flash = mesh("enemy-contact-flash", new THREE.SphereGeometry(0.64, 18, 12), material(0xfff0c7, 0.92, true));
      const shock = mesh("enemy-contact-shock", new THREE.TorusGeometry(0.72, 0.085, 8, 30), material(0xff4938, 0.88));
      shock.rotation.x = Math.PI / 2;
      const slashA = mesh("enemy-contact-slash-a", new THREE.BoxGeometry(1.18, 0.11, 0.08), material(0xffc06b, 0.96));
      slashA.rotation.z = Math.PI * 0.22;
      const slashB = mesh("enemy-contact-slash-b", new THREE.BoxGeometry(1.18, 0.11, 0.08), material(0xff6b4a, 0.9));
      slashB.rotation.z = -Math.PI * 0.22;
      const enemyPosition = enemy.root.getWorldPosition(new THREE.Vector3());
      const playerPosition = this.player.root.getWorldPosition(new THREE.Vector3());
      group.position.lerpVectors(enemyPosition, playerPosition, 0.72).add(new THREE.Vector3(0, 0.94, 0));
      this.scene.add(group);
      flash.scale.setScalar(0.82);
    } else {
      const ring = mesh("enemy-recovery-ring", new THREE.RingGeometry(0.58, 0.84, 36), material(0x5ee1d0, 0.72));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;
      const guard = mesh("enemy-recovery-guard", new THREE.SphereGeometry(0.7, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), material(0x83f1df, 0.68, true));
      guard.position.y = 0.96;
      guard.rotation.x = Math.PI * 0.1;
      const settle = mesh("enemy-recovery-settle", new THREE.TorusGeometry(0.48, 0.045, 7, 28), material(0x3caeab, 0.76));
      settle.position.y = 1.02;
      settle.rotation.x = Math.PI / 2;
      enemy.root.add(group);
    }

    this.enemyAttackPhaseVisual = {
      enemyId: enemy.id,
      phase,
      group,
      geometries,
      materials,
      startedAt: this.clock.getElapsed(),
    };
  }

  private updateEnemyAttackPhaseVisual(elapsed: number, delta: number): void {
    const visual = this.enemyAttackPhaseVisual;
    if (!visual) return;
    const age = Math.max(0, elapsed - visual.startedAt);
    const pulse = 0.5 + Math.sin(age * (visual.phase === "telegraph" ? 8.5 : 5.2)) * 0.5;
    const scale = visual.phase === "contact"
      ? 0.88 + pulse * 0.42
      : visual.phase === "telegraph"
        ? 0.94 + pulse * 0.14
        : 0.97 + pulse * 0.06;
    visual.group.scale.setScalar(scale);
    visual.group.rotation.y += delta * (visual.phase === "telegraph" ? 1.8 : 0.7);
    visual.materials.forEach((value) => {
      const baseOpacity = Number(value.userData.baseOpacity ?? 0.8);
      value.opacity = baseOpacity * (0.78 + pulse * 0.22);
    });
  }

  private async enemyAttack(enemy: EnemyRuntime): Promise<void> {
    enemy.attackCount += 1;
    const isBoss = enemy.definition.kind === "miniboss";
    const isHeavy = isBoss && enemy.attackCount % 3 === 0;
    this.faceActorTowards(enemy, this.player.root.position);
    const motion = this.playMotionArchetype(enemy, ENEMY_MELEE_MOTION);
    this.showEnemyAttackPhase(enemy, "telegraph");
    this.ui.setMessage(`${enemy.definition.name} winds up a melee strike.`);
    let reaction: Promise<boolean> | null = null;
    if (isHeavy) {
      const detail = this.dungeon.bossPattern === "soul-tax" ? "Block the life-and-Stability drain" : "Meet the Warden's crossing command";
      reaction = this.ui.requestReaction("Miniboss telegraph", detail, Math.max(320, Math.min(900, motion.eventMs - 40)));
    }
    await this.delay(motion.eventMs);
    const reacted = reaction ? await reaction : false;
    const baseDamage = isBoss ? (isHeavy ? 13 : 9) : 6;
    const pressureMultiplier = this.realmPressure < 25 ? 1 : this.realmPressure < 50 ? 1.1 : this.realmPressure < 75 ? 1.2 : 1.35;
    const trialDamageMultiplier = TRIALS[this.trialDifficulty ?? "wayfarer"].enemyDamageMultiplier;
    const base = Math.ceil(baseDamage * pressureMultiplier * trialDamageMultiplier);
    const armorReduced = Math.max(1, base - this.calling.startingArmor);
    const guarded = this.playerGuard || reacted;
    const factor = this.reinforcedGuard ? 0.25 : guarded ? 0.46 : 1;
    const damage = Math.max(1, Math.ceil(armorReduced * factor));
    this.hp = Math.max(0, this.hp - damage);
    if (this.dungeon.bossPattern === "soul-tax" && isHeavy && !guarded) this.stability = Math.max(0, this.stability - 18);
    else this.stability = Math.max(0, this.stability - (guarded ? 2 : 5));
    this.resource = Math.min(100, this.resource + (guarded ? 10 : 4));
    this.playerGuard = false;
    this.reinforcedGuard = false;
    this.showEnemyAttackPhase(enemy, "contact");
    this.ui.setMessage(`${enemy.definition.name} connects for ${damage}${guarded ? " through your guard" : ""}.`);
    this.ui.addLog(`${enemy.definition.name} deals ${damage}${guarded ? " through your guard" : ""}.`);
    this.refreshStats();
    if (this.hp === 0) this.playActorDeath(this.player);
    else this.playActorHit(this.player);
    const recoveryDuration = Math.max(0, motion.durationMs - motion.eventMs);
    const contactHold = Math.min(190, recoveryDuration * 0.32);
    await this.delay(contactHold);
    this.showEnemyAttackPhase(enemy, "recovery");
    await this.delay(Math.max(0, recoveryDuration - contactHold));
    this.playActorIdle(enemy);
    this.ui.setMessage(`${enemy.definition.name} recovers its guard after contact.`);
    this.clearEnemyAttackPhase();
    if (this.hp === 0) {
      await this.resolvePlayerDefeat();
      return;
    }
    this.playActorIdle(this.player);
  }

  private defeatEnemy(enemy: EnemyRuntime): void {
    enemy.alive = false;
    const deathDurationMs = this.playActorDeath(enemy);
    enemy.label?.material.opacity && (enemy.label.material.opacity = 0.35);
    if (this.selectedTargetId === enemy.id) this.selectEnemyTarget(this.activeEnemies()[0]?.id ?? null);
    void this.delay(enemyDefeatVisibilityMs(deathDurationMs)).then(() => {
      if (!enemy.alive && !this.disposed) enemy.root.visible = false;
    });
  }

  private finishEncounter(): void {
    const finished = this.encounter;
    if (finished === "none") return;
    this.completedEncounters.add(finished);
    this.encounter = "none";
    this.combatState = "victory";
    this.ui.showCombatControls(true);
    (['move', 'basic', 'signature', 'guard', 'wait'] as ActionName[]).forEach((action) => this.ui.setActionEnabled(action, true));
    this.ui.lockCombatStyle(false);
    this.ui.clearTarget();
    this.ui.setMode("victory", this.combatStyle);
    if (finished === "skirmish") {
      this.tutorialStep = 7;
      this.ui.setTutorial(7, 9, "Prepare for the sealed depth", "The light creatures are dead. Recover Stability, inspect your remaining bands, then enter the miniboss chamber.");
      this.ui.setObjective("Proceed through the far passage and challenge the creature sealing the Soul Essence.");
      this.ui.setMessage("The galleries fall quiet. The deeper fog now answers your soul imprint.");
      void storyDatabase.reachCheckpoint("skirmish-cleared", "fractured-galleries");
    } else {
      const essence = this.storyObjects.get("first-memory");
      if (essence) essence.root.visible = true;
      this.ui.setTutorial(9, 9, "Claim the first memory", "The miniboss is broken. Claim the Soul Essence to open the route toward the outdoor starting realm.");
      this.ui.setObjective("Claim the Soul Essence at the far side of the Ashen Lock.");
      this.ui.setMessage("The Cinderbound Warden collapses. Its command over the Soul Essence is gone.");
      void storyDatabase.reachCheckpoint("miniboss-defeated", this.dungeon.bossPattern);
    }
  }

  private enterPlayerDefeatHold(): number | null {
    if (this.combatState === "defeat") return null;
    this.combatState = "defeat";
    this.playerMoving = false;
    this.clearEnemyAttackPhase();
    this.selectStoryObjectTarget(null);
    this.selectEnemyTarget(null);
    this.setPendingInteraction(null);
    this.ui.clearCombatPresentation();
    this.ui.showCombatControls(false);
    this.ui.lockCombatStyle(false);
    this.ui.setMode("defeat", this.combatStyle);
    this.ui.setObjective("The Soulwell is recalling this body to the last stable checkpoint.");
    this.ui.setMessage("Vitality is gone. The grounded pattern holds while the Soulwell prepares recall.");
    return this.playActorDeath(this.player);
  }

  private async resolvePlayerDefeat(): Promise<void> {
    const deathDurationMs = this.enterPlayerDefeatHold();
    if (deathDurationMs == null) return;
    const action = this.player.currentAction;
    const terminalSeconds = action?.getClip().duration ?? deathDurationMs / 1_000;
    while (this.combatState === "defeat" && action && action.time < terminalSeconds - 0.02) {
      await this.delay(40);
    }
    await this.delay(650);
    if (this.combatState === "defeat") await this.respawnAtSoulwellCheckpoint();
  }

  private async respawnAtSoulwellCheckpoint(): Promise<void> {
    this.clearEnemyAttackPhase();
    this.debugCameraFocus = null;
    const plan = planSoulwellRespawn({
      checkpoint: this.soulwellCheckpoint,
      maxHp: this.profile.maxHp,
      maxStability: this.profile.maxStability,
      resource: this.resource,
      encounter: this.encounter,
    });
    this.hp = plan.hp;
    this.stability = plan.stability;
    this.resource = plan.resource;
    this.currentRoom = plan.room;
    this.player.grid = { ...plan.grid };
    this.player.root.position.copy(gridToWorld(plan.grid));
    this.player.root.position.y = 0;
    this.selectStoryObjectTarget(null);
    this.selectEnemyTarget(null);
    this.setPendingInteraction(null);
    this.ui.clearCombatPresentation();
    this.setWeaponState(this.player, "sheathed");
    this.playMotionDecision(this.player, this.player.motion.revive("sheathed"));
    this.cameraFollow.manualOffset.set(0, 0);
    this.cameraFollow.lookAhead.set(0, 0);
    this.cameraFollowInitialized = false;
    this.revealRoom(plan.room, false);
    this.updateCamera(true, 0);
    this.realTimeTimer = 0;
    this.respawnGeneration += 1;
    this.selectedAction = null;
    this.playerGuard = false;
    this.reinforcedGuard = false;
    this.ui.showCombatControls(true);
    this.ui.lockCombatStyle(this.encounter !== "none");
    (['move', 'basic', 'signature', 'guard', 'wait'] as ActionName[]).forEach((action) => this.ui.setActionEnabled(action, true));
    this.refreshStats();
    this.refreshTarget();
    if (this.encounter !== "none" && this.combatStyle === "turn-based") this.preparePlayerTurn();
    else {
      this.combatState = this.encounter === "none" ? "exploration" : "resolution";
      this.ui.setMode(this.combatState, this.combatStyle);
    }
    this.ui.setObjective(this.encounter === "none"
      ? "Return to the Fractured Galleries when you are ready."
      : "Re-enter the Fractured Galleries; the same run and surviving enemies remain.");
    this.ui.setMessage("The Soulwell recalls the same pattern. This generated run, inventory, trial, and encounter state remain intact.");
  }

  private activeEnemies(): EnemyRuntime[] {
    if (this.encounter === "none") return [];
    return [...this.enemies.values()].filter((enemy) => enemy.alive && enemy.definition.roomId === this.encounter);
  }

  private isWalkable(point: GridPoint, movingId: string, allowPlayerGoal = false): boolean {
    const tile = this.tileMap.get(dungeonTileKey(point));
    if (!tile) return false;
    if (tile.roomId !== "training" && !this.trialDifficulty) return false;
    if (this.dungeon.blockedTiles.some((blocked) => samePoint(blocked, point))) return false;
    if (!allowPlayerGoal && movingId !== "player" && samePoint(point, this.player.grid)) return false;
    if (allowPlayerGoal && samePoint(point, this.player.grid)) return true;
    const blockedProp = [...this.storyObjects.values()].some((object) => !object.destroyed && object.blocksMovement && samePoint(object.grid, point));
    if (blockedProp) return false;
    if ([...this.npcs.values()].some((npc) => samePoint(npc.grid, point))) return false;
    if (movingId !== "player" && samePoint(this.player.grid, point)) return false;
    return ![...this.enemies.values()].some((enemy) => enemy.alive && enemy.id !== movingId && samePoint(enemy.grid, point));
  }

  private async playBasicStrikeEffectAt(end: THREE.Vector3, unarmed = false): Promise<void> {
    const effect = new THREE.Group();
    const start = this.player.root.position.clone().add(new THREE.Vector3(0, 0.92, 0));
    const strikeVector = end.clone().sub(start);
    const strikeLength = Math.max(0.18, strikeVector.length());
    const strikeDirection = strikeVector.clone().normalize();
    const streakMaterial = new THREE.MeshBasicMaterial({
      color: unarmed ? 0xf2a85f : 0xd8d0b8,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const streak = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.055, strikeLength, 7, 1, true), streakMaterial);
    streak.visible = !unarmed;
    streak.position.copy(start).lerp(end, 0.5);
    streak.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), strikeDirection);
    const sparkGeometry = new THREE.BufferGeometry();
    sparkGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
      -0.18, 0.02, 0, 0.24, 0.11, 0.04,
      -0.08, -0.14, 0.03, 0.12, 0.22, -0.02,
      -0.28, 0.17, -0.02, 0.31, -0.08, 0.02,
    ], 3));
    const sparkMaterial = new THREE.LineBasicMaterial({ color: unarmed ? 0xffb86c : 0xc58d47, transparent: true, opacity: 0.86 });
    const sparks = new THREE.LineSegments(sparkGeometry, sparkMaterial);
    sparks.position.copy(end);
    effect.add(streak, sparks);
    this.scene.add(effect);
    await this.tween(245 / this.combatSpeed, (progress) => {
      streak.scale.set(1 + progress * 0.8, 1, 1 + progress * 0.8);
      sparks.scale.setScalar(0.72 + progress * 0.92);
      streakMaterial.opacity = 0.78 * (1 - progress);
      sparkMaterial.opacity = 0.86 * (1 - progress);
    });
    effect.removeFromParent();
    streak.geometry.dispose();
    streakMaterial.dispose();
    sparkGeometry.dispose();
    sparkMaterial.dispose();
  }

  private async playSignatureEffectAt(end: THREE.Vector3, practice: boolean): Promise<void> {
    const start = this.player.root.position.clone().add(new THREE.Vector3(0, 1.05, 0));
    if (this.calling.id === "shadowknight") {
      const effect = new THREE.Group();
      const direction = end.clone().sub(start).setY(0).normalize();
      const lateral = new THREE.Vector3(-direction.z, 0, direction.x);
      const trailCurve = new THREE.CatmullRomCurve3([
        start.clone().addScaledVector(lateral, -0.18),
        start.clone().lerp(end, 0.48).addScaledVector(lateral, 0.24).add(new THREE.Vector3(0, 0.12, 0)),
        end.clone(),
      ]);
      const trailMaterial = new THREE.MeshBasicMaterial({
        color: 0xa92f27,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const trail = new THREE.Mesh(new THREE.TubeGeometry(trailCurve, 18, 0.035, 6, false), trailMaterial);
      const slashMaterial = new THREE.MeshBasicMaterial({
        color: 0xe45832,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const slash = new THREE.Mesh(
        new THREE.RingGeometry(0.44, 0.78, 32, 1, -Math.PI * 0.72, Math.PI * 1.32),
        slashMaterial,
      );
      slash.position.copy(end);
      slash.rotation.y = Math.atan2(direction.x, direction.z);
      slash.rotation.z = -0.32;
      const impactMaterial = new THREE.MeshBasicMaterial({
        color: 0xffc08a,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const impact = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), impactMaterial);
      impact.position.copy(end);
      const emberPositions = new Float32Array(18 * 3);
      for (let index = 0; index < 18; index += 1) {
        const angle = (index / 18) * Math.PI * 2;
        emberPositions[index * 3] = Math.cos(angle) * (0.22 + (index % 4) * 0.09);
        emberPositions[index * 3 + 1] = Math.sin(angle * 1.7) * 0.32;
        emberPositions[index * 3 + 2] = Math.sin(angle) * 0.24;
      }
      const emberGeometry = new THREE.BufferGeometry();
      emberGeometry.setAttribute("position", new THREE.BufferAttribute(emberPositions, 3));
      const emberMaterial = new THREE.PointsMaterial({ color: 0xff8a52, size: 0.085, transparent: true, opacity: 0.88, depthWrite: false });
      const embers = new THREE.Points(emberGeometry, emberMaterial);
      embers.position.copy(end);
      effect.add(trail, slash, impact, embers);
      this.scene.add(effect);
      await this.tween(390 / this.combatSpeed, (progress) => {
        slash.scale.setScalar(0.62 + progress * 0.82);
        impact.scale.setScalar(0.65 + progress * 2.2);
        embers.scale.setScalar(0.8 + progress * 1.15);
        trailMaterial.opacity = 0.72 * (1 - progress);
        slashMaterial.opacity = 0.82 * (1 - progress);
        impactMaterial.opacity = 0.7 * (1 - progress);
        emberMaterial.opacity = 0.88 * (1 - progress);
      });
      effect.removeFromParent();
      trail.geometry.dispose();
      trailMaterial.dispose();
      slash.geometry.dispose();
      slashMaterial.dispose();
      impact.geometry.dispose();
      impactMaterial.dispose();
      emberGeometry.dispose();
      emberMaterial.dispose();

      if (!practice) {
        const drainCurve = new THREE.CatmullRomCurve3([
          end.clone(),
          end.clone().lerp(start, 0.5).add(new THREE.Vector3(0, 0.42, 0)).addScaledVector(lateral, -0.16),
          start.clone(),
        ]);
        const drainMaterial = new THREE.MeshBasicMaterial({
          color: 0x8f1824,
          transparent: true,
          opacity: 0.52,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const drainPath = new THREE.Mesh(new THREE.TubeGeometry(drainCurve, 20, 0.022, 5, false), drainMaterial);
        const moteGeometry = new THREE.IcosahedronGeometry(0.075, 1);
        const moteMaterial = new THREE.MeshBasicMaterial({ color: 0xf15b42, transparent: true, opacity: 0.82, depthWrite: false });
        const drain = new THREE.Group();
        const motes = Array.from({ length: 6 }, () => {
          const mote = new THREE.Mesh(moteGeometry, moteMaterial);
          drain.add(mote);
          return mote;
        });
        drain.add(drainPath);
        this.scene.add(drain);
        await this.tween(260 / this.combatSpeed, (progress) => {
          motes.forEach((mote, index) => {
            const stagger = index * 0.075;
            const travel = THREE.MathUtils.clamp(progress * 1.35 - stagger, 0, 1);
            mote.position.copy(drainCurve.getPoint(travel));
            mote.scale.setScalar(0.65 + Math.sin(travel * Math.PI) * 0.8);
          });
          drainMaterial.opacity = 0.52 * (1 - progress);
          moteMaterial.opacity = 0.82 * (1 - progress * 0.72);
        });
        drain.removeFromParent();
        drainPath.geometry.dispose();
        drainMaterial.dispose();
        moteGeometry.dispose();
        moteMaterial.dispose();
      }
      return;
    }

    const material = new THREE.MeshStandardMaterial({
      color: this.calling.signatureColor,
      emissive: this.calling.signatureColor,
      emissiveIntensity: 3.3,
      roughness: 0.18,
      transparent: true,
    });
    const effect = new THREE.Group();
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(this.calling.signatureRange > 2 ? 0.24 : 0.34, 1), material);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.045, 8, 28), material.clone());
    ring.rotation.x = Math.PI / 2;
    effect.add(core, ring);
    effect.position.copy(start);
    this.scene.add(effect);
    await this.tween(430 / this.combatSpeed, (progress) => {
      effect.position.lerpVectors(start, end, progress);
      effect.rotation.y += 0.17;
      effect.scale.setScalar(0.7 + Math.sin(progress * Math.PI) * 0.8);
    });
    const impact = new THREE.Mesh(new THREE.SphereGeometry(0.72, 18, 12), new THREE.MeshBasicMaterial({ color: this.calling.signatureColor, transparent: true, opacity: 0.65, wireframe: true }));
    impact.position.copy(end);
    this.scene.add(impact);
    effect.removeFromParent();
    await this.tween(230 / this.combatSpeed, (progress) => {
      impact.scale.setScalar(0.4 + progress * 1.8);
      (impact.material as THREE.MeshBasicMaterial).opacity = 0.65 * (1 - progress);
    });
    impact.removeFromParent();
  }

  private playGuardEffect(durationMs: number): void {
    const guardColor = this.calling.id === "shadowknight" ? 0x8f2f25 : this.calling.signatureColor;
    const guardBright = this.calling.id === "shadowknight" ? 0xdf6749 : this.calling.signatureColor;
    const shellMaterial = new THREE.MeshBasicMaterial({
      color: guardColor,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.88, 20, 14), shellMaterial);
    shell.position.y = 0.94;
    const moteCount = 34;
    const positions = new Float32Array(moteCount * 3);
    for (let index = 0; index < moteCount; index += 1) {
      const angle = (index / moteCount) * Math.PI * 2;
      const radius = 0.38 + (index % 7) * 0.055;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = 0.08 + ((index * 11) % moteCount) / moteCount * 1.72;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
    }
    const moteGeometry = new THREE.BufferGeometry();
    moteGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const moteMaterial = new THREE.PointsMaterial({
      color: guardBright,
      size: 0.075,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const motes = new THREE.Points(moteGeometry, moteMaterial);
    this.player.root.add(shell, motes);
    const weaponSocket = this.player.weapon?.handSocket;
    let weaponEnchant: THREE.Group | undefined;
    let weaponAura: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> | undefined;
    let weaponSparks: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> | undefined;
    let weaponAuraRadius = 0;
    if (weaponSocket) {
      weaponSocket.updateWorldMatrix(true, true);
      const bounds = new THREE.Box3().setFromObject(weaponSocket);
      const worldCenter = bounds.getCenter(new THREE.Vector3());
      const worldSize = bounds.getSize(new THREE.Vector3());
      const worldScale = weaponSocket.getWorldScale(new THREE.Vector3());
      const parentScale = Math.max(Math.abs(worldScale.x), Math.abs(worldScale.y), Math.abs(worldScale.z), 0.001);
      weaponAuraRadius = THREE.MathUtils.clamp(Math.max(worldSize.x, worldSize.y, worldSize.z) * 0.48, 0.24, 0.72) / parentScale;
      weaponEnchant = new THREE.Group();
      weaponEnchant.name = "cinder-guard-weapon-enchant";
      weaponEnchant.position.copy(weaponSocket.worldToLocal(worldCenter));
      const auraMaterial = new THREE.MeshBasicMaterial({
        color: guardBright,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        wireframe: true,
      });
      weaponAura = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), auraMaterial);
      const weaponSparkPositions = new Float32Array(18 * 3);
      for (let index = 0; index < 18; index += 1) {
        const angle = (index / 18) * Math.PI * 2;
        const radius = weaponAuraRadius * (0.42 + (index % 4) * 0.12);
        weaponSparkPositions[index * 3] = Math.cos(angle) * radius;
        weaponSparkPositions[index * 3 + 1] = Math.sin(index * 1.7) * weaponAuraRadius * 0.65;
        weaponSparkPositions[index * 3 + 2] = Math.sin(angle) * radius;
      }
      const weaponSparkGeometry = new THREE.BufferGeometry();
      weaponSparkGeometry.setAttribute("position", new THREE.BufferAttribute(weaponSparkPositions, 3));
      const weaponSparkMaterial = new THREE.PointsMaterial({
        color: 0xffd58a,
        size: 0.055,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      weaponSparks = new THREE.Points(weaponSparkGeometry, weaponSparkMaterial);
      const weaponLight = new THREE.PointLight(guardBright, 2.2, 2.6, 2);
      weaponEnchant.add(weaponAura, weaponSparks, weaponLight);
      weaponSocket.add(weaponEnchant);
    }
    const startedAt = performance.now();
    const animate = (now: number): void => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      motes.rotation.y += 0.026;
      motes.position.y = progress * 0.16;
      shell.scale.setScalar(0.98 + Math.sin(progress * Math.PI * 8) * 0.025);
      const fade = Math.min(1, (1 - progress) * 3.5);
      shellMaterial.opacity = 0.12 * fade;
      moteMaterial.opacity = 0.82 * fade;
      if (weaponEnchant && weaponAura && weaponSparks) {
        weaponEnchant.rotation.y += 0.045;
        weaponSparks.rotation.x += 0.022;
        weaponAura.scale.setScalar(weaponAuraRadius * (0.92 + Math.sin(progress * Math.PI * 10) * 0.12));
        weaponAura.material.opacity = 0.22 * fade;
        weaponSparks.material.opacity = 0.92 * fade;
      }
      if (progress < 1 && !this.disposed) requestAnimationFrame(animate);
      else {
        shell.removeFromParent();
        motes.removeFromParent();
        shell.geometry.dispose();
        shellMaterial.dispose();
        moteGeometry.dispose();
        moteMaterial.dispose();
        if (weaponEnchant && weaponAura && weaponSparks) {
          weaponEnchant.removeFromParent();
          weaponAura.geometry.dispose();
          weaponAura.material.dispose();
          weaponSparks.geometry.dispose();
          weaponSparks.material.dispose();
        }
      }
    };
    requestAnimationFrame(animate);
  }

  private playRecoveryEffect(): void {
    const material = new THREE.PointsMaterial({ color: 0x75e8d8, size: 0.09, transparent: true, opacity: 0.85, depthWrite: false });
    const positions = new Float32Array(24 * 3);
    for (let index = 0; index < 24; index += 1) {
      const angle = (index / 24) * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * (0.35 + (index % 5) * 0.08);
      positions[index * 3 + 1] = (index % 6) * 0.18;
      positions[index * 3 + 2] = Math.sin(angle) * (0.35 + (index % 5) * 0.08);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const motes = new THREE.Points(geometry, material);
    motes.position.copy(this.player.root.position);
    this.scene.add(motes);
    void this.tween(820, (progress) => {
      motes.position.y = progress * 0.72;
      motes.rotation.y += 0.045;
      material.opacity = 0.85 * (1 - progress);
    }).then(() => {
      motes.removeFromParent();
      geometry.dispose();
      material.dispose();
    });
  }

  private refreshStats(): void {
    this.ui.setStats({ hp: this.hp, stability: this.stability, fury: this.resource });
    const buffs = [];
    const passiveBoon = this.profile.starterImprint
      ? raceBoonOptions(this.profile.raceId).find((option) => option.id === this.profile.starterImprint?.raceBoonId)
      : undefined;
    if (passiveBoon) buffs.push({
      id: `ancestry-${passiveBoon.id}`,
      icon: "\u25c7",
      label: passiveBoon.name,
      duration: "passive",
      help: `${passiveBoon.description} Permanent ancestry boon sealed by Ilyra.`,
    });
    if (this.playerGuard) buffs.push({
      id: "active-guard",
      icon: "\u25c8",
      label: this.calling.defensiveSkill,
      stacks: this.reinforcedGuard ? 2 : 1,
      duration: "next hit",
      help: this.reinforcedGuard
        ? `${this.calling.defensiveSkill} is reinforced: the next incoming hit is heavily reduced.`
        : `${this.calling.defensiveSkill} is active: the next incoming hit is reduced.`,
    });
    this.ui.setBuffs(buffs);
  }

  private refreshTarget(): void {
    const target = this.selectedTargetId ? this.enemies.get(this.selectedTargetId) : undefined;
    if (!target?.alive) {
      this.ui.clearTarget();
      return;
    }
    this.ui.setTarget(target.definition.name, target.hp, target.maxHp, target.definition.kind === "miniboss");
  }

  private prepareDebugTrialGate(): void {
    this.profile.onboarding = { ilyraAnswered: true, storybookCompleted: true, storybookPage: 6 };
    this.profile.starterImprint ??= {
      allocations: { might: 1, finesse: 1, vitality: 1 },
      raceBoonId: "elf-memory",
      callingPerkId: "shadowknight-graveiron",
      raceBoonName: "Unbroken Recollection",
      callingPerkName: "Grave-Iron Discipline",
    };
    this.openedObjects.add("starter-coffer");
    this.tutorialStep = Math.max(this.tutorialStep, 5);
    this.ui.setTutorial(5, 9, "Choose the trial gate", "Both portcullises remain solid until a deliberate difficulty-and-reward choice is confirmed.");
    this.ui.setObjective("Choose a trial gate: Wayfarer (standard reward) or Oathbreaker (severe, stronger reward).");
    this.showTrialGateGuidance();
    this.refreshEquipmentUi();
  }

  private async prepareDebugCorridor(): Promise<void> {
    this.prepareDebugTrialGate();
    if (!this.trialDifficulty) await this.selectTrial("wayfarer");
    this.revealRoom("skirmish", false);
    this.currentRoom = "skirmish";
    const select = requiredElement<HTMLSelectElement>("combat-style");
    if (!select.disabled) this.setCombatStylePreference("turn-based");
    const enemy = [...this.enemies.values()].find((candidate) => candidate.alive && candidate.definition.roomId === "skirmish");
    if (!enemy) throw new Error("No skirmish enemy available for frozen-scope debug proof.");
    const destination = this.dungeon.tiles
      .filter((tile) => tile.roomId === "skirmish" && manhattan(tile, enemy.grid) >= 3)
      .filter((tile) => this.isWalkable(tile, "player"))
      .map((tile) => ({
        tile,
        path: planPursuitPath(enemy.grid, tile, (point) => samePoint(point, tile) || this.isWalkable(point, enemy.id, true)),
      }))
      .filter((candidate) => candidate.path.length >= 3)
      .sort((left, right) => left.path.length - right.path.length)[0]?.tile;
    if (!destination) throw new Error("No valid corridor proof tile found for enemy pursuit.");
    this.player.grid = { x: destination.x, y: destination.y };
    this.player.root.position.copy(gridToWorld(destination));
    this.player.root.position.y = 0;
    this.clearTrialGateGuidance();
    this.debugCameraFocus = null;
    this.cameraFollow.manualOffset.set(0, 0);
    this.cameraFollow.lookAhead.set(0, 0);
    this.cameraFollowInitialized = false;
    this.updateCamera(true, 0);
    await this.startEncounter("skirmish");
  }

  private positionDebugCameraOnActors(first: AnimatedActor, second: AnimatedActor): void {
    const midpoint = first.root.position.clone().lerp(second.root.position, 0.5);
    this.cameraFollow.center.set(first.root.position.x, first.root.position.z);
    this.cameraFollow.lookAhead.set(0, 0);
    this.cameraFollow.manualOffset.set(
      midpoint.x - first.root.position.x,
      midpoint.z - first.root.position.z,
    );
    this.cameraFollow.manualIdleSeconds = 0;
    this.lastCameraPlayerPosition.set(first.root.position.x, first.root.position.z);
    this.cameraFollowInitialized = true;
    this.cameraTarget.set(midpoint.x, 0.8, midpoint.z);
    const horizontalDistance = Math.hypot(15.5, 19.5);
    this.camera.position.set(
      midpoint.x + Math.sin(this.cameraAzimuth) * horizontalDistance,
      19.5,
      midpoint.z + Math.cos(this.cameraAzimuth) * horizontalDistance,
    );
    this.camera.lookAt(this.cameraTarget);
  }

  private centerDebugCameraOnActors(first: AnimatedActor, second: AnimatedActor): void {
    this.camera.zoom = 1;
    this.camera.updateProjectionMatrix();
    this.debugCameraFocus = { first, second };
    this.positionDebugCameraOnActors(first, second);
  }

  private prepareDebugLowWallOcclusion(): string {
    const enemy = this.activeEnemies()[0];
    if (!enemy) throw new Error("No active enemy is available for the low-wall occlusion proof.");
    const isVisible = (object: THREE.Object3D): boolean => {
      let cursor: THREE.Object3D | null = object;
      while (cursor) {
        if (!cursor.visible) return false;
        cursor = cursor.parent;
      }
      return true;
    };
    const placement = this.occluders.flatMap((wall) => {
      const height = new THREE.Box3().setFromObject(wall).getSize(new THREE.Vector3()).y;
      if (height > 1.8 || !isVisible(wall)) return [];
      const wallPosition = wall.getWorldPosition(new THREE.Vector3());
      return this.dungeon.tiles
        .filter((tile) => tile.roomId === "skirmish")
        .map((tile) => {
          const offsetX = wallPosition.x / TILE_SIZE - tile.x;
          const offsetY = wallPosition.z / TILE_SIZE - tile.y;
          const onXBoundary = Math.abs(Math.abs(offsetX) - 0.5) < 0.08 && Math.abs(offsetY) < 0.08;
          const onYBoundary = Math.abs(Math.abs(offsetY) - 0.5) < 0.08 && Math.abs(offsetX) < 0.08;
          if (!onXBoundary && !onYBoundary) return null;
          const outward = { x: onXBoundary ? Math.sign(offsetX) : 0, y: onYBoundary ? Math.sign(offsetY) : 0 };
          const inner = { x: tile.x - outward.x, y: tile.y - outward.y };
          if (!this.tileMap.has(dungeonTileKey(inner))) return null;
          const occupied = [...this.enemies.values()].some((candidate) => candidate.alive && candidate.id !== enemy.id
            && (samePoint(candidate.grid, tile) || samePoint(candidate.grid, inner)));
          const blocked = [...this.storyObjects.values()].some((object) => !object.destroyed && object.blocksMovement
            && (samePoint(object.grid, tile) || samePoint(object.grid, inner)));
          if (occupied || blocked || [...this.npcs.values()].some((npc) => samePoint(npc.grid, tile) || samePoint(npc.grid, inner))) return null;
          return { wall, wallPosition, tile, inner, outward };
        })
        .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
    })[0];
    if (!placement) throw new Error("No visible registered low wall has two clear proof tiles.");

    this.player.grid = { x: placement.tile.x, y: placement.tile.y };
    this.player.root.position.copy(gridToWorld(placement.tile));
    this.player.root.position.y = 0;
    enemy.grid = { ...placement.inner };
    enemy.root.position.copy(gridToWorld(placement.inner));
    enemy.root.position.y = 0;
    if (this.player.label) this.player.label.visible = false;
    this.npcs.forEach((npc) => { npc.root.visible = false; });
    this.enemies.forEach((candidate) => { candidate.root.visible = candidate.id === enemy.id; });
    this.currentRoom = "skirmish";
    this.faceActorTowards(enemy, this.player.root.position);
    this.faceActorTowards(this.player, enemy.root.position);
    this.cameraAzimuth = Math.atan2(placement.outward.x, placement.outward.y);
    this.centerDebugCameraOnActors(this.player, enemy);
    this.selectEnemyTarget(null);
    this.debugOcclusionProofWall = {
      label: `low-wall@${placement.wallPosition.x.toFixed(2)},${placement.wallPosition.z.toFixed(2)}`,
      mesh: placement.wall,
    };
    return enemy.id;
  }

  private installDebugBridge(): void {
    if (!import.meta.env.DEV && !this.pilotReviewEnabled) return;
    const bridge: DebugBridge = {
      snapshot: () => this.debugSnapshot(),
      moveTo: async (x, y) => this.handleGroundClick({ x, y }),
      interact: async (id) => this.interactById(id),
      target: async (id) => this.targetEnemy(id),
      clearTarget: () => this.selectEnemyTarget(null),
      action: async (action) => this.handleAction(action),
      setCombatStyle: (style) => {
        const select = requiredElement<HTMLSelectElement>("combat-style");
        if (!select.disabled) this.setCombatStylePreference(style);
      },
      activeBlock: () => {
        const prompt = requiredElement<HTMLElement>("reaction-prompt");
        if (!prompt.hidden) prompt.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      },
      pose: (animation, normalizedTime) => (async () => {
        if (this.pilotReviewEnabled) {
          await this.posePilotReviewAnimation(this.player, animation, normalizedTime);
          return;
        }
        const clipName = [...this.player.clips.keys()]
          .find((name) => name.toLowerCase() === animation.toLowerCase());
        if (!clipName) throw new Error(`Unknown player animation: ${animation}`);
        const clip = this.player.clips.get(clipName)!;
        if (clipName.toLowerCase() === "deathbaseline") this.player.motion.beginDeath();
        else this.player.motion.complete();
        this.player.mixer.stopAllAction();
        const action = this.player.mixer.clipAction(clip);
        action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
        action.paused = false;
        this.player.mixer.setTime(clip.duration * THREE.MathUtils.clamp(normalizedTime, 0, 1));
        action.paused = true;
        this.player.currentAction = action;
        this.updateActorDeathPresentation(this.player);
        this.player.model.updateMatrixWorld(true);
        this.groundActor(this.player);
      })(),
      reviewAnimations: () => this.pilotReviewCatalog?.reviewAnimations() ?? [],
      reviewAncestry: () => "human",
      playReview: (animation, loop) => this.playPilotReviewAnimation(this.player, animation, loop),
      reviewResidency: () => this.pilotReviewResidency(),
      pauseReview: (paused) => {
        if (this.player.currentAction) this.player.currentAction.paused = paused;
      },
      setReviewSkin: (preset) => applyPilotSkinPreset(this.player.model, preset, "human"),
      weapon: (state) => this.setWeaponState(this.player, state),
      weaponSocket: (position, rotation) => {
        if (!this.player.weapon) return;
        this.player.weapon.hipSocket.position.fromArray(position);
        this.player.weapon.hipSocket.rotation.set(...rotation);
        this.player.weapon.hipSocket.updateMatrixWorld(true);
      },
      prepareTrialGate: () => this.prepareDebugTrialGate(),
      prepareImprint: () => {
        this.profile.onboarding = { ilyraAnswered: true, storybookCompleted: true, storybookPage: 6 };
        delete this.profile.starterImprint;
        this.openImprintRefinement();
      },
      requestInteraction: async (id) => this.requestInteractionById(id),
      confirmInteraction: async () => this.confirmPendingInteraction(),
      prepareCorridor: async () => this.prepareDebugCorridor(),
      prepareOcclusion: () => this.prepareDebugLowWallOcclusion(),
      enemyRound: async () => this.runEnemyRound(),
      enemyPose: (id, phase) => {
        const enemy = this.enemies.get(id);
        if (!enemy?.alive) throw new Error(`Unknown enemy visual-proof target: ${id}`);
        const normalized = phase === "telegraph" ? 0.2 : phase === "contact" ? 0.56 : 0.86;
        this.faceActorTowards(enemy, this.player.root.position);
        this.poseActorForDebug(enemy, ENEMY_MELEE_MOTION.clipNames, normalized);
        this.showEnemyAttackPhase(enemy, phase);
        if (phase === "contact") this.poseActorForDebug(this.player, ["HitReactionMixamo", "RecieveHit", "Defeat"], 0.42);
        else this.playActorIdle(this.player);
        this.ui.setMessage(phase === "telegraph"
          ? `${enemy.definition.name} winds up a melee strike.`
          : phase === "contact"
            ? `${enemy.definition.name} reaches the contact marker.`
            : `${enemy.definition.name} recovers its guard after contact.`);
      },
      defeatEnemy: (id) => {
        const enemy = this.enemies.get(id);
        if (!enemy?.alive) throw new Error(`Unknown living enemy visual-proof target: ${id}`);
        this.defeatEnemy(enemy);
      },
      gatePose: (id, progress) => {
        const object = this.storyObjects.get(id);
        const portcullis = object?.root.getObjectByName("trial-portcullis") as THREE.Group | undefined;
        if (!object || object.kind !== "gate" || !portcullis) throw new Error(`Unknown trial portcullis: ${id}`);
        const closedY = Number(portcullis.userData.closedY ?? portcullis.position.y);
        const frame = portcullisFrame({ progress, closedY, liftHeight: 3.5 });
        portcullis.position.y = frame.y;
        object.blocksMovement = frame.blocksMovement;
      },
      defeat: async () => {
        this.hp = 0;
        this.refreshStats();
        await this.resolvePlayerDefeat();
      },
      defeatHold: () => {
        this.hp = 0;
        this.refreshStats();
        this.enterPlayerDefeatHold();
      },
      respawn: async () => this.respawnAtSoulwellCheckpoint(),
    };
    window.__SOULDRIFTER_DEBUG__ = bridge;
    const publish = (): void => {
      const serialized = JSON.stringify(this.debugSnapshot());
      document.documentElement.dataset.souldrifterDebug = serialized;
      requiredElement<HTMLInputElement>("debug-command").dataset.debugSnapshot = serialized;
    };
    document.addEventListener("souldrifter-debug-command", (event) => {
      const command = (event as CustomEvent<DebugCommand>).detail;
      this.runDebugCommand(command, bridge, publish);
    });
    const commandObserver = new MutationObserver(() => {
      const raw = document.documentElement.dataset.souldrifterCommand;
      if (!raw) return;
      try {
        const command = JSON.parse(raw) as DebugCommand;
        this.runDebugCommand(command, bridge, publish);
      } catch {
        document.documentElement.dataset.souldrifterDebugError = "Invalid debug command JSON.";
      }
    });
    commandObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-souldrifter-command"] });
    const debugInput = requiredElement<HTMLInputElement>("debug-command");
    debugInput.addEventListener("input", () => {
      if (!debugInput.value) return;
      try {
        const command = JSON.parse(debugInput.value) as { type: string; x?: number; y?: number; id?: string; action?: ActionName; style?: CombatStyle };
        this.runDebugCommand(command, bridge, publish);
      } catch {
        document.documentElement.dataset.souldrifterDebugError = "Invalid debug command JSON.";
      }
    });
    publish();
  }

  private runDebugCommand(
    command: DebugCommand,
    bridge: DebugBridge,
    publish: () => void,
  ): void {
      const finish = (): void => publish();
      if (command.type === "snapshot") publish();
      else if (command.type === "move") void bridge.moveTo(command.x ?? 0, command.y ?? 0).then(finish);
      else if (command.type === "interact" && command.id) void bridge.interact(command.id).then(finish);
      else if (command.type === "target" && command.id) void bridge.target(command.id).then(finish);
      else if (command.type === "action" && command.action) void bridge.action(command.action).then(finish);
      else if (command.type === "style" && command.style) { bridge.setCombatStyle(command.style); publish(); }
      else if (command.type === "block") { bridge.activeBlock(); publish(); }
      else if (command.type === "pose" && command.animation) {
        void bridge.pose(command.animation, command.normalizedTime ?? 0).then(finish);
      }
      else if (command.type === "weapon" && command.weaponState) { bridge.weapon(command.weaponState); publish(); }
      else if (command.type === "weapon-socket" && command.position && command.rotation) {
        bridge.weaponSocket(command.position, command.rotation);
        publish();
      }
  }

  private debugSnapshot(): DebugSnapshot {
    const bounds = actorBodyBounds(this.player.model);
    const boundsSize = bounds.getSize(new THREE.Vector3());
    const materialSet = new Set<THREE.Material>();
    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line)) return;
      let ancestor: THREE.Object3D | null = object;
      while (ancestor) {
        if (!ancestor.visible) return;
        ancestor = ancestor.parent;
      }
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => materialSet.add(material));
    });
    const occluderStates = this.occluders.map((wall) => ({
      opacity: (wall.material as THREE.MeshStandardMaterial).opacity,
      height: new THREE.Box3().setFromObject(wall).getSize(new THREE.Vector3()).y,
    }));
    const occluderOpacities = occluderStates.map(({ opacity }) => opacity);
    const lowWallOpacities = occluderStates.filter(({ height }) => height <= 1.8).map(({ opacity }) => opacity);
    const viewport = this.renderer.getSize(new THREE.Vector2());
    const probePlayerBone = (name: string): DebugSnapshot["playerRigProbe"][string] => {
      const bone = this.player.model.getObjectByName(name);
      if (!bone) return null;
      const position = bone.getWorldPosition(new THREE.Vector3());
      const quaternion = bone.getWorldQuaternion(new THREE.Quaternion());
      return {
        position: [position.x, position.y, position.z],
        quaternion: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
      };
    };
    return {
      seed: this.seed,
      realmPressure: this.realmPressure,
      room: this.currentRoom,
      player: { ...this.player.grid, hp: this.hp, stability: this.stability, resource: this.resource },
      combatStyle: this.combatStyle,
      combatState: this.combatState,
      encounter: this.encounter,
      enemies: [...this.enemies.values()].map((enemy) => {
        const screen = enemy.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.9, 0)).project(this.camera);
        return {
          id: enemy.id,
          ...enemy.grid,
          hp: enemy.hp,
          alive: enemy.alive,
          visible: enemy.root.visible,
          targeted: Boolean(enemy.root.userData.targeted),
          roomId: enemy.definition.roomId,
          yaw: Number(enemy.root.rotation.y.toFixed(3)),
          animation: enemy.currentAction?.getClip().name ?? "none",
          animationTime: Number((enemy.currentAction?.time ?? 0).toFixed(3)),
          screen: { x: Number(screen.x.toFixed(4)), y: Number(screen.y.toFixed(4)) },
        };
      }),
      npcs: [...this.npcs.values()].map((npc) => ({ id: npc.id, ...npc.grid })),
      objects: [...this.storyObjects.values()].map((object) => ({
        id: object.id,
        kind: object.kind,
        ...object.grid,
        hp: object.hp,
        maxHp: object.maxHp,
        destroyed: object.destroyed,
        blocksMovement: object.blocksMovement,
        visible: object.root.visible,
        portcullisY: object.kind === "gate"
          ? Number((object.root.getObjectByName("trial-portcullis")?.position.y ?? 0).toFixed(3))
          : undefined,
      })),
      rooms: this.dungeon.rooms.map((room) => ({ id: room.id, center: room.center })),
      revealedRooms: [...this.revealedRooms],
      inventory: [...this.inventory],
      complete: this.complete,
      recoveryCharges: this.recoveryCharges,
      trialDifficulty: this.trialDifficulty,
      selectedTargetId: this.selectedTargetId,
      enemyAttackPhase: this.enemyAttackPhaseVisual?.phase ?? null,
      pendingInteractionId: this.pendingInteractionId,
      respawnGeneration: this.respawnGeneration,
      playerYaw: Number(this.player.root.rotation.y.toFixed(3)),
      occlusion: {
        fadedWalls: occluderOpacities.filter((opacity) => opacity < 0.55).length,
        fadedLowWalls: lowWallOpacities.filter((opacity) => opacity < 0.55).length,
        minOpacity: Number(Math.min(1, ...occluderOpacities).toFixed(3)),
        lowWallMinOpacity: Number(Math.min(1, ...lowWallOpacities).toFixed(3)),
        proofWall: this.debugOcclusionProofWall?.label ?? null,
        proofWallOpacity: this.debugOcclusionProofWall
          ? Number((this.debugOcclusionProofWall.mesh.material as THREE.MeshStandardMaterial).opacity.toFixed(3))
          : null,
      },
      playerAnimation: this.player.currentAction?.getClip().name ?? "none",
      playerAnimationTime: Number((this.player.currentAction?.time ?? 0).toFixed(3)),
      playerAnimationDuration: Number((this.player.currentAction?.getClip().duration ?? 0).toFixed(3)),
      playerWeaponState: this.player.weapon?.state ?? "none",
      playerWeaponEnchantActive: Boolean(this.player.weapon?.handSocket.getObjectByName("cinder-guard-weapon-enchant")),
      playerRigProbe: {
        pelvis: probePlayerBone("pelvis"),
        spine_01: probePlayerBone("spine_01"),
        spine_03: probePlayerBone("spine_03"),
        hand_l: probePlayerBone("hand_l"),
        hand_r: probePlayerBone("hand_r"),
        foot_l: probePlayerBone("foot_l"),
        foot_r: probePlayerBone("foot_r"),
      },
      playerHipSocket: this.player.weapon ? {
        position: [
          this.player.weapon.hipSocket.position.x,
          this.player.weapon.hipSocket.position.y,
          this.player.weapon.hipSocket.position.z,
        ],
        rotation: [
          this.player.weapon.hipSocket.rotation.x,
          this.player.weapon.hipSocket.rotation.y,
          this.player.weapon.hipSocket.rotation.z,
        ],
        visible: this.player.weapon.hipSocket.visible,
        children: this.player.weapon.hipSocket.children.length,
        bounds: (() => {
          const socketBounds = new THREE.Box3().setFromObject(this.player.weapon!.hipSocket);
          return {
            min: [socketBounds.min.x, socketBounds.min.y, socketBounds.min.z] as [number, number, number],
            max: [socketBounds.max.x, socketBounds.max.y, socketBounds.max.z] as [number, number, number],
          };
        })(),
      } : undefined,
      playerHandSocket: this.player.weapon ? (() => {
        const handSocket = this.player.weapon!.handSocket;
        const worldPosition = handSocket.getWorldPosition(new THREE.Vector3());
        const worldQuaternion = handSocket.getWorldQuaternion(new THREE.Quaternion());
        const socketBounds = new THREE.Box3().setFromObject(handSocket);
        return {
          position: [worldPosition.x, worldPosition.y, worldPosition.z] as [number, number, number],
          quaternion: [worldQuaternion.x, worldQuaternion.y, worldQuaternion.z, worldQuaternion.w] as [number, number, number, number],
          visible: handSocket.visible,
          bounds: {
            min: [socketBounds.min.x, socketBounds.min.y, socketBounds.min.z] as [number, number, number],
            max: [socketBounds.max.x, socketBounds.max.y, socketBounds.max.z] as [number, number, number],
          },
        };
      })() : undefined,
      playerBounds: {
        minY: Number(bounds.min.y.toFixed(3)),
        maxY: Number(bounds.max.y.toFixed(3)),
        height: Number((bounds.max.y - bounds.min.y).toFixed(3)),
        width: Number(boundsSize.x.toFixed(3)),
        depth: Number(boundsSize.z.toFixed(3)),
        horizontalSpan: Number(Math.max(boundsSize.x, boundsSize.z).toFixed(3)),
      },
      camera: {
        target: { x: Number(this.cameraTarget.x.toFixed(3)), z: Number(this.cameraTarget.z.toFixed(3)) },
        followCenter: { x: Number(this.cameraFollow.center.x.toFixed(3)), z: Number(this.cameraFollow.center.y.toFixed(3)) },
        lookAhead: { x: Number(this.cameraFollow.lookAhead.x.toFixed(3)), z: Number(this.cameraFollow.lookAhead.y.toFixed(3)) },
        manualOffset: { x: Number(this.cameraFollow.manualOffset.x.toFixed(3)), z: Number(this.cameraFollow.manualOffset.y.toFixed(3)) },
        playerNdc: (() => {
          const projected = this.player.root.position.clone().setY(1.08).project(this.camera);
          return { x: Number(projected.x.toFixed(3)), y: Number(projected.y.toFixed(3)) };
        })(),
      },
      renderer: {
        calls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        geometries: this.renderer.info.memory.geometries,
        textures: this.renderer.info.memory.textures,
        materials: materialSet.size,
        viewport: {
          width: Math.round(viewport.x),
          height: Math.round(viewport.y),
          pixelRatio: this.renderer.getPixelRatio(),
        },
      },
    };
  }

  private render(): void {
    if (this.disposed) return;
    this.clock.update();
    // Action markers and recovery timers use wall-clock milliseconds. Preserve
    // that same elapsed time for animation mixers even when rendering is slow;
    // only clamp world simulation work that could otherwise make large jumps.
    const animationDelta = this.clock.getDelta();
    const delta = Math.min(animationDelta, 0.05);
    this.player?.mixer.update(animationDelta);
    this.npcs.forEach((actor) => actor.mixer.update(animationDelta));
    this.enemies.forEach((actor) => actor.mixer.update(animationDelta));
    if (this.player) this.updateActorDeathPresentation(this.player);
    this.npcs.forEach((actor) => this.updateActorDeathPresentation(actor));
    this.enemies.forEach((actor) => this.updateActorDeathPresentation(actor));
    if (this.player) this.groundActor(this.player);
    this.npcs.forEach((actor) => this.groundActor(actor));
    this.enemies.forEach((actor) => this.groundActor(actor));
    const elapsed = this.clock.getElapsed();
    this.enemies.forEach((enemy) => {
      const targetRing = enemy.root.getObjectByName("selected-target-ring") as THREE.Mesh | undefined;
      if (!targetRing) return;
      const targeted = Boolean(enemy.root.userData.targeted) && enemy.alive && enemy.root.visible;
      targetRing.visible = targeted;
      if (!targeted) return;
      const pulse = 1 + Math.sin(elapsed * 6) * 0.08;
      targetRing.scale.setScalar(pulse);
      const material = targetRing.material as THREE.MeshBasicMaterial;
      material.opacity = 0.74 + Math.sin(elapsed * 6) * 0.12;
    });
    this.updateStabilityRecovery(delta);
    this.environmentAnimators.forEach((animate) => animate(elapsed, delta));
    this.updateEnemyAttackPhaseVisual(elapsed, delta);
    this.storyObjects.forEach((object) => {
      const animated = object.root.userData.animatedOrb as THREE.Object3D | undefined;
      if (animated) {
        const base = animated.userData.floatBase as number;
        animated.position.y = base + Math.sin(elapsed * 1.8 + object.grid.x) * 0.16;
        animated.rotation.y += delta * 1.2;
      }
      object.root.traverse((child) => {
        if (child.userData.flame) {
          child.scale.y = 0.85 + Math.sin(elapsed * 8 + object.grid.y) * 0.18;
          child.rotation.y += delta * 2;
        }
      });
    });
    if (this.combatStyle === "real-time" && this.encounter !== "none" && this.combatState !== "defeat") {
      if (!this.actionBusy) this.realTimeTimer += delta * 1000;
      const intervalMs = 1450 / this.combatSpeed;
      if (shouldAdvanceRealTimeEnemies({
        combatStyle: this.combatStyle,
        encounter: this.encounter,
        combatState: this.combatState,
        actionBusy: this.actionBusy,
        playerMoving: this.playerMoving,
        elapsedMs: this.realTimeTimer,
        intervalMs,
      })) {
        this.realTimeTimer = 0;
        void this.runEnemyRound();
      }
    }
    this.updateCamera(false, delta);
    this.updateOcclusion();
    this.renderer.render(this.scene, this.camera);
    if (this.paperDollVisible) this.renderPaperDoll();
    this.animationFrame = requestAnimationFrame(() => this.render());
  }

  /** Renders the same live skinned player object and equipped sword through a portrait camera. */
  private renderPaperDoll(widthOverride?: number, heightOverride?: number): boolean {
    if (!this.player) return false;
    const canvas = this.paperRenderer.domElement;
    const width = widthOverride ?? Math.max(1, Math.round(canvas.clientWidth));
    const height = heightOverride ?? Math.max(1, Math.round(canvas.clientHeight));
    if (canvas.width !== width || canvas.height !== height) this.paperRenderer.setSize(width, height, false);
    this.paperCamera.aspect = width / height;
    this.paperCamera.updateProjectionMatrix();

    this.player.model.updateMatrixWorld(true);
    const bounds = actorBodyBounds(this.player.model);
    if (bounds.isEmpty()) return false;
    const center = bounds.getCenter(new THREE.Vector3());
    const bodyHeight = Math.max(0.5, bounds.max.y - bounds.min.y);
    const distance = (bodyHeight / (2 * Math.tan(THREE.MathUtils.degToRad(this.paperCamera.fov * 0.5)))) * 1.16;
    const viewOffset = new THREE.Vector3(0, bodyHeight * 0.03, distance)
      .applyQuaternion(this.player.root.quaternion)
      .applyAxisAngle(PAPER_DOLL_UP, this.paperDollYaw);
    this.paperCamera.position.copy(center).add(viewOffset);
    this.paperCamera.lookAt(center.x, center.y + bodyHeight * 0.04, center.z);

    const background = this.scene.background;
    const fog = this.scene.fog;
    this.scene.background = null;
    this.scene.fog = null;
    this.paperRenderer.render(this.scene, this.paperCamera);
    this.scene.background = background;
    this.scene.fog = fog;
    return true;
  }

  private async persistAvatarPreview(): Promise<void> {
    if (this.disposed || !this.player || !this.renderPaperDoll(240, 320)) return;
    try {
      const dataUrl = this.paperRenderer.domElement.toDataURL("image/webp", 0.86);
      if (dataUrl.length > 64) await storyDatabase.saveAvatarPreview(dataUrl);
    } catch {
      // A thumbnail is optional presentation data; never interrupt gameplay if
      // a browser refuses to read its WebGL canvas.
    }
  }

  private updateStabilityRecovery(deltaSeconds: number): void {
    if (this.encounter !== "none" || this.actionBusy || this.playerMoving || this.stability >= this.profile.maxStability) {
      this.stabilityRegenAccumulator = 0;
      return;
    }
    if (performance.now() - this.lastStabilitySpendAt < STABILITY_REGEN_DELAY_MS) return;
    const pressureRate = this.realmPressure < 25 ? 1 : this.realmPressure < 50 ? 0.8 : this.realmPressure < 75 ? 0.55 : 0.3;
    this.stabilityRegenAccumulator += deltaSeconds * pressureRate;
    if (this.stabilityRegenAccumulator < STABILITY_REGEN_INTERVAL_SECONDS) return;
    const recovered = Math.floor(this.stabilityRegenAccumulator / STABILITY_REGEN_INTERVAL_SECONDS);
    this.stabilityRegenAccumulator %= STABILITY_REGEN_INTERVAL_SECONDS;
    this.stability = Math.min(this.profile.maxStability, this.stability + recovered);
    this.refreshStats();
  }

  private updateCamera(immediate: boolean, deltaSeconds: number): void {
    if (!this.player) return;
    if (this.debugCameraFocus) {
      this.positionDebugCameraOnActors(this.debugCameraFocus.first, this.debugCameraFocus.second);
      return;
    }
    const playerPosition = new THREE.Vector2(this.player.root.position.x, this.player.root.position.z);
    if (this.pilotReviewEnabled) {
      const target = new THREE.Vector3(playerPosition.x, 1.05, playerPosition.y);
      const desired = target.clone().add(new THREE.Vector3(
        Math.sin(this.cameraAzimuth) * 10.5,
        9.5,
        Math.cos(this.cameraAzimuth) * 10.5,
      ));
      this.cameraTarget.copy(target);
      if (immediate) this.camera.position.copy(desired);
      else this.camera.position.lerp(desired, 1 - Math.exp(-8 * THREE.MathUtils.clamp(deltaSeconds, 0, 0.1)));
      this.camera.lookAt(target);
      return;
    }
    const roomEnvelope = cameraTileEnvelope(
      this.dungeon.tiles.filter((tile) => tile.roomId === this.currentRoom),
      TILE_SIZE,
    );
    const roomCenter = roomEnvelope.center;
    const roomBounds = roomEnvelope.bounds;
    if (!this.cameraFollowInitialized) {
      this.cameraFollow.center.copy(this.currentRoom === "training" ? roomCenter : playerPosition);
      this.cameraFollow.lookAhead.set(0, 0);
      this.cameraFollow.manualOffset.set(0, 0);
      this.cameraFollow.manualIdleSeconds = 0;
      this.lastCameraPlayerPosition.copy(playerPosition);
      this.cameraFollowInitialized = true;
    }
    const movement = immediate
      ? new THREE.Vector2()
      : playerPosition.clone().sub(this.lastCameraPlayerPosition);
    this.lastCameraPlayerPosition.copy(playerPosition);
    const verticalSpan = Math.max(1, this.camera.top - this.camera.bottom);
    const aspect = Math.max(0.1, (this.camera.right - this.camera.left) / verticalSpan);
    const follow = cameraFollowStep(this.cameraFollow, {
      player: playerPosition,
      movement,
      cameraAzimuth: this.cameraAzimuth,
      verticalSpan,
      aspect,
      zoom: this.camera.zoom,
      compact: this.container.clientWidth <= 600,
      deltaSeconds: immediate ? 0.1 : deltaSeconds,
      roomCenter,
      roomBounds,
    });
    this.cameraFollow = {
      center: follow.center,
      lookAhead: follow.lookAhead,
      manualOffset: follow.manualOffset,
      manualIdleSeconds: follow.manualIdleSeconds,
    };
    const target = new THREE.Vector3(follow.target.x, 0.8, follow.target.y);
    this.cameraTarget.copy(target);
    const horizontalDistance = Math.hypot(15.5, 19.5);
    const desired = target.clone().add(new THREE.Vector3(
      Math.sin(this.cameraAzimuth) * horizontalDistance,
      19.5,
      Math.cos(this.cameraAzimuth) * horizontalDistance,
    ));
    if (immediate) this.camera.position.copy(desired);
    else this.camera.position.lerp(desired, 1 - Math.exp(-8 * THREE.MathUtils.clamp(deltaSeconds, 0, 0.1)));
    this.camera.lookAt(target);
  }

  private updateOcclusion(): void {
    if (!this.player) return;
    for (const wall of this.occluders) {
      const material = wall.material as THREE.MeshStandardMaterial;
      material.opacity += (1 - material.opacity) * 0.22;
      material.depthWrite = material.opacity > 0.55;
    }
    const occlusionTargets: Array<{ root: THREE.Object3D; height: number }> = [
      { root: this.player.root, height: 0.92 },
      ...[...this.enemies.values()]
        .filter((actor) => actor.alive && actor.root.visible)
        .map((actor) => ({ root: actor.root as THREE.Object3D, height: 0.78 })),
      ...[...this.npcs.values()]
        .filter((actor) => actor.root.visible && manhattan(this.player.grid, actor.grid) <= 7)
        .map((actor) => ({ root: actor.root as THREE.Object3D, height: 0.92 })),
      ...[...this.storyObjects.values()]
        .filter((object) => !object.destroyed && object.root.visible && manhattan(this.player.grid, object.grid) <= 7)
        .map((object) => ({ root: object.root, height: object.kind === "gate" ? 1.5 : 0.8 })),
    ];
    const occludingWalls = new Set<THREE.Mesh>();
    for (const actor of occlusionTargets) {
      for (const height of occlusionSampleHeights(actor.height)) {
        const target = actor.root.getWorldPosition(new THREE.Vector3());
        target.y += height;
        const direction = target.sub(this.camera.position);
        const distance = direction.length();
        this.raycaster.set(this.camera.position, direction.normalize());
        this.raycaster.intersectObjects(this.occluders, false)
          .filter((hit) => hit.distance < distance)
          .forEach((hit) => occludingWalls.add(hit.object as THREE.Mesh));
      }
    }
    for (const wall of occludingWalls) {
      const material = wall.material as THREE.MeshStandardMaterial;
      material.opacity += (0.1 - material.opacity) * 0.45;
      material.depthWrite = false;
    }
  }

  private readonly resize = (): void => {
    const width = Math.max(320, this.container.clientWidth);
    const height = Math.max(240, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    const verticalSpan = this.currentRoom === "training" ? 20.8 : 17.2;
    const aspect = width / height;
    this.camera.left = -(verticalSpan * aspect) / 2;
    this.camera.right = (verticalSpan * aspect) / 2;
    this.camera.top = verticalSpan / 2;
    this.camera.bottom = -verticalSpan / 2;
    this.camera.updateProjectionMatrix();
  };

  private async tween(durationMs: number, update: (progress: number) => void): Promise<void> {
    const start = performance.now();
    return new Promise((resolve) => {
      const frame = (now: number): void => {
        const progress = Math.min(1, (now - start) / Math.max(1, durationMs));
        const eased = 1 - (1 - progress) ** 3;
        update(eased);
        if (progress < 1 && !this.disposed) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  private async delay(durationMs: number): Promise<void> {
    await new Promise<void>((resolve) => window.setTimeout(resolve, durationMs));
  }
}
