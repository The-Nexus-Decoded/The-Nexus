/**
 * QuestDB schema — the JSON-file "database" contract for the quest engine.
 *
 * The quest engine treats JSON documents as its database until a real
 * backend lands. There are three documents:
 *
 * 1. Definitions DB (public/data/heartvale-questdb.json) — generated from the
 *    authored TS content by scripts/questdb/export-heartvale-questdb.mjs and
 *    committed. This is the equivalent of a seeded migrations dump.
 * 2. Overrides DB (public/data/heartvale-quest-overrides.json) — live
 *    modifications written by a game master or AI agent through
 *    questdb/gm.ts (browser session) or scripts/questdb/questgm.mjs (CLI).
 *    Every entry carries an audit trail (author, reason, revision).
 * 3. Player state (localStorage via zoneState.ts) — per-player quest log,
 *    progression, and phasing. Never edited by GM tools.
 *
 * Everything here is plain JSON-serializable data: no classes, no functions,
 * so the same documents can move to a database unchanged later.
 */

import type { QuestDefinition, QuestObjectiveKind, WorldMutation } from "../quests";

/** A quest definition as stored in JSON. Identical shape to the TS model,
 *  plus engine-only optional fields for live and rotating content. */
export interface StoredQuest extends Omit<QuestDefinition, "objectives" | "scaling" | "requires" | "rewards" | "onComplete"> {
  objectives: QuestDefinition["objectives"];
  rewards: QuestDefinition["rewards"];
  scaling: QuestDefinition["scaling"];
  requires: QuestDefinition["requires"];
  onComplete?: WorldMutation;
  /** ISO timestamp after which an active (not completed) quest retires. */
  expiresAt?: string;
  /** Rotation tag: daily quests are re-instantiated per date seed. */
  rotation?: "daily";
  /** Engine provenance: authored | template instance | GM injection. */
  origin?: "authored" | "template" | "gm";
}

export interface QuestTemplateSlot {
  /** Monster ids the objective may target. */
  monsterPool: readonly string[];
  /** Named places used in generated text. */
  placePool: readonly { id: string; name: string }[];
  /** Flavor hooks — lore fragments that keep generated quests non-generic. */
  flavorPool: readonly string[];
}

export interface QuestTemplate {
  id: string;
  namePattern: string;
  summaryPattern: string;
  kind: Extract<QuestObjectiveKind, "kill" | "collect" | "find">;
  slots: QuestTemplateSlot;
  countRange: readonly [number, number];
  levelRange: readonly [number, number];
  /** Base XP per objective count at level 1; scaled by level and kind. */
  xpPerUnit: number;
  coinPerUnit: number;
  rotation: "daily";
}

export interface QuestDefinitionsDb {
  schemaVersion: 1;
  generatedFrom: string;
  quests: StoredQuest[];
  templates: QuestTemplate[];
}

// --- Overrides DB ---------------------------------------------------------------

export type GmCommand =
  | { op: "quest.patch"; questId: string; patch: Partial<Pick<StoredQuest, "name" | "summary" | "rewards" | "expiresAt">> }
  | { op: "quest.retire"; questId: string }
  | { op: "quest.inject"; quest: StoredQuest }
  | { op: "objective.patch"; questId: string; objectiveId: string; patch: { count?: number; label?: string } }
  | { op: "template.retire"; templateId: string };

export interface GmOverrideEntry {
  revision: number;
  appliedAt: string;
  author: string;
  reason: string;
  command: GmCommand;
}

export interface QuestOverridesDb {
  schemaVersion: 1;
  entries: GmOverrideEntry[];
}

export function emptyOverridesDb(): QuestOverridesDb {
  return { schemaVersion: 1, entries: [] };
}

// --- Validation -------------------------------------------------------------------

const OBJECTIVE_KINDS = new Set(["kill", "collect", "find", "talk", "escort", "puzzle"]);

/** Structural validation with human-readable errors (GM/debug surface). */
export function validateStoredQuest(quest: StoredQuest, index: string): string[] {
  const errors: string[] = [];
  if (!quest.id) errors.push(`${index}: missing id`);
  if (!quest.name) errors.push(`${index}: missing name`);
  if (!quest.giverNpcId) errors.push(`${index}: missing giverNpcId`);
  if (!quest.turnInNpcId) errors.push(`${index}: missing turnInNpcId`);
  if (!Number.isInteger(quest.level) || quest.level < 1) errors.push(`${index}: level must be a positive integer`);
  for (const objective of quest.objectives ?? []) {
    if (!OBJECTIVE_KINDS.has(objective.kind)) errors.push(`${index}: objective ${objective.id} has bad kind ${objective.kind}`);
    if (!objective.targetId) errors.push(`${index}: objective ${objective.id} missing targetId`);
    if (!Number.isInteger(objective.count) || objective.count < 1) errors.push(`${index}: objective ${objective.id} count must be >= 1`);
  }
  if ((quest.objectives ?? []).length === 0) errors.push(`${index}: quest needs at least one objective`);
  if (!quest.scaling || quest.scaling.recommendedParty < 1) errors.push(`${index}: scaling.recommendedParty must be >= 1`);
  if (quest.expiresAt && Number.isNaN(Date.parse(quest.expiresAt))) errors.push(`${index}: expiresAt is not a valid date`);
  return errors;
}

export function validateDefinitionsDb(db: QuestDefinitionsDb): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const quest of db.quests) {
    errors.push(...validateStoredQuest(quest, `quest ${quest.id}`));
    if (ids.has(quest.id)) errors.push(`quest ${quest.id}: duplicate id`);
    ids.add(quest.id);
  }
  for (const quest of db.quests) {
    for (const required of quest.requires) {
      if (!ids.has(required)) errors.push(`quest ${quest.id}: requires unknown quest ${required}`);
    }
  }
  const templateIds = new Set<string>();
  for (const template of db.templates) {
    if (templateIds.has(template.id)) errors.push(`template ${template.id}: duplicate id`);
    templateIds.add(template.id);
    if (template.slots.monsterPool.length === 0) errors.push(`template ${template.id}: empty monsterPool`);
    if (template.slots.placePool.length === 0) errors.push(`template ${template.id}: empty placePool`);
    if (template.countRange[0] < 1 || template.countRange[1] < template.countRange[0]) {
      errors.push(`template ${template.id}: bad countRange`);
    }
  }
  return errors;
}
