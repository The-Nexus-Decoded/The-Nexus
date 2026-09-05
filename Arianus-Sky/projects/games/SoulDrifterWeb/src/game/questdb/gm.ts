/**
 * GM / AI-agent command surface for the live quest database.
 *
 * Commands are plain JSON (see schema.GmCommand) and are applied as
 * APPEND-ONLY override entries — never by mutating the definitions DB.
 * That gives three things for free: an audit trail for debugging, the
 * ability to replay/undo, and a document that a future backend can store
 * verbatim. Both the browser session and the CLI (scripts/questdb/questgm.mjs)
 * go through this module, so behavior is identical in both.
 */

import type { GmCommand, GmOverrideEntry, QuestDefinitionsDb, QuestOverridesDb, StoredQuest } from "./schema.ts";
import { validateStoredQuest } from "./schema.ts";

export interface GmApplication {
  overrides: QuestOverridesDb;
  entry: GmOverrideEntry;
}

/** Validates and appends a command to the overrides DB. Pure. */
export function applyGmCommand(
  overrides: QuestOverridesDb,
  command: GmCommand,
  meta: { author: string; reason: string; at: string },
): GmApplication {
  if (!meta.author) throw new Error("GM commands require an author (gm name or agent id).");
  if (!meta.reason) throw new Error("GM commands require a reason for the audit trail.");
  if (command.op === "quest.inject") {
    const errors = validateStoredQuest(command.quest, `inject ${command.quest.id}`);
    if (errors.length > 0) throw new Error(`Invalid injected quest: ${errors.join("; ")}`);
  }
  const revision = overrides.entries.length + 1;
  const entry: GmOverrideEntry = { revision, appliedAt: meta.at, author: meta.author, reason: meta.reason, command };
  return { overrides: { schemaVersion: 1, entries: [...overrides.entries, entry] }, entry };
}

export interface EffectiveQuestView {
  quests: StoredQuest[];
  retiredQuestIds: Set<string>;
  retiredTemplateIds: Set<string>;
}

/**
 * Folds the override log over the definitions DB to produce the effective
 * quest list. Later revisions win; quest.retire removes; quest.inject adds.
 */
export function effectiveQuests(definitions: QuestDefinitionsDb, overrides: QuestOverridesDb): EffectiveQuestView {
  const byId = new Map<string, StoredQuest>(definitions.quests.map((quest) => [quest.id, quest]));
  const retiredQuestIds = new Set<string>();
  const retiredTemplateIds = new Set<string>();

  for (const entry of overrides.entries) {
    const command = entry.command;
    switch (command.op) {
      case "quest.patch": {
        const quest = byId.get(command.questId);
        if (!quest) break;
        byId.set(command.questId, {
          ...quest,
          ...command.patch,
          rewards: command.patch.rewards ? { ...quest.rewards, ...command.patch.rewards } : quest.rewards,
          origin: quest.origin ?? "authored",
        });
        break;
      }
      case "objective.patch": {
        const quest = byId.get(command.questId);
        if (!quest) break;
        byId.set(command.questId, {
          ...quest,
          objectives: quest.objectives.map((objective) =>
            objective.id === command.objectiveId ? { ...objective, ...command.patch } : objective),
        });
        break;
      }
      case "quest.retire":
        retiredQuestIds.add(command.questId);
        break;
      case "quest.inject":
        byId.set(command.quest.id, { ...command.quest, origin: "gm" });
        retiredQuestIds.delete(command.quest.id);
        break;
      case "template.retire":
        retiredTemplateIds.add(command.templateId);
        break;
    }
  }

  const quests = [...byId.values()].filter((quest) => !retiredQuestIds.has(quest.id));
  return { quests, retiredQuestIds, retiredTemplateIds };
}

/** Render the audit log for the debug surface. */
export function auditTrail(overrides: QuestOverridesDb): string[] {
  return overrides.entries.map((entry) =>
    `#${entry.revision} [${entry.appliedAt}] ${entry.author}: ${entry.command.op} (${entry.reason})`);
}
