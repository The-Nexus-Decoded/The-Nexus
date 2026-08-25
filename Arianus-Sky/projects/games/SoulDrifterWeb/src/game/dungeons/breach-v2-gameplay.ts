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

export interface BreachV2EncounterState {
  id: string;
  roomId: string;
  kind: "gallery" | "boss";
  enemyHp: number;
  enemyMaxHp: number;
}

export interface BreachV2RunState {
  schemaVersion: 1;
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

function initialState(config: BreachV2RunConfig): BreachV2RunState {
  return {
    schemaVersion: 1,
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
    exitedToHeartvale: false,
    statusMessage: "Speak with Wellkeeper Ilyra beside the Soul Well.",
    revision: 0,
    savedAt: new Date(0).toISOString(),
  };
}

function restoreState(config: BreachV2RunConfig): BreachV2RunState {
  const candidate = config.savedState as Partial<BreachV2RunState> | null | undefined;
  if (
    candidate?.schemaVersion !== 1
    || candidate.seed !== config.seed
    || candidate.path !== config.path
    || !candidate.tutorial
    || !Array.isArray(candidate.clearedRoomIds)
    || !Array.isArray(candidate.rewardIds)
  ) return initialState(config);
  return cloneState(candidate as BreachV2RunState);
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
    if (!state.tutorial.cofferOpened) return "Open the Wayfarer's Coffer and equip the starter weapon.";
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
      if (!state.tutorial.cofferOpened) state.tutorial.cofferOpened = true;
      return this.commit("Starter weapon and tempered training gear equipped.");
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
