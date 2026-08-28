import { CombatEngine } from "../combat";
import type { ActorState, CombatStyle } from "../types";
import type { BreachV2PathId } from "./breach-v2-generator";

export type BreachV2RunPhase =
  | "tutorial"
  | "route-choice"
  | "galleries"
  | "boss"
  | "memory"
  | "exit"
  | "complete"
  | "defeat";

export const BREACH_V2_RUN_SCHEMA_VERSION = 2 as const;

export interface BreachV2EncounterState {
  id: string;
  roomId: string;
  kind: "gallery" | "boss";
  enemyHp: number;
  enemyMaxHp: number;
}

export type BreachV2DestructionClass =
  | "INTERACTABLE_CONTAINER"
  | "DESTRUCTIBLE_SOLID_PROP"
  | "PROTECTED_PROP_OR_STRUCTURE";

export interface BreachV2EnvironmentObjectConfig {
  id: string;
  label: string;
  destructionClass: BreachV2DestructionClass;
  durability: number;
  protectionReason?: string;
}

export interface BreachV2EnvironmentState {
  cofferObjectId: string;
  cofferOpened: boolean;
  pickupDropped: boolean;
  pickupCollected: boolean;
  deterministicItemId: string;
  collectedItemIds: string[];
  objectHitPoints: Record<string, number>;
  destroyedObjectIds: string[];
  removedColliderIds: string[];
  debrisObjectIds: string[];
}

export interface BreachV2EnvironmentDamageResult {
  accepted: boolean;
  destroyed: boolean;
  message: string;
}

export interface BreachV2RunState {
  schemaVersion: typeof BREACH_V2_RUN_SCHEMA_VERSION;
  seed: number;
  path: BreachV2PathId;
  phase: BreachV2RunPhase;
  combatStyle: CombatStyle;
  tutorial: {
    chronicleRead: boolean;
    imprintSealed: boolean;
    cofferOpened: boolean;
    trainingComplete: boolean;
  };
  routeChosen: boolean;
  clearedRoomIds: string[];
  activeEncounter: BreachV2EncounterState | null;
  playerHp: number;
  playerMaxHp: number;
  playerGuard: boolean;
  bossDefeated: boolean;
  firstMemoryClaimed: boolean;
  rewardGranted: boolean;
  rewardIds: string[];
  environment: BreachV2EnvironmentState;
  exitedToHeartvale: boolean;
  statusMessage: string;
  revision: number;
  savedAt: string;
}

export interface BreachV2RunConfig {
  seed: number;
  path: BreachV2PathId;
  chamberIds: readonly string[];
  rewardId: string;
  bossHp: number;
  cofferObjectId?: string;
  deterministicTestItemId?: string;
  environmentObjects?: readonly BreachV2EnvironmentObjectConfig[];
  savedState?: unknown;
  onChange?: (state: BreachV2RunState) => void;
}

export interface DoorRequestResult {
  allowed: boolean;
  message: string;
}

function cloneState(state: BreachV2RunState): BreachV2RunState {
  return structuredClone(state);
}

function tutorialComplete(state: BreachV2RunState): boolean {
  return Object.values(state.tutorial).every(Boolean);
}

const MAX_ACTIVE_DEBRIS_RECORDS = 8;

function initialEnvironmentState(config: BreachV2RunConfig): BreachV2EnvironmentState {
  return {
    cofferObjectId: config.cofferObjectId ?? "vestibule:storage-chest",
    cofferOpened: false,
    pickupDropped: false,
    pickupCollected: false,
    deterministicItemId: config.deterministicTestItemId
      ?? `breach-v2-starter-${config.seed}-${config.path}`,
    collectedItemIds: [],
    objectHitPoints: {},
    destroyedObjectIds: [],
    removedColliderIds: [],
    debrisObjectIds: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizedStringArray(value: unknown, fallback: readonly string[] = []): string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string")
    ? [...new Set(value)]
    : [...fallback];
}

function normalizedHitPoints(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => (
    typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] >= 0
  )));
}

function normalizeEnvironmentState(
  config: BreachV2RunConfig,
  value: unknown,
  migrateLegacyCoffer: boolean,
): BreachV2EnvironmentState {
  const initial = initialEnvironmentState(config);
  if (!isRecord(value)) {
    if (migrateLegacyCoffer) {
      initial.cofferOpened = true;
      initial.pickupDropped = true;
      initial.pickupCollected = true;
      initial.collectedItemIds.push(initial.deterministicItemId);
      initial.removedColliderIds.push(initial.cofferObjectId);
    }
    return initial;
  }

  const booleanValue = (key: string, fallback: boolean): boolean => (
    typeof value[key] === "boolean" ? value[key] : fallback
  );
  const stringValue = (key: string, fallback: string): string => (
    typeof value[key] === "string" && value[key].length > 0 ? value[key] : fallback
  );
  const hasExplicitCofferState = ["cofferOpened", "pickupDropped", "pickupCollected"]
    .some((key) => typeof value[key] === "boolean");
  const environment: BreachV2EnvironmentState = {
    cofferObjectId: stringValue("cofferObjectId", initial.cofferObjectId),
    cofferOpened: booleanValue("cofferOpened", initial.cofferOpened),
    pickupDropped: booleanValue("pickupDropped", initial.pickupDropped),
    pickupCollected: booleanValue("pickupCollected", initial.pickupCollected),
    deterministicItemId: stringValue("deterministicItemId", initial.deterministicItemId),
    collectedItemIds: normalizedStringArray(value.collectedItemIds),
    objectHitPoints: normalizedHitPoints(value.objectHitPoints),
    destroyedObjectIds: normalizedStringArray(value.destroyedObjectIds),
    removedColliderIds: normalizedStringArray(value.removedColliderIds),
    debrisObjectIds: normalizedStringArray(value.debrisObjectIds).slice(-MAX_ACTIVE_DEBRIS_RECORDS),
  };
  if (migrateLegacyCoffer && !hasExplicitCofferState) {
    environment.cofferOpened = true;
    environment.pickupDropped = true;
    environment.pickupCollected = true;
    if (!environment.collectedItemIds.includes(environment.deterministicItemId)) {
      environment.collectedItemIds.push(environment.deterministicItemId);
    }
    if (!environment.removedColliderIds.includes(environment.cofferObjectId)) {
      environment.removedColliderIds.push(environment.cofferObjectId);
    }
  }
  return environment;
}

function initialState(config: BreachV2RunConfig): BreachV2RunState {
  return {
    schemaVersion: BREACH_V2_RUN_SCHEMA_VERSION,
    seed: config.seed,
    path: config.path,
    phase: "tutorial",
    combatStyle: "real-time",
    tutorial: {
      chronicleRead: false,
      imprintSealed: false,
      cofferOpened: false,
      trainingComplete: false,
    },
    routeChosen: false,
    clearedRoomIds: [],
    activeEncounter: null,
    playerHp: 42,
    playerMaxHp: 42,
    playerGuard: false,
    bossDefeated: false,
    firstMemoryClaimed: false,
    rewardGranted: false,
    rewardIds: [],
    environment: initialEnvironmentState(config),
    exitedToHeartvale: false,
    statusMessage: "Speak with Wellkeeper Ilyra beside the Soul Well.",
    revision: 0,
    savedAt: new Date(0).toISOString(),
  };
}

function restoreState(config: BreachV2RunConfig): BreachV2RunState {
  const candidate = config.savedState as (
    Partial<Omit<BreachV2RunState, "schemaVersion" | "environment">>
    & { schemaVersion?: unknown; environment?: unknown }
  ) | null | undefined;
  if (
    (candidate?.schemaVersion !== 1 && candidate?.schemaVersion !== BREACH_V2_RUN_SCHEMA_VERSION)
    || candidate.seed !== config.seed
    || candidate.path !== config.path
    || !candidate.tutorial
    || !Array.isArray(candidate.clearedRoomIds)
    || !Array.isArray(candidate.rewardIds)
  ) return initialState(config);
  const restored = cloneState(candidate as unknown as BreachV2RunState);
  const legacyCoffer = candidate.schemaVersion === 1
    && restored.tutorial.cofferOpened
    && (!isRecord(candidate.environment)
      || !("cofferOpened" in candidate.environment)
      || !("pickupDropped" in candidate.environment)
      || !("pickupCollected" in candidate.environment));
  restored.schemaVersion = BREACH_V2_RUN_SCHEMA_VERSION;
  restored.environment = normalizeEnvironmentState(config, candidate.environment, legacyCoffer);
  return restored;
}

function actor(id: "player" | "sentinel", hp: number, maxHp: number, guard = false): ActorState {
  return {
    id,
    name: id === "player" ? "SoulDrifter" : "Cinderbound foe",
    x: id === "player" ? 0 : 1,
    y: 0,
    hp,
    maxHp,
    movement: 4,
    guard,
    alive: hp > 0,
  };
}

export class BreachV2RunController {
  private state: BreachV2RunState;
  private realTimeEnemyElapsedMs = 0;

  public constructor(private readonly config: BreachV2RunConfig) {
    this.state = restoreState(config);
  }

  public snapshot(): BreachV2RunState {
    return cloneState(this.state);
  }

  public objective(): string {
    const state = this.state;
    if (!state.tutorial.chronicleRead) return "Read Ilyra's Chronicle of Returning.";
    if (!state.tutorial.imprintSealed) return "Seal three stat threads, one ancestry boon, and one discipline at the Memory Loom.";
    if (!state.environment.cofferOpened) return "Open the Wayfarer's Coffer.";
    if (!state.tutorial.cofferOpened) return "Collect the dropped starter weapon once.";
    if (!state.tutorial.trainingComplete) return "Complete the level-one rehearsal at the training effigy.";
    if (!state.routeChosen) return `Open the ${state.path === "wayfarer" ? "Wayfarer" : "Oathbreaker"} gate.`;
    if (state.activeEncounter) return `Defeat ${state.activeEncounter.kind === "boss" ? "the Cinderbound Warden" : state.activeEncounter.roomId}.`;
    const nextRoom = this.config.chamberIds.find((roomId) => !state.clearedRoomIds.includes(roomId));
    if (nextRoom) return `Enter and clear ${nextRoom}.`;
    if (!state.bossDefeated) return "Enter the Ashen Lock and defeat the Cinderbound Warden.";
    if (!state.firstMemoryClaimed) return "Claim the First Memory in the vault.";
    if (!state.exitedToHeartvale) return "Climb the Way Upward and cross the Heartvale threshold.";
    return "The First Breach run is complete and saved.";
  }

  public interact(targetId: string): string {
    const state = this.state;
    if (targetId === "ilyra") {
      if (!state.tutorial.chronicleRead) state.tutorial.chronicleRead = true;
      return this.commit("Ilyra's Chronicle is remembered. The Memory Loom answers.");
    }
    if (targetId === "memory-loom") {
      if (!state.tutorial.chronicleRead) return this.commit("The Loom remains silent until Ilyra's Chronicle is heard.");
      if (!state.tutorial.imprintSealed) state.tutorial.imprintSealed = true;
      return this.commit("Soul Imprint sealed: three stat threads, ancestry boon, and base discipline recorded.");
    }
    if (targetId === "coffer") {
      if (!state.tutorial.imprintSealed) return this.commit("The coffer's seal waits for the completed Soul Imprint.");
      if (state.environment.cofferOpened) return this.commit("The coffer remains open and cannot duplicate its test item.");
      state.environment.cofferOpened = true;
      state.environment.pickupDropped = true;
      if (!state.environment.removedColliderIds.includes(state.environment.cofferObjectId)) {
        state.environment.removedColliderIds.push(state.environment.cofferObjectId);
      }
      return this.commit("The coffer lid opens and drops one deterministic starter weapon.");
    }
    if (targetId === "coffer-pickup") {
      if (!state.environment.pickupDropped) return this.commit("No starter pickup has been released.");
      if (state.environment.pickupCollected) return this.commit("The starter pickup was already collected; no duplicate is created.");
      state.environment.pickupCollected = true;
      state.tutorial.cofferOpened = true;
      if (!state.environment.collectedItemIds.includes(state.environment.deterministicItemId)) {
        state.environment.collectedItemIds.push(state.environment.deterministicItemId);
      }
      return this.commit("Starter weapon collected exactly once. The training effigy is ready.");
    }
    if (targetId === "effigy") {
      if (!state.tutorial.cofferOpened) return this.commit("Take up the starter weapon before rehearsing level-one actions.");
      if (!state.tutorial.trainingComplete) state.tutorial.trainingComplete = true;
      state.phase = "route-choice";
      return this.commit("Level-one rehearsal complete. The paired trial gates are unlocked.");
    }
    if (targetId === "first-memory") {
      if (!state.bossDefeated) return this.commit("The First Memory remains sealed while the Warden stands.");
      if (!state.firstMemoryClaimed) {
        state.firstMemoryClaimed = true;
        state.phase = "exit";
      }
      if (!state.rewardGranted) {
        state.rewardGranted = true;
        if (!state.rewardIds.includes(this.config.rewardId)) state.rewardIds.push(this.config.rewardId);
      }
      return this.commit("First Memory recovered once. The Way Upward is open.");
    }
    if (targetId === "heartvale-exit") {
      if (!state.firstMemoryClaimed) return this.commit("The Heartvale threshold is still bound to the First Memory.");
      state.exitedToHeartvale = true;
      state.phase = "complete";
      return this.commit("Heartvale hv-1 reached. The completed run has been saved.");
    }
    return this.commit("Nothing in the Soulwell pattern answers that interaction.");
  }

  public damageEnvironmentObject(targetId: string, damage = Number.POSITIVE_INFINITY): BreachV2EnvironmentDamageResult {
    const target = this.config.environmentObjects?.find((candidate) => candidate.id === targetId);
    if (!target) {
      const message = "That environment object has no registered destruction contract.";
      this.commit(message);
      return { accepted: false, destroyed: false, message };
    }
    if (target.destructionClass !== "DESTRUCTIBLE_SOLID_PROP") {
      const message = `${target.label} is protected: ${target.protectionReason ?? "structural or progression authority"}.`;
      this.commit(message);
      return { accepted: false, destroyed: false, message };
    }
    if (this.state.environment.destroyedObjectIds.includes(targetId)) {
      const message = `${target.label} is already destroyed; repeated damage creates no duplicate debris or drop.`;
      this.commit(message);
      return { accepted: true, destroyed: true, message };
    }
    const current = this.state.environment.objectHitPoints[targetId] ?? Math.max(1, target.durability);
    const next = Math.max(0, current - Math.max(0, damage));
    this.state.environment.objectHitPoints[targetId] = next;
    if (next > 0) {
      const message = `${target.label} has ${next} durability remaining.`;
      this.commit(message);
      return { accepted: true, destroyed: false, message };
    }
    this.state.environment.destroyedObjectIds.push(targetId);
    if (!this.state.environment.removedColliderIds.includes(targetId)) {
      this.state.environment.removedColliderIds.push(targetId);
    }
    this.state.environment.debrisObjectIds.push(targetId);
    this.state.environment.debrisObjectIds.splice(
      0,
      Math.max(0, this.state.environment.debrisObjectIds.length - MAX_ACTIVE_DEBRIS_RECORDS),
    );
    const message = `${target.label} destroyed; its movement, line-of-sight, camera, and interaction collider is removed.`;
    this.commit(message);
    return { accepted: true, destroyed: true, message };
  }

  public cleanupEnvironmentDebris(targetId?: string): void {
    const previous = this.state.environment.debrisObjectIds.length;
    this.state.environment.debrisObjectIds = targetId
      ? this.state.environment.debrisObjectIds.filter((id) => id !== targetId)
      : [];
    if (this.state.environment.debrisObjectIds.length !== previous) {
      this.commit("Bounded destruction debris cleaned without restoring the destroyed collider.");
    }
  }

  public requestDoor(doorId: string): DoorRequestResult {
    const deny = (message: string): DoorRequestResult => {
      this.commit(message);
      return { allowed: false, message };
    };
    const allow = (message: string): DoorRequestResult => ({ allowed: true, message });
    const tutorialReady = tutorialComplete(this.state);

    if (doorId === "wayfarer-choice" || doorId === "oathbreaker-choice") {
      if (!tutorialReady) return deny("Complete Ilyra, the Loom, coffer, and effigy before choosing a trial.");
      if (doorId !== `${this.state.path}-choice`) return deny("That route is sealed for this run.");
      if (!this.state.routeChosen) {
        this.state.routeChosen = true;
        this.state.phase = "galleries";
        this.commit(`${this.state.path === "wayfarer" ? "Wayfarer" : "Oathbreaker"} oath recorded. The gallery crawl begins.`);
      }
      return allow("Selected route unlocked.");
    }
    if (doorId === "vestibule-link" || doorId === "threshold-entry") {
      return tutorialReady ? allow("Tutorial threshold unlocked.") : deny("The Realm-Lock tutorial is not complete.");
    }
    if (doorId.endsWith("-entry") && doorId.startsWith("chamber-")) {
      const roomId = doorId.slice(0, -"-entry".length);
      const index = this.config.chamberIds.indexOf(roomId);
      const priorCleared = index === 0 || this.config.chamberIds.slice(0, index).every((id) => this.state.clearedRoomIds.includes(id));
      return this.state.routeChosen && priorCleared
        ? allow("Gallery threshold unlocked.")
        : deny("The preceding gallery remains uncleared.");
    }
    const galleriesCleared = this.config.chamberIds.every((id) => this.state.clearedRoomIds.includes(id));
    if (["convergence-lock", "ashen-threshold", "boss-lock"].includes(doorId)) {
      return galleriesCleared ? allow("The route to the Ashen Lock is open.") : deny("The selected galleries are not yet clear.");
    }
    if (doorId === "memory-vault") {
      return this.state.bossDefeated ? allow("The Warden's lock is broken.") : deny("The First Memory Vault is sealed by the Warden.");
    }
    if (doorId === "way-upward" || doorId === "heartvale-threshold") {
      return this.state.firstMemoryClaimed ? allow("The First Memory opens the upward road.") : deny("Recover the First Memory before leaving the vault.");
    }
    return allow("Door unlocked.");
  }

  public enterRoom(roomId: string): void {
    if (this.state.activeEncounter || this.state.phase === "defeat" || this.state.phase === "complete") return;
    const chamberIndex = this.config.chamberIds.indexOf(roomId);
    if (chamberIndex >= 0) {
      if (!this.state.routeChosen || this.state.clearedRoomIds.includes(roomId)) return;
      const priorCleared = this.config.chamberIds.slice(0, chamberIndex).every((id) => this.state.clearedRoomIds.includes(id));
      if (!priorCleared) return;
      const baseHp = 16 + chamberIndex * 3;
      const multiplier = this.state.path === "oathbreaker" ? 1.55 : 1;
      this.beginEncounter(roomId, "gallery", Math.round(baseHp * multiplier));
      return;
    }
    if (roomId === "ashen-lock" && !this.state.bossDefeated) {
      const galleriesCleared = this.config.chamberIds.every((id) => this.state.clearedRoomIds.includes(id));
      if (galleriesCleared) this.beginEncounter(roomId, "boss", this.config.bossHp);
    }
  }

  public setCombatStyle(style: CombatStyle): void {
    if (this.state.combatStyle === style) return;
    this.state.combatStyle = style;
    this.realTimeEnemyElapsedMs = 0;
    this.commit(`${style === "real-time" ? "Real-time" : "Turn-based"} combat selected; the same encounter state is retained.`);
  }

  public attack(): void {
    const encounter = this.state.activeEncounter;
    if (!encounter || this.state.phase === "defeat") return;
    const engine = this.engineFor(encounter);
    engine.damage("sentinel", 10);
    this.syncEngine(engine);
    if (engine.state === "victory") {
      this.finishEncounter(encounter);
      return;
    }
    if (this.state.combatStyle === "turn-based") this.enemyStrike();
    else this.commit(`Hit ${encounter.kind === "boss" ? "the Warden" : encounter.roomId} for 10.`);
  }

  public guard(): void {
    if (!this.state.activeEncounter || this.state.phase === "defeat") return;
    this.state.playerGuard = true;
    if (this.state.combatStyle === "turn-based") this.enemyStrike();
    else this.commit("Guard raised for the next hostile strike.");
  }

  public recover(): void {
    if (!this.state.activeEncounter || this.state.phase === "defeat") return;
    this.state.playerHp = Math.min(this.state.playerMaxHp, this.state.playerHp + 6);
    if (this.state.combatStyle === "turn-based") this.enemyStrike();
    else this.commit("Recovered 6 vitality.");
  }

  public tick(deltaMs: number): void {
    if (this.state.combatStyle !== "real-time" || !this.state.activeEncounter || this.state.phase === "defeat") return;
    this.realTimeEnemyElapsedMs += Math.max(0, deltaMs);
    if (this.realTimeEnemyElapsedMs < 1250) return;
    this.realTimeEnemyElapsedMs %= 1250;
    this.enemyStrike();
  }

  public restartEncounter(): void {
    if (this.state.phase !== "defeat" || !this.state.activeEncounter) return;
    this.state.playerHp = this.state.playerMaxHp;
    this.state.playerGuard = false;
    this.state.activeEncounter.enemyHp = this.state.activeEncounter.enemyMaxHp;
    this.state.phase = this.state.activeEncounter.kind === "boss" ? "boss" : "galleries";
    this.commit("The Soul Well restores the current encounter without rerolling the run.");
  }

  private beginEncounter(roomId: string, kind: "gallery" | "boss", enemyHp: number): void {
    this.state.activeEncounter = {
      id: kind === "boss" ? "cinderbound-warden" : `${roomId}-encounter`,
      roomId,
      kind,
      enemyHp,
      enemyMaxHp: enemyHp,
    };
    this.state.phase = kind === "boss" ? "boss" : "galleries";
    this.realTimeEnemyElapsedMs = 0;
    this.commit(kind === "boss" ? "The Cinderbound Warden awakens." : `${roomId} encounter engaged.`);
  }

  private engineFor(encounter: BreachV2EncounterState): CombatEngine {
    const engine = new CombatEngine(
      actor("player", this.state.playerHp, this.state.playerMaxHp, this.state.playerGuard),
      actor("sentinel", encounter.enemyHp, encounter.enemyMaxHp),
    );
    engine.begin(this.state.combatStyle);
    return engine;
  }

  private syncEngine(engine: CombatEngine): void {
    this.state.playerHp = engine.actors.player.hp;
    this.state.playerGuard = engine.actors.player.guard;
    if (this.state.activeEncounter) this.state.activeEncounter.enemyHp = engine.actors.sentinel.hp;
  }

  private enemyStrike(): void {
    const encounter = this.state.activeEncounter;
    if (!encounter) return;
    const engine = this.engineFor(encounter);
    const baseDamage = encounter.kind === "boss" ? 7 : 4;
    const damage = Math.round(baseDamage * (this.state.path === "oathbreaker" ? 1.22 : 1));
    const resolved = engine.damage("player", damage);
    this.syncEngine(engine);
    this.state.playerGuard = false;
    if (engine.state === "defeat") {
      this.state.phase = "defeat";
      this.commit("The SoulDrifter fell. Restore this exact encounter from the Soul Well.");
      return;
    }
    this.commit(`${encounter.kind === "boss" ? "The Warden" : "The gallery foe"} struck for ${resolved}.`);
  }

  private finishEncounter(encounter: BreachV2EncounterState): void {
    if (encounter.kind === "boss") {
      this.state.bossDefeated = true;
      this.state.phase = "memory";
    } else if (!this.state.clearedRoomIds.includes(encounter.roomId)) {
      this.state.clearedRoomIds.push(encounter.roomId);
      this.state.phase = "galleries";
    }
    this.state.activeEncounter = null;
    this.state.playerGuard = false;
    this.commit(encounter.kind === "boss" ? "The Cinderbound Warden is defeated. The First Memory Vault opens." : `${encounter.roomId} cleared.`);
  }

  private commit(message: string): string {
    this.state.statusMessage = message;
    this.state.revision += 1;
    this.state.savedAt = new Date().toISOString();
    this.config.onChange?.(this.snapshot());
    return message;
  }
}

export function createBreachV2RunController(config: BreachV2RunConfig): BreachV2RunController {
  return new BreachV2RunController(config);
}
