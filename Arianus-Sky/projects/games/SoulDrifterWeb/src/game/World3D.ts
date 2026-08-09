import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { callingById, SKIN_TONES, type CharacterProfile } from "./character";
import {
  dungeonTileKey,
  generateSoulwellDungeon,
  roomContains,
  type DungeonEnemy,
  type DungeonNpc,
  type DungeonProp,
  type DungeonRoomKind,
  type DungeonZoneId,
  type GeneratedDungeon,
} from "./dungeon";
import { buildDialogue, type DialogueScene, type NpcDatabase, type NpcStoryOverride } from "./npc";
import { findPath } from "./pathfinding";
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
  cloneActorMaterial,
  createStarterLongswordPresentation,
  applyModularAppearance,
  sanitizeAttackClip,
  setWeaponVisualState,
  screenPanToWorld,
  type CameraFollowState,
  type WeaponPresentation,
  type WeaponVisualState,
} from "./presentation";

const TILE_SIZE = 1.75;
const FLOOR_HEIGHT = 0.22;
const SIGNATURE_STABILITY_COST = 12;
const GUARD_STABILITY_COST = 8;
const STABILITY_REGEN_DELAY_MS = 4_500;
const STABILITY_REGEN_INTERVAL_SECONDS = 1.5;
const PLAYER_MODEL_PATHS: Record<string, string> = {
  warrior: "/assets/3d/characters/warrior.gltf",
  mage: "/assets/3d/characters/mage.gltf",
  priest: "/assets/3d/characters/priest.gltf",
  sharpshooter: "/assets/3d/characters/sharpshooter.gltf",
  paladin: "/assets/3d/characters/paladin.gltf",
  summoner: "/assets/3d/characters/summoner.gltf",
  asura: "/assets/3d/characters/asura.gltf",
  slayer: "/assets/3d/characters/slayer.gltf",
  shadowknight: "/assets/3d/characters/elf-shadowknight/elf-shadowknight.glb",
};
const IN_PLACE_ANIMATION_NAMES = new Set([
  "swordslash", "siphoncleave", "shoot_onehanded", "punch", "basicthrust",
  "swordslashoutward", "swordslashinward", "runmixamo", "dooropeninward", "dooropenoutward",
  "pickupwaist", "pickupground", "pulllever", "drawsword", "sheathesword",
  "hitreactionmixamo", "deathmixamo", "castprojectile", "castward", "castsummon", "castarea",
  "unarmedpunch", "unarmedkick", "swordcombomixamo", "siphoncleavecandidate", "siphoncleavesource",
]);
const NPC_MODEL_PATHS: Record<string, string> = {
  ilyra: "/assets/3d/characters/npc-ilyra.gltf",
  orren: "/assets/3d/characters/npc-orren.gltf",
  brannoc: "/assets/3d/characters/npc-brannoc.gltf",
};

interface AnimatedActor {
  id: string;
  root: THREE.Group;
  model: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  clips: Map<string, THREE.AnimationClip>;
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

interface StoryObject {
  id: string;
  grid: GridPoint;
  root: THREE.Object3D;
  kind: DungeonProp["kind"] | "npc";
  blocksMovement: boolean;
  destructible: boolean;
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
  enemies: Array<GridPoint & { id: string; hp: number; alive: boolean; roomId: DungeonRoomKind }>;
  npcs: Array<GridPoint & { id: string }>;
  objects: Array<GridPoint & { id: string; kind: StoryObject["kind"] }>;
  rooms: Array<{ id: DungeonRoomKind; center: GridPoint }>;
  revealedRooms: DungeonRoomKind[];
  inventory: Array<{ id: string; name: string; equipped: boolean; slot?: string; durability?: number }>;
  complete: boolean;
  recoveryCharges: number;
  trialDifficulty: TrialDifficulty | null;
  selectedTargetId: string | null;
  playerAnimation: string;
  playerAnimationTime: number;
  playerAnimationDuration: number;
  playerWeaponState: WeaponVisualState | "none";
  playerHipSocket?: {
    position: [number, number, number];
    rotation: [number, number, number];
    visible: boolean;
    children: number;
    bounds: { min: [number, number, number]; max: [number, number, number] };
  };
  playerBounds: { minY: number; maxY: number; height: number };
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
  action(action: ActionName): Promise<void>;
  setCombatStyle(style: CombatStyle): void;
  activeBlock(): void;
  pose(animation: string, normalizedTime: number): void;
  weapon(state: WeaponVisualState): void;
  weaponSocket(position: [number, number, number], rotation: [number, number, number]): void;
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
  private readonly dungeon: GeneratedDungeon;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-16, 16, 12, -12, 0.1, 320);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly clock = new THREE.Timer();
  private readonly loader = new GLTFLoader();
  private readonly modelCache = new Map<string, Promise<GLTF>>();
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
    this.tileMap = new Map(this.dungeon.tiles.map((tile) => [dungeonTileKey(tile), tile]));
    this.trialDifficulty = null;
    this.hp = profile.maxHp;
    this.stability = profile.maxStability;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.setAttribute("aria-label", "Soulwell dungeon rendered in three dimensions");
    this.renderer.domElement.tabIndex = 0;
  }

  public async start(): Promise<void> {
    this.container.replaceChildren(this.renderer.domElement);
    this.scene.background = new THREE.Color(0x05090d);
    this.scene.fog = new THREE.FogExp2(0x071015, 0.012);
    this.configureLights();
    await this.buildDungeonGeometry();
    this.npcDatabase = await fetch("/data/npcs.json").then((response) => {
      if (!response.ok) throw new Error(`NPC database failed to load (${response.status}).`);
      return response.json() as Promise<NpcDatabase>;
    });
    await this.buildActors();
    this.bindInput();
    this.bindUI();
    this.revealRoom("training", false);
    this.resize();
    this.updateCamera(true, 0);
    this.initializeHud();
    this.installDebugBridge();
    this.animationFrame = requestAnimationFrame(() => this.render());
  }

  public destroy(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener("resize", this.resize);
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("keydown", this.onKeyDown);
    this.environmentDisposers.forEach((dispose) => dispose());
    this.renderer.dispose();
    if (window.__SOULDRIFTER_DEBUG__) delete window.__SOULDRIFTER_DEBUG__;
  }

  private configureLights(): void {
    this.scene.add(new THREE.HemisphereLight(0x9fbeca, 0x17110f, 0.88));
    this.scene.add(new THREE.AmbientLight(0x789092, 0.28));
    const key = new THREE.DirectionalLight(0xffe4bd, 2.6);
    key.position.set(-14, 24, 10);
    key.intensity = 2.45;
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 110;
    key.shadow.camera.left = -32;
    key.shadow.camera.right = 32;
    key.shadow.camera.top = 32;
    key.shadow.camera.bottom = -32;
    key.shadow.bias = -0.00045;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x47d4c8, 0.58);
    rim.position.set(18, 12, -18);
    this.scene.add(rim);
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
      const storyObject: StoryObject = {
        ...object,
        blocksMovement: true,
        destructible: false,
        hp: 0,
        maxHp: 0,
        destroyed: false,
      };
      this.storyObjects.set(object.id, storyObject);
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
        wall.userData.occluder = boundaryHeight > 2;
        if (boundaryHeight > 2) this.occluders.push(wall);
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
    const destructible = prop.kind === "pillar" || prop.kind === "rubble" || prop.kind === "brazier";
    const maxHp = prop.kind === "pillar" ? 14 : prop.kind === "brazier" ? 7 : destructible ? 5 : 0;
    const storyObject: StoryObject = {
      id: prop.id,
      grid: { x: prop.x, y: prop.y },
      root,
      kind: prop.kind,
      blocksMovement: prop.blocksMovement,
      destructible,
      hp: maxHp,
      maxHp,
      destroyed: false,
    };
    this.storyObjects.set(prop.id, storyObject);
    this.addInteractionMarker(root, destructible ? 0xc58d47 : 0x62e6db, destructible);
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
      beacon.position.y = (destructible ? 1.2 : 1.75) + Math.sin(elapsed * 2.1 + phase) * 0.12;
      beacon.rotation.y = elapsed * (destructible ? 0.8 : 1.25);
      marker.scale.setScalar(0.96 + Math.sin(elapsed * 2.4 + phase) * 0.045);
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
    this.player = await this.createActor(
      "player",
      PLAYER_MODEL_PATHS[this.profile.callingId] ?? PLAYER_MODEL_PATHS.warrior!,
      this.dungeon.playerStart,
      raceScale[this.profile.raceId] ?? 1.7,
      this.calling.signatureColor,
      this.profile.name,
    );
    this.scene.add(this.player.root);

    const npcHeights: Record<string, number> = { ilyra: 1.98, orren: 1.94, brannoc: 2.12 };
    const npcNames: Record<string, string> = { ilyra: "Wellkeeper Ilyra", orren: "Breach Scout Orren", brannoc: "Arena Warden Brannoc" };
    await Promise.all(this.dungeon.npcs.map(async (npc) => {
      const actor = await this.createActor(npc.id, NPC_MODEL_PATHS[npc.id]!, npc, npcHeights[npc.id]!, 0xc59b62, npcNames[npc.id] ?? npc.id);
      actor.root.traverse((child) => { child.userData.interactId = npc.id; });
      this.addInteractionMarker(actor.root, 0x62e6db, false);
      this.npcs.set(npc.id, actor);
      const zoneId = this.tileMap.get(dungeonTileKey(npc))?.zoneId ?? "training";
      this.zoneGroups.get(zoneId)!.add(actor.root);
    }));

    await Promise.all(this.dungeon.enemies.map(async (enemy) => {
      const isBoss = enemy.kind === "miniboss";
      const actor = await this.createActor(
        enemy.id,
        isBoss ? PLAYER_MODEL_PATHS.paladin! : "/assets/3d/characters/enemy-breachling.gltf",
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
      actor.root.traverse((child) => { child.userData.enemyId = enemy.id; });
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
  ): Promise<AnimatedActor> {
    const gltf = await this.loadModel(path);
    const model = cloneSkeleton(gltf.scene);
    model.updateMatrixWorld(true);
    const initialBox = actorBodyBounds(model);
    const sourceHeight = Math.max(0.01, initialBox.max.y - initialBox.min.y);
    const scale = desiredHeight / sourceHeight;
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);
    const scaledBox = actorBodyBounds(model);
    model.position.y -= scaledBox.min.y;
    model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const hadMaterialArray = Array.isArray(child.material);
        const materials: THREE.Material[] = hadMaterialArray
          ? [...child.material]
          : [child.material];
        const skinTone = id === "player"
          ? SKIN_TONES[this.profile.appearance?.skinTone ?? "ashen"].color
          : undefined;
        const customized = materials.map((source: THREE.Material) => cloneActorMaterial(source, tint, id === "player", skinTone));
        child.material = hadMaterialArray ? customized : customized[0]!;
      }
    });
    if (id === "player") applyModularAppearance(model, { hairStyle: this.profile.appearance?.hairStyle ?? "shaved" });

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
    const groundingMeshes: THREE.Mesh[] = [];
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && /boot|feet|shoe/i.test(child.name)) groundingMeshes.push(child);
    });
    const weapon = id === "player" ? createStarterLongswordPresentation(model) : undefined;
    if (weapon) setWeaponVisualState(weapon, equippedUsableWeapon(this.inventory) ? "sheathed" : "hidden");
    const actor: AnimatedActor = {
      id,
      root,
      model,
      mixer,
      clips,
      groundingMeshes,
      grid: { x: grid.x, y: grid.y },
      label,
      weapon,
    };
    this.playAnimation(actor, "Idle");
    this.groundActor(actor);
    return actor;
  }

  /** Keeps the lowest boot surface on the dungeon floor after retargeted clips move the rig. */
  private groundActor(actor: AnimatedActor): void {
    if (!actor.root.visible || !actor.model.visible) return;
    actor.root.updateMatrixWorld(true);
    const bounds = new THREE.Box3();
    if (actor.groundingMeshes.length > 0) {
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
    const effectiveSpeed = this.combatSpeed * speedMultiplier;
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

  private hasAnimation(actor: AnimatedActor, names: readonly string[]): boolean {
    const available = new Set([...actor.clips.keys()].map((name) => name.toLowerCase()));
    return names.some((name) => available.has(name.toLowerCase()));
  }

  private playMotionArchetype(actor: AnimatedActor, contract: MotionArchetypeContract): { durationMs: number; eventMs: number } {
    const durationMs = this.playFirstAvailableAnimation(
      actor,
      contract.clipNames,
      true,
      contract.playbackRate,
      contract.blendSeconds,
    );
    return { durationMs, eventMs: durationMs * contract.timing.event.at };
  }

  private setWeaponState(actor: AnimatedActor, state: WeaponVisualState): void {
    if (actor.weapon) setWeaponVisualState(actor.weapon, state);
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
    const durationMs = this.playFirstAvailableAnimation(actor, clipNames, true, target === "drawn" ? 1.2 : 1.65, 0.08);
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

    const hasClip = this.hasAnimation(this.player, contract.clipNames);
    const durationMs = hasClip
      ? this.playFirstAvailableAnimation(this.player, contract.clipNames, true, contract.playbackRate, 0.1)
      : 0;
    const eventMs = durationMs * contract.eventAt;
    if (eventMs > 0) await this.delay(eventMs);
    await onEvent();
    if (durationMs > eventMs) await this.delay(durationMs - eventMs);

    if (beganDrawn && redraw) await this.transitionWeapon(this.player, "drawn");
    else this.playAnimation(this.player, "Idle");
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
      this.playAnimation(this.player, "Idle");
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
    for (const hit of hits) {
      const enemyId = this.findUserData<string>(hit.object, "enemyId");
      if (enemyId) {
        void this.targetEnemy(enemyId);
        return;
      }
      const interactId = this.findUserData<string>(hit.object, "interactId");
      if (interactId) {
        void this.interactById(interactId);
        return;
      }
      if (hit.object instanceof THREE.InstancedMesh && typeof hit.instanceId === "number") {
        const tile = hit.object.userData.tileLookup?.[hit.instanceId] as GridPoint | undefined;
        if (tile) void this.handleGroundClick(tile);
        return;
      }
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
    this.playAnimation(this.player, "Idle");
  }

  private setCombatStylePreference(style: CombatStyle): void {
    if (this.encounter !== "none") return;
    this.combatStyle = style;
    this.ui.setSelectedCombatStyle(style);
    this.ui.setMessage(style === "real-time"
      ? "Real-time combat selected. Enemies will advance and attack continuously."
      : "Tactical combat selected. Enemies act after each completed turn.");
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
          : "Rehearse an action and inspect the two trial doors.";
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
    const stepCount = limited.length;
    this.playerMoving = true;
    await this.walkActor(this.player, limited, 285 / this.combatSpeed);
    this.playerMoving = false;
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
  }

  private async walkActor(actor: AnimatedActor, path: GridPoint[], durationPerStep: number): Promise<void> {
    if (path.length === 0) return;
    this.playFirstAvailableAnimation(
      actor,
      durationPerStep <= 220 ? ["RunMixamo", "Run", "Walk"] : ["Walk", "RunMixamo", "Run"],
    );
    for (const step of path) {
      const start = actor.root.position.clone();
      const end = gridToWorld(step);
      actor.root.rotation.y = Math.atan2(end.x - start.x, end.z - start.z);
      await this.tween(durationPerStep, (progress) => actor.root.position.lerpVectors(start, end, progress));
      actor.root.position.y = 0;
      actor.grid = { x: step.x, y: step.y };
    }
    this.playAnimation(actor, "Idle");
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
      await this.strikeDestructible(object);
      return;
    }
    await this.approach(object.grid);
    if (manhattan(this.player.grid, object.grid) > 1) return;
    this.actionBusy = true;
    try {
    if (object.kind === "gate") {
      await this.playWorldInteraction(WORLD_INTERACTION_MOTIONS.door, async () => {
        await this.animateGateResponse(object);
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
        description: "A worn Soul-Well charm that lets the paired trial doors recognize this returned body.",
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
      this.ui.setTutorial(5, 9, "Choose the door, not the destination", "Both doors enter the same combat-practice wing. Wayfarer teaches the basics; Oathbreaker changes the encounter and pressure for stronger rewards.");
      this.ui.setObjective("Rehearse an action on the effigy, then choose the Wayfarer or Oathbreaker door.");
      this.ui.setMessage("The coffer yields a binding charm and two recovery bands. Your worn C-tier clothing and starter weapon were already equipped when the Well returned you.");
      void storyDatabase.reachCheckpoint("starter-supplies-recovered", id);
      }, false);
    } else if (object.kind === "memory-loom") {
      await this.playWorldInteraction(WORLD_INTERACTION_MOTIONS.lever, () => this.openImprintRefinement(), false);
    } else if (object.kind === "training-effigy") {
      this.tutorialStep = Math.max(this.tutorialStep, 4);
      this.ui.setTutorial(4, 9, "Rehearse without wasting power", `Use the action bar beside the battered effigy. ${this.calling.signatureSkill} may animate without a target and will spend nothing unless it lands.`);
      this.ui.setObjective(this.openedObjects.has("starter-coffer")
        ? "Choose one of the two eastern trial doors when ready."
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

  private async animateGateResponse(object: StoryObject): Promise<void> {
    const veil = object.root.getObjectByName("trial-door-veil") as THREE.Mesh | undefined;
    const material = veil?.material as THREE.MeshBasicMaterial | undefined;
    if (!material) return;
    const start = material.opacity;
    await this.tween(360, (progress) => {
      material.opacity = THREE.MathUtils.lerp(start, Math.min(0.04, start), progress);
    });
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
    object.hp = Math.max(0, object.hp - damage);
    await Promise.all([
      strikeEffect,
      this.delay(Math.max(0, motion.durationMs - motion.eventMs - 35)),
    ]);
    if (object.hp === 0) await this.destroyStoryObject(object);
    else {
      const startingRotation = object.root.rotation.z;
      await this.tween(180, (progress) => {
        object.root.rotation.z = startingRotation + Math.sin(progress * Math.PI * 3) * 0.055 * (1 - progress);
      });
      object.root.rotation.z = startingRotation;
      this.ui.setMessage(`${this.objectDisplayName(object)} takes ${damage} damage · ${object.hp} / ${object.maxHp} integrity.`);
    }
    this.playAnimation(this.player, "Idle");
    this.actionBusy = false;
    if (this.encounter !== "none" && this.combatStyle === "turn-based") await this.finishPlayerTurn();
  }

  private objectDisplayName(object: StoryObject): string {
    return object.kind === "pillar" ? "Cracked pillar" : object.kind === "brazier" ? "Realm brazier" : "Loose rubble";
  }

  private async destroyStoryObject(object: StoryObject): Promise<void> {
    object.destroyed = true;
    object.blocksMovement = false;
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
        this.ui.setTutorial(6, 9, "Enter the shared combat wing", `Use ${this.calling.signatureSkill}, ${this.calling.defensiveSkill}, and Recover. Your chosen door determines the enemies and Realm Pressure here.`);
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
    this.ui.addLog("Chronicle of Returning completed · Ilyra's charge accepted.");
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
        this.ui.addLog(`Starter Soul Imprint sealed · ${imprint.raceBoonName} · ${imprint.callingPerkName}.`);
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
      speaker: "The Twin Trial Doors",
      role: "Realm-lock threshold",
      sprite: "/assets/generated/first-breach-environment-v1.png",
      lines: [
        `${focused.name} answers your touch first. ${focused.description}`,
        `${other.name} remains available. ${other.description}`,
        "Both paths enter the same shifting gallery crawl, but pressure, enemies, and rewards differ. Choose deliberately.",
      ],
      choices: [
        { id: "choose-wayfarer", label: "Enter Wayfarer · standard", response: "The measured lock opens. The gallery will teach before it punishes.", checkpoint: "trial-wayfarer-confirmed" },
        { id: "choose-oathbreaker", label: "Enter Oathbreaker · severe", response: "The harsher lock accepts your oath. The deeper pressure promises stronger spoils.", checkpoint: "trial-oathbreaker-confirmed" },
        { id: "decline-trial", label: "Step away for now", response: "The paired doors quiet, but neither choice is lost.", checkpoint: "trial-declined" },
      ],
    };
    this.ui.openDialogue(scene, (choice) => {
      if (choice.id === "choose-wayfarer") this.selectTrial("wayfarer");
      else if (choice.id === "choose-oathbreaker") this.selectTrial("oathbreaker");
    });
  }

  private selectTrial(difficulty: TrialDifficulty): void {
    const lockReason = starterTrialLockReason(this.profile, {
      cofferOpened: this.openedObjects.has("starter-coffer"),
      hasUsableWeapon: Boolean(equippedUsableWeapon(this.inventory)),
    });
    if (lockReason) {
      this.ui.setMessage(lockReason);
      return;
    }
    if (this.trialDifficulty && this.trialDifficulty !== difficulty) {
      this.ui.setMessage(`${TRIALS[this.trialDifficulty].name} already holds your oath for this crawl. The second door has gone dark.`);
      return;
    }
    this.trialDifficulty = difficulty;
    this.profile.chosenTrial = difficulty;
    this.applyTrialToEnemies(difficulty);
    this.zoneGroups.get("passage-one")!.visible = true;
    const trial = TRIALS[difficulty];
    for (const [gateId, gate] of this.storyObjects) {
      if (gate.kind !== "gate") continue;
      const selected = gateId === `gate-${difficulty}`;
      gate.root.scale.setScalar(selected ? 1.05 : 0.96);
      gate.root.traverse((child) => {
        if (child instanceof THREE.PointLight) child.intensity *= selected ? 1.35 : 0.32;
      });
    }
    this.tutorialStep = Math.max(this.tutorialStep, 5);
    this.ui.setTutorial(5, 9, trial.name, `${trial.description} Both doors converge on a shifting three-to-five-chamber gallery crawl before the miniboss lock.`);
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
    this.selectedTargetId = this.activeEnemies()[0]?.id ?? null;
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
    this.playAnimation(this.player, "Idle");
    this.ui.setMessage(`${reason}: ${armed ? "Weapon" : "Unarmed"} Strike rehearses freely and consumes no Stability or class resource.`);
  }

  private async previewSignature(aimAt?: THREE.Vector3, reason = "No target"): Promise<void> {
    if (!(await this.ensurePlayerWeaponDrawn())) return;
    this.ui.animateAction("signature", 760);
    const shadowknightMotion = this.calling.id === "shadowknight"
      ? this.playMotionArchetype(this.player, SIPHON_CLEAVE_MOTION)
      : null;
    const animationMs = shadowknightMotion?.durationMs
      ?? this.playFirstAvailableAnimation(this.player, ["CastProjectile", "SwordSlashInward", "SwordSlash", "Punch"], true, 1.45);
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
    this.playAnimation(this.player, "Idle");
    this.ui.setMessage(`${reason}: ${this.calling.signatureSkill} activates, but causes no hit and consumes no Stability or class resource.`);
    this.ui.addLog(`${this.profile.name} rehearses ${this.calling.signatureSkill}.`);
  }

  private async targetEnemy(enemyId: string): Promise<void> {
    const enemy = this.enemies.get(enemyId);
    if (!enemy?.alive || enemy.definition.roomId !== this.encounter) return;
    this.selectedTargetId = enemyId;
    this.refreshTarget();
    this.faceActorTowards(this.player, enemy.root.position);
    if (this.selectedAction === "signature") await this.runPlayerAction(() => this.performSignature());
    else if (this.selectedAction === "basic" || this.combatStyle === "real-time") await this.runPlayerAction(() => this.performBasicAttack());
    else this.ui.setMessage(`${enemy.definition.name} targeted. Use Weapon Strike, ${this.calling.signatureSkill}, or reposition.`);
  }

  private async performBasicAttack(): Promise<void> {
    let target = this.selectedTargetId ? this.enemies.get(this.selectedTargetId) : undefined;
    if (!target?.alive || target.definition.roomId !== this.encounter) target = this.activeEnemies()[0];
    if (!target) {
      await this.previewBasicAttack();
      return;
    }
    this.selectedTargetId = target.id;
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
    this.playAnimation(this.player, "Idle");
    if (target.hp === 0) await this.defeatEnemy(target);
    else this.playFirstAvailableAnimation(target, ["HitReactionMixamo", "RecieveHit", "Defeat"], true);
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
    this.selectedTargetId = target.id;
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
      ?? this.playFirstAvailableAnimation(
        this.player,
        this.calling.signatureRange > 2
          ? ["CastProjectile", "Shoot_OneHanded", "Cast"]
          : ["SwordSlashInward", "SwordSlash", "BasicThrust"],
        true,
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
    this.playAnimation(this.player, "Idle");
    if (target.hp === 0) await this.defeatEnemy(target);
    else this.playFirstAvailableAnimation(target, ["HitReactionMixamo", "RecieveHit", "Defeat"], true);
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
    this.stability = Math.max(0, this.stability - GUARD_STABILITY_COST);
    this.lastStabilitySpendAt = now;
    this.reinforcedGuard = this.resource >= 20;
    if (this.reinforcedGuard) this.resource -= 20;
    const shadowknightMotion = this.calling.id === "shadowknight"
      ? this.playMotionArchetype(this.player, CINDER_GUARD_MOTION)
      : null;
    const animationMs = shadowknightMotion?.durationMs
      ?? this.playFirstAvailableAnimation(this.player, ["Cast", "Victory"], true);
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
    if (!this.playerMoving && this.combatState !== "defeat") this.playAnimation(this.player, "Idle");
    if (outOfCombat || this.combatStyle === "real-time") {
      window.setTimeout(() => {
        this.playerGuard = false;
        this.reinforcedGuard = false;
      }, outOfCombat ? 4000 : 1350);
    } else await this.finishPlayerTurn();
  }

  private async recover(outOfCombat = false): Promise<void> {
    const now = performance.now();
    if (now < this.recoverReadyAt) {
      this.ui.setMessage("Recovery is still on cooldown.");
      return;
    }
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
    if (!this.playerMoving && this.combatState !== "defeat") this.playAnimation(this.player, "Idle");
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
    if (this.combatStyle === "real-time") {
      await this.runRealTimeEnemyPulse();
    } else {
      for (const enemy of this.activeEnemies()) {
        await this.enemyStep(enemy);
        if (this.hp <= 0) break;
      }
    }
    this.actionBusy = false;
    if (this.hp <= 0) this.resolveDefeat();
  }

  private async runRealTimeEnemyPulse(): Promise<void> {
    const enemies = this.activeEnemies();
    if (enemies.length === 0) return;

    // Everyone advances during a pulse, but only one adjacent creature may strike.
    // This preserves visible pursuit without letting a whole pack erase a new
    // character during the same animation lock.
    for (const enemy of enemies) {
      if (manhattan(enemy.grid, this.player.grid) <= 1) continue;
      const path = findPath(enemy.grid, this.player.grid, (point) => this.isWalkable(point, enemy.id, true));
      const stepCount = enemy.definition.kind === "miniboss" ? 2 : 1;
      const pathWithoutPlayer = path.filter((point) => !samePoint(point, this.player.grid)).slice(0, stepCount);
      await this.walkActor(enemy, pathWithoutPlayer, 175 / this.combatSpeed);
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
      const path = findPath(enemy.grid, this.player.grid, (point) => this.isWalkable(point, enemy.id, true));
      const stepCount = enemy.definition.kind === "miniboss" ? 2 : 1;
      const pathWithoutPlayer = path.filter((point) => !samePoint(point, this.player.grid)).slice(0, stepCount);
      await this.walkActor(enemy, pathWithoutPlayer, 175 / this.combatSpeed);
    }
    if (manhattan(enemy.grid, this.player.grid) === 1) await this.enemyAttack(enemy);
  }

  private async enemyAttack(enemy: EnemyRuntime): Promise<void> {
    enemy.attackCount += 1;
    const isBoss = enemy.definition.kind === "miniboss";
    const isHeavy = isBoss && enemy.attackCount % 3 === 0;
    this.faceActorTowards(enemy, this.player.root.position);
    this.playFirstAvailableAnimation(enemy, ["SwordSlashOutward", "SwordSlash", "BasicThrust"], true, 1.35);
    await this.animateLunge(enemy, this.player);
    let reacted = false;
    if (isHeavy) {
      const detail = this.dungeon.bossPattern === "soul-tax" ? "Block the life-and-Stability drain" : "Meet the Warden's crossing command";
      reacted = await this.ui.requestReaction("Miniboss telegraph", detail, 1150);
    }
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
    this.playAnimation(enemy, "Idle");
    this.playFirstAvailableAnimation(this.player, ["HitReactionMixamo", "RecieveHit", "Defeat"], true);
    this.ui.addLog(`${enemy.definition.name} deals ${damage}${guarded ? " through your guard" : ""}.`);
    this.refreshStats();
    await this.delay(180 / this.combatSpeed);
    this.playAnimation(this.player, "Idle");
  }

  private async defeatEnemy(enemy: EnemyRuntime): Promise<void> {
    enemy.alive = false;
    this.playFirstAvailableAnimation(enemy, ["DeathMixamo", "Death"], true);
    enemy.label?.material.opacity && (enemy.label.material.opacity = 0.35);
    await this.delay(420 / this.combatSpeed);
    enemy.root.visible = false;
    if (this.selectedTargetId === enemy.id) this.selectedTargetId = this.activeEnemies()[0]?.id ?? null;
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

  private resolveDefeat(): void {
    this.combatState = "defeat";
    this.ui.showCombatControls(false);
    this.ui.lockCombatStyle(false);
    this.ui.setMode("defeat", this.combatStyle);
    this.ui.setObjective("Your body has fractured. Reload to generate another Soulwell crawl and awaken again.");
    this.ui.setMessage("The Soul Well remembers your pattern. This run has ended.");
    this.playFirstAvailableAnimation(this.player, ["DeathMixamo", "Death"], true);
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
    const shellMaterial = new THREE.MeshBasicMaterial({
      color: this.calling.id === "shadowknight" ? 0x8f2f25 : this.calling.signatureColor,
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
      color: this.calling.id === "shadowknight" ? 0xdf6749 : this.calling.signatureColor,
      size: 0.075,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const motes = new THREE.Points(moteGeometry, moteMaterial);
    this.player.root.add(shell, motes);
    const startedAt = performance.now();
    const animate = (now: number): void => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      motes.rotation.y += 0.026;
      motes.position.y = progress * 0.16;
      shell.scale.setScalar(0.98 + Math.sin(progress * Math.PI * 8) * 0.025);
      const fade = Math.min(1, (1 - progress) * 3.5);
      shellMaterial.opacity = 0.12 * fade;
      moteMaterial.opacity = 0.82 * fade;
      if (progress < 1 && !this.disposed) requestAnimationFrame(animate);
      else {
        shell.removeFromParent();
        motes.removeFromParent();
        shell.geometry.dispose();
        shellMaterial.dispose();
        moteGeometry.dispose();
        moteMaterial.dispose();
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

  private async animateLunge(attacker: AnimatedActor, target: AnimatedActor): Promise<void> {
    const start = attacker.root.position.clone();
    const direction = target.root.position.clone().sub(start).normalize();
    const end = start.clone().add(direction.multiplyScalar(0.48));
    await this.tween(170 / this.combatSpeed, (progress) => attacker.root.position.lerpVectors(start, end, Math.sin(progress * Math.PI)));
    attacker.root.position.copy(start);
  }

  private refreshStats(): void {
    this.ui.setStats({ hp: this.hp, stability: this.stability, fury: this.resource });
  }

  private refreshTarget(): void {
    const target = this.selectedTargetId ? this.enemies.get(this.selectedTargetId) : undefined;
    if (!target?.alive) {
      this.ui.clearTarget();
      return;
    }
    this.ui.setTarget(target.definition.name, target.hp, target.maxHp, target.definition.kind === "miniboss");
  }

  private installDebugBridge(): void {
    if (!import.meta.env.DEV) return;
    const bridge: DebugBridge = {
      snapshot: () => this.debugSnapshot(),
      moveTo: async (x, y) => this.handleGroundClick({ x, y }),
      interact: async (id) => this.interactById(id),
      target: async (id) => this.targetEnemy(id),
      action: async (action) => this.handleAction(action),
      setCombatStyle: (style) => {
        const select = requiredElement<HTMLSelectElement>("combat-style");
        if (!select.disabled) this.setCombatStylePreference(style);
      },
      activeBlock: () => {
        const prompt = requiredElement<HTMLElement>("reaction-prompt");
        if (!prompt.hidden) prompt.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      },
      pose: (animation, normalizedTime) => {
        const clipName = [...this.player.clips.keys()]
          .find((name) => name.toLowerCase() === animation.toLowerCase());
        if (!clipName) throw new Error(`Unknown player animation: ${animation}`);
        const clip = this.player.clips.get(clipName)!;
        this.player.currentAction?.stop();
        const action = this.player.mixer.clipAction(clip);
        action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
        action.paused = false;
        this.player.mixer.setTime(clip.duration * THREE.MathUtils.clamp(normalizedTime, 0, 1));
        action.paused = true;
        this.player.currentAction = action;
      },
      weapon: (state) => this.setWeaponState(this.player, state),
      weaponSocket: (position, rotation) => {
        if (!this.player.weapon) return;
        this.player.weapon.hipSocket.position.fromArray(position);
        this.player.weapon.hipSocket.rotation.set(...rotation);
        this.player.weapon.hipSocket.updateMatrixWorld(true);
      },
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
      else if (command.type === "pose" && command.animation) { bridge.pose(command.animation, command.normalizedTime ?? 0); publish(); }
      else if (command.type === "weapon" && command.weaponState) { bridge.weapon(command.weaponState); publish(); }
      else if (command.type === "weapon-socket" && command.position && command.rotation) {
        bridge.weaponSocket(command.position, command.rotation);
        publish();
      }
  }

  private debugSnapshot(): DebugSnapshot {
    const bounds = actorBodyBounds(this.player.model);
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
    const viewport = this.renderer.getSize(new THREE.Vector2());
    return {
      seed: this.seed,
      realmPressure: this.realmPressure,
      room: this.currentRoom,
      player: { ...this.player.grid, hp: this.hp, stability: this.stability, resource: this.resource },
      combatStyle: this.combatStyle,
      combatState: this.combatState,
      encounter: this.encounter,
      enemies: [...this.enemies.values()].map((enemy) => ({
        id: enemy.id,
        ...enemy.grid,
        hp: enemy.hp,
        alive: enemy.alive,
        roomId: enemy.definition.roomId,
      })),
      npcs: [...this.npcs.values()].map((npc) => ({ id: npc.id, ...npc.grid })),
      objects: [...this.storyObjects.values()].map((object) => ({ id: object.id, kind: object.kind, ...object.grid })),
      rooms: this.dungeon.rooms.map((room) => ({ id: room.id, center: room.center })),
      revealedRooms: [...this.revealedRooms],
      inventory: [...this.inventory],
      complete: this.complete,
      recoveryCharges: this.recoveryCharges,
      trialDifficulty: this.trialDifficulty,
      selectedTargetId: this.selectedTargetId,
      playerAnimation: this.player.currentAction?.getClip().name ?? "none",
      playerAnimationTime: Number((this.player.currentAction?.time ?? 0).toFixed(3)),
      playerAnimationDuration: Number((this.player.currentAction?.getClip().duration ?? 0).toFixed(3)),
      playerWeaponState: this.player.weapon?.state ?? "none",
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
      playerBounds: {
        minY: Number(bounds.min.y.toFixed(3)),
        maxY: Number(bounds.max.y.toFixed(3)),
        height: Number((bounds.max.y - bounds.min.y).toFixed(3)),
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
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.player?.mixer.update(delta);
    this.npcs.forEach((actor) => actor.mixer.update(delta));
    this.enemies.forEach((actor) => actor.mixer.update(delta));
    if (this.player) this.groundActor(this.player);
    this.npcs.forEach((actor) => this.groundActor(actor));
    this.enemies.forEach((actor) => this.groundActor(actor));
    const elapsed = this.clock.getElapsed();
    this.updateStabilityRecovery(delta);
    this.environmentAnimators.forEach((animate) => animate(elapsed, delta));
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
      if (!this.actionBusy && !this.playerMoving) this.realTimeTimer += delta * 1000;
      if (this.realTimeTimer >= 1450 / this.combatSpeed && !this.actionBusy && !this.playerMoving) {
        this.realTimeTimer = 0;
        void this.runEnemyRound();
      }
    }
    this.updateCamera(false, delta);
    this.updateOcclusion();
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(() => this.render());
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
    const room = this.dungeon.rooms.find((candidate) => candidate.id === this.currentRoom)!;
    const roomCenter = new THREE.Vector2(room.center.x * TILE_SIZE, room.center.y * TILE_SIZE);
    const roomBounds = new THREE.Vector2(room.width * TILE_SIZE * 0.5, room.height * TILE_SIZE * 0.5);
    const playerPosition = new THREE.Vector2(this.player.root.position.x, this.player.root.position.z);
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
    const direction = this.player.root.position.clone().sub(this.camera.position);
    const distance = direction.length();
    this.raycaster.set(this.camera.position, direction.normalize());
    const hits = this.raycaster.intersectObjects(this.occluders, false).filter((hit) => hit.distance < distance);
    for (const hit of hits) {
      const material = (hit.object as THREE.Mesh).material as THREE.MeshStandardMaterial;
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
