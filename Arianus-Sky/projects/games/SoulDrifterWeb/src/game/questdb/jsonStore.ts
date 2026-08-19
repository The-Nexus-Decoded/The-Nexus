/**
 * JSON-file-backed quest DB store.
 *
 * Browser: definitions and overrides load over fetch (same pattern as
 * /data/npcs.json); live GM edits made in-session ride localStorage so a
 * reload keeps them, and can be exported for the CLI to commit into the
 * overrides file.
 *
 * Node/CLI: scripts/questdb/questgm.mjs reads and writes the JSON files
 * directly. Both sides share schema.ts and gm.ts, so validation and
 * semantics are identical.
 */

import { emptyOverridesDb, type QuestDefinitionsDb, type QuestOverridesDb } from "./schema.ts";

export const QUEST_DB_URL = "/data/heartvale-questdb.json";
export const QUEST_OVERRIDES_URL = "/data/heartvale-quest-overrides.json";
const LIVE_OVERRIDES_LS_KEY = "souldrifter.questOverrides.live.v1";

export async function loadDefinitionsDb(): Promise<QuestDefinitionsDb> {
  const response = await fetch(QUEST_DB_URL);
  if (!response.ok) throw new Error(`Quest database failed to load (${response.status}).`);
  return (await response.json()) as QuestDefinitionsDb;
}

export async function loadOverridesDb(): Promise<QuestOverridesDb> {
  // Session-live overrides win; the committed file is the baseline.
  try {
    const live = localStorage.getItem(LIVE_OVERRIDES_LS_KEY);
    if (live) return JSON.parse(live) as QuestOverridesDb;
  } catch {
    // fall through to the file
  }
  try {
    const response = await fetch(QUEST_OVERRIDES_URL);
    if (response.ok) return (await response.json()) as QuestOverridesDb;
  } catch {
    // missing overrides file is fine — it starts empty
  }
  return emptyOverridesDb();
}

/** Persist session-live overrides (browser half of the GM surface). */
export function saveLiveOverrides(overrides: QuestOverridesDb): void {
  try {
    localStorage.setItem(LIVE_OVERRIDES_LS_KEY, JSON.stringify(overrides));
  } catch {
    // A full or blocked store must never interrupt gameplay.
  }
}

/** Export the live overrides for the CLI to commit into the JSON file. */
export function exportLiveOverrides(): string | null {
  try {
    return localStorage.getItem(LIVE_OVERRIDES_LS_KEY);
  } catch {
    return null;
  }
}

export function clearLiveOverrides(): void {
  try {
    localStorage.removeItem(LIVE_OVERRIDES_LS_KEY);
  } catch {
    // ignore
  }
}
