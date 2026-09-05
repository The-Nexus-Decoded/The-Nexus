/**
 * Quest engine for the Heartvale outdoor zone.
 *
 * Design contract (owner-directed):
 * - Quests teach mechanics in order: talking/accepting, combat + looting,
 *   exploration/finding, escort/protection, and puzzles.
 * - Content is authored data (zoneHeartvale.ts); this module is the pure
 *   state machine that any runtime (local now, multiplayer server later)
 *   evaluates identically.
 * - Dynamic world changes are per-player phasing: completing a quest mutates
 *   the world ONLY for players who completed it. Wander mobs and non-quest
 *   areas are never touched by phasing (see zoneState.ts).
 * - Group play: quests carry party metadata; elites and zone bosses scale
 *   with party size so they stay hard for a solo player at-level but become
 *   fair for a party of lower-level players — or soloable if you out-level.
 */

export type QuestObjectiveKind = "kill" | "collect" | "find" | "talk" | "escort" | "puzzle";

export interface QuestObjective {
  id: string;
  kind: QuestObjectiveKind;
  /** Spawn id, item id, POI id, NPC id, or puzzle id depending on kind. */
  targetId: string;
  count: number;
  label: string;
}

export type QuestDifficulty = "solo" | "party" | "raid";

export interface QuestScaling {
  /** Recommended party size; 1 = solo-friendly. */
  recommendedParty: number;
  /** Intended level for a party of recommendedParty size. */
  intendedLevel: number;
  /** Level at which a solo player can reasonably clear it. */
  soloLevel: number;
  difficulty: QuestDifficulty;
}

export interface WorldMutation {
  /** Spawn ids removed from the world for players who completed the quest. */
  removeSpawns: readonly string[];
  /** Replacement spawns that appear only in the completed phase. */
  addSpawns: readonly QuestSpawnRef[];
  /** Narrative/world note shown in the quest log after completion. */
  worldNote: string;
  /** Atlas POI promotion applied on completion (never demotes). */
  atlasPromotion?: { realmId: string; poiId: string; status: "rumored" | "explored" | "completed" };
}

export interface QuestSpawnRef {
  spawnId: string;
  monsterId: string;
}

export interface QuestRewards {
  xp: number;
  coin: number;
  itemIds: readonly string[];
}

export interface QuestDefinition {
  id: string;
  name: string;
  giverNpcId: string;
  /** NPC the quest is turned in to (usually the giver). */
  turnInNpcId: string;
  level: number;
  summary: string;
  objectives: readonly QuestObjective[];
  rewards: QuestRewards;
  scaling: QuestScaling;
  /** Quest ids that must be turned in before this one is offered. */
  requires: readonly string[];
  /** Per-player world phasing applied on turn-in. */
  onComplete?: WorldMutation;
  /** What this quest teaches (design annotation, surfaced in the log). */
  teaches: string;
}

export type QuestStatus = "available" | "active" | "ready-to-turn-in" | "completed";

export interface QuestProgress {
  questId: string;
  status: Exclude<QuestStatus, "available">;
  /** objective id -> current count. */
  counts: Record<string, number>;
}

export interface QuestLogState {
  active: Record<string, QuestProgress>;
  completed: Record<string, { completedAt: string }>;
}

export function createQuestLog(): QuestLogState {
  return { active: {}, completed: {} };
}

export function questStatus(log: QuestLogState, quest: QuestDefinition): QuestStatus {
  if (log.completed[quest.id]) return "completed";
  const progress = log.active[quest.id];
  if (!progress) return "available";
  return progress.status === "ready-to-turn-in" ? "ready-to-turn-in" : "active";
}

/** Prerequisites + not-yet-done gate for offering a quest. */
export function canAccept(log: QuestLogState, quest: QuestDefinition): boolean {
  if (log.completed[quest.id] || log.active[quest.id]) return false;
  return quest.requires.every((requiredId) => log.completed[requiredId] !== undefined);
}

export function acceptQuest(log: QuestLogState, quest: QuestDefinition): QuestLogState {
  if (!canAccept(log, quest)) throw new Error(`Quest ${quest.id} cannot be accepted now.`);
  const counts: Record<string, number> = {};
  for (const objective of quest.objectives) counts[objective.id] = 0;
  return {
    ...log,
    active: {
      ...log.active,
      [quest.id]: { questId: quest.id, status: "active", counts },
    },
  };
}

function objectivesMet(quest: QuestDefinition, progress: QuestProgress): boolean {
  return quest.objectives.every((objective) => (progress.counts[objective.id] ?? 0) >= objective.count);
}

/**
 * Records progress against every active quest whose objectives match the
 * event. `kill` matches by monster spawn family; `collect` by item gained;
 * `find`/`talk`/`escort`/`puzzle` by their target ids. Pure: returns a new log.
 */
export function recordQuestEvent(
  log: QuestLogState,
  quests: readonly QuestDefinition[],
  event: { kind: QuestObjectiveKind; targetId: string; amount?: number },
): QuestLogState {
  const amount = event.amount ?? 1;
  let next = log;
  for (const quest of quests) {
    const progress = next.active[quest.id];
    if (!progress || progress.status !== "active") continue;
    let touched = false;
    const counts = { ...progress.counts };
    for (const objective of quest.objectives) {
      if (objective.kind !== event.kind || objective.targetId !== event.targetId) continue;
      const current = counts[objective.id] ?? 0;
      if (current >= objective.count) continue;
      counts[objective.id] = Math.min(objective.count, current + amount);
      touched = true;
    }
    if (!touched) continue;
    const updated: QuestProgress = { ...progress, counts };
    if (objectivesMet(quest, updated)) updated.status = "ready-to-turn-in";
    next = { ...next, active: { ...next.active, [quest.id]: updated } };
  }
  return next;
}

/** Turns in a ready quest: moves it to completed, returns rewards + phasing. */
export function turnInQuest(
  log: QuestLogState,
  quest: QuestDefinition,
  completedAt: string,
): { log: QuestLogState; rewards: QuestRewards; mutation?: WorldMutation } {
  const progress = log.active[quest.id];
  if (!progress || progress.status !== "ready-to-turn-in") {
    throw new Error(`Quest ${quest.id} is not ready to turn in.`);
  }
  const active = { ...log.active };
  delete active[quest.id];
  return {
    log: {
      active,
      completed: { ...log.completed, [quest.id]: { completedAt } },
    },
    rewards: quest.rewards,
    mutation: quest.onComplete,
  };
}

/**
 * Party-size difficulty scaling for elites and zone bosses. Returns the
 * multiplier applied to monster hp/damage. A party at recommendedParty size
 * faces exactly 1.0; smaller parties face more, larger parties slightly less
 * (never trivial — floor at 0.85). Out-leveling is the solo alternative:
 * content at or below (playerLevel - 2) sheds 15% per extra level.
 */
export function encounterScale(input: {
  partySize: number;
  playerLevel: number;
  scaling: QuestScaling;
}): number {
  const party = Math.max(1, Math.min(5, Math.floor(input.partySize)));
  const partyGap = input.scaling.recommendedParty - party;
  const partyFactor = 1 + 0.35 * Math.max(0, partyGap) - 0.05 * Math.max(0, -partyGap);
  const levelGap = input.playerLevel - input.scaling.intendedLevel;
  const levelFactor = levelGap >= 2 ? Math.max(0.4, 1 - 0.15 * (levelGap - 1)) : 1 - 0.0 * levelGap;
  return Number(Math.max(0.4, partyFactor * levelFactor).toFixed(3));
}

/** XP split already handled by progression.groupXpShare; this reports the tag. */
export function questPartyTag(quest: QuestDefinition): string {
  const { recommendedParty, intendedLevel, soloLevel, difficulty } = quest.scaling;
  if (difficulty === "solo") return `Solo · level ${intendedLevel}`;
  return `${difficulty === "raid" ? "Zone event" : "Party"} · ${recommendedParty}+ players at level ${intendedLevel} · solo ~level ${soloLevel}`;
}
