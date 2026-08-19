/**
 * The Heartvale quest engine — modular runtime around the JSON quest DB.
 *
 * Design goals (owner-directed):
 * - Modular: definitions DB, overrides DB, templates, and player state are
 *   independent documents; the engine is the only thing that combines them.
 * - Live-modifiable: a GM or AI agent can patch, retire, inject, and
 *   time-box quests at runtime; every change is audited and replayable.
 * - Debuggable: every engine action appends to a bounded in-memory event
 *   log; debugSnapshot() dumps the entire engine state as JSON.
 * - Real-time: daily template instances rotate by date seed (identical for
 *   every player), and expiring quests retire on tick().
 */

import {
  acceptQuest,
  canAccept,
  createQuestLog,
  questStatus,
  recordQuestEvent,
  turnInQuest,
  type QuestDefinition,
  type QuestLogState,
  type QuestObjectiveKind,
  type QuestStatus,
  type WorldMutation,
} from "../quests.ts";
import { effectiveQuests } from "./gm.ts";
import type { QuestDefinitionsDb, QuestOverridesDb, StoredQuest } from "./schema.ts";
import { dailyInstances, isExpired, type TemplateContext } from "./templates.ts";

export type QuestEngineEventKind =
  | "engine.loaded"
  | "quest.offered"
  | "quest.accepted"
  | "quest.progress"
  | "quest.ready"
  | "quest.completed"
  | "quest.expired"
  | "template.instantiated"
  | "override.applied";

export interface QuestEngineEvent {
  at: string;
  kind: QuestEngineEventKind;
  questId?: string;
  detail?: string;
}

const DEBUG_LOG_LIMIT = 200;

export interface EngineSnapshot {
  quests: Array<{ id: string; name: string; status: QuestStatus; origin: string }>;
  retiredQuestIds: string[];
  eventLog: QuestEngineEvent[];
}

export class QuestEngine {
  private definitions: QuestDefinitionsDb;
  private overrides: QuestOverridesDb;
  private questLog: QuestLogState;
  private dynamic: StoredQuest[] = [];
  private readonly events: QuestEngineEvent[] = [];
  private readonly templateContext: Omit<TemplateContext, "date">;

  public constructor(input: {
    definitions: QuestDefinitionsDb;
    overrides: QuestOverridesDb;
    questLog?: QuestLogState;
    templateContext: Omit<TemplateContext, "date">;
  }) {
    this.definitions = input.definitions;
    this.overrides = input.overrides;
    this.questLog = input.questLog ?? createQuestLog();
    this.templateContext = input.templateContext;
    this.log("engine.loaded", undefined, `${input.definitions.quests.length} authored quests, ${input.definitions.templates.length} templates`);
  }

  // --- Effective quest list ---------------------------------------------------

  /** All quests currently in force: authored + overrides + live dynamics. */
  public quests(): StoredQuest[] {
    const view = effectiveQuests(this.definitions, this.overrides);
    return [...view.quests, ...this.dynamic.filter((quest) => !view.retiredQuestIds.has(quest.id))];
  }

  public questById(id: string): StoredQuest {
    const quest = this.quests().find((candidate) => candidate.id === id);
    if (!quest) throw new Error(`Unknown quest: ${id}`);
    return quest;
  }

  public statusOf(id: string): QuestStatus {
    return questStatus(this.questLog, this.questById(id) as QuestDefinition);
  }

  /** Quests an NPC can offer right now (available + prerequisites met). */
  public offeredBy(npcId: string): StoredQuest[] {
    return this.quests().filter(
      (quest) => quest.giverNpcId === npcId && canAccept(this.questLog, quest as QuestDefinition),
    );
  }

  /** Quests turnable-in at an NPC right now. */
  public turnableAt(npcId: string): StoredQuest[] {
    return this.quests().filter(
      (quest) => quest.turnInNpcId === npcId && this.statusOf(quest.id) === "ready-to-turn-in",
    );
  }

  // --- Player actions -----------------------------------------------------------

  public accept(id: string): void {
    const quest = this.questById(id);
    this.questLog = acceptQuest(this.questLog, quest as QuestDefinition);
    this.log("quest.accepted", id, quest.name);
  }

  /** Feed a world event (kill/collect/find/talk/escort/puzzle) into the log. */
  public event(kind: QuestObjectiveKind, targetId: string, amount = 1): string[] {
    const before = new Map(this.quests().map((quest) => [quest.id, this.statusOf(quest.id)]));
    this.questLog = recordQuestEvent(
      this.questLog,
      this.quests() as QuestDefinition[],
      { kind, targetId, amount },
    );
    const readyNow: string[] = [];
    for (const quest of this.quests()) {
      const after = this.statusOf(quest.id);
      if (before.get(quest.id) === "active" && after === "ready-to-turn-in") {
        readyNow.push(quest.id);
        this.log("quest.ready", quest.id, quest.name);
      } else if (before.get(quest.id) === "active" && after === "active") {
        this.log("quest.progress", quest.id, `${kind}:${targetId}+${amount}`);
      }
    }
    return readyNow;
  }

  public turnIn(id: string, at: string): { xp: number; coin: number; itemIds: readonly string[]; mutation?: WorldMutation } {
    const quest = this.questById(id);
    const result = turnInQuest(this.questLog, quest as QuestDefinition, at);
    this.questLog = result.log;
    this.log("quest.completed", id, quest.name);
    return { ...result.rewards, mutation: result.mutation };
  }

  // --- Live / rotating content ----------------------------------------------------

  /** Instantiate today's daily templates (idempotent per date). */
  public rotateDailies(date: string): StoredQuest[] {
    const context: TemplateContext = { ...this.templateContext, date };
    const activeTemplateIds = new Set(
      this.definitions.templates
        .filter((template) => !effectiveQuests(this.definitions, this.overrides).retiredTemplateIds.has(template.id))
        .map((template) => template.id),
    );
    const instances = dailyInstances(
      this.definitions.templates.filter((template) => activeTemplateIds.has(template.id)),
      context,
    );
    for (const instance of instances) {
      if (this.dynamic.some((quest) => quest.id === instance.id)) continue;
      this.dynamic.push(instance);
      this.log("template.instantiated", instance.id, `${instance.name} (${date})`);
    }
    return instances;
  }

  /** GM/AI live injection during a session (persist separately via gm.ts). */
  public injectLive(quest: StoredQuest): void {
    if (this.quests().some((candidate) => candidate.id === quest.id)) {
      throw new Error(`Quest id already in force: ${quest.id}`);
    }
    this.dynamic.push({ ...quest, origin: quest.origin ?? "gm" });
    this.log("quest.offered", quest.id, `live injection: ${quest.name}`);
  }

  /** Retire expired, uncompleted dynamic quests. Returns retired ids. */
  public tick(now: Date): string[] {
    const retired: string[] = [];
    this.dynamic = this.dynamic.filter((quest) => {
      if (!isExpired(quest, now)) return true;
      if (this.statusOf(quest.id) === "completed") return true;
      retired.push(quest.id);
      this.log("quest.expired", quest.id, quest.name);
      return false;
    });
    return retired;
  }

  // --- Debug surface ----------------------------------------------------------------

  public get state(): QuestLogState {
    return this.questLog;
  }

  public restore(state: QuestLogState): void {
    this.questLog = state;
  }

  public setOverrides(overrides: QuestOverridesDb): void {
    this.overrides = overrides;
    this.log("override.applied", undefined, `${overrides.entries.length} revisions in force`);
  }

  public getOverrides(): QuestOverridesDb {
    return this.overrides;
  }

  private log(kind: QuestEngineEventKind, questId?: string, detail?: string): void {
    this.events.push({ at: new Date().toISOString(), kind, questId, detail });
    if (this.events.length > DEBUG_LOG_LIMIT) this.events.splice(0, this.events.length - DEBUG_LOG_LIMIT);
  }

  /** Full JSON-able dump for the debug panel / GM tooling. */
  public debugSnapshot(): EngineSnapshot {
    const view = effectiveQuests(this.definitions, this.overrides);
    return {
      quests: this.quests().map((quest) => ({
        id: quest.id,
        name: quest.name,
        status: this.statusOf(quest.id),
        origin: quest.origin ?? "authored",
      })),
      retiredQuestIds: [...view.retiredQuestIds],
      eventLog: [...this.events],
    };
  }
}
