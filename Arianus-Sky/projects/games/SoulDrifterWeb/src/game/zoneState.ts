/**
 * Heartvale zone state: per-player persistence for the outdoor zone.
 *
 * Stores the quest log, progression (level/XP), and coin purse under one
 * localStorage key, following the atlasSync pattern (same-tab writes are
 * live-synced via storage events to any open panels).
 *
 * Multiplayer phasing model: world changes are applied client-side per
 * player from THEIR OWN completed-quest set. Two players standing in the
 * same clearing see different phases of it when only one has turned the
 * quest in; wander mobs and non-quest areas are identical for everyone.
 * When the server lands, this record is the exact payload to replicate —
 * the merge rule is union of completed quest ids, never demotion.
 */

import type { ProgressionState } from "./progression";
import { createProgression } from "./progression";
import type { QuestLogState } from "./quests";
import { createQuestLog } from "./quests";

const HEARTVALE_LS_KEY = "souldrifter.heartvaleState.v1";

export interface HeartvaleState {
  questLog: QuestLogState;
  progression: ProgressionState;
  coin: number;
  /** Puzzle step progress: puzzle id -> next expected step index. */
  puzzleCursor: Record<string, number>;
  /** Active escort runs: escort id -> route waypoint index reached. */
  escortCursor: Record<string, number>;
}

export function createHeartvaleState(): HeartvaleState {
  return {
    questLog: createQuestLog(),
    progression: createProgression(),
    coin: 0,
    puzzleCursor: {},
    escortCursor: {},
  };
}

export function loadHeartvaleState(): HeartvaleState {
  try {
    const raw = localStorage.getItem(HEARTVALE_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<HeartvaleState>;
      const seed = createHeartvaleState();
      return {
        questLog: {
          active: { ...parsed.questLog?.active },
          completed: { ...parsed.questLog?.completed },
        },
        progression: { ...seed.progression, ...parsed.progression },
        coin: typeof parsed.coin === "number" ? parsed.coin : 0,
        puzzleCursor: { ...parsed.puzzleCursor },
        escortCursor: { ...parsed.escortCursor },
      };
    }
  } catch {
    // Private-mode storage refusals are fine; the zone runs session-only.
  }
  return createHeartvaleState();
}

export function saveHeartvaleState(state: HeartvaleState): void {
  try {
    localStorage.setItem(HEARTVALE_LS_KEY, JSON.stringify(state));
  } catch {
    // A full or blocked store must never interrupt gameplay.
  }
}

export function completedQuestIds(state: HeartvaleState): Set<string> {
  return new Set(Object.keys(state.questLog.completed));
}
